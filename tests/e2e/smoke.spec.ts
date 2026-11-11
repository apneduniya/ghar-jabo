// Boots the game, plays into each stage via test hooks, and enforces the draw-call budget.
import { expect, test, type Page } from '@playwright/test';

const DRAW_CALL_BUDGET = 60;

async function boot(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('.play-btn').first().click();
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

test('station stage renders within budget', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => (window as any).gj.go('station'));
  await page.waitForTimeout(2000);
  expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  expect(errors).toEqual([]);
});

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
  await page.locator('.play-btn').first().click();
  await expect(page.locator('.hud-clock')).toHaveText(/PM/);
  await page.waitForTimeout(1500);
  expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  expect(errors).toEqual([]);
});

test('free roam: the clock shows the day and never runs out', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('.play-btn.free').click();
  await expect(page.locator('.hud-clock')).toHaveText(/Day 1 · 6:3\d PM/);
  await page.evaluate(() => { (window as any).gj.run.minute = 24 * 60 + 74; });
  await expect(page.locator('.hud-clock')).toHaveText(/Day 2 · 1:1\d AM/);
  expect(await page.evaluate(() => (window as any).gj.run.ending)).toBeNull();
  expect(errors).toEqual([]);
});

test('free roam: far west of Sector V the streamed world loads around you', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('.play-btn.free').click();
  await page.waitForFunction(() => (window as any).gj?.debug?.chunks && (window as any).gjr?.info.render.calls > 0);
  // Teleport to Phoolbagan, 2 km west of the map (free roam is true scale).
  await page.evaluate(() => { const p = (window as any).gj.debug.world.player; p.x = -2000; p.z = 300; });
  await expect.poll(() => page.evaluate(() => (window as any).gj.debug.chunks.summary().chunks), { timeout: 60_000 }).toBeGreaterThan(6);
  const sum = await page.evaluate(() => (window as any).gj.debug.chunks.summary());
  expect(sum.buildings).toBeGreaterThan(50);
  expect(sum.roads).toBeGreaterThan(20);
  // Nothing near the player was left behind in Sector V's chunks.
  const near = await page.evaluate(() => [...(window as any).gj.debug.chunks.loaded()].every((c: any) => Math.hypot(c.x0 + 64 + 2000, c.z0 + 64 - 300) < 450));
  expect(near).toBe(true);
  // Within budget whether or not this build renders chunks yet.
  await page.waitForTimeout(1500);
  expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  expect(errors).toEqual([]);
});

test('timed: a bus from Sector V reaches Sealdah and the run ends at home', async ({ page }) => {
  const errors = await boot(page);
  // Hop on a bus at the start of its line, then let it run flat out (sim steps driven from the test, since
  // SwiftShader frames are too slow to watch a whole ride), keeping your balance like a good commuter.
  await page.evaluate(() => {
    const w = (window as any).gj.debug.world;
    const bus = w.traffic.spawnBus(1, 150);
    bus.base = 1; bus.speed = 1; bus.depotAt = undefined;
    const c = Math.cos(bus.heading), s = Math.sin(bus.heading);
    w.player.x = bus.x + c * -1.9 + s * (bus.width / 2 + 0.5);
    w.player.z = bus.z + s * -1.9 - c * (bus.width / 2 + 0.5);
    (window as any).gjBus = bus;
  });
  // At SwiftShader's ~2 fps the bus drifts off between polls: step back beside its door before each tap, like a
  // commuter running alongside.
  await expect.poll(async () => {
    const state = await page.evaluate(() => {
      const w = (window as any).gj.debug.world, bus = (window as any).gjBus;
      if (w.player.state !== 'hang') {
        const c = Math.cos(bus.heading), s = Math.sin(bus.heading);
        w.player.x = bus.x + c * -1.9 + s * (bus.width / 2 + 0.5);
        w.player.z = bus.z + s * -1.9 - c * (bus.width / 2 + 0.5);
      }
      return w.player.state;
    });
    if (state !== 'hang') await page.locator('.act-btn').dispatchEvent('pointerdown');
    return state;
  }, { timeout: 15_000 }).toBe('hang');
  const arrived = await page.evaluate(() => {
    const w = (window as any).gj.debug.world, bus = (window as any).gjBus;
    bus.base = 70;
    const noIntent = { moveX: 0, moveZ: 0, jump: false, action: false, phone: false, lean: 0 };
    for (let i = 0; i < 60 * 120; i++) {
      if (w.player.state !== 'hang') break;
      w.step({ ...noIntent, lean: w.player.lean * 3 + w.player.leanVel });
    }
    return w.events.list.some((e: any) => e.type === 'arrive');
  });
  expect(arrived).toBe(true);
  await expect(page.locator('.paper h3')).not.toBeEmpty({ timeout: 30_000 });
  expect(await page.evaluate(() => (window as any).gj.run.homeMode)).toBe('bus');
  expect(errors).toEqual([]);
});
