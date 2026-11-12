// AUDIT.md 24-28: every corridor can be driven, in 150 u legs, on the traffic graph (the right way down every
// one-way), each leg at most 1.6x its straight length, except the listed ones (with the reason); and the last leg
// reaches the Sealdah forecourt by road.
import { expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import worldJson from '../../public/data/world.json';
import type { MapData } from './mapdata';
import { Rng } from './rng';
import { Run } from './run';
import { World } from './world';
import { clipMap } from './gen/clip';
import { loadNet } from './gen/net';
import { densify } from './gen/geom';
import type { Pt } from './gen/types';

const map = clipMap(mapJson as unknown as MapData), net = loadNet(worldJson);
const LEG = 150;

/** Legs allowed a longer route, by where they start (game coords, either mode within 30 u), with the reason. */
const ALLOWED: { at: Pt; why: string }[] = [
  // Inside Sector V (the real map, task 032's): the corridor line follows the other one-way carriageway of Street
  // No. 13 near the TIU gate, so the leg routes round the block (AUDIT.md 28).
  { at: [-89, -33], why: 'Street No. 13 one-ways inside Sector V' }, { at: [-120, -69], why: 'Street No. 13 one-ways inside Sector V' },
];
/** Timed only: the squeeze shrinks a leg's straight length about 3x at these junctions; the route keeps true widths. */
const ALLOWED_TIMED: { at: Pt; why: string }[] = [
  { at: [-546, 91], why: 'Bypass at Apollo: turning off across the median, a short squeezed leg' },
  { at: [-504, -320], why: 'City Centre roundabout to 1st Avenue, a short squeezed leg' },
];

for (const mode of ['free', 'timed'] as const) it(`${mode}: every corridor drives end to end in 150 u legs`, () => {
  const run = new Run(mode); run.seed = 5;
  const w = new World(map, run, new Rng(5), { x: map.pois.tiu[0] + 12, z: map.pois.tiu[1] - 12 }, net), g = w.graph;
  const warp = w.streamed!.store.warp, bad: string[] = [];
  for (const c of net.corridors ?? []) {
    const line = densify(c.p, 5).map((q) => warp.toGame(q));
    const cum = [0];
    for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    for (let s0 = 0; s0 < cum[cum.length - 1] - 20; s0 += LEG) {
      const ref = line.filter((_, i) => cum[i] >= s0 && cum[i] <= s0 + LEG);
      if (ref.length < 2) continue;
      const a = ref[0], b = ref[ref.length - 1], straight = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const listed = [...ALLOWED, ...(mode === 'timed' ? ALLOWED_TIMED : [])];
      if (listed.some((x) => Math.hypot(x.at[0] - a[0], x.at[1] - a[1]) < 30 || Math.hypot(x.at[0] - b[0], x.at[1] - b[1]) < 30)) continue;
      const route = g.routeAlong(ref, 6, 20);
      const len = route ? route.reduce((m, e) => m + e.len, 0) : Infinity;
      if (len > straight * 1.6 + 20) bad.push(`${c.id[0]} ${a.map((v) => v.toFixed(0))} -> ${b.map((v) => v.toFixed(0))}: ${route ? len.toFixed(0) : 'no route'} vs ${straight.toFixed(0)}`);
    }
    // By road into the forecourt: from the corridor's end to the node nearest Sealdah.
    const end = line[line.length - 1], from = g.nearestNode(end[0], end[1]), sd = w.streamed!.sealdah, to = g.nearestNode(sd.x, sd.z);
    const r = g.route(from, to);
    if (!r) bad.push(`${c.id[0]}: no road from the corridor's end ${end.map((v) => v.toFixed(0))} to the forecourt`);
  }
  expect(bad).toEqual([]);
}, 300_000);
