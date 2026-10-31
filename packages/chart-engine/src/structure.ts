import { CHI } from '@tinhban/calendar';
import type { ChartSnapshot, PalaceFacts } from '@tinhban/shared';

export interface TamPhuong {
  self: string;
  /** Hai cung tam hợp. */
  tamHop: [string, string];
  /** Cung xung chiếu (đối cung). */
  xungChieu: string;
}

/** Tam phương tứ chính của một cung: chính cung, hai cung tam hợp (cách 4), cung xung chiếu (cách 6). */
export function tamPhuongTuChinh(snapshot: ChartSnapshot, palaceKey: string): TamPhuong {
  if (!snapshot.palaces) throw new Error('Lá số chưa có 12 cung (thiếu giờ sinh hoặc ngày chưa hỗ trợ)');
  const index = (p: PalaceFacts) => CHI.indexOf(p.branch as (typeof CHI)[number]);
  const from = snapshot.palaces.find((p) => p.key === palaceKey);
  if (!from) throw new RangeError(`Lá số không có cung ${palaceKey}`);
  const at = (offset: number) => snapshot.palaces!.find((p) => index(p) === (index(from) + offset) % 12)!.key;
  return { self: from.key, tamHop: [at(4), at(8)], xungChieu: at(6) };
}
