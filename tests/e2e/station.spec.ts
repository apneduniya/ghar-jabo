// The metro stage (task 033): board a train at the platform and get off at Sealdah, within the draw-call budget.
// SwiftShader runs a few frames a second here and the game caps a frame at 50 ms of sim time, so the test
// boards at Phoolbagan (one stop to Sealdah) and brings the train in close instead of waiting for it.
import { expect, test } from '@playwright/test';

const DRAW_CALL_BUDGET = 60;

test('board a metro and get off at Sealdah', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?seed=5');
  await page.locator('.play-btn').first().click();
  await page.waitForFunction(() => (window as any).gj?.current && (window as any).gjr?.info.render.calls > 0);
  await page.evaluate(() => { const g = (window as any).gj; g.run.metroFrom = 'Phoolbagan'; g.go('station'); });
  await expect(page.locator('.stick')).toBeVisible();
  await expect(page.locator('.jump-btn')).toBeVisible();

  // Onto the platform, and the train pulls in.
  await page.evaluate(() => {
    const d = (window as any).gj.debug;
    d.teleport(50, 2);
    d.sim.train.state = 'arriving';
    d.sim.train.x = 38;
  });
  await page.waitForFunction(() => (window as any).gj.debug.sim.train.state === 'open', null, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as any).gjr.info.render.calls)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);

  // Step up to a door at the edge: in.
  await expect.poll(async () => page.evaluate(() => {
    const d = (window as any).gj.debug;
    if (d.sim.phase === 'platform') d.teleport(d.sim.doorX(1), -3.3);
    return d.sim.phase;
  }), { timeout: 30_000 }).toBe('ride');
  await expect(page.locator('.act-btn.big')).toBeVisible();
  await expect(page.locator('.stick')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).gjr.info.render.calls)).toBeLessThanOrEqual(DRAW_CALL_BUDGET);

  // Ride to Sealdah, tapping the big button; at Sealdah the tap gets you off.
  await expect.poll(async () => {
    // Once off, the stage moves on to the newspaper (and its own debug handles): the run remembers how you got home.
    const phase = await page.evaluate(() => { const g = (window as any).gj; return g.run.homeMode === 'metro' ? 'arrived' : g.debug.sim?.phase ?? 'gone'; });
    if (phase === 'ride') await page.locator('.act-btn.big').dispatchEvent('pointerdown');
    return phase;
  }, { timeout: 60_000, intervals: [200] }).toBe('arrived');
  await expect(page.locator('.paper h3')).not.toBeEmpty({ timeout: 30_000 });
  expect(await page.evaluate(() => (window as any).gj.run.homeMode)).toBe('metro');
  expect(errors).toEqual([]);
});
