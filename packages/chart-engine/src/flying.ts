import { MUTAGENS, type ChartSnapshot, type FactId, type MutagenHit, type PalaceFacts, type SchoolPolicy } from '@tinhban/shared';
import { SCHOOLS } from './school.ts';

/** Tứ hóa phát từ thiên can của một cung, theo bảng Tứ hóa của phái. */
export function flyFrom(palaces: PalaceFacts[], from: PalaceFacts, table: SchoolPolicy['mutagenTable']): MutagenHit[] {
  const stars = table[from.stem];
  if (!stars) throw new Error(`Bảng Tứ hóa không có can ${from.stem}`);
  return MUTAGENS.map((mutagen, i) => {
    const starKey = stars[i]!;
    const hit: MutagenHit = { mutagen, starKey };
    const to = palaces.find((p) => [...p.majorStars, ...p.minorStars].some((s) => s.key === starKey));
    if (to) {
      hit.palaceKey = to.key;
      hit.self = to.key === from.key;
    }
    return hit;
  });
}

/** Fact phi hóa của cả 12 cung: 'fly:<cung nguồn>|hoa:<hóa>|to:<cung đích>'. */
export function flyingFacts(palaces: PalaceFacts[], table: SchoolPolicy['mutagenTable']): FactId[] {
  return palaces.flatMap((from) =>
    flyFrom(palaces, from, table).flatMap((h) => (h.palaceKey ? [`fly:${from.key}|hoa:${h.mutagen}|to:${h.palaceKey}`] : [])),
  );
}

/** Bắc phái: Tứ hóa theo thiên can của cung, gồm cả tự hóa. */
export function getFlyingMutagens(snapshot: ChartSnapshot, palaceKey: string): MutagenHit[] {
  if (!snapshot.palaces) throw new Error('Lá số chưa có 12 cung (thiếu giờ sinh hoặc ngày chưa hỗ trợ)');
  const from = snapshot.palaces.find((p) => p.key === palaceKey);
  if (!from) throw new RangeError(`Lá số không có cung ${palaceKey}`);
  return flyFrom(snapshot.palaces, from, SCHOOLS[snapshot.schoolId].mutagenTable);
}
