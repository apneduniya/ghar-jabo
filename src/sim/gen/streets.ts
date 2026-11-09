// Every street the generator knows about, as global polylines (never per chunk, so chunks agree at their seams):
// real net roads (warped, split at canal/rail crossings), continuations of the Sector V map's road ends,
// the free-roam lane lattice (Salt Lake grid or organic old-city lanes, by area), and timed-mode dead-end stubs.

import { AREA_STYLE, FOOT, GEN, STREET_W } from '../../content/worldgen';
import { HALF } from './clip';
import { areaOf, type Box, type Ctx, meets } from './ctx';
import { hash, Hasher, segDist } from './geom';
import type { WarpedNet, WRoad } from './net';
import type { AreaKind, Pt, RoadClass } from './types';

export { areaOf, type Box, type Ctx, meets };


export interface Street {
  key: number;
  p: Pt[];
  cum: number[];
  w: number;
  cls: RoadClass;
  real: boolean;
  /** Plot priority: real main roads first. */
  rank: number;
  bridge?: 'canal' | 'rail' | 'flyover';
  tram?: boolean;
  /** Ends in a dead end (timed): at p[p.length - 1]. */
  deadEnd?: boolean;
  /** The real road it branches off (stubs), so clearance checks skip it. */
  parent?: number;
  /** Bounding box of p. */
  box: Box;
}


const RANK: Record<RoadClass, number> = { primary: 4, secondary: 3, tertiary: 2, residential: 1, lane: 0 };
export const footOf = (s: { cls: RoadClass; w: number }) => FOOT[s.cls];
export const reach = (s: { cls: RoadClass; w: number }) => s.w / 2 + FOOT[s.cls];

export function makeStreet(key: number, p: Pt[], w: number, cls: RoadClass, real: boolean, extra: Partial<Street> = {}): Street {
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of p) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  return { key, p, cum, w, cls, real, rank: RANK[cls] + (real ? 10 : 0), box: [x0, z0, x1, z1], ...extra };
}


// --- Real roads (cached per WarpedNet) ----------------------------------------------------------------------

const realCache = new WeakMap<WarpedNet, Map<number, Street[]>>();

/** A net road as streets: in timed mode, the stretch over each canal (and under/over each rail line) is kept a
 *  separate piece flagged as a bridge, at least the crossing's true width long. */
function realOf(ctx: Ctx, r: WRoad): Street[] {
  let m = realCache.get(ctx.wn);
  if (!m) { m = new Map(); realCache.set(ctx.wn, m); }
  const hit = m.get(r.i);
  if (hit) return hit;
  const road = r.road;
  const cuts: { s0: number; s1: number; kind?: 'canal' | 'rail' }[] = [];
  if (ctx.mode === 'timed') {
    for (const c of ctx.net.crossings) {
      const [gx, gz] = ctx.warp.toGame([c.x, c.z]);
      const f = foot(r, gx, gz);
      if (!f || f.d > 4) continue;
      const half = c.width / 2 + 3;
      cuts.push({ s0: Math.max(0, f.s - half), s1: Math.min(r.cum[r.cum.length - 1], f.s + half), kind: c.over ? c.kind : undefined });
    }
  }
  cuts.sort((a, b) => a.s0 - b.s0);
  const base = { tram: road.tram, bridge: road.bridge };
  const out: Street[] = [];
  let s = 0, n = 0;
  const L = r.cum[r.cum.length - 1];
  const piece = (a: number, b: number, extra: Partial<Street>) => {
    if (b - a < 0.5) return;
    out.push(makeStreet(r.key * 16 + n++, slice(r.p, r.cum, a, b), road.w, road.cls, true, { ...base, ...extra }));
  };
  for (const c of cuts) {
    if (c.s0 < s) continue;
    piece(s, c.s0, {});
    piece(c.s0, c.s1, c.kind ? { bridge: c.kind } : {});
    s = c.s1;
  }
  piece(s, L, {});
  m.set(r.i, out);
  return out;
}

function foot(r: WRoad, x: number, z: number) {
  let best: { s: number; d: number } | null = null;
  for (let k = 1; k < r.p.length; k++) {
    const a = r.p[k - 1], b = r.p[k];
    const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
    const d = Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
    if (!best || d < best.d) best = { s: r.cum[k - 1] + t * Math.sqrt(L2), d };
  }
  return best;
}

/** The part of a polyline between arc lengths a and b. */
export function slice(p: Pt[], cum: number[], a: number, b: number): Pt[] {
  const at = (s: number): Pt => {
    let k = 1;
    while (k < cum.length - 1 && cum[k] < s) k++;
    const t = (s - cum[k - 1]) / (cum[k] - cum[k - 1] || 1);
    return [p[k - 1][0] + (p[k][0] - p[k - 1][0]) * t, p[k - 1][1] + (p[k][1] - p[k - 1][1]) * t];
  };
  const out: Pt[] = [a <= 0 ? p[0] : at(a)];
  for (let k = 0; k < p.length; k++) if (cum[k] > a && cum[k] < b) out.push(p[k]);
  out.push(b >= cum[cum.length - 1] ? p[p.length - 1] : at(b));
  return out;
}

export function realStreets(ctx: Ctx, b: Box): Street[] {
  return ctx.wn.roadsIn(...b).flatMap((r) => realOf(ctx, r)).filter((s) => meets(b, ...s.box) && s.p.some((q, i) => i > 0 && meetsSeg(b, s.p[i - 1], q)));
}

const meetsSeg = (b: Box, a: Pt, c: Pt) => meets(b, Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1]));

// --- Clearance (global and deterministic: depends only on the net, never on the chunk) -----------------------

const ENDS = [0, 0.5, 1], ALL = [0.15, 0.4, 0.7, 1], PARALLEL = [0.2, 0.5, 0.8];

/** True if a street segment a-b of width w is clear of the square, water, landmarks and (unless allowed) real roads. */
export function clear(ctx: Ctx, a: Pt, b: Pt, w: number, opts: { skipRoad?: number; roads?: 'parallel' | 'all' } = {}): boolean {
  const m = HALF + GEN.squareMargin;
  for (const t of ENDS) {
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    if (Math.abs(x) < m && Math.abs(z) < m) return false;
  }
  const x0 = Math.min(a[0], b[0]) - 20, z0 = Math.min(a[1], b[1]) - 20, x1 = Math.max(a[0], b[0]) + 20, z1 = Math.max(a[1], b[1]) + 20;
  if (ctx.water.segment(a, b, w / 2)) return false;
  for (const l of ctx.wn.landmarks) {
    if (l.gx < x0 - 80 || l.gx > x1 + 80 || l.gz < z0 - 80 || l.gz > z1 + 80) continue;
    if (segDist(l.gx, l.gz, a[0], a[1], b[0], b[1]) < l.r + w / 2) return false;
  }
  const s = ctx.wn.sealdah;
  if (segDist(s.x, s.z, a[0], a[1], b[0], b[1]) < s.r + w / 2) return false;
  if (!opts.roads) return true;
  // Real roads: 'parallel' rejects a street that runs along one (2 of 3 samples inside its footprint);
  // 'all' rejects any approach at all (stubs must not reach another road).
  let hits = 0;
  const samples = opts.roads === 'all' ? ALL : PARALLEL;
  for (const t of samples) {
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    for (const [ri, k] of ctx.wn.segmentsIn(x - 30, z - 30, x + 30, z + 30)) {
      const r = ctx.wn.roads[ri];
      if (r.i === opts.skipRoad) continue;
      const p = r.p[k - 1], q = r.p[k];
      if (segDist(x, z, p[0], p[1], q[0], q[1]) < r.road.w / 2 + FOOT[r.road.cls] + w / 2 + 1.5) { hits++; break; }
    }
  }
  return opts.roads === 'all' ? hits === 0 : hits < 2;
}

// --- Free roam: the lane lattice ------------------------------------------------------------------------------

interface Family { id: number; angle: number; L: number; jitter: number; grid: boolean; deg?: number }

function families(ctx: Ctx): Family[] {
  const angles = [...new Set(ctx.net.areas.filter((a) => a.gridDeg !== undefined).map((a) => a.gridDeg!))].sort((a, b) => a - b);
  return [
    { id: 0, angle: 0.21, L: GEN.lattice, jitter: GEN.jitter, grid: false },
    ...angles.map((deg, i) => ({ id: i + 1, angle: Math.atan2(-Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)), L: GEN.grid, jitter: 0, grid: true, deg })),
  ];
}

function familyOf(fams: Family[], area: { kind: AreaKind; gridDeg?: number }): Family {
  if ((area.kind === 'saltlake' || area.kind === 'sectorv') && area.gridDeg !== undefined) {
    return fams.find((f) => f.deg === area.gridDeg) ?? fams[0];
  }
  return fams[0];
}

function node(ctx: Ctx, f: Family, i: number, j: number): Pt {
  const u = (i + f.jitter * (hash(ctx.seed, f.id, i, j, 1) - 0.5)) * f.L, v = (j + f.jitter * (hash(ctx.seed, f.id, i, j, 2) - 0.5)) * f.L;
  const c = Math.cos(f.angle), s = Math.sin(f.angle);
  return [u * c - v * s, u * s + v * c];
}

/** Lattice streets in a box (free roam), plus the Salt Lake islands at kept 4-way avenue crossings. */
function latticeBox(ctx: Ctx, b: Box): Lattice {
  const fams = families(ctx);
  const streets: Street[] = [], islands: { x: number; z: number; r: number }[] = [];
  const keepEdge = (f: Family, i: number, j: number, di: number, dj: number): Street | null => {
    const ck = ((f.id * 4 + di * 2 + dj) * 1048576 + (i + 524288)) * 1048576 + (j + 524288);
    const hit = ctx.lattice.get(ck) as Street | null | undefined;
    if (hit !== undefined) return hit;
    const e = latticeEdge(f, i, j, di, dj);
    if (ctx.lattice.size > 200000) ctx.lattice.clear();
    ctx.lattice.set(ck, e);
    return e;
  };
  const latticeEdge = (f: Family, i: number, j: number, di: number, dj: number): Street | null => {
    const a = node(ctx, f, i, j), c = node(ctx, f, i + di, j + dj);
    const mid: Pt = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    const area = areaOf(ctx, mid[0], mid[1]);
    if (familyOf(fams, area) !== f) return null;
    const st = AREA_STYLE[area.kind];
    const kind = di && dj ? 3 : di ? 1 : 2;
    const h = hash(ctx.seed, f.id, i, j, kind, 7);
    if (h >= (kind === 3 ? st.diag : st.keep)) return null;
    const avenue = f.grid && ((di && j % GEN.islandEvery === 0) || (dj && i % GEN.islandEvery === 0));
    const w = avenue ? STREET_W.avenue : f.grid || area.kind === 'generic' ? STREET_W.residential : STREET_W.lane;
    if (!clear(ctx, a, c, w, { roads: 'parallel' })) return null;
    const cls: RoadClass = avenue ? 'tertiary' : w === STREET_W.lane ? 'lane' : 'residential';
    return makeStreet(Math.floor(hash(ctx.seed, f.id, i, j, kind) * 2 ** 30) * 4 + kind, [a, c], w, cls, false);
  };
  for (const f of fams) {
    const c = Math.cos(-f.angle), s = Math.sin(-f.angle);
    const corners = [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].map(([x, z]) => [(x * c - z * s) / f.L, (x * s + z * c) / f.L]);
    const i0 = Math.floor(Math.min(...corners.map((q) => q[0]))) - 1, i1 = Math.ceil(Math.max(...corners.map((q) => q[0]))) + 1;
    const j0 = Math.floor(Math.min(...corners.map((q) => q[1]))) - 1, j1 = Math.ceil(Math.max(...corners.map((q) => q[1]))) + 1;
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const dirs: [number, number][] = f.grid ? [[1, 0], [0, 1]] : [[1, 0], [0, 1], [1, 1]];
        for (const [di, dj] of dirs) {
          const e = keepEdge(f, i, j, di, dj);
          if (e && meetsSeg(b, e.p[0], e.p[1])) streets.push(e);
        }
        if (f.grid && i % GEN.islandEvery === 0 && j % GEN.islandEvery === 0) {
          const p = node(ctx, f, i, j);
          if (p[0] < b[0] || p[0] >= b[2] || p[1] < b[1] || p[1] >= b[3]) continue;
          if (keepEdge(f, i, j, 1, 0) && keepEdge(f, i, j, 0, 1) && keepEdge(f, i - 1, j, 1, 0) && keepEdge(f, i, j - 1, 0, 1)) islands.push({ x: p[0], z: p[1], r: GEN.islandR });
        }
      }
    }
  }
  return { streets, islands };
}

type Lattice = { streets: Street[]; islands: { x: number; z: number; r: number }[] };
const LBOX = 128;

const tileKey = (i: number, j: number) => -((i + 30000) * 60000 + (j + 30000)) - 2;

/** Lattice tiles a box needs that aren't computed yet (so a caller can build them one at a time). */
export function latticeMissing(ctx: Ctx, b: Box): [number, number][] {
  const out: [number, number][] = [];
  for (let i = Math.floor(b[0] / LBOX); i <= Math.floor(b[2] / LBOX); i++) for (let j = Math.floor(b[1] / LBOX); j <= Math.floor(b[3] / LBOX); j++)
    if (!ctx.lattice.has(tileKey(i, j))) out.push([i, j]);
  return out;
}

export function latticeTile(ctx: Ctx, i: number, j: number): Lattice {
  let t = ctx.lattice.get(tileKey(i, j)) as Lattice | undefined;
  if (!t) { t = latticeBox(ctx, [i * LBOX, j * LBOX, (i + 1) * LBOX, (j + 1) * LBOX]); ctx.lattice.set(tileKey(i, j), t); }
  return t;
}

/** Lattice streets meeting a box, assembled from memoised 128-unit tiles (each tile is computed once). */
export function latticeStreets(ctx: Ctx, b: Box): Lattice {
  const seen = new Set<number>(), streets: Street[] = [], islands: Lattice['islands'] = [];
  for (let i = Math.floor(b[0] / LBOX); i <= Math.floor(b[2] / LBOX); i++) for (let j = Math.floor(b[1] / LBOX); j <= Math.floor(b[3] / LBOX); j++) {
    const t = latticeTile(ctx, i, j);
    for (const s of t.streets) if (!seen.has(s.key) && meetsSeg(b, s.p[0], s.p[1])) { seen.add(s.key); streets.push(s); }
    for (const p of t.islands) if (p.x >= b[0] && p.x < b[2] && p.z >= b[1] && p.z < b[3]) islands.push(p);
  }
  streets.sort((x, y) => x.key - y.key);
  return { streets, islands };
}

// --- Timed: dead-end stubs off the real roads -------------------------------------------------------------------

const stubCache = new WeakMap<WarpedNet, Map<number, Street[]>>();

function stubsOf(ctx: Ctx, r: WRoad): Street[] {
  let m = stubCache.get(ctx.wn);
  if (!m) { m = new Map(); stubCache.set(ctx.wn, m); }
  const hit = m.get(r.i);
  if (hit) return hit;
  const out: Street[] = [];
  const L = r.cum[r.cum.length - 1];
  const h = new Hasher([ctx.seed, r.key, 77]);
  if (r.road.cls === 'lane' || r.road.bridge) { m.set(r.i, out); return out; }
  for (let s = h.range(15, 40), n = 0; s < L - 15; n++) {
    const p = slice(r.p, r.cum, s, s + 0.01);
    const dx = p[1][0] - p[0][0], dz = p[1][1] - p[0][1], dl = Math.hypot(dx, dz) || 1;
    const area = areaOf(ctx, p[0][0], p[0][1]);
    const st = AREA_STYLE[area.kind];
    // Divided roads only get stubs on their outer (left) side; two-way roads alternate.
    const side = r.road.oneway || h.chance(0.5) ? 1 : -1;
    const nx = (dz / dl) * side, nz = (-dx / dl) * side;
    const w = area.kind === 'saltlake' || area.kind === 'bypass' ? STREET_W.residential : STREET_W.lane;
    const len = h.range(...st.stubLen);
    const off = r.road.w / 2 - 0.2;
    const a: Pt = [p[0][0] + nx * off, p[0][1] + nz * off];
    const e: Pt = [a[0] + nx * len, a[1] + nz * len];
    const from: Pt = [a[0] + nx * (FOOT[r.road.cls] + w), a[1] + nz * (FOOT[r.road.cls] + w)];
    if (clear(ctx, from, e, w, { roads: 'all', skipRoad: r.i })) {
      out.push(makeStreet(r.key * 4096 + n, [a, e], w, w === STREET_W.lane ? 'lane' : 'residential', false, { deadEnd: true, parent: r.i }));
    }
    s += h.range(...st.stubEvery);
  }
  m.set(r.i, out);
  return out;
}

export function stubStreets(ctx: Ctx, b: Box): Street[] {
  const pad = 70;
  return ctx.wn.roadsIn(b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad).flatMap((r) => stubsOf(ctx, r)).filter((s) => meetsSeg(b, s.p[0], s.p[1]));
}

// --- The Sector V map's road ends -------------------------------------------------------------------------------

/** Free: each map road end continues straight out until something is in the way. Timed: a short capped stub. */
export function mapEndStreets(ctx: Ctx, b: Box): Street[] {
  let all = ctx.lattice.get(-1) as Street[] | undefined;
  if (!all) { all = allMapEnds(ctx); ctx.lattice.set(-1, all); }
  return all.filter((s) => meetsSeg(b, s.p[0], s.p[1]));
}

function allMapEnds(ctx: Ctx): Street[] {
  const out: Street[] = [];
  (ctx.net.mapEnds ?? []).forEach((e, i) => {
    const max = ctx.mode === 'free' ? 60 : 7;
    const cls: RoadClass = e.k.startsWith('primary') ? 'primary' : e.k.startsWith('secondary') ? 'secondary' : e.k.startsWith('tertiary') ? 'tertiary' : e.k === 'service' ? 'lane' : 'residential';
    let len = max;
    if (ctx.mode === 'free') {
      for (let d = 10; d <= max; d += 10) {
        const a: Pt = [e.p[0] + e.d[0] * (d - 10), e.p[1] + e.d[1] * (d - 10)], c: Pt = [e.p[0] + e.d[0] * d, e.p[1] + e.d[1] * d];
        if (d > 20 && !clear(ctx, a, c, e.w, { roads: 'parallel' })) { len = d - 10; break; }
      }
    }
    const end: Pt = [e.p[0] + e.d[0] * len, e.p[1] + e.d[1] * len];
    out.push(makeStreet(-1000 - i, [e.p, end], e.w, cls, false, { deadEnd: ctx.mode === 'timed' }));
  });
  return out;
}

/** Real road ends that lead nowhere (not on the square edge, not at Sealdah, not on another road): timed dead ends. */
export interface LooseEnd { p: Pt; rot: number; w: number; key: number }
const looseCache = new WeakMap<WarpedNet, LooseEnd[]>();
export function looseEnds(ctx: Ctx): LooseEnd[] {
  const hit = looseCache.get(ctx.wn);
  if (hit) return hit;
  const ends: LooseEnd[] = [];
  for (const r of ctx.wn.roads) {
    const n = r.p.length;
    for (const [e, o, k] of [[r.p[0], r.p[1], 1], [r.p[n - 1], r.p[n - 2], n - 1]] as [Pt, Pt, number][]) {
      if (Math.max(Math.abs(e[0]), Math.abs(e[1])) <= HALF + 0.5) continue;
      if (Math.hypot(e[0] - ctx.wn.sealdah.x, e[1] - ctx.wn.sealdah.z) < ctx.wn.sealdah.r + 60) continue;
      let joined = false;
      for (const [ri, kk] of ctx.wn.segmentsIn(e[0] - 3, e[1] - 3, e[0] + 3, e[1] + 3)) {
        if (ri === r.i && Math.abs(kk - k) < 3) continue;
        const q = ctx.wn.roads[ri];
        if (segDist(e[0], e[1], q.p[kk - 1][0], q.p[kk - 1][1], q.p[kk][0], q.p[kk][1]) < q.road.w / 2 + 2) { joined = true; break; }
      }
      if (!joined) ends.push({ p: e, rot: Math.atan2(e[1] - o[1], e[0] - o[0]), w: r.road.w, key: r.key * 2 + (k === 1 ? 0 : 1) });
    }
  }
  looseCache.set(ctx.wn, ends);
  return ends;
}
