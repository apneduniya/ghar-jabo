import { describe, expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import type { MapData } from './mapdata';
import { BuildingGrid } from './collide';
import { Crowd } from './crowd';
import { Rng } from './rng';
import { CROWD } from '../content/tuning';

const map = mapJson as unknown as MapData;
const grid = new BuildingGrid(map.buildings.map((b) => b.p));
const FAR = 1e6; // the player, nowhere near

describe('crowd pace and pauses (task 025)', () => {
  it('walk at varied paces within the tuned ranges', () => {
    const c = new Crowd(map, grid, new Rng(3), 110);
    const paces = c.walkers.map((w) => w.pace);
    expect(Math.min(...paces)).toBeGreaterThanOrEqual(CROWD.speed[0]);
    expect(Math.max(...paces)).toBeLessThanOrEqual(CROWD.hurrySpeed[1]);
    expect(Math.max(...paces) - Math.min(...paces)).toBeGreaterThan(0.8);
    expect(paces.some((p) => p > CROWD.speed[1])).toBe(true); // someone's in a hurry
  });

  it('report their real ground speed, and stop now and then', () => {
    const c = new Crowd(map, grid, new Rng(3), 30);
    const rng = new Rng(9), dt = 1 / 30, N = 30 * 40;
    let paused = 0, worstV = 0, over = 0;
    const seen = new Set<string>();
    for (let s = 0; s < N; s++) {
      const before = c.walkers.map((w) => [w.x, w.z]);
      c.update(dt, FAR, FAR, 0, rng);
      c.walkers.forEach((w, i) => {
        worstV = Math.max(worstV, Math.abs(w.v - Math.hypot(w.x - before[i][0], w.z - before[i][1]) / dt));
        over = Math.max(over, w.v - w.pace);
        if (w.pause > 0) { paused++; seen.add(w.idle); }
      });
    }
    expect(worstV).toBeLessThan(1e-6);
    expect(over).toBeLessThan(1e-6);
    // Over 40 s most people pause once or twice for a few seconds: some share of the time, not most of it.
    const share = paused / (N * c.walkers.length);
    expect(share).toBeGreaterThan(0.05);
    expect(share).toBeLessThan(0.4);
    expect(seen).toEqual(new Set(['phone', 'look']));
  });
});
