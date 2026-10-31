import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ianaOffsetMin, normalizeBirthTime, resolveClock, TZ_POLICY, type VnRegion } from '../src/index.ts';

const exact = (i: { date: string; time: string; region: VnRegion }) => normalizeBirthTime({ ...i, timeCertainty: 'exact' })!;

/** Độ lệch (phút) của Asia/Ho_Chi_Minh tại một thời điểm, theo tzdata của Node. */
const intlOffsetMin = (utcMs: number) => ianaOffsetMin('Asia/Ho_Chi_Minh', utcMs);

describe('giờ đồng hồ miền Nam khớp IANA Asia/Ho_Chi_Minh', () => {
  it('ở mọi thời điểm 1900–2035', () => {
    fc.assert(
      fc.property(fc.integer({ min: Date.UTC(1900, 0, 1), max: Date.UTC(2035, 0, 1) }), (utcMs) => {
        const off = intlOffsetMin(utcMs);
        const wallMs = utcMs + off * 60_000;
        const r = resolveClock('south', wallMs);
        if (r.status === 'ok') expect(r.offsetMin).toBe(off);
      }),
      { numRuns: 5000 },
    );
  });

  it('ở sát từng mốc đổi giờ', () => {
    for (const span of TZ_POLICY.clock.south) {
      if (span.fromUtc === null) continue;
      const t = Date.parse(span.fromUtc);
      for (const utcMs of [t - 60_000, t, t + 60_000]) {
        const off = intlOffsetMin(utcMs);
        const r = resolveClock('south', utcMs + off * 60_000);
        // Sát lúc vặn kim lui, một giờ đồng hồ ứng với hai thời điểm: chỉ cần báo đúng là trùng.
        if (r.status === 'ok') expect(r.offsetMin).toBe(off);
        else expect(r.status).toBe('overlap');
      }
    }
  });
});

describe('normalizeBirthTime: giờ phút trong nước', () => {
  it('Sài Gòn 1965, 08:30 giờ đồng hồ (UTC+8) là 07:30 giờ chuẩn', () => {
    const n = exact({ date: '1965-06-01', time: '08:30', region: 'south' });
    expect(n.localStd).toBe('1965-06-01T07:30');
    expect(n.clockOffsetMin).toBe(480);
    expect(n.ruleCode).toBe('ENG.TZ.SOUTH_UTC8');
  });

  it('Hà Nội 1965 giữ nguyên giờ', () => {
    const n = exact({ date: '1965-06-01', time: '08:30', region: 'north' });
    expect(n.localStd).toBe('1965-06-01T08:30');
    expect(n.ruleCode).toBe('ENG.TZ.UTC7');
  });

  it('quy đổi có thể lùi sang ngày hôm trước', () => {
    const n = exact({ date: '1970-03-10', time: '00:20', region: 'south' });
    expect(n.localStd).toBe('1970-03-09T23:20');
  });

  it('23:30 ngày 12/6/1975 ở miền Nam xảy ra hai lần', () => {
    const n = exact({ date: '1975-06-12', time: '23:30', region: 'south' });
    expect(n.status).toBe('overlap');
  });

  it('23:30 ngày 31/12/1959 ở miền Nam không có trên đồng hồ', () => {
    const n = exact({ date: '1959-12-31', time: '23:30', region: 'south' });
    expect(n.status).toBe('gap');
  });

  it('miền Bắc 1947–1955 bị gắn cờ không chắc', () => {
    expect(exact({ date: '1950-01-01', time: '10:00', region: 'north' }).uncertain).toBe(true);
    expect(exact({ date: '1990-01-01', time: '10:00', region: 'north' }).uncertain).toBe(false);
  });

  it('từ chối ngày giờ sai', () => {
    expect(() => exact({ date: '2023-02-29', time: '10:00', region: 'north' })).toThrow(RangeError);
    expect(() => exact({ date: '2023-02-28', time: '24:00', region: 'north' })).toThrow(RangeError);
  });
});
