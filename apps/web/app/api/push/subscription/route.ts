import { NextResponse } from "next/server";
import { keys, storeFromEnv } from "@/lib/server/ai";
import { removeSubscription, saveSubscription, subscriptionSchema } from "@/lib/server/push";

/** Lưu hoặc xóa đăng ký Web Push (Technical Plan mục 15). Giới hạn 10 lần mỗi giờ theo IP. */
const RATE_PER_HOUR = 10;

async function limited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return (await storeFromEnv(process.env).incr(`${keys.rateIp(ip)}:push`, 1, 3600)) > RATE_PER_HOUR;
}

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 4096) return NextResponse.json({ error: "too_large" }, { status: 413 });
  if (await limited(request)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const body = subscriptionSchema.safeParse((() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })());
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await saveSubscription(storeFromEnv(process.env), body.data.installId, body.data.subscription, new Date());
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: Request) {
  const installId = new URL(request.url).searchParams.get("installId") ?? "";
  if (!/^[0-9a-zA-Z-]{8,64}$/.test(installId)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (await limited(request)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  await removeSubscription(storeFromEnv(process.env), installId);
  return new NextResponse(null, { status: 204 });
}
