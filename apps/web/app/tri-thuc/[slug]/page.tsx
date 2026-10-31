import { renderGeneric } from "@tinhban/kb";
import { SCHOOL_NAMES } from "@tinhban/shared";
import { ContentBlock, SubLabel } from "@tinhban/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KbCta } from "@/components/kb-cta";
import { KB } from "@/lib/kb";
import { PUBLIC_PAGES } from "@/lib/public-pages";
import { SITE_URL } from "@/lib/site";

/** Kho chưa có trang công khai: vẫn cần một tham số để build tĩnh; trang này trả 404. */
const PLACEHOLDER = "_";

export function generateStaticParams() {
  return PUBLIC_PAGES.length ? PUBLIC_PAGES.map((p) => ({ slug: p.slug })) : [{ slug: PLACEHOLDER }];
}

const pageOf = (slug: string) => PUBLIC_PAGES.find((p) => p.slug === slug);

export async function generateMetadata({ params }: PageProps<"/tri-thuc/[slug]">): Promise<Metadata> {
  const page = pageOf((await params).slug);
  if (!page) return {};
  const description = renderGeneric(page.rule.headline, page.rule.conditions);
  return {
    title: page.title,
    description,
    alternates: { canonical: `/tri-thuc/${page.slug}` },
    openGraph: { title: page.title, description, type: "article", locale: "vi_VN" },
  };
}

/**
 * Trang tri thức công khai (Technical Plan mục 14), sinh tĩnh từ đơn vị `public: true` từ L1: tiêu đề,
 * nội dung tầng 1 và 2, nguồn, nhãn phái nếu chỉ thuộc một phái, nút "Lập lá số của bạn".
 */
export default async function KnowledgePage({ params }: PageProps<"/tri-thuc/[slug]">) {
  const page = pageOf((await params).slug);
  if (!page) notFound();
  const { rule } = page;
  const titles = new Map(KB.sources.map((s) => [s.sourceId, s.title]));
  const citations = rule.citations.map((c) => [titles.get(c.sourceId) ?? c.sourceId, c.edition, c.page !== undefined && `tr. ${c.page}`].filter(Boolean).join(", "));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    inLanguage: "vi",
    dateModified: rule.review.date,
    mainEntityOfPage: `${SITE_URL}/tri-thuc/${page.slug}`,
    publisher: { "@type": "Organization", name: "Tinh Bàn" },
    citation: citations,
  };

  return (
    <main className="mx-auto flex w-full max-w-140 flex-col gap-5 px-4 pt-4 pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Đường dẫn" className="text-sm">
        <Link href="/tri-thuc" className="flex min-h-11 items-center text-primary">
          ‹ Tri thức Tử Vi
        </Link>
      </nav>
      <h1 className="font-display text-[28px] leading-tight font-semibold">{page.title}</h1>
      <ContentBlock
        kind={rule.kind === "folk" ? "folk" : "interpretation"}
        extra={
          <>
            {rule.review.level === "L1" && <SubLabel>Chưa qua chuyên gia</SubLabel>}
            {rule.schools?.length === 1 && <SubLabel>{SCHOOL_NAMES[rule.schools[0]!]}</SubLabel>}
          </>
        }
      >
        <p className="text-base leading-relaxed font-medium">{renderGeneric(rule.headline, rule.conditions)}</p>
        <p className="mt-2 text-sm">Vì sao: {renderGeneric(rule.because, rule.conditions)}</p>
      </ContentBlock>
      <section className="flex flex-col gap-1 text-sm">
        <h2 className="font-medium">Nguồn</h2>
        <ul className="text-muted-foreground">
          {citations.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-muted-foreground">Nhận định áp dụng khi lá số khớp đủ điều kiện. Lập lá số để xem nhận định nào khớp với bạn, kèm căn cứ.</p>
      <KbCta slug={page.slug} />
    </main>
  );
}
