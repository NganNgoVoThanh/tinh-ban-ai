import { Crown } from "lucide-react";
import Link from "next/link";
import { CURRENT_PLAN, planName } from "@/lib/plans";

/** Chip gói hiện tại của máy, bấm để mở trang Các gói. */
export function PlanBadge() {
  const paid = CURRENT_PLAN !== "free";
  return (
    <Link
      href="/goi"
      aria-label={`Gói hiện tại: ${planName(CURRENT_PLAN)}. Xem các gói`}
      className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        paid ? "border-gold text-gold" : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <Crown className={`size-3.5 ${paid ? "" : "text-gold"}`} aria-hidden />
      {planName(CURRENT_PLAN)}
    </Link>
  );
}
