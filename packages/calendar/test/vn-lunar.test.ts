import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  canChiName,
  dayCanChi,
  hourBranchIndex,
  hourCanChi,
  jdFromDate,
  jdToDate,
  lunarToSolar,
  lunarToSolarTz,
  monthCanChi,
  SOLAR_TERMS,
  solarMonthBranch,
  solarTermIndex,
  solarToLunar,
  solarToLunarTz,
  yearCanChi,
} from '../src/index.ts';

const d = (year: number, month: number, day: number) => ({ year, month, day });

describe('Tết theo lịch Việt Nam (UTC+7)', () => {
  it.each([
    ['2024-02-10', 2024],
    ['2025-01-29', 2025],
    ['2026-02-17', 2026],
    ['2027-02-06', 2027],
    ['2000-02-05', 2000],
  ])('%s là mùng 1 Tết năm %i', (iso, year) => {
    expect(solarToLunar(iso, 'north')).toMatchObject({ year, month: 1, day: 1, isLeap: false });
  });

  it('Tết Ất Sửu 1985: Việt Nam 21/1, Trung Quốc 20/2', () => {
    expect(solarToLunarTz(d(1985, 1, 21), 7)).toMatchObject({ year: 1985, month: 1, day: 1 });
    expect(solarToLunarTz(d(1985, 2, 20), 8)).toMatchObject({ year: 1985, month: 1, day: 1 });
  });

  it('Tết Mậu Thân 1968: miền Bắc 29/1, miền Nam 30/1', () => {
    expect(solarToLunar('1968-01-29', 'north')).toMatchObject({ year: 1968, month: 1, day: 1, timeZone: 7 });
    expect(solarToLunar('1968-01-30', 'south')).toMatchObject({ year: 1968, month: 1, day: 1, timeZone: 8 });
    expect(solarToLunar('1968-01-29', 'south')).toMatchObject({ year: 1967, month: 12 });
  });
});

describe('tháng nhuận', () => {
  it.each([
    ['2020-05-23', 2020, 4],
    ['2023-03-22', 2023, 2],
    ['2025-07-25', 2025, 6],
  ])('%s là mùng 1 tháng %i nhuận %i', (iso, year, month) => {
    expect(solarToLunar(iso, 'north')).toMatchObject({ year, month, day: 1, isLeap: true });
  });

  it('không có tháng nhuận sai chỗ', () => {
    expect(lunarToSolarTz({ year: 2025, month: 5, day: 1, isLeap: true }, 7)).toBeNull();
    expect(lunarToSolarTz({ year: 2024, month: 6, day: 1, isLeap: true }, 7)).toBeNull();
  });

  it('ngày 30 của tháng thiếu thì không tồn tại', () => {
    // Tháng Chạp Giáp Thìn (2024) chỉ có 29 ngày: mùng 1 Tết Ất Tỵ là 29/1/2025.
    expect(lunarToSolarTz({ year: 2024, month: 12, day: 29, isLeap: false }, 7)).toEqual(d(2025, 1, 28));
    expect(lunarToSolarTz({ year: 2024, month: 12, day: 30, isLeap: false }, 7)).toBeNull();
  });
});

describe('bất biến', () => {
  const solarDate = fc
    .integer({ min: jdFromDate(1, 1, 1901), max: jdFromDate(31, 12, 2099) })
    .map((jd) => jdToDate(jd));

  it('dương → âm → dương ra lại đúng ngày (UTC+7 và UTC+8)', () => {
    fc.assert(
      fc.property(solarDate, fc.constantFrom(7, 8), (solar, tz) => {
        const lunar = solarToLunarTz(solar, tz);
        expect(lunarToSolarTz(lunar, tz)).toEqual(solar);
      }),
      { numRuns: 3000 },
    );
  });

  it('lunarToSolar theo vùng khớp với solarToLunar theo vùng', () => {
    fc.assert(
      fc.property(solarDate, fc.constantFrom('north' as const, 'south' as const), (solar, region) => {
        const lunar = solarToLunar(solar, region);
        expect(lunarToSolar(lunar, lunar.isLeap, region)).toEqual(solar);
      }),
      { numRuns: 1000 },
    );
  });

  it('mọi ngày 1901–2099: ngày âm trong 1..30, tháng trong 1..12, ngày sau = ngày trước + 1 hoặc mùng 1', () => {
    for (const tz of [7, 8]) {
      let prev = solarToLunarTz(jdToDate(jdFromDate(31, 12, 1900)), tz);
      for (let jd = jdFromDate(1, 1, 1901); jd <= jdFromDate(31, 12, 2099); jd++) {
        const l = solarToLunarTz(jdToDate(jd), tz);
        const ok = l.day >= 1 && l.day <= 30 && l.month >= 1 && l.month <= 12 && (l.day === prev.day + 1 || l.day === 1);
        if (!ok) expect.fail(`UTC+${tz}, ${JSON.stringify(jdToDate(jd))}: ${JSON.stringify(l)} sau ${JSON.stringify(prev)}`);
        prev = l;
      }
    }
  });

  it('sóc sát nửa đêm không ra "mùng 0" (lỗi của bản gốc)', () => {
    expect(solarToLunarTz(d(1939, 4, 19), 8)).toMatchObject({ month: 2, day: 30 });
    expect(solarToLunarTz(d(2009, 3, 26), 8)).toMatchObject({ month: 2, day: 30 });
    expect(solarToLunarTz(d(1947, 3, 22), 8)).toMatchObject({ month: 2, day: 30, isLeap: false });
  });
});

describe('can chi', () => {
  it('năm, tháng, ngày, giờ của 16/8/2000 giờ Dần', () => {
    expect(canChiName(yearCanChi(2000))).toBe('Canh Thìn');
    expect(canChiName(monthCanChi(2000, 7))).toBe('Giáp Thân');
    const day = dayCanChi(d(2000, 8, 16));
    expect(canChiName(day)).toBe('Bính Ngọ');
    expect(canChiName(hourCanChi(day.can, hourBranchIndex(3)))).toBe('Canh Dần');
  });

  it('năm 2027 là Đinh Mùi, 1985 là Ất Sửu', () => {
    expect(canChiName(yearCanChi(2027))).toBe('Đinh Mùi');
    expect(canChiName(yearCanChi(1985))).toBe('Ất Sửu');
  });

  it('giờ Tý từ 23:00 đến 00:59', () => {
    expect(hourBranchIndex(23)).toBe(0);
    expect(hourBranchIndex(0)).toBe(0);
    expect(hourBranchIndex(1)).toBe(1);
    expect(hourBranchIndex(22)).toBe(11);
  });
});

describe('tiết khí', () => {
  it('các mốc quen thuộc: Lập xuân 4/2, Xuân phân 20–21/3, Hạ chí 21/6, Đông chí 21–22/12', () => {
    expect(SOLAR_TERMS[solarTermIndex({ year: 2026, month: 2, day: 4 })]).toBe('Lập xuân');
    expect(SOLAR_TERMS[solarTermIndex({ year: 2026, month: 3, day: 21 })]).toBe('Xuân phân');
    expect(SOLAR_TERMS[solarTermIndex({ year: 2026, month: 6, day: 21 })]).toBe('Hạ chí');
    expect(SOLAR_TERMS[solarTermIndex({ year: 2026, month: 12, day: 22 })]).toBe('Đông chí');
  });

  it('tháng theo tiết: sau Lập xuân là tháng Dần, sau Lập đông là tháng Hợi', () => {
    expect(solarMonthBranch({ year: 2026, month: 2, day: 10 })).toBe(2);
    expect(solarMonthBranch({ year: 2026, month: 11, day: 15 })).toBe(11);
    expect(solarMonthBranch({ year: 2026, month: 1, day: 10 })).toBe(1);
  });
});
