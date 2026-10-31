import { computeChart } from '@tinhban/chart-engine';
import { describe, expect, it } from 'vitest';
import { PALACES, STARS } from '../src/index.ts';

describe('từ điển phủ mọi key bộ tính sinh ra', () => {
  it('mọi sao và cung của vài lá số đều có trong từ điển', () => {
    for (const [date, time, gender] of [
      ['2000-08-16', '03:30', 'male'],
      ['1987-03-02', '17:10', 'female'],
      ['2012-11-20', '23:40', 'male'],
      ['1995-06-30', '11:05', 'female'],
    ] as const) {
      const s = computeChart({ calendar: 'solar', date, time, timeCertainty: 'exact', region: 'north', gender }, 'nam');
      for (const p of s.palaces!) {
        expect(PALACES, p.key).toHaveProperty(p.key);
        for (const star of [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]) {
          expect(STARS[star.key], star.key).toBeDefined();
          expect(STARS[star.key]!.kind, star.key).toBe(star.kind);
        }
      }
    }
  });

  it('14 chính tinh đều có ngũ hành', () => {
    const majors = Object.values(STARS).filter((s) => s.kind === 'major');
    expect(majors).toHaveLength(14);
    for (const s of majors) expect(s.element, s.name).toBeDefined();
  });
});
