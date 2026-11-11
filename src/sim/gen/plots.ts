// Building plots along streets. Candidates come from global street polylines, so the same plot is proposed by every
// chunk that looks at it; a candidate survives unless it hits a road, water, a landmark, the Sector V square or a
// higher-priority candidate. That rule is local (no chains), so neighbouring chunks agree without coordinating.

import { AREA_STYLE } from '../../content/worldgen';
import { HALF } from './clip';
import { Hasher, type Rect, rectRing, rectSegDist, rectsOverlap, segDist } from './geom';
import { areaOf, type Box, type Ctx, reach, type Street } from './streets';
import type { AreaKind, BuildingStyle, GenBuilding, GenProp, Pt } from './types';

export interface Plot {
  rect: Rect;
  pri: number;
  area: AreaKind;
  storeys: number;
  style: BuildingStyle;
  colour: number;
  shop: boolean;
  /** Compound wall along the front (set-back houses), as a rect. */
  wall?: Rect;
  /** Memo: passed the static tests (roads, water, landmarks, square). */
  ok?: boolean;
  /** Memo: survived the priority rule too (final). */
  kept?: boolean;
}

/** Plot candidates on both sides of a street (memoised per street key: they depend only on the street). */
function candidates(ctx: Ctx, s: Street): Plot[] {
  const hit = ctx.plots.get(s.key) as Plot[] | undefined;
  if (hit) return hit;
  const out: Plot[] = [];
  const L = s.cum[s.cum.length - 1];
  ctx.plots.set(s.key, out);
  if (s.bridge || L < 6) return out;
  for (const side of [1, -1]) {
    const h = new Hasher([ctx.seed, s.key, side, 31]);
    let at = h.range(1, 4);
    for (let n = 0; at < L - 2 && n < 400; n++) {
      const [x, z] = frame(s, Math.min(at + 4, L - 0.1));
      const area = areaOf(ctx, x, z);
      const st = AREA_STYLE[area.kind];
      const width = h.range(...st.plot);
      const depth = h.range(...st.depth) * (ctx.mode === 'timed' ? 1.25 : 1);
      const c = at + width / 2;
      if (c > L - 1) break;
      const [cx0, cz0, tx, tz] = frame(s, c);
      const nx = tz * side, nz = -tx * side;
      const off = reach(s) + st.setback + depth / 2 + 0.2;
      const gap = st.setback > 0 ? 1.2 : 0.15;
      const rect: Rect = { x: cx0 + nx * off, z: cz0 + nz * off, ux: tx, uz: tz, hl: width / 2 - gap / 2, hd: depth / 2 };
      const tower = st.tower && h.chance(st.tower[0]);
      const storeys = tower ? h.int(...st.tower![1]) : h.int(...st.storeys);
      const style: BuildingStyle = tower ? 'office' : h.pick(st.styles);
      const plot: Plot = {
        rect, pri: s.rank * 2 + h.next(), area: area.kind, storeys, style, colour: h.pick(st.colours),
        shop: (style === 'shop' || style === 'market' || h.chance(st.shop)) && st.setback < 2,
      };
      if (st.wall && st.setback >= 2) {
        const wo = reach(s) + 0.4;
        plot.wall = { x: cx0 + nx * wo, z: cz0 + nz * wo, ux: tx, uz: tz, hl: width / 2 - 1.6, hd: 0.15 };
      }
      out.push(plot);
      at += width;
    }
  }
  return out;
}

/** Point and unit tangent at arc length s. */
export function frame(s: Street, at: number): [number, number, number, number] {
  let k = 1;
  while (k < s.cum.length - 1 && s.cum[k] < at) k++;
  const a = s.p[k - 1], b = s.p[k], L = s.cum[k] - s.cum[k - 1] || 1;
  const t = Math.max(0, Math.min(1, (at - s.cum[k - 1]) / L));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / L, (b[1] - a[1]) / L];
}

/** A hash grid of street segments for quick footprint tests. */
export class SegIndex {
  private cells = new Map<number, { a: Pt; b: Pt; r: number; half: number; deck: boolean }[]>();
  constructor(streets: Street[], private size = 16) {
    for (const s of streets) {
      const r = reach(s);
      for (let i = 1; i < s.p.length; i++) {
        const a = s.p[i - 1], b = s.p[i];
        const x0 = Math.floor((Math.min(a[0], b[0]) - r) / size), x1 = Math.floor((Math.max(a[0], b[0]) + r) / size);
        const z0 = Math.floor((Math.min(a[1], b[1]) - r) / size), z1 = Math.floor((Math.max(a[1], b[1]) + r) / size);
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
          const k = key(x, z);
          const l = this.cells.get(k);
          const seg = { a, b, r, half: s.w / 2, deck: s.bridge === 'flyover' };
          if (l) l.push(seg); else this.cells.set(k, [seg]);
        }
      }
    }
  }

  /** True if the rectangle touches any street's carriageway or footpath. */
  hitsRect(r: Rect): boolean {
    const e = Math.max(r.hl, r.hd);
    const x0 = Math.floor((r.x - e) / this.size), x1 = Math.floor((r.x + e) / this.size);
    const z0 = Math.floor((r.z - e) / this.size), z1 = Math.floor((r.z + e) / this.size);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      for (const s of this.cells.get(key(x, z)) ?? []) {
        // Cheap reject: the segment is farther from the centre than the rect's circumradius plus its reach.
        if (segDist(r.x, r.z, s.a[0], s.a[1], s.b[0], s.b[1]) > s.r + r.hl + r.hd) continue;
        if (rectSegDist(r, s.a, s.b) < s.r) return true;
      }
    }
    return false;
  }

  /** True if (x, z) is within `pad` of a street's carriageway (footpaths excluded), or of its footpath too. */
  /** `groundOnly`: ignore flyover decks (things at ground level can stand under a deck's edge). */
  onRoad(x: number, z: number, pad: number, withFoot = false, groundOnly = false): boolean {
    for (const s of this.cells.get(key(Math.floor(x / this.size), Math.floor(z / this.size))) ?? []) {
      if (groundOnly && s.deck) continue;
      const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2));
      if (Math.hypot(s.a[0] + dx * t - x, s.a[1] + dz * t - z) < (withFoot ? s.r : s.half) + pad) return true;
    }
    return false;
  }
}

const key = (x: number, z: number) => (x + 50000) * 100000 + (z + 50000);
const G = 32;
const cell = (x: number, z: number) => (Math.floor(x / G) + 5000) * 10000 + Math.floor(z / G) + 5000;

export interface Obstacles {
  /** Circles to keep clear: landmarks, Sealdah forecourt, islands. */
  circles: { x: number; z: number; r: number; market?: boolean }[];
}

function blockedBy(ctx: Ctx, r: Rect, ob: Obstacles): boolean {
  const ring = rectRing(r);
  const m = HALF + 12;
  if (ring.some(([x, z]) => Math.abs(x) < m && Math.abs(z) < m)) return true;
  for (const c of ob.circles) {
    const dx = c.x - r.x, dz = c.z - r.z;
    const u = Math.max(0, Math.abs(dx * r.ux + dz * r.uz) - r.hl), v = Math.max(0, Math.abs(-dx * r.uz + dz * r.ux) - r.hd);
    if (Math.hypot(u, v) < c.r) return true;
  }
  return ctx.water.rect(r);
}

/**
 * Buildings (and their compound walls) whose plot centre lies in the chunk box `cb`. `streets` must include every
 * street within GEN reach of the box, `idx` indexes the same streets.
 */
export interface Built { buildings: GenBuilding[]; walls: GenProp[]; wallRings: Pt[][] }

export function buildings(ctx: Ctx, cb: Box, streets: Street[], idx: SegIndex, ob: Obstacles): Built {
  return drain(buildingsJob(ctx, cb, streets, idx, ob));
}

/** Runs a job to completion. */
export function drain<T>(g: Generator<void, T>): T {
  for (;;) { const r = g.next(); if (r.done) return r.value; }
}

/** The same, in slices: yields between batches of work so a caller can spread one chunk over several frames. */
export function* buildingsJob(ctx: Ctx, cb: Box, streets: Street[], idx: SegIndex, ob: Obstacles): Generator<void, Built> {
  // Register every street's candidates in the context's plot grid (once per street).
  const grid = ctx.plotGrid as Map<number, Plot[]>;
  if (ctx.plots.size > 60000) { ctx.plots.clear(); grid.clear(); }
  let work = 0;
  for (const s of streets) {
    if (ctx.plots.has(s.key)) continue;
    if (++work % 16 === 0) yield;
    for (const p of candidates(ctx, s)) {
      const k = cell(p.rect.x, p.rect.z);
      const l = grid.get(k);
      if (l) l.push(p); else grid.set(k, [p]);
    }
  }
  // The static tests and the priority rule, memoised on each plot. Only plots that overlap one in this chunk are
  // ever tested here, and those lie well inside the reach where `idx` and `ob` are complete.
  const okOf = (p: Plot) => { if (p.ok === undefined) { work++; p.ok = !idx.hitsRect(p.rect) && !blockedBy(ctx, p.rect, ob); } return p.ok; };
  const beaten = (p: Plot) => {
    const gx = Math.floor(p.rect.x / G), gz = Math.floor(p.rect.z / G);
    for (let x = gx - 1; x <= gx + 1; x++) for (let z = gz - 1; z <= gz + 1; z++) {
      for (const q of grid.get((x + 5000) * 10000 + z + 5000) ?? []) if (q.pri > p.pri && rectsOverlap(p.rect, q.rect, 0.05) && okOf(q)) return true;
    }
    return false;
  };
  const ok: Plot[] = [];
  for (let gx = Math.floor(cb[0] / G); gx <= Math.floor((cb[2] - 1e-9) / G); gx++)
    for (let gz = Math.floor(cb[1] / G); gz <= Math.floor((cb[3] - 1e-9) / G); gz++)
      for (const p of grid.get((gx + 5000) * 10000 + gz + 5000) ?? []) {
        if (p.rect.x < cb[0] || p.rect.x >= cb[2] || p.rect.z < cb[1] || p.rect.z >= cb[3]) continue;
        if (p.kept ??= okOf(p) && !beaten(p)) ok.push(p);
        if (work > 60) { work = 0; yield; }
      }
  ok.sort((a, b) => b.pri - a.pri || a.rect.x - b.rect.x || a.rect.z - b.rect.z);
  const out: GenBuilding[] = [], walls: GenProp[] = [], wallRings: Pt[][] = [];
  for (const p of ok) {
    out.push({ p: rectRing(p.rect), storeys: p.storeys, style: p.style, colour: p.colour, shop: p.shop });
    if (p.wall && !idx.hitsRect({ ...p.wall, hd: 0.05 }) && !blockedBy(ctx, p.wall, ob)) {
      walls.push({ kind: 'wall', x: p.wall.x, z: p.wall.z, rot: Math.atan2(p.wall.uz, p.wall.ux), len: p.wall.hl * 2 });
      wallRings.push(rectRing(p.wall));
    }
  }
  return { buildings: out, walls, wallRings };
}

/**
 * Streets this far outside a chunk can still matter to it: a plot that overlaps one centred in the chunk has its
 * centre within 2 half-diagonals (≤ 28) of the chunk, and its street lies within reach + setback + depth/2 (≤ 25).
 */
export const PLOT_REACH = 54;
