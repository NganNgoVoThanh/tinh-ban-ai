"use client";

import { answerSuggested, matchIntent, questionFacts, TOPIC_PALACE } from "@tinhban/narrative";
import type { AnswerSentence, ChartSnapshot, LocalProfile, QaHistoryItem } from "@tinhban/shared";
import { trackEvent } from "./analytics";
import { db } from "./db";
import { newId } from "./ids";
import { KB } from "./kb";
import { getInstallId } from "./meta";

/** Lịch sử hỏi đáp: tối đa 500 câu mỗi hồ sơ, quá thì xóa câu cũ nhất (Technical Plan mục 10). */
export const HISTORY_LIMIT = 500;

export type AskOutcome =
  | { kind: "answer"; item: QaHistoryItem; quotaRemaining?: number }
  | { kind: "refusal"; message: string; quotaRemaining?: number }
  | { kind: "quota_exceeded" }
  | { kind: "turnstile_required"; siteKey: string }
  | { kind: "offline" }
  | { kind: "error"; message: string };

const ACTIONABLE = { kb: "kb", cache: "cache", llm_small: "llm", llm_strong: "llm", fallback: "fallback" } as const;

async function saveHistory(item: QaHistoryItem) {
  await db.transaction("rw", db.qa_history, async () => {
    await db.qa_history.add(item);
    const ids = await db.qa_history.where("[profileId+createdAt]").between([item.profileId, ""], [item.profileId, "￿"]).primaryKeys();
    if (ids.length > HISTORY_LIMIT) await db.qa_history.bulkDelete(ids.slice(0, ids.length - HISTORY_LIMIT));
  });
}

function historyItem(profile: LocalProfile, question: string, questionType: string | null, sentences: AnswerSentence[], followups: string[], source: QaHistoryItem["source"]): QaHistoryItem {
  return {
    id: newId(),
    profileId: profile.profileId,
    createdAt: new Date().toISOString(),
    question,
    ...(questionType && { questionType }),
    answer: { sentences, followups },
    source,
    schoolId: profile.schoolId,
    kbVersion: KB.version,
  };
}

/** Ghi câu trả lời tính trên máy (câu gợi ý, kho) vào lịch sử. */
export async function saveLocalAnswer(profile: LocalProfile, question: string, questionType: string | null, sentences: AnswerSentence[]): Promise<QaHistoryItem> {
  const item = historyItem(profile, question, questionType, sentences, [], "kb");
  await saveHistory(item);
  return item;
}

/**
 * Trả lời một câu hỏi (mục 10): khớp ý định trên máy; kho đủ thì trả lời ngay, không trừ lượt;
 * hồ sơ dưới 16 tuổi không gửi lên server; còn lại gửi /api/ask với fact tối thiểu.
 */
export async function askQuestion(opts: {
  question: string;
  profile: LocalProfile;
  snapshot: ChartSnapshot;
  under16: boolean;
  turnstileToken?: string;
}): Promise<AskOutcome> {
  const { question, profile, snapshot } = opts;
  const intent = matchIntent(question);
  if (intent.questionType && intent.questionType !== "year") {
    const local = answerSuggested(snapshot, KB, { questionType: intent.questionType, palaceKey: TOPIC_PALACE[intent.questionType] ?? "menh" });
    if (local.length) {
      const sentences = local.map((i) => ({ text: `${i.headline} ${i.because}.`, ruleIds: [i.ruleId], factIds: i.facts, label: i.label }));
      const item = await saveLocalAnswer(profile, question, intent.questionType, sentences);
      trackEvent("free_q_asked", { answered_by: "kb", counted: false });
      return { kind: "answer", item };
    }
  }
  if (opts.under16) {
    return { kind: "refusal", message: "Hồ sơ dưới 16 tuổi: câu hỏi chỉ được trả lời bằng kho trên máy, và kho chưa có căn cứ cho câu này." };
  }
  if (!navigator.onLine) return { kind: "offline" };

  let res: Response;
  try {
    res = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question,
        ...(intent.questionType && { questionType: intent.questionType }),
        facts: questionFacts(snapshot, intent.palaces),
        kbVersion: KB.version,
        schoolId: profile.schoolId,
        installId: await getInstallId(),
        ...(opts.turnstileToken && { turnstileToken: opts.turnstileToken }),
      }),
    });
  } catch {
    return { kind: "offline" };
  }
  const data = (await res.json().catch(() => null)) as
    | { kind: "answer"; outcome: { sentences: { text: string; rule_ids: string[]; fact_ids: string[]; label: AnswerSentence["label"] }[]; followups: string[]; source: keyof typeof ACTIONABLE }; quotaRemaining: number }
    | { kind: "refusal"; message: string; quotaRemaining: number }
    | { kind: "quota_exceeded" }
    | { kind: "turnstile_required"; siteKey: string }
    | null;
  if (!data) return { kind: "error", message: "Máy chủ không trả lời được. Thử lại sau." };
  if (data.kind === "answer") {
    const sentences = data.outcome.sentences.map((s) => ({ text: s.text, ruleIds: s.rule_ids, factIds: s.fact_ids, label: s.label }));
    const item = historyItem(profile, question, intent.questionType, sentences, data.outcome.followups, ACTIONABLE[data.outcome.source]);
    await saveHistory(item);
    trackEvent("free_q_asked", { answered_by: ACTIONABLE[data.outcome.source], counted: true });
    return { kind: "answer", item, quotaRemaining: data.quotaRemaining };
  }
  return data;
}

export async function deleteHistoryItem(id: string) {
  await db.qa_history.delete(id);
}

export async function clearHistory(profileId: string) {
  await db.qa_history.where("profileId").equals(profileId).delete();
}
