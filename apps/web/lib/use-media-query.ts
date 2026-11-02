"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Khớp media query trên máy; lúc dựng trên máy chủ coi như không khớp (giao diện điện thoại). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Màn hình rộng từ 768 px (mốc `md`): máy tính bảng trở lên. Bảng nổi thành hộp thoại giữa màn hình,
 * ô chọn (ngày, nơi sinh) thành ô nổi dưới nút mở, thay cho bảng kéo lên tràn hết bề ngang.
 */
export const useWide = () => useMediaQuery("(min-width: 48rem)");

/**
 * Màn hình rộng từ 1024 px (mốc `lg` của Tailwind): bản web trên máy tính. Phần chỉ có ở bản này
 * (lịch tháng mở sẵn, cột câu gợi ý) chỉ dựng khi khớp, để trên điện thoại không có hai bản trùng nhau.
 */
export const useDesktop = () => useMediaQuery("(min-width: 64rem)");
