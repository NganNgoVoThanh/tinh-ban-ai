import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartScreen } from "@/components/chart-screen";

export const metadata: Metadata = { title: "Lá số" };

/** Lá số tính trên máy từ hồ sơ trong IndexedDB; server chỉ trả khung trang (ADR 0003). */
export default function ChartPage() {
  return (
    <Suspense fallback={null}>
      <ChartScreen />
    </Suspense>
  );
}
