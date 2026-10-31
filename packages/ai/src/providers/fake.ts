import type { AiProvider, CompletionRequest, CompletionResult } from '../gateway.ts';

/**
 * AI giả lập cho local và E2E (Technical Plan mục 18: luồng 7 dùng AI giả lập). Trả lời bằng chính
 * các đơn vị kho trong prompt, đúng schema, chi phí 0. Không dùng ở production.
 */
export class FakeProvider implements AiProvider {
  readonly name = 'fake';
  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const rules = [...req.user.matchAll(/^- \[([^\]]+)\] \((\w+)\) ([^|]+)\|/gm)].map((m) => ({ id: m[1]!, kind: m[2]!, headline: m[3]!.trim() }));
    const facts = /^Fact: (.*)$/m.exec(req.user)?.[1]?.split('; ').filter((f) => f.includes('|star:')) ?? [];
    const json =
      rules.length < 2
        ? { sentences: [], followups: [], out_of_scope: true }
        : {
            sentences: rules.slice(0, 3).map((r) => ({
              text: r.headline,
              rule_ids: [r.id],
              fact_ids: facts.slice(0, 1),
              label: r.kind === 'folk' ? 'folk' : 'interpretation',
            })),
            followups: [],
            out_of_scope: false,
          };
    return { json, modelId: `fake-${req.tier}`, tokensIn: 0, tokensOut: 0, costUsd: 0, refused: false };
  }
}
