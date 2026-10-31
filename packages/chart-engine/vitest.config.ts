import { defineConfig } from 'vitest/config';

// iztro mất 35–70 ms mỗi lá số, nên test bất biến cần nhiều thời gian hơn mặc định.
export default defineConfig({ test: { testTimeout: 120_000 } });
