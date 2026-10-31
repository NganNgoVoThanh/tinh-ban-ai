/**
 * Sinh N lá số mẫu (mặc định 10.000), seed cố định: ngày ngẫu nhiên 1930–2030 × 12 giờ âm × 2 giới
 * tính. Ghi out/charts-<phiên bản bộ tính>.jsonl (chỉ phần 12 cung) để đo độ phủ nhanh nhiều lần.
 * Chạy: pnpm --filter @tinhban/sample-charts gen [N]
 */
import { createWriteStream, mkdirSync } from 'node:fs';
import { formatDate, jdFromDate, jdToDate } from '@tinhban/calendar';
import { computeChart, ENGINE_VERSION } from '@tinhban/chart-engine';

const N = Number(process.argv[2] ?? 10_000);
let seed = 20261030;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
const file = new URL(`./out/charts-${ENGINE_VERSION}.jsonl`, import.meta.url);
const out = createWriteStream(file);
let written = 0;
while (written < N) {
  const date = formatDate(jdToDate(int(jdFromDate(1, 1, 1930), jdFromDate(31, 12, 2030))));
  const branch = int(0, 11);
  const time = branch === 0 ? '00:30' : `${String(2 * branch).padStart(2, '0')}:00`;
  const gender = rand() < 0.5 ? 'male' : 'female';
  const s = computeChart(
    { calendar: 'solar', date, time, timeCertainty: 'exact', region: 'north', ...(date < '1976-01-01' && { provinceCode: '01' }), gender },
    'nam',
    undefined,
    { now: new Date(0) },
  );
  // Ngày 30 chưa an sao được thì bỏ qua (ADR 0001).
  if (!s.palaces) continue;
  out.write(JSON.stringify({ palaces: s.palaces }) + '\n');
  written++;
  if (written % 1000 === 0) console.log(`${written}/${N}`);
}
out.end();
console.log(`Đã ghi ${written} lá số vào ${file.pathname}`);
