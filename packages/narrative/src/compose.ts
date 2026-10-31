import { getApplicableRules, renderTemplate, rulesForPalace, type KnowledgeBundle, type RuleMatch } from '@tinhban/kb';
import { SCHOOL_NAMES, type ChartSnapshot, type FactId } from '@tinhban/shared';

/** Nhãn nội dung bắt buộc (Technical Plan mục 7, 13). */
export type InsightLabel = 'interpretation' | 'folk';

/** Một nhận định 3 tầng, ghép từ đơn vị đã duyệt; không gọi AI. */
export interface Insight {
  ruleId: string;
  label: InsightLabel;
  /** Tầng 1: câu đời thường. */
  headline: string;
  /** Tầng 2: vì sao, đã chèn fact thật của lá số. */
  because: string;
  /** Fact của lá số làm căn cứ (Dữ kiện). */
  facts: FactId[];
  /** Tầng 3: đoạn diễn giải đã duyệt và nguồn. */
  detail: string;
  citations: { title: string; edition?: string; page?: number | string }[];
  /** Nhãn phụ: "Chưa qua chuyên gia" (L1), tên phái khi đơn vị chỉ thuộc một phái. */
  subLabels: string[];
}

/** Ghép nhận định 3 tầng từ các đơn vị khớp (giữ thứ tự đã xếp). */
export function composeExplanation(matches: RuleMatch[], snapshot: ChartSnapshot, kb: Pick<KnowledgeBundle, 'sources'>): Insight[] {
  const titles = new Map(kb.sources.map((s) => [s.sourceId, s.title]));
  return matches.map(({ rule, facts }) => ({
    ruleId: rule.ruleId,
    label: rule.kind === 'folk' ? 'folk' : 'interpretation',
    headline: renderTemplate(rule.headline, rule.conditions, snapshot),
    because: renderTemplate(rule.because, rule.conditions, snapshot),
    facts,
    detail: rule.detail,
    citations: rule.citations.map((c) => ({
      title: titles.get(c.sourceId) ?? c.sourceId,
      ...(c.edition && { edition: c.edition }),
      ...(c.page !== undefined && { page: c.page }),
    })),
    subLabels: [
      ...(rule.review.level === 'L1' ? ['Chưa qua chuyên gia'] : []),
      ...(rule.schools?.length === 1 ? [SCHOOL_NAMES[rule.schools[0]!]] : []),
    ],
  }));
}

/** Tối đa 3 nhận định cho một cung (mục 7): lọc theo phái, khớp, loại trừ, xếp theo priority. */
export function palaceInsights(snapshot: ChartSnapshot, kb: KnowledgeBundle, palaceKey: string, limit = 3): Insight[] {
  const matches = rulesForPalace(getApplicableRules(snapshot, kb), palaceKey).filter((m) => m.rule.kind !== 'folk');
  return composeExplanation(matches.slice(0, limit), snapshot, kb);
}
