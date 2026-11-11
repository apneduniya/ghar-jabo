// Controls (tasks 024, 027): the fixed thumb stick, swipe-to-look on the right half, two thumbs at once, the
// jump icon, and no Dignity anywhere.
import { expect, test, type CDPSession, type Page } from '@playwright/test';

async function boot(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('.play-btn').first().click();
  await expect(page.locator('.hud-clock')).toHaveText(/PM/);
  await expect(page.locator('.stick')).toBeVisible();
  return errors;
}

const centre = (page: Page, sel: string) => page.locator(sel).evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
});
const speed = (page: Page) => page.evaluate(() => { const p = (window as any).gj.debug.world.player; return Math.hypot(p.vx, p.vz); });
const yaw = (page: Page) => page.evaluate(() => (window as any).gj.debug.yaw() as number);
const turned = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const touch = (cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', pts: { x: number; y: number; id: number }[]) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id, radiusX: 8, radiusY: 8, force: 1 })) });

test('the stick stays put: the knob follows the thumb inside the rim, and the run does not turn the camera', async ({ page }) => {
  const errors = await boot(page);
  const cdp = await page.context().newCDPSession(page);
  const rest = await centre(page, '.stick');
  const rim = rest.w * 0.4;
  const yaw0 = await yaw(page);

  // A thumb landing away from the stick drives it from its fixed centre: the base does not come to the thumb.
  const t = { x: rest.x + 30, y: rest.y - 10, id: 1 };
  await touch(cdp, 'touchStart', [t]);
  await expect(page.locator('.stick')).toHaveClass(/active/);
  let c = await centre(page, '.stick');
  expect(Math.hypot(c.x - rest.x, c.y - rest.y)).toBeLessThan(0.5);

  // Drag far up past the rim: the base stays, the knob stops at the rim, and the student runs.
  const far = { ...t, x: rest.x, y: rest.y - rim * 3 };
  await touch(cdp, 'touchMove', [far]);
  c = await centre(page, '.stick');
  expect(Math.hypot(c.x - rest.x, c.y - rest.y)).toBeLessThan(0.5);
  const k = await centre(page, '.stick i');
  expect(k.x - rest.x).toBeCloseTo(0, 0);
  expect(rest.y - k.y).toBeCloseTo(rim, 0);
  await expect.poll(() => speed(page), { timeout: 20_000 }).toBeGreaterThan(3);

  // Running sideways for a while does not swing the camera round (it turns only when you look).
  await touch(cdp, 'touchMove', [{ ...far, x: rest.x + rim * 2, y: rest.y }]);
  await page.waitForTimeout(1500);
  expect(turned(await yaw(page), yaw0)).toBeLessThan(0.01);

  // Let go: the knob springs back to the centre.
  await touch(cdp, 'touchEnd', []);
  await expect(page.locator('.stick')).not.toHaveClass(/active/);
  await expect.poll(async () => { const h = await centre(page, '.stick i'); return Math.hypot(h.x - rest.x, h.y - rest.y); }).toBeLessThan(1);
  expect(errors).toEqual([]);
});

test('two thumbs: left runs, right swipes to look, JUMP still jumps, and a drag from a button does not look', async ({ page }) => {
  const errors = await boot(page);
  const cdp = await page.context().newCDPSession(page);
  const rest = await centre(page, '.stick');
  const rim = rest.w * 0.4;
  const w = page.viewportSize()!.width;
  await expect(page.locator('.look-tip')).toBeVisible();

  // Left thumb runs forward.
  const left = { x: rest.x, y: rest.y - rim, id: 1 };
  await touch(cdp, 'touchStart', [left]);
  await expect.poll(() => speed(page), { timeout: 20_000 }).toBeGreaterThan(3);

  // Right thumb drags right in the middle of the right half: the camera turns right (yaw grows).
  const yaw0 = await yaw(page);
  const r0 = { x: w * 0.7, y: 420, id: 2 };
  await touch(cdp, 'touchStart', [left, r0]);
  // (A small turn, so the run stays on the footpath: 40 px of a 390 px phone is about 20°.)
  for (let i = 1; i <= 2; i++) await touch(cdp, 'touchMove', [left, { ...r0, x: r0.x + i * 20 }]);
  await expect.poll(async () => { const y = await yaw(page); return Math.atan2(Math.sin(y - yaw0), Math.cos(y - yaw0)); }).toBeGreaterThan(0.25);
  await expect(page.locator('.look-tip')).toHaveClass(/gone/);
  // (CDP takes the active points: listing only the left thumb lifts the right one.)
  await touch(cdp, 'touchMove', [left]);
  await expect(page.locator('.stick')).toHaveClass(/active/);
  // The run now follows the new view: still going, in the camera's forward direction.
  const yaw1 = await yaw(page);
  await expect.poll(() => page.evaluate((y) => {
    const p = (window as any).gj.debug.world.player;
    return Math.cos(Math.atan2(p.vz, p.vx) - y);
  }, yaw1), { timeout: 20_000 }).toBeGreaterThan(0.9);

  // A drag that starts on JUMP jumps and does not look.
  const j = await centre(page, '.jump-btn');
  await page.evaluate(() => {
    const g = window as any;
    g.maxY = 0;
    const watch = () => { g.maxY = Math.max(g.maxY, g.gj.debug.world.player.y); requestAnimationFrame(watch); };
    watch();
  });
  const yaw2 = await yaw(page);
  await touch(cdp, 'touchStart', [left, { x: j.x, y: j.y, id: 3 }]);
  await touch(cdp, 'touchMove', [left, { x: j.x - 120, y: j.y - 60, id: 3 }]);
  await expect.poll(() => page.evaluate(() => (window as any).maxY), { timeout: 20_000 }).toBeGreaterThan(0.05);
  await page.waitForTimeout(300);
  expect(turned(await yaw(page), yaw2)).toBeLessThan(0.01);
  await touch(cdp, 'touchEnd', []);
  expect(errors).toEqual([]);
});

test('JUMP is an icon, thumb-sized', async ({ page }) => {
  await boot(page);
  const b = page.locator('.jump-btn');
  expect(await b.evaluate((e) => getComputedStyle(e).backgroundImage)).toContain('svg');
  expect(await b.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(0);
  const r = (await b.boundingBox())!;
  expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(64);
  await expect(b).toHaveAccessibleName('JUMP');
});

test('no Dignity: not in the HUD, the run or the newspaper', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.hud-dig')).toHaveCount(0);
  await expect(page.locator('.hud')).not.toContainText(/dignity/i);
  expect(await page.evaluate(() => 'dignity' in (window as any).gj.run)).toBe(false);
  await page.evaluate(() => (window as any).gj.fail('still-sector-v'));
  await expect(page.locator('.paper h3')).not.toBeEmpty({ timeout: 20_000 });
  await expect(page.locator('.paper')).not.toContainText(/dignity/i);
});
