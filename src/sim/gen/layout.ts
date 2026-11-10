// Layout of the streamed world's linear structures, shared by the renderer (src/render/world/landmarks/) and the
// collision (solids.ts): the warped network roads, area lookups, the metro lines (rail level, portals, stations),
// the flyover decks (deck level along each way) and where each crossing's bridge stands. Pure: no three.js.
// Everything here is cached per (net, warp), so warping the network happens once, not once per chunk.

import { LM } from '../../content/landmarks';
import { type Line, nearestOn, prepLine } from './lines';
import type { AreaKind, MetroLine, NetRoad, Pt, Warp, WorldNet } from './types';

const memos = new WeakMap<WorldNet, WeakMap<Warp, Map<string, unknown>>>();

/** Per (net, warp) cache: warping the network once, not once per chunk. */
export function memo<T>(net: WorldNet, warp: Warp, key: string, fn: () => T): T {
  let byWarp = memos.get(net);
  if (!byWarp) memos.set(net, (byWarp = new WeakMap()));
  let m = byWarp.get(warp);
  if (!m) byWarp.set(warp, (m = new Map()));
  if (!m.has(key)) m.set(key, fn());
  return m.get(key) as T;
}

/** Every network road, warped into game space. */
export function netLines(net: WorldNet, warp: Warp): { r: NetRoad; l: Line }[] {
  return memo(net, warp, 'roads', () => net.roads.map((r) => ({ r, l: prepLine(r.p, warp, 16) })));
}

export interface RoadHit { r: NetRoad; d: number; x: number; z: number; dx: number; dz: number; w: number }

/** The nearest road (optionally filtered) to a game point, with its direction there. */
export function nearestRoad(net: WorldNet, warp: Warp, x: number, z: number, ok: (r: NetRoad) => boolean = (r) => r.bridge !== 'flyover'): RoadHit | null {
  let best: RoadHit | null = null;
  for (const { r, l } of netLines(net, warp)) {
    if (!ok(r)) continue;
    const n = nearestOn(l, x, z);
    if (best && n.d >= best.d) continue;
    const i = Math.max(1, l.d.findIndex((d) => d >= n.s));
    const a = l.p[i - 1], b = l.p[Math.min(i, l.p.length - 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    best = { r, d: n.d, x: n.x, z: n.z, dx: (b[0] - a[0]) / L, dz: (b[1] - a[1]) / L, w: r.w };
  }
  return best;
}

/** Street character at a game point (nearest area centre in real coordinates, relative to its radius). */
export function areaNear(net: WorldNet, warp: Warp, x: number, z: number): AreaKind {
  const [rx, rz] = warp.toReal([x, z]);
  let best: AreaKind = 'generic', bd = Infinity;
  for (const a of net.areas) {
    const d = Math.hypot(a.x - rx, a.z - rz) / (a.r || 1);
    if (d < bd) { bd = d; best = a.kind; }
  }
  return bd < 2.5 ? best : 'generic';
}

/** A real heading carried through the warp at a real point (the warp bends directions a little). */
export function warpHeading(warp: Warp, x: number, z: number, h: number) {
  const [ax, az] = warp.toGame([x, z]), [bx, bz] = warp.toGame([x + Math.cos(h) * 4, z + Math.sin(h) * 4]);
  return Math.atan2(bz - az, bx - ax);
}

/** A point in a local frame at (x, z) facing h: u along the facing, v to its side (as the renderer's Frame). */
export function framePt(x: number, z: number, h: number, u: number, v: number): Pt {
  const fx = Math.cos(h), fz = Math.sin(h);
  return [x + fx * u - fz * v, z + fz * u + fx * v];
}

// --- Metro ---------------------------------------------------------------------------------------------------

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

export function metroLayout(net: WorldNet, warp: Warp): MetroPrep[] {
  return memo(net, warp, 'metro', () => net.metro.map((m) => prepMetro(warp, m)));
}

function prepMetro(warp: Warp, m: MetroLine): MetroPrep {
  const l = prepLine(m.p, warp);
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
    const [gx, gz] = warp.toGame([st.x, st.z]);
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

/** Lowest rail level that gets a pier (below it the line is on its ramp or in the cut). */
export const METRO_PIER_MIN_Y = 4;
/** Elevated stations taller than this are drawn as stations (lower ones are on the ramp). */
export const STATION_MIN_Y = 6;

/** The elevated station whose box covers arc position s (its own pier pairs replace the line's piers). */
export const stationOver = (mp: MetroPrep, s: number) => mp.stations.find((st) => st.elevated && Math.abs(st.s - s) < LM.station.len / 2);

/** Pier radius at the painted base (the widest part at ground level). */
export const METRO_PIER_R = 1.06;
/** The viaduct girder's underside below rail level, and the tunnel portal's half width. */
export const METRO_SOFFIT = 2.15;
export const portalHalf = () => LM.viaductW / 2 + 0.6;

/** A deck or girder lower than this over the ground is a ramp you walk into, not a roof you walk under. */
export const RAMP_CLEAR = 2.2;

/**
 * An elevated station's ground footprint in its frame (u along the line, v across): the pier pairs either side of
 * the road below, and the stair towers at both ends down to the footpaths. Everything else is overhead.
 */
export function stationGround() {
  const { len, w, concourse: U } = LM.station;
  const h = len / 2, t = w / 2;
  const piers: [number, number][] = [];
  for (let u = -h + 5; u <= h - 4; u += 10) for (const v of [-t + 1.6, t - 1.6]) piers.push([u, v]);
  const towers = [-1, 1].map((e) => ({ e, u0: e * (h - 9), u1: e * (h - 2), v0: e * (t + 0.2), v1: e * (t + 4.2), top: U + 0.7 }));
  return { piers, towers };
}

// --- Flyovers ------------------------------------------------------------------------------------------------

export type DeckStyle = 'diamond' | 'panel' | 'band';
export interface NetDeck { r: NetRoad; l: Line; style: DeckStyle; Y: number; dS: number; dE: number; tram: boolean }

const isFlyover = (r: NetRoad) => r.bridge === 'flyover';
const key = (p: Pt) => `${Math.round(p[0])},${Math.round(p[1])}`;

/** Flyover ways warped, styled, with each end's graph distance to the nearest free end (for the ramps). */
export function netDecks(net: WorldNet, warp: Warp): NetDeck[] {
  return memo(net, warp, 'decks', () => {
    const roads = net.roads.filter(isFlyover);
    const lines = roads.map((r) => prepLine(r.p, warp));
    const nodes = new Map<string, { deg: number; d: number; edges: { to: string; w: number }[] }>();
    const node = (k: string) => { let n = nodes.get(k); if (!n) nodes.set(k, (n = { deg: 0, d: Infinity, edges: [] })); return n; };
    roads.forEach((r, i) => {
      const a = key(r.p[0]), b = key(r.p[r.p.length - 1]), w = lines[i].len;
      node(a).deg++; node(b).deg++;
      node(a).edges.push({ to: b, w }); node(b).edges.push({ to: a, w });
    });
    // Dijkstra (small graph): distance from every node to the nearest free end.
    const open = [...nodes.entries()].filter(([, n]) => n.deg === 1).map(([k]) => k);
    for (const k of open) nodes.get(k)!.d = 0;
    while (open.length) {
      open.sort((a, b) => nodes.get(b)!.d - nodes.get(a)!.d);
      const k = open.pop()!, n = nodes.get(k)!;
      for (const e of n.edges) {
        const m = nodes.get(e.to)!;
        if (n.d + e.w < m.d) { m.d = n.d + e.w; open.push(e.to); }
      }
    }
    return roads.map((r, i) => {
      const [rx, rz] = r.p[0], style = styleOf(net, warp, r, rx, rz);
      const Y = style === 'diamond' ? LM.flyoverY.ultadanga : style === 'panel' ? LM.flyoverY.sealdah : LM.flyoverY.other;
      const dS = nodes.get(key(r.p[0]))!.d, dE = nodes.get(key(r.p[r.p.length - 1]))!.d;
      return { r, l: lines[i], style, Y, dS: Number.isFinite(dS) ? dS : LM.flyoverRamp, dE: Number.isFinite(dE) ? dE : LM.flyoverRamp, tram: !!r.tram || style === 'panel' && /vidyapati/i.test(r.name ?? '') };
    });
  });
}

function styleOf(net: WorldNet, warp: Warp, r: NetRoad, rx: number, rz: number): DeckStyle {
  const n = r.name ?? '';
  if (/ultadanga/i.test(n)) return 'diamond';
  if (/vidyapati|sealdah|parikshit/i.test(n)) return 'panel';
  const [gx, gz] = warp.toGame([rx, rz]);
  const a = areaNear(net, warp, gx, gz);
  return a === 'ultadanga' ? 'diamond' : a === 'sealdah' ? 'panel' : 'band';
}

/** Deck top at arc length s along a deck. */
export const netDeckY = (d: NetDeck, s: number) => d.Y * Math.min(1, (d.dS + s) / LM.flyoverRamp, (d.dE + d.l.len - s) / LM.flyoverRamp);

/** Half width of a deck, parapets included. */
export const deckHalf = (d: NetDeck) => d.r.w / 2 + 0.6;
/** Deck levels: drawn from DECK_MIN_Y, a pier under it from DECK_PIER_Y. */
export const DECK_MIN_Y = 0.4, DECK_PIER_Y = 3, DECK_PIER_PHASE = 6, DECK_PIECE = 2.5;
/** A deck pier: an oval column, `r` across the deck and r * stretch along it. */
export const DECK_PIER = { r: 0.7, stretch: 1.6 };
/** The slab's depth below the deck top. */
export const DECK_SLAB = 0.95;

/** True if any flyover deck passes within `r` of a game point (landmark models use it to avoid doubles). */
export function flyoverNear(net: WorldNet, warp: Warp, x: number, z: number, r: number) {
  return netDecks(net, warp).some((d) => d.l.p.some((p) => Math.hypot(p[0] - x, p[1] - z) < r));
}

/**
 * The stand-in deck for a `flyover` landmark with no flyover road near it: straight across the junction along the
 * frame's v, `L` either side, rising from grade at both ends; `h` its half width. Pieces 2.5 long from v to v + 2.5.
 */
export function fallbackDeck() {
  const L = 70, R = LM.flyoverRamp, Y = LM.flyoverY.other, h = 4.2;
  const out: { v: number; m: number; y: number; pier: boolean }[] = [];
  for (let v = -L; v < L - 1e-6; v += 2.5) {
    const m = v + 1.25, y = Y * Math.min(1, (L - Math.abs(m)) / R);
    if (y < DECK_MIN_Y) continue;
    out.push({ v, m, y, pier: Math.round(m * 2) % 32 === 0 && y > DECK_PIER_Y });
  }
  return { h, pierR: 0.75, pieces: out };
}

// --- Crossings -----------------------------------------------------------------------------------------------

const OLD = new Set(['beliaghata', 'narkeldanga', 'sealdah', 'maniktala', 'phoolbagan']);

/**
 * Where a bridge stands, in a frame at (x, z) facing h (u along the road, v across): a road over a canal or rail
 * ('over': parapets either side of the road over a span `width`), or a rail bridge over the road ('under': brick
 * abutments and the embankment either side of the road).
 */
export interface BridgeSite { x: number; z: number; h: number; kind: 'over' | 'under'; width: number; roadW: number; ornate: boolean; water: boolean }

type CrossingLike = { kind: 'canal' | 'rail'; over: boolean; width: number; x: number; z: number; heading: number };

/** A crossing's bridge, framed along the nearest road (as the renderer draws it). */
export function crossingSite(net: WorldNet, warp: Warp, c: CrossingLike, x: number, z: number): BridgeSite {
  const road = nearestRoad(net, warp, x, z, (r) => r.bridge !== 'flyover');
  const fit = road && road.d < 12 ? road : null;
  const h = fit ? Math.atan2(fit.dz, fit.dx) : warpHeading(warp, c.x, c.z, c.heading);
  const roadW = fit ? fit.w : 7;
  if (c.kind === 'rail' && !c.over) return { x, z, h, kind: 'under', width: c.width, roadW, ornate: false, water: false };
  return { x, z, h, kind: 'over', width: c.width, roadW, ornate: c.kind === 'canal' && OLD.has(areaNear(net, warp, x, z)), water: c.kind === 'canal' };
}

/** A stand-alone canal-bridge or rail-underbridge landmark (no crossing of its kind within 40), or null. */
export function landmarkBridge(net: WorldNet, warp: Warp, lm: { kind: string; x: number; z: number; heading: number }, x: number, z: number): BridgeSite | null {
  const kind = lm.kind === 'canal-bridge' ? 'canal' : 'rail';
  const has = net.crossings.some((c) => c.kind === kind && (() => { const [cx, cz] = warp.toGame([c.x, c.z]); return Math.hypot(cx - x, cz - z) < 40; })());
  if (has) return null;
  // Framed along the road (the landmark faces it, so the road runs across its heading).
  const h = warpHeading(warp, lm.x, lm.z, lm.heading) + Math.PI / 2;
  if (kind === 'canal') return { x, z, h, kind: 'over', width: 14, roadW: 7, ornate: areaNear(net, warp, x, z) !== 'saltlake', water: true };
  return { x, z, h, kind: 'under', width: 9, roadW: 7, ornate: false, water: false };
}

/** Parapet line of a bridge over something: past the footpath, along the span plus its abutments. */
export const parapet = (b: { width: number; roadW: number }) => ({ L: b.width / 2 + 2.5, e: b.roadW / 2 + 1.6 });
/** A rail bridge over the road: abutment line beside the footpaths, the corridor's half width, embankment depth. */
export const underbridge = (b: { width: number; roadW: number }) => ({ S: b.roadW / 2 + 3.5, w: b.width / 2, emb: 16 });
