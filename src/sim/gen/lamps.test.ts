// Street lighting beyond Sector V (task 031, AUDIT.md issue 2): lamps on both kerbs of every real road at most a
// few lamp steps apart (in game length, so timed mode's squeeze doesn't thin them), median lights on the divided
// arterials, high masts at the named junctions, and every lamp's pool on the ground in front of it.
import { describe, expect, it } from 'vitest';
import worldJson from '../../../public/data/world.json';
import { loadNet } from './net';
import { ChunkStore } from './stream';
import { makeCtx } from './ctx';
import { LAMPS } from '../../content/worldgen';
import { LampKind, lampPool } from './lamps';
import type { GenProp, Pt } from './types';

const net = loadNet(worldJson);

/** Arc length and signed offset (+ left of travel) of (x, z) against a polyline. */
function project(p: Pt[], x: number, z: number) {
  let best = { s: 0, d: Infinity, side: 0 }, acc = 0;
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L * L)));
    const qx = ax + dx * t, qz = az + dz * t, d = Math.hypot(x - qx, z - qz);
    if (d < best.d) best = { s: acc + t * L, d, side: Math.sign((x - qx) * (dz / L) - (z - qz) * (dx / L)) };
    acc += L;
  }
  return best;
}

/** Load every chunk along a road and return its game polyline and the lamps in reach of it. */
function lampsAlong(store: ChunkStore, roadName: string, cls?: string) {
  const roads = net.roads.filter((r) => r.name === roadName && !r.bridge && (!cls || r.cls === cls));
  return roads.map((road) => {
    const p = road.p.map((q) => store.warp.toGame(q));
    // Chunks unload behind a long road: keep every chunk's lamps as it goes by.
    const seen = new Map<string, GenProp[]>();
    for (const [x, z] of p) {
      store.update(x, z, () => true);
      for (const c of store.loaded()) seen.set(`${c.cx},${c.cz}`, c.props.filter((q) => q.kind === 'lamp'));
    }
    return { road, p, lamps: [...seen.values()].flat() };
  });
}

/** Every net carriageway in game coordinates (with a box for quick rejects), and the canal/rail crossings. */
function world(store: ChunkStore) {
  const roads = net.roads.map((r) => {
    const p = r.p.map((q) => store.warp.toGame(q));
    const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]);
    return { r, p, box: [Math.min(...xs) - r.w, Math.min(...zs) - r.w, Math.max(...xs) + r.w, Math.max(...zs) + r.w] };
  });
  const crossings = net.crossings.map((c) => ({ c, g: store.warp.toGame([c.x, c.z]) }));
  return { roads, crossings, water: makeCtx(net, store.warp, store.mode, store.seed).water };
}

/**
 * Longest dark run along one kerb (outside the Sector V square): metres with no lamp, counting only kerb spots
 * where a post could stand (not on another carriageway, as at junction mouths and merges, nor at a bridge or
 * over water).
 */
function worstGap(wd: ReturnType<typeof world>, road: (typeof net.roads)[number], p: Pt[], lamps: GenProp[], side: number) {
  const w = road.w;
  const at = lamps.map((l) => project(p, l.x, l.z)).filter((q) => q.d < w / 2 + 1.5 && q.side === side).map((q) => q.s).sort((a, b) => a - b);
  let gap = 0, run = 0, len = 0, n = 0, k = 0, acc = 0;
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-6) continue;
    const tx = (bx - ax) / L, tz = (bz - az) / L, nx = tz * side, nz = -tx * side, d = w / 2 + LAMPS.kerb;
    for (let s = 0; s < L; s += 2) {
      const x = ax + tx * s + nx * d, z = az + tz * s + nz * d;
      while (k < at.length && at[k] < acc + s + 2) { k++; n++; run = 0; }
      const outside = Math.abs(x) > 400 || Math.abs(z) > 400;
      const blocked = wd.roads.some((o) => o.r !== road && x > o.box[0] && x < o.box[2] && z > o.box[1] && z < o.box[3] && project(o.p, x, z).d < o.r.w / 2 + 0.5)
        || wd.crossings.some(({ c, g }) => Math.hypot(g[0] - x, g[1] - z) < c.width / 2 + 6) || wd.water.point(x, z);
      if (!outside || blocked) continue;
      run += 2; len += 2;
      gap = Math.max(gap, run);
    }
    acc += L;
  }
  return { gap, n, len };
}

describe('street lamps beyond Sector V', () => {
  for (const mode of ['free', 'timed'] as const) {
    it(`${mode}: both kerbs of two-way roads are lit, no long dark gaps`, { timeout: 180_000 }, () => {
      const store = new ChunkStore(net, mode, 7), wd = world(store);
      for (const name of ['Beleghata Main Road', 'Narkeldanga Main Road']) {
        for (const { road, p, lamps } of lampsAlong(store, name)) for (const side of [1, -1]) {
          const g = worstGap(wd, road, p, lamps, side);
          if (g.len < 80) continue;
          // Bus stops and landmark zones take out the odd post: at most a few steps dark.
          expect(g.gap, `${name} ${road.id} side ${side} (${g.n} lamps over ${g.len.toFixed(0)} u)`).toBeLessThanOrEqual(LAMPS.every * 4);
          expect(g.n / g.len, `${name} ${road.id} side ${side}`).toBeGreaterThan(0.5 / LAMPS.every);
        }
      }
    });

    it(`${mode}: divided arterials get kerb lamps outside, median lights only in a real median`, { timeout: 180_000 }, () => {
      const store = new ChunkStore(net, mode, 7), wd = world(store);
      const carriageways = wd.roads.filter((c) => !c.r.bridge);
      for (const name of ['Acharya Prafulla Chandra Bose Road', 'Eastern Metropolitan Bypass', 'Salt Lake Bypass']) {
        for (const { road, p, lamps } of lampsAlong(store, name, 'primary')) {
          const g = worstGap(wd, road, p, lamps, 1);
          // In timed, true-size landmarks crowd the squeezed Bypass kerb (AUDIT.md issue 11: Mani Square at 14 u).
          if (g.len >= 80) expect(g.gap, `${name} ${road.id} outer kerb (${g.n} lamps over ${g.len.toFixed(0)} u)`).toBeLessThanOrEqual(LAMPS.every * 5);
          // A median light never stands in a lane: where the two carriageways touch (AUDIT.md issue 6) there is none.
          for (const l of lamps.filter((q) => q.v === LampKind.median)) {
            for (const c of carriageways) expect(project(c.p, l.x, l.z).d, `${name}: median light at (${l.x.toFixed(0)}, ${l.z.toFixed(0)}) in ${c.r.id}`).toBeGreaterThan(c.r.w / 2);
          }
        }
      }
    });
  }

  it('the named junctions get a high mast', () => {
    const store = new ChunkStore(net, 'free', 7);
    for (const id of LAMPS.masts) {
      const l = net.landmarks.find((q) => q.id === id)!;
      expect(l, id).toBeTruthy();
      const [x, z] = store.warp.toGame([l.x, l.z]);
      store.update(x, z, () => true);
      const masts = [...store.loaded()].flatMap((c) => c.props).filter((q) => q.kind === 'lamp' && q.v === LampKind.mast && Math.hypot(q.x - x, q.z - z) <= LAMPS.mastRing[1]);
      expect(masts.length, id).toBe(1);
    }
  });

  it('a pool lands in front of its lamp, the mast pool on the junction', () => {
    const kerb = lampPool({ kind: 'lamp', x: 10, z: 0, rot: Math.atan2(-1, 0), v: LampKind.trident });
    expect(kerb[0]).toBeLessThan(10);
    expect(kerb[1]).toBeCloseTo(0);
    expect(kerb[2]).toBe(LAMPS.pool.trident[0]);
    const mast = lampPool({ kind: 'lamp', x: 0, z: 20, rot: Math.atan2(0, -20), v: LampKind.mast, len: 20 });
    expect(mast[1]).toBeLessThan(20);
    expect(mast[2]).toBe(LAMPS.pool.mast[0]);
  });
});
