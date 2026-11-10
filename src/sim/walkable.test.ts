// You can walk from Sector V to the Sealdah forecourt along the bus route, in both modes. A breadth-first search
// over the walkable ground within a band of the route (and the walk-in near the end). Guards silent cuts: a canal
// crossing without a bridge exemption, the missing Sealdah walk-in lane, solids or dead ends across the road.
import { expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import worldJson from '../../public/data/world.json';
import type { MapData } from './mapdata';
import { Rng } from './rng';
import { Run } from './run';
import { World } from './world';
import { loadNet } from './gen/net';
import { clipMap } from './gen/clip';
import { STREAM } from '../content/worldgen';
STREAM.unload = 1e9; // keep every chunk along the route loaded for the search

for (const mode of ['free', 'timed'] as const) it(`${mode}: on foot from Sector V into the Sealdah forecourt`, () => {
  const run = new Run(mode); run.seed = 5;
  const map = clipMap(mapJson as unknown as MapData);
  const w = new World(map, run, new Rng(5), { x: map.pois.tiu[0] + 12, z: map.pois.tiu[1] - 12 }, loadNet(worldJson));
  const route = w.traffic.busRoute, L = route.length, st = w.streamed!, goal = st.sealdah;
  for (let s = 0; s < L; s += 60) { const q = route.at(s, 1, 0); st.stream(q.x, q.z, () => true); }
  const R = 1, band = 10;
  const r0 = route.at(150, 1, 0), start = w.freeSpotNear(r0.x, r0.z);
  const sx = Math.round(start.x / R), sz = Math.round(start.z / R);
  const key = (x: number, z: number) => x * 100000 + z;
  const q: [number, number][] = [[sx, sz]]; const seen = new Set([key(sx, sz)]);
  let best = 0, bx = 0, bz = 0, reached = false;
  for (let head = 0; head < q.length; head++) {
    const [x, z] = q[head];
    if (Math.hypot(x * R - goal.x, z * R - goal.z) < goal.r) { reached = true; break; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (seen.has(k)) continue; seen.add(k);
      const p = route.project(nx * R, nz * R);
      // Near the end the walk leaves the road for the forecourt: allow anything within 120 of the goal.
      if (p.dist > band && Math.hypot(nx * R - goal.x, nz * R - goal.z) > 260) continue;
      if (w.walkBlocked(nx * R, nz * R, 0.35)) continue;
      if (p.s > best) { best = p.s; bx = nx * R; bz = nz * R; }
      q.push([nx, nz]);
    }
  }
  expect(reached, `stuck at route s=${Math.round(best)} of ${Math.round(L)}, near (${bx}, ${bz})`).toBe(true);
}, 120_000);
