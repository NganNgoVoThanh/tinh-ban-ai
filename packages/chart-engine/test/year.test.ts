import { MUTAGENS } from '@tinhban/shared';
import { describe, expect, it } from 'vitest';
import { getYearView, smallLimitBranch } from '../src/index.ts';
import { chart, palaceAt } from './helpers.ts';

// 16/8/2000 giờ Dần, nam, Canh Thìn: Mệnh ở Ngọ, Mộc tam cục (đại hạn đầu 3–12).
describe('vận hạn theo năm (getYearView)', () => {
  it('năm 2026 Bính Ngọ: tuổi âm 27, đại vận, lưu niên ở cung Ngọ, Tứ hóa can Bính', () => {
    const s = chart({});
    const v = getYearView(s, 2026, 'male');
    expect(v).toMatchObject({ lunarYear: 2026, canChi: 'Bính Ngọ', ageLunar: 27 });
    const decade = s.palaces!.find((p) => 27 >= p.decadal.from && 27 <= p.decadal.to)!;
    expect(v.decade).toEqual({ palaceKey: decade.key, from: decade.decadal.from, to: decade.decadal.to });
    expect(palaceAt(s, v.yearPalaceKey!).branch).toBe('Ngọ');
    // Bính: Lộc Thiên Đồng, Quyền Thiên Cơ, Khoa Văn Xương, Kỵ Liêm Trinh.
    expect(v.yearMutagens.map((h) => h.starKey)).toEqual(['thien_dong', 'thien_co', 'van_xuong', 'liem_trinh']);
    for (const h of v.yearMutagens) {
      const p = palaceAt(s, h.palaceKey!);
      expect([...p.majorStars, ...p.minorStars].map((x) => x.key)).toContain(h.starKey);
      expect(v.facts).toContain(`year:2026|palace:${h.palaceKey}|hoa:${h.mutagen}`);
    }
  });

  it('Nam phái có tiểu hạn; Bắc phái có Tứ hóa theo can đại vận, không có tiểu hạn', () => {
    const nam = getYearView(chart({}, 'nam'), 2026, 'male');
    expect(nam.smallLimitPalaceKey).toBeDefined();
    expect(nam.decade?.mutagens).toBeUndefined();
    const bac = getYearView(chart({}, 'bac'), 2026, 'male');
    expect(bac.smallLimitPalaceKey).toBeUndefined();
    expect(bac.decade?.mutagens?.map((h) => h.mutagen)).toEqual(MUTAGENS);
    expect(bac.facts.filter((f) => f.startsWith('decade:'))).toHaveLength(4);
  });

  it('tiểu hạn: năm Thìn khởi ở Tuất, nam thuận, nữ nghịch', () => {
    expect(smallLimitBranch(4, 'male', 1)).toBe(10);
    expect(smallLimitBranch(4, 'male', 2)).toBe(11);
    expect(smallLimitBranch(4, 'female', 2)).toBe(9);
    expect(smallLimitBranch(4, 'male', 13)).toBe(10);
  });

  it('thiếu giờ sinh hoặc năm trước khi sinh thì không có cung', () => {
    const noTime = getYearView(chart({ time: undefined, timeCertainty: 'unknown' }), 2026, 'male');
    expect(noTime).toEqual({ lunarYear: 2026, canChi: 'Bính Ngọ', ageLunar: 27, yearMutagens: [], facts: [] });
    expect(getYearView(chart({}), 1990, 'male').decade).toBeUndefined();
  });
});
