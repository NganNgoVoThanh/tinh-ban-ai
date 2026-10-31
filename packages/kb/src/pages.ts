import { BRIGHTNESS_NAMES, PALACES, STARS } from './dictionary.ts';
import type { Atom, Condition, KnowledgeBundle, KnowledgeRule } from './types.ts';

/**
 * Trang tri thức công khai (Technical Plan mục 14): mỗi đơn vị `public: true` từ L1 trở lên là một
 * trang /tri-thuc/[slug]. Tiêu đề và slug suy ra từ điều kiện (sao nào, ở cung nào), ví dụ
 * "Thái Dương miếu, vượng tại cung Quan Lộc"; trùng slug thì thêm số thứ tự theo rule_id.
 */
export interface PublicPage {
  slug: string;
  title: string;
  rule: KnowledgeRule;
}

/** Mệnh đề khẳng định (bỏ phần nằm trong `not`). */
function positiveAtoms(c: Condition): Atom[] {
  if ('all' in c) return c.all.flatMap(positiveAtoms);
  if ('any' in c) return c.any.flatMap(positiveAtoms);
  if ('not' in c) return [];
  return [c];
}

export function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function pageTitle(rule: KnowledgeRule): string {
  const atoms = positiveAtoms(rule.conditions);
  const has = atoms.find((a): a is Extract<Atom, { has_star: string }> => 'has_star' in a && !a.has_star.startsWith('hoa_'));
  if (has) {
    const state = atoms.find((a): a is Extract<Atom, { state_in: unknown }> => 'state_in' in a && a.star === has.has_star);
    const states = state ? ` ${state.state_in.map((s) => BRIGHTNESS_NAMES[s].toLowerCase()).join(', ')}` : '';
    return `${STARS[has.has_star]?.name ?? has.has_star}${states} tại cung ${PALACES[has.palace] ?? has.palace}`;
  }
  const empty = atoms.find((a): a is Extract<Atom, { no_major: true }> => 'no_major' in a);
  if (empty) return `Cung ${PALACES[empty.palace] ?? empty.palace} vô chính diệu`;
  // Không suy được từ điều kiện: dùng câu tầng 1, bỏ chỗ chèn fact.
  return rule.headline.replace(/\{[a-z_]+\}/g, '').replace(/\s+/g, ' ').trim();
}

export function publicPages(kb: Pick<KnowledgeBundle, 'rules'>): PublicPage[] {
  const used = new Map<string, number>();
  return kb.rules
    .filter((r) => r.public && r.review.level !== 'L0')
    .sort((a, b) => a.ruleId.localeCompare(b.ruleId))
    .map((rule) => {
      const title = pageTitle(rule);
      const base = toSlug(title);
      const n = (used.get(base) ?? 0) + 1;
      used.set(base, n);
      return { slug: n === 1 ? base : `${base}-${n}`, title, rule };
    });
}
