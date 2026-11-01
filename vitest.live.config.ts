import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/live/**/*.test.ts'], testTimeout: 180000, fileParallelism: false, maxWorkers: 1 } });
