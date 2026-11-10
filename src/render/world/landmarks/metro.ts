// The Green Line through the streamed world (LANDMARKS.md "Things that repeat", §6-7): a wide box deck on round grey
// piers with blue-and-white painted bases, a dark ribbed (waffle) soffit, elevated stations over 3rd Avenue and the
// Bypass, then the ramp after Salt Lake Stadium down to grade into a walled cut and the tunnel portal.
// Underground stretches draw nothing but the street entrances of their stations.

import { LM } from '../../../content/landmarks';
import { METRO_PIER_MIN_Y, METRO_PIER_R, STATION_MIN_Y, metroLayout, portalHalf, stationOver } from '../../../sim/gen/layout';
import { intervals, marks, owns, inSectorV, pieces, sample } from './clip';
import type { Ctx } from './ctx';
import { elevatedStation, undergroundEntrance, pierLook } from './stations';

const C = { deck: 0xc9c2b8, soffit: 0x8d8a85, rib: 0x6f6c68, pier: 0xbfb8ad, blue: 0x2f5fa8, white: 0xeeeeea, rail: 0x7a7f84, wall: 0xb4ada2, bed: 0x6b6259, dark: 0x0d0f12, grass: 0x557a3a, earth: 0x7d6a4f };

export type { MetroPrep } from '../../../sim/gen/layout';

export const metroPrep = (ctx: Ctx) => metroLayout(ctx.net, ctx.warp);

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
    for (const s of marks(l, ctx.cx, ctx.cz, LM.pierStep)) {
      const y = mp.y(s);
      if (y === null || y < METRO_PIER_MIN_Y) continue;
      if (stationOver(mp, s)) continue; // the station has its own pier pairs
      pier(ctx, sample(l, s), y, pierLook(''));
    }
    for (const pt of mp.portals) {
      const q = sample(l, pt.s);
      if (owns(ctx.cx, ctx.cz, q.x, q.z) && !inSectorV(q.x, q.z)) portal(ctx, q, pt.dir);
    }
    for (const st of mp.stations) {
      const q = sample(l, st.s);
      if (st.elevated && (mp.y(st.s) ?? 0) > STATION_MIN_Y) {
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
  look.base.forEach((c, i) => P.cyl(METRO_PIER_R, 0.45, q.x, i * 0.45, q.z, c, 1, 0, 10));
}

/** The tunnel mouth: a concrete box over the tracks with a dark opening, grassed over, earth falling away. */
export function portal(ctx: Ctx, q: S, dir: 1 | -1) {
  const f = ctx.frame(q.x, q.z, Math.atan2(q.dz * dir, q.dx * dir));
  const h = portalHalf();
  f.box(0, 14, -h - 0.8, h + 0.8, 0, 7.2, C.wall);
  f.box(-0.4, 0.2, -h - 1.2, h + 1.2, 6.4, 7.6, 0xa39c91); // headwall coping
  f.quad([-0.05, -h + 0.6, 0], [-0.05, h - 0.6, 0], [-0.05, h - 0.6, 5.6], [-0.05, -h + 0.6, 5.6], C.dark);
  f.box(1.5, 22, -h - 4, h + 4, 7.2, 8.0, C.grass);
  f.box(14, 30, -h - 6, h + 6, 0, 3.5, C.earth);
  f.box(14, 30, -h - 6, h + 6, 3.5, 4.0, C.grass);
  for (const side of [1, -1]) f.box(-1, 0, side * (h + 0.6) - 0.3, side * (h + 0.6) + 0.3, 0, 8.2, C.wall); // wing walls
}

export { C as METRO_COLOURS };
