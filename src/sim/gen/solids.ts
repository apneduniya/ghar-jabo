// What the streamed world's structures stand on, as collision solids (see sim/solids.ts): metro piers, the low part
// of metro and flyover ramps, the walled cut and tunnel portal, elevated stations' pier pairs and stair towers,
// flyover columns, the stand-in flyover's ramps and column, bridge parapets and rail-bridge abutments with their
// embankment. Everything comes from the same layout as the renderer (layout.ts, lines.ts), at the same arc
// positions per chunk, so what you see is what stops you. Under the high decks and over bridges stays open.
// Computed once per (net, warp) and filed by chunk; a solid near a border is filed in every chunk it reaches.

import { LM } from '../../content/landmarks';
import { box, boxAlong, circle, type Solid } from '../solids';
import { chunkKey } from './chunks';
import { type Line, inSectorV, intervals, marks, pieces, sample } from './lines';
import { type LanePlan, planLanes } from './lanes';
import { warped } from './net';
import {
  DECK_MIN_Y, DECK_PIECE, DECK_PIER, DECK_PIER_PHASE, DECK_PIER_Y, DECK_SLAB, METRO_PIER_MIN_Y, METRO_PIER_R, METRO_SOFFIT, RAMP_CLEAR,
  STATION_MIN_Y, type NetDeck, deckHalf, deckPierAt, fallbackDeck, flyoverNear, framePt, memo, metroLayout, metroPierAt,
  netDeckY, netDecks, portalHalf, stationOver, warpHeading,
} from './layout';
import { type BridgeSite, crossingSite, landmarkBridge, parapet, stationGround, underbridge } from './sites';
import { CHUNK, type Warp, type WorldNet } from './types';

/** Chunks a line passes through (and their neighbours, for pieces that straddle a border). */
function chunksOf(l: Line): [number, number][] {
  const seen = new Set<number>(), out: [number, number][] = [];
  for (let s = 0; s <= l.len + CHUNK / 4; s += CHUNK / 4) {
    const q = sample(l, Math.min(s, l.len)), cx = Math.floor(q.x / CHUNK), cz = Math.floor(q.z / CHUNK);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const k = chunkKey(cx + i, cz + j);
      if (!seen.has(k)) { seen.add(k); out.push([cx + i, cz + j]); }
    }
  }
  return out;
}

/** Arc positions the renderer puts point features at (marks), over the whole line. */
function allMarks(l: Line, step: number, phase = 0) {
  const out: number[] = [];
  for (const [cx, cz] of chunksOf(l)) out.push(...marks(l, cx, cz, step, phase));
  return out;
}
/** The renderer's pieces of a line, over the whole line. */
function allPieces(l: Line, step: number) {
  const out: [number, number][] = [];
  for (const [cx, cz] of chunksOf(l)) out.push(...pieces(intervals(l, cx, cz), step));
  return out;
}

/** A box in a frame at (x, z) facing h: u0..u1 along, v0..v1 across. */
function frameBox(x: number, z: number, h: number, u0: number, u1: number, v0: number, v1: number): Solid {
  const [cx, cz] = framePt(x, z, h, (u0 + u1) / 2, (v0 + v1) / 2);
  return box(cx, cz, Math.cos(h), Math.sin(h), Math.abs(u1 - u0), Math.abs(v1 - v0));
}

const ramp = (l: Line, a: number, b: number, hw: number) => {
  const p = sample(l, a), q = sample(l, b);
  return boxAlong([p.x, p.z], [q.x, q.z], hw);
};

function metroSolids(net: WorldNet, warp: Warp, out: Acc) {
  for (const mp of metroLayout(net, warp)) {
    const { l } = mp, W = LM.viaductW;
    for (const [a, b] of allPieces(l, 3)) {
      const y = mp.y((a + b) / 2);
      if (y === null) continue;
      // The cut (below 1) and the ramp's low end: the girder sits on the ground.
      if (y < 1 || y - METRO_SOFFIT < RAMP_CLEAR) out.wide(y < 1 ? 'metro cut' : 'metro ramp', ramp(l, a, b, W / 2));
    }
    for (const m of allMarks(l, LM.pierStep)) {
      const y0 = mp.y(m);
      if (y0 === null || y0 < METRO_PIER_MIN_Y || stationOver(mp, m)) continue;
      const s = metroPierAt(net, warp, mp, m);
      if (s === null) continue;
      const q = sample(l, s);
      out.pier('metro pier', circle(q.x, q.z, METRO_PIER_R));
    }
    for (const pt of mp.portals) {
      const q = sample(l, pt.s);
      if (inSectorV(q.x, q.z)) continue;
      const h = Math.atan2(q.dz * pt.dir, q.dx * pt.dir), hh = portalHalf();
      out.wide('tunnel portal', frameBox(q.x, q.z, h, -1, 14, -hh - 0.8, hh + 0.8)); // the portal box and its wing walls
      if (pt.earth > 14) out.wide('tunnel portal', frameBox(q.x, q.z, h, 14, pt.earth, -hh - 6, hh + 6)); // the earth over the tunnel
    }
    for (const st of mp.stations) {
      if (!st.elevated || (mp.y(st.s) ?? 0) <= STATION_MIN_Y) continue;
      const q = sample(l, st.s);
      if (inSectorV(q.x, q.z)) continue;
      const h = Math.atan2(q.dz, q.dx), { piers, towers } = stationGround(net, warp, q);
      for (const [u, v] of piers) { const [x, z] = framePt(q.x, q.z, h, u, v); out.pier('station pier', circle(x, z, METRO_PIER_R)); }
      for (const t of towers) out.wide('station stair tower', frameBox(q.x, q.z, h, t.u0, t.u1, t.v0, t.v1));
    }
  }
}

/**
 * A flyover ramp's foot: the pieces within the deck's half width + 4 of either end of the deck. Ground traffic
 * there is driving onto the ramp (or off it), not past it, so the lanes don't move round them (lanes.ts skip).
 */
function isFoot(d: NetDeck, s: Solid) {
  const reach = deckHalf(d) + 4;
  return [d.l.p[0], d.l.p[d.l.p.length - 1]].some(([x, z]) => Math.hypot(s.x - x, s.z - z) < reach);
}

function deckSolids(net: WorldNet, warp: Warp, out: Acc) {
  for (const d of netDecks(net, warp)) {
    const half = deckHalf(d);
    for (const [a, b] of allPieces(d.l, DECK_PIECE)) {
      const y = netDeckY(d, (a + b) / 2), s = ramp(d.l, a, b, half);
      if (y >= DECK_MIN_Y && y - DECK_SLAB < RAMP_CLEAR) out.wide('flyover ramp', s, isFoot(d, s));
    }
    for (const m of allMarks(d.l, LM.flyoverPierStep, DECK_PIER_PHASE)) {
      if (netDeckY(d, m) < DECK_PIER_Y) continue;
      const s = deckPierAt(net, warp, d, m);
      if (s === null) continue;
      // The oval column: r across the deck, r * stretch along it.
      const q = sample(d.l, s), r = DECK_PIER.r, e = r * DECK_PIER.stretch - r;
      out.pier('flyover pier', boxAlong([q.x - q.dx * e, q.z - q.dz * e], [q.x + q.dx * e, q.z + q.dz * e], 0, r));
    }
  }
}

function bridgeSolids(b: BridgeSite, out: Acc) {
  if (b.kind === 'over') {
    const { e, runs } = parapet(b);
    // Plain: a balustrade on the parapet line. Old bridges: the masonry parapet with the iron railing inside it.
    const [i0, i1] = b.ornate ? [e - 0.96, e + 0.2] : [e - 0.22, e + 0.22];
    for (const s of [-1, 1]) {
      const [u0, u1] = runs[s < 0 ? 0 : 1]; // short of a road joining at the bridge
      const n = Math.ceil((u1 - u0) / 2.5); // in short pieces, so the lanes judge each against the road's curve
      if (u1 - u0 > 0.5) for (let k = 0; k < n; k++) out.wide('bridge parapet', frameBox(b.x, b.z, b.h, u0 + ((u1 - u0) * k) / n, u0 + ((u1 - u0) * (k + 1)) / n, s * i0, s * i1));
    }
    return;
  }
  const { S, w, emb } = underbridge(b);
  for (const s of [-1, 1]) {
    out.wide('rail bridge abutment', frameBox(b.x, b.z, b.h, -w - 1.4, w + 1.4, s * (S - 0.2), s * (S + 1.6))); // with its pilasters
    const e = emb[s < 0 ? 0 : 1];
    if (e > 2) out.wide('rail embankment', frameBox(b.x, b.z, b.h, -w - 1.4, w + 1.4, s * (S + 1.6), s * (S + e)));
  }
}

function landmarkSolids(net: WorldNet, warp: Warp, out: Acc) {
  for (const c of net.crossings) {
    const [x, z] = warp.toGame([c.x, c.z]);
    if (inSectorV(x, z) || (c.over && flyoverNear(net, warp, x, z, 8))) continue;
    bridgeSolids(crossingSite(net, warp, c, x, z), out);
  }
  for (const lm of net.landmarks) {
    const [x, z] = warp.toGame([lm.x, lm.z]);
    if (inSectorV(x, z)) continue;
    if (lm.kind === 'canal-bridge' || lm.kind === 'rail-underbridge') {
      const site = landmarkBridge(net, warp, lm, x, z);
      if (site) bridgeSolids(site, out);
    } else if (lm.kind === 'flyover' && !flyoverNear(net, warp, x, z, 150)) {
      const h = warpHeading(warp, lm.x, lm.z, lm.heading), fb = fallbackDeck();
      for (const p of fb.pieces) {
        if (p.y - 0.9 < RAMP_CLEAR) out.wide('stand-in flyover ramp', frameBox(x, z, h, -fb.h, fb.h, p.v, p.v + 2.5));
        if (p.pier) { const [px, pz] = framePt(x, z, h, 0, p.m); out.pier('stand-in flyover pier', circle(px, pz, fb.pierR)); }
      }
    }
  }
}

/**
 * A structure ground traffic can't get past: it stands on a road too narrow for the lanes to move out round it
 * (see lanes.ts). A pier stays solid (you walk round it); a wide piece is left out of the collision, so it can't cut
 * the road off.
 */
export interface Conflict { kind: string; x: number; z: number; road: string; kept: boolean }

type Item = { kind: string; s: Solid; wide: boolean; merge?: boolean };

/** Collects solids with their kind; whether each is a conflict is decided afterwards from the lane plan. */
class Acc {
  readonly items: Item[] = [];
  pier(kind: string, s: Solid) { this.items.push({ kind, s, wide: false }); }
  /** `merge`: a flyover ramp's foot, where traffic drives onto it rather than past it (see isFoot). */
  wide(kind: string, s: Solid, merge = false) { this.items.push({ kind, s, wide: true, merge }); }
}

/** The lane plan around these items (the ramps' feet don't push lanes aside). */
const plan = (net: WorldNet, warp: Warp, items: Item[]) => planLanes(warped(net, warp), items.map((it) => it.s), (i) => !!items[i].merge);

function built(net: WorldNet, warp: Warp) {
  return memo(net, warp, 'solids', () => {
    const acc = new Acc();
    metroSolids(net, warp, acc);
    deckSolids(net, warp, acc);
    landmarkSolids(net, warp, acc);
    const first = plan(net, warp, acc.items), kept: Item[] = [], conflicts: Conflict[] = [];
    acc.items.forEach((it, i) => {
      const road = first.blockedRoad.get(i);
      if (road !== undefined) conflicts.push({ kind: it.kind, x: it.s.x, z: it.s.z, road, kept: !it.wide });
      if (road === undefined || !it.wide) kept.push(it);
    });
    const solids = kept.map((it) => it.s);
    const byChunk = new Map<number, Solid[]>();
    for (const s of solids) {
      const ex = Math.abs(s.ux) * s.hl + Math.abs(s.uz) * s.hw + s.r + 2, ez = Math.abs(s.uz) * s.hl + Math.abs(s.ux) * s.hw + s.r + 2;
      for (let cx = Math.floor((s.x - ex) / CHUNK); cx <= Math.floor((s.x + ex) / CHUNK); cx++)
        for (let cz = Math.floor((s.z - ez) / CHUNK); cz <= Math.floor((s.z + ez) / CHUNK); cz++) {
          const k = chunkKey(cx, cz), list = byChunk.get(k);
          if (list) list.push(s); else byChunk.set(k, [s]);
        }
    }
    // The lanes go round what stays solid (a left-out wide piece no longer needs room).
    const feet = kept.filter((it) => it.merge).map((it) => it.s);
    return { byChunk, all: solids, feet, conflicts, plan: conflicts.some((c) => !c.kept) ? plan(net, warp, kept) : first };
  });
}

/** The flyover ramps' feet, where traffic drives onto the ramp (the lanes don't avoid them; for tests). */
export function rampFeet(net: WorldNet, warp: Warp): Solid[] { return built(net, warp).feet; }

/** Where the streamed world's traffic lanes run beside the structures (per warped road, per segment). */
export function lanePlan(net: WorldNet, warp: Warp): LanePlan { return built(net, warp).plan; }

/** The structure solids reaching chunk (cx, cz). */
export function chunkSolids(net: WorldNet, warp: Warp, cx: number, cz: number): Solid[] {
  return built(net, warp).byChunk.get(chunkKey(cx, cz)) ?? [];
}

/** Every structure solid (for tests and the debug view). */
export function allSolids(net: WorldNet, warp: Warp): Solid[] { return built(net, warp).all; }

/** Structures traffic can't pass (see Conflict): piers kept, wide pieces left out. */
export function structureConflicts(net: WorldNet, warp: Warp): Conflict[] { return built(net, warp).conflicts; }
