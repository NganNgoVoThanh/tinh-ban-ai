"use client";

import { ELEMENT_NAMES } from "@tinhban/kb";
import { SCHOOL_NAMES, type ChartSnapshot, type LocalProfile, type SchoolId } from "@tinhban/shared";
import { ChartGrid, ChartList, YearStarsGrid } from "@tinhban/ui";
import { Info, LayoutGrid, List, MoreHorizontal, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { FortuneView } from "@/components/fortune-view";
import { KeepSafeSheet } from "@/components/keep-safe-sheet";
import { PalaceDetailContent, PalaceDetailSheet, palaceTitle } from "@/components/palace-detail";
import { Segmented } from "@/components/segmented";
import { ProfileSwitcher, SchoolSwitch, TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trackEvent } from "@/lib/analytics";
import { chartLabels } from "@/lib/chart-labels";
import { chartOf, selectionOf, solarDateOf, yinYangGender } from "@/lib/chart";
import { formatLunar, formatSolar } from "@/lib/format";
import { profileLabel, updateProfile, useProfile, useProfiles } from "@/lib/profiles";
import { chartHref, editHref } from "@/lib/routes";
import { updateSettings, useSettings } from "@/lib/settings";

const HIDDEN_WARNINGS = new Set(["NO_BIRTH_TIME", "UNSUPPORTED_DAY30"]);
const ELEMENT_SWATCH = { kim: "bg-el-kim", moc: "bg-el-moc", thuy: "bg-el-thuy", hoa: "bg-el-hoa", tho: "bg-el-tho" } as const;

function Center({ profile, name, snapshot }: { profile: LocalProfile; name: string; snapshot: ChartSnapshot }) {
  const { lunar, core } = snapshot;
  return (
    <>
      <p className="font-display text-lg leading-tight font-semibold">{name}</p>
      <p className="text-xs text-muted-foreground">{yinYangGender(snapshot, profile.birth.gender)}</p>
      <p className="text-xs tabular-nums">Dương lịch {formatSolar(solarDateOf(profile, snapshot))}</p>
      <p className="text-xs tabular-nums">Âm lịch {formatLunar(lunar)}</p>
      <p className="text-xs">
        Tháng {lunar.canChi.month} · Ngày {lunar.canChi.day}
        {lunar.canChi.hour && ` · Giờ ${lunar.canChi.hour}`}
      </p>
      {core && (
        <>
          <p className="text-xs font-medium">{core.cuc.name}</p>
          <p className="text-xs text-muted-foreground">
            Mệnh chủ {core.menhChu} · Thân chủ {core.thanChu}
          </p>
        </>
      )}
      <span className="mt-1 rounded-full border border-gold/50 bg-card px-2 text-xs">{SCHOOL_NAMES[snapshot.schoolId]}</span>
    </>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>M Miếu · V Vượng · Đ Đắc · B Bình · H Hãm</span>
      <Popover>
        <PopoverTrigger className="inline-flex min-h-11 items-center gap-1 text-primary">
          <Info className="size-4" aria-hidden /> Màu tên sao
        </PopoverTrigger>
        <PopoverContent className="text-sm">
          <p className="mb-2">Tên sao tô màu theo ngũ hành, chỉ để nhìn nhanh; sao chưa rõ hành để màu chữ thường.</p>
          <ul className="grid grid-cols-2 gap-1">
            {(Object.keys(ELEMENT_SWATCH) as (keyof typeof ELEMENT_SWATCH)[]).map((e) => (
              <li key={e} className="flex items-center gap-2">
                <span className={`size-3 rounded-full ${ELEMENT_SWATCH[e]}`} aria-hidden />
                {ELEMENT_NAMES[e]}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function NoProfile({ title }: { title: string }) {
  return (
    <EmptyState title={title} text="Lá số tính ngay trên máy; ngày giờ sinh không rời máy của bạn.">
      <Button asChild size="lg">
        <Link href="/ho-so/moi">Lập lá số</Link>
      </Button>
      <Button asChild variant="outline" size="lg">
        <Link href="/khoi-phuc">Khôi phục bằng mã hồ sơ</Link>
      </Button>
    </EmptyState>
  );
}

/**
 * Màn Lá số (Technical Plan mục 12). Hồ sơ lấy từ ?ho-so=; không có thì mở hồ sơ đang chọn, rồi
 * hồ sơ đầu tiên. Đổi hồ sơ bằng history.pushState để không cần gọi mạng (ADR 0003).
 */
export function ChartScreen() {
  const searchParams = useSearchParams();
  const settings = useSettings();
  const profiles = useProfiles();
  const requested = searchParams.get("ho-so");
  const profileId = requested ?? settings?.activeProfileId ?? profiles?.[0]?.profileId;
  const profile = useProfile(profileId);

  useEffect(() => {
    if (profile && settings && settings.activeProfileId !== profile.profileId) void updateSettings({ activeProfileId: profile.profileId });
  }, [profile, settings]);

  if (profiles === undefined || settings === undefined) return null;
  if (profiles.length === 0) return <NoProfile title="Chưa có hồ sơ nào trên máy" />;
  if (profile === undefined) return null;
  if (profile === null) return <NoProfile title="Không có hồ sơ này trên máy" />;
  return (
    <ChartView
      key={profile.profileId}
      profile={profile}
      profiles={profiles}
      isNew={searchParams.get("moi") === "1"}
      door={settings.door}
      defaultSchool={settings.defaultSchool}
      initialMode={searchParams.get("xem") === "van-han" ? "van-han" : "goc"}
    />
  );
}

type ViewMode = "goc" | "van-han";

function ChartView({
  profile,
  profiles,
  isNew,
  door,
  defaultSchool,
  initialMode,
}: {
  profile: LocalProfile;
  profiles: LocalProfile[];
  isNew: boolean;
  door: "A" | "B";
  defaultSchool: string;
  initialMode: ViewMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const changeMode = (m: ViewMode) => {
    setMode(m);
    window.history.replaceState(null, "", chartHref(profile.profileId, m === "van-han" ? { xem: m } : {}));
  };
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [fullOpen, setFullOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [keepSafeOpen, setKeepSafeOpen] = useState(isNew && profiles.length === 1);
  const [hint, setHint] = useState(isNew && profiles.length === 1);
  const result = useMemo(() => chartOf(profile), [profile]);
  const snapshot = result.snapshot;
  const selection = useMemo(() => (snapshot ? selectionOf(snapshot, selected) : undefined), [snapshot, selected]);
  const selectedPalace = snapshot?.palaces?.find((p) => p.key === selected);

  const closeKeepSafe = (open: boolean) => {
    setKeepSafeOpen(open);
    if (!open) window.history.replaceState(null, "", chartHref(profile.profileId));
  };
  const select = (key: string | null) => {
    setSelected(key);
    setHint(false);
  };

  const name = profileLabel(profile, profiles.findIndex((p) => p.profileId === profile.profileId));
  const switchSchool = async (to: SchoolId) => {
    if (to === profile.schoolId) return;
    await updateProfile(profile.profileId, { schoolId: to });
    trackEvent("school_switched", { from: profile.schoolId, to, where: "chart" });
  };
  const warnings = snapshot?.warnings.filter((w) => !HIDDEN_WARNINGS.has(w.code)) ?? [];
  const codes = new Set(snapshot?.warnings.map((w) => w.code));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 pb-8">
      <TopBar
        left={<ProfileSwitcher profiles={profiles} current={profile} onSelect={(p) => window.history.pushState(null, "", chartHref(p.profileId))} />}
        right={
          <>
            <SchoolSwitch value={profile.schoolId} onChange={switchSchool} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Thêm">
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="min-h-11" onSelect={() => router.push(editHref(profile.profileId))}>
                  Sửa hồ sơ
                </DropdownMenuItem>
                {snapshot?.palaces && (
                  <>
                    <DropdownMenuItem className="min-h-11" onSelect={() => setView(view === "grid" ? "list" : "grid")}>
                      {view === "grid" ? <List aria-hidden /> : <LayoutGrid aria-hidden />}
                      {view === "grid" ? "Xem dạng danh sách" : "Xem dạng lưới"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="min-h-11" onSelect={() => setFullOpen(true)}>
                      Toàn bộ sao
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Segmented<ViewMode>
        label="Chế độ xem"
        value={mode}
        onChange={changeMode}
        options={[
          { value: "goc", label: "Gốc" },
          { value: "van-han", label: "Vận hạn" },
        ]}
      />

      {mode === "van-han" && snapshot && (
        <FortuneView
          profile={profile}
          profiles={profiles}
          snapshot={snapshot}
          door={door}
          defaultSchool={defaultSchool}
          onOpenProfile={(p) => window.history.pushState(null, "", chartHref(p.profileId, { xem: "van-han" }))}
        />
      )}

      {mode === "goc" && hint && (
        <p className="flex items-center gap-2 rounded-2xl border border-gold/40 bg-[color-mix(in_oklab,var(--gold)_8%,var(--card))] p-3 text-sm animate-in fade-in duration-500">
          <Sparkles className="size-4 shrink-0 text-gold" aria-hidden />
          {door === "B" ? (
            <>
              Xem cho cả nhà?{" "}
              <Link href="/ho-so/moi" className="font-medium text-primary underline-offset-4 hover:underline">
                Thêm người thân
              </Link>
            </>
          ) : (
            "Chạm vào cung Mệnh (viền vàng) để bắt đầu đọc lá số."
          )}
        </p>
      )}

      {result.error && (
        <p role="alert" className="rounded-2xl bg-muted p-3 text-sm">
          Không lập được lá số: {result.error}
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {warnings.map((w) => (
            <li key={w.code} className="flex gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-xung" aria-hidden />
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      )}

      {mode === "goc" && snapshot && codes.has("UNSUPPORTED_DAY30") && (
        <section className="surface flex flex-col gap-2 rounded-2xl border p-4">
          <h2 className="font-serif text-lg font-semibold">Chưa hỗ trợ ngày này</h2>
          <p className="text-sm text-muted-foreground">
            Tinh Bàn chưa an sao được cho ngày {formatLunar(snapshot.lunar)} âm lịch và không đoán thay. Ngày này sẽ được hỗ trợ trong bản cập nhật tới.
          </p>
        </section>
      )}

      {mode === "goc" && snapshot?.yearStars && (
        <>
          <p className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-muted px-2 font-medium">Thiếu giờ sinh</span>
            <span className="text-muted-foreground">Chỉ có các sao an theo năm, theo địa chi.</span>
          </p>
          <YearStarsGrid yearStars={snapshot.yearStars} labels={chartLabels} center={<Center profile={profile} name={name} snapshot={snapshot} />} />
        </>
      )}

      {mode === "goc" && snapshot?.palaces && (
        <>
          <h1 className="sr-only">Lá số của {name}</h1>
          {view === "grid" ? (
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-4">
              <ChartGrid
                palaces={snapshot.palaces}
                labels={chartLabels}
                center={<Center profile={profile} name={name} snapshot={snapshot} />}
                showStems={profile.schoolId === "bac"}
                selected={selected}
                onSelect={select}
                strong={selection?.strong ?? []}
                soft={selection?.soft ?? []}
                arrows={selection?.arrows ?? []}
                badges={selection?.badges ?? {}}
              />
              <div className="mt-2 flex flex-col gap-3 lg:mt-0">
                <p aria-live="polite" className="min-h-11 text-sm">
                  {selection?.summary || (profile.schoolId === "bac" ? "Chạm vào một cung để xem phi hóa từ thiên can của cung." : "Chạm vào một cung để xem tam phương tứ chính.")}
                </p>
                {selectedPalace && (
                  <>
                    <Button className="lg:hidden" onClick={() => setDetailOpen(true)}>
                      Chi tiết cung {chartLabels.palaceName(selectedPalace.key, selectedPalace.name)}
                    </Button>
                    <section className="surface hidden flex-col border gap-3 rounded-2xl p-4 lg:flex" aria-label="Chi tiết cung">
                      <h2 className="font-serif text-lg font-semibold">{palaceTitle(selectedPalace, profile.schoolId === "bac")}</h2>
                      <PalaceDetailContent key={selectedPalace.key} snapshot={snapshot} palace={selectedPalace} />
                    </section>
                  </>
                )}
                <Legend />
              </div>
            </div>
          ) : (
            <ChartList palaces={snapshot.palaces} labels={chartLabels} showStems={profile.schoolId === "bac"} />
          )}
          <Dialog open={fullOpen} onOpenChange={setFullOpen}>
            <DialogContent className="max-h-[95dvh] max-w-[min(100vw,1000px)] overflow-auto sm:max-w-[min(100vw,1000px)]">
              <DialogHeader>
                <DialogTitle>Toàn bộ sao</DialogTitle>
              </DialogHeader>
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <ChartGrid
                    palaces={snapshot.palaces}
                    labels={chartLabels}
                    center={<Center profile={profile} name={name} snapshot={snapshot} />}
                    showStems={profile.schoolId === "bac"}
                    selected={null}
                    onSelect={() => undefined}
                    full
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {snapshot && selectedPalace && (
        <PalaceDetailSheet
          key={selectedPalace.key}
          snapshot={snapshot}
          palace={selectedPalace}
          showStems={profile.schoolId === "bac"}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
      <KeepSafeSheet profile={profile} open={keepSafeOpen} onOpenChange={closeKeepSafe} />
    </main>
  );
}
