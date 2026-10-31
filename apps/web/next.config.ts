import type { NextConfig } from "next";

/**
 * Content-Security-Policy (Technical Plan mục 16, ADR 0006). Trang tĩnh của Next có script inline (dữ
 * liệu RSC `self.__next_f`, script chọn sáng/tối) khác nhau theo từng trang và từng bản build, nên
 * script-src cần 'unsafe-inline'; mọi nguồn khác chỉ là của app, Cloudflare Turnstile và Sentry.
 * Chỉ bật ở production: bản dev cần eval cho Fast Refresh.
 */
const SENTRY = "https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io";
const TURNSTILE = "https://challenges.cloudflare.com";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${TURNSTILE} ${SENTRY}`,
  `frame-src ${TURNSTILE}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera cho quét mã QR ở Khôi phục; không cần vị trí, micro.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return process.env.NODE_ENV === "production" ? [{ source: "/:path*", headers: SECURITY_HEADERS }] : [];
  },
  // Serwist build service worker bằng esbuild lúc prerender (app/serwist/[path]/route.ts).
  serverExternalPackages: ["esbuild", "esbuild-wasm"],
  cacheComponents: true,
  partialPrefetching: true,
  // Các package trong monorepo là mã TypeScript nguồn, Next biên dịch cùng app.
  transpilePackages: ["@tinhban/ai", "@tinhban/shared", "@tinhban/calendar", "@tinhban/chart-engine", "@tinhban/folk-calendar", "@tinhban/kb", "@tinhban/narrative", "@tinhban/profile-code", "@tinhban/ui"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
