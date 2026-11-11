// Controls (task 024): the floating thumb stick, two thumbs at once, the jump icon, and no Dignity anywhere.
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
const touch = (cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', pts: { x: number; y: number; id: number }[]) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id, radiusX: 8, radiusY: 8, force: 1 })) });

test('the stick floats to the thumb, follows past the rim, and runs while the other thumb jumps', async ({ page }) => {
  const errors = await boot(page);
  const cdp = await page.context().newCDPSession(page);
  const rest = await centre(page, '.stick');
  const rim = rest.w * 0.4;

  // Thumb lands well away from the resting stick: the base comes to the thumb.
  const t = { x: 150, y: 560, id: 1 };
  await touch(cdp, 'touchStart', [t]);
  await expect(page.locator('.stick')).toHaveClass(/active/);
  let c = await centre(page, '.stick');
  expect(Math.hypot(c.x - t.x, c.y - t.y)).toBeLessThan(2);

  // A small push inside the dead zone does nothing.
  await touch(cdp, 'touchMove', [{ ...t, y: t.y - rim * 0.05 }]);
  await page.waitForTimeout(400);
  expect(await speed(page)).toBeLessThan(0.3);

  // Drag far past the rim: the base follows, the knob stays on the rim, and the student runs.
  const far = { ...t, y: t.y - rim * 3 };
  await touch(cdp, 'touchMove', [far]);
  c = await centre(page, '.stick');
  expect(c.y - far.y).toBeCloseTo(rim, 0);
  await expect.poll(() => speed(page), { timeout: 20_000 }).toBeGreaterThan(3);

  // Second thumb on JUMP while the first keeps steering: the stick stays held.
  const j = await centre(page, '.jump-btn');
  // Frames are slow here, so watch the highest point every frame rather than polling for it.
  await page.evaluate(() => {
    const w = window as any;
    w.maxY = 0;
    const watch = () => { w.maxY = Math.max(w.maxY, w.gj.debug.world.player.y); requestAnimationFrame(watch); };
    watch();
  });
  await touch(cdp, 'touchStart', [far, { x: j.x, y: j.y, id: 2 }]);
  await expect.poll(() => page.evaluate(() => (window as any).maxY), { timeout: 20_000 }).toBeGreaterThan(0.05);
  // (CDP takes the active points: listing only the steering thumb lifts the jump thumb.)
  await touch(cdp, 'touchMove', [far]);
  await page.waitForTimeout(300);
  await expect(page.locator('.stick')).toHaveClass(/active/);

  // Let go: the stick glides home.
  await touch(cdp, 'touchEnd', []);
  await expect(page.locator('.stick')).not.toHaveClass(/active/);
  await expect.poll(async () => { const h = await centre(page, '.stick'); return Math.hypot(h.x - rest.x, h.y - rest.y); }).toBeLessThan(1);
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
