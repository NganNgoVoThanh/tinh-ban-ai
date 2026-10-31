import { computeChart } from '@tinhban/chart-engine';
import type { BirthInput, SchoolId } from '@tinhban/shared';
import { describe, expect, it } from 'vitest';
import { describeFact, evaluate, getApplicableRules, renderTemplate, rulesForPalace, templateErrors, type KnowledgeRule } from '../src/index.ts';

const NOW = { now: new Date(0) };
const input = (patch: Partial<BirthInput> = {}): BirthInput => ({
  calendar: 'solar', date: '2000-08-16', time: '03:30', timeCertainty: 'exact', region: 'north', gender: 'male', ...patch,
});
// 16/8/2000 giờ Dần, nam: Mệnh ở Ngọ có Tử Vi miếu; Quan Lộc ở Tuất có Liêm Trinh, Thiên Phủ; Tài Bạch có Vũ Khúc Hóa Quyền.
const chart = (school: SchoolId = 'nam') => computeChart(input(), school, undefined, NOW);

const rule = (patch: Partial<KnowledgeRule>): KnowledgeRule => ({
  ruleId: 'TV.TEST.001',
  version: 1,
  kind: 'interpretation',
  topic: 'career',
  conditions: { palace: 'menh', has_star: 'tu_vi' },
  headline: 'h',
  because: 'b',
  detail: 'd',
  citations: [],
  review: { level: 'L1', by: 't', date: '2026-10-30', sourcesChecked: 2 },
  priority: 50,
  ...patch,
});

describe('bộ xét điều kiện', () => {
  const s = chart();

  it('sao trong cung, độ sáng, hóa, trả về fact khớp', () => {
    expect(evaluate(s, { palace: 'menh', has_star: 'tu_vi' })).toEqual(['palace:menh|star:tu_vi|state:mieu']);
    expect(evaluate(s, { star: 'tu_vi', state_in: ['mieu', 'vuong'] })).toEqual(['palace:menh|star:tu_vi|state:mieu']);
    expect(evaluate(s, { star: 'tu_vi', state_in: ['ham'] })).toBeNull();
    expect(evaluate(s, { star: 'vu_khuc', hoa: 'quyen' })).toEqual(['palace:tai_bach|star:vu_khuc|hoa:quyen']);
    expect(evaluate(s, { palace: 'tai_bach', has_star: 'hoa_quyen' })).toEqual(['palace:tai_bach|star:vu_khuc|hoa:quyen']);
    expect(evaluate(s, { palace: 'menh', no_major: true })).toBeNull();
    expect(evaluate(s, { palace: 'quan_loc', is_body: true })).toEqual(['core:than|palace:quan_loc']);
  });

  it('tam phương tứ chính của Mệnh gồm Quan Lộc, Tài Bạch, Thiên Di', () => {
    expect(evaluate(s, { palace: 'menh', has_star: 'liem_trinh' })).toBeNull();
    expect(evaluate(s, { palace: 'menh', has_star: 'liem_trinh', scope: 'tam_phuong' })).toEqual(['palace:quan_loc|star:liem_trinh|state:mieu']);
  });

  it('all, any, not', () => {
    expect(evaluate(s, { all: [{ palace: 'menh', has_star: 'tu_vi' }, { not: { palace: 'menh', no_major: true } }] })).toEqual(['palace:menh|star:tu_vi|state:mieu']);
    expect(evaluate(s, { any: [{ palace: 'menh', has_star: 'tham_lang' }, { palace: 'menh', has_star: 'tu_vi' }] })).toHaveLength(1);
    expect(evaluate(s, { all: [{ palace: 'menh', has_star: 'tu_vi' }, { palace: 'menh', has_star: 'tham_lang' }] })).toBeNull();
  });

  it('thiếu giờ sinh thì không đơn vị nào khớp', () => {
    expect(evaluate(computeChart(input({ time: undefined, timeCertainty: 'unknown' }), 'nam', undefined, NOW), { star: 'tu_vi', state_in: ['mieu'] })).toBeNull();
  });
});

describe('getApplicableRules', () => {
  it('lọc theo phái, loại theo exclusions, xếp theo priority', () => {
    const kb = {
      rules: [
        rule({ ruleId: 'A', priority: 10 }),
        rule({ ruleId: 'B', priority: 90 }),
        rule({ ruleId: 'C', schools: ['bac'] }),
        rule({ ruleId: 'D', exclusions: [{ star: 'tu_vi', state_in: ['mieu'] }] }),
        rule({ ruleId: 'E', topic: 'love' }),
      ],
    };
    expect(getApplicableRules(chart('nam'), kb).map((m) => m.rule.ruleId)).toEqual(['B', 'E', 'A']);
    expect(getApplicableRules(chart('bac'), kb).map((m) => m.rule.ruleId)).toEqual(['B', 'C', 'E', 'A']);
    expect(getApplicableRules(chart('nam'), kb, 'love').map((m) => m.rule.ruleId)).toEqual(['E']);
  });

  it('đơn vị thuộc về cung nhắc trong điều kiện, kể cả khi xét tam phương', () => {
    const kb = { rules: [rule({ ruleId: 'TP', conditions: { palace: 'menh', has_star: 'liem_trinh', scope: 'tam_phuong' } })] };
    const matches = getApplicableRules(chart(), kb);
    expect(rulesForPalace(matches, 'menh')).toHaveLength(1);
    expect(rulesForPalace(matches, 'quan_loc')).toHaveLength(0);
  });
});

describe('câu tầng 2', () => {
  const cond = { all: [{ palace: 'menh', has_star: 'tu_vi' }, { star: 'tu_vi', state_in: ['mieu' as const] }] };

  it('chèn tên cung, sao, độ sáng, hóa của lá số', () => {
    expect(renderTemplate('{palace} có {star} {state}', cond, chart())).toBe('Mệnh có Tử Vi Miếu');
    expect(renderTemplate('{palace:tai_bach} có {star:vu_khuc} {hoa:vu_khuc}, cung {branch:tai_bach}', cond, chart())).toBe('Tài Bạch có Vũ Khúc Hóa Quyền, cung Dần');
  });

  it('báo chỗ trống không dùng được', () => {
    expect(templateErrors('{palace} có {star}', cond)).toEqual([]);
    expect(templateErrors('{star}', { palace: 'menh', no_major: true })).toHaveLength(1);
    expect(templateErrors('{star:khong_co}', cond)).toEqual(['sao lạ: khong_co']);
    expect(templateErrors('{sao}', cond)).toEqual(['chỗ trống không hiểu: {sao}']);
  });
});

describe('đọc fact thành chữ', () => {
  it('sao, độ sáng, hóa, vô chính diệu, cung Thân', () => {
    expect(describeFact('palace:menh|star:tu_vi|state:mieu')).toBe('Mệnh: Tử Vi (Miếu)');
    expect(describeFact('palace:tai_bach|star:vu_khuc|hoa:quyen')).toBe('Tài Bạch: Vũ Khúc Hóa Quyền');
    expect(describeFact('palace:phu_mau|vo_chinh_dieu')).toBe('Phụ Mẫu: Vô chính diệu');
    expect(describeFact('core:than|palace:quan_loc')).toBe('Thân cư Quan Lộc');
    expect(describeFact('palace:menh|star:thien_dieu')).toBe('Mệnh: Thiên Riêu');
    expect(describeFact('year:2026|palace:quan_loc|hoa:loc')).toBe('Năm 2026: Hóa Lộc vào Quan Lộc');
    expect(describeFact('decade:33|palace:menh|hoa:ky')).toBe('Đại vận từ 33 tuổi: Hóa Kỵ vào Mệnh');
  });
});
