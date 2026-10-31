"use client";

import { CalendarDays, LayoutGrid, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Emblem } from "@/components/emblem";
import { Button } from "@/components/ui/button";
import { configureAnalytics, trackEvent } from "@/lib/analytics";
import { getInstallId, isStandalone } from "@/lib/meta";
import { useProfiles } from "@/lib/profiles";
import { isTabRoute, TABS } from "@/lib/routes";
import { updateSettings, useSettings } from "@/lib/settings";

const ICON = { chart: LayoutGrid, profiles: Users, today: CalendarDays, ask: MessageCircle } as const;

function TabBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_-24px_rgb(80_10_20/0.5)] backdrop-blur-xl backdrop-saturate-150 md:inset-y-0 md:right-auto md:w-20 md:border-t-0 md:border-r md:pt-4 md:pb-0 md:shadow-none"
    >
      <Link href="/" aria-label="Trang giới thiệu Tinh Bàn" className="mx-auto mb-4 hidden size-11 items-center justify-center text-gold md:flex">
        <Emblem className="size-9" />
      </Link>
      <ul className="flex md:flex-col md:gap-2">
        {TABS.map((t) => {
          const Icon = ICON[t.key];
          const active = pathname === t.href;
          return (
            <li key={t.href} className="flex-1 md:flex-none">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {/* Viên thuốc sau icon của tab đang mở, có chấm vàng ở mép trên. */}
                <span
                  className={`relative flex h-7 w-14 items-center justify-center rounded-full transition-all duration-300 ${
                    active ? "bg-[color-mix(in_oklab,var(--primary)_13%,transparent)]" : "group-hover:bg-muted"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.1 : 1.75} aria-hidden />
                  {active && <span className="absolute -top-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold" aria-hidden />}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Hỏi đồng ý phân tích ẩn danh: chỉ hỏi một lần, sau khi đã có hồ sơ; hai nút ngang hàng. */
function ConsentPrompt() {
  const settings = useSettings();
  const profiles = useProfiles();
  if (!settings || settings.analyticsConsent !== null || !profiles?.length) return null;
  const answer = (consent: boolean) => void updateSettings({ analyticsConsent: consent });
  return (
    <div role="region" aria-label="Phân tích ẩn danh" className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 px-4 pb-2 md:bottom-4 md:left-24">
      <div className="surface mx-auto border flex max-w-xl flex-col gap-2 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="text-sm">Cho phép gửi số liệu dùng app ẩn danh để cải thiện app? Không có ngày sinh, tên hay câu hỏi.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => answer(false)}>
            Không
          </Button>
          <Button variant="outline" onClick={() => answer(true)}>
            Đồng ý
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Khung chung: thanh tab ở các trang tab, lời hỏi đồng ý phân tích, nạp cấu hình phân tích. */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const settings = useSettings();
  const tabs = isTabRoute(pathname);

  useEffect(() => {
    if (!settings) return;
    void getInstallId().then((installId) => configureAnalytics({ consent: settings.analyticsConsent, installId }));
  }, [settings]);

  const opened = useRef(false);
  useEffect(() => {
    if (!settings || opened.current) return;
    opened.current = true;
    trackEvent("app_open", { door: settings.door, is_pwa: isStandalone() });
  }, [settings]);

  return (
    <>
      <div className={tabs ? "pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-20" : undefined}>{children}</div>
      {tabs && <TabBar pathname={pathname} />}
      {tabs && <ConsentPrompt />}
    </>
  );
}
