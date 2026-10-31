import { lunar2solar, solar2lunar } from 'lunar-lite';

/**
 * iztro tự đổi dương sang âm theo lịch Trung Quốc (UTC+8). Để nó an sao theo ngày âm
 * Việt Nam đã tính sẵn, ta tìm một ngày dương "đại diện" mà lịch Trung Quốc cho đúng
 * số tháng và số ngày âm đó, trong năm cùng can chi. Lá số gốc chỉ phụ thuộc can chi năm,
 * số tháng, số ngày âm, giờ và giới tính, nên ngày đại diện cho cùng kết quả an sao.
 *
 * Thứ tự thử: cùng năm, rồi các năm cách 60 năm; trong mỗi năm thử tháng thường trước,
 * tháng nhuận cùng số sau. iztro phải được gọi với fixLeap = false để coi tháng nhuận
 * như tháng chính (quy ước tháng nhuận của trường phái đã áp dụng trước bước này).
 */
export interface ProxyDate {
  solar: string;
  yearShift: number;
  leapProxy: boolean;
}

const YEAR_SHIFTS = [0, -60, 60, -120, 120];

function tryProxy(year: number, month: number, day: number, isLeap: boolean): string | null {
  let solar: string;
  try {
    solar = lunar2solar(`${year}-${month}-${day}`, isLeap).toString();
  } catch {
    return null;
  }
  const back = solar2lunar(solar);
  return back.lunarYear === year && back.lunarMonth === month && back.lunarDay === day && back.isLeap === isLeap
    ? solar
    : null;
}

export function proxySolarDate(lunar: { year: number; month: number; day: number }): ProxyDate {
  for (const yearShift of YEAR_SHIFTS) {
    const year = lunar.year + yearShift;
    if (year < 1901 || year > 2099) continue;
    for (const leapProxy of [false, true]) {
      const solar = tryProxy(year, lunar.month, lunar.day, leapProxy);
      if (solar) return { solar, yearShift, leapProxy };
    }
  }
  throw new Error(`Không tìm được ngày đại diện cho âm lịch ${lunar.year}-${lunar.month}-${lunar.day}`);
}
