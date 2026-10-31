"use client";

import { computeChart } from "@tinhban/chart-engine";
import type { Door } from "@tinhban/shared";
import { ChartGrid } from "@tinhban/ui";
import { ArrowRight, ChevronRight, LayoutGrid, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { chartLabels } from "@/lib/chart-labels";
import { useProfiles } from "@/lib/profiles";
import { updateSettings } from "@/lib/settings";
import { useHydrated } from "@/lib/use-hydrated";

const SAMPLE_NOW = new Date(Date.UTC(2026, 0, 1));

/**
 * Lá số mẫu theo sáng/tối của máy, chỉ để minh họa (trình đọc màn hình bỏ qua). Tính sau khi hydrate: iztro
 * tự đọc giờ hiện tại nên không chạy được lúc prerender.
 */
export function SampleChart() {
  const hydrated = useHydrated();
  const palaces = useMemo(
    () =>
      hydrated
        ? computeChart(
            { calendar: "solar", date: "1990-05-15", time: "08:20", timeCertainty: "exact", region: "north", gender: "female" },
            "nam",
            undefined,
            { now: SAMPLE_NOW },
          ).palaces!
        : null,
    [hydrated],
  );
  return (
    <div
      aria-hidden
      inert
      className="pointer-events-none relative min-h-[30rem] rounded-3xl bg-card/80 p-2 shadow-[0_40px_90px_-40px_rgb(131_92_18/0.5)] ring-1 ring-[color-mix(in_oklab,var(--gold)_45%,transparent)] backdrop-blur select-none"
    >
      {palaces && <ChartGrid
        palaces={palaces}
        labels={chartLabels}
        center={<p className="font-display text-xl text-primary">Lá số mẫu</p>}
        showStems={false}
        selected="menh"
        onSelect={() => undefined}
        strong={["menh"]}
        soft={[]}
      />}
    </div>
  );
}

const DOORS: { door: Door; title: string; text: string; icon: LucideIcon }[] = [
  { door: "A", title: "Hiểu lá số của tôi", text: "12 cung, chính tinh, Tứ hóa, đại vận; mỗi nhận định kèm căn cứ.", icon: LayoutGrid },
  { door: "B", title: "Việc của cả nhà", text: "Ngày tốt, hợp xung theo tuổi và vận năm của mọi người.", icon: Users },
];

/** Hai thẻ cửa A/B: chọn cửa rồi vào form nhập hồ sơ (Technical Plan mục 12). */
export function DoorCards({ highlight }: { highlight?: Door | null }) {
  const router = useRouter();
  const choose = async (door: Door) => {
    await updateSettings({ door });
    trackEvent("door_selected", { door });
    router.push("/ho-so/moi");
  };
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {DOORS.map((d) => (
        <button
          key={d.door}
          type="button"
          onClick={() => void choose(d.door)}
          className={`group surface flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left outline-none transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--gold)_45%,var(--border))] hover:shadow-[0_22px_44px_-26px_rgb(131_92_18/0.45)] focus-visible:ring-2 focus-visible:ring-ring ${
            highlight === d.door ? "border-primary shadow-[inset_0_0_0_1px_var(--primary)]" : ""
          }`}
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[color-mix(in_oklab,var(--primary)_8%,var(--card))] to-[color-mix(in_oklab,var(--gold)_16%,var(--card))] text-primary ring-1 ring-[color-mix(in_oklab,var(--gold)_35%,transparent)] transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
            <d.icon className="size-6" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="font-serif text-lg font-semibold">{d.title}</span>
            <span className="text-sm text-muted-foreground">{d.text}</span>
          </span>
          <ChevronRight className="text-primary transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </button>
      ))}
    </div>
  );
}

/** Nút chính ở đầu trang: máy đã có hồ sơ thì "Mở Tinh Bàn", chưa có thì mời lập lá số. */
export function HeroAction() {
  const profiles = useProfiles();
  const returning = !!profiles?.length;
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button asChild size="lg" className="shine h-13 rounded-full px-7 text-base">
        <Link href={returning ? "/app" : "#bat-dau"}>
          {returning ? "Mở Tinh Bàn" : "Lập lá số miễn phí"}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="h-13 rounded-full px-7 text-base">
        <Link href="/goi">Xem các gói</Link>
      </Button>
    </div>
  );
}

/** Ghi lượt xem trang giới thiệu (ref từ thẻ chia sẻ hoặc trang tri thức) và cửa được chọn sẵn. */
export function LandingDoors() {
  const params = useSearchParams();
  const ref = params.get("ref");
  const door = params.get("door");
  useEffect(() => {
    trackEvent("landing_viewed", ref === "card" || ref === "kb" ? { ref } : {});
  }, [ref]);
  return <DoorCards highlight={door === "A" || door === "B" ? door : null} />;
}
