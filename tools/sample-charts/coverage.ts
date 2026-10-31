/**
 * Đo độ phủ của kho trên lá số mẫu (out/charts-*.jsonl) với bundle phát hành (packages/kb/dist/kb.json).
 * Chạy: pnpm --filter @tinhban/sample-charts coverage [--min 0.9]
 */
import { readFileSync } from 'node:fs';
import { ENGINE_VERSION } from '@tinhban/chart-engine';
import type { KnowledgeBundle } from '@tinhban/kb';
import type { ChartSnapshot, PalaceFacts } from '@tinhban/shared';
import { coverageBySchool } from './lib.ts';

const charts = readFileSync(new URL(`./out/charts-${ENGINE_VERSION}.jsonl`, import.meta.url), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => ({ ...(JSON.parse(line) as { palaces: PalaceFacts[] }), schoolId: 'nam' }) as ChartSnapshot);
const kb: KnowledgeBundle = JSON.parse(readFileSync(new URL('../../packages/kb/dist/kb.json', import.meta.url), 'utf8'));
const result = coverageBySchool(charts, kb);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log(`kb ${kb.version} (${kb.rules.length} đơn vị), ${charts.length} lá số mẫu`);
console.log(`Độ phủ phạm vi gốc (trung vị): Nam phái ${pct(result.nam)}, Bắc phái ${pct(result.bac)}`);
const minArg = process.argv.indexOf('--min');
if (minArg > 0 && result.nam < Number(process.argv[minArg + 1])) {
  console.error(`Nam phái dưới ngưỡng ${pct(Number(process.argv[minArg + 1]))}`);
  process.exit(1);
}
