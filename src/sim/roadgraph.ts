// A directed road graph from the real map, for traffic. Vehicles drive on the left of each road.

import type { MapData, Pt } from './mapdata';
import type { Rng } from './rng';

export interface Edge {
  id: number;
  from: number;
  to: number;
  ax: number; az: number; bx: number; bz: number;
  len: number;
  width: number;
  dx: number; dz: number; // unit direction
  /** Smallest distance from the centre line to a lane: wider where piers stand in the middle of the road. */
  minLane?: number;
}

export const TRAFFIC_ROADS = new Set(['primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link']);

export class RoadGraph {
  edges: Edge[] = [];
  /** Outgoing edge ids per node. */
  out: number[][] = [];
  nodes: Pt[] = [];
  private index = new Map<string, number>();

  /** `extra`: more roads in game coords (the streamed world's net roads), joined to the map where ends coincide. */
  constructor(map: MapData, extra: { p: Pt[]; w: number; oneway: boolean; minLane?: (a: Pt, b: Pt) => number }[] = []) {
    for (const r of map.roads) {
      if (!TRAFFIC_ROADS.has(r.k) || r.b) continue; // the flyover deck stays empty for now
      this.addLine(r.p, r.w, !!r.o);
    }
    for (const r of extra) this.addLine(r.p, r.w, r.oneway, r.minLane);
  }

  private addLine(p: Pt[], w: number, oneway: boolean, minLane?: (a: Pt, b: Pt) => number) {
    for (let i = 1; i < p.length; i++) {
      const a = this.node(p[i - 1]), b = this.node(p[i]);
      if (a === b) continue;
      const ml = minLane?.(p[i - 1], p[i]) || undefined;
      const e1 = this.add(a, b, w);
      if (e1 && ml) e1.minLane = ml;
      if (!oneway) { const e2 = this.add(b, a, w); if (e2 && ml) e2.minLane = ml; }
    }
  }

  private node(p: Pt) {
    const k = `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    let i = this.index.get(k);
    if (i === undefined) { i = this.nodes.length; this.nodes.push(p); this.out.push([]); this.index.set(k, i); }
    return i;
  }

  private add(from: number, to: number, width: number): Edge | undefined {
    const [ax, az] = this.nodes[from], [bx, bz] = this.nodes[to];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.01) return undefined;
    const e: Edge = { id: this.edges.length, from, to, ax, az, bx, bz, len, width, dx: (bx - ax) / len, dz: (bz - az) / len };
    this.edges.push(e);
    this.out[from].push(e.id);
    return e;
  }

  /** Next edge after `e`: prefers going straight, never U-turns unless it's a dead end. */
  next(e: Edge, rng: Rng): Edge | null {
    const options = this.out[e.to].map((id) => this.edges[id]).filter((o) => o.to !== e.from);
    if (!options.length) return null;
    const weights = options.map((o) => 0.15 + Math.max(0, o.dx * e.dx + o.dz * e.dz) ** 2);
    let r = rng.next() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < options.length; i++) { r -= weights[i]; if (r <= 0) return options[i]; }
    return options[options.length - 1];
  }

  /** World position at distance s along e, shifted to the left lane. */
  at(e: Edge, s: number, laneFrac: number): { x: number; z: number; heading: number } {
    const off = Math.max(e.width * laneFrac, e.minLane ?? 0);
    // Left of travel with x east and z south is (dz, -dx).
    return { x: e.ax + e.dx * s + e.dz * off, z: e.az + e.dz * s - e.dx * off, heading: Math.atan2(e.dz, e.dx) };
  }

  /** Nearest node to (x, z). */
  nearestNode(x: number, z: number): number {
    let best = 0, bd = Infinity;
    this.nodes.forEach(([nx, nz], i) => { const d = Math.hypot(nx - x, nz - z); if (d < bd && this.out[i].length) { bd = d; best = i; } });
    return best;
  }

  /** Shortest list of edges from node a to node b (Dijkstra), or null if unreachable. */
  route(a: number, b: number): Edge[] | null {
    const dist = new Map<number, number>([[a, 0]]);
    const prev = new Map<number, Edge>();
    const open = new Set([a]);
    while (open.size) {
      let u = -1, du = Infinity;
      for (const n of open) { const d = dist.get(n)!; if (d < du) { du = d; u = n; } }
      open.delete(u);
      if (u === b) break;
      for (const id of this.out[u]) {
        const e = this.edges[id];
        const nd = du + e.len;
        if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, e); open.add(e.to); }
      }
    }
    if (!prev.has(b) && a !== b) return null;
    const path: Edge[] = [];
    for (let n = b; n !== a;) { const e = prev.get(n)!; path.unshift(e); n = e.from; }
    return path;
  }

  /** Edges whose midpoint is between rMin and rMax from (x, z). */
  near(x: number, z: number, rMin: number, rMax: number): Edge[] {
    return this.edges.filter((e) => {
      const d = Math.hypot((e.ax + e.bx) / 2 - x, (e.az + e.bz) / 2 - z);
      return d >= rMin && d <= rMax;
    });
  }
}
