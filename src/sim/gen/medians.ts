// The EM Bypass / Salt Lake Bypass median (AUDIT.md 7): one line per carriageway pair, midway between the two
// carriageways' inner edges, broken where a road crosses it (the real median has a gap at every junction). The
// renderer draws the blue-and-white kerb and spear-top railing along it (render/world/landmarks/decks.ts) and the
// collision gets a thin solid along it (solids.ts), from this same layout. Pure; cached per (net, warp).

import { type Line, nearestOn, sample } from './lines';
import { groundRoadsNear, memo, netLines, roadNear } from './layout';
import type { NetRoad, Pt, Warp, WorldNet } from './types';

/** Kerb blocks either side of the railing: the median line is drawn only where the gap between the kerbs is this wide. */
export const MEDIAN_MIN_GAP = 1.2;
/** Half width of the median's collision solid. */
export const MEDIAN_HALF = 0.3;
const STEP = 2;
/** The median's gap either side of a junction (room for a bus to turn across it). */
const JUNCTION_GAP = 10;

export const isBypass = (r: NetRoad) => !r.bridge && r.oneway && /bypass|eastern metropolitan/i.test(r.name ?? '');

/** A game-space polyline as a Line (arc lengths measured as is). */
export function lineOf(p: Pt[]): Line {
  const d = [0];
  for (let i = 1; i < p.length; i++) d.push(d[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { p, d, at: p.map((_, i) => d[i]), len: d[d.length - 1] ?? 0 };
}

/** The median lines of the divided Bypasses, game coords. */
export function medianLines(net: WorldNet, warp: Warp): Line[] {
  return memo(net, warp, 'medians', () => {
    const roads = netLines(net, warp), bypass = roads.filter(({ r }) => isBypass(r));
    // Every road end is a junction (or a median's end): traffic turns or U-turns across the median there.
    const ends = roads.filter(({ r }) => r.cls !== 'lane').flatMap(({ l }) => [l.p[0], l.p[l.p.length - 1]]);
    const atJunction = (x: number, z: number) => ends.some((e) => Math.abs(e[0] - x) < JUNCTION_GAP && Math.abs(e[1] - z) < JUNCTION_GAP && Math.hypot(e[0] - x, e[1] - z) < JUNCTION_GAP);
    const out: Line[] = [], drawn = new Map<number, Pt[]>();
    const cell = (x: number, z: number) => Math.floor(x / 4) * 100000 + Math.floor(z / 4);
    // Where one carriageway's pair changes (a slip road joins), two pairs can share a stretch of median: drawn once.
    const taken = (x: number, z: number) => {
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of drawn.get(cell(x + i * 4, z + j * 4)) ?? []) if (Math.hypot(q[0] - x, q[1] - z) < 1.5) return true;
      return false;
    };
    bypass.forEach(({ r, l }) => {
      let run: Pt[] = [];
      const flush = () => {
        if (run.length > 1) { out.push(lineOf(run)); for (const p of run) { const c = cell(p[0], p[1]); drawn.set(c, [...(drawn.get(c) ?? []), p]); } }
        run = [];
      };
      for (let s = 0; s <= l.len; s += STEP) {
        const q = sample(l, s);
        // Its pair: the nearest anti-parallel Bypass carriageway across the median; drawn once, from the lower id.
        let pair: { d: number; x: number; z: number; o: NetRoad } | null = null;
        for (const b of bypass) {
          if (b.r === r) continue;
          const n = nearestOn(b.l, q.x, q.z);
          if (n.d > (r.w + b.r.w) / 2 + 8 || (pair && n.d >= pair.d)) continue;
          const t = roadNear(b.l, q.x, q.z);
          if (t.dx * q.dx + t.dz * q.dz > -0.9) continue;
          pair = { d: n.d, x: n.x, z: n.z, o: b.r };
        }
        const gap = pair ? pair.d - (r.w + pair.o.w) / 2 : 0;
        if (!pair || gap < MEDIAN_MIN_GAP || net.roads.indexOf(pair.o) < net.roads.indexOf(r)) { flush(); continue; }
        // The edges' midpoint (the carriageways may differ in width).
        const m = r.w / 2 + gap / 2, ux = (pair.x - q.x) / pair.d, uz = (pair.z - q.z) / pair.d;
        const x = q.x + ux * m, z = q.z + uz * m;
        if (atJunction(x, z) || crossed(net, warp, r, pair.o, x, z, q.dx, q.dz) || taken(x, z)) { flush(); continue; }
        run.push([x, z]);
      }
      flush();
    });
    return out;
  });
}

/**
 * True if a road other than the pair crosses (or ends in) the median at (x, z), a junction's gap, or any other
 * carriageway reaches it (a slip road leaving the pair).
 */
function crossed(net: WorldNet, warp: Warp, a: NetRoad, b: NetRoad, x: number, z: number, dx: number, dz: number) {
  for (const { r, l } of groundRoadsNear(net, warp, x, z, 20)) {
    if (r.cls === 'lane') continue;
    const n = roadNear(l, x, z);
    if (n.d < r.w / 2 + MEDIAN_HALF + 0.3) return true; // on (or at the kerb of) any carriageway, its own pair's too
    if (r !== a && r !== b && n.d < r.w / 2 + 2.5 && Math.abs(n.dx * dx + n.dz * dz) < 0.9) return true;
  }
  return false;
}
