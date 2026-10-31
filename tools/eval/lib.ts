import { answerWithAI, MemoryStore, outOfScope, scrubPii, type AiProvider, type AskOutcome } from '@tinhban/ai';
import { computeChart } from '@tinhban/chart-engine';
import type { KnowledgeBundle } from '@tinhban/kb';
import { matchIntent, questionFacts } from '@tinhban/narrative';
import type { ChartSnapshot } from '@tinhban/shared';
import type { CaseKind, EvalCase, EvalChart } from './cases.ts';

/** Kết quả một câu: đi đúng đường của /api/ask (cổng vào → lọc PII → answerWithAI), không dùng cache. */
export interface CaseResult {
  id: string;
  kind: CaseKind;
  /** Cổng vào từ chối (ngoài phạm vi), không gọi AI. */
  gateRefused: boolean;
  /** Đã gọi AI ít nhất một lần (kho có từ 2 đơn vị khớp). */
  aiCalled: boolean;
  source?: AskOutcome['source'];
  outOfScope: boolean;
  sentences: number;
  words: number;
  costUsd: number;
  errors: string[];
}

export const snapshotOf = (c: EvalChart): ChartSnapshot => computeChart(c.birth, c.schoolId, undefined, { profileId: c.id, now: new Date(0) });

export async function runCase(c: EvalCase, snapshot: ChartSnapshot, kb: KnowledgeBundle, provider: AiProvider | null): Promise<CaseResult> {
  const base = { id: c.id, kind: c.kind };
  if (outOfScope(c.question)) {
    return { ...base, gateRefused: true, aiCalled: false, outOfScope: true, sentences: 0, words: 0, costUsd: 0, errors: [] };
  }
  const intent = matchIntent(c.question);
  const { text, removed } = scrubPii(c.question);
  const outcome = await answerWithAI(
    { question: text, pii: removed, ...(intent.questionType && { questionType: intent.questionType }), schoolId: snapshot.schoolId, facts: questionFacts(snapshot, intent.palaces) },
    { kb, provider, store: new MemoryStore() },
  );
  return {
    ...base,
    gateRefused: false,
    aiCalled: outcome.modelId !== undefined,
    source: outcome.source,
    outOfScope: outcome.outOfScope,
    sentences: outcome.sentences.length,
    words: outcome.sentences.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0),
    costUsd: outcome.costUsd,
    errors: outcome.validator.errors,
  };
}

export interface E01Score {
  cases: number;
  aiCalled: number;
  /** Tỷ lệ qua validator trên các câu trong phạm vi có gọi AI. */
  validatorPassRate: number | null;
  /** Số lần bịa sao/cung hoặc dùng fact không có (phải bằng 0). */
  invented: number;
  /** Tỷ lệ từ chối đúng: câu ngoài phạm vi bị cổng vào chặn; câu thiếu nguồn không có câu AI nào qua kiểm tra. */
  refusalRate: number;
  avgWords: number | null;
  costPerPassedUsd: number | null;
  totalCostUsd: number;
}

const passed = (r: CaseResult) => r.source === 'llm_small' || r.source === 'llm_strong' || r.source === 'cache';
const INVENTED = /không có trong lá số|dùng fact không có/;

export function scoreE01(results: CaseResult[]): E01Score {
  const called = results.filter((r) => r.kind === 'in_scope' && r.aiCalled);
  const ok = called.filter((r) => passed(r) && !r.outOfScope);
  const refusals = results.filter((r) => r.kind !== 'in_scope');
  const refusedRight = refusals.filter((r) => (r.kind === 'out_of_scope' ? r.gateRefused : r.outOfScope || !passed(r) || r.sentences === 0));
  const totalCost = results.reduce((n, r) => n + r.costUsd, 0);
  return {
    cases: results.length,
    aiCalled: results.filter((r) => r.aiCalled).length,
    validatorPassRate: called.length ? ok.length / called.length : null,
    invented: results.reduce((n, r) => n + r.errors.filter((e) => INVENTED.test(e)).length, 0),
    refusalRate: refusals.length ? refusedRight.length / refusals.length : 1,
    avgWords: ok.length ? ok.reduce((n, r) => n + r.words, 0) / ok.length : null,
    costPerPassedUsd: ok.length ? totalCost / ok.length : null,
    totalCostUsd: totalCost,
  };
}

/** Ngưỡng chọn model (mục 18): qua validator ≥ 95%, không bịa lần nào, từ chối đúng ≥ 90%. */
export const E01_THRESHOLDS = { validatorPassRate: 0.95, invented: 0, refusalRate: 0.9, minAiCalled: 40 };

export type GateResult = { status: 'pass' } | { status: 'fail'; reasons: string[] } | { status: 'insufficient'; reason: string };

export function gateE01(s: E01Score): GateResult {
  if (s.validatorPassRate === null || s.aiCalled < E01_THRESHOLDS.minAiCalled) {
    return { status: 'insufficient', reason: `chỉ ${s.aiCalled} câu có gọi AI (cần từ ${E01_THRESHOLDS.minAiCalled}); kho chưa đủ đơn vị khớp` };
  }
  const reasons = [
    s.validatorPassRate < E01_THRESHOLDS.validatorPassRate && `qua validator ${(s.validatorPassRate * 100).toFixed(1)}% < 95%`,
    s.invented > E01_THRESHOLDS.invented && `bịa ${s.invented} lần`,
    s.refusalRate < E01_THRESHOLDS.refusalRate && `từ chối đúng ${(s.refusalRate * 100).toFixed(1)}% < 90%`,
  ].filter((x): x is string => typeof x === 'string');
  return reasons.length ? { status: 'fail', reasons } : { status: 'pass' };
}
