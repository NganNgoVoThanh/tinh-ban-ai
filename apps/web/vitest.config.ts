import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Test đơn vị cho phần logic thuần của app (lib/). Giao diện được kiểm bằng Playwright.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["lib/**/*.test.ts"], testTimeout: 60_000 },
});
