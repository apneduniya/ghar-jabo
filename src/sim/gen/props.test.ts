// AUDIT.md 13-14: nothing generated stands in a real road's carriageway. Chunks round the places the audit found
// parked vehicles, bus stops and a lattice island in a net road, in both modes.
import { describe, expect, it } from 'vitest';
import worldJson from '../../../public/data/world.json';
import { generateChunk } from './chunks';
import { segDist } from './geom';
import { loadNet, warped } from './net';
import { CHUNK } from './types';
import { makeWarp } from './warp';

const net = loadNet(worldJson);

const SPOTS = {
  free: [[-1195, -901], [-797, -745], [-1686, 325], [-1160, -845], [-2011, -28], [-2307, 652], [-2018, 16.5], [-1994, -162], [-2884, 81], [-1997, 272]],
  timed: [[-504, -337], [-619, 82], [-789, 22], [-579, -306], [-700, 150]],
};
const CHECKED = new Set(['parked-car', 'parked-bike', 'bus-stop', 'palm', 'tree', 'stall', 'cart', 'handcart', 'shrine']);

describe('generated props and islands keep off net carriageways', () => {
  for (const mode of ['free', 'timed'] as const) it(mode, () => {
    const warp = makeWarp(mode), wn = warped(net, warp), bad: string[] = [];
    const seen = new Set<string>();
    for (const [x, z] of SPOTS[mode]) for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
      const cx = Math.floor(x / CHUNK) + dx, cz = Math.floor(z / CHUNK) + dz;
      if (seen.has(`${cx},${cz}`)) continue;
      seen.add(`${cx},${cz}`);
      const c = generateChunk(net, warp, mode, cx, cz, 7);
      // Carriageways (ground roads) a point is inside, with its distance from each centre line.
      const inside = (px: number, pz: number, pad: number) => {
        const out: { name: string; d: number; half: number }[] = [];
        for (const [ri, k] of wn.segmentsIn(px - 30, pz - 30, px + 30, pz + 30)) {
          const r = wn.roads[ri];
          if (r.road.bridge === 'flyover') continue;
          const d = segDist(px, pz, r.p[k - 1][0], r.p[k - 1][1], r.p[k][0], r.p[k][1]);
          if (d < r.road.w / 2 + pad && !out.some((o) => o.name === r.road.id)) out.push({ name: r.road.id, d, half: r.road.w / 2 });
        }
        return out;
      };
      for (const i of c.islands ?? []) {
        const hits = inside(i.x, i.z, i.r);
        if (hits.length) bad.push(`island at ${i.x.toFixed(0)},${i.z.toFixed(0)} on ${hits.map((h) => h.name)}`);
      }
      for (const p of c.props) {
        if (!CHECKED.has(p.kind)) continue;
        const hits = inside(p.x, p.z, 0.3);
        // A parked vehicle may stand in its own street's kerb lane (a real side road): one road, near its kerb.
        const own = (p.kind === 'parked-car' || p.kind === 'parked-bike') && hits.length === 1 && hits[0].d > hits[0].half - 1.5;
        if (hits.length && !own) bad.push(`${p.kind} at ${p.x.toFixed(0)},${p.z.toFixed(0)} on ${hits.map((h) => `${h.name} (${h.d.toFixed(1)} of ${h.half})`)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
