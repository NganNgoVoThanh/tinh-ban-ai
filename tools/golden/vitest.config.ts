import { defineConfig } from 'vitest/config';

// Golden test chạy bộ tính trên toàn bộ ca chuẩn cho hai phái (khoảng 35–70 ms mỗi lá số).
export default defineConfig({ test: { include: ['golden.test.ts'], testTimeout: 120_000, hookTimeout: 120_000 } });
