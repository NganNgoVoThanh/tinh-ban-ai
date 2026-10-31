/**
 * Sinh icon PWA và màn hình chờ iOS từ một SVG (Technical Plan mục 11), bằng Chromium của Playwright.
 * Chạy lại khi đổi thiết kế icon: node scripts/make-icons.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SON = "#a01d29";
const IVORY = "#fbf7f1";
const GOLD = "#ffe3a3";
const GOLD_DARK = "#a87a24";
// Chấm giữa: ngà trên icon nền đỏ, đỏ son trên màn hình chờ nền ngà.
const CORE = "#fff6e6";
const CORE_SPLASH = "#c8323a";

/** Vòng 12 cung: mỗi vạch là một cung, chấm giữa là Mệnh. scale < 1 để chừa vùng an toàn cho maskable. */
function emblem(scale = 1) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const r1 = 168 * scale;
    const r2 = (i % 3 === 0 ? 206 : 192) * scale;
    const p = (r) => [256 + r * Math.sin(a), 256 - r * Math.cos(a)].map((v) => v.toFixed(1)).join(",");
    return `<line x1="${p(r1).split(",")[0]}" y1="${p(r1).split(",")[1]}" x2="${p(r2).split(",")[0]}" y2="${p(r2).split(",")[1]}" stroke="${GOLD}" stroke-width="${14 * scale}" stroke-linecap="round"/>`;
  }).join("");
  return `<circle cx="256" cy="256" r="${150 * scale}" fill="none" stroke="${GOLD}" stroke-width="${12 * scale}"/>
    ${ticks}
    <circle cx="256" cy="256" r="${34 * scale}" fill="${CORE}"/>
    <circle cx="256" cy="${256 - 96 * scale}" r="${16 * scale}" fill="${GOLD}"/>`;
}

const svg = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c42d34"/><stop offset="1" stop-color="#82162a"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>${emblem(scale)}</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();

async function shot(file, width, height, body, bg = SON) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<html><body style="margin:0;background:${bg};display:grid;place-items:center;width:${width}px;height:${height}px">${body}</body></html>`);
  await page.screenshot({ path: file, omitBackground: false });
}

mkdirSync("public/icons", { recursive: true });
mkdirSync("public/splash", { recursive: true });
for (const size of [192, 512]) {
  await shot(`public/icons/icon-${size}.png`, size, size, svg(1).replace('width="512" height="512"', `width="${size}" height="${size}"`));
}
// Maskable: Android cắt theo hình tròn hoặc bo góc, giữ hình trong 80% giữa.
await shot("public/icons/icon-maskable-512.png", 512, 512, svg(0.78));
await shot("public/icons/apple-touch-icon.png", 180, 180, svg(0.86).replace('width="512" height="512"', 'width="180" height="180"'));

// Màn hình chờ iOS (cỡ pixel thật, dọc).
const SPLASH = [
  [1290, 2796], [1179, 2556], [1170, 2532], [1284, 2778], [1125, 2436], [828, 1792], [750, 1334],
];
for (const [w, h] of SPLASH) {
  const s = Math.round(w * 0.32);
  // Màn hình chờ nền giấy ngà như app lúc mở; biểu tượng vẽ bằng vàng đậm cho rõ trên nền sáng.
  const body = svg(1).replace('width="512" height="512"', `width="${s}" height="${s}"`).replace(`<rect width="512" height="512" fill="url(#g)"/>`, "").replaceAll(GOLD, GOLD_DARK).replaceAll(CORE, CORE_SPLASH);
  await shot(`public/splash/splash-${w}x${h}.png`, w, h, body, IVORY);
}
await browser.close();
console.log("Đã sinh icon và màn hình chờ");
