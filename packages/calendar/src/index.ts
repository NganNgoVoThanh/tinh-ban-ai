import { formatDate, parseDate } from './normalize.ts';
import { calendarTimeZone, TZ_POLICY, type Region, type TzPolicy } from './tz-policy.ts';
import { lunarToSolarTz, solarToLunarTz, type LunarDate, type SolarDate } from './vn-lunar.ts';

export * from './can-chi.ts';
export * from './iana.ts';
export * from './normalize.ts';
export * from './provinces.ts';
export * from './tz-policy.ts';
export * from './vn-lunar.ts';

export interface RegionalLunar extends LunarDate {
  timeZone: number;
  rule: string;
}

/** Dương sang âm theo lịch đang hiệu lực tại vùng vào ngày đó. */
export function solarToLunar(date: string | SolarDate, region: Region, policy: TzPolicy = TZ_POLICY): RegionalLunar {
  const solar = typeof date === 'string' ? parseDate(date) : date;
  const cal = calendarTimeZone(region, formatDate(solar), policy);
  return { ...solarToLunarTz(solar, cal.timeZone), timeZone: cal.timeZone, rule: cal.rule };
}

/** Đọc ngày âm YYYY-MM-DD; không kiểm theo lịch dương (âm lịch có ngày 30/2). */
export function parseLunarDate(iso: string): Omit<LunarDate, 'isLeap'> {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[3]) < 1 || Number(m[3]) > 30) {
    throw new RangeError(`Ngày âm không hợp lệ: ${iso}`);
  }
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Âm sang dương; trả null nếu ngày âm không có trong lịch của vùng. */
export function lunarToSolar(
  date: string | Omit<LunarDate, 'isLeap'>,
  isLeap: boolean,
  region: Region,
  policy: TzPolicy = TZ_POLICY,
): SolarDate | null {
  const lunar = typeof date === 'string' ? parseLunarDate(date) : date;
  // Múi giờ lịch phụ thuộc ngày dương, nên thử từng múi và giữ kết quả tự nhất quán.
  for (const tz of [7, 8]) {
    const solar = lunarToSolarTz({ ...lunar, isLeap }, tz);
    if (solar && calendarTimeZone(region, formatDate(solar), policy).timeZone === tz) return solar;
  }
  return null;
}

/** Tháng nhuận của năm âm tại vùng (null nếu năm đó không nhuận). */
export function leapMonthOf(lunarYear: number, region: Region, policy: TzPolicy = TZ_POLICY): number | null {
  for (let month = 1; month <= 12; month++) {
    if (lunarToSolar({ year: lunarYear, month, day: 1 }, true, region, policy)) return month;
  }
  return null;
}
