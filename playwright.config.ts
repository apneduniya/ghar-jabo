// E2E smoke tests. Runs against `vite preview`. On this server Chromium uses SwiftShader (no GPU),
// so tests check correctness and draw-call budgets, not frame rate. Frame rate is checked on the Mac (tools/mac-run.sh).
import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

const candidates = [
  process.env.GJ_CHROME,
  `${homedir()}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`,
  `${homedir()}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
].filter(Boolean) as string[];
const executablePath = candidates.find((p) => existsSync(p));

// GJ_E2E_PORT lets two worktrees run their checks at the same time.
const port = Number(process.env.GJ_E2E_PORT) || 4317;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  workers: 1,
  reporter: [['list']],
  webServer: { command: `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    launchOptions: { executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
});
