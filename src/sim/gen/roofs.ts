// What is overhead in the streamed world (task 030, AUDIT.md 19-22), so the camera can stay under it as it does
// under the Nabadiganta flyover in Sector V (sim/elevated.ts roofs): flyover deck undersides, the Green Line's soffit
// and pier caps, elevated stations' concourses and crossheads, rail underbridges' girders and stand-in decks. Built
// from the same layout functions the renderer and the collision use (layout.ts, sites.ts), so it follows them.
// Computed once per (net, warp) and filed by chunk, as solids.ts does. Pure: no three.js.

import { LM } from '../../content/landmarks';
import { boxAlong, type Solid, solidDist } from '../solids';
import { chunkKey } from './chunks';
import { type Line, inSectorV, sample } from './lines';
import {
  DECK_MIN_Y, DECK_PIECE, DECK_PIER_PHASE, DECK_PIER_Y, DECK_SLAB, METRO_PIER_MIN_Y, METRO_SOFFIT, RAMP_CLEAR, STATION_MIN_Y,
  deckHalf, deckPierAt, fallbackDeck, flyoverNear, framePt, memo, metroLayout, metroPierAt, netDeckY, netDecks, stationOver, warpHeading,
} from './layout';
import { type BridgeSite, crossingSite, landmarkBridge, stationGround, underbridge } from './sites';
import { CHUNK, type Warp, type WorldNet } from './types';

/** An underside: the footprint it covers and its height. */
export interface Roof { kind: string; s: Solid; y: number }

/** How far past a structure's edge the camera already counts as under it (as Sector V's roofs, w / 2 + 1.2). */
export const ROOF_MARGIN = 1.2;

/** A box in a frame at (x, z) facing h: u0..u1 along, v0..v1 across. */
function frameBox(x: number, z: number, h: number, u0: number, u1: number, v0: number, v1: number): Solid {
  const [cx, cz] = framePt(x, z, h, (u0 + u1) / 2, (v0 + v1) / 2);
  return { x: cx, z: cz, ux: Math.cos(h), uz: Math.sin(h), hl: Math.abs(u1 - u0) / 2, hw: Math.abs(v1 - v0) / 2, r: 0 };
}

const piece = (l: Line, a: number, b: number, hw: number) => {
  const p = sample(l, a), q = sample(l, b);
  return boxAlong([p.x, p.z], [q.x, q.z], hw);
};

/** Arc pieces [a, b] of a line on a global grid of `step`, with their midpoint outside Sector V. */
function stretches(l: Line, step: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 0; a < l.len - 1e-6; a += step) {
    const b = Math.min(l.len, a + step), m = sample(l, (a + b) / 2);
    if (!inSectorV(m.x, m.z)) out.push([a, b]);
  }
  return out;
}

/** Arc positions phase + k * step outside Sector V (where the renderer puts piers, lines.ts marks). */
function marksOf(l: Line, step: number, phase = 0): number[] {
  const out: number[] = [];
  for (let s = phase; s <= l.len + 1e-9; s += step) { const q = sample(l, s); if (!inSectorV(q.x, q.z)) out.push(s); }
  return out;
}

function deckRoofs(net: WorldNet, warp: Warp, out: Roof[]) {
  for (const d of netDecks(net, warp)) {
    const half = deckHalf(d);
    for (const [a, b] of stretches(d.l, DECK_PIECE)) {
      const y = netDeckY(d, (a + b) / 2);
      if (y >= DECK_MIN_Y && y - DECK_SLAB >= RAMP_CLEAR) out.push({ kind: 'flyover deck', s: piece(d.l, a, b, half), y: y - DECK_SLAB });
    }
    // The pier caps hang below the slab: 1.6 along, across most of the deck, from y - 1.7 (render decks.ts).
    for (const m of marksOf(d.l, LM.flyoverPierStep, DECK_PIER_PHASE)) {
      if (netDeckY(d, m) < DECK_PIER_Y) continue;
      const s = deckPierAt(net, warp, d, m);
      if (s === null) continue;
      const y = netDeckY(d, s), q = sample(d.l, s);
      out.push({ kind: 'flyover pier cap', s: boxAlong([q.x - q.dx * 0.8, q.z - q.dz * 0.8], [q.x + q.dx * 0.8, q.z + q.dz * 0.8], half * 0.85), y: y - 1.7 });
    }
  }
}

function metroRoofs(net: WorldNet, warp: Warp, out: Roof[]) {
  const W = LM.viaductW, { len, w, concourse: U } = LM.station;
  for (const mp of metroLayout(net, warp)) {
    const { l } = mp;
    for (const [a, b] of stretches(l, 3)) {
      const y = mp.y((a + b) / 2);
      if (y !== null && y - METRO_SOFFIT >= RAMP_CLEAR) out.push({ kind: 'metro viaduct', s: piece(l, a, b, W / 2), y: y - METRO_SOFFIT });
    }
    // Pier hammerheads: 1.9 along, 0.85 of the deck across, their underside 3.6 under rail level (render metro.ts).
    for (const m of marksOf(l, LM.pierStep)) {
      const y0 = mp.y(m);
      if (y0 === null || y0 < METRO_PIER_MIN_Y || stationOver(mp, m)) continue;
      const s = metroPierAt(net, warp, mp, m);
      if (s === null) continue;
      const q = sample(l, s), y = mp.y(s) ?? y0;
      out.push({ kind: 'metro pier cap', s: boxAlong([q.x - q.dx * 0.95, q.z - q.dz * 0.95], [q.x + q.dx * 0.95, q.z + q.dz * 0.95], W * 0.425), y: y - 3.6 });
    }
    for (const st of mp.stations) {
      if (!st.elevated || (mp.y(st.s) ?? 0) <= STATION_MIN_Y) continue;
      const q = sample(l, st.s);
      if (inSectorV(q.x, q.z)) continue;
      const h = Math.atan2(q.dz, q.dx), hl = len / 2, t = w / 2 + 1.4; // Karunamoyee's shell bulges past the box
      out.push({ kind: 'station', s: frameBox(q.x, q.z, h, -hl, hl, -t, t), y: U });
      const g = stationGround(net, warp, q);
      for (const tw of g.towers) out.push({ kind: 'station walkway', s: frameBox(q.x, q.z, h, Math.min(tw.u0, tw.u1), Math.max(tw.u0, tw.u1), Math.min(tw.e * t, tw.v1), Math.max(tw.e * t, tw.v1)), y: U + 0.7 });
      // Spanning a wide road: a crosshead every bay under the box, 1.3 deep (render stations.ts).
      if (g.half > w / 2 - 1.5) for (let u = -hl + 5; u <= hl - 4; u += 10) out.push({ kind: 'station crosshead', s: frameBox(q.x, q.z, h, u - 0.8, u + 0.8, -g.half - 0.9, g.half + 0.9), y: U - 1.3 });
    }
  }
}

/** A rail bridge over the road: the girders over the rail corridor, across the road and footpaths. */
function bridgeRoof(b: BridgeSite, out: Roof[]) {
  if (b.kind !== 'under') return;
  const { S, w } = underbridge(b);
  out.push({ kind: 'rail underbridge', s: frameBox(b.x, b.z, b.h, -w - 1.4, w + 1.4, -S - 1.6, S + 1.6), y: LM.railClearance });
}

function landmarkRoofs(net: WorldNet, warp: Warp, out: Roof[]) {
  for (const c of net.crossings) {
    const [x, z] = warp.toGame([c.x, c.z]);
    if (inSectorV(x, z) || c.over) continue;
    bridgeRoof(crossingSite(net, warp, c, x, z), out);
  }
  for (const lm of net.landmarks) {
    const [x, z] = warp.toGame([lm.x, lm.z]);
    if (inSectorV(x, z)) continue;
    if (lm.kind === 'rail-underbridge') {
      const site = landmarkBridge(net, warp, lm, x, z);
      if (site) bridgeRoof(site, out);
    } else if (lm.kind === 'flyover' && !flyoverNear(net, warp, x, z, 150)) {
      const h = warpHeading(warp, lm.x, lm.z, lm.heading), fb = fallbackDeck();
      for (const p of fb.pieces) {
        if (p.y - 0.9 >= RAMP_CLEAR) out.push({ kind: 'stand-in deck', s: frameBox(x, z, h, -fb.h, fb.h, p.v, p.v + 2.5), y: p.y - 0.9 });
        if (p.pier) out.push({ kind: 'stand-in pier cap', s: frameBox(x, z, h, -fb.h * 0.85, fb.h * 0.85, p.m - 0.8, p.m + 0.8), y: p.y - 1.7 });
      }
    }
  }
}

function built(net: WorldNet, warp: Warp) {
  return memo(net, warp, 'roofs', () => {
    const all: Roof[] = [];
    deckRoofs(net, warp, all);
    metroRoofs(net, warp, all);
    landmarkRoofs(net, warp, all);
    const byChunk = new Map<number, Roof[]>();
    for (const r of all) {
      const s = r.s, m = ROOF_MARGIN + 1;
      const ex = Math.abs(s.ux) * s.hl + Math.abs(s.uz) * s.hw + s.r + m, ez = Math.abs(s.uz) * s.hl + Math.abs(s.ux) * s.hw + s.r + m;
      for (let cx = Math.floor((s.x - ex) / CHUNK); cx <= Math.floor((s.x + ex) / CHUNK); cx++)
        for (let cz = Math.floor((s.z - ez) / CHUNK); cz <= Math.floor((s.z + ez) / CHUNK); cz++) {
          const k = chunkKey(cx, cz), list = byChunk.get(k);
          if (list) list.push(r); else byChunk.set(k, [r]);
        }
    }
    return { all, byChunk };
  });
}

/** Every streamed underside (for tests and the debug view). */
export function allRoofs(net: WorldNet, warp: Warp): Roof[] { return built(net, warp).all; }

/** The undersides reaching chunk (cx, cz). */
export function chunkRoofs(net: WorldNet, warp: Warp, cx: number, cz: number): Roof[] {
  return built(net, warp).byChunk.get(chunkKey(cx, cz)) ?? [];
}

/** The lowest underside over (x, z) within `margin` of its edge, or undefined for open sky. */
export function roofsAt(net: WorldNet, warp: Warp, x: number, z: number, margin = ROOF_MARGIN): number | undefined {
  let y: number | undefined;
  for (const r of chunkRoofs(net, warp, Math.floor(x / CHUNK), Math.floor(z / CHUNK))) {
    if ((y === undefined || r.y < y) && solidDist(r.s, x, z) < margin) y = r.y;
  }
  return y;
}

/** How far below a roof the camera keeps (as in Sector V), and the least it ever keeps while easing under one. */
export const CAM_UNDER = 1.4, CAM_HARD = 0.6;

/**
 * The camera's height under whatever is overhead, eased (task 030): it ducks quickly as it or the player comes under
 * a deck, station or girder, and rises gently after. `roofAt` is every roof source combined (Sector V and streamed).
 * Looks at the camera, the player, the point between them and a little behind the camera, so the dip starts before
 * the camera reaches the edge; never lets the camera into the concrete over it.
 */
export class CameraRoof {
  private drop = 0;

  /** The camera's y this frame, given the y it would take in the open (`free`), at camera (cx, cz) and player (px, pz). */
  apply(dt: number, roofAt: (x: number, z: number) => number | undefined, free: number, px: number, pz: number, cx: number, cz: number): number {
    const bx = cx + (cx - px) * 0.3, bz = cz + (cz - pz) * 0.3;
    let roof = Infinity;
    for (const [x, z] of [[cx, cz], [px, pz], [(cx + px) / 2, (cz + pz) / 2], [bx, bz]]) roof = Math.min(roof, roofAt(x, z) ?? Infinity);
    const want = roof < Infinity ? Math.max(0, free - (roof - CAM_UNDER)) : 0;
    this.drop += (want - this.drop) * Math.min(1, dt * (want > this.drop ? 14 : 2.5));
    const over = roofAt(cx, cz);
    return Math.min(free - this.drop, over === undefined ? Infinity : over - CAM_HARD);
  }

  /** Forget the eased dip (a teleport or a new run). */
  reset() { this.drop = 0; }
}
