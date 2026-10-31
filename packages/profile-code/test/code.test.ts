import { computeChart } from '@tinhban/chart-engine';
import type { BirthInput } from '@tinhban/shared';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeProfileCode, encodeProfileCode, normalizeProfileCode, ProfileCodeError, TIME_ZONES_V2, type DecodedProfile } from '../src/index.ts';

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const hm = fc.tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 })).map(([h, m]) => `${pad(h)}:${pad(m)}`);

/** Đầu vào bất kỳ đúng hình dạng (không cần là ngày có thật: mã chỉ đóng gói). */
const profileArb: fc.Arbitrary<DecodedProfile> = fc
  .record({
    calendar: fc.constantFrom('solar' as const, 'lunar' as const),
    year: fc.integer({ min: 1901, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 30 }),
    leap: fc.boolean(),
    certainty: fc.constantFrom('exact' as const, 'canh' as const, 'unknown' as const),
    time: hm,
    branch: fc.integer({ min: 0, max: 11 }),
    tyPart: fc.constantFrom('before_midnight' as const, 'after_midnight' as const),
    place: fc.oneof(
      fc.constant({ region: 'north' as const }),
      fc.integer({ min: 1, max: 96 }).map((p) => ({ region: p >= 46 ? ('south' as const) : ('north' as const), provinceCode: pad(p) })),
      fc.constantFrom('north' as const, 'south' as const).map((side) => ({ region: side, provinceCode: '45', benHaiSide: side })),
      fc.constantFrom(...TIME_ZONES_V2.slice(0, 50), 'Etc/Unknown_Zone').map((tz) => ({ region: 'abroad' as const, abroadTz: tz })),
    ),
    override: fc.option(hm, { nil: undefined }),
    gender: fc.constantFrom('male' as const, 'female' as const),
    schoolId: fc.constantFrom('nam' as const, 'bac' as const),
  })
  .map((r) => {
    const birth: BirthInput = {
      calendar: r.calendar,
      date: `${r.year}-${pad(r.month)}-${pad(r.day)}`,
      ...(r.calendar === 'lunar' && r.leap ? { isLeapMonth: true } : {}),
      timeCertainty: r.certainty,
      ...(r.certainty === 'exact' ? { time: r.time } : {}),
      ...(r.certainty === 'canh' ? { timeBranch: r.branch, ...(r.branch === 0 ? { tyPart: r.tyPart } : {}) } : {}),
      ...r.place,
      ...(r.certainty === 'exact' && r.override ? { stdTimeOverride: r.override } : {}),
      gender: r.gender,
    };
    return { birth, schoolId: r.schoolId };
  });

describe('mã hồ sơ phiên bản 2', () => {
  it('mã hóa rồi giải mã ra đúng đầu vào và phái', () => {
    fc.assert(
      fc.property(profileArb, (p) => {
        const code = encodeProfileCode(p);
        expect(code).toMatch(/^TB2(-[0-9A-Z]{1,4})+$/);
        expect(decodeProfileCode(code)).toEqual(p);
      }),
      { numRuns: 2000 },
    );
  });

  it('khoảng 16–22 ký tự với hồ sơ thường', () => {
    const code = encodeProfileCode({
      birth: { calendar: 'solar', date: '2000-08-16', timeCertainty: 'exact', time: '03:30', region: 'north', gender: 'male' },
      schoolId: 'nam',
    });
    expect(normalizeProfileCode(code).length).toBeGreaterThanOrEqual(14);
    expect(normalizeProfileCode(code).length).toBeLessThanOrEqual(22);
  });

  it('khôi phục ra đúng lá số, kể cả giờ chỉnh tay và phái', () => {
    const p: DecodedProfile = {
      birth: { calendar: 'solar', date: '1965-06-01', timeCertainty: 'exact', time: '09:30', region: 'south', provinceCode: '79', stdTimeOverride: '09:10', gender: 'female' },
      schoolId: 'bac',
    };
    const back = decodeProfileCode(encodeProfileCode(p));
    const opts = { now: new Date(0) };
    expect(computeChart(back.birth, back.schoolId, undefined, opts)).toEqual(computeChart(p.birth, p.schoolId, undefined, opts));
  });

  it('bắt mọi lỗi sai một ký tự và đảo hai ký tự liền nhau', () => {
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    fc.assert(
      fc.property(profileArb, fc.nat(), fc.nat(), (p, i, j) => {
        const body = normalizeProfileCode(encodeProfileCode(p)).slice(3);
        const at = i % body.length;
        const wrong = alphabet[(alphabet.indexOf(body[at]!) + 1 + (j % 31)) % 32]!;
        const typo = `TB2${body.slice(0, at)}${wrong}${body.slice(at + 1)}`;
        expect(() => decodeProfileCode(typo)).toThrow(ProfileCodeError);
        if (at + 1 < body.length && body[at] !== body[at + 1]) {
          const swapped = `TB2${body.slice(0, at)}${body[at + 1]}${body[at]}${body.slice(at + 2)}`;
          expect(() => decodeProfileCode(swapped)).toThrow(ProfileCodeError);
        }
      }),
      { numRuns: 3000 },
    );
  });

  it('nhận chữ thường, thiếu gạch, nhầm O/0 và I/L/1', () => {
    const p: DecodedProfile = {
      birth: { calendar: 'solar', date: '1990-01-10', timeCertainty: 'unknown', region: 'north', gender: 'male' },
      schoolId: 'nam',
    };
    const code = encodeProfileCode(p);
    const messy = code.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l');
    expect(decodeProfileCode(messy)).toEqual(p);
  });

  it('báo lỗi rõ: sai tiền tố, phiên bản lạ, sai checksum', () => {
    expect(() => decodeProfileCode('XYZ-1234')).toThrow(expect.objectContaining({ reason: 'format' }));
    expect(() => decodeProfileCode('TB9-1234-5678')).toThrow(expect.objectContaining({ reason: 'version' }));
    expect(() => decodeProfileCode('TB2-0000-0000-0000-01')).toThrow(expect.objectContaining({ reason: 'checksum' }));
  });
});
