// One chunk of the streamed world, generated from the real network: pure and deterministic. The same
// (net, warp, mode, cx, cz, seed) always gives the same chunk, and neighbouring chunks agree at their seams
// because every street, plot and prop is derived from global geometry, then kept by the chunk that contains it.

import { deadEnds } from '../../content/text';
import { FOOT, GEN } from '../../content/worldgen';
import { HALF } from './clip';
import { clipLineToBox, hash } from './geom';
import { makeCtx, meets, pondsIn } from './ctx';
import { buildingsJob, drain, type Obstacles, PLOT_REACH, SegIndex } from './plots';
import { deadEndRing, props } from './props';
import { areaOf, type Box, footOf, latticeMissing, latticeStreets, latticeTile, looseEnds, mapEndStreets, realStreets, type Street, stubStreets } from './streets';
import { CHUNK, type Chunk, type GenRoad, type PlayMode, type Pt, type Warp, type WorldNet } from './types';

/** Chunk key for maps: stable for any integer pair in ±30000. */
export const chunkKey = (cx: number, cz: number) => (cx + 30000) * 60000 + (cz + 30000);

/** True if the chunk lies entirely inside the Sector V square (nothing to generate). */
export function insideSquare(cx: number, cz: number) {
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  return x0 >= -HALF && x0 + CHUNK <= HALF && z0 >= -HALF && z0 + CHUNK <= HALF;
}

/** True if a ring's bounding box meets the box. */
function touches(ring: Pt[], b: Box) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of ring) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  return x0 <= b[2] && b[0] <= x1 && z0 <= b[3] && b[1] <= z1;
}

/** Sutherland-Hodgman clip of a ring to an axis-aligned box. */
export function clipRingToBox(ring: Pt[], b: Box): Pt[] {
  let pts = ring;
  for (const [axis, lim, keepLess] of [[0, b[2], true], [0, b[0], false], [1, b[3], true], [1, b[1], false]] as [0 | 1, number, boolean][]) {
    if (pts.length < 3) return [];
    const ins = (q: Pt) => (keepLess ? q[axis] <= lim : q[axis] >= lim);
    const out: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i], prev = pts[(i + pts.length - 1) % pts.length];
      if (ins(cur) !== ins(prev)) {
        const t = (lim - prev[axis]) / (cur[axis] - prev[axis]);
        out.push([prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t]);
      }
      if (ins(cur)) out.push(cur);
    }
    pts = out;
  }
  return pts.length >= 3 ? pts : [];
}

function circleRing(x: number, z: number, r: number, n = 10): Pt[] {
  return Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, z + Math.sin((i / n) * Math.PI * 2) * r] as Pt);
}

export function generateChunk(net: WorldNet, warp: Warp, mode: PlayMode, cx: number, cz: number, seed: number): Chunk {
  return drain(chunkJob(net, warp, mode, cx, cz, seed));
}

/**
 * generateChunk in slices: each `next()` does a bounded piece of work (a lattice tile, a batch of plots, ...), so
 * the store can spread a chunk over frames. The result is identical to generateChunk's.
 */
export function* chunkJob(net: WorldNet, warp: Warp, mode: PlayMode, cx: number, cz: number, seed: number): Generator<void, Chunk> {
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  const cb: Box = [x0, z0, x0 + CHUNK, z0 + CHUNK];
  const ctx = makeCtx(net, warp, mode, seed);
  const chunk: Chunk = { cx, cz, x0, z0, area: areaOf(ctx, x0 + CHUNK / 2, z0 + CHUNK / 2).kind, roads: [], buildings: [], props: [], landmarks: [], blockers: [], water: [], islands: [] };
  if (insideSquare(cx, cz)) return chunk;

  const R = PLOT_REACH;
  const eb: Box = [cb[0] - R, cb[1] - R, cb[2] + R, cb[3] + R];
  const streets: Street[] = [...realStreets(ctx, eb), ...mapEndStreets(ctx, eb)];
  let islands: { x: number; z: number; r: number }[] = [];
  if (mode === 'free') {
    for (const [i, j] of latticeMissing(ctx, eb)) { latticeTile(ctx, i, j); yield; }
    const lat = latticeStreets(ctx, eb);
    streets.push(...lat.streets);
    islands = lat.islands;
  } else streets.push(...stubStreets(ctx, eb));

  // What plots and props must keep clear of.
  const water = [...ctx.wn.waterIn(...cb), ...ctx.patches, ...pondsIn(ctx, cb)].filter((w) => touches(w, cb));
  const circles: Obstacles['circles'] = ctx.wn.landmarks
    .filter((l) => l.gx > eb[0] - l.r && l.gx < eb[2] + l.r && l.gz > eb[1] - l.r && l.gz < eb[3] + l.r)
    .map((l) => ({ x: l.gx, z: l.gz, r: l.r, market: l.kind === 'market' || l.kind === 'sealdah-station' }));
  circles.push({ x: ctx.wn.sealdah.x, z: ctx.wn.sealdah.z, r: ctx.wn.sealdah.r, market: true });
  circles.push(...islands.map((i) => ({ x: i.x, z: i.z, r: i.r + 1 })));
  const ob: Obstacles = { circles };
  const idx = new SegIndex(streets);

  yield;
  const b = yield* buildingsJob(ctx, cb, streets, idx, ob);
  yield;
  chunk.buildings = b.buildings;
  chunk.props = [...b.walls, ...props(ctx, cb, streets, idx, ob)];
  chunk.blockers.push(...b.wallRings);

  // Timed: real roads that lead nowhere get a dead end too.
  if (mode === 'timed') {
    for (const e of looseEnds(ctx)) {
      if (e.p[0] < cb[0] || e.p[0] >= cb[2] || e.p[1] < cb[1] || e.p[1] >= cb[3]) continue;
      chunk.props.push({ kind: 'dead-end', x: e.p[0], z: e.p[1], rot: e.rot, len: e.w + 4, v: Math.floor(hash(e.key, 3) * 4), text: deadEnds[Math.floor(hash(seed, e.key, 9) * deadEnds.length)] });
    }
  }
  for (const p of chunk.props) if (p.kind === 'dead-end') chunk.blockers.push(deadEndRing(p));

  // Roads clipped to the chunk.
  for (const s of streets) {
    if (!meets(cb, ...s.box)) continue;
    for (const piece of clipLineToBox(s.p, ...cb)) {
      const g: GenRoad = { p: piece, w: s.w, cls: s.cls, real: s.real };
      if (s.bridge) g.bridge = s.bridge;
      if (s.tram) g.tram = true;
      if (footOf(s) === 0) g.noFoot = true;
      chunk.roads.push(g);
    }
  }
  for (const i of islands) {
    if (i.x < cb[0] || i.x >= cb[2] || i.z < cb[1] || i.z >= cb[3]) continue;
    chunk.islands!.push(i);
    chunk.blockers.push(circleRing(i.x, i.z, i.r));
    chunk.props.push({ kind: 'palm', x: i.x, z: i.z, rot: 0, v: 0 });
  }
  for (const w of water) {
    const c = clipRingToBox(w, cb);
    if (c.length >= 3 && !c.every(([x, z]) => Math.abs(x) <= HALF && Math.abs(z) <= HALF)) chunk.water!.push(c);
  }
  chunk.landmarks = ctx.wn.landmarks.filter((l) => l.gx >= cb[0] && l.gx < cb[2] && l.gz >= cb[1] && l.gz < cb[3]).map((l) => l.id);
  return chunk;
}

/** Walkable band test helper for the store: is (x, z) on a road or its footpath (grown by GEN.bandPad)? */
export function onBand(chunk: Chunk, x: number, z: number): boolean {
  for (const r of chunk.roads) {
    const reach = r.w / 2 + (r.noFoot ? 0 : FOOT[r.cls]) + GEN.bandPad;
    for (let i = 1; i < r.p.length; i++) {
      const a = r.p[i - 1], b = r.p[i];
      if (x < Math.min(a[0], b[0]) - reach || x > Math.max(a[0], b[0]) + reach || z < Math.min(a[1], b[1]) - reach || z > Math.max(a[1], b[1]) + reach) continue;
      const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
      if (Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z) < reach) return true;
    }
  }
  return false;
}
