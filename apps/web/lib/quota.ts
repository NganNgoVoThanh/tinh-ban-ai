import { useEffect, useState } from "react";

/**
 * Số câu tự do còn lại hôm nay, chỉ để hiện "Còn n/3 câu hôm nay"; server mới là nơi đếm thật
 * (Technical Plan mục 10). Lưu trong localStorage theo ngày, đọc ghi đều bọc try/catch.
 */
export const QUOTA_KEY = "tb-quota";

export function readQuota(day: string): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(QUOTA_KEY) ?? "null") as { day: string; remaining: number } | null;
    return v?.day === day ? v.remaining : null;
  } catch {
    return null;
  }
}

export function writeQuota(day: string, remaining: number) {
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify({ day, remaining }));
  } catch {
    // Trình duyệt chặn bộ nhớ: chỉ mất dòng nhắc lượt còn lại.
  }
}

export interface DailyQuota {
  remaining: number;
  total: number;
}

/**
 * Lượt hỏi tự do hôm nay để hiển thị: tổng lấy từ /api/config, số còn lại lấy từ lần trả lời gần nhất
 * trên máy. Không đọc được cấu hình thì dùng số đã lưu (nếu có) trên tổng mặc định.
 */
export function useDailyQuota(todayIso: string | null, fallbackTotal: number) {
  const [quota, setQuota] = useState<DailyQuota | null>(null);
  useEffect(() => {
    if (!todayIso) return;
    const stored = readQuota(todayIso);
    let cancelled = false;
    fetch("/api/config")
      .then((r) => r.json() as Promise<{ dailyQuota: number }>)
      .then((c) => !cancelled && setQuota({ remaining: stored ?? c.dailyQuota, total: c.dailyQuota }))
      .catch(() => !cancelled && setQuota(stored === null ? null : { remaining: stored, total: fallbackTotal }));
    return () => {
      cancelled = true;
    };
  }, [todayIso, fallbackTotal]);
  return [quota, setQuota] as const;
}
