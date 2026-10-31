"use client";

import { useSyncExternalStore } from "react";

let today: Date | undefined;
const noop = () => () => undefined;

/**
 * Ngày hôm nay, chỉ đọc trên máy người dùng: lúc prerender trả null để khung trang không chứa
 * thời điểm build (Next 16 chặn `new Date()` khi prerender).
 */
export function useToday(): Date | null {
  return useSyncExternalStore(
    noop,
    () => (today ??= new Date()),
    () => null,
  );
}
