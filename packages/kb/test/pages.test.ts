import { describe, expect, it } from 'vitest';
import { publicPages, renderGeneric, toSlug, type KnowledgeRule } from '../src/index.ts';

const rule = (ruleId: string, patch: Partial<KnowledgeRule> = {}): KnowledgeRule => ({
  ruleId,
  version: 1,
  kind: 'interpretation',
  topic: 'career',
  conditions: { all: [{ palace: 'quan_loc', has_star: 'thai_duong' }, { star: 'thai_duong', state_in: ['mieu', 'vuong'] }] },
  exclusions: [],
  headline: 'Câu tầng 1 về {palace}',
  because: '',
  detail: '',
  citations: [],
  review: { level: 'L1', by: 't', date: '2026-10-30', sourcesChecked: 2 },
  priority: 50,
  public: true,
  ...patch,
});

describe('trang tri thức công khai', () => {
  it('tiêu đề và slug suy ra từ sao, độ sáng, cung', () => {
    const [page] = publicPages({ rules: [rule('TV.QL.THAI_DUONG.MIEU.001')] });
    expect(page).toMatchObject({ title: 'Thái Dương miếu, vượng tại cung Quan Lộc', slug: 'thai-duong-mieu-vuong-tai-cung-quan-loc' });
  });

  it('chỉ đơn vị public từ L1; trùng slug thì thêm số theo thứ tự rule_id', () => {
    const pages = publicPages({
      rules: [
        rule('TV.B.001', { conditions: { palace: 'menh', has_star: 'thai_am' } }),
        rule('TV.A.001', { conditions: { all: [{ palace: 'menh', has_star: 'thai_am' }, { not: { palace: 'menh', has_star: 'hoa_ky' } }] } }),
        rule('TV.C.001', { public: false }),
        rule('TV.D.001', { review: { level: 'L0', by: 't', date: '2026-10-30', sourcesChecked: 0 } }),
        rule('TV.E.001', { conditions: { palace: 'phu_mau', no_major: true } }),
      ],
    });
    expect(pages.map((p) => [p.rule.ruleId, p.slug])).toEqual([
      ['TV.A.001', 'thai-am-tai-cung-menh'],
      ['TV.B.001', 'thai-am-tai-cung-menh-2'],
      ['TV.E.001', 'cung-phu-mau-vo-chinh-dieu'],
    ]);
  });

  it('bỏ dấu tiếng Việt, cả đ', () => {
    expect(toSlug('Địa Kiếp tại cung Điền Trạch')).toBe('dia-kiep-tai-cung-dien-trach');
  });

  it('điền câu không cần lá số: sao, cung, độ sáng theo điều kiện', () => {
    const r = rule('TV.X.001');
    expect(renderGeneric('{palace} có {star} {state}', r.conditions)).toBe('Quan Lộc có Thái Dương Miếu hoặc Vượng');
  });
});
