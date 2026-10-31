"use client";

import type { LocalProfile, SchoolId } from "@tinhban/shared";
import { backupFileName, buildBackup, parseBackup } from "./backup-format";
import { db } from "./db";
import { getInstallId } from "./meta";
import { createProfile } from "./profiles";
import { QUOTA_KEY } from "./quota";
import { getSettings, updateSettings } from "./settings";

/** Tải file sao lưu: hồ sơ (có tên), cài đặt, lịch sử hỏi đáp. */
export async function exportBackup(): Promise<void> {
  const now = new Date();
  const backup = buildBackup(
    { profiles: await db.profiles.toArray(), settings: await getSettings(), qaHistory: await db.qa_history.toArray() },
    now,
  );
  const blob = new Blob([JSON.stringify(backup, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: backupFileName(now) });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportResult {
  added: number;
  skipped: number;
  invalid: number;
}

/**
 * Nhập file sao lưu: thêm hồ sơ chưa có, bỏ qua hồ sơ trùng profileId. Cài đặt trong file chỉ dùng
 * khi máy chưa có hồ sơ nào (khôi phục máy mới), để không đè lựa chọn hiện tại.
 */
export async function importBackup(file: File): Promise<ImportResult> {
  const parsed = parseBackup(await file.text());
  return db.transaction("rw", db.profiles, db.qa_history, db.settings, async () => {
    const existing = new Set(await db.profiles.toCollection().primaryKeys());
    const fresh = parsed.profiles.filter((p) => !existing.has(p.profileId));
    await db.profiles.bulkAdd(fresh);
    const freshIds = new Set(fresh.map((p) => p.profileId));
    await db.qa_history.bulkPut(parsed.qaHistory.filter((q) => freshIds.has(q.profileId)));
    if (existing.size === 0) await updateSettings(parsed.settings);
    return { added: fresh.length, skipped: parsed.profiles.length - fresh.length, invalid: parsed.invalid };
  });
}

/** Hồ sơ đã có trên máy với cùng đầu vào và phái (để khôi phục bằng mã không tạo bản trùng). */
export async function findSameProfile(birth: LocalProfile["birth"], schoolId: SchoolId): Promise<LocalProfile | undefined> {
  const key = JSON.stringify(birth);
  return (await db.profiles.toArray()).find((p) => p.schoolId === schoolId && JSON.stringify(p.birth) === key);
}

export async function restoreProfile(birth: LocalProfile["birth"], schoolId: SchoolId, name: string): Promise<LocalProfile> {
  return (await findSameProfile(birth, schoolId)) ?? createProfile(birth, schoolId, name);
}

/**
 * Xóa toàn bộ dữ liệu: IndexedDB (gồm lịch sử hỏi), cache của service worker, đăng ký push, và dữ liệu
 * server gắn với install_id (đăng ký quan tâm, đăng ký push).
 */
export async function deleteAllLocalData(): Promise<void> {
  const installId = await getInstallId().catch(() => null);
  if (installId) {
    await fetch(`/api/install/${encodeURIComponent(installId)}`, { method: "DELETE" }).catch(() => undefined);
  }
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  const sub = await reg?.pushManager?.getSubscription().catch(() => null);
  await sub?.unsubscribe().catch(() => undefined);
  db.close();
  await db.delete();
  try {
    localStorage.removeItem("tb-theme");
    localStorage.removeItem(QUOTA_KEY);
  } catch {
    // Trình duyệt chặn localStorage: không có gì để xóa.
  }
}
