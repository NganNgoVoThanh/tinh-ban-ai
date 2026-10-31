import { CAN, canChiName, CHI, yearCanChi } from '@tinhban/calendar';
import { MUTAGENS, type ChartSnapshot, type FactId, type MutagenHit, type PalaceFacts, type SchoolPolicy } from '@tinhban/shared';
import { flyFrom } from './flying.ts';
import { SCHOOLS } from './school.ts';

/** Dữ liệu cho thẻ năm, dòng thời gian, bảng năm của cả nhà (Technical Plan mục 9, 23). */
export interface YearView {
  lunarYear: number;
  canChi: string;
  /** Tuổi âm (tuổi mụ). */
  ageLunar: number;
  /** Đại vận chứa tuổi này; mutagens: Tứ hóa theo can của cung đại vận (Bắc phái). */
  decade?: { palaceKey: string; from: number; to: number; mutagens?: MutagenHit[] };
  /** Cung lưu niên: cung có địa chi trùng địa chi của năm. */
  yearPalaceKey?: string;
  /** Cung tiểu hạn (Nam phái). */
  smallLimitPalaceKey?: string;
  /** Tứ hóa theo can năm rơi vào cung nào của lá số. */
  yearMutagens: MutagenHit[];
  folkRelation?: 'hop' | 'xung' | 'none';
  facts: FactId[];
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const branchIndex = (p: PalaceFacts) => CHI.indexOf(p.branch as (typeof CHI)[number]);

/** Cung khởi tiểu hạn theo tam hợp chi năm sinh (chỉ số chi năm mod 4). */
const SMALL_LIMIT_START: Record<number, number> = {
  0: 10, // Thân Tý Thìn khởi ở Tuất
  1: 7, // Tỵ Dậu Sửu khởi ở Mùi
  2: 4, // Dần Ngọ Tuất khởi ở Thìn
  3: 1, // Hợi Mão Mùi khởi ở Sửu
};

/** Địa chi cung tiểu hạn ở tuổi âm `age`: nam đi thuận, nữ đi nghịch từ cung khởi (tuổi 1). */
export function smallLimitBranch(birthYearChi: number, gender: 'male' | 'female', age: number): number {
  const start = SMALL_LIMIT_START[birthYearChi % 4]!;
  return mod12(start + (gender === 'male' ? 1 : -1) * (age - 1));
}

/** Tứ hóa theo một can rơi vào cung nào của lá số gốc. */
function mutagensOfStem(palaces: PalaceFacts[], stem: string, table: SchoolPolicy['mutagenTable']): MutagenHit[] {
  const stars = table[stem];
  if (!stars) throw new Error(`Bảng Tứ hóa không có can ${stem}`);
  return MUTAGENS.map((mutagen, i) => {
    const starKey = stars[i]!;
    const to = palaces.find((p) => [...p.majorStars, ...p.minorStars].some((s) => s.key === starKey));
    return { mutagen, starKey, ...(to && { palaceKey: to.key }) };
  });
}

/**
 * Vận hạn của một năm âm. gender cần cho tiểu hạn. Thiếu giờ sinh thì chỉ có tuổi, can chi và
 * không có cung (các dòng đó ghi "Cần giờ sinh").
 */
export function getYearView(snapshot: ChartSnapshot, lunarYear: number, gender: 'male' | 'female'): YearView {
  const school = SCHOOLS[snapshot.schoolId];
  const year = yearCanChi(lunarYear);
  const ageLunar = lunarYear - snapshot.lunar.year + 1;
  const view: YearView = { lunarYear, canChi: canChiName(year), ageLunar, yearMutagens: [], facts: [] };
  const palaces = snapshot.palaces;
  if (!palaces || ageLunar < 1) return view;

  const decadePalace = palaces.find((p) => ageLunar >= p.decadal.from && ageLunar <= p.decadal.to);
  if (decadePalace) {
    view.decade = { palaceKey: decadePalace.key, from: decadePalace.decadal.from, to: decadePalace.decadal.to };
    if (school.palaceTapMode === 'phi_hoa') {
      view.decade.mutagens = flyFrom(palaces, decadePalace, school.mutagenTable).map(({ self: _s, ...h }) => h);
      for (const h of view.decade.mutagens) {
        if (h.palaceKey) view.facts.push(`decade:${decadePalace.decadal.from}|palace:${h.palaceKey}|hoa:${h.mutagen}`);
      }
    }
  }
  view.yearPalaceKey = palaces.find((p) => branchIndex(p) === year.chi)?.key;
  if (school.palaceTapMode === 'tam_phuong') {
    const birthChi = yearCanChi(snapshot.lunar.year).chi;
    view.smallLimitPalaceKey = palaces.find((p) => branchIndex(p) === smallLimitBranch(birthChi, gender, ageLunar))?.key;
  }
  view.yearMutagens = mutagensOfStem(palaces, CAN[year.can]!, school.mutagenTable);
  for (const h of view.yearMutagens) {
    if (h.palaceKey) view.facts.push(`year:${lunarYear}|palace:${h.palaceKey}|hoa:${h.mutagen}`);
  }
  return view;
}
