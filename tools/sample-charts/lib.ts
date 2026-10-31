/**
 * Độ phủ của kho (Technical Plan mục 7): với mỗi lá số mẫu, tỷ lệ fact trọng yếu có ít nhất một
 * đơn vị từ L1 khớp; lấy trung vị trên mọi lá số, tính riêng từng phái.
 */
import { getApplicableRules, type KnowledgeBundle } from '@tinhban/kb';
import type { ChartSnapshot, FactId, PalaceFacts, SchoolId } from '@tinhban/shared';

/** Cung Mệnh và 5 cung dự kiến được hỏi nhiều nhất (chốt lại theo câu hỏi thật của người dùng thử). */
export const CORE_PALACES = ['menh', 'quan_loc', 'tai_bach', 'phu_the', 'phuc_duc', 'thien_di'];

/** Fact trọng yếu phạm vi gốc: chính tinh (kèm độ sáng) và Tứ hóa ở các cung trọng yếu. */
export function keyFacts(palaces: PalaceFacts[]): FactId[] {
  const out: FactId[] = [];
  for (const p of palaces.filter((x) => CORE_PALACES.includes(x.key))) {
    if (p.majorStars.length === 0) out.push(`palace:${p.key}|vo_chinh_dieu`);
    for (const s of p.majorStars) out.push(s.brightness ? `palace:${p.key}|star:${s.key}|state:${s.brightness}` : `palace:${p.key}|star:${s.key}`);
    for (const s of [...p.majorStars, ...p.minorStars]) if (s.mutagen) out.push(`palace:${p.key}|star:${s.key}|hoa:${s.mutagen}`);
  }
  return out;
}

/** Tỷ lệ fact trọng yếu của một lá số có đơn vị khớp (0–1). */
export function chartCoverage(snapshot: ChartSnapshot, kb: Pick<KnowledgeBundle, 'rules'>): number {
  const facts = keyFacts(snapshot.palaces ?? []);
  if (facts.length === 0) return 1;
  const covered = new Set(getApplicableRules(snapshot, kb).flatMap((m) => m.facts));
  return facts.filter((f) => covered.has(f)).length / facts.length;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Trung vị độ phủ theo phái; chỉ đơn vị từ L1. */
export function coverageBySchool(charts: ChartSnapshot[], kb: Pick<KnowledgeBundle, 'rules'>): Record<SchoolId, number> {
  const released = { rules: kb.rules.filter((r) => r.review.level !== 'L0') };
  const of = (school: SchoolId) => median(charts.map((c) => chartCoverage({ ...c, schoolId: school }, released)));
  return { nam: of('nam'), bac: of('bac') };
}
