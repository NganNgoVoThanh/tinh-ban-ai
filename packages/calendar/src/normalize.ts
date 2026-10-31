import type { BirthInput } from '@tinhban/shared';
import { hourBranchIndex } from './can-chi.ts';
import { isValidTimeZone, resolveIanaClock, standardOffsetMin } from './iana.ts';
import { resolveClock, TZ_POLICY, type ClockResolution, type TzPolicy } from './tz-policy.ts';
import type { SolarDate } from './vn-lunar.ts';

/** Giờ chuẩn dùng để an sao cho người sinh trong nước: UTC+7. */
export const STANDARD_OFFSET_MIN = 420;

export interface LocalDateTime extends SolarDate {
  hour: number;
  minute: number;
}

/** Phần giờ của BirthInput; date là ngày dương theo đồng hồ nơi sinh (đã đổi nếu nhập âm lịch). */
export type BirthTimeInput = Pick<
  BirthInput,
  'timeCertainty' | 'time' | 'timeBranch' | 'tyPart' | 'region' | 'abroadTz' | 'stdTimeOverride'
> & { date: string };

export interface NormalizedTime {
  utc: string;
  /** Giờ chuẩn dùng để an sao, dạng YYYY-MM-DDTHH:mm. Nhập theo giờ âm thì là giữa giờ âm đó. */
  localStd: string;
  std: LocalDateTime;
  /** 0 = Tý … 11 = Hợi. */
  hourBranch: number;
  /** Độ lệch UTC của giờ đồng hồ nơi sinh lúc đó. */
  clockOffsetMin: number;
  /** Độ lệch UTC của giờ chuẩn dùng để an sao: UTC+7, hoặc giờ chuẩn địa phương nếu sinh ở nước ngoài. */
  stdOffsetMin: number;
  ruleCode: string;
  status: 'ok' | 'gap' | 'overlap';
  uncertain: boolean;
  /** Nhập theo giờ âm khi giờ đồng hồ lúc đó lệch giờ chuẩn: giờ âm có thể lệch một ô. */
  approx: boolean;
  /** Giờ chuẩn tự tính, khi người dùng đã sửa tay. */
  autoLocalStd?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(d: SolarDate): string {
  return `${String(d.year).padStart(4, '0')}-${pad(d.month)}-${pad(d.day)}`;
}

export function parseDate(iso: string): SolarDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new RangeError(`Ngày không hợp lệ: ${iso}`);
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  const check = new Date(Date.UTC(d.year, d.month - 1, d.day));
  if (check.getUTCFullYear() !== d.year || check.getUTCMonth() !== d.month - 1 || check.getUTCDate() !== d.day) {
    throw new RangeError(`Ngày không tồn tại: ${iso}`);
  }
  return d;
}

export function parseTime(hhmm: string): { hour: number; minute: number } {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new RangeError(`Giờ không hợp lệ: ${hhmm}`);
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

export function addDays(d: SolarDate, days: number): SolarDate {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

function fromMs(ms: number): LocalDateTime {
  const t = new Date(ms);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
  };
}

const wallMsOf = (d: SolarDate, hour: number, minute: number) => Date.UTC(d.year, d.month - 1, d.day, hour, minute);

/** Giờ đồng hồ nơi sinh → UTC: trong nước theo tz_policy, nước ngoài theo múi IANA. */
function resolveBirthClock(input: BirthTimeInput, wallMs: number, policy: TzPolicy): ClockResolution {
  if (input.region === 'abroad') {
    if (input.abroadTz === undefined || !isValidTimeZone(input.abroadTz)) {
      throw new RangeError(`Sinh ở nước ngoài cần múi giờ IANA hợp lệ: ${input.abroadTz ?? '(trống)'}`);
    }
    return resolveIanaClock(input.abroadTz, wallMs);
  }
  if (input.abroadTz !== undefined) throw new RangeError('Chỉ chọn múi giờ khi sinh ở nước ngoài');
  return resolveClock(input.region, wallMs, policy);
}

function stdOffsetFor(input: BirthTimeInput, utcMs: number): number {
  return input.region === 'abroad' ? standardOffsetMin(input.abroadTz!, utcMs) : STANDARD_OFFSET_MIN;
}

function result(
  utcMs: number,
  stdOffsetMin: number,
  rest: Omit<NormalizedTime, 'utc' | 'localStd' | 'std' | 'hourBranch' | 'stdOffsetMin'>,
): NormalizedTime {
  const std = fromMs(utcMs + stdOffsetMin * 60_000);
  return {
    utc: new Date(utcMs).toISOString(),
    localStd: `${formatDate(std)}T${pad(std.hour)}:${pad(std.minute)}`,
    std,
    hourBranch: hourBranchIndex(std.hour),
    stdOffsetMin,
    ...rest,
  };
}

function exactTime(input: BirthTimeInput, policy: TzPolicy): NormalizedTime {
  if (input.time === undefined) throw new RangeError('Thiếu giờ sinh (HH:mm)');
  if (input.timeBranch !== undefined || input.tyPart !== undefined) {
    throw new RangeError('Nhập giờ phút thì không kèm giờ âm');
  }
  const t = parseTime(input.time);
  const clock = resolveBirthClock(input, wallMsOf(parseDate(input.date), t.hour, t.minute), policy);
  const stdOffsetMin = stdOffsetFor(input, clock.utcMs);
  let ruleCode = clock.rule;
  if (input.region === 'abroad') {
    ruleCode = clock.offsetMin === stdOffsetMin ? 'ENG.TZ.ABROAD_STD' : 'ENG.TZ.ABROAD_DST_REMOVED';
  }
  return result(clock.utcMs, stdOffsetMin, {
    clockOffsetMin: clock.offsetMin,
    ruleCode,
    status: clock.status,
    uncertain: clock.uncertain,
    approx: false,
  });
}

/**
 * Nhập theo giờ âm (hoặc canh): không quy đổi múi giờ (Technical Plan mục 5, đề xuất chờ duyệt).
 * Một giờ âm dài 2 tiếng, dịch 1 tiếng thì vắt qua hai giờ âm, nên bộ tính dùng thẳng giờ âm đã chọn.
 * Giờ Tý tách trước nửa đêm (23–24 giờ của ngày đã nhập) và sau nửa đêm (0–1 giờ).
 */
function canhTime(input: BirthTimeInput, policy: TzPolicy): NormalizedTime {
  const b = input.timeBranch;
  if (b === undefined || !Number.isInteger(b) || b < 0 || b > 11) {
    throw new RangeError(`Giờ âm phải từ 0 (Tý) đến 11 (Hợi): ${b ?? '(trống)'}`);
  }
  if (input.time !== undefined) throw new RangeError('Nhập giờ âm thì không kèm giờ phút');
  if (b === 0 && input.tyPart === undefined) throw new RangeError('Giờ Tý cần chọn trước hay sau nửa đêm');
  if (b !== 0 && input.tyPart !== undefined) throw new RangeError('Chỉ giờ Tý mới chọn trước hay sau nửa đêm');
  // Giữa giờ âm: Sửu 01–03 → 02:00; Tý trước nửa đêm → 23:30, sau nửa đêm → 00:30.
  const [hour, minute] = b === 0 ? (input.tyPart === 'before_midnight' ? [23, 30] : [0, 30]) : [2 * b, 0];
  const wallMs = wallMsOf(parseDate(input.date), hour, minute);
  // Chỉ để biết giờ đồng hồ lúc đó lệch giờ chuẩn bao nhiêu.
  const clock = resolveBirthClock(input, wallMs, policy);
  const stdOffsetMin = stdOffsetFor(input, clock.utcMs);
  return result(wallMs - stdOffsetMin * 60_000, stdOffsetMin, {
    clockOffsetMin: clock.offsetMin,
    ruleCode: 'ENG.TZ.CANH_NO_SHIFT',
    status: 'ok',
    uncertain: false,
    approx: clock.offsetMin !== stdOffsetMin,
  });
}

/**
 * Người dùng tự sửa giờ chuẩn (HH:mm). Giữ ngày của giờ tự tính; nếu giờ sửa vượt qua nửa đêm
 * thì lấy ngày cho kết quả gần giờ tự tính nhất (cách đều thì giữ ngày cũ).
 */
function applyOverride(auto: NormalizedTime, hhmm: string): NormalizedTime {
  const t = parseTime(hhmm);
  const autoMs = wallMsOf(auto.std, auto.std.hour, auto.std.minute);
  let best = wallMsOf(auto.std, t.hour, t.minute);
  for (const shift of [-1, 1]) {
    const c = wallMsOf(addDays(auto.std, shift), t.hour, t.minute);
    if (Math.abs(c - autoMs) < Math.abs(best - autoMs)) best = c;
  }
  return {
    ...result(best - auto.stdOffsetMin * 60_000, auto.stdOffsetMin, {
      clockOffsetMin: auto.clockOffsetMin,
      ruleCode: 'ENG.TZ.USER_OVERRIDE',
      status: 'ok',
      uncertain: false,
      approx: false,
    }),
    autoLocalStd: auto.localStd,
  };
}

/**
 * Chuẩn hóa giờ sinh: giờ đồng hồ trên giấy tờ → UTC → giờ chuẩn dùng để an sao.
 * Nhận cả ba cách nhập giờ; thiếu giờ sinh thì trả null.
 */
export function normalizeBirthTime(input: BirthTimeInput, policy: TzPolicy = TZ_POLICY): NormalizedTime | null {
  if (input.timeCertainty === 'unknown') {
    if (input.time !== undefined || input.timeBranch !== undefined || input.tyPart !== undefined) {
      throw new RangeError('Đã chọn "Không rõ giờ" thì không kèm giờ');
    }
    if (input.stdTimeOverride !== undefined) throw new RangeError('Không rõ giờ thì không sửa được giờ chuẩn');
    return null;
  }
  if (input.timeCertainty === 'canh') {
    if (input.stdTimeOverride !== undefined) throw new RangeError('Chỉ sửa được giờ chuẩn khi nhập giờ phút');
    return canhTime(input, policy);
  }
  const auto = exactTime(input, policy);
  return input.stdTimeOverride === undefined ? auto : applyOverride(auto, input.stdTimeOverride);
}
