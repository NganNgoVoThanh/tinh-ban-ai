import { keys, type KeyValueStore } from "@tinhban/ai";
import webpush from "web-push";
import { z } from "zod";

/**
 * Web Push nhắc xem ngày (Technical Plan mục 11, 15): chỉ dùng trong route handler. Đăng ký gắn với
 * install_id; nội dung thông báo chung chung, không có dữ liệu cá nhân. Chưa có Postgres: lưu trong
 * kho khóa–giá trị (bảng push_subscription ở Bước 8).
 *
 * VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), CRON_SECRET
 */
export const subscriptionSchema = z.object({
  installId: z.string().regex(/^[0-9a-zA-Z-]{8,64}$/),
  subscription: z.object({
    endpoint: z.url().max(1000),
    keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
  }),
});

export type StoredSubscription = z.infer<typeof subscriptionSchema>["subscription"] & { createdAt: string };

export async function saveSubscription(store: KeyValueStore, installId: string, sub: z.infer<typeof subscriptionSchema>["subscription"], now: Date) {
  await store.set(keys.push(installId), JSON.stringify({ ...sub, createdAt: now.toISOString() } satisfies StoredSubscription));
  await store.setAdd(keys.pushIndex, installId);
}

export async function removeSubscription(store: KeyValueStore, installId: string) {
  await store.del(keys.push(installId));
  await store.setRemove(keys.pushIndex, installId);
}

/** Nội dung chung cho mọi người; phần cá nhân hóa chỉ tính khi mở app. */
export const DAILY_MESSAGE = { title: "Tinh Bàn", body: "Xem ngày hôm nay", url: "/hom-nay" };

export type PushSender = (sub: StoredSubscription, payload: string) => Promise<unknown>;

/** Gửi nhắc hằng ngày; endpoint hết hạn (404, 410) thì xóa đăng ký. */
export async function sendDaily(store: KeyValueStore, send: PushSender): Promise<{ sent: number; removed: number; failed: number }> {
  const result = { sent: 0, removed: 0, failed: 0 };
  const payload = JSON.stringify(DAILY_MESSAGE);
  const ids = await store.setMembers(keys.pushIndex);
  for (let i = 0; i < ids.length; i += 20) {
    await Promise.all(
      ids.slice(i, i + 20).map(async (id) => {
        const raw = await store.get(keys.push(id));
        if (!raw) {
          await store.setRemove(keys.pushIndex, id);
          return;
        }
        try {
          await send(JSON.parse(raw) as StoredSubscription, payload);
          result.sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await removeSubscription(store, id);
            result.removed++;
          } else result.failed++;
        }
      }),
    );
  }
  return result;
}

type Env = Record<string, string | undefined>;

/** Bộ gửi VAPID; thiếu khóa thì null (tính năng tắt, không báo lỗi). */
export function vapidSender(env: Env): PushSender | null {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = env;
  if (!publicKey || !privateKey || !subject) return null;
  return (sub, payload) => webpush.sendNotification(sub, payload, { vapidDetails: { subject, publicKey, privateKey }, TTL: 6 * 3600 });
}
