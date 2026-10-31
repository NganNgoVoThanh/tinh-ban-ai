import {
  formatDate,
  leapMonthOf,
  lunarToSolar,
  needsBenHaiSide,
  needsBirthPlace,
  normalizeBirthTime,
  parseDate,
  parseTime,
  provinceByCode,
} from "@tinhban/calendar";
import { checkBirthPlace, InvalidBirthInputError } from "@tinhban/chart-engine";
import type { BirthInput, Region, SchoolId, TimeCertainty } from "@tinhban/shared";

/**
 * Trạng thái và kiểm tra của form nhập hồ sơ (Technical Plan mục 5, mục 12). Hàm thuần, không phụ
 * thuộc giao diện, để test riêng.
 */
export type Place = { kind: "province"; code: string } | { kind: "abroad"; tz: string };
export type TyPart = NonNullable<BirthInput["tyPart"]>;

export interface BirthForm {
  name: string;
  calendar: "solar" | "lunar";
  day: string;
  month: string;
  year: string;
  isLeapMonth: boolean;
  timeMode: TimeCertainty;
  time: string;
  timeBranch: number | null;
  tyPart: TyPart | null;
  place: Place | null;
  benHaiSide: "north" | "south" | null;
  gender: "male" | "female" | null;
  schoolId: SchoolId;
  stdTimeOverride: string | null;
}

export const emptyForm = (schoolId: SchoolId): BirthForm => ({
  name: "",
  calendar: "solar",
  day: "",
  month: "",
  year: "",
  isLeapMonth: false,
  timeMode: "exact",
  time: "",
  timeBranch: null,
  tyPart: null,
  place: null,
  benHaiSide: null,
  gender: null,
  schoolId,
  stdTimeOverride: null,
});

export type FieldKey = "date" | "time" | "place" | "benHaiSide" | "gender" | "override" | "form";

export interface StdTimePreview {
  localStd: string;
  hourBranch: number;
  /** Giờ âm nhập khi giờ đồng hồ lệch giờ chuẩn: có thể lệch một giờ âm. */
  approx: boolean;
  overridden: boolean;
  /** Giờ chuẩn khác giờ trên giấy tờ (đã quy đổi múi giờ). */
  shifted: boolean;
  clockOffsetMin: number;
  stdOffsetMin: number;
}

export interface FormAnalysis {
  /** Ngày dương theo đồng hồ nơi sinh, khi ngày hợp lệ. */
  solarDate?: string;
  /** Tháng nhuận của năm âm đang nhập; null nếu năm đó không nhuận. */
  leapMonth?: number | null;
  needsPlace: boolean;
  needsBenHai: boolean;
  stdTime?: StdTimePreview;
  under16: boolean;
  errors: Partial<Record<FieldKey, string>>;
  /** Có khi form đủ và hợp lệ. */
  input?: BirthInput;
}

const pad2 = (s: string) => s.padStart(2, "0");
const toInt = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);

export function regionOf(place: Place | null, benHaiSide: BirthForm["benHaiSide"]): Region {
  if (!place) return "north";
  if (place.kind === "abroad") return "abroad";
  const zone = provinceByCode(place.code)?.zone;
  return zone === "ben_hai" ? (benHaiSide ?? "south") : (zone ?? "north");
}

/** Tuổi tròn tại ngày `today` (theo ngày dương). */
export function ageOn(solarDate: string, today: Date): number {
  const d = parseDate(solarDate);
  const y = today.getFullYear();
  const beforeBirthday = today.getMonth() + 1 < d.month || (today.getMonth() + 1 === d.month && today.getDate() < d.day);
  return y - d.year - (beforeBirthday ? 1 : 0);
}

function solarDateOf(f: BirthForm, region: Region, a: FormAnalysis): string | undefined {
  const day = toInt(f.day);
  const month = toInt(f.month);
  const year = toInt(f.year);
  if ([day, month, year].some(Number.isNaN)) {
    a.errors.date = "Nhập đủ ngày, tháng, năm";
    return undefined;
  }
  if (year < 1901 || year > 2099) {
    a.errors.date = "Năm sinh phải từ 1901 đến 2099";
    return undefined;
  }
  if (f.calendar === "solar") {
    const iso = `${year}-${pad2(String(month))}-${pad2(String(day))}`;
    try {
      parseDate(iso);
    } catch {
      a.errors.date = "Ngày này không có trong lịch";
      return undefined;
    }
    return iso;
  }
  a.leapMonth = leapMonthOf(year, region);
  if (month < 1 || month > 12 || day < 1 || day > 30) {
    a.errors.date = "Ngày âm từ 1 đến 30, tháng từ 1 đến 12";
    return undefined;
  }
  const isLeap = f.isLeapMonth && a.leapMonth === month;
  const solar = lunarToSolar({ year, month, day }, isLeap, region);
  if (!solar) {
    a.errors.date = "Tháng âm này không có ngày 30";
    return undefined;
  }
  return formatDate(solar);
}

/** Phân tích form: lỗi theo từng ô, dòng "Giờ dùng để an sao", và BirthInput khi đã đủ. */
/** today = null khi chưa biết ngày (lúc prerender): bỏ qua kiểm tra dưới 16 tuổi. */
export function analyzeForm(f: BirthForm, today: Date | null): FormAnalysis {
  const region = regionOf(f.place, f.benHaiSide);
  const a: FormAnalysis = { needsPlace: false, needsBenHai: false, under16: false, errors: {} };
  const solarDate = solarDateOf(f, region, a);
  if (solarDate) {
    a.solarDate = solarDate;
    a.needsPlace = needsBirthPlace(solarDate) && f.place === null;
    a.needsBenHai = f.place?.kind === "province" && needsBenHaiSide(f.place.code, solarDate);
    a.under16 = today !== null && ageOn(solarDate, today) < 16;
    if (a.needsPlace) a.errors.place = "Sinh trước 1976 cần chọn nơi sinh";
    if (a.needsBenHai && !f.benHaiSide) a.errors.benHaiSide = "Chọn bờ Bắc hay bờ Nam sông Bến Hải";
  }

  if (f.timeMode === "exact") {
    try {
      parseTime(f.time);
    } catch {
      a.errors.time = "Nhập giờ phút, ví dụ 21:30";
    }
  } else if (f.timeMode === "canh") {
    if (f.timeBranch === null) a.errors.time = "Chọn giờ âm";
    else if (f.timeBranch === 0 && !f.tyPart) a.errors.time = "Giờ Tý: chọn trước hay sau nửa đêm";
  }
  if (f.stdTimeOverride !== null && f.timeMode === "exact") {
    try {
      parseTime(f.stdTimeOverride);
    } catch {
      a.errors.override = "Giờ chuẩn dạng HH:mm, ví dụ 20:30";
    }
  }
  if (!f.gender) a.errors.gender = "Chọn giới tính";

  const dateIso =
    f.calendar === "solar"
      ? solarDate
      : `${String(toInt(f.year)).padStart(4, "0")}-${pad2(f.month.trim())}-${pad2(f.day.trim())}`;
  if (!solarDate || !dateIso || a.errors.time || a.errors.override || a.errors.benHaiSide || a.errors.place) return a;

  const input: BirthInput = {
    calendar: f.calendar,
    date: dateIso,
    ...(f.calendar === "lunar" && a.leapMonth === toInt(f.month) && f.isLeapMonth ? { isLeapMonth: true } : {}),
    timeCertainty: f.timeMode,
    ...(f.timeMode === "exact" ? { time: f.time } : {}),
    ...(f.timeMode === "canh" ? { timeBranch: f.timeBranch!, ...(f.timeBranch === 0 ? { tyPart: f.tyPart! } : {}) } : {}),
    region,
    ...(f.place?.kind === "province" ? { provinceCode: f.place.code } : {}),
    ...(a.needsBenHai && f.benHaiSide ? { benHaiSide: f.benHaiSide } : {}),
    ...(f.place?.kind === "abroad" ? { abroadTz: f.place.tz } : {}),
    ...(f.timeMode === "exact" && f.stdTimeOverride !== null ? { stdTimeOverride: f.stdTimeOverride } : {}),
    gender: f.gender ?? "male",
  };

  try {
    checkBirthPlace(input, solarDate);
    const n = normalizeBirthTime({ ...input, date: solarDate });
    if (n) {
      a.stdTime = {
        localStd: n.localStd,
        hourBranch: n.hourBranch,
        approx: n.approx,
        overridden: n.autoLocalStd !== undefined,
        shifted: f.timeMode === "exact" && n.localStd !== `${solarDate}T${f.time}`,
        clockOffsetMin: n.clockOffsetMin,
        stdOffsetMin: n.stdOffsetMin,
      };
    }
  } catch (e) {
    a.errors.form = e instanceof InvalidBirthInputError || e instanceof RangeError ? e.message : String(e);
    return a;
  }
  if (!a.errors.gender) a.input = input;
  return a;
}

/** Đưa hồ sơ đã lưu về lại form (để sửa). */
export function formFromInput(input: BirthInput, schoolId: SchoolId, name = ""): BirthForm {
  const [year = "", month = "", day = ""] = input.date.split("-");
  return {
    name,
    calendar: input.calendar,
    day: String(Number(day)),
    month: String(Number(month)),
    year,
    isLeapMonth: input.isLeapMonth === true,
    timeMode: input.timeCertainty,
    time: input.time ?? "",
    timeBranch: input.timeBranch ?? null,
    tyPart: input.tyPart ?? null,
    place: input.region === "abroad" ? { kind: "abroad", tz: input.abroadTz ?? "" } : input.provinceCode ? { kind: "province", code: input.provinceCode } : null,
    benHaiSide: input.benHaiSide ?? null,
    gender: input.gender,
    schoolId,
    stdTimeOverride: input.stdTimeOverride ?? null,
  };
}
