/** Chạy bộ tính trên cases.json cho từng phái, ghi out/engine-<phái>.json để so với lasotuvi. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { SCHOOL_IDS } from '@tinhban/shared';
import { engineCase, loadCases } from './lib.ts';

const cases = loadCases();
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
for (const school of SCHOOL_IDS) {
  const out = cases.map((c) => engineCase(c, school));
  writeFileSync(new URL(`./out/engine-${school}.json`, import.meta.url), JSON.stringify(out));
  console.log(`Bộ tính (${school}): ${out.length} ca → out/engine-${school}.json`);
}
