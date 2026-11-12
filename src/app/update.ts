// A tab left open keeps running the build it loaded. When a newer build is served, show a small banner: tap to
// reload. Checks when the tab comes back to the front and once a minute; never in the dev server (no hashed bundle).

import { NEW_VERSION } from '../content/text';

/** The hashed entry script an index.html loads (`/assets/index-<hash>.js`), or null. */
export function entryScript(html: string): string | null {
  return html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0] ?? null;
}

const EVERY_MS = 60_000;

export function watchForUpdates() {
  const mine = [...document.scripts].map((s) => s.src && new URL(s.src).pathname).find((p) => p && entryScript(p));
  if (!mine) return; // dev server or an unexpected page: nothing to compare
  let shown = false, last = 0;
  const check = async () => {
    if (shown || document.hidden || Date.now() - last < 10_000) return;
    last = Date.now();
    try {
      const html = await (await fetch(`${location.pathname}?v=${Date.now()}`, { cache: 'no-store' })).text();
      const served = entryScript(html);
      if (!served || served === mine) return;
      shown = true;
      const b = document.createElement('button');
      b.className = 'update-banner';
      b.textContent = NEW_VERSION;
      b.addEventListener('click', () => location.reload());
      document.body.appendChild(b);
    } catch { /* offline: try again later */ }
  };
  document.addEventListener('visibilitychange', () => void check());
  setInterval(() => void check(), EVERY_MS);
}
