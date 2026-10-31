"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

/** Bản service worker mới chờ sẵn: hiện "Có bản mới · Tải lại", bấm thì kích hoạt và tải lại. */
function UpdateToast() {
  useEffect(() => {
    const sw = typeof window !== "undefined" ? window.serwist : undefined;
    if (!sw) return;
    const onWaiting = () =>
      toast("Có bản mới", {
        duration: Infinity,
        action: {
          label: "Tải lại",
          onClick: () => {
            sw.addEventListener("controlling", () => window.location.reload());
            sw.messageSkipWaiting();
          },
        },
      });
    sw.addEventListener("waiting", onWaiting);
    return () => sw.removeEventListener("waiting", onWaiting);
  }, []);
  return null;
}

/**
 * Chế độ sáng/tối: next-themes chèn một script nhỏ vào <head> để gắn class trước khi trang hiện ra
 * (không lóe trắng). Lựa chọn lưu ở localStorage "tb-theme" và đồng bộ vào Cài đặt.
 * Service worker chỉ đăng ký ở bản production.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Đánh dấu app đã chạy xong phía máy (test E2E đợi dấu này).
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1";
  }, []);
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV !== "production"} cacheOnNavigation={false} reloadOnOnline={false}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="tb-theme" disableTransitionOnChange>
        {children}
        <Toaster position="top-center" />
        <UpdateToast />
      </ThemeProvider>
    </SerwistProvider>
  );
}
