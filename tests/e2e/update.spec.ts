// A tab left open on an old build offers to reload once a newer one is served (src/app/update.ts).
import { expect, test } from '@playwright/test';

test('a newer build on the server shows the tap-to-reload banner, and tapping reloads', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('script[src*="/assets/index-"]'));
  await expect(page.locator('.update-banner')).toHaveCount(0);
  // The server now has a different build.
  await page.route(/\/\?v=\d+$/, (r) => r.fulfill({ contentType: 'text/html', body: '<script type="module" src="/assets/index-NEWBUILD1.js"></script>' }));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const banner = page.locator('.update-banner');
  await expect(banner).toBeVisible();
  await page.unroute(/\/\?v=\d+$/);
  await Promise.all([page.waitForEvent('load'), banner.click()]);
  await expect(page.locator('.update-banner')).toHaveCount(0);
});
