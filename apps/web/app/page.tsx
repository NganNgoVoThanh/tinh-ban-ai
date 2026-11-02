import type { Metadata } from "next";
import { BookOpenCheck, CalendarHeart, Check, ShieldCheck, Sparkles, WifiOff } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Emblem } from "@/components/emblem";
import { DoorCards, HeroAction, LandingDoors, SampleChart } from "@/components/landing";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: { absolute: "Tinh Bàn · Lá số Tử Vi có căn cứ" },
  description: "Lập lá số Tử Vi theo Nam phái hoặc Bắc phái, tính ngay trên máy. Mỗi nhận định có căn cứ và nguồn. Xem ngày cho cả nhà.",
  openGraph: {
    title: "Tinh Bàn",
    description: "Lá số Tử Vi tính trên máy, mỗi nhận định có căn cứ và nguồn.",
    locale: "vi_VN",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Tinh Bàn",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  inLanguage: "vi",
  offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
};

const FEATURES = [
  { icon: ShieldCheck, title: "Tính trên máy", text: "Ngày giờ sinh không rời máy của bạn. Không cần tài khoản." },
  { icon: BookOpenCheck, title: "Có căn cứ và nguồn", text: "Mỗi nhận định chỉ rõ sao, cung nào trong lá số và sách nào nói vậy." },
  { icon: CalendarHeart, title: "Cho cả nhà", text: "Xem ngày, giờ tốt, hợp xung theo tuổi và vận năm của mọi người." },
];

/** Nhãn nổi trang trí quanh lá số mẫu (trình đọc màn hình bỏ qua). */
function FloatingTag({ className, icon, children }: { className: string; icon: ReactNode; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={`absolute z-10 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium shadow-[0_12px_30px_-14px_rgb(120_20_30/0.45)] backdrop-blur animate-float ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
        <span className="h-px w-6 bg-primary" aria-hidden />
        {eyebrow}
      </span>
      <h2 id={id} className="font-display text-[28px] leading-tight font-semibold">
        {title}
      </h2>
    </div>
  );
}

/** Trang giới thiệu (Technical Plan mục 12, giao diện theo ADR 0007), sinh tĩnh. */
export default function Landing() {
  const free = PLANS.find((p) => p.id === "free")!;
  return (
    <main className="flex w-full flex-col pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="aurora border-b border-border/60">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 pt-3 pb-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:pb-20">
          <header className="flex items-center justify-between lg:col-span-2">
            <Link href="/" className="flex min-h-11 items-center gap-2 font-serif text-xl font-semibold">
              <Emblem className="size-8 text-gold" />
              Tinh Bàn
            </Link>
            <nav aria-label="Trang giới thiệu" className="flex items-center gap-1 text-sm">
              <Link href="/goi" className="flex min-h-11 items-center px-3 text-muted-foreground transition-colors hover:text-foreground">
                Các gói
              </Link>
              <Link
                href="/app"
                className="flex min-h-11 items-center rounded-full border border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-card/70 px-4 font-medium text-primary backdrop-blur transition-colors hover:bg-card"
              >
                Mở app ▸
              </Link>
            </nav>
          </header>

          <div className="flex flex-col gap-5">
            <span className="flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] bg-card/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-700">
              <Sparkles className="size-3.5 text-gold" aria-hidden />
              Tử Vi Nam phái và Bắc phái
            </span>
            <h1 className="font-display text-[36px] leading-[1.12] font-semibold text-balance animate-in fade-in slide-in-from-bottom-3 duration-700 delay-80 fill-mode-both sm:text-[52px]">
              Lá số Tử Vi <span className="text-son-gradient">có căn cứ</span>, tính ngay trên máy của bạn
            </h1>
            <p className="max-w-prose text-base text-muted-foreground animate-in fade-in slide-in-from-bottom-3 duration-700 delay-160 fill-mode-both">
              Mỗi nhận định đều chỉ ra sao, cung nào trong lá số và nguồn sách. Gọn như một cuốn lịch tốt, không phán đoán mơ hồ.
            </p>
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-240 fill-mode-both">
              <HeroAction />
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-gold" aria-hidden /> Riêng tư
              </li>
              <li className="flex items-center gap-1.5">
                <WifiOff className="size-4 text-gold" aria-hidden /> Dùng được cả khi không có mạng
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-4 text-gold" aria-hidden /> Phần cốt lõi miễn phí
              </li>
            </ul>
          </div>

          <div className="relative px-2 py-4 animate-in fade-in zoom-in-95 duration-1000 delay-200 fill-mode-both">
            <Emblem className="pointer-events-none absolute top-1/2 left-1/2 size-[130%] -translate-x-1/2 -translate-y-1/2 text-gold opacity-[0.1]" spin core={false} />
            <SampleChart />
            <FloatingTag className="-top-1 left-0" icon={<Sparkles className="size-3.5 text-gold" />}>
              Tứ hóa · phi hóa
            </FloatingTag>
            <FloatingTag className="right-0 -bottom-1 [animation-delay:-3s]" icon={<span className="size-2 rounded-full bg-primary" />}>
              Tam phương tứ chính
            </FloatingTag>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 pt-10">
        <section id="bat-dau" aria-labelledby="bat-dau-title" className="flex scroll-mt-6 flex-col gap-4">
          <SectionTitle id="bat-dau-title" eyebrow="Bắt đầu" title="Bạn muốn xem điều gì trước?" />
          <Suspense fallback={<DoorCards />}>
            <LandingDoors />
          </Suspense>
        </section>

        <section aria-labelledby="khac-biet" className="flex flex-col gap-4">
          <SectionTitle id="khac-biet" eyebrow="Khác biệt" title="Tinh tế, có căn cứ, riêng tư" />
          <ul className="grid gap-3 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="group surface flex gap-4 rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--gold)_45%,var(--border))] hover:shadow-[0_22px_44px_-26px_rgb(131_92_18/0.45)] sm:flex-col sm:gap-2 sm:p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))] text-primary transition-transform duration-300 group-hover:scale-110">
                  <f.icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="flex flex-col gap-1">
                  <h3 className="font-serif text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="goi-title" className="son overflow-hidden rounded-3xl p-6 sm:p-10">
          <Emblem className="pointer-events-none absolute -top-20 -right-20 size-72 text-gold opacity-15" spin core={false} />
          <div className="relative flex flex-col gap-4 sm:max-w-lg">
            <span className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Các gói</span>
            <h2 id="goi-title" className="font-display text-[28px] leading-tight font-semibold">
              Miễn phí cho những điều cốt lõi
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              {free.features.slice(0, 4).map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">Tinh Bàn Plus cho người muốn đọc sâu hơn đang được chuẩn bị.</p>
            <Button asChild size="lg" variant="gold" className="shine w-fit rounded-full px-6">
              <Link href="/goi">So sánh các gói</Link>
            </Button>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-border pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Emblem className="size-6 text-gold" /> Tinh Bàn
          </span>
          <nav aria-label="Liên kết khác" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/khoi-phuc" className="flex min-h-11 items-center text-primary">
              Đã có mã hồ sơ
            </Link>
            <Link href="/tri-thuc" className="flex min-h-11 items-center text-primary">
              Tri thức Tử Vi
            </Link>
            <Link href="/goi" className="flex min-h-11 items-center text-primary">
              Các gói
            </Link>
            <Link href="/quyen-rieng-tu" className="flex min-h-11 items-center text-primary">
              Quyền riêng tư
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
