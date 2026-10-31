import { connection, NextResponse } from "next/server";
import { publicConfig } from "@/lib/server/ai";

/** Cờ tính năng, kb_version tối thiểu, ngưỡng Turnstile (mục 15). CDN giữ 5 phút. */
export async function GET() {
  // Đọc biến môi trường lúc chạy, không lúc build: chỉnh được mà không cần deploy lại.
  await connection();
  return NextResponse.json(publicConfig(), { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } });
}
