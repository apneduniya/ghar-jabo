// The route audit's road checks (research/routes/AUDIT.md 6), as functions the unit tests run in both modes:
// carriageways of the network that run side by side must not overlap. Pure; used by tests only.

import { HALF } from './clip';
import { netDeckY, netDecks } from './layout';
import { sample } from './lines';
import { warped } from './net';
import type { Pt, Warp, WorldNet } from './types';

export interface Overlap { a: string; b: string; run: number; worst: number; at: Pt }

/** Below this, a deck is a ramp on the ground: it counts as a carriageway beside the others. */
const DECK_CLEAR = 4;

/**
 * Runs (at least `minRun` u long, as the audit counted them) where two roughly parallel carriageways overlap by more than `tol`: one's centre
 * line is closer to the other's than half their widths. Not counted: near a vertex the two share (a junction, or a
 * road continuing the other), on the Sector V square's edge (both are pinned to the map's road ends there), and
 * where one is a flyover deck high above the other.
 */
export function overlaps(net: WorldNet, warp: Warp, tol = 0.5, minRun = 10): Overlap[] {
  const wn = warped(net, warp), decks = new Map(netDecks(net, warp).map((d) => [d.r.id, d]));
  const roads = wn.roads.filter((r) => r.road.cls !== 'lane');
  const out: Overlap[] = [];
  const key = (p: Pt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const deckY = (id: string, x: number, z: number) => {
    const d = decks.get(id);
    if (!d) return 0;
    let best = { d: Infinity, s: 0 };
    for (let s = 0; s <= d.l.len; s += 1) { const q = sample(d.l, s), e = Math.hypot(q.x - x, q.z - z); if (e < best.d) best = { d: e, s }; }
    return netDeckY(d, best.s);
  };
  for (let i = 0; i < roads.length; i++) for (let j = i + 1; j < roads.length; j++) {
    const A = roads[i], B = roads[j], pad = (A.road.w + B.road.w) / 2;
    if (A.box[0] > B.box[2] + pad || B.box[0] > A.box[2] + pad || A.box[1] > B.box[3] + pad || B.box[1] > A.box[3] + pad) continue;
    const shared = A.p.filter((p) => B.p.some((q) => key(q) === key(p)));
    let run = 0, best: Overlap | null = null, worst = 0;
    for (let k = 1; k < A.p.length; k++) {
      const a = A.p[k - 1], b = A.p[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-6) continue;
      const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, n = Math.max(1, Math.ceil(L));
      for (let m = 0; m < n; m++) {
        const x = a[0] + (b[0] - a[0]) * (m / n), z = a[1] + (b[1] - a[1]) * (m / n);
        let d = Infinity, dot = 0;
        for (let q = 1; q < B.p.length; q++) {
          const c = B.p[q - 1], e = B.p[q], dx = e[0] - c[0], dz = e[1] - c[1], L2 = dx * dx + dz * dz;
          if (L2 < 1e-9) continue;
          const t = Math.max(0, Math.min(1, ((x - c[0]) * dx + (z - c[1]) * dz) / L2));
          const dd = Math.hypot(c[0] + dx * t - x, c[1] + dz * t - z);
          if (dd < d) { d = dd; dot = (tx * dx + tz * dz) / Math.sqrt(L2); }
        }
        const ov = pad - d;
        const hit = ov > tol && Math.abs(dot) > 0.9 && !shared.some((s) => Math.hypot(s[0] - x, s[1] - z) < 12)
          && Math.max(Math.abs(x), Math.abs(z)) > HALF + 12
          && !(Math.max(deckY(A.road.id, x, z), deckY(B.road.id, x, z)) > DECK_CLEAR && (decks.has(A.road.id) !== decks.has(B.road.id) || Math.abs(deckY(A.road.id, x, z) - deckY(B.road.id, x, z)) > DECK_CLEAR));
        if (hit) {
          run += L / n; worst = Math.max(worst, ov);
          if (run >= minRun && (!best || run > best.run)) best = { a: A.road.name ? `${A.road.id} ${A.road.name}` : A.road.id, b: B.road.name ? `${B.road.id} ${B.road.name}` : B.road.id, run, worst, at: [x, z] };
        } else run = 0;
      }
    }
    if (best) out.push({ ...best, run: Math.round(best.run), worst: Math.round(worst * 10) / 10, at: [Math.round(best.at[0]), Math.round(best.at[1])] });
  }
  return out.sort((p, q) => q.run - p.run);
}
