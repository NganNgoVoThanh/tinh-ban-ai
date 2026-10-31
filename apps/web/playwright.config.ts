import { defineConfig, devices } from "@playwright/test";

/**
 * E2E trên khung điện thoại 375×812, Android (Chromium) và iPhone (WebKit) — Technical Plan mục 18.
 * Chạy trên bản production: `pnpm build` trước, rồi `pnpm e2e`.
 */
const viewport = { width: 375, height: 812 };

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // Mỗi trình duyệt lập lá số bằng iztro (35–70 ms mỗi lá số); nhiều worker làm máy quá tải.
  workers: 2,
  // WebKit thỉnh thoảng kẹt ở bước chờ phần tử ổn định khi máy quá tải: chạy lại một lần (CI hai lần).
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "android", use: { ...devices["Pixel 5"], viewport } },
    { name: "iphone", use: { ...devices["iPhone 13"], viewport } },
  ],
  webServer: {
    command: "pnpm exec next start -p 3100",
    // Luồng 11: tắt AI thì câu tự do vẫn được trả lời bằng kho. Luồng 7 giả lập AI bằng page.route.
    env: { AI_ENABLED: "false" },
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
