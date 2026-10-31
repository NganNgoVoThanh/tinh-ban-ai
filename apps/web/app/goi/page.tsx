import type { Metadata } from "next";
import { PlansScreen } from "@/components/plans-screen";

export const metadata: Metadata = {
  title: "Các gói",
  description: "Tinh Bàn miễn phí cho lá số, xem ngày và vận hạn. So sánh với Tinh Bàn Plus và gói lượt hỏi.",
};

export default function PlansPage() {
  return <PlansScreen />;
}
