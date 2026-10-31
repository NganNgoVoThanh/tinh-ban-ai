import type { ChartSnapshot, FactId } from '@tinhban/shared';

/**
 * Fact tối thiểu client gửi lên server khi hỏi tự do (Technical Plan mục 10): chỉ các cung liên quan
 * và tam phương tứ chính của chúng, kèm địa chi. Không có tên, ngày giờ sinh hay mã hồ sơ.
 */
const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

/** Fact địa chi của cung, theo số thứ tự (0 = Tý): 'palace:menh|branch:6'. */
export const branchFact = (palaceKey: string, branch: string): FactId => `palace:${palaceKey}|branch:${BRANCHES.indexOf(branch)}`;

export const branchOfFact = (index: string): string => BRANCHES[Number(index)] ?? '';

export function questionFacts(snapshot: ChartSnapshot, palaces: string[]): FactId[] {
  const all = snapshot.palaces ?? [];
  const index = (branch: string) => BRANCHES.indexOf(branch);
  const keys = new Set<string>();
  for (const key of palaces) {
    const from = all.find((p) => p.key === key);
    if (!from) continue;
    for (const offset of [0, 4, 6, 8]) {
      const p = all.find((x) => index(x.branch) === (index(from.branch) + offset) % 12);
      if (p) keys.add(p.key);
    }
  }
  return all
    .filter((p) => keys.has(p.key))
    .flatMap((p) => [branchFact(p.key, p.branch), ...snapshot.facts.filter((f) => f.startsWith(`palace:${p.key}|`) || f === `core:than|palace:${p.key}`)]);
}
