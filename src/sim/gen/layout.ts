// Layout of the streamed world's linear structures, shared by the renderer (src/render/world/landmarks/) and the
// collision (solids.ts): the warped network roads, area lookups, the metro lines (rail level, portals, stations),
// the flyover decks (deck level along each way), and where a pier may stand among the roads. Stations' and bridges'
// footprints are in sites.ts. Pure: no three.js.
// Everything here is cached per (net, warp), so warping the network happens once, not once per chunk.

import { LM } from '../../content/landmarks';
import { type Line, nearestOn, prepLine, sample } from './lines';
import { laneFree, lanesPass } from './lanes';
import { LANE_ROOM, T } from '../../content/tuning';
import type { AreaKind, MetroLine, NetRoad, Pt, Warp, WorldNet } from './types';
import { warped } from './net';

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
  return memo(net, warp, 'roads', () => net.roads.map((r) => ({ r, l: prepLine(r.p, warp, 16, r.off) })));
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

/** Arc length along a line in real units vs game units (linear between the real vertices). */
export interface RealArc { toReal: (s: number) => number; toGame: (r: number) => number; total: number }

/** The real/game arc length maps of a line prepared from these real points. */
export function realArc(real: Pt[], l: Line): RealArc {
  const rd = [0];
  for (let i = 1; i < real.length; i++) rd.push(rd[i - 1] + Math.hypot(real[i][0] - real[i - 1][0], real[i][1] - real[i - 1][1]));
  const lerp = (xs: number[], ys: number[], v: number) => {
    if (v <= xs[0]) return ys[0] + v - xs[0];
    for (let i = 1; i < xs.length; i++) if (v <= xs[i]) return ys[i - 1] + ((v - xs[i - 1]) / ((xs[i] - xs[i - 1]) || 1)) * (ys[i] - ys[i - 1]);
    return ys[xs.length - 1] + v - xs[xs.length - 1];
  };
  return { toReal: (s) => lerp(l.at, rd, s), toGame: (r) => lerp(rd, l.at, r), total: rd[rd.length - 1] };
}

// --- Metro ---------------------------------------------------------------------------------------------------

export interface MetroPrep {
  m: MetroLine;
  l: Line;
  /** Rail level at arc length s, or null where the line is underground. */
  y: (s: number) => number | null;
  /**
   * Tunnel mouths: arc position, the direction (+1: the tunnel lies toward larger s) and how far past the portal
   * box (u 14) the earth over the tunnel reaches (u, at most 30; 14: none, a road is in the way).
   */
  portals: { s: number; dir: 1 | -1; earth: number }[];
  /** Stations snapped onto the line. */
  stations: { name: string; s: number; elevated: boolean; x: number; z: number }[];
}

export function metroLayout(net: WorldNet, warp: Warp): MetroPrep[] {
  return memo(net, warp, 'metro', () => net.metro.map((m) => prepMetro(net, warp, m)));
}

/**
 * The ramp down from the viaduct, the walled cut and the tunnel portal. Their ends are positions on the real line
 * (rampLen and cutLen are real arc lengths), so in timed they are as squeezed as the corridor around them; their
 * widths stay true. The portal stands at the latest spot, from where OSM puts the tunnel mouth (the elevated
 * range's end) out to cutLen past it, where the cut and the portal box clear every road; like the real one, which
 * dives beside Subhas Sarobar and then runs under the road. Where nowhere is clear, it stays cutLen past.
 */
function prepMetro(net: WorldNet, warp: Warp, m: MetroLine): MetroPrep {
  const l = prepLine(m.p, warp);
  const Y = LM.viaductY, R = LM.rampLen, K = LM.cutLen, n = m.p.length;
  const { toGame, toReal, total } = realArc(m.p, l), rd = l.at.map(toReal);
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
  const portals: MetroPrep['portals'] = [];
  // The ramp's foot: from where the girder comes below RAMP_CLEAR to the bottom of the ramp (a share of R).
  const foot = Math.min(1, (RAMP_CLEAR + METRO_SOFFIT) / Y) * R;
  const ranges = m.elevated.map(([i0, i1]) => {
    const a = rd[Math.max(0, i0)] ?? 0, b = rd[Math.min(n - 1, i1)] ?? total;
    const inside = stations.filter((st) => st.elevated).map((st) => toReal(st.s)).filter((r) => r >= a - 1 && r <= b + 1);
    // Each tunnel end's portal (real arc length), or null where the line is elevated to its end. Back along the
    // line, every elevated station keeps its full height.
    const pick = (e: number, dir: 1 | -1) => {
      for (let t = K; t >= -R; t -= 2) {
        const p = e + dir * t;
        if (p < 0 || p > total || inside.some((r) => dir * (p - r) < K + R * 0.75)) continue;
        const fit = portalFit(net, warp, l, toGame(p - dir * (K + foot)), toGame(p), dir);
        if (fit) { portals.push({ s: toGame(p), dir, earth: fit }); return p; }
      }
      const p = Math.max(0, Math.min(total, e + dir * K));
      portals.push({ s: toGame(p), dir, earth: portalFit(net, warp, l, toGame(p), toGame(p), dir, true) });
      return p;
    };
    return { start: a > 1e-6 ? pick(a, -1) : null, end: b < total - 1e-6 ? pick(b, 1) : null };
  });
  const y = (s: number): number | null => {
    const r = toReal(s);
    for (const { start, end } of ranges) {
      if ((start !== null && r < start) || (end !== null && r > end)) continue;
      const up = start !== null ? (r - start - K) / R : Infinity, down = end !== null ? (end - K - r) / R : Infinity;
      return Math.max(0, Y * Math.min(1, up, down));
    }
    return null;
  };
  return { m, l, y, portals, stations };
}

/**
 * Do the ramp's foot and the cut, from arc length s0 to a portal at s1 (facing dir), and the portal box with its
 * wing walls leave every road passable? Like a ramp down the middle of a wide road, they may stand in a road
 * running along them if its lanes can move round them (lanes.ts); never across one. 0 if not; else how far the
 * earth over the tunnel reaches before a road (u, 14 to 30). `earthOnly`: just measure the earth.
 */
function portalFit(net: WorldNet, warp: Warp, l: Line, s0: number, s1: number, dir: 1 | -1, earthOnly = false): number {
  const q = sample(l, s1), roads = groundRoadsNear(net, warp, q.x, q.z, 120), hh = portalHalf();
  const passable = (x: number, z: number, dx: number, dz: number, across: number) => roads.every(({ r, l: rl }) => {
    const n = roadNear(rl, x, z);
    return n.d >= r.w / 2 + across + 0.3 || (Math.abs(n.dx * dx + n.dz * dz) > 0.9 && lanesPass(r.w, r.oneway, n.side, across));
  });
  const h = Math.atan2(q.dz * dir, q.dx * dir), fx = Math.cos(h), fz = Math.sin(h);
  if (!earthOnly) {
    for (let s = Math.min(s0, s1); s <= Math.max(s0, s1); s += 1.5) {
      const c = sample(l, s);
      if (!passable(c.x, c.z, c.dx, c.dz, LM.viaductW / 2)) return 0;
    }
    for (let u = -1; u <= 14; u += 1.5) {
      const [x, z] = framePt(q.x, q.z, h, u, 0);
      if (!passable(x, z, fx, fz, hh + 0.8)) return 0;
    }
  }
  const steps = (a: number, b: number) => { const n = Math.ceil((b - a) / 1.5); return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n); };
  const rect = (u0: number, u1: number, v: number) => {
    for (const u of steps(u0, u1)) for (const w of steps(-v, v)) {
      const [x, z] = framePt(q.x, q.z, h, u, w);
      if (onCarriageway(roads, x, z, 1.05)) return false;
    }
    return true;
  };
  for (let u1 = 30; u1 > 14; u1 -= 2) if (rect(14, u1, hh + 6)) return u1;
  return 14;
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

/** Ground roads (no flyover decks) whose bounding box comes within r of (x, z), warped. */
export function groundRoadsNear(net: WorldNet, warp: Warp, x: number, z: number, r: number) {
  const all = memo(net, warp, 'ground roads', () => netLines(net, warp).filter(({ r: road }) => road.bridge !== 'flyover').map((it) => {
    const xs = it.l.p.map((p) => p[0]), zs = it.l.p.map((p) => p[1]), m = it.r.w / 2;
    return { ...it, box: [Math.min(...xs) - m, Math.min(...zs) - m, Math.max(...xs) + m, Math.max(...zs) + m] };
  }));
  return all.filter(({ box: b }) => x > b[0] - r && x < b[2] + r && z > b[1] - r && z < b[3] + r);
}

/** The nearest point of a road line to (x, z): distance, unit direction there and the signed offset (left +). */
export function roadNear(l: Line, x: number, z: number) {
  const n = nearestOn(l, x, z);
  const i = Math.max(1, l.d.findIndex((d) => d >= n.s)), a = l.p[i - 1], b = l.p[Math.min(i, l.p.length - 1)];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
  return { d: n.d, dx, dz, side: (x - n.x) * dz - (z - n.z) * dx };
}

/** True if (x, z) is within `pad` of one of these roads' carriageways (with (dx, dz): only roads along it). */
export function onCarriageway(roads: { r: NetRoad; l: Line }[], x: number, z: number, pad: number, dx = 0, dz = 0) {
  for (const { r, l } of roads) {
    const n = roadNear(l, x, z);
    if (n.d >= r.w / 2 + pad) continue;
    if ((!dx && !dz) || Math.abs(n.dx * dx + n.dz * dz) > 0.7) return true;
  }
  return false;
}

/** A pier off the road stands this far beyond the kerb: T.traffic.pierClear past a bus overhanging the kerb. */
const PIER_KERB = T.traffic.pierClear + LANE_ROOM.overKerb - LANE_ROOM.busHalf + 0.05;

/**
 * True if a round pier of radius r at (x, z), heading (dx, dz) along its line, stands clear of every carriageway (in
 * a divided road's median gap, or off the road), or on the centre line of a two-way road running along its line
 * (its median: the lanes either side pass it). Never merely where a lane could squeeze round it (AUDIT.md 8).
 */
function pierPassable(roads: { r: NetRoad; l: Line }[], x: number, z: number, dx: number, dz: number, r: number) {
  for (const { r: road, l } of roads) {
    const n = roadNear(l, x, z);
    // Clear of the widest a lane may run (a bus overhanging the kerb by LANE_ROOM.overKerb), as lanes.ts judges it.
    if (n.d >= road.w / 2 + r + PIER_KERB) continue;
    if (Math.abs(n.dx * dx + n.dz * dz) < 0.9) return false;
    if (road.oneway || Math.abs(n.side) >= T.traffic.medianPier || !laneFree(road.w, road.oneway, n.side, r)) return false;
  }
  return true;
}

/**
 * Where the pier of a line's mark at arc length s stands (arc length), or null for none. A pier (radius r) landing
 * on a road the line crosses at an angle, or in the lane of a carriageway the line runs across, slides along the
 * line off it, like the real viaduct's longer span over a junction. In a median it stays put. Where nowhere within
 * ±5.6 is clear of every carriageway there is no pier (the span is longer there).
 */
export function pierAt(net: WorldNet, warp: Warp, l: Line, key: string, s: number, r: number): number | null {
  return memo(net, warp, `pier ${key} ${s.toFixed(2)}`, () => {
    const q0 = sample(l, s), roads = groundRoadsNear(net, warp, q0.x, q0.z, 30);
    for (let k = 0; k <= 16; k++) {
      const d = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.7, t = s + d;
      if (t < 0 || t > l.len) continue;
      const q = sample(l, t);
      if (pierPassable(roads, q.x, q.z, q.dx, q.dz, r)) return t;
    }
    return null;
  });
}

/** A metro line's pier for the mark at s (see pierAt). */
export const metroPierAt = (net: WorldNet, warp: Warp, mp: MetroPrep, s: number) => pierAt(net, warp, mp.l, mp.m.name, s, METRO_PIER_R);

// --- Flyovers ------------------------------------------------------------------------------------------------

export type DeckStyle = 'diamond' | 'panel' | 'band';
/**
 * A flyover way: dS and dE are each end's distance to the nearest free end, `real` maps game arc length to real
 * (the run-up's ends are positions, so in timed the ramps squeeze with the roads; see netDeckY).
 */
export interface NetDeck { r: NetRoad; l: Line; style: DeckStyle; Y: number; dS: number; dE: number; tram: boolean; real: RealArc }

const isFlyover = (r: NetRoad) => r.bridge === 'flyover';
const key = (p: Pt) => `${Math.round(p[0])},${Math.round(p[1])}`;

/** Flyover ways warped, styled, with each end's graph distance (real) to the nearest free end (for the ramps). */
export function netDecks(net: WorldNet, warp: Warp): NetDeck[] {
  return memo(net, warp, 'decks', () => {
    const roads = net.roads.filter(isFlyover);
    const lines = roads.map((r) => prepLine(r.p, warp, 8, r.off)), reals = roads.map((r, i) => realArc(r.p, lines[i]));
    const nodes = new Map<string, { deg: number; d: number; edges: { to: string; w: number }[] }>();
    const node = (k: string) => { let n = nodes.get(k); if (!n) nodes.set(k, (n = { deg: 0, d: Infinity, edges: [] })); return n; };
    roads.forEach((r, i) => {
      const a = key(r.p[0]), b = key(r.p[r.p.length - 1]), w = reals[i].total;
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
    const out = roads.map((r, i) => {
      const [rx, rz] = r.p[0], style = styleOf(net, warp, r, rx, rz);
      const Y = style === 'diamond' ? LM.flyoverY.ultadanga : style === 'panel' ? LM.flyoverY.sealdah : LM.flyoverY.other;
      const dS = nodes.get(key(r.p[0]))!.d, dE = nodes.get(key(r.p[r.p.length - 1]))!.d;
      return {
        r, l: lines[i], style, Y, dS: Number.isFinite(dS) ? dS : LM.flyoverRamp, dE: Number.isFinite(dE) ? dE : LM.flyoverRamp,
        tram: !!r.tram || style === 'panel' && /vidyapati/i.test(r.name ?? ''), real: reals[i],
      };
    });
    // The deck level at each vertex of the warped way the traffic graph drives (AUDIT.md 18), by its polyline.
    const wn = warped(net, warp);
    for (const d of out) {
      const wr = wn.roads.find((x) => x.road === d.r);
      if (wr) DECK_LEVELS.set(wr.p, wr.p.map(([x, z]) => netDeckY(d, nearestOn(d.l, x, z).s)));
    }
    return out;
  });
}

const DECK_LEVELS = new WeakMap<Pt[], number[]>();
/**
 * The deck level at each vertex of a flyover way's warped polyline (WarpedNet.roads[i].p, the very array), once
 * netDecks has run for its (net, warp); undefined for any other polyline.
 */
export const deckLevels = (p: Pt[]) => DECK_LEVELS.get(p);

function styleOf(net: WorldNet, warp: Warp, r: NetRoad, rx: number, rz: number): DeckStyle {
  const n = r.name ?? '';
  if (/ultadanga/i.test(n)) return 'diamond';
  if (/vidyapati|sealdah|parikshit/i.test(n)) return 'panel';
  const [gx, gz] = warp.toGame([rx, rz]);
  const a = areaNear(net, warp, gx, gz);
  return a === 'ultadanga' ? 'diamond' : a === 'sealdah' ? 'panel' : 'band';
}

/** Deck top at arc length s along a deck. */
export const netDeckY = (d: NetDeck, s: number) => {
  const r = d.real.toReal(s);
  return d.Y * Math.min(1, (d.dS + r) / LM.flyoverRamp, (d.dE + d.real.total - r) / LM.flyoverRamp);
};

/** Half width of a deck, parapets included. */
export const deckHalf = (d: NetDeck) => d.r.w / 2 + 0.6;
/** Deck levels: drawn from DECK_MIN_Y, a pier under it from DECK_PIER_Y. */
export const DECK_MIN_Y = 0.4, DECK_PIER_Y = 3, DECK_PIER_PHASE = 6, DECK_PIECE = 2.5;
/** A deck pier: an oval column, `r` across the deck and r * stretch along it. */
export const DECK_PIER = { r: 0.7, stretch: 1.6 };
/** A deck's column for the mark at s (see pierAt): off the cross streets under the deck. */
export const deckPierAt = (net: WorldNet, warp: Warp, d: NetDeck, s: number) => pierAt(net, warp, d.l, `deck ${d.r.id}`, s, DECK_PIER.r * DECK_PIER.stretch);
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
