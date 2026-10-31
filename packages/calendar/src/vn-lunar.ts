/**
 * Âm lịch theo thuật toán của Hồ Ngọc Đức, có tham số múi giờ.
 * Nguồn: https://www.informatik.uni-leipzig.de/~duc/amlich/
 * Múi giờ 7 cho lịch Việt Nam hiện hành, 8 cho lịch Trung Quốc và lịch Việt Nam
 * cũ (xem calendarTimeZone trong tz-policy.ts).
 */

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
}

const INT = Math.floor;
const PI = Math.PI;
const SYNODIC_MONTH = 29.530588853;
const EPOCH_NEW_MOON = 2415021.076998695;

export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

export function jdToDate(jd: number): SolarDate {
  let b: number;
  let c: number;
  if (jd > 2299160) {
    const a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  return {
    day: e - INT((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * INT(m / 10),
    year: b * 100 + d - 4800 + INT(m / 10),
  };
}

/** Thời điểm sóc thứ k tính từ 1/1/1900, theo ngày Julius (giờ UTC). */
function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  c1 = c1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  c1 = c1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  c1 = c1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  c1 = c1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  c1 = c1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  c1 = c1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + c1 - deltat;
}

/** Kinh độ mặt trời (radian, 0..2π) tại ngày Julius jdn. */
function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L -= PI * 2 * INT(L / (PI * 2));
  return L;
}

/** Cung hoàng đạo 30° (0..11) mà mặt trời nằm vào lúc nửa đêm đầu ngày, giờ địa phương. */
function getSunLongitude(dayNumber: number, timeZone: number): number {
  return INT((sunLongitude(dayNumber - 0.5 - timeZone / 24) / PI) * 6);
}

function getNewMoonDay(k: number, timeZone: number): number {
  return INT(newMoon(k) + 0.5 + timeZone / 24);
}

/** Ngày bắt đầu tháng 11 âm (tháng chứa Đông chí) của năm dương yy. */
function getLunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / SYNODIC_MONTH);
  let nm = getNewMoonDay(k, timeZone);
  if (getSunLongitude(nm, timeZone) >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

/** Vị trí tháng nhuận (tính từ tháng 11) trong năm âm có 13 tháng. */
function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = INT((a11 - EPOCH_NEW_MOON) / SYNODIC_MONTH + 0.5);
  let last: number;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function solarToLunarTz(solar: SolarDate, timeZone: number): LunarDate {
  const dayNumber = jdFromDate(solar.day, solar.month, solar.year);
  const k = INT((dayNumber - EPOCH_NEW_MOON) / SYNODIC_MONTH);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  // Bản gốc dừng ở đây nên có ngày ra "mùng 0" khi sóc rơi sát nửa đêm (ví dụ 19/4/1939, UTC+8).
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k - 1, timeZone);
  }
  let a11 = getLunarMonth11(solar.year, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = solar.year;
    a11 = getLunarMonth11(solar.year - 1, timeZone);
  } else {
    lunarYear = solar.year + 1;
    b11 = getLunarMonth11(solar.year + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let isLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) isLeap = true;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap };
}

/** Ngày Julius của mùng 1 tháng âm đã cho, hoặc null nếu tháng (nhuận) đó không có. */
function lunarMonthStartJd(year: number, month: number, isLeap: boolean, timeZone: number): number | null {
  let a11: number;
  let b11: number;
  if (month < 11) {
    a11 = getLunarMonth11(year - 1, timeZone);
    b11 = getLunarMonth11(year, timeZone);
  } else {
    a11 = getLunarMonth11(year, timeZone);
    b11 = getLunarMonth11(year + 1, timeZone);
  }
  const k = INT(0.5 + (a11 - EPOCH_NEW_MOON) / SYNODIC_MONTH);
  let off = month - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (isLeap && month !== leapMonth) return null;
    if (isLeap || off >= leapOff) off += 1;
  } else if (isLeap) {
    return null;
  }
  return getNewMoonDay(k + off, timeZone);
}

/** Số ngày của tháng âm (29 hoặc 30), hoặc null nếu tháng đó không có. */
export function lunarMonthLengthTz(year: number, month: number, isLeap: boolean, timeZone: number): number | null {
  const start = lunarMonthStartJd(year, month, isLeap, timeZone);
  if (start === null) return null;
  const next = solarToLunarTz(jdToDate(start + 29), timeZone);
  return next.day === 1 ? 29 : 30;
}

/** Đổi âm sang dương; trả null nếu ngày âm không tồn tại (tháng nhuận sai, ngày 30 của tháng thiếu). */
export function lunarToSolarTz(lunar: LunarDate, timeZone: number): SolarDate | null {
  if (lunar.day < 1 || lunar.day > 30 || lunar.month < 1 || lunar.month > 12) return null;
  const start = lunarMonthStartJd(lunar.year, lunar.month, lunar.isLeap, timeZone);
  if (start === null) return null;
  const length = lunarMonthLengthTz(lunar.year, lunar.month, lunar.isLeap, timeZone);
  if (length === null || lunar.day > length) return null;
  return jdToDate(start + lunar.day - 1);
}

/** Tên 24 tiết khí, bắt đầu từ Xuân phân (kinh độ mặt trời 0°), mỗi tiết 15°. */
export const SOLAR_TERMS = [
  'Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng',
  'Hạ chí', 'Tiểu thử', 'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ',
  'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết', 'Đại tuyết',
  'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập',
] as const;

/** Kinh độ mặt trời (độ, 0..360) lúc cuối ngày dương, giờ địa phương theo múi timeZone. */
export function sunLongitudeAtDayEnd(solar: SolarDate, timeZone = 7): number {
  const jd = jdFromDate(solar.day, solar.month, solar.year);
  return (sunLongitude(jd + 0.5 - timeZone / 24) * 180) / PI;
}

/** Tiết khí của ngày (0 = Xuân phân … 23 = Kinh trập), theo cách tính của lịch Hồ Ngọc Đức. */
export function solarTermIndex(solar: SolarDate, timeZone = 7): number {
  return INT(sunLongitudeAtDayEnd(solar, timeZone) / 15) % 24;
}

/** Địa chi của tháng theo tiết (tháng Dần bắt đầu từ Lập xuân 315°), dùng cho trực. */
export function solarMonthBranch(solar: SolarDate, timeZone = 7): number {
  const L = sunLongitudeAtDayEnd(solar, timeZone);
  return (INT((((L - 315) % 360) + 360) % 360 / 30) + 2) % 12;
}
