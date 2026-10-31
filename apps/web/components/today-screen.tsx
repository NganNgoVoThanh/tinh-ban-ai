"use client";

import { parseDate, solarToLunar, yearCanChi } from "@tinhban/calendar";
import { getDayInfo, type DayInfo } from "@tinhban/folk-calendar";
import type { LocalProfile } from "@tinhban/shared";
import { ContentBlock } from "@tinhban/ui";
import { CalendarDays, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Emblem } from "@/components/emblem";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { trackEvent } from "@/lib/analytics";
import { chartOf } from "@/lib/chart";
import { formatSolar } from "@/lib/format";
import { profileLabel, useProfiles } from "@/lib/profiles";
import { useSettings } from "@/lib/settings";
import { clampDay, dayRange, monthGrid, offsetBucket, shiftDay, toIso, weekdayName } from "@/lib/today";
import { useToday } from "@/lib/use-today";

const RELATION_TEXT = { luc_hop: "lục hợp", tam_hop: "tam hợp", luc_xung: "lục xung" } as const;

function FactsBlock({ info }: { info: DayInfo }) {
  return (
    <ContentBlock kind="fact">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Âm lịch</dt>
        <dd className="tabular-nums">
          {info.lunar.day}/{info.lunar.month}
          {info.lunar.isLeap ? " nhuận" : ""} năm {info.canChi.year}
        </dd>
        <dt className="text-muted-foreground">Can chi</dt>
        <dd>
          Ngày {info.canChi.day} · tháng {info.canChi.month}
        </dd>
        <dt className="text-muted-foreground">Tiết khí</dt>
        <dd>{info.solarTerm}</dd>
      </dl>
    </ContentBlock>
  );
}

function FolkBlock({ info }: { info: DayInfo }) {
  return (
    <ContentBlock kind="folk" title="Xem ngày">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt>Ngày</dt>
        <dd className="font-medium">
          {info.hoangDao.good ? "Hoàng đạo" : "Hắc đạo"} ({info.hoangDao.than})
        </dd>
        <dt>Trực</dt>
        <dd>{info.truc}</dd>
        <dt>Giờ tốt</dt>
        <dd>
          <ul className="flex flex-wrap gap-x-3">
            {info.goodHours.map((h) => (
              <li key={h.branch}>
                {h.branch} <span className="tabular-nums">{h.range}</span>
              </li>
            ))}
          </ul>
        </dd>
      </dl>
      <p className="mt-2 text-xs">Theo quan niệm dân gian, chỉ để tham khảo.</p>
    </ContentBlock>
  );
}

function FamilyBlock({ info, profiles }: { info: DayInfo; profiles: LocalProfile[] }) {
  return (
    <ContentBlock kind="folk" title="Cả nhà hôm nay">
      {profiles.length === 0 ? (
        <Link href="/ho-so/moi" className="text-sm font-medium underline-offset-4 hover:underline">
          Thêm hồ sơ để xem hợp, xung theo tuổi
        </Link>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {profiles.map((p, i) => {
            const r = info.people.find((x) => x.profileId === p.profileId);
            return (
              <li key={p.profileId} className="flex items-center justify-between gap-2">
                <span>{profileLabel(p, i)}</span>
                {r && r.detail ? (
                  <span className={`flex items-center gap-1.5 ${r.relation === "xung" ? "text-xung" : "text-hop"}`}>
                    <span className={`size-2 rounded-full ${r.relation === "xung" ? "bg-xung" : "bg-hop"}`} aria-hidden />
                    {r.relation === "xung" ? "xung" : "hợp"} · {RELATION_TEXT[r.detail]}
                  </span>
                ) : (
                  <span>không xung, không hợp</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-xs">Theo quan niệm dân gian, chỉ để tham khảo.</p>
    </ContentBlock>
  );
}

/**
 * Tờ lịch của ngày đang xem trên tấm dát vàng: đầu tờ ghi tháng và tiết khí, ngăn bằng chỉ vàng;
 * thân tờ có ngày dương thật lớn màu son, ngày âm, can chi, hoàng đạo. Trang trí là phụ; mọi dữ kiện
 * đều có lại ở các khối bên dưới.
 */
function DayHero({ info, day, month, year }: { info: DayInfo; day: number; month: number; year: number }) {
  return (
    <section aria-label="Tờ lịch" className="gilded overflow-hidden rounded-3xl animate-in fade-in zoom-in-95 duration-500">
      <div className="mx-5 flex items-center justify-between border-b border-[color-mix(in_oklab,var(--gold)_30%,transparent)] pt-4 pb-3">
        <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase tabular-nums">
          Tháng {month} · {year}
        </span>
        <span className="text-xs font-medium text-gold">Tiết {info.solarTerm}</span>
      </div>
      <div className="relative flex items-center justify-between gap-4 px-5 py-4">
        <Emblem className="pointer-events-none absolute top-1/2 -left-12 size-48 -translate-y-1/2 text-gold opacity-[0.14] dark:opacity-[0.1]" spin core={false} />
        <span className="relative font-display text-[96px] leading-none font-semibold text-son-gradient tabular-nums drop-shadow-[0_6px_14px_rgb(163_23_31/0.15)]">
          {day}
        </span>
        <div className="relative flex flex-col items-end gap-1.5 text-right">
          <span className="flex flex-col">
            <span className="font-display text-3xl leading-tight tabular-nums">
              {info.lunar.day}/{info.lunar.month}
            </span>
            <span className="text-xs text-muted-foreground">
              âm lịch{info.lunar.isLeap ? " nhuận" : ""} · năm {info.canChi.year}
            </span>
          </span>
          <span className="text-sm">Ngày {info.canChi.day}</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              info.hoangDao.good ? "border-[color-mix(in_oklab,var(--gold)_55%,transparent)] bg-[color-mix(in_oklab,var(--gold)_8%,var(--card))] text-gold" : "border-border text-muted-foreground"
            }`}
          >
            <span className={`size-1.5 rounded-full ${info.hoangDao.good ? "bg-gold" : "bg-muted-foreground"}`} aria-hidden />
            {info.hoangDao.good ? "Hoàng đạo" : "Hắc đạo"}
          </span>
        </div>
      </div>
    </section>
  );
}

/** Lịch tháng dạng bảng kéo lên: ngày dương (lớn), ngày âm (nhỏ), chấm hoàng đạo. */
function MonthSheet({ open, onOpenChange, value, range, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; value: string; range: { min: string; max: string }; onPick: (iso: string) => void }) {
  const [ym, setYm] = useState(() => value.slice(0, 7));
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const cells = useMemo(() => monthGrid(y, m), [y, m]);
  const go = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setYm(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Tháng trước" disabled={`${ym}-01` <= range.min} onClick={() => go(-1)}>
            <ChevronLeft aria-hidden />
          </Button>
          <DrawerTitle className="font-serif text-lg">
            Tháng {m}/{y}
          </DrawerTitle>
          <Button variant="ghost" size="icon" aria-label="Tháng sau" disabled={`${ym}-31` >= range.max} onClick={() => go(1)}>
            <ChevronRight aria-hidden />
          </Button>
        </DrawerHeader>
        <div className="mx-auto grid w-full max-w-md grid-cols-7 gap-1 px-3 pb-6 text-center">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
            <span key={d} className="text-xs text-muted-foreground">
              {d}
            </span>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <span key={`e${i}`} />;
            const lunar = solarToLunar(iso, "north");
            const good = getDayInfo(iso).hoangDao.good;
            const disabled = iso < range.min || iso > range.max;
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                aria-pressed={iso === value}
                aria-label={`${formatSolar(iso)}, âm lịch ${lunar.day}/${lunar.month}${good ? ", hoàng đạo" : ""}`}
                onClick={() => onPick(iso)}
                className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-base tabular-nums transition-colors disabled:opacity-30 ${iso === value ? "bg-primary text-primary-foreground shadow-[0_0_0_2px_var(--card),0_0_0_3px_color-mix(in_oklab,var(--gold)_55%,transparent)]" : "hover:bg-muted"}`}
              >
                {Number(iso.slice(8))}
                <span className="flex items-center gap-0.5 text-[11px]">
                  {lunar.day === 1 ? `1/${lunar.month}` : lunar.day}
                  {good && <span className="size-1 rounded-full bg-gold" aria-hidden />}
                </span>
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Màn Hôm nay (Technical Plan mục 8): chạy hoàn toàn trên máy, không gọi AI. */
export function TodayScreen() {
  const searchParams = useSearchParams();
  const today = useToday();
  const profiles = useProfiles();
  const settings = useSettings();
  const todayIso = today ? toIso(today) : null;
  const range = useMemo(() => (today ? dayRange({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() }) : null), [today]);
  const requested = searchParams.get("ngay");
  const [picked, setPicked] = useState<string | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const touchX = useRef<number | null>(null);
  const value = range && todayIso ? clampDay(picked ?? (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayIso), range) : null;

  const people = useMemo(
    () =>
      (profiles ?? []).flatMap((p) => {
        const s = chartOf(p).snapshot;
        return s ? [{ profileId: p.profileId, yearBranch: yearCanChi(s.lunar.year).chi }] : [];
      }),
    [profiles],
  );
  const info = useMemo(() => (value ? getDayInfo(value, people) : null), [value, people]);

  useEffect(() => trackEvent("today_opened"), []);

  if (!value || !info || !range || !todayIso || !profiles || !settings) return null;

  const go = (iso: string) => {
    const next = clampDay(iso, range);
    setPicked(next);
    window.history.replaceState(null, "", next === todayIso ? "/hom-nay" : `/hom-nay?ngay=${next}`);
    trackEvent("today_date_changed", { offset_bucket: offsetBucket(next, todayIso) });
  };
  const d = parseDate(value);
  const blocks: Record<"facts" | "folk" | "family", ReactNode> = {
    facts: <FactsBlock key="facts" info={info} />,
    folk: <FolkBlock key="folk" info={info} />,
    family: <FamilyBlock key="family" info={info} profiles={profiles} />,
  };
  // Cửa A: Dữ kiện → Dân gian → Cả nhà; cửa B: Cả nhà → Dữ kiện → Dân gian (mục 8, 12).
  const order = settings.door === "B" ? (["family", "facts", "folk"] as const) : (["facts", "folk", "family"] as const);

  return (
    <main
      className="mx-auto flex w-full max-w-140 flex-col gap-4 px-4 pb-8"
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 60) return;
        go(shiftDay(value, end < start ? 1 : -1));
      }}
    >
      <TopBar
        left={
          <div className="flex items-center">
            <Button variant="ghost" size="icon" aria-label="Ngày trước" disabled={value <= range.min} onClick={() => go(shiftDay(value, -1))}>
              <ChevronLeft aria-hidden />
            </Button>
            <button type="button" onClick={() => setMonthOpen(true)} className="flex min-h-11 flex-col items-start px-1 text-left" aria-label="Chọn ngày">
              <span className="font-serif text-lg leading-tight font-semibold">
                {weekdayName(info.weekday)} {formatSolar(value)}
              </span>
            </button>
            <Button variant="ghost" size="icon" aria-label="Ngày sau" disabled={value >= range.max} onClick={() => go(shiftDay(value, 1))}>
              <ChevronRight aria-hidden />
            </Button>
          </div>
        }
        right={
          <Button variant="ghost" size="icon" aria-label="Lịch tháng" onClick={() => setMonthOpen(true)}>
            <CalendarDays aria-hidden />
          </Button>
        }
      />
      <h1 className="sr-only">Hôm nay</h1>
      {value !== todayIso && (
        <Button variant="outline" size="sm" className="h-11 w-fit rounded-full" onClick={() => go(todayIso)}>
          Về hôm nay
        </Button>
      )}
      <DayHero info={info} day={d.day} month={d.month} year={d.year} />
      {order.map((k) => blocks[k])}
      {value === todayIso && profiles?.length ? (
        <Button asChild variant="outline" size="lg" className="w-fit">
          <Link href="/hoi?cau=hom-nay">
            <MessageCircle className="text-primary" aria-hidden /> Hỏi về hôm nay
          </Link>
        </Button>
      ) : null}
      <MonthSheet
        key={value}
        open={monthOpen}
        onOpenChange={setMonthOpen}
        value={value}
        range={range}
        onPick={(iso) => {
          setMonthOpen(false);
          go(iso);
        }}
      />
    </main>
  );
}
