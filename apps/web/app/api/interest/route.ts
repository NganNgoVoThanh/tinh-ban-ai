import { verifyTurnstile } from "@tinhban/ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { storeFromEnv } from "@/lib/server/ai";

/**
 * Quan tâm bản trả phí (Technical Plan mục 14, 15): gắn với install_id, email không bắt buộc, phải
 * đồng ý rõ ràng; qua Turnstile khi đã cấu hình. Chưa có Postgres: lưu trong kho khóa–giá trị.
 */
const interestSchema = z.object({
  installId: z.string().regex(/^[0-9a-zA-Z-]{8,64}$/),
  products: z.array(z.enum(["sub_month", "sub_year", "qa_pack"])).min(1).max(3),
  email: z.email().max(200).optional(),
  consent: z.literal(true),
  door: z.enum(["A", "B"]),
  turnstileToken: z.string().max(4096).optional(),
});

const interestKey = (installId: string) => `interest:${installId}`;

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 4096) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const body = interestSchema.safeParse((() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })());
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (secret && !(await verifyTurnstile(body.data.turnstileToken, secret, ip))) {
    return NextResponse.json({ error: "turnstile_required" }, { status: 403 });
  }
  const { installId, products, email, door } = body.data;
  await storeFromEnv(process.env).set(interestKey(installId), JSON.stringify({ products, ...(email && { email }), door, consentAt: new Date().toISOString() }));
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: Request) {
  const installId = new URL(request.url).searchParams.get("installId") ?? "";
  if (!/^[0-9a-zA-Z-]{8,64}$/.test(installId)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await storeFromEnv(process.env).del(interestKey(installId));
  return new NextResponse(null, { status: 204 });
}
