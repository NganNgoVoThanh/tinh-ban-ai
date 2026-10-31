/**
 * Quét bundle client sau khi build (Technical Plan mục 16, 19): không được có khóa API, tên biến bí
 * mật, SDK AI hay mã của packages/ai trong file gửi xuống trình duyệt (.next/static, service worker).
 *
 *   node tools/ci/scan-bundle.mjs [apps/web]
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const web = process.argv[2] ?? 'apps/web';
// .next/server/app/serwist: service worker do Serwist sinh, được phục vụ cho trình duyệt.
const roots = [join(web, '.next', 'static'), join(web, '.next', 'server', 'app', 'serwist'), join(web, 'public')].filter(existsSync);
if (!roots.length) {
  console.error(`Chưa có bản build trong ${web}/.next/static. Chạy build trước.`);
  process.exit(2);
}

const FORBIDDEN = [
  { what: 'khóa Anthropic', re: /sk-ant-[A-Za-z0-9_-]{10,}/ },
  { what: 'khóa OpenAI', re: /sk-(?:proj-)?[A-Za-z0-9]{20,}/ },
  { what: 'tên biến bí mật', re: /ANTHROPIC_API_KEY|OPENAI_API_KEY|UPSTASH_REDIS_REST_TOKEN|TURNSTILE_SECRET_KEY|VAPID_PRIVATE_KEY|CRON_SECRET|DATABASE_URL|AUTH_SECRET|AUTH_GITHUB_SECRET/ },
  { what: 'SDK AI', re: /api\.anthropic\.com|api\.openai\.com|anthropic-version|server-side-fallback-/ },
  { what: 'mã của packages/ai (prompt hệ thống)', re: /Bạn là trợ lý của Tinh Bàn|answer_trace|PROMPT_VERSION/ },
  { what: 'gói web-push', re: /web-push|vapidDetails/ },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(js|mjs|json|map|html|txt|body)$/.test(name)) yield path;
  }
}

const unescapeJs = (text) =>
  text
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

const hits = [];
let scanned = 0;
for (const root of roots) {
  for (const file of files(root)) {
    // Source map chứa nguồn gốc; vẫn quét vì có thể bị phục vụ công khai. Bản minify viết ký tự có dấu
    // thành \xHH, \uHHHH: giải mã trước khi dò.
    const text = unescapeJs(readFileSync(file, 'utf8'));
    scanned++;
    for (const f of FORBIDDEN) {
      const m = f.re.exec(text);
      if (m) hits.push(`${file}: ${f.what} ("${m[0].slice(0, 40)}")`);
    }
  }
}

if (hits.length) {
  console.error(`Bundle client có thứ không được có (${hits.length}):\n${hits.join('\n')}`);
  process.exit(1);
}
console.log(`Quét ${scanned} file bundle client: sạch.`);
