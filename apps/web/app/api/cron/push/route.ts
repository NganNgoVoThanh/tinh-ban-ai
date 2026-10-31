import { NextResponse } from "next/server";
import { storeFromEnv } from "@/lib/server/ai";
import { sendDaily, vapidSender } from "@/lib/server/push";

/**
 * Gửi nhắc "Xem ngày hôm nay" mỗi sáng (Technical Plan mục 15). Chỉ Vercel Cron gọi được: Vercel gửi
 * kèm `Authorization: Bearer $CRON_SECRET`. Lịch ở vercel.json (00:00 UTC = 07:00 giờ Việt Nam).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const send = vapidSender(process.env);
  if (!send) return NextResponse.json({ skipped: "vapid_not_configured" });
  const result = await sendDaily(storeFromEnv(process.env), send);
  console.info(JSON.stringify({ type: "push_daily", ...result }));
  return NextResponse.json(result);
}
