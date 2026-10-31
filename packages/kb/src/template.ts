import type { ChartSnapshot, PalaceFacts, StarFact } from '@tinhban/shared';
import { atomsOf } from './conditions.ts';
import { BRIGHTNESS_NAMES, MUTAGEN_NAMES, PALACES, STARS } from './dictionary.ts';
import type { Condition } from './types.ts';

/**
 * Chèn fact thật của lá số vào câu tầng 2 ("because"). Chỗ trống:
 * {star}, {state}, {hoa}: tên, độ sáng, hóa của sao đầu tiên trong điều kiện;
 * {palace}, {branch}: tên, địa chi của cung đầu tiên trong điều kiện;
 * {star:key}, {state:key}, {hoa:key}, {palace:key}, {branch:key}: chỉ rõ sao hoặc cung.
 */
const SLOT = /\{(star|state|hoa|palace|branch)(?::([a-z_]+))?\}/g;

const HOA_KEYS = new Set(['hoa_loc', 'hoa_quyen', 'hoa_khoa', 'hoa_ky']);

function defaults(condition: Condition): { star?: string; palace?: string } {
  const atoms = atomsOf(condition);
  const star = atoms.flatMap((a) => ('star' in a ? [a.star] : 'has_star' in a && !HOA_KEYS.has(a.has_star) ? [a.has_star] : []))[0];
  const palace = atoms.flatMap((a) => ('palace' in a ? [a.palace] : []))[0];
  return { ...(star && { star }), ...(palace && { palace }) };
}

/** Lỗi chỗ trống của câu (để kb build báo), rỗng nếu hợp lệ. */
export function templateErrors(template: string, condition: Condition): string[] {
  const d = defaults(condition);
  const errors: string[] = [];
  for (const [, slot, key] of template.matchAll(SLOT)) {
    const target = key ?? (slot === 'palace' || slot === 'branch' ? d.palace : d.star);
    if (!target) errors.push(`{${slot}} không có ${slot === 'palace' || slot === 'branch' ? 'cung' : 'sao'} trong điều kiện`);
    else if ((slot === 'palace' || slot === 'branch') && !(target in PALACES)) errors.push(`cung lạ: ${target}`);
    else if (slot !== 'palace' && slot !== 'branch' && !(target in STARS)) errors.push(`sao lạ: ${target}`);
  }
  const leftover = template.replace(SLOT, '').match(/\{[^}]*\}/);
  if (leftover) errors.push(`chỗ trống không hiểu: ${leftover[0]}`);
  return errors;
}

/** Điền câu theo lá số. Chỗ trống không tìm thấy trong lá số thì để "…". */
export function renderTemplate(template: string, condition: Condition, snapshot: ChartSnapshot): string {
  const d = defaults(condition);
  const palaces = snapshot.palaces ?? [];
  const findStar = (key: string): { p: PalaceFacts; s: StarFact } | undefined => {
    for (const p of palaces) {
      const s = [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].find((x) => x.key === key);
      if (s) return { p, s };
    }
    return undefined;
  };
  return template.replace(SLOT, (_m, slot: string, key?: string) => {
    if (slot === 'palace' || slot === 'branch') {
      const k = key ?? d.palace;
      if (!k) return '…';
      if (slot === 'palace') return PALACES[k] ?? k;
      return palaces.find((p) => p.key === k)?.branch ?? '…';
    }
    const k = key ?? d.star;
    if (!k) return '…';
    if (slot === 'star') return STARS[k]?.name ?? k;
    const hit = findStar(k);
    if (slot === 'state') return hit?.s.brightness ? BRIGHTNESS_NAMES[hit.s.brightness] : '…';
    return hit?.s.mutagen ? `Hóa ${MUTAGEN_NAMES[hit.s.mutagen]}` : '…';
  });
}

/**
 * Điền câu cho trang công khai, không có lá số: sao và cung lấy từ điều kiện; độ sáng, hóa lấy theo
 * điều kiện (ví dụ "Miếu hoặc Vượng"); địa chi không biết thì bỏ cả cụm "ở …".
 */
export function renderGeneric(template: string, condition: Condition): string {
  const d = defaults(condition);
  const atoms = atomsOf(condition);
  return template
    .replace(SLOT, (_m, slot: string, key?: string) => {
      if (slot === 'branch') return '';
      if (slot === 'palace') {
        const k = key ?? d.palace;
        return k ? (PALACES[k] ?? k) : '…';
      }
      const k = key ?? d.star;
      if (!k) return '…';
      if (slot === 'star') return STARS[k]?.name ?? k;
      if (slot === 'state') {
        const states = atoms.flatMap((a) => ('state_in' in a && a.star === k ? a.state_in : []));
        return states.length ? states.map((s) => BRIGHTNESS_NAMES[s]).join(' hoặc ') : '…';
      }
      const hoa = atoms.flatMap((a) => ('hoa' in a && a.star === k ? [a.hoa] : []))[0];
      return hoa ? `Hóa ${MUTAGEN_NAMES[hoa]}` : '…';
    })
    .replace(/\s+/g, ' ')
    .trim();
}
