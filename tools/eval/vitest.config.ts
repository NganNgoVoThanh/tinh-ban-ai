import { defineConfig } from 'vitest/config';

// iztro mất 35–70 ms mỗi lá số.
export default defineConfig({ test: { testTimeout: 120_000 } });
