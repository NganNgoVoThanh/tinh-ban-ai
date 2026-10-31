/** Schema của file YAML trong content/ (snake_case, Technical Plan mục 7). */
import { z } from 'zod';
import type { Condition } from '../src/types.ts';

const brightness = z.enum(['mieu', 'vuong', 'dac', 'loi', 'binh', 'bat', 'ham']);
const atom = z.union([
  z.strictObject({ palace: z.string(), has_star: z.string(), scope: z.enum(['self', 'tam_phuong']).optional() }),
  z.strictObject({ palace: z.string(), no_major: z.literal(true) }),
  z.strictObject({ palace: z.string(), is_body: z.literal(true) }),
  z.strictObject({ star: z.string(), state_in: z.array(brightness).min(1) }),
  z.strictObject({ star: z.string(), hoa: z.enum(['loc', 'quyen', 'khoa', 'ky']) }),
]);

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    atom,
    z.strictObject({ all: z.array(conditionSchema).min(1) }),
    z.strictObject({ any: z.array(conditionSchema).min(1) }),
    z.strictObject({ not: conditionSchema }),
  ]),
);

export const unitSchema = z.strictObject({
  rule_id: z.string().regex(/^(TV|FOLK|PAT|YEAR)(\.[A-Z0-9_]+)+\.\d{3}$/, 'rule_id dạng TV.<CUNG>.<SAO>.<TRẠNG_THÁI>.<số>'),
  schools: z.array(z.enum(['nam', 'bac'])).optional(),
  version: z.number().int().min(1),
  kind: z.enum(['interpretation', 'pattern', 'folk', 'year']),
  topic: z.string().regex(/^[a-z_]+$/),
  conditions: conditionSchema,
  exclusions: z.array(conditionSchema).optional(),
  headline: z.string().min(1),
  because: z.string().min(1),
  detail: z.string().min(1),
  citations: z.array(z.strictObject({ source_id: z.string(), edition: z.string().optional(), page: z.union([z.number(), z.string()]).optional() })),
  review: z.strictObject({
    level: z.enum(['L0', 'L1', 'L2']),
    by: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sources_checked: z.number().int().min(0),
  }),
  priority: z.number().int().min(0).max(100),
  public: z.boolean().optional(),
  tests: z.strictObject({ positive: z.array(z.string()), negative: z.array(z.string()) }).optional(),
});

export const sourcesSchema = z.strictObject({
  sources: z.array(
    z.strictObject({
      source_id: z.string().regex(/^[A-Z0-9-]+$/),
      title: z.string().min(1),
      author: z.string().optional(),
      school: z.enum(['nam', 'bac']).optional(),
    }),
  ),
});

export const metaSchema = z.strictObject({ kb_version: z.string().regex(/^\d+\.\d+\.\d+$/) });

export type UnitYaml = z.infer<typeof unitSchema>;
