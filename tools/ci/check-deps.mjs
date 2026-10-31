/**
 * Kiểm quy tắc phụ thuộc giữa các phần (Technical Plan mục 4, 16, 19). Đọc import tĩnh và động của
 * mọi file .ts/.tsx (trừ node_modules, .next, dist), báo vi phạm và thoát mã 1.
 *
 *   node tools/ci/check-deps.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SKIP = new Set(['node_modules', '.next', 'dist', 'out', 'test-results', 'playwright-report', '.venv']);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(ts|tsx|mjs)$/.test(name)) yield path;
  }
}

const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s+['"]([^'"]+)['"]/gm;

/** Mã chạy trên trình duyệt: mọi file của web trừ route handler, lib/server, sw, e2e và test. */
const isWebClient = (p) =>
  p.startsWith('apps/web/') &&
  !/^apps\/web\/(app\/api\/|lib\/server\/|e2e\/|scripts\/)/.test(p) &&
  !/\.test\.tsx?$/.test(p) &&
  !/^apps\/web\/(next|playwright|vitest)\.config\.ts$/.test(p) &&
  !/^apps\/web\/app\/(sitemap|robots)\.ts$/.test(p);

const RULES = [
  { name: 'packages không import app', from: (p) => p.startsWith('packages/'), forbid: /^@tinhban\/web|apps\// },
  {
    name: 'chỉ server được dùng packages/ai, khóa và SDK AI',
    from: isWebClient,
    forbid: /^@tinhban\/ai|^@\/lib\/server\/|^@anthropic-ai\/sdk|^openai$|^web-push$/,
  },
  {
    name: 'bộ tính, lịch, mã hồ sơ, dân gian, kho, lời giải thích không gọi AI',
    from: (p) => /^packages\/(shared|calendar|chart-engine|profile-code|folk-calendar|kb|narrative|ui)\//.test(p) && !p.includes('/test/'),
    forbid: /^@tinhban\/ai|^@anthropic-ai\/sdk|^openai$/,
  },
  {
    name: 'bộ tính và lịch không phụ thuộc kho hay lời giải thích',
    from: (p) => /^packages\/(shared|calendar|chart-engine|profile-code)\/src\//.test(p),
    forbid: /^@tinhban\/(kb|narrative|ui|folk-calendar)/,
  },
];

const violations = [];
for (const top of ['apps', 'packages', 'tools']) {
  for (const file of files(join(ROOT, top))) {
    const rel = relative(ROOT, file).split(sep).join('/');
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(IMPORT)) {
      const spec = m[1] ?? m[2] ?? m[3];
      for (const rule of RULES) if (rule.from(rel) && rule.forbid.test(spec)) violations.push(`${rel}: import '${spec}' (${rule.name})`);
    }
  }
}

if (violations.length) {
  console.error(`Vi phạm quy tắc phụ thuộc (${violations.length}):\n${violations.join('\n')}`);
  process.exit(1);
}
console.log('Quy tắc phụ thuộc: không có vi phạm.');
