// The real network (public/data/world.json) and its warped, indexed form the generator and the sim work in.

import { GEN } from '../../content/worldgen';
import { densify, strHash } from './geom';
import type { AreaKind, Landmark, NetRoad, Pt, Warp, WorldNet } from './types';

/** Parses world.json (already JSON-decoded) into a WorldNet, filling defaults the builder leaves out. */
export function loadNet(json: unknown): WorldNet {
  const j = json as Partial<WorldNet>;
  if (!j || !Array.isArray(j.roads) || !j.sealdah) throw new Error('world.json: not a WorldNet');
  return {
    roads: j.roads.map((r) => ({ ...r, corridors: r.corridors ?? [] })),
    landmarks: j.landmarks ?? [],
    crossings: j.crossings ?? [],
    metro: j.metro ?? [],
    water: j.water ?? [],
    areas: j.areas ?? [],
    sealdah: j.sealdah,
    stops: j.stops ?? [],
    mapEnds: j.mapEnds ?? [],
    corridors: j.corridors ?? [],
  };
}

/** The area whose centre is nearest relative to its radius, at a real position; 'generic' far from all of them. */
export function areaAt(net: WorldNet, x: number, z: number): { kind: AreaKind; gridDeg?: number } {
  let best: WorldNet['areas'][number] | null = null, bd = Infinity;
  for (const a of net.areas) {
    const d = Math.hypot(a.x - x, a.z - z) / a.r;
    if (d < bd) { bd = d; best = a; }
  }
  if (!best || bd > GEN.areaReach * (best.kind === 'bypass' ? 1.4 : 1)) return { kind: 'generic' };
  return { kind: best.kind, gridDeg: best.gridDeg };
}

export interface WRoad {
  road: NetRoad;
  /** Index in net.roads (stable id for hashing). */
  i: number;
  key: number;
  /** Game (warped) polyline, densified before warping so it bends smoothly. */
  p: Pt[];
  /** Cumulative length along p. */
  cum: number[];
  box: [number, number, number, number];
}

const CELL = 64;

/** The network in game coordinates for one warp, with a spatial index of road segments. */
export class WarpedNet {
  readonly roads: WRoad[];
  readonly landmarks: (Landmark & { gx: number; gz: number })[];
  readonly water: Pt[][];
  readonly sealdah: { x: number; z: number; r: number };
  readonly stops: { name: string; x: number; z: number }[];
  private cells = new Map<number, [number, number][]>();
  private waterCells = new Map<number, number[]>();

  constructor(readonly net: WorldNet, readonly warp: Warp) {
    const w = (p: Pt) => warp.toGame(p);
    this.roads = net.roads.map((road, i) => {
      const p = densify(road.p, 12).map(w);
      const cum = [0];
      for (let k = 1; k < p.length; k++) cum.push(cum[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
      return { road, i, key: strHash(road.id), p, cum, box: boxOf(p) };
    });
    this.roads.forEach((r, ri) => {
      for (let k = 1; k < r.p.length; k++) {
        const a = r.p[k - 1], b = r.p[k];
        for (const c of cellsOf(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]))) this.push(this.cells, c, [ri, k]);
      }
    });
    this.landmarks = net.landmarks.map((l) => { const [gx, gz] = w([l.x, l.z]); return { ...l, gx, gz }; });
    this.water = net.water.map((ring) => densify([...ring, ring[0]], 16).slice(0, -1).map(w));
    this.water.forEach((ring, i) => { const b = boxOf(ring); for (const c of cellsOf(...b)) this.push(this.waterCells, c, i); });
    const [sx, sz] = w([net.sealdah.x, net.sealdah.z]);
    this.sealdah = { x: sx, z: sz, r: net.sealdah.r };
    this.stops = (net.stops ?? []).map((s) => { const [x, z] = w([s.x, s.z]); return { name: s.name, x, z }; });
  }

  private push<T>(m: Map<number, T[]>, c: number, v: T) {
    const l = m.get(c);
    if (l) l.push(v); else m.set(c, [v]);
  }

  /** Road segments (road index, end vertex index k: segment p[k-1]->p[k]) near a box, deduplicated. */
  segmentsIn(x0: number, z0: number, x1: number, z1: number): [number, number][] {
    const cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL), cz0 = Math.floor(z0 / CELL), cz1 = Math.floor(z1 / CELL);
    if (cx0 === cx1 && cz0 === cz1) return this.cells.get((cx0 + 5000) * 10000 + cz0 + 5000) ?? [];
    const seen = new Set<number>(), out: [number, number][] = [];
    for (const c of cellsOf(x0, z0, x1, z1)) {
      for (const s of this.cells.get(c) ?? []) {
        const id = s[0] * 100000 + s[1];
        if (!seen.has(id)) { seen.add(id); out.push(s); }
      }
    }
    return out;
  }

  /** Roads with any segment near a box. */
  roadsIn(x0: number, z0: number, x1: number, z1: number): WRoad[] {
    const ids = new Set<number>();
    for (const [ri] of this.segmentsIn(x0, z0, x1, z1)) ids.add(ri);
    return [...ids].sort((a, b) => a - b).map((i) => this.roads[i]);
  }

  /** Water rings (game coords) whose box meets a box. */
  waterIn(x0: number, z0: number, x1: number, z1: number): Pt[][] {
    const ids = new Set<number>();
    for (const c of cellsOf(x0, z0, x1, z1)) for (const i of this.waterCells.get(c) ?? []) ids.add(i);
    return [...ids].sort((a, b) => a - b).map((i) => this.water[i]);
  }

  /** Nearest point on any net road to (x, z) within `max`, with the road and its heading there. */
  nearestRoad(x: number, z: number, max = 40): { r: WRoad; x: number; z: number; d: number; s: number; heading: number } | null {
    let best: ReturnType<WarpedNet['nearestRoad']> = null;
    for (const [ri, k] of this.segmentsIn(x - max, z - max, x + max, z + max)) {
      const r = this.roads[ri], a = r.p[k - 1], b = r.p[k];
      const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
      const px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(px - x, pz - z);
      if (d < max && (!best || d < best.d)) best = { r, x: px, z: pz, d, s: r.cum[k - 1] + t * Math.sqrt(L2), heading: Math.atan2(dz, dx) };
    }
    return best;
  }
}

function boxOf(p: Pt[]): [number, number, number, number] {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of p) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  return [x0, z0, x1, z1];
}

function cellsOf(x0: number, z0: number, x1: number, z1: number): number[] {
  const out: number[] = [];
  for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++)
    for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) out.push((cx + 5000) * 10000 + cz + 5000);
  return out;
}

const cache = new WeakMap<WorldNet, WeakMap<Warp, WarpedNet>>();

/** One WarpedNet per (net, warp), built on first use. Reuse the same Warp object to hit the cache. */
export function warped(net: WorldNet, warp: Warp): WarpedNet {
  let m = cache.get(net);
  if (!m) { m = new WeakMap(); cache.set(net, m); }
  let w = m.get(warp);
  if (!w) { w = new WarpedNet(net, warp); m.set(warp, w); }
  return w;
}
