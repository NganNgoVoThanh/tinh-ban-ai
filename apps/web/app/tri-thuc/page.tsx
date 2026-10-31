import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Emblem } from "@/components/emblem";
import { Button } from "@/components/ui/button";
import { PUBLIC_PAGES } from "@/lib/public-pages";

export const metadata: Metadata = {
  title: "Tri thức Tử Vi",
  description: "Các nhận định Tử Vi có căn cứ và nguồn: sao nào ở cung nào nói lên điều gì.",
  alternates: { canonical: "/tri-thuc" },
};

/** Danh mục trang tri thức công khai (Technical Plan mục 14), sinh tĩnh. */
export default function KnowledgeIndex() {
  return (
    <main className="mx-auto flex w-full max-w-140 flex-col gap-5 px-4 pt-4 pb-12">
      <nav aria-label="Đường dẫn" className="text-sm">
        <Link href="/" className="flex min-h-11 items-center text-primary">
          ‹ Tinh Bàn
        </Link>
      </nav>
      <header className="blush relative flex items-center gap-4 overflow-hidden rounded-3xl p-5">
        <Emblem className="size-14 text-gold" spin />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] leading-tight font-semibold">Tri thức Tử Vi</h1>
          <p className="text-sm text-muted-foreground">Sao nào ở cung nào nói lên điều gì, kèm căn cứ và nguồn.</p>
        </div>
      </header>
      {PUBLIC_PAGES.length ? (
        <ul className="surface divide-y divide-border overflow-hidden rounded-2xl border">
          {PUBLIC_PAGES.map((p) => (
            <li key={p.slug}>
              <Link href={`/tri-thuc/${p.slug}`} className="flex min-h-12 items-center justify-between gap-2 px-4 transition-colors hover:bg-muted">
                <span className="font-serif">{p.title}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-gold/50 p-4 text-sm text-muted-foreground">Các bài đang được soạn và duyệt nguồn.</p>
      )}
      <Button asChild size="lg" className="w-fit rounded-full">
        <Link href="/">Lập lá số của bạn</Link>
      </Button>
    </main>
  );
}
