import { CAN, CHI, formatDate, jdFromDate, jdToDate, yearCanChi } from '@tinhban/calendar';
import { MUTAGENS, type ChartSnapshot, type Mutagen } from '@tinhban/shared';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { getFlyingMutagens, SCHOOLS, tamPhuongTuChinh } from '../src/index.ts';
import { branchOf, chart, palaceAt } from './helpers.ts';

const hoaStar = (s: ChartSnapshot, m: Mutagen) =>
  s.palaces!.flatMap((p) => [...p.majorStars, ...p.minorStars]).find((x) => x.mutagen === m)?.key;

const randomInput = fc.record({
  jd: fc.integer({ min: jdFromDate(1, 1, 1976), max: jdFromDate(31, 12, 2040) }),
  hour: fc.integer({ min: 0, max: 23 }),
  gender: fc.constantFrom('male' as const, 'female' as const),
});
const randomChart = ({ jd, hour, gender }: { jd: number; hour: number; gender: 'male' | 'female' }, school: 'nam' | 'bac' = 'nam') =>
  chart({ date: formatDate(jdToDate(jd)), time: `${String(hour).padStart(2, '0')}:20`, gender }, school);

describe('quy ước an sao lối Việt Nam (đề xuất cho cả hai phái)', () => {
  it('Tứ hóa năm Canh: Khoa Thiên Đồng, Kỵ Thái Âm', () => {
    const s = chart({ date: '2000-08-16' });
    expect(s.lunar.canChi.year).toBe('Canh Thìn');
    expect(MUTAGENS.map((m) => hoaStar(s, m))).toEqual(['thai_duong', 'vu_khuc', 'thien_dong', 'thai_am']);
  });

  it('Tứ hóa năm Nhâm: Khoa Thiên Phủ', () => {
    const s = chart({ date: '2012-06-15' });
    expect(s.lunar.canChi.year).toBe('Nhâm Thìn');
    expect(MUTAGENS.map((m) => hoaStar(s, m))).toEqual(['thien_luong', 'tu_vi', 'thien_phu', 'vu_khuc']);
  });

  it('Khôi Việt năm Đinh: Khôi ở Dậu, Việt ở Hợi', () => {
    const s = chart({ date: '1997-05-25' });
    expect(s.lunar.canChi.year).toBe('Đinh Sửu');
    expect(branchOf(s, 'thien_khoi')).toBe('Dậu');
    expect(branchOf(s, 'thien_viet')).toBe('Hợi');
  });

  it('Hỏa Linh năm Thìn giờ Dần: Dương nam Hỏa thuận từ Dần, Linh nghịch từ Tuất; Dương nữ thì ngược lại', () => {
    const male = chart({ gender: 'male' });
    expect([branchOf(male, 'hoa_tinh'), branchOf(male, 'linh_tinh')]).toEqual(['Thìn', 'Thân']);
    const female = chart({ gender: 'female' });
    expect([branchOf(female, 'hoa_tinh'), branchOf(female, 'linh_tinh')]).toEqual(['Tý', 'Tý']);
  });

  it('độ sáng chỉ dùng thang 5 mức, và đủ 14 phụ tinh chính', () => {
    fc.assert(
      fc.property(randomInput, (i) => {
        const s = randomChart(i);
        const stars = s.palaces!.flatMap((p) => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]);
        for (const x of stars) expect(['mieu', 'vuong', 'dac', 'binh', 'ham', undefined]).toContain(x.brightness);
        expect(s.palaces!.flatMap((p) => p.minorStars)).toHaveLength(14);
      }),
      { numRuns: 60 },
    );
  });
});

describe('Nam phái và Bắc phái', () => {
  it('đổi phái không đổi vị trí 14 chính tinh, Mệnh, Thân', () => {
    fc.assert(
      fc.property(randomInput, (i) => {
        const nam = randomChart(i, 'nam');
        const bac = randomChart(i, 'bac');
        const majors = (s: ChartSnapshot) => s.palaces!.map((p) => [p.branch, p.key, p.isBody, p.majorStars.map((x) => x.key)]);
        expect(majors(bac)).toEqual(majors(nam));
        expect(bac.schoolId).toBe('bac');
      }),
      { numRuns: 40 },
    );
  });

  it('chỉ Bắc phái có fact phi hóa: 12 cung × 4 hóa', () => {
    expect(chart({}, 'nam').facts.filter((f) => f.startsWith('fly:'))).toEqual([]);
    expect(chart({}, 'bac').facts.filter((f) => f.startsWith('fly:'))).toHaveLength(48);
  });

  it('chính sách hiển thị theo phái', () => {
    expect(SCHOOLS.nam).toMatchObject({ showPalaceStems: false, palaceTapMode: 'tam_phuong' });
    expect(SCHOOLS.bac).toMatchObject({ showPalaceStems: true, palaceTapMode: 'phi_hoa' });
  });

  it('thiên can 12 cung theo ngũ hổ độn: can cung Dần suy từ can năm, rồi đi thuận', () => {
    for (const date of ['1984-06-01', '1990-06-01', '2000-08-16', '2013-03-01', '2027-07-07']) {
      const s = chart({ date });
      const yearCan = yearCanChi(s.lunar.year).can;
      const dan = ((yearCan % 5) * 2 + 2) % 10;
      for (const p of s.palaces!) {
        const offset = (CHI.indexOf(p.branch as (typeof CHI)[number]) - 2 + 12) % 12;
        expect(p.stem, `${date} cung ${p.branch}`).toBe(CAN[(dan + offset) % 10]);
      }
    }
  });
});

describe('phi hóa (getFlyingMutagens)', () => {
  it('mỗi cung phát đủ 4 hóa, hóa rơi đúng cung có sao đó, tự hóa khi rơi lại chính cung', () => {
    fc.assert(
      fc.property(randomInput, (i) => {
        const s = randomChart(i, 'bac');
        for (const from of s.palaces!) {
          const hits = getFlyingMutagens(s, from.key);
          expect(hits.map((h) => h.mutagen)).toEqual(MUTAGENS);
          expect(hits.map((h) => h.starKey)).toEqual(SCHOOLS.bac.mutagenTable[from.stem]);
          for (const h of hits) {
            const to = palaceAt(s, h.palaceKey!);
            expect([...to.majorStars, ...to.minorStars].map((x) => x.key)).toContain(h.starKey);
            expect(h.self).toBe(to.key === from.key);
            expect(s.facts).toContain(`fly:${from.key}|hoa:${h.mutagen}|to:${to.key}`);
          }
        }
      }),
      { numRuns: 30 },
    );
  });

  it('cung có can trùng can năm phát hóa trùng Tứ hóa năm sinh', () => {
    const s = chart({}, 'bac');
    const yearStem = s.lunar.canChi.year.split(' ')[0]!;
    const same = s.palaces!.filter((p) => p.stem === yearStem);
    expect(same.length).toBeGreaterThan(0);
    for (const p of same) {
      expect(getFlyingMutagens(s, p.key).map((h) => h.starKey)).toEqual(MUTAGENS.map((m) => hoaStar(s, m)));
    }
  });

  it('báo lỗi khi thiếu 12 cung hoặc sai tên cung', () => {
    expect(() => getFlyingMutagens(chart({ time: undefined, timeCertainty: 'unknown' }, 'bac'), 'menh')).toThrow();
    expect(() => getFlyingMutagens(chart({}, 'bac'), 'khong_co')).toThrow(RangeError);
  });
});

describe('tam phương tứ chính', () => {
  it('Mệnh ở Ngọ: tam hợp Tuất, Dần; xung chiếu Tý', () => {
    const s = chart({});
    const t = tamPhuongTuChinh(s, 'menh');
    const branch = (k: string) => palaceAt(s, k).branch;
    expect(branch(t.self)).toBe('Ngọ');
    expect(t.tamHop.map(branch)).toEqual(['Tuất', 'Dần']);
    expect(branch(t.xungChieu)).toBe('Tý');
    expect(t.tamHop).toEqual(['quan_loc', 'tai_bach']);
    expect(t.xungChieu).toBe('thien_di');
  });
});
