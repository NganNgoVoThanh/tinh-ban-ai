/**
 * Truy xuất phía server (Technical Plan mục 10): server không nhận ngày giờ sinh, chỉ nhận fact tối
 * thiểu của các cung liên quan. Dựng lại lá số rút gọn từ các fact đó (chỉ những cung được gửi) để xét
 * điều kiện của đơn vị tri thức bằng đúng bộ xét mà client dùng.
 */
import { getApplicableRules, STARS, type KnowledgeBundle, type RuleMatch } from '@tinhban/kb';
import { branchOfFact } from '@tinhban/narrative';
import type { Brightness, ChartSnapshot, FactId, Mutagen, PalaceFacts, SchoolId, StarFact } from '@tinhban/shared';

/** Định dạng fact client gửi: xem questionFacts trong @tinhban/narrative. */
export { branchFact } from '@tinhban/narrative';

export function snapshotFromFacts(facts: FactId[], schoolId: SchoolId): ChartSnapshot {
  const palaces = new Map<string, PalaceFacts>();
  const palace = (key: string) => {
    let p = palaces.get(key);
    if (!p) {
      p = { key, name: key, branch: '', stem: '', isBody: false, majorStars: [], minorStars: [], adjectiveStars: [], rings: { changsheng: '', boshi: '', suiqian: '', jiangqian: '' }, decadal: { from: 0, to: 0 } };
      palaces.set(key, p);
    }
    return p;
  };
  for (const f of facts) {
    const parts = Object.fromEntries(f.split('|').map((x) => x.split(':') as [string, string]));
    if (parts.core === 'than' && parts.palace) palace(parts.palace).isBody = true;
    if (!parts.palace) continue;
    const p = palace(parts.palace);
    if (parts.branch !== undefined) p.branch = branchOfFact(parts.branch);
    if (!parts.star) continue;
    const entry = STARS[parts.star];
    const list = entry?.kind === 'major' ? p.majorStars : entry?.kind === 'minor' ? p.minorStars : p.adjectiveStars;
    let s = list.find((x) => x.key === parts.star);
    if (!s) {
      s = { key: parts.star, name: entry?.name ?? parts.star, kind: entry?.kind ?? 'adjective' } satisfies StarFact;
      list.push(s);
    }
    if (parts.state) s.brightness = parts.state as Brightness;
    if (parts.hoa) s.mutagen = parts.hoa as Mutagen;
  }
  return {
    profileId: '',
    engineVersion: '',
    schoolId,
    tzPolicyVersion: '',
    lunar: { year: 0, month: 0, day: 0, isLeap: false, canChi: { year: '', month: '', day: '' } },
    facts,
    palaces: [...palaces.values()],
    warnings: [],
    trace: [],
    generatedAt: '',
  };
}

/** Tối đa 5 đơn vị khớp với fact và chủ đề (lọc theo phái), xếp theo priority. */
export function retrieveRules(facts: FactId[], schoolId: SchoolId, kb: KnowledgeBundle, questionType?: string): { snapshot: ChartSnapshot; matches: RuleMatch[] } {
  const snapshot = snapshotFromFacts(facts, schoolId);
  const byTopic = questionType ? getApplicableRules(snapshot, kb, questionType) : [];
  const seen = new Set(byTopic.map((m) => m.rule.ruleId));
  const matches = byTopic.length >= 2 ? byTopic : [...byTopic, ...getApplicableRules(snapshot, kb).filter((m) => !seen.has(m.rule.ruleId))];
  return { snapshot, matches: matches.slice(0, 5) };
}
