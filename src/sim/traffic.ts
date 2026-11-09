// Traffic on the real roads: yellow taxis, cars, autos, totos and bikes wander the road graph;
// Kolkata buses run their route along Street No. 13 and slow (never stop) at real stops.
// Everyone keeps left. Pure logic: the renderer reads `vehicles`.

import { T } from '../content/tuning';
import type { MapData, Pt } from './mapdata';
import { Polyline } from './polyline';
import type { Edge, RoadGraph } from './roadgraph';
import type { Rng } from './rng';
import { BUS_LEN, BUS_WIDTH } from './vehicles';

export type Kind = 'taxi' | 'car' | 'auto' | 'toto' | 'bike' | 'bus';

export const SIZE: Record<Kind, { len: number; width: number }> = {
  taxi: { len: 2.5, width: 1.15 },
  car: { len: 2.3, width: 1.1 },
  auto: { len: 2.0, width: 1.2 },
  toto: { len: 2.2, width: 1.1 },
  bike: { len: 1.6, width: 0.6 },
  bus: { len: BUS_LEN, width: BUS_WIDTH },
};

export interface Captain {
  name: string;
  plan: 'come' | 'pass' | 'wrong';
  state: 'approach' | 'waiting' | 'leaving' | 'carrying';
  /** Where it stops: next to the player, or (plan 'wrong') somewhere else. */
  tx: number; tz: number;
  waitT: number;
}

export interface Vehicle {
  id: number;
  kind: Kind;
  /** Picks the livery/model variant in the renderer. */
  variant: number;
  x: number; z: number; heading: number;
  speed: number;
  base: number;
  len: number; width: number;
  /** Graph vehicles. */
  edge?: Edge; s: number;
  /** Planned edges to drive next (captains route to the player); random turns once it's empty. */
  plan?: Edge[];
  /** Bus-route vehicles: direction along the route polyline. */
  routeDir?: 1 | -1;
  hangers?: number;
  depotAt?: number;
  stopped?: number;
  captain?: Captain;
  gone?: boolean;
}

export interface BusLine { path: Pt[]; stops: { n: string; p: Pt; thin?: boolean }[] }

export class Traffic {
  vehicles: Vehicle[] = [];
  readonly busRoute: Polyline;
  /** Distances along the bus route of the real stops it passes. */
  readonly routeStops: { s: number; name: string }[];
  private nextId = 1;
  private spawnT = 0;
  private busT = [2, 6];

  /** `route`: the bus line (defaults to the map's own bus path and stops). */
  /** `route`: the bus line (defaults to the map's own bus path and stops). Stops flagged `thin` (beyond the map,
   *  where the timed world squeezes real stops close together) are kept one per T.bus.minStopGap of route. */
  constructor(map: MapData, private graph: RoadGraph, private rng: Rng, route: BusLine = { path: map.busPath, stops: map.stops }) {
    this.busRoute = new Polyline(route.path);
    let last = -Infinity;
    this.routeStops = route.stops
      .map((st) => ({ ...this.busRoute.project(st.p[0], st.p[1]), name: st.n, thin: st.thin }))
      .filter((p) => p.dist < 14)
      .sort((a, b) => a.s - b.s)
      .filter((p) => { const keep = !p.thin || p.s - last >= T.bus.minStopGap; if (keep) last = p.s; return keep; })
      .map((p) => ({ s: p.s, name: p.name }));
  }

  private make(kind: Kind, extra: Partial<Vehicle>): Vehicle {
    const [lo, hi] = T.traffic.speed[kind];
    const base = this.rng.range(lo, hi);
    const v: Vehicle = { id: this.nextId++, kind, variant: Math.floor(this.rng.next() * 1000), x: 0, z: 0, heading: 0, speed: base, base, s: 0, ...SIZE[kind], ...extra };
    this.vehicles.push(v);
    return v;
  }

  private pickKind(): Exclude<Kind, 'bus'> {
    const mix = T.traffic.mix;
    let r = this.rng.next() * Object.values(mix).reduce((a, b) => a + b, 0);
    for (const [k, w] of Object.entries(mix)) { r -= w; if (r <= 0) return k as Exclude<Kind, 'bus'>; }
    return 'car';
  }

  /** A graph vehicle on a random edge between rMin and rMax from (x, z). */
  spawnNear(x: number, z: number, rMin: number, rMax: number, kind: Exclude<Kind, 'bus'> = this.pickKind()): Vehicle | null {
    const edges = this.graph.near(x, z, rMin, rMax);
    if (!edges.length) return null;
    const e = this.rng.pick(edges);
    const v = this.make(kind, { edge: e, s: this.rng.range(0, e.len) });
    this.place(v);
    return v;
  }

  spawnOnEdge(kind: Exclude<Kind, 'bus'>, e: Edge, s = 0): Vehicle {
    const v = this.make(kind, { edge: e, s });
    this.place(v);
    return v;
  }

  spawnBus(dir: 1 | -1, s = dir > 0 ? 0 : this.busRoute.length): Vehicle {
    const v = this.make('bus', { routeDir: dir, s, hangers: Math.floor(this.rng.range(0, 4)) });
    if (this.rng.chance(T.bus.depotChance) && this.routeStops.length > 2) v.depotAt = this.routeStops[Math.floor(this.routeStops.length / 2)].s;
    this.place(v);
    return v;
  }

  private place(v: Vehicle) {
    const lane = (w: number) => w * T.traffic.laneOffset;
    if (v.routeDir) {
      const p = this.busRoute.at(v.s, v.routeDir, lane(7));
      v.x = p.x; v.z = p.z; v.heading = p.heading;
    } else if (v.edge) {
      const p = this.graph.at(v.edge, v.s, T.traffic.laneOffset);
      v.x = p.x; v.z = p.z; v.heading = p.heading;
    }
  }

  populate(px: number, pz: number) {
    for (let i = 0; i < T.traffic.baseCount; i++) this.spawnNear(px, pz, 15, T.traffic.window);
    this.spawnBus(1, this.busRoute.project(px, pz).s - 60);
  }

  update(dt: number, px: number, pz: number, jam: number, pinned: Set<number>) {
    const tr = T.traffic;
    this.spawnT -= dt;
    const want = tr.baseCount + Math.round(jam * tr.jamExtra);
    const graphCount = this.vehicles.filter((v) => !v.routeDir).length;
    if (this.spawnT <= 0 && graphCount < want) {
      this.spawnT = this.rng.range(...tr.spawnEvery);
      this.spawnNear(px, pz, 70, tr.window);
    }
    // Buses enter the route out of sight behind the player (towards Sealdah) or ahead (coming back), wherever on
    // the long line the player is.
    let ps: number | null = null;
    for (let d = 0; d < 2; d++) {
      this.busT[d] -= dt;
      if (this.busT[d] > 0) continue;
      this.busT[d] = T.bus.every * this.rng.range(0.7, 1.3);
      ps ??= this.busRoute.project(px, pz).s;
      const s = d === 0 ? Math.max(0, ps - tr.window + 20) : Math.min(this.busRoute.length, ps + tr.window - 20);
      if (this.busRoute.project(px, pz).dist < tr.window) this.spawnBus(d === 0 ? 1 : -1, s);
    }

    for (const v of this.vehicles) {
      let target = v.base * (1 - jam * tr.jamSlow[v.kind]);
      if (v.routeDir && this.routeStops.some((st) => Math.abs(st.s - v.s) < T.bus.stopRadius)) target = Math.min(target, T.bus.stopSlow);
      if (v.stopped && v.stopped > 0) { v.stopped -= dt; target = 0; }
      if (v.captain) target = captainSpeed(v, target, Math.hypot(v.captain.tx - v.x, v.captain.tz - v.z));
      // Keep a gap to whoever is ahead in the same lane.
      if (v.kind !== 'bike') {
        for (const o of this.vehicles) {
          if (o === v) continue;
          const dx = o.x - v.x, dz = o.z - v.z;
          const ahead = dx * Math.cos(v.heading) + dz * Math.sin(v.heading);
          const side = Math.abs(-dx * Math.sin(v.heading) + dz * Math.cos(v.heading));
          if (ahead > 0 && ahead < (o.len + v.len) / 2 + tr.followGap && side < (o.width + v.width) / 2) target = Math.min(target, o.speed * 0.8);
        }
      }
      v.speed += (target - v.speed) * Math.min(1, dt * 2.5);
      this.advance(v, v.speed * dt);
    }
    // Drop vehicles that left the window or ran off the map, unless someone is riding them.
    this.vehicles = this.vehicles.filter((v) => pinned.has(v.id) || v.captain?.state === 'carrying' || (!v.gone && Math.hypot(v.x - px, v.z - pz) < tr.window + 40));
  }

  private advance(v: Vehicle, ds: number) {
    if (v.routeDir) {
      v.s += ds * v.routeDir;
      if (v.s < 0 || v.s > this.busRoute.length) v.gone = true;
    } else if (v.edge) {
      v.s += ds;
      while (v.edge && v.s > v.edge.len) {
        v.s -= v.edge.len;
        const n: Edge | null = v.plan?.length ? v.plan.shift()! : this.graph.next(v.edge, this.rng);
        if (!n) { v.gone = true; break; }
        v.edge = n;
      }
    }
    if (!v.gone) this.place(v);
  }

  /** Left rear door of a bus, in world space (doors are on the left; the bus faces `heading`). */
  static busDoor(v: Vehicle, doorX: number) {
    const c = Math.cos(v.heading), s = Math.sin(v.heading);
    const side = v.width / 2 + 0.5;
    // Left of heading with z south is (sin, -cos).
    return { x: v.x + c * doorX + s * side, z: v.z + s * doorX - c * side };
  }
}

function captainSpeed(v: Vehicle, cruise: number, dist: number) {
  const c = v.captain!;
  if (c.state === 'approach') {
    if (c.plan === 'pass') return Math.max(cruise, 12);
    if (dist <= 2.5) { c.state = 'waiting'; return 0; }
    return Math.max(2, Math.min(14, dist * 1.2));
  }
  if (c.state === 'waiting') return 0;
  return cruise;
}
