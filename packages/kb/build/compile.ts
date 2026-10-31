/**
 * Bộ biên dịch kho (Technical Plan mục 7): kiểm schema, từ điển, test từng đơn vị, mâu thuẫn,
 * nội dung; xuất bundle. Hàm thuần: đọc file và lập lá số do cli.ts làm.
 */
import { createHash } from 'node:crypto';
import type { ChartSnapshot, SchoolId } from '@tinhban/shared';
import { atomsOf, evaluate } from '../src/conditions.ts';
import { bannedPhrasesIn, LIMITS } from '../src/content-rules.ts';
import { PALACES, STARS } from '../src/dictionary.ts';
import { templateErrors } from '../src/template.ts';
import type { KnowledgeBundle, KnowledgeRule, Source } from '../src/types.ts';
import { metaSchema, sourcesSchema, unitSchema, type UnitYaml } from './schema.ts';

export interface CompileInput {
  meta: unknown;
  sources: unknown;
  units: { file: string; data: unknown }[];
}

export interface CompileOptions {
  /** Lá số của một ca golden theo phái, để chạy tests.positive/negative. */
  snapshotOf?: (caseId: string, school: SchoolId) => ChartSnapshot | undefined;
  now: Date;
}

export interface CompileResult {
  errors: string[];
  warnings: string[];
  /** Mọi đơn vị (kể cả L0), dùng nội bộ. */
  all?: KnowledgeBundle;
  /** Chỉ đơn vị từ L1, dùng cho bản phát hành. */
  release?: KnowledgeBundle;
}

const HOA_KEYS = new Set(['hoa_loc', 'hoa_quyen', 'hoa_khoa', 'hoa_ky']);
const SCHOOLS: SchoolId[] = ['nam', 'bac'];

function toRule(u: UnitYaml): KnowledgeRule {
  return {
    ruleId: u.rule_id,
    ...(u.schools?.length ? { schools: u.schools } : {}),
    version: u.version,
    kind: u.kind,
    topic: u.topic,
    conditions: u.conditions,
    ...(u.exclusions?.length ? { exclusions: u.exclusions } : {}),
    headline: u.headline.trim(),
    because: u.because.trim(),
    detail: u.detail.trim(),
    citations: u.citations.map((c) => ({ sourceId: c.source_id, ...(c.edition && { edition: c.edition }), ...(c.page !== undefined && { page: c.page }) })),
    review: { level: u.review.level, by: u.review.by, date: u.review.date, sourcesChecked: u.review.sources_checked },
    priority: u.priority,
    ...(u.public !== undefined && { public: u.public }),
    ...(u.tests && { tests: u.tests }),
  };
}

/** Khóa so sánh điều kiện: cùng điều kiện, cùng loại trừ (thứ tự khóa không quan trọng). */
const canonical = (v: unknown): string =>
  JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x));

function bundle(version: string, sources: Source[], rules: KnowledgeRule[], now: Date): KnowledgeBundle {
  const sorted = [...rules].sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  const hash = createHash('sha256').update(JSON.stringify({ version, sources, rules: sorted })).digest('hex').slice(0, 16);
  return { version, hash, builtAt: now.toISOString(), sources, rules: sorted };
}

export function compile(input: CompileInput, opts: CompileOptions): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const meta = metaSchema.safeParse(input.meta);
  if (!meta.success) errors.push(`kb.yaml: ${meta.error.issues.map((i) => i.message).join('; ')}`);
  const src = sourcesSchema.safeParse(input.sources);
  if (!src.success) errors.push(`sources.yaml: ${src.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  const sources: Source[] = src.success
    ? src.data.sources.map((s) => ({ sourceId: s.source_id, title: s.title, ...(s.author && { author: s.author }), ...(s.school && { school: s.school }) }))
    : [];
  const sourceIds = new Set(sources.map((s) => s.sourceId));

  const rules: KnowledgeRule[] = [];
  const seen = new Map<string, string>();
  for (const { file, data } of input.units) {
    const parsed = unitSchema.safeParse(data);
    if (!parsed.success) {
      errors.push(`${file}: ${parsed.error.issues.map((i) => `${i.path.join('.') || '(gốc)'}: ${i.message}`).join('; ')}`);
      continue;
    }
    const rule = toRule(parsed.data);
    const at = `${file} (${rule.ruleId})`;
    const err = (m: string) => errors.push(`${at}: ${m}`);

    // 1. rule_id không trùng, citation có trong sources.yaml.
    if (seen.has(rule.ruleId)) err(`rule_id trùng với ${seen.get(rule.ruleId)}`);
    seen.set(rule.ruleId, file);
    for (const c of rule.citations) if (!sourceIds.has(c.sourceId)) err(`nguồn ${c.sourceId} không có trong sources.yaml`);

    // 2. Điều kiện chỉ dùng sao, cung có trong từ điển.
    for (const a of [...atomsOf(rule.conditions), ...(rule.exclusions ?? []).flatMap(atomsOf)]) {
      if ('palace' in a && !(a.palace in PALACES)) err(`cung lạ trong điều kiện: ${a.palace}`);
      if ('has_star' in a && !(a.has_star in STARS) && !HOA_KEYS.has(a.has_star)) err(`sao lạ trong điều kiện: ${a.has_star}`);
      if ('star' in a && !(a.star in STARS)) err(`sao lạ trong điều kiện: ${a.star}`);
    }

    // 5. Nội dung: cụm từ bị cấm, độ dài, chỗ trống, mức kiểm định.
    for (const field of ['headline', 'because', 'detail'] as const) {
      const text = rule[field];
      for (const p of bannedPhrasesIn(text)) err(`${field} có cụm từ bị cấm: "${p}"`);
      if (text.length > LIMITS[field]) err(`${field} dài ${text.length} ký tự (tối đa ${LIMITS[field]})`);
    }
    for (const e of [...templateErrors(rule.because, rule.conditions), ...templateErrors(rule.headline, rule.conditions)]) err(e);
    if (rule.review.level !== 'L0') {
      if (rule.citations.length === 0) err(`mức ${rule.review.level} cần ít nhất một nguồn`);
      if (rule.review.sourcesChecked < 2) err(`mức ${rule.review.level} cần đối chiếu ít nhất 2 nguồn`);
    }
    if (rule.public && rule.review.level === 'L0') err('đơn vị L0 không được public');
    if (rule.kind === 'folk' && rule.schools?.length) err('đơn vị dân gian không thuộc phái nào');

    // 3. Test từng đơn vị trên bộ ca chuẩn.
    if (rule.tests && opts.snapshotOf) {
      for (const school of rule.schools?.length ? rule.schools : SCHOOLS) {
        const matches = (caseId: string) => {
          const s = opts.snapshotOf!(caseId, school);
          if (!s) {
            err(`không có ca ${caseId}`);
            return undefined;
          }
          return evaluate(s, rule.conditions) !== null && !(rule.exclusions ?? []).some((x) => evaluate(s, x) !== null);
        };
        for (const c of rule.tests.positive) if (matches(c) === false) err(`${c} phải khớp (${school}) nhưng không khớp`);
        for (const c of rule.tests.negative) if (matches(c) === true) err(`${c} không được khớp (${school}) nhưng lại khớp`);
      }
    } else if (rule.review.level !== 'L0') {
      warnings.push(`${at}: chưa có tests.positive/negative`);
    }
    rules.push(rule);
  }

  // 4. Hai đơn vị cùng điều kiện, cùng phái, cùng chủ đề: phải gộp lại thành một.
  const groups = new Map<string, KnowledgeRule[]>();
  for (const r of rules) {
    const key = canonical([r.topic, r.conditions, r.exclusions ?? []]);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!;
        const b = group[j]!;
        const overlap = (a.schools ?? SCHOOLS).some((s) => (b.schools ?? SCHOOLS).includes(s));
        if (overlap) errors.push(`${a.ruleId} và ${b.ruleId}: cùng điều kiện, cùng phái, cùng chủ đề; gộp thành một đơn vị`);
      }
    }
  }

  if (errors.length || !meta.success) return { errors, warnings };
  const version = meta.data.kb_version;
  return {
    errors,
    warnings,
    all: bundle(version, sources, rules, opts.now),
    release: bundle(version, sources, rules.filter((r) => r.review.level !== 'L0'), opts.now),
  };
}
