import type { ChartSnapshot } from '@tinhban/shared';
import { atomsOf, evaluate } from './conditions.ts';
import type { KnowledgeBundle, KnowledgeRule, RuleMatch } from './types.ts';

/** Đơn vị dùng được cho phái này (bỏ trống schools nghĩa là dùng chung). */
export const appliesToSchool = (rule: KnowledgeRule, schoolId: ChartSnapshot['schoolId']) =>
  !rule.schools || rule.schools.length === 0 || rule.schools.includes(schoolId);

/**
 * Đơn vị áp dụng cho lá số (mục 7): lọc theo phái của hồ sơ, giữ đơn vị khớp điều kiện, loại theo
 * exclusions, xếp theo priority giảm dần (cùng priority thì theo ruleId để kết quả ổn định).
 * topic: chỉ lấy đơn vị cùng chủ đề (ví dụ loại câu hỏi).
 */
export function getApplicableRules(snapshot: ChartSnapshot, kb: Pick<KnowledgeBundle, 'rules'>, topic?: string): RuleMatch[] {
  const out: RuleMatch[] = [];
  for (const rule of kb.rules) {
    if (!appliesToSchool(rule, snapshot.schoolId)) continue;
    if (topic && rule.topic !== topic) continue;
    const facts = evaluate(snapshot, rule.conditions);
    if (!facts) continue;
    if (rule.exclusions?.some((x) => evaluate(snapshot, x) !== null)) continue;
    out.push({ rule, facts });
  }
  return out.sort((a, b) => b.rule.priority - a.rule.priority || a.rule.ruleId.localeCompare(b.rule.ruleId));
}

/**
 * Cung mà đơn vị nói tới: cung có tên trong điều kiện; điều kiện chỉ nhắc sao (không nhắc cung) thì
 * là cung đang chứa sao đó. Đơn vị xét tam phương tứ chính vẫn thuộc về cung gốc.
 */
export function palacesOfMatch(m: RuleMatch): string[] {
  const named = atomsOf(m.rule.conditions).flatMap((a) => ('palace' in a ? [a.palace] : []));
  if (named.length) return [...new Set(named)];
  return [...new Set(m.facts.flatMap((f) => /^palace:([a-z_]+)\|/.exec(f)?.[1] ?? []))];
}

export const rulesForPalace = (matches: RuleMatch[], palaceKey: string): RuleMatch[] =>
  matches.filter((m) => palacesOfMatch(m).includes(palaceKey));
