/**
 * So out/engine-<phái>.json với fixtures/lasotuvi.json, ghi out/report.md.
 * Mỗi nhóm so riêng để biết lệch do đâu: vị trí sao, tứ hóa, độ sáng, đại hạn.
 */
import { writeFileSync } from 'node:fs';
import { SCHOOL_IDS, SCHOOL_NAMES } from '@tinhban/shared';
import { CATEGORY_LABEL, compareCase, LASO_NO_BRIGHTNESS, loadLasotuvi, readJson, type Category, type EngineCase } from './lib.ts';

const laso = loadLasotuvi();
const categories = Object.keys(CATEGORY_LABEL) as Category[];
const lines: string[] = ['# Đối chiếu bộ tính với lasotuvi', ''];

for (const school of SCHOOL_IDS) {
  const engine = readJson<EngineCase[]>(`./out/engine-${school}.json`);
  const failed = Object.fromEntries(categories.map((c) => [c, 0])) as Record<Category, number>;
  const examples = Object.fromEntries(categories.map((c) => [c, [] as string[]])) as Record<Category, string[]>;
  const starMiss = new Map<string, { n: number; stems: Set<string> }>();
  const hoaByStem = new Map<string, { engine: string; laso: Set<string> }>();
  const brightness = new Map<string, { engine: string; laso: string }>();
  const errors = engine.filter((e) => e.error);
  const stale: string[] = [];
  let compared = 0;

  for (const e of engine) {
    const l = laso.get(e.id);
    if (!e.palaces || !l) continue;
    if (JSON.stringify(l.input) !== JSON.stringify(e.lasoInput)) {
      stale.push(e.id);
      continue;
    }
    compared++;
    const stem = e.yearCanChi!.split(' ')[0]!;
    const diffs = compareCase(e, l);
    for (const c of new Set(diffs.map((d) => d.cat))) {
      failed[c]++;
      const msgs = diffs.filter((d) => d.cat === c).map((d) => d.msg);
      if (examples[c].length < 4) examples[c].push(`${e.id} (${e.tags.join(',')}, ${e.yearCanChi}): ${msgs.slice(0, 3).join('; ')}`);
    }
    for (const d of diffs) {
      if ((d.cat === 'chinh_tinh' || d.cat === 'phu_tinh') && d.star) {
        const m = starMiss.get(d.star) ?? { n: 0, stems: new Set<string>() };
        m.n++;
        m.stems.add(stem);
        starMiss.set(d.star, m);
      }
      if (d.hoa) {
        // Sao mang hóa của lasotuvi = giao của các sao cùng cung qua mọi ca cùng can năm.
        const key = `${stem} · Hóa ${d.hoa.hoa}`;
        const prev = hoaByStem.get(key);
        const cand = new Set(prev ? d.hoa.lasoStars.filter((k) => prev.laso.has(k)) : d.hoa.lasoStars);
        hoaByStem.set(key, { engine: d.hoa.engineStar ?? '—', laso: cand });
      }
      if (d.brightness) brightness.set(d.brightness.at, { engine: d.brightness.engine ?? '—', laso: d.brightness.laso ?? '—' });
    }
  }

  const pct = (n: number) => `${((100 * (compared - n)) / compared).toFixed(1)}%`;
  lines.push(
    `## ${SCHOOL_NAMES[school]}`,
    '',
    `Bộ ca: ${engine.length} ca; so được ${compared} ca có giờ sinh; ${errors.length} ca chưa an sao được.`,
    'lasotuvi nhận đúng ngày âm và giờ mà bộ tính đã dùng, nên bảng dưới chỉ so phần an sao.',
    `Không so độ sáng của ${LASO_NO_BRIGHTNESS.join(', ')} (lasotuvi không ghi).`,
    '',
    '| Nhóm | Ca khớp hoàn toàn | Ca lệch |',
    '|---|---|---|',
    ...categories.map((c) => `| ${CATEGORY_LABEL[c]} | ${pct(failed[c])} | ${failed[c]} |`),
    '',
  );
  if (stale.length > 0) {
    lines.push(`**Fixture cũ:** ${stale.length} ca có ngày âm hoặc giờ khác lúc chạy lasotuvi (${stale.slice(0, 5).join(', ')}…). Chạy lại run_lasotuvi.py.`, '');
  }
  for (const c of categories) {
    if (examples[c].length === 0) continue;
    lines.push(`### ${CATEGORY_LABEL[c]}: ví dụ lệch`, '', ...examples[c].map((d) => `- ${d}`), '');
  }
  if (starMiss.size > 0) {
    lines.push('### Sao lệch vị trí, đếm theo sao', '', '| Sao | Số ca lệch | Can năm của các ca lệch |', '|---|---|---|',
      ...[...starMiss].sort((x, y) => y[1].n - x[1].n).map(([k, m]) => `| ${k} | ${m.n} / ${compared} | ${[...m.stems].sort().join(', ')} |`), '');
  }
  if (hoaByStem.size > 0) {
    lines.push('### Tứ hóa lệch theo can năm sinh', '', '| Can · hóa | Bộ tính | lasotuvi |', '|---|---|---|',
      ...[...hoaByStem].sort().map(([k, v]) => `| ${k} | ${v.engine} | ${[...v.laso].join(' hoặc ') || '?'} |`), '');
  }
  if (brightness.size > 0) {
    lines.push(`### Độ sáng khác nhau (${brightness.size} cặp sao–cung)`, '', '| Sao @ cung | Bộ tính | lasotuvi |', '|---|---|---|',
      ...[...brightness].sort().map(([k, v]) => `| ${k} | ${v.engine} | ${v.laso} |`), '');
  }
  if (errors.length > 0) {
    lines.push('### Ca chưa an sao được', '', ...errors.map((e) => `- ${e.id} (${e.tags.join(',')}): ${e.error}`), '');
  }
}

writeFileSync(new URL('./out/report.md', import.meta.url), lines.join('\n'));
console.log(lines.join('\n'));
