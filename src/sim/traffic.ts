// Traffic on the real roads: yellow taxis, cars, autos, totos and bikes wander the road graph;
// Kolkata buses run their route along Street No. 13 and slow (never stop) at real stops.
// Everyone keeps left. Pure logic: the renderer reads `vehicles`.
//
// Every vehicle drives a lane path, never the road's centre line: a graph vehicle the lanes of the edges it has
// picked (a Track), a bus its direction's own line, routed on the directed road graph so it stays on its own
// carriageway of a divided road. Both are read smoothed (polyline.ts), so turns and lane changes are curves.

import { DRIVE, T } from '../content/tuning';
import type { MapData, Pt } from './mapdata';
import { Polyline, smoothAt, Track } from './polyline';
import { laneEnds, type Edge, type RoadGraph } from './roadgraph';
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

/** A graph vehicle's road: the lane it drives and which edge each stretch of it belongs to. */
interface Road { track: Track; legs: { e: Edge; u0: number; u1: number }[]; u: number; deadEnd: boolean; planRef?: Edge[] }

export interface Vehicle {
  id: number;
  kind: Kind;
  /** Picks the livery/model variant in the renderer. */
  variant: number;
  x: number; z: number; heading: number;
  speed: number;
  base: number;
  len: number; width: number;
  /** Graph vehicles: the edge it's on and how far along it (centre-line units). */
  edge?: Edge; s: number;
  /** Planned edges to drive next (captains route to the player); random turns once it's empty. */
  plan?: Edge[];
  road?: Road;
  /** Bus-route vehicles: which way along the line (1 towards Sealdah); `s` is the distance along that way's line. */
  routeDir?: 1 | -1;
  hangers?: number;
  depotAt?: number;
  /** A bus that has reached its depot: it no longer takes passengers. */
  retired?: boolean;
  stopped?: number;
  /** Seconds left being honked along by a bus behind (it speeds up to get out of the way). */
  honked?: number;
  /** The speed the honking bus wants. */
  honkSpeed?: number;
  /** True while slowing down (the renderer lights the brake lights). */
  braking?: boolean;
  captain?: Captain;
  gone?: boolean;
}

export interface BusLine { path: Pt[]; stops: { n: string; p: Pt; thin?: boolean }[] }

/** One direction of the bus line: its own lane, start to end, and the stops along it. */
export interface BusWay { line: Polyline; stops: { s: number; name: string }[] }

// A Rapi-Nah captain rides the ordinary lane: he has to pull up right by the kerb point he was sent to.
const laneFrac = (v: Vehicle) => (v.kind === 'bike' && !v.captain ? DRIVE.bikeLane : T.traffic.laneOffset);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class Traffic {
  vehicles: Vehicle[] = [];
  /** The bus line both ways, each on its own carriageway. */
  readonly ways: Record<1 | -1, BusWay>;
  private nextId = 1;
  private spawnT = 0;
  private busT = [2, 6];

  /**
   * `route`: the bus line (defaults to the map's own bus path and stops), drawn from College More to the end of
   * the line. Stops flagged `thin` (beyond the map, where the timed world squeezes real stops close together) are
   * kept one per T.bus.minStopGap of route.
   */
  constructor(map: MapData, private graph: RoadGraph, private rng: Rng, route: BusLine = { path: map.busPath, stops: map.stops }) {
    const way = (ref: Pt[]): BusWay => {
      const line = busLane(graph, ref);
      let last = -Infinity;
      const stops = route.stops
        .map((st) => ({ ...line.project(st.p[0], st.p[1]), name: st.n, thin: st.thin }))
        .filter((p) => p.dist < 14)
        .sort((a, b) => a.s - b.s)
        // Stops a stone's throw apart (Wipro, Nicco Park, Japani Gate) are one slow crawl past, not three.
        .filter((p) => { const keep = p.s - last >= (p.thin ? T.bus.minStopGap : T.bus.stopRadius * 2); if (keep) last = p.s; return keep; })
        .map((p) => ({ s: p.s, name: p.name }));
      return { line, stops };
    };
    this.ways = { 1: way(route.path), [-1]: way([...route.path].reverse()) } as Record<1 | -1, BusWay>;
  }

  /** The bus line towards Sealdah. */
  get busRoute() { return this.ways[1].line; }
  /** The real stops along the line towards Sealdah. */
  get routeStops() { return this.ways[1].stops; }
  /** The line a bus is on. */
  wayOf(v: Vehicle) { return this.ways[v.routeDir ?? 1]; }

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
    return this.spawnOnEdge(kind, e, this.rng.range(0, e.len));
  }

  spawnOnEdge(kind: Exclude<Kind, 'bus'>, e: Edge, s = 0): Vehicle {
    const v = this.make(kind, { edge: e, s });
    const road: Road = { track: new Track(), legs: [], u: 0, deadEnd: false };
    v.road = road;
    this.append(v, e);
    const l = road.legs[0];
    road.u = l.u0 + (l.u1 - l.u0) * (s / e.len);
    this.ahead(v);
    this.place(v);
    return v;
  }

  /** A bus `s` along its direction's line (towards Sealdah from College More, or back). */
  spawnBus(dir: 1 | -1, s = 0): Vehicle {
    const v = this.make('bus', { routeDir: dir, s: Math.max(0, s), hangers: Math.floor(this.rng.range(0, 4)) });
    const stops = this.ways[dir].stops;
    if (dir === 1 && this.rng.chance(T.bus.depotChance) && stops.length > 2) v.depotAt = stops[Math.floor(stops.length / 2)].s;
    this.place(v);
    return v;
  }

  private place(v: Vehicle) {
    const p = v.routeDir ? this.wayOf(v).line.smooth(v.s, DRIVE.busRound) : v.road?.track.smooth(v.road.u, DRIVE.round);
    if (p) { v.x = p.x; v.z = p.z; v.heading = p.heading; }
  }

  /** Heading `look` units further along the vehicle's path. */
  private headingAhead(v: Vehicle, look: number) {
    if (v.routeDir) return this.wayOf(v).line.smooth(v.s + look, DRIVE.busRound).heading;
    return v.road ? v.road.track.smooth(v.road.u + look, DRIVE.round).heading : v.heading;
  }

  // --- A graph vehicle's road ahead ------------------------------------------

  private append(v: Vehicle, e: Edge) {
    const r = v.road!, [a, b] = laneEnds(e, laneFrac(v));
    const u0 = r.track.push(a), u1 = r.track.push(b);
    r.legs.push({ e, u0, u1 });
  }

  /** A new plan (a captain routed somewhere) replaces whatever was picked beyond the edge it starts from. */
  private syncPlan(v: Vehicle) {
    const r = v.road!;
    if (v.plan === r.planRef) return;
    r.planRef = v.plan;
    const from = v.plan?.[0]?.from;
    if (from === undefined) return;
    const k = r.legs.findIndex((l) => l.u1 >= r.u - 1e-6 && l.e.to === from);
    if (k < 0) return;
    r.legs.length = k + 1;
    r.track.cut(r.legs[k].u1);
    r.deadEnd = false;
  }

  /** Pick edges until the track reaches past what the vehicle needs to see and smooth over. */
  private ahead(v: Vehicle) {
    const r = v.road!, need = r.u + DRIVE.round + DRIVE.bendLook + 1;
    while (!r.deadEnd && r.track.end < need) {
      const last = r.legs[r.legs.length - 1].e;
      const n: Edge | null = v.plan?.length ? v.plan.shift()! : this.graph.next(last, this.rng);
      if (n) this.append(v, n); else r.deadEnd = true;
    }
  }

  private advanceRoad(v: Vehicle, ds: number) {
    const r = v.road!;
    this.syncPlan(v);
    r.u += ds;
    this.ahead(v);
    if (r.deadEnd && r.u >= r.track.end) { v.gone = true; return; }
    // The edge under the vehicle: the first whose lane it hasn't passed (in a corner: the one it's turning into).
    let k = r.legs.findIndex((l) => r.u <= l.u1);
    if (k < 0) k = r.legs.length - 1;
    const l = r.legs[k];
    v.edge = l.e;
    v.s = l.e.len * Math.max(0, Math.min(1, (r.u - l.u0) / (l.u1 - l.u0 || 1)));
    const behind = r.u - DRIVE.round - 2;
    let drop = 0;
    while (drop < k - 1 && r.legs[drop].u1 < behind) drop++;
    if (drop) r.legs.splice(0, drop);
    r.track.trim(Math.min(behind, r.legs[0].u0));
  }

  populate(px: number, pz: number) {
    for (let i = 0; i < T.traffic.baseCount; i++) this.spawnNear(px, pz, 15, T.traffic.window);
    this.spawnBus(1, this.ways[1].line.project(px, pz).s - 60);
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
    // Buses enter their line out of sight behind the player, wherever on the long line the player is: towards
    // Sealdah from the College More side, coming back from the Sealdah side.
    for (let d = 0; d < 2; d++) {
      this.busT[d] -= dt;
      if (this.busT[d] > 0) continue;
      this.busT[d] = T.bus.every * this.rng.range(0.7, 1.3);
      const dir = d === 0 ? 1 : -1, p = this.ways[dir].line.project(px, pz);
      // Never more than a few buses per direction in the window, even if they're all stuck in a jam.
      const buses = this.vehicles.filter((v) => v.routeDir === dir).length;
      if (buses < T.bus.maxPerDir && p.dist < tr.window) this.spawnBus(dir, p.s - tr.window + 20);
    }

    for (const v of this.vehicles) {
      // Beyond the Sector V square the roads open up a little (and the timed world is squeezed anyway).
      const open = Math.abs(v.x) > 360 || Math.abs(v.z) > 360 ? tr.openRoad : 1;
      let target = v.base * open * (1 - jam * tr.jamSlow[v.kind]);
      if (v.routeDir && !v.retired && this.wayOf(v).stops.some((st) => Math.abs(st.s - v.s) < T.bus.stopRadius)) target = Math.min(target, T.bus.stopSlow);
      // Slow for the bend ahead: full speed straight on, DRIVE.bendSpeed round a right angle.
      // (Squared: a gentle curve barely slows anyone; a corner does.)
      const bend = Math.min(1, Math.abs(wrap(this.headingAhead(v, DRIVE.bendLook) - v.heading)) / (Math.PI / 2)) ** 2;
      target = Math.min(target, target + (DRIVE.bendSpeed - target) * bend);
      if (v.honked && v.honked > 0) { v.honked -= dt; target = Math.max(target, v.honkSpeed ?? target); }
      if (v.stopped && v.stopped > 0) { v.stopped -= dt; target = 0; }
      if (v.captain) target = captainSpeed(v, target, Math.hypot(v.captain.tx - v.x, v.captain.tz - v.z));
      target = this.follow(v, target, pinned);
      v.braking = target < v.speed - 0.5;
      v.speed += (target - v.speed) * Math.min(1, dt * (target < v.speed ? DRIVE.brakeRate : 2.5));
      this.advance(v, v.speed * dt);
    }
    // Drop vehicles that left the window or ran off the map, unless someone is riding them.
    this.vehicles = this.vehicles.filter((v) => pinned.has(v.id) || v.captain?.state === 'carrying' || (!v.gone && Math.hypot(v.x - px, v.z - pz) < tr.window + 40));
  }

  /**
   * Keep a gap to whoever is ahead in the same lane. Bikes count too, but they ride nearer the kerb and side by
   * side with a car they squeeze past (DRIVE.squeeze), so they filter through a queue without driving through it.
   */
  private follow(v: Vehicle, target: number, pinned: Set<number>) {
    const tr = T.traffic, c = Math.cos(v.heading), s = Math.sin(v.heading);
    for (const o of this.vehicles) {
      if (o === v) continue;
      const dx = o.x - v.x, dz = o.z - v.z;
      if (Math.abs(dx) > 16 || Math.abs(dz) > 16) continue;
      // Only queue behind traffic going our way: waiting on crossing or oncoming vehicles at a junction
      // deadlocks (each waits for the other forever).
      if (Math.cos(o.heading - v.heading) < 0.5) continue;
      const ahead = dx * c + dz * s, side = Math.abs(-dx * s + dz * c);
      // Bumper to bumper; drivers look further ahead the faster they go.
      const gap = ahead - (o.len + v.len) / 2;
      if (!(ahead > 0 && gap < tr.followGap + v.speed * DRIVE.lookSecs && side < (o.width + v.width) / 2 - DRIVE.squeeze)) continue;
      // A Kolkata bus doesn't queue behind a toto: it leans on the horn and the toto gets out of the way.
      // The honk passes up the queue: whoever is being hurried along hurries the one in front too. And the bus
      // you're hanging off races the bus ahead of it (the conductor bangs on the side): it never just queues.
      const pushing = v.kind === 'bus' || (v.honked ?? 0) > 0;
      const racing = v.kind === 'bus' && pinned.has(v.id);
      if (pushing && (o.kind !== 'bus' || racing) && !o.captain && !pinned.has(o.id)) {
        const was = (o.honked ?? 0) > 0;
        o.honked = T.bus.honkFor;
        o.honkSpeed = Math.max(was ? (o.honkSpeed ?? 0) : 0, v.kind === 'bus' ? target : (v.honkSpeed ?? target));
        if (gap > 0.6) continue;
      }
      // Close up to DRIVE.stopGap behind it and no closer: slower the nearer it is.
      target = Math.min(target, o.speed * 0.8 + Math.max(0, gap - DRIVE.stopGap) * DRIVE.closeRate);
    }
    return target;
  }

  private advance(v: Vehicle, ds: number) {
    if (v.routeDir) {
      v.s += ds;
      if (v.s > this.wayOf(v).line.length) v.gone = true;
    } else if (v.road) this.advanceRoad(v, ds);
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

/**
 * One direction's bus lane along `ref` (drawn start to end): routed on the directed graph, so the bus keeps to
 * its own carriageway and never runs against a one-way, then rounded (DRIVE.round) and thinned to the points
 * that matter. With no route on the graph it falls back to the drawn line, offset to the left.
 */
function busLane(graph: RoadGraph, ref: Pt[]): Polyline {
  const edges = graph.routeAlong(ref, DRIVE.busTol);
  let raw: Pt[];
  if (edges) raw = edges.flatMap((e) => laneEnds(e, T.traffic.laneOffset));
  else {
    const line = new Polyline(ref), off = 7 * T.traffic.laneOffset;
    raw = [];
    for (let s = 0; s < line.length; s += 2) { const p = line.at(s, 1, off); raw.push([p.x, p.z]); }
  }
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const L = cum[cum.length - 1], out: Pt[] = [];
  let lastH = NaN;
  for (let s = 0; s <= L; s += 1) {
    const p = smoothAt(raw, cum, s, DRIVE.round);
    // Thin straight runs: keep a point where the heading has turned, or every 30 u.
    const prev = out[out.length - 1];
    const turned = !(Math.abs(wrap(p.heading - lastH)) < 0.004);
    if (!prev || turned || Math.hypot(p.x - prev[0], p.z - prev[1]) > 30 || s + 1 > L) { out.push([p.x, p.z]); lastH = p.heading; }
  }
  return new Polyline(out);
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
