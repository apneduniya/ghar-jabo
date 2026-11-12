// Where the streamed world's stations and bridges stand, framed on the roads under them: an elevated station's
// pier pairs and stair towers on the footpaths either side of the road it spans, and each crossing's bridge
// centred on the road it carries or spans. Shared by the renderer (src/render/world/landmarks/) and the collision
// (solids.ts), so what you see is what stops you. Pure: no three.js.

import { LM } from '../../content/landmarks';
import type { Line } from './lines';
import { METRO_PIER_R, areaNear, framePt, groundRoadsNear, memo, onCarriageway, roadNear, warpHeading } from './layout';
import type { NetRoad, Warp, WorldNet } from './types';

// --- Stations ------------------------------------------------------------------------------------------------

/** A station's ground footprint: v of its pier pairs, the pier spots and the stair towers (frame u along, v across). */
export interface StationGround {
  /** Half the pier pairs' spacing: past the carriageways the station spans, on the footpath. */
  half: number;
  piers: [number, number][];
  towers: { e: number; u0: number; u1: number; v0: number; v1: number; top: number }[];
}

/** A footpath this wide lies between the carriageway and a station's pier. */
export const STATION_FOOTPATH = 1.6;

/**
 * An elevated station's ground footprint in a frame at q facing along the line (u along, v across). Like the real
 * Green Line stations over 3rd Avenue and the Bypass, the box spans the whole road: its pier pairs stand on the
 * footpaths either side of the carriageways below (both carriageways of a divided road), joined by a crosshead
 * under the box, and the stair towers at both ends come down beyond the footpaths. A pier that would land on a
 * cross street is left out (the crosshead spans it), and a tower slides inward off one. Everything else is overhead.
 */
export function stationGround(net: WorldNet, warp: Warp, q: { x: number; z: number; dx: number; dz: number }): StationGround {
  return memo(net, warp, `station ${q.x.toFixed(2)},${q.z.toFixed(2)}`, () => {
    const { len, w, concourse: U } = LM.station;
    const h = len / 2, t = w / 2, hd = Math.atan2(q.dz, q.dx);
    const roads = groundRoadsNear(net, warp, q.x, q.z, h + 40);
    // The carriageways under the box: outward from the line on each side, across medians up to 8 wide.
    let span = 0;
    for (let u = -h; u <= h; u += 5) for (const e of [-1, 1]) {
      let last = 0;
      for (let v = 0; v <= 26 && v - last <= 8; v += 0.25) {
        const [x, z] = framePt(q.x, q.z, hd, u, e * v);
        if (onCarriageway(roads, x, z, 0, q.dx, q.dz)) last = v;
      }
      span = Math.max(span, last);
    }
    const half = Math.max(t - 1.6, span + STATION_FOOTPATH + METRO_PIER_R);
    const piers: [number, number][] = [];
    for (let u = -h + 5; u <= h - 4; u += 10) for (const v of [-half, half]) {
      const [x, z] = framePt(q.x, q.z, hd, u, v);
      if (!onCarriageway(roads, x, z, METRO_PIER_R)) piers.push([u, v]);
    }
    const v0 = Math.max(t + 0.2, half + METRO_PIER_R + 0.2);
    const towers = [-1, 1].map((e) => {
      let du = 0;
      for (; du <= 24; du += 6) {
        const c = framePt(q.x, q.z, hd, e * (h - 5.5 - du), e * (v0 + 2)), r = Math.hypot(3.5, 2);
        if (!onCarriageway(roads, c[0], c[1], r)) break;
      }
      return { e, u0: e * (h - 9 - du), u1: e * (h - 2 - du), v0: e * v0, v1: e * (v0 + 4), top: U + 0.7 };
    });
    return { half, piers, towers };
  });
}

// --- Crossings -----------------------------------------------------------------------------------------------

const OLD = new Set(['beliaghata', 'narkeldanga', 'sealdah', 'maniktala', 'phoolbagan']);

/**
 * Where a bridge stands, in a frame at (x, z) facing h (u along the road, v across): a road over a canal or rail
 * ('over': parapets either side of the road over a span `width`), or a rail bridge over the road ('under': brick
 * abutments and the embankment either side of the road).
 */
export interface BridgeSite {
  x: number; z: number; h: number; kind: 'over' | 'under'; width: number; roadW: number; ornate: boolean; water: boolean;
  /** 'under': how deep the embankment runs on the -v and +v sides (to 16, short of any other road). */
  emb?: [number, number];
  /** 'over': each parapet's run along u on the -v and +v sides (short of a road joining at the bridge). */
  par?: [[number, number], [number, number]];
  /** 'under': each abutment's run along u on the -v and +v sides (short of a road passing beside the bridge). */
  ab?: [[number, number], [number, number]];
}

type CrossingLike = { kind: 'canal' | 'rail'; over: boolean; width: number; x: number; z: number; heading: number };

/**
 * A bridge framed across the road it carries (or spans), along heading h near (x, z): centred on the carriageways
 * running along h there, over u in ±uR (both carriageways of a divided road, across a median up to 8 wide),
 * roadW their full width.
 */
function framed(net: WorldNet, warp: Warp, x: number, z: number, h: number, w0: number, uR: number) {
  const roads = groundRoadsNear(net, warp, x, z, 45), dx = Math.cos(h), dz = Math.sin(h); // as far as a parapet or embankment reaches
  const ext = [0, 0];
  [-1, 1].forEach((e, k) => {
    for (let u = -uR; u <= uR + 1e-6; u += uR / Math.ceil(uR / 2)) {
      let last = -1;
      for (let v = 0; v <= 30 && (last < 0 ? v <= 12 : v - last <= 8); v += 0.25) {
        const [px, pz] = framePt(x, z, h, u, e * v);
        if (onCarriageway(roads, px, pz, 0, dx, dz)) last = v;
      }
      ext[k] = Math.max(ext[k], last);
    }
  });
  if (ext[0] <= 0 && ext[1] <= 0) return { x, z, roadW: w0, roads };
  // At most the road and its pair across a real median (AUDIT.md 16): never a slip road or a squeezed junction too.
  const cap = 2 * w0 + MEDIAN_MAX;
  if (ext[0] + ext[1] > cap) { const k = cap / (ext[0] + ext[1]); ext[0] *= k; ext[1] *= k; }
  const c = (ext[1] - ext[0]) / 2, [cx, cz] = framePt(x, z, h, 0, c);
  return { x: cx, z: cz, roadW: Math.max(w0, ext[0] + ext[1]), roads };
}

/** A rail bridge's embankment depth either side (see BridgeSite.emb): it stops short of any other road. */
function embankments(roads: { r: NetRoad; l: Line }[], b: Omit<BridgeSite, 'emb'>): [number, number] {
  const { S, w } = underbridge(b);
  return [-1, 1].map((s) => {
    let emb = 16;
    for (let v = S + 1.6; v <= S + 16; v += 1) for (let u = -w - 1.4; u <= w + 1.4 + 1e-6; u += (w + 1.4) / 3) {
      const [x, z] = framePt(b.x, b.z, b.h, u, s * v);
      if (onCarriageway(roads, x, z, 1.05)) { emb = Math.min(emb, v - S - 1); break; }
    }
    return Math.max(1.6, emb);
  }) as [number, number];
}

/** The widest median framed with its road: the Green Line's piers need 3.8 (tools/build-world.py MEDIAN_METRO). */
const MEDIAN_MAX = 4.5;

/** A rail bridge's abutment runs either side (see BridgeSite.ab): from the middle out, until a road passes beside it. */
function abutments(roads: { r: NetRoad; l: Line }[], b: Omit<BridgeSite, 'ab'>): [[number, number], [number, number]] {
  const { S, w } = underbridge(b), L = w + 1.4;
  // Clear of the carriageway by a bus's room (a lane may hang over the kerb: lanes.ts), not just the kerb.
  const clear = (u: number, s: number) => [S - 0.2, S + 0.8, S + 1.6].every((v) => { const [x, z] = framePt(b.x, b.z, b.h, u, s * v); return !onCarriageway(roads, x, z, 2.4); });
  return [-1, 1].map((s) => {
    if (!clear(0, s)) return [0, 0];
    let u0 = 0, u1 = 0;
    while (u1 < L && clear(Math.min(L, u1 + 0.5), s)) u1 = Math.min(L, u1 + 0.5);
    while (u0 > -L && clear(Math.max(-L, u0 - 0.5), s)) u0 = Math.max(-L, u0 - 0.5);
    return [u0, u1];
  }) as [[number, number], [number, number]];
}

/** A road bridge's parapet runs either side (see BridgeSite.par): from the middle out, until a road joins. */
function parapets(roads: { r: NetRoad; l: Line }[], b: Omit<BridgeSite, 'par'>): [[number, number], [number, number]] {
  const { L, e } = parapet(b);
  const clear = (u: number, s: number) => { const [x, z] = framePt(b.x, b.z, b.h, u, s * e); return !onCarriageway(roads, x, z, 1.4); };
  return [-1, 1].map((s) => {
    if (!clear(0, s)) return [0, 0];
    let u0 = 0, u1 = 0;
    while (u1 < L && clear(Math.min(L, u1 + 0.5), s)) u1 = Math.min(L, u1 + 0.5);
    while (u0 > -L && clear(Math.max(-L, u0 - 0.5), s)) u0 = Math.max(-L, u0 - 0.5);
    return [u0, u1];
  }) as [[number, number], [number, number]];
}

/** A crossing's bridge, framed across the road it's on (as the renderer draws it). */
export function crossingSite(net: WorldNet, warp: Warp, c: CrossingLike, x: number, z: number): BridgeSite {
  return memo(net, warp, `crossing ${c.x},${c.z}`, () => {
    // The road the crossing is on runs along its heading; in timed another may be nearer.
    const hd = warpHeading(warp, c.x, c.z, c.heading);
    let fit: { d: number; dx: number; dz: number; w: number } | null = null;
    for (const { r, l } of groundRoadsNear(net, warp, x, z, 12)) {
      const n = roadNear(l, x, z);
      if (n.d < 12 && (!fit || n.d < fit.d) && Math.abs(n.dx * Math.cos(hd) + n.dz * Math.sin(hd)) > 0.8) fit = { ...n, w: r.w };
    }
    const h = fit ? Math.atan2(fit.dz, fit.dx) : hd, under = c.kind === 'rail' && !c.over;
    const f = framed(net, warp, x, z, h, fit ? fit.w : 7, c.width / 2 + (under ? 1.4 : 2.5));
    if (under) {
      const b = { x: f.x, z: f.z, h, kind: 'under' as const, width: c.width, roadW: f.roadW, ornate: false, water: false };
      return { ...b, emb: embankments(f.roads, b), ab: abutments(f.roads, b) };
    }
    const b = { x: f.x, z: f.z, h, kind: 'over' as const, width: c.width, roadW: f.roadW, ornate: c.kind === 'canal' && OLD.has(areaNear(net, warp, x, z)), water: c.kind === 'canal' };
    return { ...b, par: parapets(f.roads, b) };
  });
}

/** A stand-alone canal-bridge or rail-underbridge landmark (no crossing of its kind within 40, none at all within 25), or null. */
export function landmarkBridge(net: WorldNet, warp: Warp, lm: { kind: string; x: number; z: number; heading: number }, x: number, z: number): BridgeSite | null {
  const kind = lm.kind === 'canal-bridge' ? 'canal' : 'rail';
  const has = net.crossings.some((c) => { const [cx, cz] = warp.toGame([c.x, c.z]), d = Math.hypot(cx - x, cz - z); return d < 25 || (c.kind === kind && d < 40); });
  if (has) return null;
  // Framed along the road (the landmark faces it, so the road runs across its heading).
  const h = warpHeading(warp, lm.x, lm.z, lm.heading) + Math.PI / 2, canal = kind === 'canal';
  const f = framed(net, warp, x, z, h, 7, canal ? 9.5 : 5.9);
  if (canal) {
    const b = { x: f.x, z: f.z, h, kind: 'over' as const, width: 14, roadW: f.roadW, ornate: areaNear(net, warp, x, z) !== 'saltlake', water: true };
    return { ...b, par: parapets(f.roads, b) };
  }
  const b = { x: f.x, z: f.z, h, kind: 'under' as const, width: 9, roadW: f.roadW, ornate: false, water: false };
  return { ...b, emb: embankments(f.roads, b), ab: abutments(f.roads, b) };
}

/**
 * Parapet line of a bridge over something: past the footpath, along the span plus its abutments (L either side);
 * `runs`: each side's parapet along u (-v side, +v side).
 */
export const parapet = (b: { width: number; roadW: number; par?: [[number, number], [number, number]] }) => {
  const L = b.width / 2 + 2.5;
  return { L, e: b.roadW / 2 + 1.6, runs: b.par ?? [[-L, L], [-L, L]] as [[number, number], [number, number]] };
};
/** A rail bridge over the road: abutment line beside the footpaths, the corridor's half width, embankment depths. */
export const underbridge = (b: { width: number; roadW: number; emb?: [number, number]; ab?: [[number, number], [number, number]] }) => {
  const w = b.width / 2, L = w + 1.4;
  return { S: b.roadW / 2 + 3.5, w, emb: b.emb ?? [16, 16] as [number, number], ab: b.ab ?? [[-L, L], [-L, L]] as [[number, number], [number, number]] };
};
