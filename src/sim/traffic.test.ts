// Task 023: traffic keeps its lane. Buses run each way on their own carriageway (a divided road is two one-way
// ways: the bus back must not run down the other one against the traffic, or across the median), graph vehicles
// turn through junctions on a curve instead of jumping sideways at every node, nobody U-turns round a median end,
// and bikes filter past a queue without driving through it.
import { describe, expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import worldJson from '../../public/data/world.json';
import { DRIVE, T } from '../content/tuning';
import type { MapData } from './mapdata';
import { NO_INTENT } from './player';
import { Rng } from './rng';
import { Run } from './run';
import { laneOf, RoadGraph, type Edge } from './roadgraph';
import { Traffic } from './traffic';
import { BUS_REAR_DOOR } from './vehicles';
import { World } from './world';
import { clipMap } from './gen/clip';
import { loadNet } from './gen/net';

const map = mapJson as unknown as MapData;
const clipped = clipMap(map), net = loadNet(worldJson);

function world(mode: 'map' | 'timed' | 'free', seed = 5) {
  const run = new Run(mode === 'map' ? 'timed' : mode);
  run.clockRunning = true; run.seed = seed;
  const start = { x: map.pois.tiu[0] + 12, z: map.pois.tiu[1] - 12 };
  const w = mode === 'map' ? new World(map, run, new Rng(seed), start) : new World(clipped, run, new Rng(seed), start, net);
  const s = w.freeSpotNear(start.x, start.z);
  w.player.x = s.x; w.player.z = s.z;
  return w;
}

function segDist(e: Edge, x: number, z: number) {
  const t = Math.max(0, Math.min(e.len, (x - e.ax) * e.dx + (z - e.az) * e.dz));
  return Math.hypot(e.ax + e.dx * t - x, e.az + e.dz * t - z);
}

/** Nodes where three or more roads meet (and median gaps): a vehicle turning there is near crossing centre lines. */
function junctions(g: RoadGraph) {
  const nb = g.nodes.map(() => new Set<number>());
  for (const e of g.edges) { nb[e.from].add(e.to); nb[e.to].add(e.from); }
  return g.nodes.filter((_, i) => nb[i].size >= 3 || g.out[i].some((id) => g.edges[id].link));
}

/**
 * True if a vehicle at (x, z) facing `heading` is on its own side: the nearest road centre line runs its way and,
 * if that road is two-way, it is left of the line. False if the only road under it runs the other way (the
 * wrong carriageway of a divided road, or against a one-way). Null near a junction or off the graph.
 */
function ownSide(g: RoadGraph, near: [number, number][], x: number, z: number, heading: number): boolean | null {
  if (near.some(([nx, nz]) => Math.hypot(nx - x, nz - z) < 9)) return null;
  const hx = Math.cos(heading), hz = Math.sin(heading);
  const cand = g.edges.filter((e) => Math.abs((e.ax + e.bx) / 2 - x) < e.len / 2 + 9 && Math.abs((e.az + e.bz) / 2 - z) < e.len / 2 + 9);
  const d = cand.map((e) => segDist(e, x, z));
  const best = Math.min(...d);
  if (!(best < 6)) return null;
  // Where a structure stands in the road its lane plan (task 022, sim/gen/lanes.ts) may move the lane right
  // across its own centre line, toward a squeezed partner carriageway: that's by design, not a wrong side.
  if (cand.some((e, i) => d[i] < 4 && e.lane !== undefined && e.dx * hx + e.dz * hz > 0.3)) return null;
  const set = cand.filter((_, i) => d[i] <= best + 0.3);
  const mine = set.find((e) => e.dx * hx + e.dz * hz > 0.3);
  if (!mine) return false;
  if (!set.some((o) => o.from === mine.to && o.to === mine.from)) return true;
  return mine.dx * (z - mine.az) - mine.dz * (x - mine.ax) < 0;
}

describe('the bus line, both ways', () => {
  for (const mode of ['map', 'timed', 'free'] as const) it(`${mode}: each direction runs on its own carriageway, never against the traffic`, () => {
    const w = world(mode), g = w.graph, near = junctions(g);
    for (const dir of [1, -1] as const) {
      const line = w.traffic.ways[dir].line;
      let checked = 0;
      const bad: string[] = [];
      for (let s = 0; s < line.length; s += 2) {
        const p = line.smooth(s, DRIVE.busRound), ok = ownSide(g, near, p.x, p.z, p.heading);
        if (ok === null) continue;
        checked++;
        if (!ok) bad.push(`${dir}@${s}: ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
      }
      expect(checked, `${mode} ${dir}`).toBeGreaterThan(line.length / 2 * 0.5);
      expect(bad.slice(0, 8), `${mode} ${dir}: ${bad.length} of ${checked} samples`).toEqual([]);
    }
  }, 120_000);

  it('runs from College More to the end of the line, and the other way back', () => {
    for (const mode of ['map', 'timed'] as const) {
      const w = world(mode), there = w.traffic.ways[1], back = w.traffic.ways[-1];
      const college = map.stops.find((s) => s.n === 'College More')!.p;
      const a = there.line.pts[0], b = back.line.pts[back.line.pts.length - 1];
      expect(Math.hypot(a[0] - college[0], a[1] - college[1]), mode).toBeLessThan(25);
      expect(Math.hypot(b[0] - college[0], b[1] - college[1]), mode).toBeLessThan(25);
      const end = there.line.pts[there.line.pts.length - 1], start = back.line.pts[0];
      expect(Math.hypot(end[0] - start[0], end[1] - start[1]), mode).toBeLessThan(40);
      // Same road home, give or take a one-way detour; real stops both ways.
      expect(Math.abs(there.line.length - back.line.length) / there.line.length, mode).toBeLessThan(0.15);
      expect(there.stops.length, mode).toBeGreaterThan(2);
      expect(back.stops.length, mode).toBeGreaterThan(1);
    }
  });

  it('the divided Street No. 13 at College More: the two directions are on different carriageways', () => {
    const w = world('map'), there = w.traffic.ways[1].line, back = w.traffic.ways[-1].line;
    // Halfway between College More and Techno India, both ways.
    const p = there.at(there.project(110, 70).s, 1, 0), q = back.at(back.project(110, 70).s, 1, 0);
    expect(Math.cos(p.heading - q.heading)).toBeLessThan(-0.9);
    // Each keeps left of its own carriageway's centre line, so they pass a full median plus two lanes apart.
    expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThan(8);
  });

  it('a bus going back runs from the Sealdah side towards College More; hop on and the conductor tells you', () => {
    const w = world('map');
    const bus = w.traffic.spawnBus(-1, 60);
    bus.base = 1; bus.speed = 1; bus.hangers = 0;
    const d = Traffic.busDoor(bus, BUS_REAR_DOOR);
    w.player.x = d.x; w.player.z = d.z;
    w.step({ ...NO_INTENT, action: true });
    expect(w.player.state).toBe('hang');
    expect(w.events.drain().some((e) => e.type === 'notify' && e.title.includes('College More'))).toBe(true);
    const s0 = bus.s;
    for (let i = 0; i < 120; i++) w.step({ ...NO_INTENT, lean: w.player.lean * 3 + w.player.leanVel });
    expect(bus.s).toBeGreaterThan(s0);
    const college = map.stops.find((s) => s.n === 'College More')!.p;
    const back = w.traffic.ways[-1].line, end = back.pts[back.pts.length - 1];
    expect(Math.hypot(end[0] - college[0], end[1] - college[1])).toBeLessThan(25);
  });

  it('at the depot the bus puts everyone off and stops taking passengers (it does not U-turn across the road)', () => {
    const w = world('map');
    const bus = w.traffic.spawnBus(1, 100);
    bus.base = 1; bus.speed = 1; bus.hangers = 0; bus.depotAt = 103;
    const d = Traffic.busDoor(bus, BUS_REAR_DOOR);
    w.player.x = d.x; w.player.z = d.z;
    w.step({ ...NO_INTENT, action: true });
    expect(w.player.state).toBe('hang');
    let toast = false;
    for (let i = 0; i < 60 * 8 && w.player.state === 'hang'; i++) {
      const before = { x: bus.x, z: bus.z };
      w.step({ ...NO_INTENT, lean: w.player.lean * 3 + w.player.leanVel });
      toast ||= w.events.drain().some((e) => e.type === 'toast' && e.title === 'DEPOT!');
      expect(Math.hypot(bus.x - before.x, bus.z - before.z)).toBeLessThan(0.5);
    }
    expect(toast).toBe(true);
    expect(w.player.state).toBe('foot');
    expect(bus.routeDir).toBe(1);
    expect(bus.retired).toBe(true);
    const door = Traffic.busDoor(bus, BUS_REAR_DOOR);
    w.player.x = door.x; w.player.z = door.z; w.player.downT = 0;
    expect(w.action()?.kind).not.toBe('hop');
  });
});

describe('graph traffic', () => {
  for (const mode of ['map', 'timed'] as const) it(`${mode}: no sideways jump or heading snap at nodes, ever`, () => {
    const w = world(mode, 3);
    const last = new Map<number, { x: number; z: number; h: number }>();
    let pairs = 0, maxTurn = 0;
    const jumps: string[] = [];
    for (let i = 0; i < 60 * 25; i++) {
      w.step();
      w.events.drain();
      for (const v of w.traffic.vehicles) {
        const p = last.get(v.id);
        if (p) {
          pairs++;
          const moved = Math.hypot(v.x - p.x, v.z - p.z), allowed = v.speed * T.step + 1e-3;
          if (moved > allowed) jumps.push(`${v.kind} ${v.id}: ${moved.toFixed(3)} > ${allowed.toFixed(3)}`);
          maxTurn = Math.max(maxTurn, Math.abs(Math.atan2(Math.sin(v.heading - p.h), Math.cos(v.heading - p.h))));
        }
        last.set(v.id, { x: v.x, z: v.z, h: v.heading });
      }
    }
    expect(pairs).toBeGreaterThan(10_000);
    expect(jumps.slice(0, 5), `${jumps.length} jumps`).toEqual([]);
    // 0.25 rad in 1/60 s: a hairpin at speed, not a snap (the old per-edge lanes snapped up to ~1.6 rad).
    expect(maxTurn).toBeLessThan(0.25);
  }, 120_000);

  for (const mode of ['map', 'timed'] as const) it(`${mode}: graph vehicles keep to their own side too`, () => {
    const w = world(mode, 4), g = w.graph, near = junctions(g);
    let checked = 0;
    const bad: string[] = [];
    for (let i = 0; i < 60 * 20; i++) {
      w.step();
      w.events.drain();
      if (i % 30) continue;
      for (const v of w.traffic.vehicles) {
        if (v.routeDir) continue;
        const ok = ownSide(g, near, v.x, v.z, v.heading);
        if (ok === null) continue;
        checked++;
        if (!ok) bad.push(`${v.kind}: ${v.x.toFixed(0)},${v.z.toFixed(0)}`);
      }
    }
    expect(checked).toBeGreaterThan(200);
    expect(bad.slice(0, 8), `${bad.length} of ${checked}`).toEqual([]);
  }, 120_000);

  it('never U-turns round the end of a median (or back down a road) when there is any other way on', () => {
    for (const mode of ['map', 'timed'] as const) {
      const g = world(mode).graph, rng = new Rng(9);
      for (const e of g.edges) {
        const ahead = g.out[e.to].map((id) => g.edges[id]).filter((o) => o.to !== e.from && o.dx * e.dx + o.dz * e.dz > -0.8);
        if (!ahead.length) continue;
        for (let k = 0; k < 4; k++) {
          const n = g.next(e, rng)!;
          expect(n.from).toBe(e.to);
          expect(n.to).not.toBe(e.from);
          expect(n.dx * e.dx + n.dz * e.dz).toBeGreaterThan(-0.8);
        }
      }
    }
  });

  it('lanes near College More and TIU sit inside their carriageway, on its left half', () => {
    const w = world('map'), g = w.graph;
    const spots: [number, number][] = [[234, 115], [map.pois.tiu[0], map.pois.tiu[1]]];
    let n = 0;
    for (const e of g.edges) {
      if (!spots.some(([x, z]) => segDist(e, x, z) < 80)) continue;
      for (const [frac, half] of [[T.traffic.laneOffset, 0.6], [DRIVE.bikeLane, 0.3]]) {
        const off = laneOf(e, frac);
        expect(off).toBeGreaterThan(0);
        expect(off + half, `edge ${e.id} w ${e.width}`).toBeLessThanOrEqual(e.width / 2 + 1e-6);
      }
      n++;
    }
    expect(n).toBeGreaterThan(10);
  });
});

describe('bikes', () => {
  /** A car parked dead in the lane on a long straight 7 u road, and `kind` coming up behind it. */
  function queue(kind: 'bike' | 'car') {
    const g = new RoadGraph(map), rng = new Rng(2);
    const tr = new Traffic(map, g, rng);
    const e = g.edges.find((x) => x.len > 60 && x.width === 7)!;
    const car = tr.spawnOnEdge('car', e, 40);
    car.base = 0; car.speed = 0; car.stopped = 999;
    const v = tr.spawnOnEdge(kind, e, 20);
    v.base = 8; v.speed = 8;
    const base = T.traffic.baseCount, every = T.bus.every;
    T.traffic.baseCount = 0; T.bus.every = 1e9;
    let minGap = Infinity;
    try {
      for (let i = 0; i < 60 * 6; i++) {
        tr.update(1 / 60, car.x, car.z, 0, new Set());
        tr.vehicles = tr.vehicles.filter((o) => o === car || o === v);
        const ahead = (car.x - v.x) * Math.cos(v.heading) + (car.z - v.z) * Math.sin(v.heading);
        if (ahead > 0) minGap = Math.min(minGap, Math.hypot(car.x - v.x, car.z - v.z));
      }
    } finally { T.traffic.baseCount = base; T.bus.every = every; }
    const passed = (car.x - v.x) * Math.cos(v.heading) + (car.z - v.z) * Math.sin(v.heading) < 0;
    const side = Math.abs(-(car.x - v.x) * Math.sin(v.heading) + (car.z - v.z) * Math.cos(v.heading));
    return { passed, side, minGap };
  }

  it('a bike filters past a stopped car on the kerb side, clear of it', () => {
    const r = queue('bike');
    expect(r.passed).toBe(true);
    expect(r.side).toBeGreaterThan((0.6 + 1.1) / 2 - DRIVE.squeeze - 1e-6);
  });

  it('a car queues behind it instead of driving through it', () => {
    const r = queue('car');
    expect(r.passed).toBe(false);
    expect(r.minGap).toBeGreaterThan(2.3);
  });
});
