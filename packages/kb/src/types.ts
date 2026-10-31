import type { Brightness, FactId, Mutagen, SchoolId } from '@tinhban/shared';

/**
 * Điều kiện áp dụng của một đơn vị tri thức (Technical Plan mục 7). Mệnh đề nguyên tử:
 * - `{ palace, has_star }`: cung có sao; has_star là key sao hoặc hoa_loc/hoa_quyen/hoa_khoa/hoa_ky
 *   (cung có sao mang hóa đó). Thêm `scope: tam_phuong` để xét cả tam phương tứ chính của cung.
 * - `{ palace, no_major: true }`: cung vô chính diệu.
 * - `{ palace, is_body: true }`: cung Thân cư ở cung này.
 * - `{ star, state_in }`: sao có độ sáng thuộc danh sách (sao ở cung nào cũng được).
 * - `{ star, hoa }`: sao mang hóa.
 * Tổ hợp bằng `all`, `any`, `not`.
 */
export type Atom =
  | { palace: string; has_star: string; scope?: 'self' | 'tam_phuong' }
  | { palace: string; no_major: true }
  | { palace: string; is_body: true }
  | { star: string; state_in: Brightness[] }
  | { star: string; hoa: Mutagen };

export type Condition = Atom | { all: Condition[] } | { any: Condition[] } | { not: Condition };

export interface Citation {
  sourceId: string;
  edition?: string;
  page?: number | string;
}

export type ReviewLevel = 'L0' | 'L1' | 'L2';

/** Đơn vị tri thức (mục 23). Trong YAML viết snake_case; bộ biên dịch đổi sang dạng này. */
export interface KnowledgeRule {
  ruleId: string;
  /** Bỏ trống: dùng chung cho cả hai phái. */
  schools?: SchoolId[];
  version: number;
  kind: 'interpretation' | 'pattern' | 'folk' | 'year';
  topic: string;
  conditions: Condition;
  exclusions?: Condition[];
  headline: string;
  because: string;
  detail: string;
  citations: Citation[];
  review: { level: ReviewLevel; by: string; date: string; sourcesChecked: number };
  priority: number;
  public?: boolean;
  tests?: { positive: string[]; negative: string[] };
}

export interface Source {
  sourceId: string;
  title: string;
  author?: string;
  /** Đơn vị chỉ thuộc một phái thì nguồn của phái đó. */
  school?: SchoolId;
}

/** Bundle kho đã biên dịch (kb-<semver>.json). */
export interface KnowledgeBundle {
  version: string;
  /** Hash nội dung, để client biết bundle đổi. */
  hash: string;
  builtAt: string;
  sources: Source[];
  rules: KnowledgeRule[];
}

export interface RuleMatch {
  rule: KnowledgeRule;
  /** Fact của lá số làm điều kiện đúng (dùng cho tầng 2 và để kiểm câu trả lời AI). */
  facts: FactId[];
}
