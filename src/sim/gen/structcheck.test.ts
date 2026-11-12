// The route audit's structure checks (research/routes/AUDIT.md 8, 10, 15, 16), in both modes.
import { describe, expect, it } from 'vitest';
import worldJson from '../../../public/data/world.json';
import { loadNet } from './net';
import { framePt, groundRoadsNear, metroLayout, metroPierAt, onCarriageway, roadNear, stationOver } from './layout';
import { marks, sample } from './lines';
import { crossingSite, parapet } from './sites';
import { makeWarp } from './warp';
import { LM } from '../../content/landmarks';
import { T } from '../../content/tuning';

const net = loadNet(worldJson);
const len = (p: number[][]) => p.slice(1).reduce((m, q, i) => m + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);

describe('flyover data (AUDIT.md 10, 15)', () => {
  it('a short OSM bridge is a canal or rail bridge, not a flyover deck (80 u rule, as Sector V)', () => {
    for (const r of net.roads) if (r.bridge === 'flyover' && !/flyover|setu/i.test(r.name ?? '')) expect(len(r.p), r.id).toBeGreaterThanOrEqual(80);
    // Bidhan Nagar Rd over the Beliaghata Canal (the stepped slabs).
    expect(net.roads.filter((r) => /bidhan nagar road/i.test(r.name ?? '') && r.bridge === 'flyover')).toEqual([]);
  });

  it('whole flyovers: Sealdah-Beliaghata spans the Sealdah South tracks, Vidyapati Setu runs APC Rd to MG Rd', () => {
    const total = (re: RegExp) => net.roads.filter((r) => r.bridge === 'flyover' && re.test(r.name ?? '')).reduce((m, r) => m + len(r.p), 0);
    expect(total(/sealdah beliaghata/i)).toBeGreaterThan(77); // one carriageway alone is ~67 u of OSM bridge and approach
    expect(total(/vidyapati/i)).toBeGreaterThan(400); // both arms, both carriageways
    expect(total(/ultadanga/i)).toBeGreaterThan(500);
  });
});

for (const mode of ['free', 'timed'] as const) describe(`${mode} structures`, () => {
  const warp = makeWarp(mode);

  it('metro piers stand in a median or off every carriageway (AUDIT.md 8)', () => {
    const bad: string[] = [];
    for (const mp of metroLayout(net, warp)) {
      const seen = new Set<number>();
      for (let cx = -40; cx <= 4; cx++) for (let cz = -20; cz <= 20; cz++) for (const m of marks(mp.l, cx, cz, LM.pierStep)) {
        if (seen.has(m) || (mp.y(m) ?? 0) < 4 || stationOver(mp, m)) continue;
        seen.add(m);
        const s = metroPierAt(net, warp, mp, m);
        if (s === null) continue;
        const q = sample(mp.l, s);
        for (const { r, l } of groundRoadsNear(net, warp, q.x, q.z, 20)) {
          const n = roadNear(l, q.x, q.z);
          const median = !r.oneway && Math.abs(n.side) < T.traffic.medianPier;
          if (n.d < r.w / 2 + 1.06 && !median) bad.push(`pier at ${q.x.toFixed(0)},${q.z.toFixed(0)} on ${r.name ?? r.id}`);
        }
      }
    }
    expect(bad).toEqual([]);
  }, 120_000);

  it('bridge parapets never stand on another carriageway (AUDIT.md 16)', () => {
    const bad: string[] = [];
    for (const c of net.crossings) {
      if (!c.over) continue;
      const [x, z] = warp.toGame([c.x, c.z]);
      if (Math.abs(x) < 400 && Math.abs(z) < 400) continue;
      const b = crossingSite(net, warp, c, x, z), { e, runs } = parapet(b), roads = groundRoadsNear(net, warp, b.x, b.z, 40);
      runs.forEach(([u0, u1], k) => {
        if (u1 - u0 <= 0.5) return; // no parapet that side (bridges.ts draws none)
        for (let u = u0; u <= u1; u += 0.5) {
          const [px, pz] = framePt(b.x, b.z, b.h, u, (k ? 1 : -1) * e);
          if (onCarriageway(roads, px, pz, 0)) bad.push(`parapet at ${px.toFixed(0)},${pz.toFixed(0)}`);
        }
      });
    }
    expect(bad.slice(0, 10)).toEqual([]);
  }, 60_000);
});
