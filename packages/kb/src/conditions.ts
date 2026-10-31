import type { ChartSnapshot, FactId, PalaceFacts, StarFact } from '@tinhban/shared';
import type { Atom, Condition } from './types.ts';

const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const HOA_ALIAS: Record<string, StarFact['mutagen']> = { hoa_loc: 'loc', hoa_quyen: 'quyen', hoa_khoa: 'khoa', hoa_ky: 'ky' };

const starsOf = (p: PalaceFacts) => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars];

const starFact = (p: PalaceFacts, s: StarFact): FactId =>
  s.brightness ? `palace:${p.key}|star:${s.key}|state:${s.brightness}` : `palace:${p.key}|star:${s.key}`;

/** Chính cung và tam phương tứ chính (tam hợp cách 4, xung chiếu cách 6). */
function palacesInScope(palaces: PalaceFacts[], palace: PalaceFacts, scope: 'self' | 'tam_phuong'): PalaceFacts[] {
  const i = BRANCHES.indexOf(palace.branch);
  if (scope === 'self' || i < 0) return [palace];
  // Lá số rút gọn phía server có thể thiếu cung: chỉ xét các cung có mặt.
  const at = (offset: number) => palaces.find((p) => BRANCHES.indexOf(p.branch) === (i + offset) % 12);
  return [palace, at(4), at(8), at(6)].filter((p): p is PalaceFacts => p !== undefined);
}

/** Xét một mệnh đề; trả về fact khớp, hoặc null nếu không đúng. */
function evalAtom(palaces: PalaceFacts[], atom: Atom): FactId[] | null {
  if ('star' in atom) {
    for (const p of palaces) {
      const s = starsOf(p).find((x) => x.key === atom.star);
      if (!s) continue;
      if ('state_in' in atom) return s.brightness && atom.state_in.includes(s.brightness) ? [starFact(p, s)] : null;
      return s.mutagen === atom.hoa ? [`palace:${p.key}|star:${s.key}|hoa:${s.mutagen}`] : null;
    }
    return null;
  }
  const palace = palaces.find((p) => p.key === atom.palace);
  if (!palace) return null;
  if ('no_major' in atom) return palace.majorStars.length === 0 ? [`palace:${palace.key}|vo_chinh_dieu`] : null;
  if ('is_body' in atom) return palace.isBody ? [`core:than|palace:${palace.key}`] : null;
  const hoa = HOA_ALIAS[atom.has_star];
  const facts: FactId[] = [];
  for (const p of palacesInScope(palaces, palace, atom.scope ?? 'self')) {
    for (const s of starsOf(p)) {
      if (hoa ? s.mutagen === hoa : s.key === atom.has_star) {
        facts.push(hoa ? `palace:${p.key}|star:${s.key}|hoa:${hoa}` : starFact(p, s));
      }
    }
  }
  return facts.length ? facts : null;
}

/** Xét điều kiện trên lá số; trả về fact khớp (có thể rỗng với `not`), hoặc null nếu điều kiện sai. */
export function evaluate(snapshot: ChartSnapshot, condition: Condition): FactId[] | null {
  const palaces = snapshot.palaces;
  if (!palaces) return null;
  const go = (c: Condition): FactId[] | null => {
    if ('all' in c) {
      const out: FactId[] = [];
      for (const x of c.all) {
        const r = go(x);
        if (!r) return null;
        out.push(...r);
      }
      return out;
    }
    if ('any' in c) {
      const hits = c.any.map(go).filter((r): r is FactId[] => r !== null);
      return hits.length ? hits.flat() : null;
    }
    if ('not' in c) return go(c.not) ? null : [];
    return evalAtom(palaces, c);
  };
  const facts = go(condition);
  return facts ? [...new Set(facts)] : null;
}

/** Mọi mệnh đề nguyên tử trong điều kiện (để kiểm từ điển và chèn fact vào câu). */
export function atomsOf(condition: Condition): Atom[] {
  if ('all' in condition) return condition.all.flatMap(atomsOf);
  if ('any' in condition) return condition.any.flatMap(atomsOf);
  if ('not' in condition) return atomsOf(condition.not);
  return [condition];
}
