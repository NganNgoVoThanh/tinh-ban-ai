"use client";

import { solarToLunar, yearCanChi } from "@tinhban/calendar";
import { getYearView, type YearView } from "@tinhban/chart-engine";
import { ageRelation } from "@tinhban/folk-calendar";
import { MUTAGEN_NAMES, PALACES, starName } from "@tinhban/kb";
import { SCHOOL_NAMES, type ChartSnapshot, type LocalProfile, type Mutagen } from "@tinhban/shared";
import { ContentBlock, SubLabel } from "@tinhban/ui";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Segmented } from "@/components/segmented";
import { ShareCardSheet } from "@/components/share-card-sheet";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { chartOf } from "@/lib/chart";
import { KB } from "@/lib/kb";
import { profileLabel } from "@/lib/profiles";
import { yearCardOf, type YearCard } from "@/lib/share-card";
import { useToday } from "@/lib/use-today";

/** Cung Mệnh và 5 cung hay hỏi: dòng thời gian đánh dấu năm có Lộc, Kỵ rơi vào đây. */
const CORE = new Set(["menh", "quan_loc", "tai_bach", "phu_the", "phuc_duc", "thien_di"]);
const palaceName = (key?: string) => (key ? (PALACES[key] ?? key) : "…");

function MutagenRows({ hits }: { hits: YearView["yearMutagens"] }) {
  return (
    <ul className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
      {hits.map((h) => (
        <li key={h.mutagen} className="contents">
          <span className="font-semibold">{MUTAGEN_NAMES[h.mutagen]}</span>
          <span>
            → {palaceName(h.palaceKey)} <span className="text-muted-foreground">({starName(h.starKey, h.starKey)})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const hitIn = (v: YearView, m: Mutagen) => v.yearMutagens.find((h) => h.mutagen === m && h.palaceKey && CORE.has(h.palaceKey));

/** Chế độ Một người: dải đại vận, thẻ năm, dòng thời gian 10 năm (Technical Plan mục 9). */
function SingleView({ profile, snapshot, currentYear, door }: { profile: LocalProfile; snapshot: ChartSnapshot; currentYear: number; door: "A" | "B" }) {
  const gender = profile.birth.gender;
  const [card, setCard] = useState<YearCard | null>(null);
  const [year, setYear] = useState(Math.max(currentYear, snapshot.lunar.year));
  const view = useMemo(() => getYearView(snapshot, year, gender), [snapshot, year, gender]);
  const decades = useMemo(() => [...(snapshot.palaces ?? [])].sort((a, b) => a.decadal.from - b.decadal.from), [snapshot]);
  const birth = snapshot.lunar.year;
  const selected = view.decade ?? (decades[0] ? { palaceKey: decades[0].key, from: decades[0].decadal.from, to: decades[0].decadal.to } : undefined);
  const from = selected?.from;
  const to = selected?.to;
  const timeline = useMemo(
    () => (from !== undefined && to !== undefined ? Array.from({ length: to - from + 1 }, (_, i) => getYearView(snapshot, birth + from - 1 + i, gender)) : []),
    [snapshot, from, to, birth, gender],
  );

  if (!snapshot.palaces) {
    return <p className="rounded-2xl bg-muted p-3 text-sm">Cần giờ sinh để xem đại vận và cung hạn của năm.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Điện thoại: một hàng kéo ngang. Máy tính: lưới thấy đủ 12 đại vận. */}
      <ol aria-label="Đại vận" className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 xl:grid-cols-6">
        {decades.map((p) => {
          const current = view.decade?.palaceKey === p.key;
          const decadeView = getYearView(snapshot, birth + p.decadal.from - 1, gender);
          return (
            <li key={p.key} className="snap-start">
              <button
                type="button"
                aria-current={current ? "true" : undefined}
                onClick={() => setYear(birth + p.decadal.from - 1)}
                className={`flex min-h-20 w-36 flex-col gap-0.5 rounded-2xl border bg-card p-2.5 lg:size-full text-left text-xs transition-all duration-300 hover:-translate-y-0.5 ${current ? "border-gold bg-[color-mix(in_oklab,var(--gold)_7%,var(--card))] shadow-[inset_0_0_0_1px_var(--gold),0_12px_24px_-16px_var(--gold)]" : "border-border"}`}
              >
                <span className="text-sm font-semibold tabular-nums">
                  {p.decadal.from}–{p.decadal.to} tuổi
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {birth + p.decadal.from - 1}–{birth + p.decadal.to - 1}
                </span>
                <span>
                  {palaceName(p.key)} · {p.majorStars.map((s) => starName(s.key, s.name)).join(", ") || "Vô chính diệu"}
                </span>
                {decadeView.decade?.mutagens && (
                  <span className="flex flex-wrap gap-1">
                    {decadeView.decade.mutagens.map((h) => (
                      <span key={h.mutagen} className="rounded-full bg-muted px-1.5">
                        {MUTAGEN_NAMES[h.mutagen]} {palaceName(h.palaceKey)}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Màn rộng từ 1280 px: năm đang xem bên trái, dòng thời gian của đại vận bên phải. */}
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-2 xl:items-start xl:gap-6">
        <div className="flex flex-col gap-4">
          <ContentBlock
            kind="fact"
            title={
              <span className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="Năm trước" disabled={year <= birth} onClick={() => setYear(year - 1)}>
                  <ChevronLeft aria-hidden />
                </Button>
                <span className="font-serif tabular-nums">
                  Năm {year} · {view.canChi} · {view.ageLunar} tuổi
                </span>
                <Button variant="ghost" size="icon" aria-label="Năm sau" onClick={() => setYear(year + 1)}>
                  <ChevronRight aria-hidden />
                </Button>
              </span>
            }
          >
            <div className="flex flex-col gap-2 text-sm">
              <p>
                {view.smallLimitPalaceKey && <>Tiểu hạn: {palaceName(view.smallLimitPalaceKey)} · </>}
                Lưu niên: {palaceName(view.yearPalaceKey)}
                {view.decade && (
                  <>
                    {" "}
                    · Đại vận: {palaceName(view.decade.palaceKey)} ({view.decade.from}–{view.decade.to})
                  </>
                )}
              </p>
              <p className="text-muted-foreground">Tứ hóa theo can năm {view.canChi.split(" ")[0]}:</p>
              <MutagenRows hits={view.yearMutagens} />
              <p className="text-muted-foreground">Chưa có nhận định đã duyệt về năm này.</p>
            </div>
          </ContentBlock>
          <Button variant="outline" className="w-fit" onClick={() => setCard(yearCardOf(snapshot, gender, year, window.location.origin, door, KB))}>
            <Share2 aria-hidden /> Chia sẻ năm {year}
          </Button>
        </div>
        <section aria-label="Dòng thời gian của đại vận">
          <h3 className="mb-1 text-sm font-medium text-muted-foreground">
            Đại vận {selected?.from}–{selected?.to} tuổi
          </h3>
          {/* Danh sách hẹp hơn 512 px (điện thoại, nửa màn hình): Lộc, Kỵ xuống dòng dưới để tên cung không bị cắt. */}
          <ol className="@container surface divide-y divide-border overflow-hidden rounded-2xl border">
            {timeline.map((v) => {
              const loc = hitIn(v, "loc");
              const ky = hitIn(v, "ky");
              return (
                <li key={v.lunarYear}>
                  <button
                    type="button"
                    aria-current={v.lunarYear === year ? "true" : undefined}
                    onClick={() => setYear(v.lunarYear)}
                    className={`grid min-h-11 w-full grid-cols-[3.5rem_5.5rem_2.5rem_1fr] items-center gap-x-2 gap-y-0.5 px-3 py-1.5 text-left text-sm tabular-nums @lg:grid-cols-[3.5rem_5.5rem_2.5rem_1fr_auto] ${v.lunarYear === year ? "bg-muted" : ""} ${v.lunarYear === currentYear ? "font-semibold text-gold" : ""}`}
                  >
                    <span>{v.lunarYear}</span>
                    <span>{v.canChi}</span>
                    <span>{v.ageLunar}t</span>
                    <span className="truncate">{palaceName(v.yearPalaceKey)}</span>
                    {(loc || ky) && (
                      <span className="col-[2/-1] flex flex-wrap gap-x-2 text-xs @lg:col-auto">
                        {loc && <span className="text-hop">● Lộc {palaceName(loc.palaceKey)}</span>}
                        {ky && <span className="text-xung">◆ Kỵ {palaceName(ky.palaceKey)}</span>}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-1 text-xs text-muted-foreground">● Hóa Lộc, ◆ Hóa Kỵ của năm rơi vào Mệnh hoặc 5 cung hay hỏi.</p>
        </section>
      </div>
      {card && <ShareCardSheet card={card} open onOpenChange={(o) => !o && setCard(null)} />}
    </div>
  );
}

/** Chế độ Cả nhà: mỗi hồ sơ một thẻ, đọc theo phái của hồ sơ đó (Technical Plan mục 9). */
function FamilyView({ profiles, currentYear, defaultSchool, onOpen }: { profiles: LocalProfile[]; currentYear: number; defaultSchool: string; onOpen: (p: LocalProfile) => void }) {
  const yearBranch = yearCanChi(currentYear).chi;
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {profiles.map((p, i) => {
        const s = chartOf(p).snapshot;
        if (!s) return null;
        const v = getYearView(s, currentYear, p.birth.gender);
        const rel = ageRelation(yearBranch, yearCanChi(s.lunar.year).chi);
        const needTime = !s.palaces;
        const hit = (m: Mutagen) => v.yearMutagens.find((h) => h.mutagen === m);
        return (
          <li key={p.profileId}>
            <button
              type="button"
              onClick={() => onOpen(p)}
              className="surface flex w-full flex-col gap-1 rounded-2xl border p-4 text-left text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  {profileLabel(p, i)} · {v.ageLunar} tuổi
                </span>
                {p.schoolId !== defaultSchool && <SubLabel>{SCHOOL_NAMES[p.schoolId]}</SubLabel>}
              </span>
              <span>Đại vận: {needTime ? "Cần giờ sinh" : `${palaceName(v.decade?.palaceKey)} (${v.decade?.from}–${v.decade?.to})`}</span>
              <span>Cung hạn năm: {needTime ? "Cần giờ sinh" : palaceName(v.smallLimitPalaceKey ?? v.yearPalaceKey)}</span>
              <span>
                Lộc → {needTime ? "Cần giờ sinh" : palaceName(hit("loc")?.palaceKey)} · Kỵ → {needTime ? "Cần giờ sinh" : palaceName(hit("ky")?.palaceKey)}
              </span>
              <span className="mt-1 w-fit rounded-md bg-folk-bg px-2 text-folk">
                Dân gian: tuổi {rel === "luc_xung" ? "xung" : rel ? "hợp" : "không xung, không hợp"} với năm {v.canChi}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Chế độ Vận hạn của tab Lá số; cửa B mặc định mở Cả nhà, cửa A mở Một người. */
export function FortuneView({
  profile,
  profiles,
  snapshot,
  door,
  defaultSchool,
  onOpenProfile,
}: {
  profile: LocalProfile;
  profiles: LocalProfile[];
  snapshot: ChartSnapshot;
  door: "A" | "B";
  defaultSchool: string;
  onOpenProfile: (p: LocalProfile) => void;
}) {
  const today = useToday();
  const [mode, setMode] = useState<"single" | "family">(door === "B" ? "family" : "single");
  if (!today) return null;
  const currentYear = solarToLunar({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() }, "north").year;
  const change = (m: "single" | "family") => {
    setMode(m);
    trackEvent("fortune_opened", { mode: m });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="lg:max-w-md">
        <Segmented<"single" | "family">
          label="Xem vận hạn của"
          value={mode}
          onChange={change}
          options={[
            { value: "single", label: "Một người" },
            { value: "family", label: "Cả nhà" },
          ]}
        />
      </div>
      {mode === "single" ? (
        <SingleView key={profile.profileId} profile={profile} snapshot={snapshot} currentYear={currentYear} door={door} />
      ) : (
        <FamilyView
          profiles={profiles}
          currentYear={currentYear}
          defaultSchool={defaultSchool}
          onOpen={(p) => {
            setMode("single");
            onOpenProfile(p);
          }}
        />
      )}
    </div>
  );
}
