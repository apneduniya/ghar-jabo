// Boots the game, plays into each stage via test hooks, and enforces the draw-call budget.
import { expect, test, type Page } from '@playwright/test';

const DRAW_CALL_BUDGET = 60;

async function boot(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('.play-btn').click();
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
  // The newspaper waits one rendered frame for its photo; SwiftShader frames are slow here.
  await expect(page.locator('.paper h3')).not.toBeEmpty({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('hop onto a Kolkata bus at its left rear door', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => {
    const w = (window as any).gj.debug.world;
    const bus = w.traffic.spawnBus(1, 150);
    bus.base = 1; bus.speed = 1; bus.depotAt = undefined;
    const c = Math.cos(bus.heading), s = Math.sin(bus.heading);
    w.player.x = bus.x + c * -1.9 + s * (bus.width / 2 + 0.5);
    w.player.z = bus.z + s * -1.9 - c * (bus.width / 2 + 0.5);
  });
  await expect(page.locator('.act-btn')).toHaveText(/HOP ON/, { timeout: 10_000 });
  // Under load SwiftShader runs ~2 fps and the bus can roll past between frames, so tap again like a player would.
  await expect.poll(async () => {
    const state = await page.evaluate(() => (window as any).gj.debug.world.player.state);
    if (state !== 'hang') await page.locator('.act-btn').dispatchEvent('pointerdown');
    return state;
  }, { timeout: 15_000 }).toBe('hang');
  expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  expect(errors).toEqual([]);
});

test('minimap opens the full real map and stays within budget', async ({ page }) => {
  const errors = await boot(page);
  await expect(page.locator('.minimap')).toBeVisible();
  await page.locator('.minimap').dispatchEvent('pointerdown');
  await expect(page.locator('.minimap.big')).toBeVisible();
  expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  expect(errors).toEqual([]);
});

test('landscape phone: title street and the start stay within budget', async ({ page }) => {
  // Landscape sees the widest slice of the city (side lanes included), so it is the worst case.
  await page.setViewportSize({ width: 844, height: 390 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => (window as any).gjr?.info.render.calls > 0);
  await page.waitForTimeout(1500);
  expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  await page.locator('.play-btn').click();
  await expect(page.locator('.hud-clock')).toHaveText(/PM/);
  await page.waitForTimeout(1500);
  expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  expect(errors).toEqual([]);
});
