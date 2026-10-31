/**
 * Chặn eval (Technical Plan mục 19): PR sửa prompt, cấu hình model hoặc nội dung kho thì phải gắn nhãn
 * `eval` và có báo cáo E-01 mới trong tools/eval/reports/ đạt ngưỡng, đúng prompt_version và kb hiện tại.
 *
 *   node tools/ci/check-eval.mjs <base-ref> [--labels eval,foo]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'origin/main';
const labelsArg = process.argv.indexOf('--labels');
const labels = labelsArg > 0 ? (process.argv[labelsArg + 1] ?? '').split(',').filter(Boolean) : [];

const changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' }).split('\n').filter(Boolean);
const SENSITIVE = [/^packages\/ai\/src\/prompts\//, /^packages\/ai\/src\/config\.ts$/, /^packages\/ai\/src\/providers\//, /^packages\/kb\/content\//];
const touched = changed.filter((f) => SENSITIVE.some((re) => re.test(f)));
if (!touched.length) {
  console.log('Không sửa prompt, model hay kho: không cần eval.');
  process.exit(0);
}

const fail = (msg) => {
  console.error(`Chặn eval: ${msg}\nFile nhạy cảm đã sửa:\n${touched.join('\n')}`);
  process.exit(1);
};
if (!labels.includes('eval')) fail('PR cần nhãn "eval".');

const reports = changed.filter((f) => /^tools\/eval\/reports\/e01-.+\.json$/.test(f));
if (!reports.length) fail('thiếu báo cáo E-01 mới trong tools/eval/reports/ (chạy pnpm --filter @tinhban/eval e01 rồi commit báo cáo).');

const promptVersion = /PROMPT_VERSION = '([^']+)'/.exec(readFileSync('packages/ai/src/prompts/v1.ts', 'utf8'))?.[1];
const kb = JSON.parse(readFileSync('packages/kb/dist/kb.all.json', 'utf8'));
const latest = reports.sort().at(-1);
const report = JSON.parse(readFileSync(latest, 'utf8'));
if (report.provider === 'fake') fail(`${latest} chạy bằng AI giả lập.`);
if (report.promptVersion !== promptVersion) fail(`${latest} chạy với prompt ${report.promptVersion}, hiện tại là ${promptVersion}.`);
if (report.kbHash !== kb.hash) fail(`${latest} chạy với kho ${report.kbVersion} (${report.kbHash}), hiện tại là ${kb.version} (${kb.hash}).`);
if (report.gate?.status !== 'pass') fail(`${latest} không đạt ngưỡng: ${JSON.stringify(report.gate)}.`);
console.log(`Eval đạt: ${latest}`);
