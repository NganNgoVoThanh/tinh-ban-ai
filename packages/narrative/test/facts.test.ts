import { computeChart } from '@tinhban/chart-engine';
import { describe, expect, it } from 'vitest';
import { questionFacts } from '../src/index.ts';

const snapshot = computeChart({ calendar: 'solar', date: '1990-05-15', time: '10:30', timeCertainty: 'exact', region: 'south', gender: 'male' }, 'nam', undefined, {
  now: new Date(0),
});

describe('fact tối thiểu gửi lên server', () => {
  it('chỉ gồm cung hỏi và tam phương tứ chính, kèm địa chi; không có ngày sinh', () => {
    const facts = questionFacts(snapshot, ['quan_loc']);
    const palaces = new Set(facts.map((f) => f.split('|')[0]!.replace(/^(core:than)$/, '')).filter((x) => x.startsWith('palace:')));
    expect(palaces.size).toBe(4);
    expect(palaces.has('palace:quan_loc')).toBe(true);
    expect(facts.filter((f) => /\|branch:\d+$/.test(f))).toHaveLength(4);
    expect(JSON.stringify(facts)).not.toMatch(/1990|05-15|10:30/);
  });

  it('lá số không có 12 cung thì không gửi gì', () => {
    expect(questionFacts({ ...snapshot, palaces: undefined }, ['menh'])).toEqual([]);
  });
});
