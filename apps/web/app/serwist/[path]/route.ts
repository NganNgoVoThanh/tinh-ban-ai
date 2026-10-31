import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Phục vụ service worker (/serwist/sw.js), build bằng esbuild lúc prerender. Chỉ lấy GET và
 * generateStaticParams: các cấu hình route (dynamic, revalidate) của Serwist không dùng được khi bật
 * cacheComponents.
 */
const route = createSerwistRoute({
  swSrc: "sw/sw.ts",
  useNativeEsbuild: true,
});

export const generateStaticParams = route.generateStaticParams;
export const GET = route.GET;
