/**
 * Golden test (Technical Plan mục 18): bộ tính khớp lasotuvi trên toàn bộ ca chuẩn, cho cả hai phái.
 * Kết quả lasotuvi nằm sẵn trong fixtures/ nên test không cần Python.
 */
import { CHI, yearCanChi } from '@tinhban/calendar';
import { smallLimitBranch } from '@tinhban/chart-engine';
import { SCHOOL_IDS, SCHOOL_NAMES } from '@tinhban/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { compareCase, engineCase, loadCases, loadLasotuvi, type EngineCase } from './lib.ts';

const cases = loadCases();
const laso = loadLasotuvi();

/** Ngày 30 âm lịch mà lớp bọc iztro chưa an sao được (ADR 0001). */
const KNOWN_UNSUPPORTED = ['case-228', 'case-236', 'case-237', 'case-238', 'case-239'];

it('bộ ca có từ 150 ca và đủ các nhóm của mục 5', () => {
  expect(cases.length).toBeGreaterThanOrEqual(150);
  const tags = new Set(cases.flatMap((c) => c.tags));
  for (const t of ['random', 'leap', 'tet', 'ty', 'y1968', 'y1985', 'south-utc8', 'no-time', 'canh', 'abroad', 'ben-hai', 'override', 'day30']) {
    expect(tags, t).toContain(t);
  }
});

describe.each(SCHOOL_IDS.map((id) => [SCHOOL_NAMES[id], id] as const))('%s', (_name, school) => {
  let results: EngineCase[];
  beforeAll(() => {
    results = cases.map((c) => engineCase(c, school));
  });

  it('lasotuvi đã chạy trên đúng ngày âm và giờ của bộ tính', () => {
    const stale = results.filter((e) => e.lasoInput && JSON.stringify(laso.get(e.id)?.input) !== JSON.stringify(e.lasoInput));
    expect(stale.map((e) => e.id), 'ngày âm hoặc giờ đã đổi: chạy lại tools/golden/run_lasotuvi.py').toEqual([]);
  });

  it('an sao khớp lasotuvi ở mọi nhóm', () => {
    const diffs = results.flatMap((e) => {
      const l = laso.get(e.id);
      return e.palaces && l ? compareCase(e, l).map((d) => `${e.id} · ${d.cat} · ${d.msg}`) : [];
    });
    expect(diffs).toEqual([]);
  });

  it('tiểu hạn khớp lasotuvi ở mọi tuổi trong một vòng 12 năm', () => {
    if (school !== 'nam') return;
    const diffs: string[] = [];
    for (const e of results) {
      const l = laso.get(e.id);
      if (!e.lasoInput || !l) continue;
      const birthChi = yearCanChi(e.lasoInput.year).chi;
      for (let age = 1; age <= 12; age++) {
        const yearBranch = CHI[(birthChi + age - 1) % 12];
        const expected = l.palaces.find((p) => p.tieuHan === yearBranch)?.branch;
        const actual = CHI[smallLimitBranch(birthChi, e.lasoInput.gender, age)];
        if (expected !== actual) diffs.push(`${e.id} tuổi ${age}: ${actual} ≠ ${expected}`);
      }
    }
    expect(diffs).toEqual([]);
  });

  it('chỉ các ngày 30 đã biết là chưa an sao được', () => {
    expect(results.filter((e) => e.error).map((e) => e.id)).toEqual(KNOWN_UNSUPPORTED);
  });
});
