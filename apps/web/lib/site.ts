/**
 * Địa chỉ gốc của trang cho sitemap, robots và dữ liệu có cấu trúc. NEXT_PUBLIC_SITE_URL khi đã có
 * tên miền; trên Vercel dùng tên miền production; trên Netlify dùng URL chính của site; local là localhost.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
  (process.env.NETLIFY ? process.env.URL : undefined) ??
  "http://localhost:3000"
).replace(/\/$/, "");
