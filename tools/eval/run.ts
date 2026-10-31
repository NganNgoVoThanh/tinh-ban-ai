/**
 * Chạy eval E-01 (Technical Plan mục 18) với nhà cung cấp AI lấy từ biến môi trường (xem
 * packages/ai/src/config.ts) và bundle kho đầy đủ (packages/kb/dist/kb.all.json).
 *
 *   AI_PROVIDER=anthropic ANTHROPIC_API_KEY=… pnpm --filter @tinhban/eval e01 [--gate]
 *
 * Mỗi lần chạy với nhà cung cấp thật là tốn tiền; in chi phí ở cuối. Chi tiết ghi vào out/, báo cáo
 * tóm tắt vào reports/ (commit cùng PR khi sửa prompt, model hoặc kho).
 * --gate: thoát mã 1 khi trượt ngưỡng, mã 2 khi kho chưa đủ để chấm.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PROMPT_VERSION, providerFromEnv } from '@tinhban/ai';
import type { KnowledgeBundle } from '@tinhban/kb';
import { CASES, CHARTS } from './cases.ts';
import { gateE01, runCase, scoreE01, snapshotOf, type CaseResult } from './lib.ts';

const kb: KnowledgeBundle = JSON.parse(readFileSync(new URL('../../packages/kb/dist/kb.all.json', import.meta.url), 'utf8'));
const provider = providerFromEnv({ AI_PROVIDER: 'fake', ...process.env });
const snapshots = new Map(CHARTS.map((c) => [c.id, snapshotOf(c)]));

const results: CaseResult[] = [];
for (const c of CASES) {
  results.push(await runCase(c, snapshots.get(c.chartId)!, kb, provider));
  process.stdout.write('.');
}
process.stdout.write('\n');

const score = scoreE01(results);
const gate = gateE01(score);
const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`);
console.log(`E-01 · ${provider.name} · prompt ${PROMPT_VERSION} · kho ${kb.version} (${kb.rules.length} đơn vị)`);
console.log(`Câu có gọi AI: ${score.aiCalled}/${score.cases}`);
console.log(`Qua validator: ${pct(score.validatorPassRate)} · Bịa: ${score.invented} · Từ chối đúng: ${pct(score.refusalRate)}`);
console.log(`Độ dài trung bình: ${score.avgWords?.toFixed(0) ?? '—'} từ · Chi phí: ${score.totalCostUsd.toFixed(4)} USD, ${score.costPerPassedUsd?.toFixed(5) ?? '—'} USD mỗi câu đạt`);
console.log(gate.status === 'pass' ? 'Đạt ngưỡng.' : gate.status === 'fail' ? `Trượt: ${gate.reasons.join('; ')}` : `Chưa chấm được: ${gate.reason}`);

// Chi tiết từng câu vào out/ (không commit); báo cáo tóm tắt vào reports/ (commit cùng PR, CI đọc ở bước chặn eval).
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = { provider: provider.name, models: process.env.AI_MODEL_SMALL ?? null, promptVersion: PROMPT_VERSION, kbVersion: kb.version, kbHash: kb.hash, score, gate };
const outputs: [string, object][] = [['./out/', { ...report, results }]];
// AI giả lập chỉ để thử đường chạy, không thành báo cáo.
if (provider.name !== 'fake') outputs.push(['./reports/', report]);
for (const [dir, body] of outputs) {
  const url = new URL(dir, import.meta.url);
  mkdirSync(url, { recursive: true });
  writeFileSync(new URL(`e01-${stamp}-${provider.name}.json`, url), JSON.stringify(body, null, 2));
}

if (process.argv.includes('--gate') && gate.status !== 'pass') process.exit(gate.status === 'fail' ? 1 : 2);
