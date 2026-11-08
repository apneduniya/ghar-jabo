// Layout: every HUD element keeps its own slot. The clock, minimap, money and thumb buttons never overlap
// each other, a visible notification or Ma's call, in portrait and landscape phones.
import { expect, test, type Page } from '@playwright/test';

type Box = { name: string; x: number; y: number; w: number; h: number };

const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

async function hudBoxes(page: Page) {
  return page.evaluate(() => {
    // The context button only shows next to a bus; show it for this one synchronous measurement.
    const act = document.querySelector<HTMLElement>('.act-btn')!;
    act.hidden = false;
    act.textContent = 'SIT ON BIKE 🛵'; // the longest label
    const box = (sel: string, name = sel) => [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((e) => !e.hidden && getComputedStyle(e).display !== 'none' && !e.classList.contains('out'))
      .map((e) => { const r = e.getBoundingClientRect(); return { name, x: r.x, y: r.y, w: r.width, h: r.height }; });
    const fixed = [...box('.hud-card', 'clock'), ...box('.minimap'), ...box('.hud-tr', 'money'), ...box('.act-btn'), ...box('.jump-btn'), ...box('.phone-btn')];
    const stream = [...box('.stream .note', 'note'), ...box('.stream .call', 'call')];
    return { fixed, stream, vw: innerWidth, vh: innerHeight };
  });
}

for (const [w, h] of [[390, 844], [360, 740], [844, 390], [740, 360]] as const) {
  test(`HUD slots never collide at ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.locator('.play-btn').first().click();
    await expect(page.locator('.hud-clock')).toHaveText(/PM/);
    await page.evaluate(() => {
      const ui = (window as any).gjui;
      ui.notify('Captain Bablu is 2 min away', 'Coming on the wrong side of the road, obviously.', 'app');
      ui.notify('Captain cancelled', 'Reason: "Captain says Sealdah is too far, emotionally"', 'bad');
      const g = (window as any).gj;
      g.run.nextCall = g.run.minute;
    });
    await expect(page.locator('.stream .call')).toBeVisible();
    // Measure resting positions, not the slide-in / ring wobble animations.
    await page.addStyleTag({ content: '*, *::before { animation: none !important; transition: none !important; }' });
    const { fixed, stream, vw, vh } = await hudBoxes(page);
    expect(fixed.map((b) => b.name).sort()).toEqual(['.act-btn', '.jump-btn', '.minimap', '.phone-btn', 'clock', 'money']);
    expect(stream.some((b) => b.name === 'note')).toBe(true);
    for (const a of [...fixed, ...stream]) {
      expect(a.x >= 0 && a.y >= 0 && a.x + a.w <= vw + 0.5 && a.y + a.h <= vh + 0.5, `${a.name} is on screen`).toBe(true);
    }
    for (let i = 0; i < fixed.length; i++) {
      for (let j = i + 1; j < fixed.length; j++) expect(overlap(fixed[i], fixed[j]), `${fixed[i].name} vs ${fixed[j].name}`).toBe(false);
      for (const s of stream) expect(overlap(fixed[i], s), `${fixed[i].name} vs ${s.name}`).toBe(false);
    }
    expect(errors).toEqual([]);
  });
}

test('landscape title: both mode cards fit on screen', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto('/');
  for (const sel of ['.play-btn:not(.free)', '.play-btn.free', '.sound-btn']) {
    const r = (await page.locator(sel).boundingBox())!;
    expect(r.y + r.height, sel).toBeLessThanOrEqual(360);
    expect(r.x + r.width, sel).toBeLessThanOrEqual(740);
  }
});

test('free-roam newspaper shows the mode, the day reached and how long it took', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.locator('.play-btn.free').click();
  await expect(page.locator('.hud-clock')).toHaveText(/Day 1/);
  await page.evaluate(() => { const g = (window as any).gj; g.run.minute = 24 * 60 + 74; g.arrive('bus'); });
  await expect(page.locator('.paper .band')).toContainText(/FREE ROAM.*Reached Day 2 · 1:1\d AM.*Took 6 h 4\d min/);
  // Share, save and play again stay on screen without scrolling.
  for (const b of await page.locator('.result-btns button').all()) await expect(b).toBeInViewport({ ratio: 1 });
});
