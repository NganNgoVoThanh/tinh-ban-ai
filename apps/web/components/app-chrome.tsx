"use client";

import { CalendarDays, Crown, LayoutGrid, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Emblem } from "@/components/emblem";
import { Button } from "@/components/ui/button";
import { configureAnalytics, trackEvent } from "@/lib/analytics";
import { getInstallId, isStandalone } from "@/lib/meta";
import { CURRENT_PLAN, planName } from "@/lib/plans";
import { useProfiles } from "@/lib/profiles";
import { isTabRoute, TABS } from "@/lib/routes";
import { updateSettings, useSettings } from "@/lib/settings";

const ICON = { chart: LayoutGrid, profiles: Users, today: CalendarDays, ask: MessageCircle } as const;

function TabBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_-24px_rgb(90_60_20/0.4)] backdrop-blur-md backdrop-saturate-150 md:inset-y-0 md:right-auto md:flex md:w-20 md:flex-col md:border-t-0 md:border-r md:bg-background md:pt-4 md:pb-4 md:shadow-none lg:w-60 lg:px-3"
    >
      <Link
        href="/"
        aria-label="Trang giới thiệu Tinh Bàn"
        className="mx-auto mb-4 hidden size-11 items-center justify-center text-gold md:flex lg:mx-0 lg:mb-6 lg:w-auto lg:justify-start lg:gap-2.5 lg:px-2"
      >
        <Emblem className="size-9" />
        <span className="hidden font-serif text-xl font-semibold text-foreground lg:inline">Tinh Bàn</span>
      </Link>
      <ul className="flex md:flex-col md:gap-2 lg:gap-1">
        {TABS.map((t) => {
          const Icon = ICON[t.key];
          const active = pathname === t.href;
          return (
            <li key={t.href} className="flex-1 md:flex-none">
              {/* Điện thoại và máy tính bảng: icon trên, chữ dưới. Máy tính: một hàng icon + chữ như menu web. */}
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-2 lg:text-sm lg:transition-colors ${
                  active ? "text-primary lg:bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]" : "text-muted-foreground hover:text-foreground lg:hover:bg-muted"
                }`}
              >
                {/* Viên thuốc sau icon của tab đang mở, có chấm vàng ở mép trên. */}
                <span
                  className={`relative flex h-7 w-14 items-center justify-center rounded-full transition-all duration-300 lg:w-7 ${
                    active ? "bg-[color-mix(in_oklab,var(--primary)_13%,transparent)] lg:bg-transparent" : "group-hover:bg-muted lg:group-hover:bg-transparent"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.1 : 1.75} aria-hidden />
                  {active && <span className="absolute -top-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold lg:hidden" aria-hidden />}
                </span>
                {t.label}
                {active && <span className="ml-auto hidden size-1.5 rounded-full bg-gold lg:block" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* Tab Hồ sơ đã có thẻ gói ở đầu trang. */}
      {pathname !== "/ho-so" && <PlanLink />}
    </nav>
  );
}

/** Ô gói hiện tại ở chân thanh bên, chỉ trên máy tính (điện thoại xem ở tab Hồ sơ). */
function PlanLink() {
  return (
    <Link
      href="/goi"
      className="son group mt-auto hidden flex-col gap-1 overflow-hidden rounded-2xl p-3 outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:flex"
    >
      <Emblem className="pointer-events-none absolute -top-6 -right-6 size-20 text-gold opacity-20" core={false} />
      <span className="relative text-[11px] font-semibold tracking-[0.2em] text-gold uppercase">Gói của bạn</span>
      <span className="relative flex items-center justify-between gap-2">
        <span className="font-display text-lg leading-tight font-semibold">{planName(CURRENT_PLAN)}</span>
        <span className="gold-leaf flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-[filter] group-hover:brightness-105">
          <Crown className="size-3.5" aria-hidden /> Các gói
        </span>
      </span>
    </Link>
  );
}

/** Hỏi đồng ý phân tích ẩn danh: chỉ hỏi một lần, sau khi đã có hồ sơ; hai nút ngang hàng. */
function ConsentPrompt() {
  const settings = useSettings();
  const profiles = useProfiles();
  if (!settings || settings.analyticsConsent !== null || !profiles?.length) return null;
  const answer = (consent: boolean) => void updateSettings({ analyticsConsent: consent });
  return (
    <div role="region" aria-label="Phân tích ẩn danh" className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 px-4 pb-2 md:bottom-4 md:left-24 lg:left-64">
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
      <div className={tabs ? "pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-20 lg:pl-60" : undefined}>{children}</div>
      {tabs && <TabBar pathname={pathname} />}
      {tabs && <ConsentPrompt />}
    </>
  );
}
