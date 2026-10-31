/**
 * ai-gateway (ADR-07): không gắn với nhà cung cấp nào; mỗi hãng một adapter dùng SDK chính thức.
 * Model chọn bằng eval E-01 và cấu hình qua biến môi trường, không viết cứng trong code.
 */
export type ModelTier = 'small' | 'strong';

export interface CompletionRequest {
  tier: ModelTier;
  /** Prompt hệ thống cố định, đặt đầu tiên để được prompt caching. */
  system: string;
  /** Phần thay đổi theo câu hỏi: fact, đơn vị kho, câu hỏi. */
  user: string;
  /** JSON Schema của đầu ra (structured outputs). */
  schema: Record<string, unknown>;
}

export interface CompletionResult {
  /** JSON đã parse; null nếu model trả về không phải JSON (tính là trượt kiểm tra định dạng). */
  json: unknown;
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  /** Nhà cung cấp từ chối trả lời (safety). */
  refused: boolean;
}

export interface AiProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}

/** Giá USD trên 1 triệu token. */
export interface ModelPrice {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

export function costOf(price: ModelPrice, usage: { input: number; output: number; cacheRead?: number; cacheWrite?: number }): number {
  return (
    (usage.input * price.input +
      usage.output * price.output +
      (usage.cacheRead ?? 0) * (price.cacheRead ?? price.input) +
      (usage.cacheWrite ?? 0) * (price.cacheWrite ?? price.input)) /
    1_000_000
  );
}

export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
