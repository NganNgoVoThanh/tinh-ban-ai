import { NextResponse } from "next/server";
import { askSchema, handleAsk, MAX_ASK_BODY } from "@/lib/server/ai";

/** Hỏi đáp tự do (Technical Plan mục 10, 15). Không nhận ngày giờ sinh, chỉ fact tối thiểu. */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_ASK_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const body = askSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await handleAsk(body.data, ip, new Date());
  const status = result.kind === "quota_exceeded" ? 429 : result.kind === "turnstile_required" ? 403 : 200;
  const headers = "quotaRemaining" in result ? { "X-Quota-Remaining": String(result.quotaRemaining) } : undefined;
  return NextResponse.json(result, { status, ...(headers && { headers }) });
}
