"use client";

import { db } from "./db";
import { newId } from "./ids";

/** install_id: UUID ngẫu nhiên của lần cài, không liên quan đến ngày sinh. */
export async function getInstallId(): Promise<string> {
  return db.transaction("rw", db.meta, async () => {
    const row = await db.meta.get("install_id");
    if (row) return row.value;
    const value = crypto.randomUUID?.() ?? newId(24);
    await db.meta.put({ key: "install_id", value });
    return value;
  });
}

/** Đang chạy dạng app đã cài lên màn hình chính. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
