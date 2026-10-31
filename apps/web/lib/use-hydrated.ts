"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => undefined;

/**
 * true khi component đã hydrate xong trên máy. Next hydrate từng phần nên dấu ở layout có thể bật
 * trước khi form hydrate; form tự gắn data-ready để test E2E đợi đúng lúc gõ được.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
