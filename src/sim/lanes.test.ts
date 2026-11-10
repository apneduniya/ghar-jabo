// Traffic in the streamed world drives round the piers that stand in a road's median (the Green Line viaduct over
// 3rd Avenue and the Bypass, flyover columns), instead of through them.
import { describe, expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import worldJson from '../../public/data/world.json';
import type { MapData } from './mapdata';
import { Rng } from './rng';
import { Run } from './run';
import { World } from './world';
import { loadNet } from './gen/net';
import { clipMap } from './gen/clip';
import { allSolids } from './gen/solids';
import { SolidGrid } from './solids';
import { T } from '../content/tuning';

describe('streamed traffic lanes and piers', () => {
  for (const mode of ['timed', 'free'] as const) it(`${mode}: no lane runs through a pier in the median`, () => {
    const run = new Run(mode); run.seed = 5;
    const map = clipMap(mapJson as unknown as MapData), net = loadNet(worldJson);
    const w = new World(map, run, new Rng(5), { x: map.pois.tiu[0] + 12, z: map.pois.tiu[1] - 12 }, net);
    const piers = allSolids(net, w.streamed!.store.warp).filter((s) => !s.hl && !s.hw && s.r > 0);
    const grid = new SolidGrid(piers);
    const bad: string[] = [];
    let checked = 0;
    for (const e of w.graph.edges) {
      if (Math.abs(e.ax) <= 360 && Math.abs(e.az) <= 360) continue; // Sector V has its own test
      for (let s = 0; s <= e.len; s += 1) {
        const c = { x: e.ax + e.dx * s, z: e.az + e.dz * s };
        // Only piers in the median: within T.traffic.medianPier of this centre line.
        const inMedian = piers.some((p) => Math.abs((p.x - c.x) * e.dx + (p.z - c.z) * e.dz) < 1 && Math.abs((p.x - c.x) * e.dz - (p.z - c.z) * e.dx) < T.traffic.medianPier);
        if (!inMedian) continue;
        checked++;
        const q = w.graph.at(e, s, T.traffic.laneOffset);
        // The lane centre plus half a bus must clear the pier.
        if (grid.blocked(q.x, q.z, 1.25)) bad.push(`${q.x.toFixed(0)},${q.z.toFixed(0)}`);
      }
    }
    expect(checked).toBeGreaterThan(10);
    expect(bad).toEqual([]);
  }, 120_000);
});
