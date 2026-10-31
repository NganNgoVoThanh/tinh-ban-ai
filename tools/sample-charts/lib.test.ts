import { computeChart } from '@tinhban/chart-engine';
import type { KnowledgeBundle, KnowledgeRule } from '@tinhban/kb';
import { describe, expect, it } from 'vitest';
import { chartCoverage, coverageBySchool, keyFacts, median } from './lib.ts';

// 16/8/2000 giờ Dần, nam: Mệnh có Tử Vi miếu; Tài Bạch có Vũ Khúc Hóa Quyền.
const s = computeChart({ calendar: 'solar', date: '2000-08-16', time: '03:30', timeCertainty: 'exact', region: 'north', gender: 'male' }, 'nam', undefined, {
  now: new Date(0),
});
const rule = (patch: Partial<KnowledgeRule>): KnowledgeRule => ({
  ruleId: 'TV.X.001',
  version: 1,
  kind: 'interpretation',
  topic: 'personality',
  conditions: { palace: 'menh', has_star: 'tu_vi' },
  headline: 'h',
  because: 'b',
  detail: 'd',
  citations: [],
  review: { level: 'L1', by: 't', date: '2026-10-30', sourcesChecked: 2 },
  priority: 50,
  ...patch,
});
const kb = (rules: KnowledgeRule[]): Pick<KnowledgeBundle, 'rules'> => ({ rules });

describe('độ phủ kho', () => {
  it('fact trọng yếu gồm chính tinh và Tứ hóa ở 6 cung trọng yếu', () => {
    const facts = keyFacts(s.palaces!);
    expect(facts).toContain('palace:menh|star:tu_vi|state:mieu');
    expect(facts).toContain('palace:tai_bach|star:vu_khuc|hoa:quyen');
    expect(facts.some((f) => f.startsWith('palace:tat_ach'))).toBe(false);
  });

  it('tỷ lệ phủ của một lá số; L0 không tính; tính riêng theo phái', () => {
    const n = keyFacts(s.palaces!).length;
    expect(chartCoverage(s, kb([]))).toBe(0);
    expect(chartCoverage(s, kb([rule({})]))).toBeCloseTo(1 / n);
    expect(coverageBySchool([s], kb([rule({ review: { level: 'L0', by: 't', date: '2026-10-30', sourcesChecked: 0 } })]))).toEqual({ nam: 0, bac: 0 });
    const r = coverageBySchool([s], kb([rule({ schools: ['bac'] })]));
    expect(r.nam).toBe(0);
    expect(r.bac).toBeCloseTo(1 / n);
  });

  it('trung vị', () => {
    expect(median([0.2, 0.9, 0.5])).toBe(0.5);
    expect(median([0.2, 0.4, 0.6, 0.8])).toBeCloseTo(0.5);
  });
});
