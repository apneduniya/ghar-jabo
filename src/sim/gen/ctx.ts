// The generator's shared context for one (net, warp, mode, seed): the warped network, a water raster that
// includes bheri ponds and timed-mode canal patches, and memo tables for global decisions (lattice edges, plots).
// Everything memoised here is a pure function of those four inputs, so caching never changes a chunk.

import { HALF } from './clip';
import { Hasher, rectRing } from './geom';
import { areaAt, type WarpedNet, warped } from './net';
import type { AreaKind, PlayMode, Pt, Warp, WorldNet } from './types';
import { WaterRaster } from './watermask';

export type Box = [number, number, number, number];

export interface Ctx {
  net: WorldNet; wn: WarpedNet; warp: Warp; mode: PlayMode; seed: number;
  water: WaterRaster;
  /** Memo: lattice edge decisions (key -> street or null). */
  lattice: Map<number, unknown>;
  /** Memo: plot candidates per street key, and all of them in a 32-unit grid. */
  plots: Map<number, unknown>;
  plotGrid: Map<number, unknown[]>;
  /** Memo: area per 16-unit cell. */
  areas: Map<number, { kind: AreaKind; gridDeg?: number }>;
  /** Timed: true-width canal patches at canal crossings (game coords). */
  patches: Pt[][];
}

export const meets = (b: Box, x0: number, z0: number, x1: number, z1: number) => b[0] <= x1 && x0 <= b[2] && b[1] <= z1 && z0 <= b[3];

const AREA_CELL = 16;

/** Area character at a game position, looked up at the centre of its 16-unit cell (memoised). */
export function areaOf(ctx: Ctx, x: number, z: number): { kind: AreaKind; gridDeg?: number } {
  const i = Math.floor(x / AREA_CELL), j = Math.floor(z / AREA_CELL);
  const k = (i + 50000) * 100000 + (j + 50000);
  let a = ctx.areas.get(k);
  if (!a) {
    const [rx, rz] = ctx.warp.toReal([(i + 0.5) * AREA_CELL, (j + 0.5) * AREA_CELL]);
    a = areaAt(ctx.net, rx, rz);
    if (ctx.areas.size > 200000) ctx.areas.clear();
    ctx.areas.set(k, a);
  }
  return a;
}

const cache = new WeakMap<WarpedNet, Map<number, Ctx>>();

export function makeCtx(net: WorldNet, warp: Warp, mode: PlayMode, seed: number): Ctx {
  const wn = warped(net, warp);
  let m = cache.get(wn);
  if (!m) { m = new Map(); cache.set(wn, m); }
  const hit = m.get(seed);
  if (hit) return hit;
  const ctx = { net, wn, warp, mode, seed, lattice: new Map(), plots: new Map(), plotGrid: new Map(), areas: new Map(), patches: [] } as unknown as Ctx;
  ctx.patches = canalPatches(ctx);
  ctx.water = new WaterRaster((x0, z0, x1, z1) => [
    ...wn.waterIn(x0, z0, x1, z1),
    ...ctx.patches.filter((r) => r.some(([x, z]) => x > x0 - 90 && x < x1 + 90 && z > z0 - 90 && z < z1 + 90)),
    ...pondsIn(ctx, [x0, z0, x1, z1]),
  ]);
  m.set(seed, ctx);
  return ctx;
}

function canalPatches(ctx: Ctx): Pt[][] {
  if (ctx.mode !== 'timed') return [];
  return ctx.net.crossings.filter((c) => c.kind === 'canal').map((c) => {
    const [x, z] = ctx.warp.toGame([c.x, c.z]);
    const r = ctx.wn.nearestRoad(x, z, 8);
    const h = r ? r.heading : c.heading;
    // The canal runs across the road: its length along (-sin h, cos h), its true width along the road.
    return rectRing({ x, z, ux: -Math.sin(h), uz: Math.cos(h), hl: 40, hd: c.width / 2 });
  });
}

// --- Bheri ponds (Bypass edge and Chingrighata) -------------------------------------------------------------

const POND_CELL = 96;
const pondCache = new WeakMap<Ctx, Map<number, Pt[] | null>>();

/** A pond per POND_CELL cell where the area is a Bypass edge, clear of real roads; deterministic per cell. */
function pondAt(ctx: Ctx, i: number, j: number): Pt[] | null {
  let m = pondCache.get(ctx);
  if (!m) { m = new Map(); pondCache.set(ctx, m); }
  const k = (i + 5000) * 10000 + j + 5000;
  if (m.has(k)) return m.get(k)!;
  let ring: Pt[] | null = null;
  const h = new Hasher([ctx.seed, i, j, 404]);
  const x = (i + 0.5 + h.range(-0.2, 0.2)) * POND_CELL, z = (j + 0.5 + h.range(-0.2, 0.2)) * POND_CELL;
  const kind = areaOf(ctx, x, z).kind;
  if ((kind === 'chingrighata' || kind === 'bypass') && h.chance(0.45) && Math.max(Math.abs(x), Math.abs(z)) > HALF + 60) {
    const rx = h.range(14, 30), rz = h.range(10, 22), a = h.range(0, Math.PI);
    const c = Math.cos(a), s = Math.sin(a);
    const pts: Pt[] = [];
    for (let n = 0; n < 10; n++) {
      const t = (n / 10) * Math.PI * 2, f = h.range(0.85, 1.1);
      const u = Math.cos(t) * rx * f, v = Math.sin(t) * rz * f;
      pts.push([x + u * c - v * s, z + u * s + v * c]);
    }
    const near = ctx.wn.nearestRoad(x, z, Math.max(rx, rz) + 22);
    const lm = ctx.wn.landmarks.some((l) => Math.hypot(l.gx - x, l.gz - z) < l.r + Math.max(rx, rz) + 4);
    if (!near && !lm && !ctx.wn.waterIn(x - rx, z - rx, x + rx, z + rx).length) ring = pts;
  }
  m.set(k, ring);
  return ring;
}

export function pondsIn(ctx: Ctx, b: Box): Pt[][] {
  const out: Pt[][] = [];
  for (let i = Math.floor(b[0] / POND_CELL) - 1; i <= Math.floor(b[2] / POND_CELL); i++)
    for (let j = Math.floor(b[1] / POND_CELL) - 1; j <= Math.floor(b[3] / POND_CELL); j++) {
      const r = pondAt(ctx, i, j);
      if (r) out.push(r);
    }
  return out;
}
