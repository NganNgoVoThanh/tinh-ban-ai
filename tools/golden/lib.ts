/**
 * Phần dùng chung giữa script đối chiếu (run-engine, compare) và golden test: đọc bộ ca,
 * rút gọn lá số của bộ tính, so từng ca với lasotuvi theo từng nhóm.
 */
import { readFileSync } from 'node:fs';
import { CHI } from '@tinhban/calendar';
import { computeChart } from '@tinhban/chart-engine';
import type { BirthInput, SchoolId } from '@tinhban/shared';

export interface Case {
  id: string;
  tags: string[];
  input: BirthInput;
}

/** Ngày âm, tháng an sao và giờ mà lasotuvi nhận, lấy từ bộ tính để chỉ so phần an sao. */
export interface LasoInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: 'male' | 'female';
}

export interface EnginePalace {
  branch: string;
  key: string;
  isBody: boolean;
  decadalFrom: number;
  stars: [key: string, brightness: string | null][];
  mutagens: string[];
}

export interface EngineCase {
  id: string;
  tags: string[];
  school: SchoolId;
  error?: string;
  yearCanChi?: string;
  lasoInput?: LasoInput;
  palaces?: EnginePalace[];
}

export interface LasoPalace {
  branch: string;
  key: string;
  isBody: boolean;
  decadalFrom: number;
  stars: [key: string, brightness: string | null][];
  hoa: string[];
  tuan: boolean;
  triet: boolean;
  /** Năm có địa chi này thì tiểu hạn rơi vào cung này. */
  tieuHan: string | null;
}

export interface LasoCase {
  id: string;
  input: LasoInput;
  palaces: LasoPalace[];
}

export const MAJORS = ['tu_vi', 'liem_trinh', 'thien_dong', 'vu_khuc', 'thai_duong', 'thien_co', 'thien_phu', 'thai_am',
  'tham_lang', 'cu_mon', 'thien_tuong', 'thien_luong', 'that_sat', 'pha_quan'];
export const MINORS = ['ta_phu', 'huu_bat', 'van_xuong', 'van_khuc', 'thien_khoi', 'thien_viet', 'loc_ton', 'kinh_duong',
  'da_la', 'hoa_tinh', 'linh_tinh', 'dia_khong', 'dia_kiep', 'thien_ma'];
/** Sao phụ có độ sáng trong lasotuvi. Thiên Riêu được đổi tên theo iztro (Thiên Diêu) khi ghi fixture. */
export const BRIGHT_ADJECTIVES = ['thien_khoc', 'thien_hu', 'thien_hinh', 'thien_dieu'];
/** Danh sách sao ghi vào fixture; giữ khớp với COMPARED trong run_lasotuvi.py. */
export const COMPARED_STARS = [...MAJORS, ...MINORS, ...BRIGHT_ADJECTIVES];
/** lasotuvi không ghi độ sáng các sao này; bộ tính tạm lấy bảng của iztro (xem conventions.ts). */
export const LASO_NO_BRIGHTNESS = ['thien_phu'];

const NOW = new Date('2026-10-29T00:00:00Z');

export const readJson = <T,>(file: string): T => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
export const loadCases = () => readJson<Case[]>('./cases.json');
export const loadLasotuvi = () => new Map(readJson<{ cases: LasoCase[] }>('./fixtures/lasotuvi.json').cases.map((c) => [c.id, c]));

/** Chạy bộ tính trên một ca, rút gọn để so với lasotuvi. */
export function engineCase(c: Case, school: SchoolId): EngineCase {
  const base = { id: c.id, tags: c.tags, school };
  const s = computeChart(c.input, school, undefined, { now: NOW });
  if (s.warnings.some((w) => w.code === 'UNSUPPORTED_DAY30')) return { ...base, error: 'UNSUPPORTED_DAY30' };
  if (!s.palaces) return base;
  const leapRule = s.trace.find((t) => t.rule.startsWith('ENG.LEAP.'));
  const chartMonth = leapRule ? Number(/tháng (\d+)/.exec(leapRule.detail!)![1]) : s.lunar.month;
  return {
    ...base,
    yearCanChi: s.lunar.canChi.year,
    lasoInput: {
      year: s.lunar.year,
      month: chartMonth,
      day: s.lunar.day,
      hour: CHI.indexOf(s.lunar.canChi.hour!.split(' ')[1] as (typeof CHI)[number]),
      gender: c.input.gender,
    },
    palaces: s.palaces.map((p) => ({
      branch: p.branch,
      key: p.key,
      isBody: p.isBody,
      decadalFrom: p.decadal.from,
      stars: [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].map((m) => [m.key, m.brightness ?? null]),
      mutagens: [...p.majorStars, ...p.minorStars].flatMap((m) => (m.mutagen ? [`${m.key}:${m.mutagen}`] : [])),
    })),
  };
}

export type Category = 'cung' | 'chinh_tinh' | 'phu_tinh' | 'tu_hoa' | 'do_sang' | 'dai_han' | 'tuan_triet';

export const CATEGORY_LABEL: Record<Category, string> = {
  cung: 'Mệnh, Thân và tên 12 cung',
  chinh_tinh: 'Vị trí 14 chính tinh',
  phu_tinh: 'Vị trí 14 phụ tinh chính và Khốc, Hư, Hình, Riêu',
  tu_hoa: 'Tứ hóa theo năm sinh',
  do_sang: 'Độ sáng (chính tinh, phụ tinh có độ sáng)',
  dai_han: 'Tuổi khởi đại hạn từng cung',
  tuan_triet: 'Tuần, Triệt (cung của iztro nằm trong cặp cung)',
};

export interface Diff {
  cat: Category;
  msg: string;
  star?: string;
  hoa?: { hoa: string; engineStar?: string; lasoStars: string[] };
  brightness?: { at: string; engine: string | null; laso: string | null };
}

const where = (ps: { branch: string; keys: string[] }[], key: string) =>
  ps.filter((p) => p.keys.includes(key)).map((p) => p.branch).sort().join('+') || '—';

/** So một ca của bộ tính với lasotuvi; trả về danh sách chỗ lệch. */
export function compareCase(e: EngineCase, l: LasoCase): Diff[] {
  const diffs: Diff[] = [];
  const eKeys = e.palaces!.map((p) => ({ branch: p.branch, keys: p.stars.map((s) => s[0]) }));
  const lKeys = l.palaces.map((p) => ({ branch: p.branch, keys: p.stars.map((s) => s[0]) }));

  for (const p of e.palaces!) {
    const q = l.palaces.find((x) => x.branch === p.branch)!;
    if (p.key !== q.key) diffs.push({ cat: 'cung', msg: `${p.branch}: ${p.key} ≠ ${q.key}` });
    if (p.isBody !== q.isBody) diffs.push({ cat: 'cung', msg: `Thân ở ${p.branch}: ${p.isBody} ≠ ${q.isBody}` });
    if (p.decadalFrom !== q.decadalFrom) diffs.push({ cat: 'dai_han', msg: `${p.branch}: ${p.decadalFrom} ≠ ${q.decadalFrom}` });
    for (const [key, b] of p.stars) {
      const lb = q.stars.find((s) => s[0] === key);
      if (!lb || !COMPARED_STARS.includes(key) || LASO_NO_BRIGHTNESS.includes(key) || b === lb[1]) continue;
      diffs.push({
        cat: 'do_sang',
        msg: `${key}@${p.branch}: ${b ?? '—'} ≠ ${lb[1] ?? '—'}`,
        star: key,
        brightness: { at: `${key}@${p.branch}`, engine: b, laso: lb[1] },
      });
    }
    // iztro đặt Tuần/Triệt vào một cung; lối Việt Nam cho mỗi sao nằm giữa hai cung.
    // Khớp khi cung của iztro là một trong hai cung của lasotuvi.
    const has = (k: string) => p.stars.some((s) => s[0] === k);
    if (has('tuan_khong') && !q.tuan) diffs.push({ cat: 'tuan_triet', msg: `Tuần ở ${p.branch} nhưng lasotuvi không có` });
    if (has('triet_lo') && !q.triet) diffs.push({ cat: 'tuan_triet', msg: `Triệt ở ${p.branch} nhưng lasotuvi không có` });
  }
  for (const [cat, stars] of [['chinh_tinh', MAJORS], ['phu_tinh', [...MINORS, ...BRIGHT_ADJECTIVES]]] as const) {
    for (const s of stars) {
      const a = where(eKeys, s);
      const b = where(lKeys, s);
      if (a !== b) diffs.push({ cat, msg: `${s}: ${a} ≠ ${b}`, star: s });
    }
  }
  for (const hoa of ['loc', 'quyen', 'khoa', 'ky']) {
    const ep = e.palaces!.find((p) => p.mutagens.some((m) => m.endsWith(`:${hoa}`)));
    const lp = l.palaces.find((p) => p.hoa.includes(hoa));
    if (ep?.branch === lp?.branch) continue;
    const engineStar = ep?.mutagens.find((m) => m.endsWith(`:${hoa}`))?.split(':')[0];
    const lasoStars = lp ? lp.stars.map((s) => s[0]).filter((k) => MAJORS.includes(k) || MINORS.includes(k)) : [];
    diffs.push({
      cat: 'tu_hoa',
      msg: `${hoa}: ${engineStar}@${ep?.branch} ≠ [${lasoStars.join(',')}]@${lp?.branch}`,
      hoa: { hoa, ...(engineStar && { engineStar }), lasoStars },
    });
  }
  return diffs;
}
