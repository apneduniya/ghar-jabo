// AUDIT.md 18: vehicles on a streamed flyover deck ride at the deck's level; nothing on a ground road is lifted.
import { expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import worldJson from '../../public/data/world.json';
import { T } from '../content/tuning';
import type { MapData } from './mapdata';
import { Rng } from './rng';
import { Run } from './run';
import { World } from './world';
import { clipMap } from './gen/clip';
import { loadNet } from './gen/net';

const map = clipMap(mapJson as unknown as MapData), net = loadNet(worldJson);

function world(mode: 'free' | 'timed') {
  const run = new Run(mode); run.seed = 5;
  return new World(map, run, new Rng(5), { x: map.pois.tiu[0] + 12, z: map.pois.tiu[1] - 12 }, net);
}

for (const mode of ['free', 'timed'] as const) it(`${mode}: every deck edge has its levels, and a deck lane rides at them`, () => {
  const g = world(mode).graph;
  let high = 0;
  for (const e of g.edges) {
    if (!e.deck) continue;
    expect(e.ya, 'deck edge has levels').toBeDefined();
    if (Math.min(e.ya!, e.yb!) <= 4) continue;
    high++;
    const q = g.at(e, e.len / 2, T.traffic.laneOffset);
    expect(g.deckYAt(q.x, q.z, e.dx, e.dz)).toBeGreaterThan(4);
  }
  expect(high, 'deck edges well up').toBeGreaterThan(20);
}, 120_000);

it('timed: graph vehicles on a deck ride at its level, on the ground at 0', () => {
  const tr = world('timed').traffic;
  let up = 0, down = 0;
  for (let i = 0; i < 3000; i++) {
    const v = tr.spawnNear(-600, 0, 0, 1e9);
    if (!v?.edge) continue;
    const e = v.edge;
    if (e.deck) {
      const want = e.ya! + (e.yb! - e.ya!) * (v.s / e.len);
      expect(v.y).toBeCloseTo(want, 3);
      if (want > 4) up++;
    } else { expect(v.y ?? 0).toBe(0); down++; }
    v.gone = true;
    tr.vehicles = tr.vehicles.filter((o) => o !== v);
  }
  expect(up, 'some spawned high on a deck').toBeGreaterThan(0);
  expect(down).toBeGreaterThan(0);
}, 120_000);
