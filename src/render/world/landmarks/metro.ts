// The Green Line through the streamed world (LANDMARKS.md "Things that repeat", §6-7): a wide box deck on round grey
// piers with blue-and-white painted bases, a dark ribbed (waffle) soffit, elevated stations over 3rd Avenue and the
// Bypass, then the ramp after Salt Lake Stadium down to grade into a walled cut and the tunnel portal.
// Underground stretches draw nothing but the street entrances of their stations.

import type { MetroLine } from '../../../sim/gen/types';
import { LM } from '../../../content/landmarks';
import { type Line, intervals, marks, owns, inSectorV, pieces, prepLine, sample } from './clip';
import { type Ctx, memo } from './ctx';
import { elevatedStation, undergroundEntrance, pierLook } from './stations';

const C = { deck: 0xc9c2b8, soffit: 0x8d8a85, rib: 0x6f6c68, pier: 0xbfb8ad, blue: 0x2f5fa8, white: 0xeeeeea, rail: 0x7a7f84, wall: 0xb4ada2, bed: 0x6b6259, dark: 0x0d0f12, grass: 0x557a3a, earth: 0x7d6a4f };

export interface MetroPrep {
  m: MetroLine;
  l: Line;
  /** Rail level at arc length s, or null where the line is underground. */
  y: (s: number) => number | null;
  /** Tunnel mouths: arc position and the direction (+1: the tunnel lies toward larger s). */
  portals: { s: number; dir: 1 | -1 }[];
  /** Stations snapped onto the line. */
  stations: { name: string; s: number; elevated: boolean; x: number; z: number }[];
}

export function metroPrep(ctx: Ctx): MetroPrep[] {
  return memo(ctx.net, ctx.warp, 'metro', () => ctx.net.metro.map((m) => prep(ctx, m)));
}

function prep(ctx: Ctx, m: MetroLine): MetroPrep {
  const l = prepLine(m.p, ctx.warp);
  const Y = LM.viaductY, R = LM.rampLen, K = LM.cutLen;
  const ranges = m.elevated.map(([i0, i1]) => [l.at[Math.max(0, i0)] ?? 0, l.at[Math.min(m.p.length - 1, i1)] ?? l.len] as const);
  const portals: MetroPrep['portals'] = [];
  for (const [a, b] of ranges) {
    if (b < l.len - 1e-6) portals.push({ s: Math.min(l.len, b + K), dir: 1 });
    if (a > 1e-6) portals.push({ s: Math.max(0, a - K), dir: -1 });
  }
  const y = (s: number): number | null => {
    for (const [a, b] of ranges) {
      if (s < a - K || s > b + K) continue;
      const up = a > 1e-6 ? (s - a) / R : Infinity, down = b < l.len - 1e-6 ? (b - s) / R : Infinity;
      return Math.max(0, Y * Math.min(1, up, down));
    }
    return null;
  };
  const stations = m.stations.map((st) => {
    const [gx, gz] = ctx.warp.toGame([st.x, st.z]);
    let best = { s: 0, d: Infinity };
    for (let i = 1; i < l.p.length; i++) {
      const [ax, az] = l.p[i - 1], [bx, bz] = l.p[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((gx - ax) * dx + (gz - az) * dz) / L2));
      const d = Math.hypot(ax + dx * t - gx, az + dz * t - gz);
      if (d < best.d) best = { s: l.d[i - 1] + t * (l.d[i] - l.d[i - 1]), d };
    }
    return { name: st.name, s: best.s, elevated: st.elevated, x: gx, z: gz };
  });
  return { m, l, y, portals, stations };
}

/** The deck, ramp, cut, piers, portals and stations of every metro line inside the chunk. */
export function buildMetro(ctx: Ctx) {
  for (const mp of metroPrep(ctx)) {
    const { l } = mp;
    for (const [a, b] of pieces(intervals(l, ctx.cx, ctx.cz), 3)) {
      const y = mp.y((a + b) / 2);
      if (y === null) continue;
      const p = sample(l, a), q = sample(l, b);
      if (y >= 1) deckPiece(ctx, p, q, y, Math.floor((a + b) / 6) % 2 === 0);
      else cutPiece(ctx, p, q);
    }
    const near = (s: number) => mp.stations.find((st) => st.elevated && Math.abs(st.s - s) < LM.station.len / 2);
    for (const s of marks(l, ctx.cx, ctx.cz, LM.pierStep)) {
      const y = mp.y(s);
      if (y === null || y < 4) continue;
      const st = near(s);
      if (st) continue; // the station has its own pier pairs
      pier(ctx, sample(l, s), y, pierLook(''));
    }
    for (const pt of mp.portals) {
      const q = sample(l, pt.s);
      if (owns(ctx.cx, ctx.cz, q.x, q.z) && !inSectorV(q.x, q.z)) portal(ctx, q, pt.dir);
    }
    for (const st of mp.stations) {
      const q = sample(l, st.s);
      if (st.elevated && (mp.y(st.s) ?? 0) > 6) {
        if (owns(ctx.cx, ctx.cz, q.x, q.z) && !inSectorV(q.x, q.z)) elevatedStation(ctx, q, st.name);
      } else if (!st.elevated && owns(ctx.cx, ctx.cz, st.x, st.z) && !inSectorV(st.x, st.z)) {
        undergroundEntrance(ctx, st.x, st.z, st.name);
      }
    }
  }
}

type S = { x: number; z: number; dx: number; dz: number };

function deckPiece(ctx: Ctx, p: S, q: S, y: number, rib: boolean) {
  const P = ctx.parts, W = LM.viaductW, h = W / 2;
  const nx = p.dz, nz = -p.dx;
  P.span([p.x, p.z], [q.x, q.z], 1.3, W * 0.62, y - 2.1, C.deck); // box girder
  P.span([p.x, p.z], [q.x, q.z], 0.12, W * 0.6, y - 2.15, C.soffit); // dark soffit under it
  P.span([p.x, p.z], [q.x, q.z], 0.45, W, y - 0.8, C.deck); // deck slab with its overhangs
  if (rib) { // the waffle: cross ribs under the overhangs and the girder
    const mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2;
    P.span([mx + nx * h, mz + nz * h], [mx - nx * h, mz - nz * h], 0.35, 0.3, y - 1.15, C.rib);
  }
  for (const side of [1, -1]) {
    const o = (h - 0.15) * side, a: [number, number] = [p.x + nx * o, p.z + nz * o], b: [number, number] = [q.x + nx * o, q.z + nz * o];
    P.span(a, b, 1.05, 0.3, y - 0.35, C.deck); // parapet
    P.span(a, b, 0.06, 0.06, y + 1.0, C.rail);
  }
  // The two tracks on the deck (one dark strip each), visible from the flyovers and stations.
  for (const t of [-1.35, 1.35]) P.span([p.x + nx * t, p.z + nz * t], [q.x + nx * t, q.z + nz * t], 0.1, 1.0, y - 0.35, C.rail);
}

/** At grade: a ballast bed between two low concrete walls (the U-shaped cut before the portal). */
function cutPiece(ctx: Ctx, p: S, q: S) {
  const P = ctx.parts, h = LM.viaductW / 2, nx = p.dz, nz = -p.dx;
  P.span([p.x, p.z], [q.x, q.z], 0.2, LM.viaductW - 0.6, 0, C.bed);
  for (const side of [1, -1]) {
    const o = (h - 0.2) * side;
    P.span([p.x + nx * o, p.z + nz * o], [q.x + nx * o, q.z + nz * o], 1.7, 0.45, 0, C.wall);
  }
}

export interface PierLook { base: number[]; shaft: number }

/** A round pier with a hammerhead cap; its base painted in bands (blue-white, mosaic or mural colours). */
export function pier(ctx: Ctx, q: S, y: number, look: PierLook) {
  const P = ctx.parts, top = y - 2.1, rot = -Math.atan2(q.dz, q.dx);
  P.box(1.9, 0.9, LM.viaductW * 0.85, q.x, top - 0.9, q.z, rot, C.pier);
  P.box(1.5, 0.6, LM.viaductW * 0.45, q.x, top - 1.5, q.z, rot, C.pier);
  P.cyl(1.0, top - 1.5, q.x, 0, q.z, look.shaft, 1, 0, 10);
  look.base.forEach((c, i) => P.cyl(1.06, 0.45, q.x, i * 0.45, q.z, c, 1, 0, 10));
}

/** The tunnel mouth: a concrete box over the tracks with a dark opening, grassed over, earth falling away. */
export function portal(ctx: Ctx, q: S, dir: 1 | -1) {
  const f = ctx.frame(q.x, q.z, Math.atan2(q.dz * dir, q.dx * dir));
  const h = LM.viaductW / 2 + 0.6;
  f.box(0, 14, -h - 0.8, h + 0.8, 0, 7.2, C.wall);
  f.box(-0.4, 0.2, -h - 1.2, h + 1.2, 6.4, 7.6, 0xa39c91); // headwall coping
  f.quad([-0.05, -h + 0.6, 0], [-0.05, h - 0.6, 0], [-0.05, h - 0.6, 5.6], [-0.05, -h + 0.6, 5.6], C.dark);
  f.box(1.5, 22, -h - 4, h + 4, 7.2, 8.0, C.grass);
  f.box(14, 30, -h - 6, h + 6, 0, 3.5, C.earth);
  f.box(14, 30, -h - 6, h + 6, 3.5, 4.0, C.grass);
  for (const side of [1, -1]) f.box(-1, 0, side * (h + 0.6) - 0.3, side * (h + 0.6) + 0.3, 0, 8.2, C.wall); // wing walls
}

export { C as METRO_COLOURS };
