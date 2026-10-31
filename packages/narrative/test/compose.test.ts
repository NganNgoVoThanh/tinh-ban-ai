import { computeChart } from '@tinhban/chart-engine';
import type { KnowledgeBundle, KnowledgeRule } from '@tinhban/kb';
import type { SchoolId } from '@tinhban/shared';
import { describe, expect, it } from 'vitest';
import { answerSuggested, palaceInsights, suggestedQuestions } from '../src/index.ts';

// 16/8/2000 giờ Dần, nam: Mệnh ở Ngọ có Tử Vi miếu; Quan Lộc có Liêm Trinh, Thiên Phủ.
const chart = (school: SchoolId = 'nam') =>
  computeChart({ calendar: 'solar', date: '2000-08-16', time: '03:30', timeCertainty: 'exact', region: 'north', gender: 'male' }, school, undefined, {
    now: new Date(0),
  });

const rule = (patch: Partial<KnowledgeRule>): KnowledgeRule => ({
  ruleId: 'TV.MENH.TU_VI.MIEU.001',
  version: 1,
  kind: 'interpretation',
  topic: 'personality',
  conditions: { all: [{ palace: 'menh', has_star: 'tu_vi' }, { star: 'tu_vi', state_in: ['mieu'] }] },
  headline: 'Câu mẫu về {palace}',
  because: '{palace} có {star} {state}',
  detail: 'Đoạn mẫu.',
  citations: [{ sourceId: 'SRC-A', page: 12 }],
  review: { level: 'L1', by: 't', date: '2026-10-30', sourcesChecked: 2 },
  priority: 50,
  ...patch,
});

const kb = (rules: KnowledgeRule[]): KnowledgeBundle => ({
  version: '0.0.1',
  hash: 'x',
  builtAt: '',
  sources: [{ sourceId: 'SRC-A', title: 'Sách mẫu' }],
  rules,
});

describe('giải thích 3 tầng', () => {
  it('ghép tầng 1, tầng 2 có fact thật, tầng 3 có nguồn; nhãn Chưa qua chuyên gia cho L1', () => {
    const [insight] = palaceInsights(chart(), kb([rule({})]), 'menh');
    expect(insight).toEqual({
      ruleId: 'TV.MENH.TU_VI.MIEU.001',
      label: 'interpretation',
      headline: 'Câu mẫu về Mệnh',
      because: 'Mệnh có Tử Vi Miếu',
      facts: ['palace:menh|star:tu_vi|state:mieu'],
      detail: 'Đoạn mẫu.',
      citations: [{ title: 'Sách mẫu', page: 12 }],
      subLabels: ['Chưa qua chuyên gia'],
    });
  });

  it('tối đa 3 nhận định mỗi cung, theo priority; nhãn phái khi đơn vị chỉ thuộc một phái', () => {
    const rules = [10, 90, 50, 70].map((p, i) => rule({ ruleId: `TV.MENH.X.${i}`, priority: p, topic: `t${i}` }));
    rules.push(rule({ ruleId: 'TV.MENH.BAC.001', priority: 100, schools: ['bac'], topic: 'tb' }));
    expect(palaceInsights(chart('nam'), kb(rules), 'menh').map((x) => x.ruleId)).toEqual(['TV.MENH.X.1', 'TV.MENH.X.3', 'TV.MENH.X.2']);
    const bac = palaceInsights(chart('bac'), kb(rules), 'menh');
    expect(bac[0]).toMatchObject({ ruleId: 'TV.MENH.BAC.001', subLabels: ['Chưa qua chuyên gia', 'Bắc phái'] });
  });

  it('câu hỏi gợi ý chỉ hiện khi kho trả lời được, và trả lời ngay từ kho', () => {
    expect(suggestedQuestions(chart(), kb([]), 'menh')).toEqual([]);
    const qs = suggestedQuestions(chart(), kb([rule({})]), 'menh');
    expect(qs).toEqual([{ questionType: 'personality', palaceKey: 'menh', text: 'Tính cách nổi bật của tôi là gì?' }]);
    expect(answerSuggested(chart(), kb([rule({})]), qs[0]!).map((x) => x.because)).toEqual(['Mệnh có Tử Vi Miếu']);
    expect(suggestedQuestions(chart(), kb([rule({})]), 'tat_ach')).toEqual([]);
  });
});
