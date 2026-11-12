// Opening shot (task 034): the run opens on a high, wide view of the college gate and the junction, then glides
// down behind the student; a touch ends it at once. Voice lines with no recordings make no noise in the console.
import { expect, test, type Page } from '@playwright/test';

type Opening = { active: boolean; first: number[]; player: [number, number] };
const opening = (page: Page) => page.evaluate(() => (window as any).gj.debug.opening() as Opening);
const camFromPlayer = (page: Page) => page.evaluate(() => {
  const gj = (window as any).gj, c = gj.current.camera.position, p = gj.debug.world.player;
  return { d: Math.hypot(c.x - p.x, c.z - p.z), y: c.y as number };
});

for (const [name, size] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]] as const) {
  test(`${name}: the first frame is high and wide, and a touch ends the opening`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/');
    await page.locator('.play-btn').first().click();
    await page.waitForFunction(() => (window as any).gj?.debug?.opening?.().first.length === 3);

    const o = await opening(page);
    const [x, y, z] = o.first;
    // The chase camera sits ~13 m back and ~8 m up; the opening starts well above and behind that.
    expect(y).toBeGreaterThan(12);
    expect(Math.hypot(x - o.player[0], z - o.player[1])).toBeGreaterThan(25);

    // A touch on the right half (a look swipe starting) cuts straight to the chase camera.
    expect(o.active).toBe(true);
    await page.touchscreen.tap(size.width * 0.75, size.height * 0.45);
    await expect.poll(async () => (await opening(page)).active).toBe(false);
    await expect.poll(async () => (await camFromPlayer(page)).d, { timeout: 20_000 }).toBeLessThan(16);
    expect((await camFromPlayer(page)).y).toBeLessThan(12);
    expect(errors).toEqual([]);
  });
}

test('a key press also ends the opening', async ({ page }) => {
  await page.goto('/');
  await page.locator('.play-btn').first().click();
  await page.waitForFunction(() => (window as any).gj?.debug?.opening?.().first.length === 3);
  expect((await opening(page)).active).toBe(true);
  await page.keyboard.press('j');
  await expect.poll(async () => (await opening(page)).active).toBe(false);
});
