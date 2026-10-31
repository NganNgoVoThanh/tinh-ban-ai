/**
 * Service worker của Tinh Bàn (Technical Plan mục 11, ADR 0003).
 * - Lưu sẵn JS, CSS, font của bản build (precache do Serwist sinh).
 * - Lưu sẵn khung các trang tĩnh khi cài; mở trang thì ưu tiên mạng, mất mạng thì dùng bản đã lưu,
 *   khóa theo đường dẫn không kèm tham số (/la-so?ho-so=… dùng chung khung /la-so).
 * - Không lưu /api/* và /admin.
 * - Bản mới chờ sẵn, giao diện hiện "Có bản mới · Tải lại" rồi mới kích hoạt.
 * - Web Push: hiện thông báo chung chung; bấm vào mở /hom-nay (Technical Plan mục 11).
 */
import { NetworkFirst, NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const PAGES = "pages";
const SHELLS = ["/", "/app", "/bat-dau", "/hom-nay", "/la-so", "/hoi", "/ho-so", "/ho-so/moi", "/ho-so/sua", "/khoi-phuc", "/goi"];
const isPrivate = (url: URL) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin");
const stripSearch = (url: string) => {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: false,
  clientsClaim: true,
  runtimeCaching: [
    { matcher: ({ url, sameOrigin }) => sameOrigin && isPrivate(url), handler: new NetworkOnly() },
    {
      matcher: ({ request, url, sameOrigin }) => sameOrigin && request.mode === "navigate" && !isPrivate(url),
      handler: new NetworkFirst({
        cacheName: PAGES,
        networkTimeoutSeconds: 4,
        plugins: [{ cacheKeyWillBeUsed: async ({ request }) => stripSearch(request.url) }],
      }),
    },
  ],
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES).then((cache) =>
      Promise.all(SHELLS.map((path) => fetch(path, { cache: "reload" }).then((res) => (res.ok ? cache.put(path, res) : undefined)))),
    ),
  );
});

self.addEventListener("push", (event) => {
  const data = (event.data?.json() ?? {}) as { title?: string; body?: string; url?: string };
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Tinh Bàn", {
      body: data.body ?? "Xem ngày hôm nay",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url ?? "/hom-nay" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data as { url?: string } | null)?.url ?? "/hom-nay", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => new URL(c.url).origin === self.location.origin);
      return open ? open.navigate(url).then((c) => c?.focus()) : self.clients.openWindow(url);
    }),
  );
});

serwist.addEventListeners();
