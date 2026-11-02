"use client";

import { Check, Crown, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { Emblem } from "@/components/emblem";
import { InterestSheet } from "@/components/interest-sheet";
import { Segmented } from "@/components/segmented";
import { BackTitle, TopBar } from "@/components/top-bar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { COMPARISON, CURRENT_PLAN, FREE_DAILY_QUESTIONS, formatVnd, PLANS, planName, yearlySaving, type Plan, type ProductId } from "@/lib/plans";
import { useDailyQuota } from "@/lib/quota";
import { toIso } from "@/lib/today";
import { useToday } from "@/lib/use-today";

type Billing = "month" | "year";

const FAQ = [
  {
    q: "Bản Miễn phí có bị giới hạn thời gian không?",
    a: "Không. Lá số, Hôm nay, Vận hạn và câu hỏi gợi ý thuộc bản Miễn phí, không có hạn dùng. Chỉ câu hỏi tự do gửi lên máy chủ mới tính lượt.",
  },
  {
    q: "Lượt hỏi tính thế nào?",
    a: `Bản Miễn phí có ${FREE_DAILY_QUESTIONS} câu hỏi tự do mỗi ngày trên mỗi máy, đổi lúc 0 giờ (giờ Việt Nam). Câu gợi ý và câu được trả lời ngay trên máy không tính lượt.`,
  },
  {
    q: "Khi nào có bản trả phí?",
    a: "Tinh Bàn chưa thu tiền. Giá trên trang này là giá dự kiến, quyền lợi có thể đổi trước khi mở bán. Bấm “Báo tôi khi mở bán” để được báo.",
  },
  {
    q: "Trả phí có phải gửi ngày giờ sinh lên máy chủ không?",
    a: "Không. Lá số vẫn tính trên máy như bản Miễn phí. Câu hỏi tự do chỉ gửi câu hỏi và dữ kiện lá số của các cung liên quan, không có tên hay ngày giờ sinh.",
  },
];

function Price({ plan, billing }: { plan: Plan; billing: Billing }) {
  const p = plan.expectedPrice;
  if (plan.id === "free") {
    return (
      <p className="flex items-baseline gap-1">
        <span className="font-display text-4xl font-semibold">0đ</span>
        <span className="text-sm text-muted-foreground">không giới hạn thời gian</span>
      </p>
    );
  }
  if (!p) return <p className="text-sm text-muted-foreground">Giá công bố khi mở bán</p>;
  if ("pack" in p) {
    return (
      <p className="flex flex-wrap items-baseline gap-1">
        <span className="font-display text-4xl font-semibold tabular-nums">{formatVnd(p.pack)}</span>
        <span className="text-sm text-muted-foreground">một lần · giá dự kiến</span>
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex flex-wrap items-baseline gap-1">
        <span className="font-display text-4xl font-semibold tabular-nums">{formatVnd(billing === "year" ? p.year : p.month)}</span>
        <span className="text-sm text-muted-foreground">/{billing === "year" ? "năm" : "tháng"} · giá dự kiến</span>
      </p>
      {billing === "year" && <p className="text-xs text-muted-foreground tabular-nums">≈ {formatVnd(Math.round(p.year / 12 / 1000) * 1000)} mỗi tháng</p>}
    </div>
  );
}

function PlanCard({ plan, billing, onInterest }: { plan: Plan; billing: Billing; onInterest: (products: ProductId[]) => void }) {
  const current = plan.id === CURRENT_PLAN;
  const featured = plan.id === "plus";
  const products = plan.products ? [typeof plan.products === "string" ? plan.products : plan.products[billing]] : [];
  return (
    <li
      className={`relative flex flex-col gap-4 overflow-hidden rounded-3xl border p-5 ${
        featured ? "son border-transparent md:-my-3 md:py-8" : "surface"
      }`}
    >
      {featured && <Emblem className="pointer-events-none absolute -top-14 -right-14 size-48 text-gold opacity-15" spin core={false} />}
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="flex items-center gap-2 font-serif text-xl font-semibold">
            {featured && <Crown className="size-5 text-gold" aria-hidden />}
            {plan.name}
          </h3>
          <p className="text-sm text-muted-foreground">{plan.tagline}</p>
        </div>
        {current ? (
          <span className="shrink-0 rounded-full bg-hop/10 px-2.5 py-1 text-xs font-semibold text-hop">Đang dùng</span>
        ) : featured ? (
          <span className="shrink-0 rounded-full border border-gold/70 px-2.5 py-1 text-xs font-semibold text-gold">Đầy đủ nhất</span>
        ) : null}
      </div>
      <div className="relative">
        <Price plan={plan} billing={billing} />
      </div>
      <ul className="relative flex flex-1 flex-col gap-2 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className={`mt-0.5 size-4 shrink-0 ${featured ? "text-gold" : "text-hop"}`} aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      {current ? (
        <Button variant="outline" size="lg" className="relative rounded-full" disabled>
          Gói hiện tại của bạn
        </Button>
      ) : (
        <Button
          size="lg"
          variant={featured ? "gold" : "outline"}
          className={`relative rounded-full ${featured ? "shine" : ""}`}
          onClick={() => onInterest(products)}
        >
          Báo tôi khi mở bán
        </Button>
      )}
    </li>
  );
}

function Mark({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="tabular-nums">{value}</span>;
  return value ? (
    <>
      <Check className="mx-auto size-4 text-hop" aria-hidden />
      <span className="sr-only">Có</span>
    </>
  ) : (
    <>
      <Minus className="mx-auto size-4 text-muted-foreground" aria-hidden />
      <span className="sr-only">Không</span>
    </>
  );
}

/**
 * Trang Các gói: gói hiện tại của máy và lượt hỏi hôm nay, ba gói (giá dự kiến), bảng so sánh, câu hỏi
 * thường gặp. P0 chưa thu tiền: nút trên thẻ gói mở bảng "Quan tâm bản trả phí" (Technical Plan mục 14).
 */
export function PlansScreen() {
  const today = useToday();
  const [quota] = useDailyQuota(today ? toIso(today) : null, FREE_DAILY_QUESTIONS);
  const [billing, setBilling] = useState<Billing>("year");
  const [interest, setInterest] = useState<ProductId[] | null>(null);
  const plus = PLANS.find((p) => p.id === "plus")!;
  const saving = plus.expectedPrice && "year" in plus.expectedPrice ? yearlySaving(plus.expectedPrice) : null;

  useEffect(() => trackEvent("plans_viewed"), []);

  const openInterest = (products: ProductId[]) => {
    products.forEach((product) => trackEvent("interest_clicked", { product }));
    setInterest(products);
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-12 lg:px-8">
      <TopBar left={<BackTitle href="/ho-so" title="Các gói" />} />

      <section aria-label="Gói của bạn" className="son flex items-center gap-4 overflow-hidden rounded-3xl p-5 animate-in fade-in zoom-in-95 duration-500 sm:p-7">
        <Emblem className="size-16 shrink-0 text-gold sm:size-20" spin />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Gói của bạn</span>
          <p className="font-display text-3xl leading-tight font-semibold">{planName(CURRENT_PLAN)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {quota ? `Còn ${quota.remaining}/${quota.total} câu hỏi tự do hôm nay` : `${FREE_DAILY_QUESTIONS} câu hỏi tự do mỗi ngày`} · câu gợi ý không giới hạn
          </p>
        </div>
      </section>

      <section aria-labelledby="plans-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 id="plans-title" className="font-display text-[28px] leading-tight font-semibold">
              Chọn cách bạn đọc lá số
            </h2>
            <p className="text-sm text-muted-foreground">Phần cốt lõi luôn miễn phí. Bản trả phí đang chuẩn bị, chưa thu tiền.</p>
          </div>
          <div className="sm:w-72">
            <Segmented<Billing>
              label="Trả theo"
              value={billing}
              onChange={setBilling}
              options={[
                { value: "month", label: "Theo tháng" },
                { value: "year", label: saving ? `Theo năm · −${saving}%` : "Theo năm" },
              ]}
            />
          </div>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} billing={billing} onInterest={openInterest} />
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Giá dự kiến; giá và quyền lợi có thể đổi trước khi mở bán.</p>
      </section>

      <section aria-labelledby="compare-title" className="flex flex-col gap-3">
        <h2 id="compare-title" className="font-serif text-xl font-semibold">
          So sánh Miễn phí và Plus
        </h2>
        <div className="surface overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-left">
                <th scope="col" className="p-3 font-medium text-muted-foreground">
                  Tính năng
                </th>
                <th scope="col" className="w-24 p-3 text-center font-medium sm:w-36">
                  Miễn phí
                </th>
                <th scope="col" className="w-24 p-3 text-center font-semibold text-primary sm:w-36">
                  Plus
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARISON.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="p-3 text-left font-normal">
                    {r.label}
                  </th>
                  <td className="p-3 text-center">
                    <Mark value={r.free} />
                  </td>
                  <td className="bg-[color-mix(in_oklab,var(--primary)_4%,var(--card))] p-3 text-center font-medium">
                    <Mark value={r.plus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="flex flex-col gap-2">
        <h2 id="faq-title" className="font-serif text-xl font-semibold">
          Câu hỏi thường gặp
        </h2>
        <Accordion type="single" collapsible className="surface rounded-2xl border px-4">
          {FAQ.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="min-h-11 text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {interest && <InterestSheet open initial={interest} onOpenChange={(o) => !o && setInterest(null)} />}
    </main>
  );
}
