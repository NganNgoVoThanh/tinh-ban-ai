/**
 * kb build (Technical Plan mục 7): đọc content/*.yaml, kiểm, chạy test từng đơn vị trên bộ ca chuẩn
 * (tools/golden/cases.json), xuất dist/kb.json (chỉ L1 trở lên) và dist/kb.all.json (gồm cả L0).
 * Chạy: pnpm --filter @tinhban/kb build:kb
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeChart } from '@tinhban/chart-engine';
import type { BirthInput, ChartSnapshot, SchoolId } from '@tinhban/shared';
import { parse } from 'yaml';
import { compile } from './compile.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const contentDir = join(root, 'content');
const casesFile = join(root, '../../tools/golden/cases.json');

const readYaml = (file: string): unknown => parse(readFileSync(file, 'utf8'));
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.yaml') ? [p] : [];
  });

const cases = new Map((JSON.parse(readFileSync(casesFile, 'utf8')) as { id: string; input: BirthInput }[]).map((c) => [c.id, c.input]));
const cache = new Map<string, ChartSnapshot | undefined>();
const snapshotOf = (caseId: string, school: SchoolId) => {
  const id = caseId.replace(/^golden\//, '');
  const key = `${id}|${school}`;
  if (!cache.has(key)) {
    const input = cases.get(id);
    cache.set(key, input ? computeChart(input, school, undefined, { now: new Date(0) }) : undefined);
  }
  return cache.get(key);
};

const units = walk(contentDir)
  .filter((f) => !['kb.yaml', 'sources.yaml'].includes(basename(f)))
  .map((f) => ({ file: relative(root, f), data: readYaml(f) }));
const result = compile(
  { meta: readYaml(join(contentDir, 'kb.yaml')), sources: readYaml(join(contentDir, 'sources.yaml')), units },
  { snapshotOf, now: new Date() },
);

for (const w of result.warnings) console.warn(`⚠ ${w}`);
if (result.errors.length) {
  for (const e of result.errors) console.error(`✖ ${e}`);
  console.error(`kb build: ${result.errors.length} lỗi`);
  process.exit(1);
}
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/kb.json'), JSON.stringify(result.release));
writeFileSync(join(root, 'dist/kb.all.json'), JSON.stringify(result.all));
console.log(`kb ${result.release!.version} (${result.release!.hash}): ${result.release!.rules.length} đơn vị phát hành, ${result.all!.rules.length} đơn vị tất cả`);
