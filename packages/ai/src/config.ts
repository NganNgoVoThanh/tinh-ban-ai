/**
 * Đọc cấu hình AI từ biến môi trường (chỉ server). Không có khóa thì dùng AI giả lập ở local và test;
 * production bắt buộc chọn nhà cung cấp thật.
 *
 * AI_PROVIDER        anthropic | openai | fake
 * AI_ENABLED         false để tắt hẳn (trả lời bằng kho)
 * AI_MODEL_SMALL     model nhỏ (mặc định với anthropic: claude-haiku-5-5)
 * AI_MODEL_STRONG    model mạnh (mặc định với anthropic: claude-sonnet-5-5)
 * AI_EFFORT          mức suy nghĩ (mặc định low)
 * AI_PRICES_JSON     giá USD/1M token theo model, bắt buộc với openai: {"model":{"input":..,"output":..}}
 * ANTHROPIC_API_KEY, OPENAI_API_KEY
 * UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * AI_DAILY_BUDGET_USD, AI_MONTHLY_BUDGET_USD, AI_DAILY_QUOTA
 */
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { AiProvider, ModelPrice } from './gateway.ts';
import { DEFAULT_POLICY, type AskPolicy } from './policy.ts';
import { AnthropicProvider, type ClaudeEffort } from './providers/anthropic.ts';
import { FakeProvider } from './providers/fake.ts';
import { OpenAIProvider, type OpenAIEffort } from './providers/openai.ts';
import { MemoryStore, UpstashStore, type KeyValueStore } from './stores.ts';

type Env = Record<string, string | undefined>;

export function providerFromEnv(env: Env): AiProvider {
  const kind = env.AI_PROVIDER ?? (env.NODE_ENV === 'production' ? undefined : 'fake');
  if (kind === 'fake') return new FakeProvider();
  if (kind === 'anthropic') {
    return new AnthropicProvider(
      new Anthropic(),
      { small: env.AI_MODEL_SMALL ?? 'claude-haiku-5-5', strong: env.AI_MODEL_STRONG ?? 'claude-sonnet-5-5' },
      (env.AI_EFFORT as ClaudeEffort | undefined) ?? 'low',
    );
  }
  if (kind === 'openai') {
    if (!env.AI_MODEL_SMALL || !env.AI_MODEL_STRONG) throw new Error('Cần AI_MODEL_SMALL và AI_MODEL_STRONG');
    const prices = JSON.parse(env.AI_PRICES_JSON ?? '{}') as Record<string, ModelPrice>;
    return new OpenAIProvider(new OpenAI(), { small: env.AI_MODEL_SMALL, strong: env.AI_MODEL_STRONG }, prices, (env.AI_EFFORT as OpenAIEffort | undefined) ?? 'low');
  }
  throw new Error('Chưa cấu hình AI_PROVIDER (anthropic, openai hoặc fake)');
}

let memory: MemoryStore | undefined;

/** Upstash Redis nếu có cấu hình; nếu không thì bộ nhớ của tiến trình (chỉ hợp cho local, test). */
export function storeFromEnv(env: Env): KeyValueStore {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return new UpstashStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  return (memory ??= new MemoryStore());
}

export function policyFromEnv(env: Env): AskPolicy {
  const num = (v: string | undefined, d: number) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    ...DEFAULT_POLICY,
    dailyQuota: num(env.AI_DAILY_QUOTA, DEFAULT_POLICY.dailyQuota),
    dailyBudgetUsd: num(env.AI_DAILY_BUDGET_USD, DEFAULT_POLICY.dailyBudgetUsd),
    monthlyBudgetUsd: num(env.AI_MONTHLY_BUDGET_USD, DEFAULT_POLICY.monthlyBudgetUsd),
  };
}

export const aiEnabledFromEnv = (env: Env) => env.AI_ENABLED !== 'false';
