"use client";

import { trackEvent } from "./analytics";
import { getInstallId, isStandalone } from "./meta";
import { getSettings, updateSettings } from "./settings";

/**
 * Bật/tắt Web Push nhắc xem ngày (Technical Plan mục 11). iPhone chỉ nhận push khi app đã cài lên
 * màn hình chính (iOS 16.4 trở lên); trình duyệt khác thì dùng file .ics.
 */
export type PushSupport = "supported" | "needs_install" | "unsupported";

export function pushSupport(): PushSupport {
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return "supported";
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !isStandalone() ? "needs_install" : "unsupported";
}

/** Khóa VAPID dạng base64url → byte cho pushManager.subscribe. */
export function vapidKeyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (b64url + "=".repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function setPushSetting(push: boolean) {
  const { reminders } = await getSettings();
  await updateSettings({ reminders: { ...reminders, push } });
}

export async function enablePush(): Promise<"ok" | "denied" | "unavailable" | "error"> {
  try {
    const config = (await fetch("/api/config").then((r) => r.json())) as { push?: { vapidPublicKey: string | null } };
    const key = config.push?.vapidPublicKey;
    if (!key) return "unavailable";
    if ((await Notification.requestPermission()) !== "granted") return "denied";
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(key) });
    const res = await fetch("/api/push/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ installId: await getInstallId(), subscription: sub.toJSON() }),
    });
    if (!res.ok) {
      await sub.unsubscribe();
      return "error";
    }
    await setPushSetting(true);
    trackEvent("reminder_enabled", { type: "push" });
    return "ok";
  } catch {
    return "error";
  }
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  const sub = await reg?.pushManager?.getSubscription().catch(() => null);
  await sub?.unsubscribe().catch(() => undefined);
  const installId = await getInstallId();
  await fetch(`/api/push/subscription?${new URLSearchParams({ installId })}`, { method: "DELETE" }).catch(() => undefined);
  await setPushSetting(false);
}
