// The Keshtopur canal as the game sees it: a centre line with a half width (derived from the OSM water ring),
// and the railings along it, which block walking like walls. The canal-side roads get a railing on their canal
// edge (brick plinth and blue iron on the north bank, the white square-motif railing on the south bank), and
// the flat Street 13 crossing gets its low balustrade. Pure: no three.js.

import { north as N } from '../content/sectorv';
import type { MapData, Pt } from './mapdata';
import { greenLine, inBox, isCanalBridge, nearest, onCarriageway, pierSpots, resample, stations } from './elevated';

export interface CanalLine { p: Pt[]; hw: number[] }
export type RailingKind = 'north' | 'south' | 'bridge';
export interface Railing { a: Pt; b: Pt; kind: RailingKind }

const EDGE = 413; // the water rings are clipped to HALF * 1.15 = 414 (tools/build-map.py)
const MAIN = new Set(['primary', 'secondary', 'tertiary']);

/**
 * The canal's centre line. The canal is the long water ring (the others are ponds); the ring is cut open where it
 * meets the clip square, giving its two banks; the centre is halfway across, smoothed. OSM pinches the canal to a
 * few metres at the Street 13 crossing, so the half width is clamped to a real ~15 m channel.
 */
export function canalLine(water: Pt[][]): CanalLine | null {
  let ring: Pt[] | null = null, size = 0;
  for (const r of water) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const s = Math.hypot(x1 - x0, z1 - z0);
    if (s > size) { size = s; ring = r; }
  }
  if (!ring || size < 300) return null;
  const R = ring, n = R.length;
  const onEdge = (a: number, b: number) => Math.abs(a) > EDGE && Math.abs(b) > EDGE && Math.sign(a) === Math.sign(b);
  const ends: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = R[i], b = R[(i + 1) % n];
    if (onEdge(a[0], b[0]) || onEdge(a[1], b[1])) ends.push(i);
  }
  if (ends.length !== 2) return null;
  const chain = (from: number, to: number) => {
    const out: Pt[] = [];
    for (let i = (from + 1) % n; ; i = (i + 1) % n) { out.push(R[i]); if (i === to) break; }
    return out;
  };
  const bankA = chain(ends[0], ends[1]), bankB = chain(ends[1], ends[0]);
  const mid: Pt[] = [], w: number[] = [];
  for (const q of resample(bankA, 3)) {
    const m = nearest(bankB, q.x, q.z);
    mid.push([(q.x + m.x) / 2, (q.z + m.z) / 2]);
    w.push(m.d / 2);
  }
  // Smooth over +-3 samples (~10 units) so the channel edges don't zigzag.
  const K = 3, p: Pt[] = [], hw: number[] = [];
  for (let i = 0; i < mid.length; i++) {
    let sx = 0, sz = 0, sw = 0, c = 0;
    for (let k = Math.max(0, i - K); k <= Math.min(mid.length - 1, i + K); k++) { sx += mid[k][0]; sz += mid[k][1]; sw += w[k]; c++; }
    p.push(i === 0 || i === mid.length - 1 ? mid[i] : [sx / c, sz / c]);
    hw.push(Math.max(N.canalHalf[0], Math.min(N.canalHalf[1], sw / c)));
  }
  return { p, hw };
}

/** The nearest point on the canal's centre line, its direction, and the channel's half width there. */
export function canalAt(line: CanalLine, x: number, z: number) {
  const m = nearest(line.p, x, z);
  return { ...m, hw: line.hw[m.i] };
}

/**
 * Railing segments along the canal. A road (primary/secondary/tertiary, at grade) that runs parallel to the canal
 * within 18 units of its edge gets a railing on its canal side, at the outer edge of its footpath and never closer
 * than 1.5 to the water. Gaps: where another road crosses (so junctions stay open), inside `keepOut` (the station
 * spans the canal there) and around `posts` (viaduct piers in the strip). The Street 13 crossing gets a
 * balustrade along both sides of its deck.
 */
export function canalRailings(map: MapData, line: CanalLine, keepOut: (x: number, z: number) => boolean = () => false, posts: Pt[] = []): Railing[] {
  const out: Railing[] = [];
  // Canal segments on a coarse grid (grown by the 18-unit reach plus the half width), so far samples skip fast.
  const C = 24, cells = new Map<string, number[]>();
  for (let i = 1; i < line.p.length; i++) {
    const [ax, az] = line.p[i - 1], [bx, bz] = line.p[i], g = 24;
    for (let cx = Math.floor((Math.min(ax, bx) - g) / C); cx <= Math.floor((Math.max(ax, bx) + g) / C); cx++)
      for (let cz = Math.floor((Math.min(az, bz) - g) / C); cz <= Math.floor((Math.max(az, bz) + g) / C); cz++) {
        const k = `${cx},${cz}`, l = cells.get(k);
        if (l) l.push(i); else cells.set(k, [i]);
      }
  }
  const near = (x: number, z: number) => {
    const segs = cells.get(`${Math.floor(x / C)},${Math.floor(z / C)}`);
    if (!segs) return null;
    let best: ReturnType<typeof nearest> | null = null;
    for (const i of segs) { const m = nearest([line.p[i - 1], line.p[i]], x, z); if (!best || m.d < best.d) { best = m; best.i = i; } }
    return best && { ...best, hw: line.hw[best.i] };
  };
  for (const r of map.roads) {
    if (r.b || !MAIN.has(r.k)) continue;
    let prev: { p: Pt; kind: RailingKind } | null = null;
    for (const q of resample(r.p, 2)) {
      const c = near(q.x, q.z);
      if (!c) { prev = null; continue; }
      const para = Math.abs(q.dx * c.dx + q.dz * c.dz), gap = c.d - c.hw;
      const off = Math.min(r.w / 2 + N.railingOffset, gap - 1.5);
      let here: { p: Pt; kind: RailingKind } | null = null;
      if (para > 0.8 && gap > 3 && gap < 18 && off > r.w / 2 + 0.3) {
        const tx = (c.x - q.x) / c.d, tz = (c.z - q.z) / c.d; // towards the canal
        const p: Pt = [q.x + tx * off, q.z + tz * off];
        // The north bank is the side of the canal's normal that points north (-z).
        let nx = c.dz, nz = -c.dx;
        if (nz > 0) { nx = -nx; nz = -nz; }
        const north = (q.x - c.x) * nx + (q.z - c.z) * nz > 0;
        const blocked = keepOut(p[0], p[1]) || onCarriageway(map.roads, p[0], p[1], 1, r) || posts.some(([x, z]) => Math.hypot(x - p[0], z - p[1]) < 1.6);
        if (!blocked) here = { p, kind: north ? 'north' : 'south' };
      }
      if (here && prev && prev.kind === here.kind && Math.hypot(here.p[0] - prev.p[0], here.p[1] - prev.p[1]) < 4) out.push({ a: prev.p, b: here.p, kind: here.kind });
      prev = here;
    }
  }
  for (const r of map.roads) {
    if (!isCanalBridge(r)) continue;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      const L = Math.hypot(bx - ax, bz - az) || 1, nx = (bz - az) / L, nz = -(bx - ax) / L, o = r.w / 2 + 0.5;
      for (const s of [1, -1]) out.push({ a: [ax + nx * o * s, az + nz * o * s], b: [bx + nx * o * s, bz + nz * o * s], kind: 'bridge' });
    }
  }
  return out;
}

/** Railings as obstacles, on a coarse spatial hash like the building grid. */
export class RailingMask {
  private cells = new Map<string, Railing[]>();
  private static readonly CELL = 16;

  constructor(readonly railings: Railing[]) {
    const C = RailingMask.CELL;
    for (const s of railings) {
      const x0 = Math.floor((Math.min(s.a[0], s.b[0]) - 2) / C), x1 = Math.floor((Math.max(s.a[0], s.b[0]) + 2) / C);
      const z0 = Math.floor((Math.min(s.a[1], s.b[1]) - 2) / C), z1 = Math.floor((Math.max(s.a[1], s.b[1]) + 2) / C);
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
        const k = `${cx},${cz}`;
        const list = this.cells.get(k);
        if (list) list.push(s); else this.cells.set(k, [s]);
      }
    }
  }

  /** True if a body of radius `pad` at (x, z) touches a railing. */
  blocked(x: number, z: number, pad = 0.35): boolean {
    const list = this.cells.get(`${Math.floor(x / RailingMask.CELL)},${Math.floor(z / RailingMask.CELL)}`);
    if (!list) return false;
    for (const s of list) if (nearest([s.a, s.b], x, z).d < pad + 0.1) return true;
    return false;
  }
}

/**
 * The canal and its railings for a map, computed once and shared by the sim and the renderer. The railings leave
 * gaps under Sector V station (it spans the canal) and around the Green Line piers in the south-bank strip.
 */
const postsOf = (piers: { cx: number; cz: number }[]) => piers.map((q) => [q.cx, q.cz] as Pt);
const cache = new WeakMap<MapData, { line: CanalLine | null; railings: Railing[]; piers: ReturnType<typeof pierSpots> }>();
export function canalOf(map: MapData) {
  let c = cache.get(map);
  if (!c) {
    const line = canalLine(map.water ?? []);
    const { sv } = stations();
    const piers = pierSpots(greenLine(map.rails), N.greenPierStep, map.roads, 0.4, (x, z) => inBox(sv, x, z, 1));
    const railings = line ? canalRailings(map, line, (x, z) => inBox(sv, x, z, 2), postsOf(piers)) : [];
    c = { line, railings, piers };
    cache.set(map, c);
  }
  return c;
}
