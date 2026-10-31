import type { Metadata } from "next";
import { Suspense } from "react";
import { AskScreen } from "@/components/ask-screen";

export const metadata: Metadata = { title: "Hỏi" };

/** Hỏi và lịch sử hỏi (Technical Plan mục 10). Lịch sử chỉ nằm trên máy; server chỉ trả khung trang. */
export default function AskPage() {
  return (
    <Suspense fallback={null}>
      <AskScreen />
    </Suspense>
  );
}
