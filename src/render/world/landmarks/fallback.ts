// Stand-in for a `flyover` landmark when the network carries no flyover road near it: a straight two-lane deck
// across the junction (along v), rising from grade at both ends, blue-and-white banded parapets on oval piers.
// The layout (pieces, heights, where the pier stands) is shared with the collision: sim/gen/layout.ts.

import { fallbackDeck } from '../../../sim/gen/layout';
import type { Frame } from './ctx';

export function fallbackFlyover(f: Frame) {
  const { h, pierR, pieces } = fallbackDeck();
  for (const { v, m, y, pier } of pieces) {
    f.box(-h, h, v, v + 2.5, y - 0.9, y, 0xa9a59e);
    f.box(-h + 0.6, h - 0.6, v, v + 2.5, y, y + 0.05, 0x45424a);
    const band = Math.floor(m / 3.2) % 2 ? 0x2f5fa8 : 0xeeeeea;
    for (const s of [-1, 1]) f.box(s * (h - 0.15) - 0.15, s * (h - 0.15) + 0.15, v, v + 2.5, y, y + 1.0, band);
    if (pier) {
      f.box(-h * 0.85, h * 0.85, m - 0.8, m + 0.8, y - 1.7, y - 0.9, 0xc4bdb2);
      f.cyl(0, m, pierR, 0, y - 1.7, 0xc4bdb2);
    }
  }
}
