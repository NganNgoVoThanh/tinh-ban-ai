import { NextResponse } from "next/server";
import { eventsBatchSchema, MAX_EVENTS_BODY, sanitizeBatch } from "@/lib/server/events";

/**
 * Nhận từng lô sự kiện ẩn danh (Technical Plan mục 15). Kiểm bằng zod, giới hạn kích thước.
 * Chưa có Postgres nên lô hợp lệ được nhận rồi bỏ; lưu vào bảng events khi dựng máy chủ dữ liệu.
 */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_EVENTS_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const batch = eventsBatchSchema.safeParse(json);
  if (!batch.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  sanitizeBatch(batch.data);
  return new NextResponse(null, { status: 204 });
}
