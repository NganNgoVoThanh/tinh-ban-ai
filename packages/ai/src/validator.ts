/**
 * Kiểm câu trả lời của AI bằng code, không gọi AI (Technical Plan mục 10). Câu không qua kiểm tra
 * căn cứ bị cắt; còn dưới 2 câu hợp lệ thì tính là trượt.
 */
import { appliesToSchool, bannedPhrasesIn, PALACES, STARS, type KnowledgeRule } from '@tinhban/kb';
import type { FactId, SchoolId } from '@tinhban/shared';

export interface AiSentence {
  text: string;
  rule_ids: string[];
  fact_ids: string[];
  label: 'fact' | 'interpretation' | 'folk' | 'suggestion';
}

export interface AiAnswer {
  sentences: AiSentence[];
  followups: string[];
  out_of_scope: boolean;
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  /** Các câu giữ lại sau khi cắt câu không có căn cứ. */
  sentences: AiSentence[];
}

const MAX_SENTENCES = 6;
const MAX_WORDS = 120;
const LABELS = new Set(['fact', 'interpretation', 'folk', 'suggestion']);

/** JSON Schema của câu trả lời, dùng cho structured outputs của nhà cung cấp. */
export const ANSWER_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sentences', 'followups', 'out_of_scope'],
  properties: {
    sentences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'rule_ids', 'fact_ids', 'label'],
        properties: {
          text: { type: 'string' },
          rule_ids: { type: 'array', items: { type: 'string' } },
          fact_ids: { type: 'array', items: { type: 'string' } },
          label: { type: 'string', enum: ['fact', 'interpretation', 'folk', 'suggestion'] },
        },
      },
    },
    followups: { type: 'array', items: { type: 'string' } },
    out_of_scope: { type: 'boolean' },
  },
} as const;

function isAnswer(x: unknown): x is AiAnswer {
  if (!x || typeof x !== 'object') return false;
  const a = x as AiAnswer;
  return (
    Array.isArray(a.sentences) &&
    a.sentences.every(
      (s) =>
        s &&
        typeof s.text === 'string' &&
        Array.isArray(s.rule_ids) &&
        s.rule_ids.every((r) => typeof r === 'string') &&
        Array.isArray(s.fact_ids) &&
        s.fact_ids.every((f) => typeof f === 'string') &&
        LABELS.has(s.label),
    ) &&
    Array.isArray(a.followups) &&
    a.followups.every((f) => typeof f === 'string') &&
    typeof a.out_of_scope === 'boolean'
  );
}

const fold = (s: string) => s.normalize('NFC').toLowerCase();

/** Tên sao, tên cung nhắc trong câu mà lá số (theo các fact đã gửi) không có. */
function inventedNames(text: string, facts: FactId[]): string[] {
  const t = fold(text);
  const keys = new Set(facts.flatMap((f) => f.split('|').map((p) => p.split(':')[1] ?? '')));
  const out: string[] = [];
  for (const [key, s] of Object.entries(STARS)) if (s.kind === 'major' && t.includes(fold(s.name)) && !keys.has(key)) out.push(s.name);
  for (const [key, name] of Object.entries(PALACES)) if (t.includes(fold(`cung ${name}`)) && !keys.has(key)) out.push(name);
  return out;
}

/**
 * Kiểm câu trả lời: định dạng, căn cứ, dữ kiện, khẳng định, nhãn, phái, riêng tư.
 * rules: các đơn vị đã truy xuất gửi kèm prompt; facts: các fact đã gửi; pii: đoạn đã xóa khỏi câu hỏi.
 */
export function validateAnswer(raw: unknown, facts: FactId[], rules: KnowledgeRule[], schoolId: SchoolId, pii: string[] = []): ValidationResult {
  if (!isAnswer(raw)) return { passed: false, errors: ['format: JSON sai schema'], sentences: [] };
  const errors: string[] = [];
  const byId = new Map(rules.map((r) => [r.ruleId, r]));
  const factSet = new Set(facts);

  if (raw.sentences.length > MAX_SENTENCES) errors.push(`format: ${raw.sentences.length} câu (tối đa ${MAX_SENTENCES})`);
  const words = raw.sentences.reduce((n, s) => n + s.text.trim().split(/\s+/).length, 0);
  if (words > MAX_WORDS) errors.push(`format: ${words} từ (tối đa ${MAX_WORDS})`);

  const kept: AiSentence[] = [];
  raw.sentences.forEach((s, i) => {
    const at = `câu ${i + 1}`;
    // Căn cứ: câu không có rule_id, hoặc rule_id ngoài nhóm vừa truy xuất, bị cắt.
    if (s.label !== 'suggestion' && (s.rule_ids.length === 0 || s.rule_ids.some((r) => !byId.has(r)))) {
      errors.push(`căn cứ: ${at} không có rule_id hợp lệ`);
      return;
    }
    for (const f of s.fact_ids) if (!factSet.has(f)) errors.push(`dữ kiện: ${at} dùng fact không có: ${f}`);
    for (const name of inventedNames(s.text, facts)) errors.push(`dữ kiện: ${at} nhắc ${name} không có trong lá số`);
    for (const p of bannedPhrasesIn(s.text)) errors.push(`khẳng định: ${at} có "${p}"`);
    const rs = s.rule_ids.map((r) => byId.get(r)!).filter(Boolean);
    if (s.label === 'interpretation' && rs.some((r) => r.kind === 'folk')) errors.push(`nhãn: ${at} là nội dung dân gian nhưng gắn nhãn Tử Vi`);
    if (s.label === 'folk' && rs.some((r) => r.kind !== 'folk')) errors.push(`nhãn: ${at} gắn nhãn Dân gian cho nội dung Tử Vi`);
    if (rs.some((r) => !appliesToSchool(r, schoolId))) errors.push(`phái: ${at} dựa trên đơn vị không thuộc phái của hồ sơ`);
    for (const p of pii) if (p && s.text.includes(p)) errors.push(`riêng tư: ${at} nhắc lại thông tin cá nhân trong câu hỏi`);
    kept.push(s);
  });

  const blocking = errors.filter((e) => !e.startsWith('căn cứ:'));
  if (kept.length < 2 && !raw.out_of_scope) errors.push(`căn cứ: còn ${kept.length} câu hợp lệ (cần từ 2)`);
  const passed = blocking.length === 0 && (kept.length >= 2 || raw.out_of_scope);
  return { passed, errors, sentences: kept };
}
