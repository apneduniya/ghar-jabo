// Boots the game, plays into each stage via test hooks, and enforces the draw-call budget.
import { expect, test, type Page } from '@playwright/test';

const DRAW_CALL_BUDGET = 60;

async function boot(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('.cholo').click();
  await page.waitForFunction(() => (window as any).gj?.current && (window as any).gjr?.info.render.calls > 0);
  return errors;
}

const calls = (page: Page) => page.evaluate(() => (window as any).gjr.info.render.calls as number);

test('lobby to the real Sector V map, within budget', async ({ page }) => {
  const errors = await boot(page);
  await expect(page.locator('.hud-clock')).toHaveText(/PM/);
  await page.waitForTimeout(1500);
  expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  expect(errors).toEqual([]);
});

for (const stage of ['city', 'station'] as const) {
  test(`${stage} stage renders within budget`, async ({ page }) => {
    const errors = await boot(page);
    await page.evaluate((s) => (window as any).gj.go(s), stage);
    await page.waitForTimeout(2000);
    expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
    expect(errors).toEqual([]);
  });
}

test('an ending shows the newspaper', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => (window as any).gj.fail('still-sector-v'));
  await expect(page.locator('.paper h3')).not.toBeEmpty();
  expect(errors).toEqual([]);
});
