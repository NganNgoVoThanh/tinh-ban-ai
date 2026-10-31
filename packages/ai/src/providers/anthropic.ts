import Anthropic from '@anthropic-ai/sdk';
import { costOf, parseJson, type AiProvider, type CompletionRequest, type CompletionResult, type ModelPrice, type ModelTier } from '../gateway.ts';

/**
 * Giá Claude trên Claude API (USD / 1 triệu token; Haiku 5.5 với prompt ≤ 100K token). Cache đọc
 * khoảng 0,1× giá vào (Opus 5.5: 0,05×), cache ghi 1,25×. Kiểm lại bảng giá khi chốt model (mục 10).
 */
export const CLAUDE_PRICES: Record<string, ModelPrice> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

/** Model được phục vụ không có trong bảng (ví dụ do fallback phía server): tính theo giá cao nhất. */
const priceOf = (model: string): ModelPrice =>
  CLAUDE_PRICES[model] ?? Object.values(CLAUDE_PRICES).reduce((a, b) => (b.output > a.output ? b : a));

export type ClaudeEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/**
 * Adapter Claude (ADR-07): đầu ra JSON theo schema (output_config.format), prompt hệ thống cố định có
 * cache_control để được prompt caching, effort thấp nhất vẫn đạt eval. Model mạnh Claude Sonnet 5.5 bật
 * fallback phía server ("default") khi bị từ chối vì safety; model nhỏ Claude Haiku 5.5 không có cơ chế
 * này, khi đó app lùi về tầng sau.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;
  private readonly models: Record<ModelTier, string>;
  private readonly effort: ClaudeEffort;

  constructor(client: Anthropic, models: Record<ModelTier, string>, effort: ClaudeEffort = 'low') {
    this.client = client;
    this.models = models;
    this.effort = effort;
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const model = this.models[req.tier];
    const params = {
      model,
      max_tokens: 4000,
      system: [{ type: 'text' as const, text: req.system, cache_control: { type: 'ephemeral' as const } }],
      messages: [{ role: 'user' as const, content: req.user }],
      output_config: { effort: this.effort, format: { type: 'json_schema' as const, schema: req.schema } },
    };
    const msg =
      model === 'claude-sonnet-5-5'
        ? await this.client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
        : await this.client.messages.create(params);

    const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const u = msg.usage;
    const usage = { input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 };
    return {
      json: parseJson(text),
      modelId: msg.model,
      tokensIn: usage.input + usage.cacheRead + usage.cacheWrite,
      tokensOut: usage.output,
      costUsd: costOf(priceOf(msg.model), usage),
      refused: msg.stop_reason === 'refusal',
    };
  }
}
