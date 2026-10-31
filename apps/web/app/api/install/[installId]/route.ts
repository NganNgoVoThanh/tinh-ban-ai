import { NextResponse } from "next/server";
import { storeFromEnv } from "@/lib/server/ai";
import { removeSubscription } from "@/lib/server/push";

/**
 * "Xóa toàn bộ dữ liệu" (Technical Plan mục 15, 16): xóa mọi dữ liệu server gắn với install_id:
 * đăng ký quan tâm, đăng ký push, dấu thời điểm cài.
 */
export async function DELETE(_request: Request, { params }: RouteContext<"/api/install/[installId]">) {
  const { installId } = await params;
  if (!/^[0-9a-zA-Z-]{8,64}$/.test(installId)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const store = storeFromEnv(process.env);
  await Promise.all([store.del(`interest:${installId}`), store.del(`install:first:${installId}`), removeSubscription(store, installId)]);
  return new NextResponse(null, { status: 204 });
}
