import {
  addDays,
  CAN,
  canChiName,
  CHI,
  dayCanChi,
  formatDate,
  hourCanChi,
  lunarToSolar,
  monthCanChi,
  normalizeBirthTime,
  parseDate,
  parseLunarDate,
  solarToLunar,
  TZ_POLICY,
  yearCanChi,
  type NormalizedTime,
  type SolarDate,
} from '@tinhban/calendar';
import {
  MUTAGENS,
  type BirthInput,
  type BranchStars,
  type Brightness,
  type ChartCore,
  type ChartSnapshot,
  type FactId,
  type Mutagen,
  type PalaceFacts,
  type SchoolId,
  type SchoolPolicy,
  type StarFact,
  type TraceStep,
  type Warning,
} from '@tinhban/shared';
import { astro } from 'iztro';
import { BRIGHTNESS_VN, MINOR_STAR_RULES, type PlacementContext } from './conventions.ts';
import { flyingFacts } from './flying.ts';
import { checkBirthPlace, InvalidBirthInputError } from './input.ts';
import { proxySolarDate } from './proxy-date.ts';
import { SCHOOLS } from './school.ts';
import { slug } from './slug.ts';

export const ENGINE_VERSION = '0.2.0';

type Astrolabe = ReturnType<typeof astro.bySolar>;
type IztroPalace = Astrolabe['palaces'][number];
type IztroStar = IztroPalace['majorStars'][number];

const BRIGHTNESS: Record<string, Brightness> = {
  Miếu: 'mieu',
  Vượng: 'vuong',
  Đắc: 'dac',
  Lợi: 'loi',
  Bình: 'binh',
  Bất: 'bat',
  // iztro dịch 陷 thành "Hạn"; tiếng Việt gọi là Hãm.
  Hạn: 'ham',
};

const MUTAGEN: Record<string, Mutagen> = { Lộc: 'loc', Quyền: 'quyen', Khoa: 'khoa', Kỵ: 'ky' };

const CUC_NUMBER: Record<string, number> = { Nhị: 2, Tam: 3, Tứ: 4, Ngũ: 5, Lục: 6 };

/** Sao chỉ phụ thuộc can chi năm sinh: vẫn an được khi thiếu giờ sinh. */
const YEAR_ONLY_STARS = new Set([
  'Lộc Tồn', 'Kình Dương', 'Đà La', 'Thiên Khôi', 'Thiên Việt', 'Thiên Mã',
  'Hồng Loan', 'Thiên Hỷ', 'Cô Thần', 'Quả Tú', 'Thiên Khốc', 'Thiên Hư',
  'Long Trì', 'Phụng Các', 'Hoa Cái', 'Hàm Trì', 'Phá Toái', 'Thiên Đức',
  'Nguyệt Đức', 'Thiên Quan', 'Thiên Phúc', 'Triệt Lộ', 'Tuần Không',
  'Thiên Trù', 'Thiên Không', 'Niên Giải',
]);

/** Thứ tự phụ tinh trong một cung, giữ ổn định sau khi dời sao theo quy ước của phái. */
const MINOR_ORDER = [
  'ta_phu', 'huu_bat', 'van_xuong', 'van_khuc', 'thien_khoi', 'thien_viet', 'loc_ton',
  'thien_ma', 'kinh_duong', 'da_la', 'hoa_tinh', 'linh_tinh', 'dia_khong', 'dia_kiep',
];

function toStar(s: IztroStar, kind: StarFact['kind']): StarFact {
  const star: StarFact = { key: slug(s.name), name: s.name, kind };
  if (s.brightness) {
    const b = BRIGHTNESS[s.brightness];
    if (!b) throw new Error(`Độ sáng chưa biết từ iztro: ${s.brightness}`);
    star.brightness = b;
  }
  if (s.mutagen) {
    const m = MUTAGEN[s.mutagen];
    if (!m) throw new Error(`Tứ hóa chưa biết từ iztro: ${s.mutagen}`);
    star.mutagen = m;
  }
  return star;
}

function toPalace(p: IztroPalace): PalaceFacts {
  return {
    key: slug(p.name),
    name: p.name,
    branch: p.earthlyBranch,
    stem: p.heavenlyStem,
    isBody: p.isBodyPalace,
    majorStars: p.majorStars.map((s) => toStar(s, 'major')),
    minorStars: p.minorStars.map((s) => toStar(s, 'minor')),
    adjectiveStars: p.adjectiveStars.map((s) => toStar(s, 'adjective')),
    rings: { changsheng: p.changsheng12, boshi: p.boshi12, suiqian: p.suiqian12, jiangqian: p.jiangqian12 },
    decadal: { from: p.decadal.range[0], to: p.decadal.range[1] },
  };
}

function toCore(a: Astrolabe): ChartCore {
  const [element = '', number = ''] = a.fiveElementsClass.split(' ');
  const n = CUC_NUMBER[number];
  if (!n) throw new Error(`Cục chưa biết từ iztro: ${a.fiveElementsClass}`);
  return {
    menhBranch: a.earthlyBranchOfSoulPalace,
    thanBranch: a.earthlyBranchOfBodyPalace,
    cuc: { element: slug(element), number: n, name: a.fiveElementsClass },
    menhChu: a.soul,
    thanChu: a.body,
  };
}

const branchIndex = (p: PalaceFacts) => CHI.indexOf(p.branch as (typeof CHI)[number]);
const allStars = (p: PalaceFacts) => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars];

/**
 * Ghi đè các chỗ iztro theo lối Trung Quốc bằng quy ước của phái: vị trí Hỏa Linh, Khôi Việt;
 * Tứ hóa năm sinh; thang độ sáng. Sửa trực tiếp trên palaces.
 */
function applySchool(palaces: PalaceFacts[], school: SchoolPolicy, ctx: PlacementContext, trace: TraceStep[]): void {
  for (const code of [school.minorStarRules.hoaLinh, school.minorStarRules.khoiViet]) {
    const place = MINOR_STAR_RULES[code];
    if (place === undefined) throw new Error(`Quy tắc an sao chưa biết: ${code}`);
    trace.push({ rule: code });
    if (place === null) continue;
    for (const [key, target] of Object.entries(place(ctx))) {
      const from = palaces.find((p) => p.minorStars.some((s) => s.key === key));
      if (!from) throw new Error(`iztro không an sao ${key}`);
      const star = from.minorStars.find((s) => s.key === key)!;
      from.minorStars = from.minorStars.filter((s) => s !== star);
      palaces.find((p) => branchIndex(p) === target)!.minorStars.push(star);
    }
  }
  for (const p of palaces) {
    p.minorStars.sort((a, b) => MINOR_ORDER.indexOf(a.key) - MINOR_ORDER.indexOf(b.key));
  }

  const stem = CAN[ctx.yearCan]!;
  const hoa = school.mutagenTable[stem];
  if (!hoa) throw new Error(`Bảng Tứ hóa không có can ${stem}`);
  for (const p of palaces) for (const s of [...p.majorStars, ...p.minorStars]) delete s.mutagen;
  MUTAGENS.forEach((m, i) => {
    const star = palaces.flatMap((p) => [...p.majorStars, ...p.minorStars]).find((s) => s.key === hoa[i]);
    if (!star) throw new Error(`Không tìm thấy sao mang hóa ${m}: ${hoa[i]}`);
    star.mutagen = m;
  });
  trace.push({ rule: 'ENG.HOA.YEAR_STEM', detail: `${stem}: ${hoa.join(', ')}` });

  if (school.brightnessScale === 5) {
    for (const p of palaces) {
      for (const s of allStars(p)) {
        const b = BRIGHTNESS_VN[s.key]?.[branchIndex(p)];
        if (b) s.brightness = b;
        else delete s.brightness;
      }
    }
    trace.push({ rule: 'ENG.BRIGHT.VN_5' });
  } else {
    trace.push({ rule: 'ENG.BRIGHT.IZTRO_7' });
  }
}

function palaceFacts(palaces: PalaceFacts[], core: ChartCore): FactId[] {
  const facts: FactId[] = [`core:cuc|${core.cuc.element}_${core.cuc.number}`];
  for (const p of palaces) {
    if (p.isBody) facts.push(`core:than|palace:${p.key}`);
    if (p.majorStars.length === 0) facts.push(`palace:${p.key}|vo_chinh_dieu`);
    for (const s of allStars(p)) {
      facts.push(s.brightness ? `palace:${p.key}|star:${s.key}|state:${s.brightness}` : `palace:${p.key}|star:${s.key}`);
      if (s.mutagen) facts.push(`palace:${p.key}|star:${s.key}|hoa:${s.mutagen}`);
    }
  }
  return facts;
}

function yearOnlyStars(palaces: PalaceFacts[]): BranchStars[] {
  return palaces.map((p) => ({
    branch: p.branch,
    stars: [...p.minorStars, ...p.adjectiveStars].filter((s) => YEAR_ONLY_STARS.has(s.name)).map(({ mutagen: _m, ...s }) => s),
  }));
}

function utcLabel(offsetMin: number): string {
  const abs = Math.abs(offsetMin);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs - h * 60);
  return `UTC${offsetMin < 0 ? '-' : '+'}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

function timeTrace(input: BirthInput, clockDate: string, n: NormalizedTime): TraceStep {
  if (n.autoLocalStd) return { rule: n.ruleCode, detail: `${n.autoLocalStd} → ${n.localStd} (người dùng sửa)` };
  if (input.timeCertainty === 'canh') return { rule: n.ruleCode, detail: `giờ ${CHI[n.hourBranch]} → ${n.localStd}` };
  return {
    rule: n.ruleCode,
    detail: `${clockDate} ${input.time} (${utcLabel(n.clockOffsetMin)}) → ${n.localStd} (${utcLabel(n.stdOffsetMin)})`,
  };
}

/**
 * Lập lá số gốc theo phái. Cùng đầu vào, cùng phái và cùng phiên bản thì kết quả luôn giống
 * nhau (trừ generatedAt).
 */
export function computeChart(
  input: BirthInput,
  schoolId: SchoolId,
  engineVersion: string = ENGINE_VERSION,
  opts: { profileId?: string; now?: Date } = {},
): ChartSnapshot {
  if (engineVersion !== ENGINE_VERSION) {
    throw new Error(`Bộ tính này là ${ENGINE_VERSION}, không tính được theo ${engineVersion}`);
  }
  const school = SCHOOLS[schoolId];
  if (!school) throw new Error(`Phái chưa biết: ${schoolId}`);
  const warnings: Warning[] = [];
  const trace: TraceStep[] = [];
  const region = input.region;

  // 1. Ngày dương theo giờ đồng hồ nơi sinh.
  let clockDate: SolarDate;
  try {
    if (input.calendar === 'lunar') {
      const solar = lunarToSolar(parseLunarDate(input.date), input.isLeapMonth === true, region);
      if (!solar) throw new RangeError(`Ngày âm ${input.date}${input.isLeapMonth ? ' (nhuận)' : ''} không có trong lịch`);
      clockDate = solar;
      trace.push({ rule: 'ENG.CAL.LUNAR_INPUT', detail: formatDate(solar) });
    } else {
      if (input.isLeapMonth === true) throw new RangeError('Cờ tháng nhuận chỉ dùng khi nhập âm lịch');
      clockDate = parseDate(input.date);
    }
  } catch (e) {
    throw new InvalidBirthInputError((e as Error).message);
  }

  // 2. Nơi sinh.
  checkBirthPlace(input, formatDate(clockDate));
  if (region === 'abroad') {
    warnings.push({
      code: 'REGION_ABROAD',
      message: 'Sinh ở nước ngoài: an sao theo giờ chuẩn nơi sinh (bỏ giờ mùa hè nếu có), ngày âm theo lịch Việt Nam.',
    });
    trace.push({ rule: 'ENG.TZ.ABROAD', detail: input.abroadTz });
  }

  // 3. Chuẩn hóa giờ sinh và quy ước giờ Tý.
  let n: NormalizedTime | null;
  try {
    n = normalizeBirthTime({ ...input, date: formatDate(clockDate) });
  } catch (e) {
    throw new InvalidBirthInputError((e as Error).message);
  }
  let chartDate = clockDate;
  let hourIdx: number | undefined;
  let normalizedTime: ChartSnapshot['normalizedTime'];
  if (n) {
    normalizedTime = { utc: n.utc, localStd: n.localStd, ruleCode: n.ruleCode };
    trace.push(timeTrace(input, formatDate(clockDate), n));
    if (n.status === 'gap') {
      warnings.push({ code: 'TZ_GAP', message: 'Giờ này không có trên đồng hồ do lúc đó vặn kim; đang hiểu theo giờ cũ.' });
    }
    if (n.status === 'overlap') {
      warnings.push({ code: 'TZ_OVERLAP', message: 'Giờ này có hai lần do lúc đó vặn kim lui; đang lấy lần đầu.' });
    }
    if (n.uncertain) {
      warnings.push({ code: 'TZ_UNCERTAIN', message: 'Múi giờ nơi sinh giai đoạn này không chắc; nên xem lại giờ đã quy đổi.' });
    }
    if (n.approx) {
      warnings.push({
        code: 'TIME_APPROX',
        message: `Giờ đồng hồ lúc đó là ${utcLabel(n.clockOffsetMin)}, lệch giờ chuẩn ${utcLabel(n.stdOffsetMin)}; nếu giờ âm được tính theo đồng hồ thì có thể lệch một giờ âm.`,
      });
    }
    chartDate = { year: n.std.year, month: n.std.month, day: n.std.day };
    hourIdx = n.hourBranch;
    if (n.std.hour === 23 && school.lateTy === 'next_day') {
      chartDate = addDays(chartDate, 1);
      trace.push({ rule: 'ENG.HOUR.LATE_TY_NEXT_DAY' });
    }
  } else {
    warnings.push({ code: 'NO_BIRTH_TIME', message: 'Thiếu giờ sinh: chưa dựng được 12 cung.' });
  }

  // 4. Âm lịch và can chi.
  const lunar = solarToLunar(chartDate, region);
  trace.push({ rule: lunar.rule, detail: `${lunar.day}/${lunar.month}${lunar.isLeap ? ' nhuận' : ''}/${lunar.year}` });
  const day = dayCanChi(chartDate);
  const year = yearCanChi(lunar.year);
  const canChi: ChartSnapshot['lunar']['canChi'] = {
    year: canChiName(year),
    month: canChiName(monthCanChi(lunar.year, lunar.month)),
    day: canChiName(day),
  };
  if (hourIdx !== undefined) canChi.hour = canChiName(hourCanChi(day.can, hourIdx));

  const snapshot: ChartSnapshot = {
    profileId: opts.profileId ?? '',
    engineVersion: ENGINE_VERSION,
    schoolId,
    tzPolicyVersion: TZ_POLICY.version,
    lunar: { year: lunar.year, month: lunar.month, day: lunar.day, isLeap: lunar.isLeap, canChi },
    facts: [`year:${slug(canChi.year)}`],
    warnings,
    trace,
    generatedAt: (opts.now ?? new Date()).toISOString(),
  };
  if (normalizedTime) snapshot.normalizedTime = normalizedTime;

  // 5. Tháng dùng để an sao.
  let month = lunar.month;
  if (lunar.isLeap) {
    if (school.leapMonth === 'split_15' && lunar.day > 15) month = (lunar.month % 12) + 1;
    trace.push({ rule: `ENG.LEAP.${school.leapMonth.toUpperCase()}`, detail: `an sao theo tháng ${month}` });
    warnings.push({ code: 'LEAP_MONTH', message: `Sinh tháng nhuận: đang an sao theo tháng ${month}.` });
  }

  // 6. An sao qua iztro với ngày đại diện (ADR 0001).
  let proxy: ReturnType<typeof proxySolarDate>;
  try {
    proxy = proxySolarDate({ year: lunar.year, month, day: lunar.day });
  } catch {
    warnings.push({ code: 'UNSUPPORTED_DAY30', message: 'Chưa hỗ trợ ngày này: bộ tính chưa an sao được ngày 30 âm lịch này.' });
    return snapshot;
  }
  trace.push({
    rule: proxy.yearShift === 0 ? 'ENG.PROXY.SAME_YEAR' : 'ENG.PROXY.SHIFT_60',
    detail: `${proxy.solar}${proxy.leapProxy ? ' (tháng nhuận của lịch TQ)' : ''}`,
  });
  const a = astro.bySolar(proxy.solar, hourIdx ?? 0, input.gender, false, 'vi-VN');
  const raw = a.rawDates.lunarDate;
  if (raw.lunarMonth !== month || raw.lunarDay !== lunar.day || (raw.lunarYear - lunar.year - proxy.yearShift) !== 0) {
    throw new Error(`iztro nhận sai ngày âm: ${raw.lunarYear}-${raw.lunarMonth}-${raw.lunarDay}`);
  }

  // 7. Quy ước của phái.
  const palaces = a.palaces.map(toPalace);
  const yang = year.can % 2 === 0;
  applySchool(palaces, school, {
    yearCan: year.can,
    yearChi: year.chi,
    ...(hourIdx !== undefined && { hourChi: hourIdx }),
    forward: yang === (input.gender === 'male'),
  }, trace);

  if (hourIdx !== undefined) {
    const core = toCore(a);
    snapshot.palaces = palaces;
    snapshot.core = core;
    snapshot.facts.push(...palaceFacts(palaces, core));
    if (school.palaceTapMode === 'phi_hoa') snapshot.facts.push(...flyingFacts(palaces, school.mutagenTable));
  } else {
    const yearStars = yearOnlyStars(palaces);
    snapshot.yearStars = yearStars;
    for (const b of yearStars) {
      for (const s of b.stars) snapshot.facts.push(`branch:${slug(b.branch)}|star:${s.key}`);
    }
  }
  return snapshot;
}
