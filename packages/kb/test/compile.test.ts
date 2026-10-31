import { readdirSync, readFileSync } from 'node:fs';
import { computeChart } from '@tinhban/chart-engine';
import type { SchoolId } from '@tinhban/shared';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { compile, type CompileInput } from '../build/compile.ts';

const fixture = (name: string) => parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const units = () =>
  readdirSync(new URL('./fixtures/units/', import.meta.url)).map((f) => ({ file: f, data: fixture(`units/${f}`) as Record<string, unknown> }));

const CASES = {
  // Mệnh có Tử Vi miếu.
  'case-mau': { calendar: 'solar', date: '2000-08-16', time: '03:30', timeCertainty: 'exact', region: 'north', gender: 'male' },
  // Mệnh có Thiên Cơ, Thái Âm.
  'case-khac': { calendar: 'solar', date: '1987-03-02', time: '17:10', timeCertainty: 'exact', region: 'north', gender: 'female' },
} as const;
const snapshotOf = (caseId: string, school: SchoolId) => {
  const input = CASES[caseId.replace('golden/', '') as keyof typeof CASES];
  return input ? computeChart(input, school, undefined, { now: new Date(0) }) : undefined;
};
const run = (input: Partial<CompileInput> = {}) =>
  compile({ meta: fixture('kb.yaml'), sources: fixture('sources.yaml'), units: units(), ...input }, { snapshotOf, now: new Date(0) });

describe('kb build', () => {
  it('biên dịch bộ mẫu; bản phát hành bỏ đơn vị L0', () => {
    const r = run();
    expect(r.errors).toEqual([]);
    expect(r.all!.rules.map((x) => x.ruleId)).toEqual(['TV.MENH.TU_VI.MIEU.001', 'TV.MENH.VCD.001']);
    expect(r.release!.rules.map((x) => x.ruleId)).toEqual(['TV.MENH.TU_VI.MIEU.001']);
    expect(r.release!.rules[0]).toMatchObject({ citations: [{ sourceId: 'FIXTURE-A', page: 1 }], review: { sourcesChecked: 2 } });
    expect(r.release!.hash).toMatch(/^[0-9a-f]{16}$/);
    expect(run().release!.hash).toBe(r.release!.hash);
  });

  const broken = (patch: Record<string, unknown>) => {
    const [first, ...rest] = units();
    return run({ units: [{ file: 'x.yaml', data: { ...first!.data, ...patch } }, ...rest] }).errors.join('\n');
  };

  it('báo lỗi schema, nguồn lạ, sao lạ, cụm từ bị cấm, độ dài, chỗ trống', () => {
    expect(broken({ rule_id: 'sai' })).toMatch(/rule_id/);
    expect(broken({ citations: [{ source_id: 'KHONG-CO' }] })).toMatch(/KHONG-CO không có trong sources.yaml/);
    expect(broken({ conditions: { palace: 'menh', has_star: 'sao_la' } })).toMatch(/sao lạ trong điều kiện: sao_la/);
    expect(broken({ headline: 'Năm nay chắc chắn phát tài' })).toMatch(/cụm từ bị cấm: "chắc chắn"/);
    expect(broken({ headline: 'x'.repeat(200) })).toMatch(/headline dài 200/);
    expect(broken({ because: '{palace} có {sao}' })).toMatch(/chỗ trống không hiểu/);
  });

  it('mức L1 cần nguồn và đối chiếu 2 nguồn; L0 không được public', () => {
    expect(broken({ review: { level: 'L1', by: 't', date: '2026-10-30', sources_checked: 1 } })).toMatch(/ít nhất 2 nguồn/);
    expect(broken({ citations: [] })).toMatch(/ít nhất một nguồn/);
    expect(broken({ review: { level: 'L0', by: 't', date: '2026-10-30', sources_checked: 0 }, public: true })).toMatch(/L0 không được public/);
  });

  it('chạy test từng đơn vị trên ca chuẩn', () => {
    expect(broken({ tests: { positive: ['golden/case-khac'], negative: [] } })).toMatch(/case-khac phải khớp/);
    expect(broken({ tests: { positive: [], negative: ['golden/case-mau'] } })).toMatch(/case-mau không được khớp/);
  });

  it('báo trùng rule_id và hai đơn vị cùng điều kiện, cùng phái, cùng chủ đề', () => {
    const [first] = units();
    const dup = { file: 'dup.yaml', data: { ...first!.data } };
    expect(run({ units: [...units(), dup] }).errors.join('\n')).toMatch(/rule_id trùng/);
    const same = { file: 'same.yaml', data: { ...first!.data, rule_id: 'TV.MENH.TU_VI.MIEU.002' } };
    expect(run({ units: [...units(), same] }).errors.join('\n')).toMatch(/cùng điều kiện, cùng phái, cùng chủ đề/);
  });
});
