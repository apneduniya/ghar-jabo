// The ?landmarks=1 dev view (task 020): every chunk of the fixture world builds its landmarks and linear structures
// without errors, and the game itself doesn't boot underneath it.
import { expect, test } from '@playwright/test';

test('landmark debug view builds every fixture chunk without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?landmarks=1&at=sealdah');
  await page.waitForFunction(() => (window as any).gjl?.frames > 0, null, { timeout: 90_000 });
  const info = await page.evaluate(() => ({ chunks: (window as any).gjl.chunks, game: !!(window as any).gj?.current }));
  expect(info.chunks).toBeGreaterThan(20);
  expect(info.game).toBe(false);
  expect(errors).toEqual([]);
});
