// You can walk from Sector V to the Sealdah forecourt along every corridor (and the bus route), in both modes. A
// breadth-first search over the walkable ground within a band of the line (and the walk-in near the end). Guards
// silent cuts: a canal crossing without a bridge exemption, the missing Sealdah walk-in lane, solids or dead ends
// across the road (AUDIT.md 24).
import { expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import worldJson from '../../public/data/world.json';
import type { MapData } from './mapdata';
import { Polyline } from './polyline';
import { Rng } from './rng';
import { Run } from './run';
import { World } from './world';
import { loadNet } from './gen/net';
import { clipMap } from './gen/clip';
import { densify } from './gen/geom';
import { STREAM } from '../content/worldgen';
STREAM.unload = 1e9; // keep every chunk along the route loaded for the search

const map = clipMap(mapJson as unknown as MapData), net = loadNet(worldJson);

function world(mode: 'free' | 'timed') {
  const run = new Run(mode); run.seed = 5;
  return new World(map, run, new Rng(5), { x: map.pois.tiu[0] + 12, z: map.pois.tiu[1] - 12 }, net);
}

/** Walks from `start` along `route` (within `band` of it, anything within 260 of Sealdah) into the forecourt. */
function walk(w: World, route: Polyline, from: number, band = 10) {
  const st = w.streamed!, goal = st.sealdah, R = 1;
  for (let s = 0; s < route.length; s += 60) { const q = route.at(s, 1, 0); st.stream(q.x, q.z, () => true); }
  const r0 = route.at(from, 1, 0), start = w.freeSpotNear(r0.x, r0.z);
  const sx = Math.round(start.x / R), sz = Math.round(start.z / R);
  const key = (x: number, z: number) => x * 100000 + z;
  const q: [number, number][] = [[sx, sz]]; const seen = new Set([key(sx, sz)]);
  let best = 0, bx = 0, bz = 0;
  for (let head = 0; head < q.length; head++) {
    const [x, z] = q[head];
    if (Math.hypot(x * R - goal.x, z * R - goal.z) < goal.r) return { reached: true, msg: '' };
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (seen.has(k)) continue; seen.add(k);
      const p = route.project(nx * R, nz * R);
      // Near the end the walk leaves the road for the forecourt: allow anything within 260 of the goal.
      if (p.dist > band && Math.hypot(nx * R - goal.x, nz * R - goal.z) > 260) continue;
      if (w.walkBlocked(nx * R, nz * R, 0.35)) continue;
      if (p.s > best) { best = p.s; bx = nx * R; bz = nz * R; }
      q.push([nx, nz]);
    }
  }
  return { reached: false, msg: `stuck at s=${Math.round(best)} of ${Math.round(route.length)}, near (${bx}, ${bz})` };
}

for (const mode of ['free', 'timed'] as const) it(`${mode}: on foot from Sector V into the Sealdah forecourt by the bus route`, () => {
  const w = world(mode), r = walk(w, w.traffic.busRoute, 150);
  expect(r.reached, r.msg).toBe(true);
}, 300_000);

// Every corridor's drivable line, from where it leaves the Sector V square (the map's own streets are covered by
// the Sector V tests), then the walk-in.
for (const mode of ['free', 'timed'] as const) for (const c of net.corridors ?? []) it(`${mode}: on foot along corridor ${c.id}`, () => {
  const w = world(mode), warp = w.streamed!.store.warp;
  const line = new Polyline(densify(c.p, 5).map((q) => warp.toGame(q)));
  let from = 0;
  for (let s = 0; s < line.length; s += 5) { const q = line.at(s, 1, 0); if (Math.max(Math.abs(q.x), Math.abs(q.z)) > 370) { from = s; break; } }
  const r = walk(w, line, from);
  expect(r.reached, `${c.id} ${r.msg}`).toBe(true);
}, 300_000);
