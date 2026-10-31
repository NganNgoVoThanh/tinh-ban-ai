import { jdFromDate, type SolarDate } from './vn-lunar.ts';

export const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'] as const;
export const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'] as const;

export type Can = (typeof CAN)[number];
export type Chi = (typeof CHI)[number];

export interface CanChi {
  can: number;
  chi: number;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function canChiName(cc: CanChi): string {
  return `${CAN[cc.can]} ${CHI[cc.chi]}`;
}

/** Can chi của năm âm lịch (ranh giới năm là Tết). */
export function yearCanChi(lunarYear: number): CanChi {
  return { can: mod(lunarYear + 6, 10), chi: mod(lunarYear + 8, 12) };
}

/** Can chi của tháng âm; tháng Giêng là tháng Dần. Tháng nhuận dùng can chi của tháng chính. */
export function monthCanChi(lunarYear: number, lunarMonth: number): CanChi {
  return { can: mod(lunarYear * 12 + lunarMonth + 3, 10), chi: mod(lunarMonth + 1, 12) };
}

export function dayCanChi(solar: SolarDate): CanChi {
  const jd = jdFromDate(solar.day, solar.month, solar.year);
  return { can: mod(jd + 9, 10), chi: mod(jd + 1, 12) };
}

/** Chỉ số địa chi của giờ (0 = Tý: 23:00–00:59, 1 = Sửu: 01:00–02:59, ...). */
export function hourBranchIndex(hour: number): number {
  return mod(Math.floor((hour + 1) / 2), 12);
}

/** Can của giờ suy từ can ngày (ngũ thử độn). */
export function hourCanChi(dayCan: number, hourChi: number): CanChi {
  return { can: mod((dayCan % 5) * 2 + hourChi, 10), chi: hourChi };
}
