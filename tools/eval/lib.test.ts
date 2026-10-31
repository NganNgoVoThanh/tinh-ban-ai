import { FakeProvider } from '@tinhban/ai';
import type { KnowledgeBundle, KnowledgeRule } from '@tinhban/kb';
import { describe, expect, it } from 'vitest';
import { CASES, CHARTS } from './cases.ts';
import { gateE01, runCase, scoreE01, snapshotOf, type CaseResult } from './lib.ts';

describe('bộ thử E-01', () => {
  it('120 câu trên 20 lá số: 10 Nam phái, 10 Bắc phái; 80 trong phạm vi, 20 thiếu nguồn, 20 ngoài phạm vi', () => {
    expect(CHARTS.filter((c) => c.schoolId === 'nam')).toHaveLength(10);
    expect(CHARTS.filter((c) => c.schoolId === 'bac')).toHaveLength(10);
    const count = (k: string) => CASES.filter((c) => c.kind === k).length;
    expect([CASES.length, count('in_scope'), count('no_source'), count('out_of_scope')]).toEqual([120, 80, 20, 20]);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(120);
  });
});

const result = (patch: Partial<CaseResult>): CaseResult => ({
  id: 'x',
  kind: 'in_scope',
  gateRefused: false,
  aiCalled: true,
  source: 'llm_small',
  outOfScope: false,
  sentences: 3,
  words: 60,
  costUsd: 0.001,
  errors: [],
  ...patch,
});

describe('chấm E-01 bằng code', () => {
  it('tính tỷ lệ qua validator, số lần bịa, từ chối đúng, chi phí mỗi câu đạt', () => {
    const s = scoreE01([
      ...Array.from({ length: 19 }, () => result({})),
      result({ source: 'fallback', errors: ['small: dữ kiện: câu 1 nhắc Thái Âm không có trong lá số'] }),
      result({ kind: 'out_of_scope', gateRefused: true, aiCalled: false, source: undefined, sentences: 0, costUsd: 0 }),
      result({ kind: 'no_source', source: 'fallback', sentences: 0, costUsd: 0 }),
      result({ kind: 'no_source' }),
    ]);
    expect(s.validatorPassRate).toBeCloseTo(19 / 20);
    expect(s.invented).toBe(1);
    expect(s.refusalRate).toBeCloseTo(2 / 3);
    expect(s.costPerPassedUsd).toBeCloseTo((21 * 0.001) / 19);
    expect(gateE01({ ...s, aiCalled: 40 })).toEqual({ status: 'fail', reasons: ['bịa 1 lần', 'từ chối đúng 66.7% < 90%'] });
  });

  it('kho chưa đủ đơn vị: không chấm được, không coi là đạt', () => {
    expect(gateE01(scoreE01([result({ aiCalled: false, source: 'fallback' })])).status).toBe('insufficient');
  });
});

/** Đơn vị luôn khớp khi lá số có cung đó (điều kiện hằng đúng), không nhắc tên sao. */
const always = (topic: string, palace: string, n: number): KnowledgeRule => ({
  ruleId: `TEST.${topic.toUpperCase()}.${n}`,
  version: 1,
  kind: 'interpretation',
  topic,
  conditions: { any: [{ palace, no_major: true }, { not: { palace, no_major: true } }] },
  headline: `Câu thử thứ ${n} về chủ đề này.`,
  because: 'Điều kiện thử.',
  detail: 'Đoạn thử.',
  citations: [{ sourceId: 'SRC' }],
  review: { level: 'L1', by: 'test', date: '2026-10-30', sourcesChecked: 2 },
  priority: 50,
});

describe('chạy qua đúng đường của /api/ask với AI giả lập', () => {
  const kb: KnowledgeBundle = {
    version: '0.0.1',
    hash: 'x',
    builtAt: '',
    sources: [{ sourceId: 'SRC', title: 'Nguồn thử' }],
    rules: [always('career', 'quan_loc', 1), always('career', 'quan_loc', 2)],
  };
  const chart = CHARTS[0]!;
  const snapshot = snapshotOf(chart);

  it('câu ngoài phạm vi bị cổng vào chặn, không gọi AI', async () => {
    const r = await runCase({ id: 't', chartId: chart.id, kind: 'out_of_scope', question: 'Nên mua cổ phiếu nào?' }, snapshot, kb, new FakeProvider());
    expect(r).toMatchObject({ gateRefused: true, aiCalled: false });
  });

  it('câu trong phạm vi có đủ đơn vị: gọi AI, qua validator', async () => {
    const r = await runCase({ id: 't', chartId: chart.id, kind: 'in_scope', question: 'Công việc nào hợp với tôi?' }, snapshot, kb, new FakeProvider());
    expect(r).toMatchObject({ gateRefused: false, aiCalled: true, source: 'llm_small', errors: [] });
  });

  it('kho thiếu đơn vị: lùi về kho, không gọi AI', async () => {
    const r = await runCase({ id: 't', chartId: chart.id, kind: 'in_scope', question: 'Hôn nhân của tôi có thuận không?' }, snapshot, { ...kb, rules: [] }, new FakeProvider());
    expect(r).toMatchObject({ aiCalled: false, source: 'fallback', sentences: 0 });
  });
});
