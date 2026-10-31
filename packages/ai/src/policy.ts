/**
 * Hạn mức, ngân sách, Turnstile (Technical Plan mục 10). Ngưỡng nằm trong cấu hình (/api/config),
 * chỉnh được mà không cần deploy.
 */
import { keys, vnDay, type KeyValueStore } from './stores.ts';

export interface AskPolicy {
  /** Câu tự do mỗi ngày trên mỗi thiết bị (chỉ tính câu gửi lên server). */
  dailyQuota: number;
  /** Turnstile khi IP gửi quá ngần này câu trong 1 giờ. */
  ipPerHour: number;
  /** Turnstile khi ngân sách ngày đã dùng quá tỷ lệ này. */
  budgetTurnstileRatio: number;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
}

export const DEFAULT_POLICY: AskPolicy = {
  dailyQuota: 3,
  ipPerHour: 20,
  budgetTurnstileRatio: 0.8,
  dailyBudgetUsd: 2,
  monthlyBudgetUsd: 30,
};

export interface UsageSnapshot {
  quotaUsed: number;
  ipLastHour: number;
  limitHitLastHour: boolean;
  spentDay: number;
  spentMonth: number;
  aiEnabled: boolean;
}

export async function readUsage(store: KeyValueStore, installId: string, ip: string, now: Date, envAiEnabled: boolean): Promise<UsageSnapshot> {
  const day = vnDay(now);
  const [quota, ipCount, hit, spentDay, spentMonth, aiFlag] = await Promise.all([
    store.get(keys.quota(installId, day)),
    store.get(keys.rateIp(ip)),
    store.get(keys.limitHit(installId)),
    store.get(keys.budgetDay(day)),
    store.get(keys.budgetMonth(day.slice(0, 6))),
    store.get(keys.aiEnabled),
  ]);
  return {
    quotaUsed: Number(quota ?? 0),
    ipLastHour: Number(ipCount ?? 0),
    limitHitLastHour: hit !== null,
    spentDay: Number(spentDay ?? 0),
    spentMonth: Number(spentMonth ?? 0),
    // Công tắc khẩn cấp: biến môi trường AI_ENABLED=false, hoặc khóa ai:enabled = "false" trong Redis.
    aiEnabled: envAiEnabled && aiFlag !== 'false',
  };
}

/**
 * Bắt buộc Turnstile khi: install_id tạo chưa tới 24 giờ và đây là câu đầu tiên; IP gửi quá ngưỡng
 * trong 1 giờ; đã chạm giới hạn lượt trong 1 giờ qua; ngân sách ngày đã dùng quá ngưỡng.
 */
export function needsTurnstile(u: UsageSnapshot, installAgeHours: number, p: AskPolicy): boolean {
  return (
    (installAgeHours < 24 && u.quotaUsed === 0) ||
    u.ipLastHour >= p.ipPerHour ||
    u.limitHitLastHour ||
    u.spentDay >= p.dailyBudgetUsd * p.budgetTurnstileRatio
  );
}

export const overBudget = (u: UsageSnapshot, p: AskPolicy) => u.spentDay >= p.dailyBudgetUsd || u.spentMonth >= p.monthlyBudgetUsd;

/** Ngưỡng cảnh báo ngân sách đã vượt (50%, 80%, 100% của trần tháng) sau khi cộng thêm chi phí. */
export function budgetAlerts(before: number, after: number, monthly: number): number[] {
  return [0.5, 0.8, 1].filter((r) => before < monthly * r && after >= monthly * r);
}

export async function recordAsk(store: KeyValueStore, installId: string, ip: string, now: Date): Promise<number> {
  const day = vnDay(now);
  await store.incr(keys.rateIp(ip), 1, 3600);
  return store.incr(keys.quota(installId, day), 1, 26 * 3600);
}

export async function recordLimitHit(store: KeyValueStore, installId: string) {
  await store.set(keys.limitHit(installId), '1', 3600);
}

export async function recordSpend(store: KeyValueStore, usd: number, now: Date): Promise<{ day: number; month: number }> {
  const day = vnDay(now);
  const [d, m] = await Promise.all([store.incr(keys.budgetDay(day), usd, 26 * 3600), store.incr(keys.budgetMonth(day.slice(0, 6)), usd, 32 * 86400)]);
  return { day: d, month: m };
}

/** Kiểm token Turnstile với Cloudflare. */
export async function verifyTurnstile(token: string | undefined, secret: string, ip: string): Promise<boolean> {
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  return res.ok && ((await res.json()) as { success?: boolean }).success === true;
}
