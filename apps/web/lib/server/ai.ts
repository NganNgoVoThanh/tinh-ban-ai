import "server-only";
import {
  aiEnabledFromEnv,
  answerWithAI,
  budgetAlerts,
  keys,
  MAX_QUESTION_LENGTH,
  needsTurnstile,
  outOfScope,
  overBudget,
  policyFromEnv,
  providerFromEnv,
  readUsage,
  recordAsk,
  recordLimitHit,
  recordSpend,
  REFUSALS,
  scrubPii,
  storeFromEnv,
  verifyTurnstile,
  type AskOutcome,
} from "@tinhban/ai";
import { SCHOOL_IDS } from "@tinhban/shared";
import { z } from "zod";
import { KB } from "@/lib/kb";

/**
 * Hỏi đáp phía server (Technical Plan mục 10, 15). Module này chỉ chạy trên server ("server-only"):
 * khóa API và packages/ai không bao giờ vào bundle của trình duyệt.
 */
export const MAX_ASK_BODY = 8 * 1024;

export const askSchema = z.object({
  question: z.string().trim().min(2).max(MAX_QUESTION_LENGTH),
  questionType: z.string().max(40).optional(),
  facts: z.array(z.string().max(120)).max(200),
  kbVersion: z.string().max(40),
  schoolId: z.enum(SCHOOL_IDS),
  installId: z.string().regex(/^[0-9a-zA-Z-]{8,64}$/),
  turnstileToken: z.string().max(4096).optional(),
});

export type AskBody = z.infer<typeof askSchema>;

export type AskResponse =
  | { kind: "answer"; outcome: Pick<AskOutcome, "sentences" | "followups" | "source" | "ruleIds" | "outOfScope" | "kbVersion">; quotaRemaining: number }
  | { kind: "refusal"; message: string; quotaRemaining: number }
  | { kind: "quota_exceeded"; quotaRemaining: 0 }
  | { kind: "turnstile_required"; siteKey: string };

/** Ghi AnswerTrace (mục 15). Chưa có Postgres: ghi ra log có cấu trúc của server. */
function trace(outcome: AskOutcome, questionType: string | undefined, schoolId: string, latencyMs: number) {
  console.info(
    JSON.stringify({
      type: "answer_trace",
      questionType,
      ruleIds: outcome.ruleIds,
      schoolId,
      source: outcome.source,
      modelId: outcome.modelId,
      tokensIn: outcome.tokensIn,
      tokensOut: outcome.tokensOut,
      costUsd: outcome.costUsd,
      validator: outcome.validator,
      promptVersion: outcome.promptVersion,
      kbVersion: outcome.kbVersion,
      latencyMs,
    }),
  );
}

/** Cấu hình AI sai hoặc thiếu thì trả lời bằng kho, không làm hỏng app (mục 1: hỏng mà vẫn chạy). */
function safeProvider(env: NodeJS.ProcessEnv) {
  try {
    return providerFromEnv(env);
  } catch (e) {
    console.error(JSON.stringify({ type: "ai_config_error", message: (e as Error).message }));
    return null;
  }
}

export async function handleAsk(body: AskBody, ip: string, now: Date): Promise<AskResponse> {
  const env = process.env;
  const store = storeFromEnv(env);
  const policy = policyFromEnv(env);
  const started = Date.now();

  const scope = outOfScope(body.question);
  const usage = await readUsage(store, body.installId, ip, now, aiEnabledFromEnv(env));
  const remaining = () => Math.max(0, policy.dailyQuota - usage.quotaUsed - 1);
  // Câu ngoài phạm vi: câu từ chối soạn sẵn, không gọi AI, không trừ lượt.
  if (scope) return { kind: "refusal", message: REFUSALS[scope], quotaRemaining: Math.max(0, policy.dailyQuota - usage.quotaUsed) };

  if (usage.quotaUsed >= policy.dailyQuota) {
    await recordLimitHit(store, body.installId);
    return { kind: "quota_exceeded", quotaRemaining: 0 };
  }

  const secret = env.TURNSTILE_SECRET_KEY;
  if (secret) {
    const firstSeenKey = `install:first:${body.installId}`;
    const firstSeen = Number((await store.get(firstSeenKey)) ?? now.getTime());
    if (firstSeen === now.getTime()) await store.set(firstSeenKey, String(firstSeen), 30 * 86400);
    const ageHours = (now.getTime() - firstSeen) / 3_600_000;
    if (needsTurnstile(usage, ageHours, policy) && !(await verifyTurnstile(body.turnstileToken, secret, ip))) {
      return { kind: "turnstile_required", siteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "" };
    }
  }

  await recordAsk(store, body.installId, ip, now);
  const { text, removed } = scrubPii(body.question);
  const provider = usage.aiEnabled && !overBudget(usage, policy) ? safeProvider(env) : null;
  const outcome = await answerWithAI(
    { question: text, pii: removed, ...(body.questionType && { questionType: body.questionType }), schoolId: body.schoolId, facts: body.facts },
    { kb: KB, provider, store },
  );
  if (outcome.costUsd > 0) {
    const spent = await recordSpend(store, outcome.costUsd, now);
    for (const ratio of budgetAlerts(spent.month - outcome.costUsd, spent.month, policy.monthlyBudgetUsd)) {
      console.warn(JSON.stringify({ type: "budget_alert", ratio, spentMonth: spent.month }));
    }
  }
  trace(outcome, body.questionType, body.schoolId, Date.now() - started);
  return {
    kind: "answer",
    outcome: { sentences: outcome.sentences, followups: outcome.followups, source: outcome.source, ruleIds: outcome.ruleIds, outOfScope: outcome.outOfScope, kbVersion: outcome.kbVersion },
    quotaRemaining: remaining(),
  };
}

/** Cấu hình cho client (mục 15): cờ AI, kb_version tối thiểu, ngưỡng Turnstile, khóa công khai VAPID. */
export function publicConfig() {
  const env = process.env;
  const policy = policyFromEnv(env);
  return {
    aiEnabled: aiEnabledFromEnv(env),
    kbVersionMin: KB.version,
    dailyQuota: policy.dailyQuota,
    turnstile: { siteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null, ipPerHour: policy.ipPerHour, budgetRatio: policy.budgetTurnstileRatio },
    push: { vapidPublicKey: env.VAPID_PUBLIC_KEY ?? null },
  };
}

export { keys, storeFromEnv };
