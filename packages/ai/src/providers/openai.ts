import OpenAI from 'openai';
import { costOf, parseJson, type AiProvider, type CompletionRequest, type CompletionResult, type ModelPrice, type ModelTier } from '../gateway.ts';

export type OpenAIEffort = 'minimal' | 'low' | 'medium' | 'high';

/**
 * Adapter OpenAI (ADR-07, mặc định theo đặc tả v1.0): Responses API, đầu ra JSON theo schema (strict),
 * prompt hệ thống cố định đặt đầu để được prompt caching tự động. Tên model và giá lấy từ cấu hình
 * (AI_MODEL_SMALL, AI_MODEL_STRONG, AI_PRICES_JSON) vì phải kiểm lại khi chốt bằng eval E-01.
 */
export class OpenAIProvider implements AiProvider {
  readonly name = 'openai';
  private readonly client: OpenAI;
  private readonly models: Record<ModelTier, string>;
  private readonly prices: Record<string, ModelPrice>;
  private readonly effort: OpenAIEffort;

  constructor(client: OpenAI, models: Record<ModelTier, string>, prices: Record<string, ModelPrice>, effort: OpenAIEffort = 'low') {
    for (const m of Object.values(models)) {
      // Không có giá thì không tính được ngân sách: không cho chạy.
      if (!prices[m]) throw new Error(`Thiếu giá của model ${m} trong AI_PRICES_JSON`);
    }
    this.client = client;
    this.models = models;
    this.prices = prices;
    this.effort = effort;
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const model = this.models[req.tier];
    const res = await this.client.responses.create({
      model,
      instructions: req.system,
      input: req.user,
      text: { format: { type: 'json_schema', name: 'tinhban_answer', schema: req.schema, strict: true } },
      reasoning: { effort: this.effort },
      max_output_tokens: 4000,
    });
    const refused = res.output.some((o) => o.type === 'message' && o.content.some((c) => c.type === 'refusal'));
    const cached = res.usage?.input_tokens_details?.cached_tokens ?? 0;
    const usage = { input: (res.usage?.input_tokens ?? 0) - cached, output: res.usage?.output_tokens ?? 0, cacheRead: cached };
    return {
      json: parseJson(res.output_text),
      modelId: res.model,
      tokensIn: res.usage?.input_tokens ?? 0,
      tokensOut: usage.output,
      costUsd: costOf(this.prices[model]!, usage),
      refused,
    };
  }
}
