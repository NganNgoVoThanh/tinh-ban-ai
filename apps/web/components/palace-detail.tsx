"use client";

import { describeFact, PALACES } from "@tinhban/kb";
import { answerSuggested, palaceInsights, suggestedQuestions, type Insight, type SuggestedQuestion } from "@tinhban/narrative";
import type { ChartSnapshot, PalaceFacts, StarFact } from "@tinhban/shared";
import { ContentBlock, ContentTag, ELEMENT_CLASS, SubLabel } from "@tinhban/ui";
import { useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/sheet";
import { trackEvent } from "@/lib/analytics";
import { chartLabels } from "@/lib/chart-labels";
import { KB } from "@/lib/kb";

function StarList({ stars }: { stars: StarFact[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {stars.map((s) => {
        const el = chartLabels.elementOf(s.key);
        return (
          <li key={s.key}>
            <span className={el ? ELEMENT_CLASS[el] : undefined}>{chartLabels.starName(s.key, s.name)}</span>
            {s.brightness && <span className="text-muted-foreground"> ({chartLabels.brightnessName(s.brightness)})</span>}
            {s.mutagen && <span className="font-semibold"> Hóa {chartLabels.mutagenName(s.mutagen)}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Một nhận định 3 tầng: tầng 1 hiện sẵn, "Vì sao?" (tầng 2) và "Nguồn" (tầng 3) mở khi cần. */
export function InsightCard({ insight, palaceKey, schoolId }: { insight: Insight; palaceKey: string; schoolId: string }) {
  return (
    <ContentBlock
      kind={insight.label}
      title={<span className="text-base leading-snug font-medium">{insight.headline}</span>}
      extra={insight.subLabels.map((l) => (
        <SubLabel key={l}>{l}</SubLabel>
      ))}
    >
      <Accordion type="multiple" onValueChange={(v) => v.forEach((level) => trackEvent("insight_opened", { level: Number(level), palace: palaceKey, school: schoolId }))}>
        <AccordionItem value="2">
          <AccordionTrigger className="min-h-11">Vì sao?</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 text-sm">
            <p>{insight.because}</p>
            <div className="flex flex-wrap items-center gap-1">
              <ContentTag kind="fact" />
              {insight.facts.map((f) => (
                <span key={f} className="rounded-full bg-muted px-2 text-xs">
                  {describeFact(f)}
                </span>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="3">
          <AccordionTrigger className="min-h-11">Nguồn</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 text-sm">
            <p>{insight.detail}</p>
            <ul className="text-muted-foreground">
              {insight.citations.map((c, i) => (
                <li key={i}>
                  {c.title}
                  {c.edition && `, ${c.edition}`}
                  {c.page !== undefined && `, tr. ${c.page}`}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </ContentBlock>
  );
}

/** Nội dung bảng chi tiết cung (Technical Plan mục 12): sao, tối đa 3 nhận định, câu hỏi gợi ý. */
export function PalaceDetailContent({ snapshot, palace }: { snapshot: ChartSnapshot; palace: PalaceFacts }) {
  const insights = useMemo(() => palaceInsights(snapshot, KB, palace.key), [snapshot, palace.key]);
  const questions = useMemo(() => suggestedQuestions(snapshot, KB, palace.key), [snapshot, palace.key]);
  const [asked, setAsked] = useState<{ q: SuggestedQuestion; answer: Insight[] } | null>(null);
  const ask = (q: SuggestedQuestion) => {
    setAsked({ q, answer: answerSuggested(snapshot, KB, q) });
    trackEvent("suggested_q_tapped", { question_type: q.questionType });
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Chính tinh</h3>
        {palace.majorStars.length ? <StarList stars={palace.majorStars} /> : <p className="text-sm italic">Vô chính diệu</p>}
        {palace.minorStars.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-muted-foreground">Phụ tinh</h3>
            <StarList stars={palace.minorStars} />
          </>
        )}
        <Accordion type="single" collapsible>
          <AccordionItem value="other">
            <AccordionTrigger className="min-h-11 text-sm">Sao khác ({palace.adjectiveStars.length})</AccordionTrigger>
            <AccordionContent>
              <StarList stars={palace.adjectiveStars} />
              <p className="mt-2 text-sm text-muted-foreground">
                Vòng Tràng sinh: {palace.rings.changsheng} · Đại hạn {palace.decadal.from}–{palace.decadal.to}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section className="flex flex-col gap-3">
        {insights.length ? (
          insights.map((i) => <InsightCard key={i.ruleId} insight={i} palaceKey={palace.key} schoolId={snapshot.schoolId} />)
        ) : (
          <p className="rounded-2xl bg-muted p-3 text-sm">Chưa có nhận định đã duyệt cho cung này.</p>
        )}
      </section>

      {questions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">Câu hỏi gợi ý</h3>
          {questions.map((q) => (
            <Button key={q.questionType} variant="outline" className="h-auto min-h-11 justify-start text-left whitespace-normal" onClick={() => ask(q)}>
              {q.text}
            </Button>
          ))}
          {asked?.answer.map((i) => <InsightCard key={i.ruleId} insight={i} palaceKey={palace.key} schoolId={snapshot.schoolId} />)}
        </section>
      )}
    </div>
  );
}

export const palaceTitle = (p: PalaceFacts, showStems: boolean) =>
  `${PALACES[p.key] ?? p.name}${p.isBody ? " · Thân" : ""} · ${showStems ? `${p.stem} ${p.branch}` : p.branch}`;

/** Bảng kéo lên trên điện thoại, hộp thoại trên máy tính bảng; từ lg chi tiết hiện ở cột phải (chart-screen). */
export function PalaceDetailSheet({
  snapshot,
  palace,
  showStems,
  open,
  onOpenChange,
}: {
  snapshot: ChartSnapshot;
  palace: PalaceFacts;
  showStems: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-display text-2xl font-semibold">{palaceTitle(palace, showStems)}</SheetTitle>
        </SheetHeader>
        <div className="mx-auto w-full max-w-140 overflow-y-auto px-4 pb-6">
          <PalaceDetailContent snapshot={snapshot} palace={palace} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
