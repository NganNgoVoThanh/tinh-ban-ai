"use client";

import { solarToLunar } from "@tinhban/calendar";
import { describeFact } from "@tinhban/kb";
import { answerSuggested, suggestedQuestions, type SuggestedQuestion } from "@tinhban/narrative";
import { SCHOOL_NAMES, type AnswerSentence, type ChartSnapshot, type LocalProfile, type QaHistoryItem, type SchoolId } from "@tinhban/shared";
import { ContentBlock, ContentTag } from "@tinhban/ui";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUp, MoreHorizontal, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/empty-state";
import { InterestSheet } from "@/components/interest-sheet";
import { PlanBadge } from "@/components/plan-badge";
import { ProfileSwitcher, SchoolSwitch, TopBar } from "@/components/top-bar";
import { Turnstile } from "@/components/turnstile";
import { Emblem } from "@/components/emblem";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { trackEvent } from "@/lib/analytics";
import { askQuestion, clearHistory, deleteHistoryItem, saveLocalAnswer } from "@/lib/ask";
import { ageOn } from "@/lib/birth-form";
import { chartOf, solarDateOf } from "@/lib/chart";
import { db } from "@/lib/db";
import { formatSolar } from "@/lib/format";
import { KB } from "@/lib/kb";
import { familyYearSentences, LOCAL_QUESTIONS, todaySentences, yearSentences, type LocalQuestion, type Person } from "@/lib/local-answers";
import { profileLabel, updateProfile, useProfile, useProfiles } from "@/lib/profiles";
import { FREE_DAILY_QUESTIONS } from "@/lib/plans";
import { useDailyQuota, writeQuota } from "@/lib/quota";
import { askHref } from "@/lib/routes";
import { updateSettings, useSettings } from "@/lib/settings";
import { toIso, weekdayName } from "@/lib/today";
import { useToday } from "@/lib/use-today";

const MAX_LENGTH = 300;

const SOURCE_TEXT: Record<QaHistoryItem["source"], string> = {
  kb: "Trả lời từ tri thức Tử Vi đã duyệt và lá số của bạn, không dùng AI.",
  cache: "Câu trả lời đã được đối chiếu với lá số và nguồn sách.",
  llm: "AI diễn đạt lại từ tri thức Tử Vi đã duyệt; từng câu đã được đối chiếu với lá số và nguồn sách.",
  fallback: "Trả lời từ tri thức Tử Vi đã duyệt, không dùng AI.",
};

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/** Các câu liền nhau cùng nhãn gộp vào một khối nội dung. */
function groupByLabel(sentences: AnswerSentence[]) {
  const groups: { label: AnswerSentence["label"]; items: AnswerSentence[] }[] = [];
  for (const s of sentences) {
    const last = groups.at(-1);
    if (last?.label === s.label) last.items.push(s);
    else groups.push({ label: s.label, items: [s] });
  }
  return groups;
}

/** Thẻ trả lời 3 tầng: tầng 1 các câu có nhãn; "Vì sao?" là dữ kiện lá số; "Nguồn" là đơn vị kho và cách trả lời. */
function AnswerCard({ item, onFollowup }: { item: QaHistoryItem; onFollowup: (q: string) => void }) {
  const { sentences, followups } = item.answer;
  const facts = [...new Set(sentences.flatMap((s) => s.factIds))];
  const rules = [...new Set(sentences.flatMap((s) => s.ruleIds))].map((id) => KB.rules.find((r) => r.ruleId === id)).filter((r) => r !== undefined);
  const titles = new Map(KB.sources.map((s) => [s.sourceId, s.title]));
  if (!sentences.length) {
    return <p className="rounded-2xl bg-muted p-3 text-sm">Chưa có căn cứ đã duyệt để trả lời câu này. Tinh Bàn không đoán khi chưa có nguồn.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {groupByLabel(sentences).map((g, i) => (
        <ContentBlock key={i} kind={g.label}>
          {g.items.map((s, j) => (
            <p key={j} className="text-sm leading-relaxed">
              {s.text}
            </p>
          ))}
        </ContentBlock>
      ))}
      <Accordion type="multiple">
        {facts.length > 0 && (
          <AccordionItem value="why">
            <AccordionTrigger className="min-h-11">Vì sao?</AccordionTrigger>
            <AccordionContent className="flex flex-wrap items-center gap-1">
              <ContentTag kind="fact" />
              {facts.map((f) => (
                <span key={f} className="rounded-full bg-muted px-2 text-xs">
                  {describeFact(f)}
                </span>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}
        <AccordionItem value="source">
          <AccordionTrigger className="min-h-11">Nguồn</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 text-sm">
            <p>{SOURCE_TEXT[item.source]}</p>
            {rules.map((r) => (
              <div key={r.ruleId}>
                <p>{r.detail}</p>
                <p className="text-muted-foreground">
                  {r.citations.map((c) => [titles.get(c.sourceId) ?? c.sourceId, c.edition, c.page !== undefined && `tr. ${c.page}`].filter(Boolean).join(", ")).join("; ")}
                </p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Theo {SCHOOL_NAMES[item.schoolId]}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {followups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {followups.map((f) => (
            <Button key={f} variant="outline" size="sm" className="h-auto min-h-11 whitespace-normal" onClick={() => onFollowup(f)}>
              {f}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

type Suggestion = { kind: "kb"; q: SuggestedQuestion } | { kind: "local"; key: LocalQuestion };

const suggestionText = (s: Suggestion) => (s.kind === "kb" ? s.q.text : LOCAL_QUESTIONS[s.key]);

/** Câu gợi ý ở tab Hỏi: cửa A bắt đầu từ lá số của mình, cửa B từ năm nay của cả nhà (mục 12). */
function suggestionsFor(snapshot: ChartSnapshot, door: "A" | "B", family: boolean): Suggestion[] {
  const palaces = snapshot.palaces ? ["menh", "quan_loc", "tai_bach", "phu_the", "phuc_duc", "thien_di"] : [];
  const kb: Suggestion[] = palaces.flatMap((p) => suggestedQuestions(snapshot, KB, p).map((q) => ({ kind: "kb" as const, q })));
  const year: Suggestion = { kind: "local", key: "year" };
  const yearFamily: Suggestion[] = family ? [{ kind: "local", key: "year_family" }] : [];
  const today: Suggestion = { kind: "local", key: "today" };
  return door === "B" ? [...yearFamily, today, year, ...kb] : [...kb, year, today, ...yearFamily];
}

function dayTitle(iso: string, todayIso: string, yesterdayIso: string) {
  if (iso === todayIso) return "Hôm nay";
  if (iso === yesterdayIso) return "Hôm qua";
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${weekdayName(new Date(y, m - 1, d).getDay())} ${formatSolar(iso)}`;
}

function NoProfile() {
  return (
    <EmptyState title="Hỏi cần có hồ sơ" text="Lập lá số trước, rồi hỏi Tinh Bàn về sự nghiệp, tình duyên hay năm nay của bạn.">
      <Button asChild size="lg">
        <Link href="/ho-so/moi">Lập lá số</Link>
      </Button>
    </EmptyState>
  );
}

/** Tab Hỏi (Technical Plan mục 10, 12): hồ sơ lấy từ ?ho-so=, rồi hồ sơ đang chọn, rồi hồ sơ đầu tiên. */
export function AskScreen() {
  const searchParams = useSearchParams();
  const settings = useSettings();
  const profiles = useProfiles();
  const profileId = searchParams.get("ho-so") ?? settings?.activeProfileId ?? profiles?.[0]?.profileId;
  const profile = useProfile(profileId);

  useEffect(() => {
    if (profile && settings && settings.activeProfileId !== profile.profileId) void updateSettings({ activeProfileId: profile.profileId });
  }, [profile, settings]);

  if (profiles === undefined || settings === undefined || profile === undefined) return null;
  if (profiles.length === 0 || profile === null) return <NoProfile />;
  return <AskView key={profile.profileId} profile={profile} profiles={profiles} door={settings.door} initialQuestion={searchParams.get("cau")} />;
}

function AskView({ profile, profiles, door, initialQuestion }: { profile: LocalProfile; profiles: LocalProfile[]; door: "A" | "B"; initialQuestion: string | null }) {
  const router = useRouter();
  const today = useToday();
  const online = useOnline();
  const snapshot = useMemo(() => chartOf(profile).snapshot, [profile]);
  const people = useMemo<Person[]>(
    () =>
      profiles.flatMap((p, i) => {
        const s = chartOf(p).snapshot;
        return s ? [{ name: profileLabel(p, i), profile: p, snapshot: s }] : [];
      }),
    [profiles],
  );
  const history = useLiveQuery(
    () => db.qa_history.where("[profileId+createdAt]").between([profile.profileId, ""], [profile.profileId, "￿"]).reverse().toArray(),
    [profile.profileId],
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: "refusal" | "error" } | null>(null);
  // null: mặc định mở câu mới nhất.
  const [open, setOpen] = useState<string[] | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [interestOpen, setInterestOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const autoAsked = useRef(false);

  const todayIso = today ? toIso(today) : null;
  const [quota, setQuota] = useDailyQuota(todayIso, FREE_DAILY_QUESTIONS);
  const under16 = today && snapshot ? ageOn(solarDateOf(profile, snapshot), today) < 16 : false;
  const currentYear = today ? solarToLunar({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() }, "north").year : null;
  const suggestions = snapshot ? suggestionsFor(snapshot, door, people.length > 1) : [];
  const exhausted = quota?.remaining === 0;
  const name = profileLabel(profile, profiles.findIndex((p) => p.profileId === profile.profileId));

  const remember = (id: string) => setOpen((o) => [id, ...(o ?? [])]);

  const answerLocal = async (s: Suggestion) => {
    if (!snapshot || !todayIso || currentYear === null) return;
    let sentences: AnswerSentence[];
    let questionType: string;
    if (s.kind === "kb") {
      questionType = s.q.questionType;
      sentences = answerSuggested(snapshot, KB, s.q).map((i) => ({ text: `${i.headline} ${i.because}.`, ruleIds: [i.ruleId], factIds: i.facts, label: i.label }));
      trackEvent("suggested_q_tapped", { question_type: questionType });
    } else {
      questionType = s.key === "today" ? "today" : "year";
      const self = people.find((p) => p.profile.profileId === profile.profileId);
      sentences =
        s.key === "today" ? todaySentences(todayIso, people) : s.key === "year_family" ? familyYearSentences(people, currentYear) : self ? yearSentences(self, currentYear, false) : [];
      trackEvent("suggested_q_tapped", { question_type: s.key });
    }
    const item = await saveLocalAnswer(profile, suggestionText(s), questionType, sentences);
    remember(item.id);
  };

  // Lối tắt "Hỏi về hôm nay" ở màn Hôm nay mở /hoi?cau=hom-nay: trả lời ngay rồi bỏ tham số khỏi địa chỉ.
  useEffect(() => {
    if (autoAsked.current || initialQuestion !== "hom-nay" || !todayIso || !snapshot) return;
    autoAsked.current = true;
    window.history.replaceState(null, "", askHref(profile.profileId));
    void answerLocal({ kind: "local", key: "today" });
  });

  const send = async (question: string, turnstileToken?: string) => {
    const q = question.trim();
    if (q.length < 2 || !snapshot || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await askQuestion({ question: q, profile, snapshot, under16, ...(turnstileToken && { turnstileToken }) });
      if (r.kind === "answer" || r.kind === "refusal") {
        if (r.quotaRemaining !== undefined && todayIso) {
          writeQuota(todayIso, r.quotaRemaining);
          setQuota((x) => ({ remaining: r.quotaRemaining!, total: x?.total ?? FREE_DAILY_QUESTIONS }));
        }
      }
      if (r.kind === "answer") {
        remember(r.item.id);
        setText("");
        setSiteKey(null);
      } else if (r.kind === "refusal") {
        setNotice({ text: r.message, kind: "refusal" });
      } else if (r.kind === "quota_exceeded") {
        if (todayIso) writeQuota(todayIso, 0);
        setQuota((x) => ({ remaining: 0, total: x?.total ?? FREE_DAILY_QUESTIONS }));
      } else if (r.kind === "turnstile_required") {
        setPending(q);
        setSiteKey(r.siteKey);
      } else if (r.kind === "offline") {
        setNotice({ text: "Cần có mạng để gửi câu hỏi tự do. Câu gợi ý vẫn trả lời được khi không có mạng.", kind: "error" });
      } else {
        setNotice({ text: r.message, kind: "error" });
      }
    } finally {
      setBusy(false);
    }
  };

  const switchSchool = async (to: SchoolId) => {
    if (to === profile.schoolId) return;
    await updateProfile(profile.profileId, { schoolId: to });
    trackEvent("school_switched", { from: profile.schoolId, to, where: "ask" });
  };

  const groups = useMemo(() => {
    const out: { day: string; items: QaHistoryItem[] }[] = [];
    for (const item of history ?? []) {
      const day = toIso(new Date(item.createdAt));
      const last = out.at(-1);
      if (last?.day === day) last.items.push(item);
      else out.push({ day, items: [item] });
    }
    return out;
  }, [history]);
  const yesterdayIso = today ? toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) : "";
  const openIds = open ?? (history?.[0] ? [history[0].id] : []);

  const inputLocked = !online || exhausted || busy || !snapshot;
  const suggestionButtons = (full: boolean) =>
    suggestions.map((s) => (
      <Button
        key={suggestionText(s)}
        variant="outline"
        className={full ? "h-auto min-h-12 justify-start rounded-xl text-left whitespace-normal" : "h-auto min-h-11 shrink-0 rounded-full whitespace-normal"}
        onClick={() => void answerLocal(s)}
      >
        {full && <Sparkles className="text-gold" aria-hidden />}
        {suggestionText(s)}
      </Button>
    ));

  return (
    <main className="mx-auto flex w-full max-w-140 flex-col gap-4 px-4">
      <TopBar
        left={<ProfileSwitcher profiles={profiles} current={profile} onSelect={(p) => window.history.pushState(null, "", askHref(p.profileId))} />}
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
                <DropdownMenuItem className="min-h-11" disabled={!history?.length} onSelect={() => setClearOpen(true)}>
                  Xóa lịch sử của hồ sơ này
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-11" onSelect={() => router.push("/goi")}>
                  Bản trả phí
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <h1 className="sr-only">Hỏi về lá số của {name}</h1>

      {history && history.length > 0 && (
        <section aria-label="Câu hỏi gợi ý" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {suggestionButtons(false)}
        </section>
      )}

      {history?.length === 0 && (
        <section className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="blush relative mb-1 flex items-center gap-4 overflow-hidden rounded-3xl p-5">
            <Emblem className="size-14 text-gold" spin />
            <div className="flex flex-col gap-1">
              <h2 className="font-serif text-lg font-semibold">Bắt đầu bằng một câu gợi ý</h2>
              <p className="text-sm text-muted-foreground">Câu gợi ý trả lời ngay, không tính lượt và dùng được cả khi không có mạng.</p>
            </div>
          </div>
          {suggestionButtons(true)}
        </section>
      )}

      {groups.length > 0 && (
        <div role="region" aria-label="Lịch sử hỏi" className="flex flex-col gap-4">
          {groups.map((g) => (
            <section key={g.day} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {todayIso ? dayTitle(g.day, todayIso, yesterdayIso) : formatSolar(g.day)} · {g.items.length} câu
              </h2>
              <Accordion
                type="multiple"
                value={openIds.filter((id) => g.items.some((x) => x.id === id))}
                onValueChange={(v) => {
                  if (v.some((id) => !openIds.includes(id))) trackEvent("qa_history_opened");
                  setOpen([...openIds.filter((id) => !g.items.some((x) => x.id === id)), ...v]);
                }}
                className="flex flex-col gap-2"
              >
                {g.items.map((item) => (
                  <AccordionItem key={item.id} value={item.id} className="surface rounded-2xl border px-4 last:border-b">
                    <AccordionTrigger className="min-h-11 text-left">
                      <span className="flex flex-col">
                        <span className="font-medium">{item.question}</span>
                        <span className="text-xs font-normal text-muted-foreground tabular-nums">
                          {new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-2">
                      <AnswerCard item={item} onFollowup={(q) => void send(q)} />
                      <Button variant="ghost" size="sm" className="min-h-11 self-end text-muted-foreground" onClick={() => void deleteHistoryItem(item.id)}>
                        <Trash2 aria-hidden /> Xóa câu này
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      )}

      <form
        data-ready="1"
        className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-auto flex flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:bottom-0"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        {notice && (
          <p role="status" className={notice.kind === "refusal" ? "rounded-2xl bg-muted p-3 text-sm" : "text-sm text-xung"}>
            {notice.text}
          </p>
        )}
        {siteKey && pending && (
          <div className="flex flex-col gap-1">
            <p className="text-sm">Xác nhận bạn không phải máy tự động để gửi câu hỏi.</p>
            <Turnstile siteKey={siteKey} onToken={(t) => void send(pending, t)} />
          </div>
        )}
        {exhausted ? (
          <p className="text-sm">
            Đã hết {quota?.total} câu hôm nay ·{" "}
            <button type="button" className="min-h-11 font-medium text-primary underline-offset-4 hover:underline" onClick={() => setInterestOpen(true)}>
              Xem các gói
            </button>
          </p>
        ) : !online ? (
          <p className="text-sm text-muted-foreground">Đang không có mạng: câu hỏi tự do cần mạng. Câu gợi ý và lịch sử vẫn dùng được.</p>
        ) : under16 ? (
          <p className="text-sm text-muted-foreground">Hồ sơ dưới 16 tuổi: câu hỏi tự do chỉ được trả lời ngay trên máy, không gửi đi đâu.</p>
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Câu hỏi của bạn"
            placeholder="Hỏi điều bạn muốn biết về lá số…"
            value={text}
            maxLength={MAX_LENGTH}
            rows={2}
            disabled={inputLocked}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(text);
              }
            }}
            className="min-h-11 resize-none rounded-2xl bg-card"
          />
          <Button type="submit" size="icon" className="rounded-full" aria-label="Gửi câu hỏi" disabled={inputLocked || text.trim().length < 2}>
            <ArrowUp aria-hidden />
          </Button>
        </div>
        <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
          <span className="flex items-center gap-2">
            <PlanBadge />
            <span>{quota && !exhausted && !under16 ? `Còn ${quota.remaining}/${quota.total} câu hôm nay` : ""}</span>
          </span>
          <span>
            {text.length}/{MAX_LENGTH}
          </span>
        </p>
      </form>

      <InterestSheet open={interestOpen} onOpenChange={setInterestOpen} />
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa lịch sử hỏi của {name}?</AlertDialogTitle>
            <AlertDialogDescription>Mọi câu hỏi và câu trả lời của hồ sơ này trên máy sẽ bị xóa. Không hoàn tác được.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive bg-none text-white shadow-none hover:bg-destructive/90 dark:text-background" onClick={() => void clearHistory(profile.profileId)}>
              Xóa lịch sử
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
