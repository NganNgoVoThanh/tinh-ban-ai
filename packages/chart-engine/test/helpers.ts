import type { BirthInput, ChartSnapshot, SchoolId } from '@tinhban/shared';
import { computeChart } from '../src/index.ts';

const NOW = new Date('2026-10-29T00:00:00Z');
const PROVINCE = { north: '01', south: '79' } as const;
/** Lá số mẫu: 16/8/2000 03:30 Hà Nội, nam, Nam phái; ghi đè từng trường qua input. */
export const chart = (input: Partial<BirthInput>, school: SchoolId = 'nam') => {
  const region = input.region ?? 'north';
  return computeChart(
    {
      calendar: 'solar',
      date: '2000-08-16',
      time: '03:30',
      timeCertainty: 'exact',
      region,
      ...(region !== 'abroad' && { provinceCode: PROVINCE[region] }),
      gender: 'male',
      ...input,
    },
    school,
    undefined,
    { now: NOW },
  );
};

export const palaceAt = (s: ChartSnapshot, key: string) => s.palaces!.find((p) => p.key === key)!;

/** Địa chi của cung chứa sao (chính tinh hoặc phụ tinh). */
export const branchOf = (s: ChartSnapshot, starKey: string) =>
  s.palaces!.find((p) => [...p.majorStars, ...p.minorStars].some((x) => x.key === starKey))?.branch;
