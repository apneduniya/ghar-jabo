// Traffic in the streamed world drives beside the structures standing in its roads (the Green Line's piers in the
// median of 3rd Avenue and the Bypass, flyover ramps, station pier pairs, bridge abutments), never through them.
import { describe, expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import worldJson from '../../public/data/world.json';
import type { MapData } from './mapdata';
import { Rng } from './rng';
import { Run } from './run';
import { World } from './world';
import { loadNet } from './gen/net';
import { clipMap } from './gen/clip';
import { allSolids, rampFeet } from './gen/solids';
import { SolidGrid } from './solids';
import { LANE_ROOM, T } from '../content/tuning';

const map = clipMap(mapJson as unknown as MapData), net = loadNet(worldJson);
const world = (mode: 'timed' | 'free') => {
  const run = new Run(mode); run.seed = 5;
  return new World(map, run, new Rng(5), { x: map.pois.tiu[0] + 12, z: map.pois.tiu[1] - 12 }, net);
};
const inSquare = (x: number, z: number) => Math.abs(x) <= 360 && Math.abs(z) <= 360;
const isPier = (s: { hl: number; hw: number; r: number }) => !s.hl && !s.hw && s.r > 0;

describe('streamed traffic lanes and structures', () => {
  for (const mode of ['timed', 'free'] as const) it(`${mode}: no lane passes through any structure solid`, () => {
    const w = world(mode), warp = w.streamed!.store.warp;
    // At a flyover ramp's foot the traffic is driving onto the ramp, not past it: those pieces don't count.
    const feet = new Set(rampFeet(net, warp)), solids = allSolids(net, warp).filter((s) => !feet.has(s));
    const grid = new SolidGrid(solids), piers = new SolidGrid(solids.filter(isPier));
    const bad: string[] = [];
    let checked = 0, besidePier = 0;
    for (const e of w.graph.edges) {
      if (e.deck || (inSquare(e.ax, e.az) && inSquare(e.bx, e.bz))) continue; // decks run over it all; Sector V has its own
      for (let s = 0; s <= e.len; s += 1) {
        const q = w.graph.at(e, s, T.traffic.laneOffset);
        if (inSquare(q.x, q.z)) continue;
        checked++;
        // The lane centre plus half a bus must clear every solid.
        if (grid.blocked(q.x, q.z, LANE_ROOM.busHalf)) bad.push(`${q.x.toFixed(0)},${q.z.toFixed(0)}`);
        else if (piers.blocked(q.x, q.z, 2)) besidePier++; // a bus passing a pier close by
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(besidePier).toBeGreaterThan(5);
    expect(bad).toEqual([]);
  }, 120_000);

  it('a lane moved round a structure stays on its carriageway (a bus overhangs the kerb by at most a little)', () => {
    for (const mode of ['timed', 'free'] as const) {
      const w = world(mode);
      let moved = 0;
      for (const e of w.graph.edges) {
        if (e.deck || e.lane === undefined) continue;
        moved++;
        expect(Math.abs(e.lane) + LANE_ROOM.busHalf, `lane on a ${e.width} road`).toBeLessThanOrEqual(e.width / 2 + LANE_ROOM.overKerb + 1e-6);
      }
      expect(moved, mode).toBeGreaterThan(0);
    }
  });
});
