import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Most sim tests build the whole map (and often the streamed world); the server's CPU is shared with other CI.
    testTimeout: 20_000,
    environment: 'node',
  },
});
