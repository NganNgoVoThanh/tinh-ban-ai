import type { Metadata } from "next";
import { Suspense } from "react";
import { TodayScreen } from "@/components/today-screen";

export const metadata: Metadata = { title: "Hôm nay" };

export default function TodayPage() {
  return (
    <Suspense fallback={null}>
      <TodayScreen />
    </Suspense>
  );
}
