/**
 * Luồng trả lời câu hỏi tự do phía server (Technical Plan mục 10): cache → model nhỏ + validator →
 * sửa một lần kèm lỗi → model mạnh (chỉ khi đủ nguồn mà câu chữ chưa đạt) → lùi về kho.
 * Hết ngân sách hoặc tắt AI thì xuống thẳng tầng cuối, không báo lỗi.
 */
import { createHash } from 'node:crypto';
import type { KnowledgeBundle, RuleMatch } from '@tinhban/kb';
import { composeExplanation } from '@tinhban/narrative';
import { SCHOOL_NAMES, type ChartSnapshot, type FactId, type SchoolId } from '@tinhban/shared';
import type { AiProvider, ModelTier } from './gateway.ts';
import { PROMPT_VERSION, SYSTEM_PROMPT, userPrompt } from './prompts/v1.ts';
import { retrieveRules } from './retrieve.ts';
import { keys, type KeyValueStore } from './stores.ts';
import { ANSWER_JSON_SCHEMA, validateAnswer, type AiSentence } from './validator.ts';

/** Loại câu hỏi cố định: chỉ các loại này mới dùng cache (khóa cache không chứa dữ liệu cá nhân). */
export const CACHEABLE_TYPES = new Set(['personality', 'career', 'wealth', 'love', 'inner_life', 'outside', 'parents', 'siblings', 'children', 'home', 'friends', 'year']);

export interface AskContext {
  /** Câu hỏi đã lọc thông tin cá nhân. */
  question: string;
  pii: string[];
  questionType?: string;
  schoolId: SchoolId;
  facts: FactId[];
}

export type AnswerSource = 'cache' | 'llm_small' | 'llm_strong' | 'fallback';

export interface AskOutcome {
  sentences: AiSentence[];
  followups: string[];
  outOfScope: boolean;
  source: AnswerSource;
  ruleIds: string[];
  factIds: FactId[];
  modelId?: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  validator: { passed: boolean; errors: string[] };
  promptVersion: string;
  kbVersion: string;
}

export interface AnswerDeps {
  kb: KnowledgeBundle;
  /** null: AI đang tắt hoặc hết ngân sách. */
  provider: AiProvider | null;
  store: KeyValueStore;
}

export function cacheKey(questionType: string, ruleIds: string[], schoolId: SchoolId, kbVersion: string): string {
  return createHash('sha256')
    .update(JSON.stringify([questionType, [...ruleIds].sort(), schoolId, kbVersion, PROMPT_VERSION]))
    .digest('hex')
    .slice(0, 32);
}

/** Lùi về kho: ghép câu từ các đơn vị khớp, không gọi AI. */
function fallback(matches: RuleMatch[], snapshot: ChartSnapshot, kb: KnowledgeBundle): AiSentence[] {
  return composeExplanation(matches.slice(0, 3), snapshot, kb).map((i) => ({
    text: `${i.headline} ${i.because}.`,
    rule_ids: [i.ruleId],
    fact_ids: i.facts,
    label: i.label,
  }));
}

export async function answerWithAI(ctx: AskContext, deps: AnswerDeps): Promise<AskOutcome> {
  const { kb, provider, store } = deps;
  const { snapshot, matches } = retrieveRules(ctx.facts, ctx.schoolId, kb, ctx.questionType);
  const rules = matches.map((m) => m.rule);
  const ruleIds = rules.map((r) => r.ruleId);
  const base = { ruleIds, factIds: ctx.facts, promptVersion: PROMPT_VERSION, kbVersion: kb.version };
  let tokensIn = 0;
  let tokensOut = 0;
  let costUsd = 0;
  let modelId: string | undefined;
  const errors: string[] = [];

  const finish = (source: AnswerSource, sentences: AiSentence[], followups: string[], passed: boolean, outOfScope = false): AskOutcome => ({
    ...base,
    sentences,
    followups,
    outOfScope,
    source,
    ...(modelId && { modelId }),
    tokensIn,
    tokensOut,
    costUsd,
    validator: { passed, errors },
  });

  const cacheable = ctx.questionType && CACHEABLE_TYPES.has(ctx.questionType) && ruleIds.length >= 2;
  const key = cacheable ? keys.cache(cacheKey(ctx.questionType!, ruleIds, ctx.schoolId, kb.version)) : null;
  if (key) {
    const hit = await store.get(key);
    if (hit) {
      const cached = JSON.parse(hit) as { sentences: AiSentence[]; followups: string[] };
      return finish('cache', cached.sentences, cached.followups, true);
    }
  }

  // Kho chưa đủ nguồn: không dùng AI để bù (mục 10), trả lời bằng những gì kho có.
  if (!provider || rules.length < 2) return finish('fallback', fallback(matches, snapshot, kb), [], false);

  const attempt = async (tier: ModelTier, repairErrors?: string[]) => {
    const r = await provider.complete({
      tier,
      system: SYSTEM_PROMPT,
      user: userPrompt({ question: ctx.question, schoolName: SCHOOL_NAMES[ctx.schoolId], facts: ctx.facts, rules, ...(repairErrors && { repairErrors }) }),
      schema: ANSWER_JSON_SCHEMA as unknown as Record<string, unknown>,
    });
    tokensIn += r.tokensIn;
    tokensOut += r.tokensOut;
    costUsd += r.costUsd;
    modelId = r.modelId;
    if (r.refused) return { passed: false, errors: ['nhà cung cấp từ chối trả lời'], sentences: [] as AiSentence[], json: null };
    return { ...validateAnswer(r.json, ctx.facts, rules, ctx.schoolId, ctx.pii), json: r.json as { followups?: string[]; out_of_scope?: boolean } | null };
  };

  const plan: [ModelTier, boolean][] = [
    ['small', false],
    ['small', true],
    ['strong', true],
  ];
  let lastErrors: string[] = [];
  for (const [tier, repair] of plan) {
    const r = await attempt(tier, repair ? lastErrors : undefined);
    errors.push(...r.errors.map((e) => `${tier}: ${e}`));
    if (r.passed) {
      const followups = (r.json?.followups ?? []).slice(0, 3);
      if (r.json?.out_of_scope) return finish(tier === 'small' ? 'llm_small' : 'llm_strong', [], [], true, true);
      if (key) await store.set(key, JSON.stringify({ sentences: r.sentences, followups }), 30 * 86400);
      return finish(tier === 'small' ? 'llm_small' : 'llm_strong', r.sentences, followups, true);
    }
    lastErrors = r.errors;
  }
  return finish('fallback', fallback(matches, snapshot, kb), [], false);
}
