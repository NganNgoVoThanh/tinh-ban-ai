import { describe, expect, it } from 'vitest';
import { InvalidBirthInputError } from '../src/index.ts';
import { chart } from './helpers.ts';

const codes = (s: ReturnType<typeof chart>) => s.warnings.map((w) => w.code);
const rules = (s: ReturnType<typeof chart>) => s.trace.map((t) => t.rule);
const canh = (timeBranch: number, extra: Parameters<typeof chart>[0] = {}) =>
  chart({ timeCertainty: 'canh', time: undefined, timeBranch, ...extra });

describe('nhập theo giờ âm', () => {
  it('giờ Tý sau nửa đêm cho cùng lá số với 00:30; trước nửa đêm cho cùng lá số với 23:30 cùng ngày', () => {
    const after = canh(0, { tyPart: 'after_midnight' });
    expect(after.palaces).toEqual(chart({ time: '00:30' }).palaces);
    expect(after.lunar).toEqual(chart({ time: '00:30' }).lunar);
    const before = canh(0, { tyPart: 'before_midnight' });
    expect(before.palaces).toEqual(chart({ time: '23:30' }).palaces);
    expect(before.lunar).toEqual(chart({ date: '2000-08-17', time: '00:30' }).lunar);
    expect(rules(before)).toContain('ENG.HOUR.LATE_TY_NEXT_DAY');
  });

  it('mỗi giờ âm cho cùng lá số với giờ phút nằm trong giờ âm đó', () => {
    for (let b = 1; b < 12; b++) {
      const exact = chart({ time: `${String(2 * b - 1).padStart(2, '0')}:05` });
      expect(canh(b).palaces, `giờ âm ${b}`).toEqual(exact.palaces);
    }
  });

  it('miền Nam 1965: không quy đổi giờ âm, cảnh báo TIME_APPROX', () => {
    const s = canh(5, { date: '1965-06-01', region: 'south' });
    expect(s.lunar.canChi.hour?.endsWith('Tỵ')).toBe(true);
    expect(s.normalizedTime?.ruleCode).toBe('ENG.TZ.CANH_NO_SHIFT');
    expect(codes(s)).toContain('TIME_APPROX');
    expect(codes(canh(5, { date: '1965-06-01', region: 'north' }))).not.toContain('TIME_APPROX');
  });
});

describe('sinh ở nước ngoài', () => {
  const la = { region: 'abroad' as const, abroadTz: 'America/Los_Angeles', date: '2000-07-01' };

  it('Los Angeles 10:00 giờ mùa hè cho cùng lá số với 09:00 giờ chuẩn; ngày âm theo lịch Việt Nam', () => {
    const s = chart({ ...la, time: '10:00' });
    expect(s.normalizedTime).toMatchObject({ localStd: '2000-07-01T09:00', ruleCode: 'ENG.TZ.ABROAD_DST_REMOVED' });
    expect(s.palaces).toEqual(chart({ date: '2000-07-01', time: '09:00' }).palaces);
    expect(s.lunar).toEqual(chart({ date: '2000-07-01', time: '09:00' }).lunar);
    expect(codes(s)).toEqual(['REGION_ABROAD']);
  });

  it('luôn có cảnh báo REGION_ABROAD, kể cả khi thiếu giờ', () => {
    expect(codes(chart({ ...la, time: undefined, timeCertainty: 'unknown' }))).toEqual(['REGION_ABROAD', 'NO_BIRTH_TIME']);
  });

  it('cần múi giờ hợp lệ và không kèm tỉnh', () => {
    expect(() => chart({ ...la, abroadTz: undefined })).toThrow(InvalidBirthInputError);
    expect(() => chart({ ...la, abroadTz: 'Mars/Olympus' })).toThrow(InvalidBirthInputError);
    expect(() => chart({ ...la, provinceCode: '01' })).toThrow(InvalidBirthInputError);
    expect(() => chart({ abroadTz: 'Asia/Tokyo' })).toThrow(InvalidBirthInputError);
  });
});

describe('giờ chuẩn do người dùng tự sửa', () => {
  it('miền Nam 1965 09:30 sửa thành 09:30 giờ chuẩn cho cùng lá số với miền Bắc 09:30', () => {
    const s = chart({ date: '1965-06-01', time: '09:30', region: 'south', stdTimeOverride: '09:30' });
    expect(s.normalizedTime).toMatchObject({ localStd: '1965-06-01T09:30', ruleCode: 'ENG.TZ.USER_OVERRIDE' });
    expect(s.trace.find((t) => t.rule === 'ENG.TZ.USER_OVERRIDE')?.detail).toBe('1965-06-01T08:30 → 1965-06-01T09:30 (người dùng sửa)');
    expect(s.palaces).toEqual(chart({ date: '1965-06-01', time: '09:30', region: 'north' }).palaces);
  });

  it('chỉ sửa được khi nhập giờ phút', () => {
    expect(() => canh(3, { stdTimeOverride: '05:00' })).toThrow(InvalidBirthInputError);
  });
});

describe('nơi sinh', () => {
  it('sinh trước 1976 trong nước phải có tỉnh; từ 1976 thì không bắt buộc', () => {
    expect(() => chart({ date: '1975-12-31', provinceCode: undefined })).toThrow(/trước 1976/);
    expect(chart({ date: '1976-01-01', provinceCode: undefined }).palaces).toHaveLength(12);
  });

  it('vùng phải khớp tỉnh', () => {
    expect(() => chart({ date: '1965-06-01', region: 'south', provinceCode: '01' })).toThrow(/không khớp/);
  });

  it('Quảng Trị 1965 phải chọn bờ sông; bờ Bắc tính như miền Bắc', () => {
    expect(() => chart({ date: '1965-06-01', provinceCode: '45', region: 'south' })).toThrow(/Bến Hải/);
    const north = chart({ date: '1965-06-01', time: '09:30', provinceCode: '45', benHaiSide: 'north', region: 'north' });
    expect(north.palaces).toEqual(chart({ date: '1965-06-01', time: '09:30' }).palaces);
    const south = chart({ date: '1965-06-01', time: '09:30', provinceCode: '45', benHaiSide: 'south', region: 'south' });
    expect(south.normalizedTime?.localStd).toBe('1965-06-01T08:30');
    expect(() => chart({ benHaiSide: 'north' })).toThrow(/Quảng Trị/);
  });

  it('cờ tháng nhuận chỉ đi với âm lịch', () => {
    expect(() => chart({ isLeapMonth: true })).toThrow(InvalidBirthInputError);
  });
});
