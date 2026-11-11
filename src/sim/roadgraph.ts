// A directed road graph from the real map, for traffic. Vehicles drive on the left of each road.

import { isFlyover } from './elevated';
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
  /** The lane's offset left of the centre line where structures stand in the road (see sim/gen/lanes.ts); else width * laneFrac. */
  lane?: number;
  /** A junction's gap across a median (RoadGraph.stitch). */
  link?: boolean;
  /** A streamed flyover deck (traffic runs over the structures below, not between them). */
  deck?: boolean;
}

/** A streamed road for the graph: lane(a, b, k) for segment p[k - 1] to p[k], null for the default (sim/gen/lanes.ts). */
export interface ExtraRoad { p: Pt[]; w: number; oneway: boolean; deck?: boolean; lane?: (a: Pt, b: Pt, k: number) => number | null }

/** A turn sharper than this (cosine between directions) is a U-turn. */
const UTURN_DOT = -0.8;
/** How far apart (units) the two carriageways of a divided streamed road may be for a junction to join both. */
const STITCH_REACH = 7.5;

export const TRAFFIC_ROADS = new Set(['primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link']);

export class RoadGraph {
  edges: Edge[] = [];
  /** Outgoing edge ids per node. */
  out: number[][] = [];
  nodes: Pt[] = [];
  private index = new Map<string, number>();

  /** `extra`: more roads in game coords (the streamed world's net roads), joined to the map where ends coincide. */
  /** `mapLanes[i]`: per segment of map road i, the lane offset beside structures on it (structures.ts), or null. */
  constructor(map: MapData, extra: ExtraRoad[] = [], mapLanes: ((number | null)[] | undefined)[] = []) {
    map.roads.forEach((r, i) => {
      // Canal bridges carry traffic like any road; the flyover decks stay empty for now.
      if (!TRAFFIC_ROADS.has(r.k) || isFlyover(r)) return;
      const plan = mapLanes[i];
      this.addLine({ p: r.p, w: r.w, oneway: !!r.o, lane: plan ? (_a, _b, k) => plan[k] ?? null : undefined });
    });
    const first = this.nodes.length;
    for (const r of extra) this.addLine(r);
    this.stitch(first);
  }

  /**
   * The streamed net joins a side road to only one carriageway of a divided road (two one-way ways), so traffic
   * on the other carriageway could never turn into it, and the bus line back had to go the long way round. Real
   * junctions have a gap in the median: join each such junction (from node `first` on) across to the nearest node
   * of the anti-parallel carriageway beside it, both ways. Only at junctions: nowhere else crosses a median.
   */
  private stitch(first: number) {
    const inn: number[][] = this.nodes.map(() => []);
    for (const e of this.edges) inn[e.to].push(e.id);
    const oneway = (e: Edge) => !e.deck && !this.out[e.to].some((id) => this.edges[id].to === e.from);
    // A lane moved out round a structure (sim/gen/lanes.ts) means piers stand in that median: no gap there.
    const moved = (n: number) => [...inn[n], ...this.out[n]].some((id) => this.edges[id].lane !== undefined);
    const add: [number, number, number][] = [];
    for (let j = first; j < this.nodes.length; j++) {
      const ids = [...inn[j], ...this.out[j]], nb = new Set(ids.map((id) => (this.edges[id].to === j ? this.edges[id].from : this.edges[id].to)));
      if (nb.size < 3 || moved(j)) continue;
      const along = inn[j].map((id) => this.edges[id]).find(oneway);
      if (!along) continue;
      const [jx, jz] = this.nodes[j];
      let best = -1, bd = STITCH_REACH, bw = along.width;
      for (let p = first; p < this.nodes.length; p++) {
        if (p === j || nb.has(p) || moved(p)) continue;
        const d = Math.hypot(this.nodes[p][0] - jx, this.nodes[p][1] - jz);
        if (d >= bd) continue;
        const o = this.out[p].map((id) => this.edges[id]).find((e) => oneway(e) && e.dx * along.dx + e.dz * along.dz < -0.9);
        if (o) { best = p; bd = d; bw = o.width; }
      }
      if (best >= 0) add.push([j, best, Math.min(bw, along.width)]);
    }
    for (const [j, p, w] of add) for (const e of [this.add(j, p, w), this.add(p, j, w)]) if (e) { e.link = true; e.lane = 0; }
  }

  private addLine({ p, w, oneway, deck, lane }: ExtraRoad) {
    for (let i = 1; i < p.length; i++) {
      const a = this.node(p[i - 1]), b = this.node(p[i]);
      if (a === b) continue;
      const ln = lane?.(p[i - 1], p[i], i) ?? undefined;
      for (const e of oneway ? [this.add(a, b, w)] : [this.add(a, b, w), this.add(b, a, w)]) {
        if (e && ln !== undefined) e.lane = ln;
        if (e && deck) e.deck = true;
      }
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

  /**
   * Next edge after `e`: prefers going straight. Never U-turns unless it's a dead end: not back down a two-way
   * road, and not round the end of a median onto the other carriageway of a divided road (its own one-way way,
   * pointing back the way we came). One-ways are only ever entered the right way: the graph is directed.
   */
  next(e: Edge, rng: Rng): Edge | null {
    const all = this.out[e.to].map((id) => this.edges[id]).filter((o) => o.to !== e.from);
    const ahead = all.filter((o) => o.dx * e.dx + o.dz * e.dz > UTURN_DOT);
    const options = ahead.length ? ahead : all;
    if (!options.length) return null;
    const weights = options.map((o) => 0.15 + Math.max(0, o.dx * e.dx + o.dz * e.dz) ** 2);
    let r = rng.next() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < options.length; i++) { r -= weights[i]; if (r <= 0) return options[i]; }
    return options[options.length - 1];
  }

  /** World position at distance s along e, shifted to the left lane. */
  at(e: Edge, s: number, laneFrac: number): { x: number; z: number; heading: number } {
    const off = laneOf(e, laneFrac);
    // Left of travel with x east and z south is (dz, -dx).
    return { x: e.ax + e.dx * s + e.dz * off, z: e.az + e.dz * s - e.dx * off, heading: Math.atan2(e.dz, e.dx) };
  }

  /**
   * The edges a vehicle drives to follow `ref` (a line drawn along the roads, like the bus line) from its start
   * to its end, the right way down every one-way: the cheapest path where an edge costs its length, more the
   * further it strays from the line. It may start and end at any node within `reach` of the line's ends (on a
   * divided road the carriageway going our way may not touch the end point). Null if there is none.
   */
  routeAlong(ref: Pt[], tol = 6, reach = 20): Edge[] | null {
    if (ref.length < 2) return null;
    const near = refDistance(ref);
    const cost = this.edges.map((e) => {
      const d = Math.max(near(e.ax, e.az), near(e.bx, e.bz), near((e.ax + e.bx) / 2, (e.az + e.bz) / 2));
      return e.len * (1 + Math.max(0, d - tol) * 0.6) * (e.deck ? 4 : 1);
    });
    const [s0, s1] = [ref[0], ref[ref.length - 1]];
    const dist = new Float64Array(this.nodes.length).fill(Infinity);
    const prev = new Int32Array(this.nodes.length).fill(-1);
    const heap = new Heap();
    this.nodes.forEach(([x, z], i) => {
      const d = Math.hypot(x - s0[0], z - s0[1]);
      if (d < reach && this.out[i].length) { dist[i] = d * 3; heap.push(i, d * 3); }
    });
    for (let u = heap.pop(); u >= 0; u = heap.pop()) {
      const du = heap.lastKey;
      if (du > dist[u]) continue;
      for (const id of this.out[u]) {
        const e = this.edges[id], nd = du + cost[id];
        if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = id; heap.push(e.to, nd); }
      }
    }
    let end = -1, best = Infinity;
    this.nodes.forEach(([x, z], i) => {
      const d = Math.hypot(x - s1[0], z - s1[1]);
      if (d < reach && prev[i] >= 0 && dist[i] + d * 3 < best) { best = dist[i] + d * 3; end = i; }
    });
    if (end < 0) return null;
    const path: Edge[] = [];
    for (let n = end; prev[n] >= 0 && path.length < this.edges.length;) { const e = this.edges[prev[n]]; path.push(e); n = e.from; }
    return path.length ? path.reverse() : null;
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
    // Binary min-heap of [distance, node]; stale entries are skipped when popped.
    const heap: [number, number][] = [[0, a]];
    const push = (d: number, n: number) => {
      heap.push([d, n]);
      for (let i = heap.length - 1; i > 0;) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]]; i = p;
      }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        for (let i = 0; ;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
        }
      }
      return top;
    };
    while (heap.length) {
      const [du, u] = pop();
      if (du > (dist.get(u) ?? Infinity)) continue;
      if (u === b) break;
      for (const id of this.out[u]) {
        const e = this.edges[id];
        const nd = du + e.len;
        if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, e); push(nd, e.to); }
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

/** How far left of its centre line an edge's lane runs (a structure may have moved it: Edge.lane). */
export const laneOf = (e: Edge, laneFrac: number) => e.lane ?? e.width * laneFrac;

/** One edge's lane, start and end, `laneFrac` of its width left of the centre line (keep left). */
export function laneEnds(e: Edge, laneFrac: number): [Pt, Pt] {
  const off = laneOf(e, laneFrac);
  return [[e.ax + e.dz * off, e.az - e.dx * off], [e.bx + e.dz * off, e.bz - e.dx * off]];
}

/** Distance from a point to the polyline `ref` (capped at 3 cells: far is far), via a grid of its segments. */
function refDistance(ref: Pt[]) {
  const C = 24, cells = new Map<number, number[]>();
  const key = (cx: number, cz: number) => (cx + 30000) * 60000 + (cz + 30000);
  for (let i = 1; i < ref.length; i++) {
    const [ax, az] = ref[i - 1], [bx, bz] = ref[i];
    for (let cx = Math.floor(Math.min(ax, bx) / C); cx <= Math.floor(Math.max(ax, bx) / C); cx++)
      for (let cz = Math.floor(Math.min(az, bz) / C); cz <= Math.floor(Math.max(az, bz) / C); cz++) {
        const k = key(cx, cz), l = cells.get(k);
        if (l) l.push(i); else cells.set(k, [i]);
      }
  }
  return (x: number, z: number) => {
    let best = C * 3;
    const cx = Math.floor(x / C), cz = Math.floor(z / C);
    for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iz = cz - 1; iz <= cz + 1; iz++) for (const i of cells.get(key(ix, iz)) ?? []) {
      const [ax, az] = ref[i - 1], [bx, bz] = ref[i];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
    }
    return best;
  };
}

/** A binary min-heap of node ids by key. */
class Heap {
  private ids: number[] = [];
  private keys: number[] = [];
  /** The key of the id pop() returned last. */
  lastKey = 0;

  push(id: number, k: number) {
    const ids = this.ids, keys = this.keys;
    let i = ids.length;
    ids.push(id); keys.push(k);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= k) break;
      ids[i] = ids[p]; keys[i] = keys[p]; i = p;
    }
    ids[i] = id; keys[i] = k;
  }

  /** The id with the smallest key, or -1 when empty. */
  pop(): number {
    const ids = this.ids, keys = this.keys;
    if (!ids.length) return -1;
    const top = ids[0];
    this.lastKey = keys[0];
    const id = ids.pop()!, k = keys.pop()!;
    if (ids.length) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i, mk = k;
        if (l < ids.length && keys[l] < mk) { m = l; mk = keys[l]; }
        if (r < ids.length && keys[r] < mk) { m = r; mk = keys[r]; }
        if (m === i) break;
        ids[i] = ids[m]; keys[i] = keys[m]; i = m;
      }
      ids[i] = id; keys[i] = k;
    }
    return top;
  }
}
