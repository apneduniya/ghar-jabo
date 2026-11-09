// The real streamed world (free roam): chunks load and unload around the player, the whole
// frame stays within the draw-call budget anywhere (including at the Sector V edge), and walking across chunk
// borders meshes within the time slice. Frame times are only asserted on a real GPU (GJ_REAL_GPU=1, the Mac).
import { expect, test, type Page } from '@playwright/test';

const DRAW_CALL_BUDGET = 60;

async function boot(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?seed=7');
  await page.locator('.play-btn.free').click();
  await page.waitForFunction(() => (window as any).gj?.debug?.streamed && (window as any).gjr?.info.render.calls > 0);
  return errors;
}

/** Put the player at (x, z), load and mesh around them, and wait for two rendered frames. */
async function teleport(page: Page, x: number, z: number) {
  return page.evaluate(async ([x, z]) => {
    const gj = (window as any).gj, w = gj.debug.world, s = gj.debug.streamed;
    w.player.x = x; w.player.z = z; w.player.vx = 0; w.player.vz = 0;
    s.settle(x, z);
    for (let i = 0; i < 2; i++) await new Promise((r) => requestAnimationFrame(r));
    w.player.x = x; w.player.z = z;
    s.settle(x, z);
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    const v = s.view;
    return { calls: (window as any).gjr.info.render.calls as number, count: v.count as number, visible: v.stats.visible as number, unloads: v.stats.unloads as number, sector: s.sectorVisible as boolean };
  }, [x, z]);
}

test('the streamed world streams around the player within the draw-call budget', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = await boot(page);
  const spots: [string, number, number, boolean][] = [
    ['Sector V edge, looking out', -350, -330, true],
    ['Salt Lake grid', -560, -700, false],
    ['Salt Lake, CK Market side', -1150, -650, false],
    ['Phoolbagan', -1700, 320, false],
    ['old city lanes', -2600, 190, false],
    ['Sealdah', -3000, 540, false],
    ['east of Sector V', 480, 200, true],
  ];
  let lastUnloads = 0;
  for (const [name, x, z, sector] of spots) {
    for (const yaw of sector ? [0, Math.PI / 2, Math.PI, -Math.PI / 2] : [0, Math.PI]) {
      await page.evaluate((y) => (window as any).gj.debug.setYaw(y), yaw);
      const r = await teleport(page, x, z);
      expect(r.calls, `${name} yaw ${yaw.toFixed(2)}`).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
      expect(r.count, name).toBeGreaterThan(4);
      expect(r.visible, name).toBeGreaterThan(0);
      expect(r.sector, name).toBe(sector);
      lastUnloads = r.unloads;
    }
  }
  expect(lastUnloads).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('walking across chunk borders stays inside the meshing slice', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = await boot(page);
  await teleport(page, -1500, -430);
  const r = await page.evaluate(async () => {
    const gj = (window as any).gj, w = gj.debug.world, s = gj.debug.streamed;
    s.view.stats.maxMs = 0;
    const loads0 = s.view.stats.loads;
    let maxFrame = 0, last = performance.now(), calls = 0;
    // Walk west along the corridor at ~8 u per frame: crosses three chunk borders.
    for (let i = 0; i < 48; i++) {
      w.player.x -= 8; w.player.vx = 0; w.player.vz = 0;
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      if (i > 2) maxFrame = Math.max(maxFrame, now - last);
      last = now;
      calls = Math.max(calls, (window as any).gjr.info.render.calls);
    }
    return { maxMesh: s.view.stats.maxMs as number, loaded: s.view.stats.loads - loads0, maxFrame, calls };
  });
  console.log(`walk: max meshing slice ${r.maxMesh.toFixed(1)} ms, max frame ${r.maxFrame.toFixed(0)} ms, ${r.loaded} chunks loaded, ≤ ${r.calls} calls`);
  expect(r.loaded).toBeGreaterThan(2);
  expect(r.calls).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  // One step may run past the 4 ms budget, a whole chunk at once never does. SwiftShader shares this server's
  // CPU (a whole old-city chunk takes ~300 ms here), so only a real GPU machine gets the strict numbers.
  if (process.env.GJ_REAL_GPU) { expect(r.maxMesh).toBeLessThan(12); expect(r.maxFrame).toBeLessThan(50); }
  else expect(r.maxMesh).toBeLessThan(150);
  expect(errors).toEqual([]);
});

test('minimap shows the streamed roads and the whole network', async ({ page }) => {
  const errors = await boot(page);
  await teleport(page, -2600, 190);
  await page.locator('.minimap').dispatchEvent('pointerdown');
  await expect(page.locator('.minimap.big')).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});
