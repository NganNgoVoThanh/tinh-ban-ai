import { formatDate, jdFromDate, jdToDate } from '@tinhban/calendar';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InvalidBirthInputError } from '../src/index.ts';
import { chart, palaceAt } from './helpers.ts';

describe('lá số mẫu 16/8/2000 giờ Dần, nam', () => {
  const s = chart({});

  it('âm lịch và can chi', () => {
    expect(s.lunar).toMatchObject({ year: 2000, month: 7, day: 17, isLeap: false });
    expect(s.lunar.canChi).toEqual({ year: 'Canh Thìn', month: 'Giáp Thân', day: 'Bính Ngọ', hour: 'Canh Dần' });
  });

  it('Mệnh ở Ngọ có Tử Vi miếu, Mộc tam cục', () => {
    const menh = palaceAt(s, 'menh');
    expect(menh.branch).toBe('Ngọ');
    expect(menh.majorStars).toEqual([{ key: 'tu_vi', name: 'Tử Vi', kind: 'major', brightness: 'mieu' }]);
    expect(s.core).toMatchObject({ menhBranch: 'Ngọ', cuc: { element: 'moc', number: 3 } });
  });

  it('có fact ổn định cho sao và tứ hóa', () => {
    expect(s.facts).toContain('palace:menh|star:tu_vi|state:mieu');
    expect(s.facts).toContain('palace:tai_bach|star:vu_khuc|hoa:quyen');
    expect(s.facts).toContain('year:canh_thin');
  });

  it('cùng đầu vào cho cùng kết quả', () => {
    expect(chart({})).toEqual(s);
  });
});

describe('bất biến của lá số', () => {
  const input = fc.record({
    jd: fc.integer({ min: jdFromDate(1, 1, 1930), max: jdFromDate(31, 12, 2050) }),
    hour: fc.integer({ min: 0, max: 23 }),
    gender: fc.constantFrom('male' as const, 'female' as const),
    region: fc.constantFrom('north' as const, 'south' as const),
  });

  it('12 cung khác địa chi, đủ 14 chính tinh, một Mệnh, một Thân, đủ 4 hóa', () => {
    fc.assert(
      fc.property(input, ({ jd, hour, gender, region }) => {
        const s = chart({ date: formatDate(jdToDate(jd)), time: `${String(hour).padStart(2, '0')}:15`, gender, region });
        const palaces = s.palaces!;
        expect(new Set(palaces.map((p) => p.branch)).size).toBe(12);
        const majors = palaces.flatMap((p) => p.majorStars.map((m) => m.key));
        expect(majors).toHaveLength(14);
        expect(new Set(majors).size).toBe(14);
        expect(palaces.filter((p) => p.key === 'menh')).toHaveLength(1);
        expect(palaces.filter((p) => p.isBody)).toHaveLength(1);
        expect(palaceAt(s, 'menh').branch).toBe(s.core!.menhBranch);
        const hoa = palaces.flatMap((p) => [...p.majorStars, ...p.minorStars].flatMap((x) => (x.mutagen ? [x.mutagen] : [])));
        expect(hoa.sort()).toEqual(['khoa', 'ky', 'loc', 'quyen']);
      }),
      { numRuns: 200 },
    );
  });

  it('sao an theo năm không đổi khi đổi giờ sinh', () => {
    fc.assert(
      fc.property(input, ({ jd, gender }) => {
        const date = formatDate(jdToDate(jd));
        const noTime = chart({ date, gender, time: undefined, timeCertainty: 'unknown' });
        for (const hour of [1, 9, 13, 21]) {
          const s = chart({ date, gender, time: `${String(hour).padStart(2, '0')}:00` });
          for (const b of noTime.yearStars!) {
            const p = s.palaces!.find((x) => x.branch === b.branch)!;
            const names = new Set([...p.minorStars, ...p.adjectiveStars].map((x) => x.key));
            for (const star of b.stars) expect(names.has(star.key), `${star.name} ở ${b.branch}`).toBe(true);
          }
        }
      }),
      { numRuns: 25 },
    );
  });
});

describe('lịch và giờ Việt Nam', () => {
  it('25/1/1985 là năm Ất Sửu theo lịch Việt Nam (Trung Quốc vẫn là Giáp Tý)', () => {
    const s = chart({ date: '1985-01-25' });
    expect(s.lunar).toMatchObject({ year: 1985, month: 1, day: 5 });
    expect(s.lunar.canChi.year).toBe('Ất Sửu');
    expect(s.trace.map((t) => t.rule)).toContain('ENG.PROXY.SAME_YEAR');
  });

  it('miền Nam 1965: 09:30 giờ đồng hồ là 08:30 giờ chuẩn, giờ Thìn', () => {
    const south = chart({ date: '1965-06-01', time: '09:30', region: 'south' });
    const north = chart({ date: '1965-06-01', time: '09:30', region: 'north' });
    expect(south.normalizedTime?.localStd).toBe('1965-06-01T08:30');
    expect(south.lunar.canChi.hour?.endsWith('Thìn')).toBe(true);
    expect(north.lunar.canChi.hour?.endsWith('Tỵ')).toBe(true);
  });

  it('23:30 tính là giờ Tý của ngày hôm sau', () => {
    const late = chart({ date: '2000-08-16', time: '23:30' });
    const next = chart({ date: '2000-08-17', time: '00:30' });
    expect(late.lunar).toEqual(next.lunar);
    expect(late.palaces).toEqual(next.palaces);
    expect(late.trace.map((t) => t.rule)).toContain('ENG.HOUR.LATE_TY_NEXT_DAY');
  });

  it('nhập âm lịch cho cùng lá số với dương lịch', () => {
    const lunar = chart({ calendar: 'lunar', date: '2000-07-17' });
    expect(lunar.palaces).toEqual(chart({}).palaces);
  });

  it('sinh tháng nhuận có cảnh báo và an theo tháng chính', () => {
    const s = chart({ date: '2023-03-25' });
    expect(s.lunar).toMatchObject({ month: 2, isLeap: true });
    expect(s.warnings.map((w) => w.code)).toContain('LEAP_MONTH');
    expect(s.palaces).toEqual(chart({ calendar: 'lunar', date: '2023-02-04', isLeapMonth: false }).palaces);
  });

  it('thiếu giờ sinh thì không có 12 cung, chỉ có sao an theo năm', () => {
    const s = chart({ time: undefined, timeCertainty: 'unknown' });
    expect(s.palaces).toBeUndefined();
    expect(s.yearStars).toHaveLength(12);
    expect(s.warnings.map((w) => w.code)).toEqual(['NO_BIRTH_TIME']);
    expect(s.facts.some((f) => f.startsWith('palace:'))).toBe(false);
  });

  it('30/6 nhuận năm 2017: lịch Trung Quốc không có ngày đại diện nên báo "chưa hỗ trợ", không đoán', () => {
    // Giới hạn đã biết của lớp bọc iztro (19 ngày 30 trong 1901–2099). Hết giới hạn khi tự an sao.
    const s = chart({ calendar: 'lunar', date: '2017-06-30', isLeapMonth: true });
    expect(s.palaces).toBeUndefined();
    expect(s.yearStars).toBeUndefined();
    expect(s.lunar).toMatchObject({ year: 2017, month: 6, day: 30, isLeap: true });
    expect(s.warnings.map((w) => w.code)).toContain('UNSUPPORTED_DAY30');
    // Tháng 6 thường năm 2017 chỉ có 29 ngày.
    expect(() => chart({ calendar: 'lunar', date: '2017-06-30' })).toThrow(InvalidBirthInputError);
  });

  it('báo lỗi rõ khi đầu vào sai', () => {
    expect(() => chart({ date: '2023-02-30' })).toThrow(InvalidBirthInputError);
    expect(() => chart({ calendar: 'lunar', date: '2024-05-01', isLeapMonth: true })).toThrow(InvalidBirthInputError);
    expect(() => chart({ time: '25:00' })).toThrow(InvalidBirthInputError);
  });
});
