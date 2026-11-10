// What the streamed world's structures stand on, as collision solids (see sim/solids.ts): metro piers, the low part
// of metro and flyover ramps, the walled cut and tunnel portal, elevated stations' pier pairs and stair towers,
// flyover columns, the stand-in flyover's ramps and column, bridge parapets and rail-bridge abutments with their
// embankment. Everything comes from the same layout as the renderer (layout.ts, lines.ts), at the same arc
// positions per chunk, so what you see is what stops you. Under the high decks and over bridges stays open.
// Computed once per (net, warp) and filed by chunk; a solid near a border is filed in every chunk it reaches.

import { LM } from '../../content/landmarks';
import { box, boxAlong, circle, ON_ROAD, type Solid } from '../solids';
import { chunkKey } from './chunks';
import { type Line, inSectorV, intervals, marks, nearestOn, pieces, sample } from './lines';
import {
  DECK_MIN_Y, DECK_PIECE, DECK_PIER, DECK_PIER_PHASE, DECK_PIER_Y, DECK_SLAB, METRO_PIER_MIN_Y, METRO_PIER_R, METRO_SOFFIT, RAMP_CLEAR,
  STATION_MIN_Y, type BridgeSite, crossingSite, deckHalf, fallbackDeck, flyoverNear, framePt, landmarkBridge, memo, metroLayout,
  netDeckY, netDecks, netLines, parapet, portalHalf, stationGround, stationOver, underbridge, warpHeading,
} from './layout';
import { CHUNK, type NetRoad, type Pt, type Warp, type WorldNet } from './types';

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
  const { towers, piers } = stationGround();
  for (const mp of metroLayout(net, warp)) {
    const { l } = mp, W = LM.viaductW;
    for (const [a, b] of allPieces(l, 3)) {
      const y = mp.y((a + b) / 2);
      if (y === null) continue;
      // The cut (below 1) and the ramp's low end: the girder sits on the ground.
      if (y < 1 || y - METRO_SOFFIT < RAMP_CLEAR) out.wide(y < 1 ? 'metro cut' : 'metro ramp', ramp(l, a, b, W / 2));
    }
    for (const s of allMarks(l, LM.pierStep)) {
      const y = mp.y(s);
      if (y === null || y < METRO_PIER_MIN_Y || stationOver(mp, s)) continue;
      const q = sample(l, s);
      out.pier('metro pier', circle(q.x, q.z, METRO_PIER_R));
    }
    for (const pt of mp.portals) {
      const q = sample(l, pt.s);
      if (inSectorV(q.x, q.z)) continue;
      const h = Math.atan2(q.dz * pt.dir, q.dx * pt.dir), hh = portalHalf();
      out.wide('tunnel portal', frameBox(q.x, q.z, h, -1, 14, -hh - 0.8, hh + 0.8)); // the portal box and its wing walls
      out.wide('tunnel portal', frameBox(q.x, q.z, h, 14, 30, -hh - 6, hh + 6)); // the earth over the tunnel
    }
    for (const st of mp.stations) {
      if (!st.elevated || (mp.y(st.s) ?? 0) <= STATION_MIN_Y) continue;
      const q = sample(l, st.s);
      if (inSectorV(q.x, q.z)) continue;
      const h = Math.atan2(q.dz, q.dx);
      for (const [u, v] of piers) { const [x, z] = framePt(q.x, q.z, h, u, v); out.pier('station pier', circle(x, z, METRO_PIER_R)); }
      for (const t of towers) out.wide('station stair tower', frameBox(q.x, q.z, h, t.u0, t.u1, t.v0, t.v1));
    }
  }
}

function deckSolids(net: WorldNet, warp: Warp, out: Acc) {
  for (const d of netDecks(net, warp)) {
    const half = deckHalf(d);
    for (const [a, b] of allPieces(d.l, DECK_PIECE)) {
      const y = netDeckY(d, (a + b) / 2);
      if (y >= DECK_MIN_Y && y - DECK_SLAB < RAMP_CLEAR) out.wide('flyover ramp', ramp(d.l, a, b, half), d.r);
    }
    for (const s of allMarks(d.l, LM.flyoverPierStep, DECK_PIER_PHASE)) {
      if (netDeckY(d, s) < DECK_PIER_Y) continue;
      // The oval column: r across the deck, r * stretch along it.
      const q = sample(d.l, s), r = DECK_PIER.r, e = r * DECK_PIER.stretch - r;
      out.pier('flyover pier', boxAlong([q.x - q.dx * e, q.z - q.dz * e], [q.x + q.dx * e, q.z + q.dz * e], 0, r));
    }
  }
}

function bridgeSolids(b: BridgeSite, out: Acc) {
  if (b.kind === 'over') {
    const { L, e } = parapet(b);
    // Plain: a balustrade on the parapet line. Old bridges: the masonry parapet with the iron railing inside it.
    const [i0, i1] = b.ornate ? [e - 0.96, e + 0.2] : [e - 0.22, e + 0.22];
    for (const s of [-1, 1]) out.wide('bridge parapet', frameBox(b.x, b.z, b.h, -L, L, s * i0, s * i1));
    return;
  }
  const { S, w, emb } = underbridge(b);
  for (const s of [-1, 1]) {
    out.wide('rail bridge abutment', frameBox(b.x, b.z, b.h, -w - 1.4, w + 1.4, s * (S - 0.2), s * (S + 1.6))); // with its pilasters
    out.wide('rail embankment', frameBox(b.x, b.z, b.h, -w - 1.4, w + 1.4, s * (S + 1.6), s * (S + emb)));
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

/** A structure that stands on a network road's carriageway (data puts them there; see report()). */
export interface Conflict { kind: string; x: number; z: number; road: string; kept: boolean }

/**
 * Collects solids. A pier always stands (you walk round it) but is reported when it is on a carriageway. A wide
 * solid (ramp, cut, portal, tower, parapet, abutment, embankment) that covers another road's carriageway would cut
 * that road off: it's left out of the collision and reported instead, so the data can be fixed at the source.
 */
class Acc {
  readonly solids: Solid[] = [];
  readonly conflicts: Conflict[] = [];
  private lines: { r: NetRoad; l: Line; box: [number, number, number, number] }[];
  constructor(net: WorldNet, warp: Warp) {
    this.lines = netLines(net, warp).filter(({ r }) => r.bridge !== 'flyover').map(({ r, l }) => {
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const [x, z] of l.p) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
      return { r, l, box: [x0 - r.w, z0 - r.w, x1 + r.w, z1 + r.w] };
    });
  }

  /** The road whose carriageway one of the solid's outline points lies on, if any. */
  private onRoad(s: Solid, own?: NetRoad): NetRoad | null {
    const pts: Pt[] = [];
    for (const a of [-1, 0, 1]) for (const c of [-1, 0, 1])
      pts.push([s.x + s.ux * s.hl * a - s.uz * s.hw * c, s.z + s.uz * s.hl * a + s.ux * s.hw * c]);
    for (const { r, l, box } of this.lines) {
      if (r === own) continue;
      for (const [x, z] of pts) {
        if (x < box[0] || x > box[2] || z < box[1] || z > box[3]) continue;
        if (nearestOn(l, x, z).d < r.w / 2 - ON_ROAD) return r;
      }
    }
    return null;
  }

  pier(kind: string, s: Solid) {
    this.solids.push(s);
    const r = this.onRoad(s);
    if (r) this.conflicts.push({ kind, x: s.x, z: s.z, road: r.name ?? r.id, kept: true });
  }

  wide(kind: string, s: Solid, own?: NetRoad) {
    const r = this.onRoad(s, own);
    if (r) this.conflicts.push({ kind, x: s.x, z: s.z, road: r.name ?? r.id, kept: false });
    else this.solids.push(s);
  }
}

function built(net: WorldNet, warp: Warp) {
  return memo(net, warp, 'solids', () => {
    const acc = new Acc(net, warp);
    metroSolids(net, warp, acc);
    deckSolids(net, warp, acc);
    landmarkSolids(net, warp, acc);
    const byChunk = new Map<number, Solid[]>();
    for (const s of acc.solids) {
      const ex = Math.abs(s.ux) * s.hl + Math.abs(s.uz) * s.hw + s.r + 2, ez = Math.abs(s.uz) * s.hl + Math.abs(s.ux) * s.hw + s.r + 2;
      for (let cx = Math.floor((s.x - ex) / CHUNK); cx <= Math.floor((s.x + ex) / CHUNK); cx++)
        for (let cz = Math.floor((s.z - ez) / CHUNK); cz <= Math.floor((s.z + ez) / CHUNK); cz++) {
          const k = chunkKey(cx, cz), list = byChunk.get(k);
          if (list) list.push(s); else byChunk.set(k, [s]);
        }
    }
    return { byChunk, all: acc.solids, conflicts: acc.conflicts };
  });
}

/** The structure solids reaching chunk (cx, cz). */
export function chunkSolids(net: WorldNet, warp: Warp, cx: number, cz: number): Solid[] {
  return built(net, warp).byChunk.get(chunkKey(cx, cz)) ?? [];
}

/** Every structure solid (for tests and the debug view). */
export function allSolids(net: WorldNet, warp: Warp): Solid[] { return built(net, warp).all; }

/** Structures the data stands on a carriageway: piers kept (reported), wide pieces left out (reported). */
export function structureConflicts(net: WorldNet, warp: Warp): Conflict[] { return built(net, warp).conflicts; }
