"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

/** Nút "Lập lá số của bạn" trên trang tri thức: mở trang giới thiệu với ref=kb (Technical Plan mục 14). */
export function KbCta({ slug }: { slug: string }) {
  return (
    <Button asChild size="lg" className="w-fit rounded-full">
      <Link href="/?ref=kb" onClick={() => trackEvent("kb_page_cta_clicked", { slug })}>
        Lập lá số của bạn
      </Link>
    </Button>
  );
}
