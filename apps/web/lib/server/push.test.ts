import { keys, MemoryStore } from "@tinhban/ai";
import { describe, expect, it } from "vitest";
import { DAILY_MESSAGE, removeSubscription, saveSubscription, sendDaily, subscriptionSchema, type StoredSubscription } from "./push";

const sub = (n: number) => ({ endpoint: `https://push.example.com/${n}`, keys: { p256dh: `p${n}`, auth: `a${n}` } });
const NOW = new Date("2026-10-30T00:00:00Z");

describe("Web Push nhắc xem ngày", () => {
  it("kiểm tra đăng ký: install_id hợp lệ, endpoint là URL", () => {
    expect(subscriptionSchema.safeParse({ installId: "abcdef12-3456", subscription: sub(1) }).success).toBe(true);
    expect(subscriptionSchema.safeParse({ installId: "x", subscription: sub(1) }).success).toBe(false);
    expect(subscriptionSchema.safeParse({ installId: "abcdef12-3456", subscription: { ...sub(1), endpoint: "không phải url" } }).success).toBe(false);
  });

  it("gửi nội dung chung cho mọi đăng ký; endpoint hết hạn thì xóa", async () => {
    const store = new MemoryStore();
    await saveSubscription(store, "install-0001", sub(1), NOW);
    await saveSubscription(store, "install-0002", sub(2), NOW);
    await saveSubscription(store, "install-0003", sub(3), NOW);
    const payloads: string[] = [];
    const result = await sendDaily(store, async (s: StoredSubscription, payload) => {
      if (s.endpoint.endsWith("/2")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      if (s.endpoint.endsWith("/3")) throw Object.assign(new Error("server"), { statusCode: 500 });
      payloads.push(payload);
    });
    expect(result).toEqual({ sent: 1, removed: 1, failed: 1 });
    expect(payloads).toEqual([JSON.stringify(DAILY_MESSAGE)]);
    expect((await store.setMembers(keys.pushIndex)).sort()).toEqual(["install-0001", "install-0003"]);
    expect(await store.get(keys.push("install-0002"))).toBeNull();
  });

  it("hủy đăng ký xóa cả khỏi danh sách gửi", async () => {
    const store = new MemoryStore();
    await saveSubscription(store, "install-0001", sub(1), NOW);
    await removeSubscription(store, "install-0001");
    expect(await sendDaily(store, async () => undefined)).toEqual({ sent: 0, removed: 0, failed: 0 });
  });
});
