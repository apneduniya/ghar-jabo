import { describe, expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import { north } from '../content/sectorv';
import { canalAt, canalLine, canalOf, canalRailings, RailingMask } from './canal';
import { inBox, isCanalBridge, nearest, onCarriageway, stations } from './elevated';
import type { MapData, Pt } from './mapdata';
import { Rng } from './rng';
import { Run } from './run';
import { World } from './world';

const map = mapJson as unknown as MapData;

describe('canal centre line', () => {
  const line = canalLine(map.water!)!;

  it('runs SW to NE through the square past Wipro More and the station, about 15 m wide', () => {
    expect(line).not.toBeNull();
    expect(line.p.length).toBeGreaterThan(100);
    for (const hw of line.hw) { expect(hw).toBeGreaterThanOrEqual(north.canalHalf[0]); expect(hw).toBeLessThanOrEqual(north.canalHalf[1]); }
    // Passes the Street 13 crossing (OSM-AUDIT §3: about (-140, -147)) and north of the station.
    expect(nearest(line.p, -140, -147).d).toBeLessThan(4);
    expect(nearest(line.p, -17, -226).d).toBeLessThan(4);
  });

  it('keeps its centre inside the OSM canal ring away from the pinched crossing', () => {
    const span = (r: Pt[]) => Math.max(...r.map((q) => q[0])) - Math.min(...r.map((q) => q[0]));
    const ring = [...map.water!].sort((a, b) => span(b) - span(a))[0];
    const inside = (x: number, z: number) => {
      let hit = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, zi] = ring[i], [xj, zj] = ring[j];
        if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
      }
      return hit;
    };
    const far = line.p.filter(([x, z]) => Math.hypot(x + 140, z + 147) > 25 && Math.abs(x) < 400 && Math.abs(z) < 400);
    const inRing = far.filter(([x, z]) => inside(x, z)).length;
    expect(inRing / far.length).toBeGreaterThan(0.9);
  });
});

describe('canal railings', () => {
  const { line, railings } = canalOf(map);

  it('line both banks along the station stretch, and the Street 13 crossing', () => {
    const near = (kind: string, x0: number, x1: number) => railings.filter((r) => r.kind === kind && r.a[0] > x0 && r.a[0] < x1);
    expect(near('north', -130, -50).length).toBeGreaterThan(10); // Chavipatty Rd: brick plinth + blue railing
    expect(near('south', -130, -50).length).toBeGreaterThan(10); // service road: white square-motif railing
    expect(railings.filter((r) => r.kind === 'bridge').length).toBeGreaterThanOrEqual(4);
  });

  it('stand on dry land beside the water, never over it, and never on a carriageway', () => {
    for (const r of railings.filter((r) => r.kind !== 'bridge')) {
      const c = canalAt(line!, r.a[0], r.a[1]);
      expect(c.d - c.hw).toBeGreaterThan(1.4);
      expect(onCarriageway(map.roads, r.a[0], r.a[1])).toBe(false);
    }
  });

  it('leave a gap under Sector V station, which spans the canal', () => {
    const { sv } = stations();
    expect(railings.some((r) => r.kind !== 'bridge' && inBox(sv, r.a[0], r.a[1]))).toBe(false);
  });

  it('block walking through them, but not the footpath beside them', () => {
    const mask = new RailingMask(railings);
    const r = railings.find((s) => s.kind === 'north')!;
    const mx = (r.a[0] + r.b[0]) / 2, mz = (r.a[1] + r.b[1]) / 2;
    expect(mask.blocked(mx, mz, 0.35)).toBe(true);
    const L = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]), nx = (r.b[1] - r.a[1]) / L, nz = -(r.b[0] - r.a[0]) / L;
    expect(mask.blocked(mx + nx * 1.2, mz + nz * 1.2, 0.35)).toBe(false);
    expect(mask.blocked(mx - nx * 1.2, mz - nz * 1.2, 0.35)).toBe(false);
  });

  it('keep the balustrade along the sides of the flat Street 13 crossing, leaving the deck open', () => {
    const mask = new RailingMask(railings);
    for (const b of map.roads.filter(isCanalBridge)) {
      const [ax, az] = b.p[0], [bx, bz] = b.p[b.p.length - 1];
      expect(mask.blocked((ax + bx) / 2, (az + bz) / 2, 0.35)).toBe(false);
    }
  });

  it('is a pure function of the map', () => {
    expect(canalRailings(map, line!, () => false).length).toBeGreaterThanOrEqual(railings.length);
  });
});

describe('the Sector V street entrance', () => {
  const world = () => {
    const run = new Run();
    return new World(map, run, new Rng(3), { x: 0, z: 0 });
  };

  it('is at Gate A, on foot, clear of buildings, water and railings', () => {
    const w = world();
    const e = w.metroEntrance;
    expect(Math.hypot(e.x - north.gateA.real[0], e.z - north.gateA.real[1])).toBeLessThan(2);
    expect(w.walkBlocked(e.x, e.z, 0.6)).toBe(false);
  });

  it('can be reached on foot from Wipro More and from PwC More', () => {
    const w = world();
    const e = w.metroEntrance;
    // Flood fill on a 1-unit grid over the north of the map, with the player's radius.
    const x0 = -200, z0 = -260, W = 260, H = 270;
    const seen = new Uint8Array(W * H);
    const key = (x: number, z: number) => (z - z0) * W + (x - x0);
    const reach = (from: Pt) => {
      seen.fill(0);
      const q: Pt[] = [[Math.round(from[0]), Math.round(from[1])]];
      seen[key(q[0][0], q[0][1])] = 1;
      while (q.length) {
        const [x, z] = q.pop()!;
        if (Math.hypot(x - e.x, z - e.z) < 1.5) return true;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz;
          if (nx < x0 || nz < z0 || nx >= x0 + W || nz >= z0 + H || seen[key(nx, nz)]) continue;
          seen[key(nx, nz)] = 1;
          if (!w.walkBlocked(nx, nz, 0.35)) q.push([nx, nz]);
        }
      }
      return false;
    };
    expect(reach([-150, -128])).toBe(true); // Wipro More, under the flyover
    expect(reach([-3, 5])).toBe(true); // PwC More
  });
});
