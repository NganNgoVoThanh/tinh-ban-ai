import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  formatDate,
  jdFromDate,
  jdToDate,
  leapMonthOf,
  needsBenHaiSide,
  needsBirthPlace,
  normalizeBirthTime,
  PROVINCES,
  regionOfProvince,
  resolveIanaClock,
  standardOffsetMin,
  type BirthTimeInput,
} from '../src/index.ts';

const norm = (i: Partial<BirthTimeInput>) =>
  normalizeBirthTime({ date: '2000-08-16', timeCertainty: 'exact', region: 'north', ...i });

describe('nhập theo giờ âm', () => {
  const canh = (timeBranch: number, extra: Partial<BirthTimeInput> = {}) =>
    norm({ timeCertainty: 'canh', timeBranch, ...extra })!;

  it('mỗi giờ âm ra đúng giờ âm đó, lấy giữa khung giờ', () => {
    for (let b = 1; b < 12; b++) {
      const n = canh(b);
      expect(n.hourBranch).toBe(b);
      expect(n.std.hour).toBe(2 * b);
      expect(n.ruleCode).toBe('ENG.TZ.CANH_NO_SHIFT');
    }
  });

  it('giờ Tý trước nửa đêm là 23 giờ của ngày đã nhập, sau nửa đêm là 0 giờ', () => {
    expect(canh(0, { tyPart: 'before_midnight' }).localStd).toBe('2000-08-16T23:30');
    expect(canh(0, { tyPart: 'after_midnight' }).localStd).toBe('2000-08-16T00:30');
  });

  it('không quy đổi múi giờ, nhưng báo approx khi giờ đồng hồ lúc đó lệch UTC+7', () => {
    const south = canh(5, { date: '1965-06-01', region: 'south' });
    expect(south.localStd).toBe('1965-06-01T10:00');
    expect(south.hourBranch).toBe(5);
    expect(south.clockOffsetMin).toBe(480);
    expect(south.approx).toBe(true);
    expect(canh(5, { date: '1965-06-01', region: 'north' }).approx).toBe(false);
  });

  it('từ chối giờ âm sai hoặc thiếu phần trước/sau nửa đêm', () => {
    expect(() => canh(12)).toThrow(RangeError);
    expect(() => canh(1.5)).toThrow(RangeError);
    expect(() => canh(0)).toThrow(/nửa đêm/);
    expect(() => canh(3, { tyPart: 'after_midnight' })).toThrow(RangeError);
    expect(() => canh(3, { time: '05:00' })).toThrow(RangeError);
    expect(() => canh(3, { stdTimeOverride: '05:00' })).toThrow(/giờ phút/);
  });
});

describe('giờ chuẩn do người dùng tự sửa', () => {
  it('thay giờ, giữ ngày của giờ tự tính', () => {
    const n = norm({ time: '09:30', stdTimeOverride: '10:15' })!;
    expect(n.localStd).toBe('2000-08-16T10:15');
    expect(n.hourBranch).toBe(5);
    expect(n.ruleCode).toBe('ENG.TZ.USER_OVERRIDE');
    expect(n.autoLocalStd).toBe('2000-08-16T09:30');
    expect(n.utc).toBe('2000-08-16T03:15:00.000Z');
  });

  it('giờ sửa vượt nửa đêm thì lấy ngày gần giờ tự tính nhất', () => {
    // Miền Nam 1970: 00:20 đồng hồ là 23:20 hôm trước theo giờ chuẩn.
    const base = { date: '1970-03-10', time: '00:20', region: 'south' as const };
    expect(norm({ ...base, stdTimeOverride: '23:50' })!.localStd).toBe('1970-03-09T23:50');
    expect(norm({ ...base, stdTimeOverride: '00:10' })!.localStd).toBe('1970-03-10T00:10');
  });

  it('sửa tay thì bỏ cờ gap/overlap/không chắc', () => {
    const n = norm({ date: '1959-12-31', time: '23:30', region: 'south', stdTimeOverride: '23:30' })!;
    expect(n.status).toBe('ok');
    expect(n.uncertain).toBe(false);
  });
});

describe('sinh ở nước ngoài', () => {
  const abroad = (abroadTz: string, date: string, time: string) => norm({ region: 'abroad', abroadTz, date, time })!;

  it('bỏ giờ mùa hè: Los Angeles 10:00 tháng 7 (PDT) là 09:00 giờ chuẩn', () => {
    const n = abroad('America/Los_Angeles', '2000-07-01', '10:00');
    expect(n.clockOffsetMin).toBe(-420);
    expect(n.stdOffsetMin).toBe(-480);
    expect(n.localStd).toBe('2000-07-01T09:00');
    expect(n.ruleCode).toBe('ENG.TZ.ABROAD_DST_REMOVED');
    expect(n.utc).toBe('2000-07-01T17:00:00.000Z');
  });

  it('mùa đông giữ nguyên giờ; Nam bán cầu bỏ giờ mùa hè vào tháng 1', () => {
    expect(abroad('America/Los_Angeles', '2000-01-15', '10:00').localStd).toBe('2000-01-15T10:00');
    expect(abroad('America/Los_Angeles', '2000-01-15', '10:00').ruleCode).toBe('ENG.TZ.ABROAD_STD');
    expect(abroad('Australia/Sydney', '2001-01-15', '10:00').localStd).toBe('2001-01-15T09:00');
    expect(abroad('Asia/Tokyo', '1990-08-01', '23:30').localStd).toBe('1990-08-01T23:30');
  });

  it('giờ trùng và giờ bị nhảy qua lúc đổi giờ mùa hè', () => {
    // 2000-10-29 01:30 ở Los Angeles có hai lần; 2000-04-02 02:30 không có.
    const back = resolveIanaClock('America/Los_Angeles', Date.UTC(2000, 9, 29, 1, 30));
    expect(back).toMatchObject({ status: 'overlap', offsetMin: -420 });
    const fwd = resolveIanaClock('America/Los_Angeles', Date.UTC(2000, 3, 2, 2, 30));
    expect(fwd).toMatchObject({ status: 'gap', offsetMin: -480 });
  });

  it('múi đổi hẳn giờ chuẩn giữa năm thì không coi là giờ mùa hè', () => {
    // Asia/Ho_Chi_Minh: UTC+8 đến 13/6/1975, sau đó UTC+7.
    expect(standardOffsetMin('Asia/Ho_Chi_Minh', Date.UTC(1975, 2, 1))).toBe(480);
    expect(standardOffsetMin('Asia/Ho_Chi_Minh', Date.UTC(1975, 8, 1))).toBe(420);
  });

  it('giờ chuẩn luôn khớp UTC theo độ lệch chuẩn', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: jdFromDate(1, 1, 1950), max: jdFromDate(31, 12, 2030) }),
        fc.integer({ min: 0, max: 23 }),
        fc.constantFrom('America/New_York', 'Europe/Paris', 'Australia/Sydney', 'Asia/Seoul'),
        (jd, hour, tz) => {
          const n = abroad(tz, formatDate(jdToDate(jd)), `${String(hour).padStart(2, '0')}:30`);
          const back = Date.parse(n.utc) + n.stdOffsetMin * 60_000;
          expect(new Date(back).toISOString().slice(0, 16)).toBe(n.localStd);
          expect(n.stdOffsetMin).toBeLessThanOrEqual(n.clockOffsetMin);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('cần múi giờ hợp lệ, và chỉ khi sinh ở nước ngoài', () => {
    expect(() => norm({ region: 'abroad', time: '10:00' })).toThrow(/IANA/);
    expect(() => norm({ region: 'abroad', abroadTz: 'Mars/Olympus', time: '10:00' })).toThrow(/IANA/);
    expect(() => norm({ region: 'north', abroadTz: 'Asia/Tokyo', time: '10:00' })).toThrow(RangeError);
  });
});

describe('thiếu giờ sinh', () => {
  it('trả null và không nhận giờ đi kèm', () => {
    expect(norm({ timeCertainty: 'unknown' })).toBeNull();
    expect(() => norm({ timeCertainty: 'unknown', time: '10:00' })).toThrow(RangeError);
    expect(() => norm({ timeCertainty: 'unknown', stdTimeOverride: '10:00' })).toThrow(RangeError);
  });
});

describe('danh mục tỉnh và vùng', () => {
  it('đủ 63 tỉnh, mã không trùng', () => {
    expect(PROVINCES).toHaveLength(63);
    expect(new Set(PROVINCES.map((p) => p.code)).size).toBe(63);
  });

  it('Quảng Bình trở ra là miền Bắc, Thừa Thiên Huế trở vào là miền Nam', () => {
    expect(regionOfProvince('44', '1965-01-01')).toBe('north');
    expect(regionOfProvince('46', '1965-01-01')).toBe('south');
    expect(regionOfProvince('79', '1965-01-01')).toBe('south');
  });

  it('Quảng Trị 1954–1975 phải chọn bờ sông Bến Hải', () => {
    expect(needsBenHaiSide('45', '1965-01-01')).toBe(true);
    expect(needsBenHaiSide('45', '1953-12-31')).toBe(false);
    expect(needsBenHaiSide('45', '1976-01-01')).toBe(false);
    expect(() => regionOfProvince('45', '1965-01-01')).toThrow(/Bến Hải/);
    expect(regionOfProvince('45', '1965-01-01', 'north')).toBe('north');
    expect(regionOfProvince('45', '1950-01-01')).toBe('south');
  });

  it('nơi sinh bắt buộc trước 1976; mã lạ thì báo lỗi', () => {
    expect(needsBirthPlace('1975-12-31')).toBe(true);
    expect(needsBirthPlace('1976-01-01')).toBe(false);
    expect(() => regionOfProvince('99', '1965-01-01')).toThrow(RangeError);
  });
});

describe('tháng nhuận của năm âm', () => {
  it('2023 nhuận tháng 2, 2020 nhuận tháng 4, 2024 không nhuận', () => {
    expect(leapMonthOf(2023, 'north')).toBe(2);
    expect(leapMonthOf(2020, 'north')).toBe(4);
    expect(leapMonthOf(2024, 'north')).toBeNull();
  });
});
