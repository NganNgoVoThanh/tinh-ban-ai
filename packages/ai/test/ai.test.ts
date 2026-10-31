import { computeChart } from '@tinhban/chart-engine';
import type { KnowledgeBundle, KnowledgeRule } from '@tinhban/kb';
import { describe, expect, it } from 'vitest';
import {
  answerWithAI,
  branchFact,
  budgetAlerts,
  DEFAULT_POLICY,
  FakeProvider,
  MemoryStore,
  needsTurnstile,
  outOfScope,
  readUsage,
  recordAsk,
  recordSpend,
  retrieveRules,
  scrubPii,
  validateAnswer,
  vnDay,
  type AiProvider,
  type UsageSnapshot,
} from '../src/index.ts';

// 16/8/2000 giờ Dần, nam: Mệnh ở Ngọ có Tử Vi miếu; Quan Lộc ở Tuất có Liêm Trinh, Thiên Phủ.
const s = computeChart({ calendar: 'solar', date: '2000-08-16', time: '03:30', timeCertainty: 'exact', region: 'north', gender: 'male' }, 'nam', undefined, {
  now: new Date(0),
});
const factsOf = (keys: string[]) =>
  s.palaces!.filter((p) => keys.includes(p.key)).flatMap((p) => [branchFact(p.key, p.branch), ...s.facts.filter((f) => f.startsWith(`palace:${p.key}|`))]);
const FACTS = factsOf(['menh', 'quan_loc', 'tai_bach', 'thien_di']);

const rule = (id: string, patch: Partial<KnowledgeRule> = {}): KnowledgeRule => ({
  ruleId: id,
  version: 1,
  kind: 'interpretation',
  topic: 'career',
  conditions: { palace: 'menh', has_star: 'tu_vi' },
  headline: `Câu ${id}`,
  because: '{palace} có {star} {state}',
  detail: 'd',
  citations: [],
  review: { level: 'L1', by: 't', date: '2026-10-30', sourcesChecked: 2 },
  priority: 50,
  ...patch,
});
const KB: KnowledgeBundle = {
  version: '0.1.0',
  hash: 'h',
  builtAt: '',
  sources: [],
  rules: [
    rule('TV.A.001'),
    rule('TV.B.001', { conditions: { palace: 'quan_loc', has_star: 'liem_trinh' } }),
    rule('TV.C.001', { conditions: { palace: 'menh', has_star: 'liem_trinh', scope: 'tam_phuong' }, topic: 'personality' }),
    rule('FOLK.X.001', { kind: 'folk', conditions: { palace: 'menh', has_star: 'tu_vi' }, topic: 'folk' }),
  ],
};

describe('cổng vào', () => {
  it('nhận ra câu ngoài phạm vi', () => {
    expect(outOfScope('Tôi có nên mua cổ phiếu tháng này?')).toBe('investment');
    expect(outOfScope('Bệnh dạ dày của tôi có khỏi không?')).toBe('health');
    expect(outOfScope('Năm nay công việc của tôi thế nào?')).toBeNull();
  });

  it('xóa số điện thoại, email, link, dãy số dài', () => {
    const r = scrubPii('Gọi 0912 345 678 hoặc mail minh@vd.vn, xem https://x.y/z, CCCD 001234567890');
    expect(r.text).toBe('Gọi [số điện thoại] hoặc mail [email], xem [link], CCCD [số]');
    expect(r.removed).toHaveLength(4);
  });
});

describe('truy xuất phía server từ fact tối thiểu', () => {
  it('dựng lại cung từ fact, xét được cả tam phương tứ chính', () => {
    const { matches } = retrieveRules(FACTS, 'nam', KB, 'career');
    expect(matches.map((m) => m.rule.ruleId)).toEqual(['TV.A.001', 'TV.B.001']);
    const all = retrieveRules(FACTS, 'nam', KB).matches.map((m) => m.rule.ruleId);
    expect(all).toContain('TV.C.001');
  });
});

describe('validator', () => {
  const rules = KB.rules.slice(0, 2);
  const ok = (patch: object = {}) => ({
    sentences: [
      { text: 'Mệnh có Tử Vi, bạn có xu hướng tự chủ.', rule_ids: ['TV.A.001'], fact_ids: ['palace:menh|star:tu_vi|state:mieu'], label: 'interpretation' },
      { text: 'Quan Lộc có Liêm Trinh, hợp việc cần kỷ luật.', rule_ids: ['TV.B.001'], fact_ids: [], label: 'interpretation' },
    ],
    followups: [],
    out_of_scope: false,
    ...patch,
  });

  it('câu trả lời đúng thì qua', () => {
    expect(validateAnswer(ok(), FACTS, rules, 'nam')).toMatchObject({ passed: true, errors: [] });
  });

  it('trượt: sai schema, khẳng định quá mạnh, bịa sao, sai nhãn, nhắc lại thông tin cá nhân', () => {
    expect(validateAnswer({ x: 1 }, FACTS, rules, 'nam').passed).toBe(false);
    const strong = ok();
    strong.sentences[0]!.text = 'Năm nay chắc chắn thăng chức.';
    expect(validateAnswer(strong, FACTS, rules, 'nam').errors.join()).toMatch(/khẳng định/);
    const invented = ok();
    invented.sentences[0]!.text = 'Mệnh có Thất Sát nên nóng tính.';
    expect(validateAnswer(invented, FACTS, rules, 'nam').errors.join()).toMatch(/Thất Sát không có trong lá số/);
    const pii = ok();
    pii.sentences[0]!.text = 'Số 0912345678 của bạn đẹp.';
    expect(validateAnswer(pii, FACTS, rules, 'nam', ['0912345678']).errors.join()).toMatch(/riêng tư/);
    const label = ok();
    label.sentences[1]!.label = 'folk';
    expect(validateAnswer(label, FACTS, rules, 'nam').errors.join()).toMatch(/nhãn/);
  });

  it('câu không có căn cứ bị cắt; còn dưới 2 câu thì trượt', () => {
    const one = ok();
    one.sentences[1]!.rule_ids = ['TV.KHONG.CO'];
    const r = validateAnswer(one, FACTS, rules, 'nam');
    expect(r.sentences).toHaveLength(1);
    expect(r.passed).toBe(false);
  });

  it('đơn vị không thuộc phái của hồ sơ', () => {
    const bacOnly = [rule('TV.A.001', { schools: ['bac'] }), rules[1]!];
    expect(validateAnswer(ok(), FACTS, bacOnly, 'nam').errors.join()).toMatch(/phái/);
  });
});

describe('luồng trả lời', () => {
  const ctx = { question: 'Công việc của tôi thế nào?', pii: [], questionType: 'career', schoolId: 'nam' as const, facts: FACTS };

  it('AI giả lập trả lời đúng; lần sau cùng loại câu hỏi lấy từ cache', async () => {
    const store = new MemoryStore();
    const first = await answerWithAI(ctx, { kb: KB, provider: new FakeProvider(), store });
    expect(first).toMatchObject({ source: 'llm_small', validator: { passed: true } });
    expect(first.sentences.map((x) => x.rule_ids[0])).toEqual(['TV.A.001', 'TV.B.001']);
    const second = await answerWithAI(ctx, { kb: KB, provider: new FakeProvider(), store });
    expect(second.source).toBe('cache');
  });

  it('AI tắt hoặc hết ngân sách: trả lời bằng kho, không lỗi', async () => {
    const r = await answerWithAI(ctx, { kb: KB, provider: null, store: new MemoryStore() });
    expect(r.source).toBe('fallback');
    expect(r.sentences[0]!.text).toBe('Câu TV.A.001 Mệnh có Tử Vi Miếu.');
  });

  it('model nhỏ trượt hai lần thì gọi model mạnh; trượt nữa thì lùi về kho', async () => {
    const calls: string[] = [];
    const bad: AiProvider = {
      name: 'bad',
      complete: async (req) => {
        calls.push(req.tier);
        return { json: { sentences: [{ text: 'x', rule_ids: [], fact_ids: [], label: 'interpretation' }], followups: [], out_of_scope: false }, modelId: req.tier, tokensIn: 10, tokensOut: 5, costUsd: 0.001, refused: false };
      },
    };
    const r = await answerWithAI(ctx, { kb: KB, provider: bad, store: new MemoryStore() });
    expect(calls).toEqual(['small', 'small', 'strong']);
    expect(r.source).toBe('fallback');
    expect(r.costUsd).toBeCloseTo(0.003);
  });

  it('kho chưa đủ nguồn thì không gọi AI', async () => {
    const calls: string[] = [];
    const spy: AiProvider = { name: 'spy', complete: async (req) => (calls.push(req.tier), new FakeProvider().complete(req)) };
    await answerWithAI({ ...ctx, facts: factsOf(['phu_mau']) }, { kb: KB, provider: spy, store: new MemoryStore() });
    expect(calls).toEqual([]);
  });
});

describe('hạn mức, ngân sách, Turnstile', () => {
  const usage = (patch: Partial<UsageSnapshot> = {}): UsageSnapshot => ({ quotaUsed: 1, ipLastHour: 0, limitHitLastHour: false, spentDay: 0, spentMonth: 0, aiEnabled: true, ...patch });

  it('ngày tính theo giờ Việt Nam', () => {
    expect(vnDay(new Date('2026-10-30T16:59:00Z'))).toBe('20261030');
    expect(vnDay(new Date('2026-10-30T17:00:00Z'))).toBe('20261031');
  });

  it('đếm lượt và chi phí; công tắc tắt AI', async () => {
    const store = new MemoryStore();
    const now = new Date('2026-10-30T03:00:00Z');
    expect(await recordAsk(store, 'inst-1', '1.2.3.4', now)).toBe(1);
    expect(await recordAsk(store, 'inst-1', '1.2.3.4', now)).toBe(2);
    await recordSpend(store, 0.25, now);
    const u = await readUsage(store, 'inst-1', '1.2.3.4', now, true);
    expect(u).toMatchObject({ quotaUsed: 2, ipLastHour: 2, spentDay: 0.25, spentMonth: 0.25, aiEnabled: true });
    await store.set('ai:enabled', 'false');
    expect((await readUsage(store, 'inst-1', '1.2.3.4', now, true)).aiEnabled).toBe(false);
  });

  it('Turnstile theo tiêu chí', () => {
    expect(needsTurnstile(usage({ quotaUsed: 0 }), 2, DEFAULT_POLICY)).toBe(true);
    expect(needsTurnstile(usage(), 2, DEFAULT_POLICY)).toBe(false);
    expect(needsTurnstile(usage({ ipLastHour: 20 }), 100, DEFAULT_POLICY)).toBe(true);
    expect(needsTurnstile(usage({ limitHitLastHour: true }), 100, DEFAULT_POLICY)).toBe(true);
    expect(needsTurnstile(usage({ spentDay: 1.7 }), 100, DEFAULT_POLICY)).toBe(true);
  });

  it('cảnh báo ngân sách ở 50%, 80%, 100%', () => {
    expect(budgetAlerts(14, 16, 30)).toEqual([0.5]);
    expect(budgetAlerts(23, 31, 30)).toEqual([0.8, 1]);
    expect(budgetAlerts(1, 2, 30)).toEqual([]);
  });
});
