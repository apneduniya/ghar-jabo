// The smoothed path: corners and sideways lane jumps become curves; the mean point never outruns the distance.
import { describe, expect, it } from 'vitest';
import type { Pt } from './mapdata';
import { Polyline, Track } from './polyline';

describe('smoothed paths', () => {
  // A right-angle corner, then a 2 u sideways lane jump (what per-edge lane offsets used to do at a node).
  const pts: Pt[] = [[0, 0], [20, 0], [20, 20], [22, 20], [22, 40]];
  const line = new Polyline(pts);

  it('moves continuously and never faster than the distance travelled', () => {
    let prev = line.smooth(0, 3);
    for (let s = 0.05; s <= line.length; s += 0.05) {
      const p = line.smooth(s, 3);
      expect(Math.hypot(p.x - prev.x, p.z - prev.z)).toBeLessThanOrEqual(0.05 + 1e-9);
      // The heading turns gradually: never a snap between two close samples.
      expect(Math.abs(Math.atan2(Math.sin(p.heading - prev.heading), Math.cos(p.heading - prev.heading)))).toBeLessThan(0.05);
      prev = p;
    }
  });

  it('cuts the corner a little, but stays on the straight away from it', () => {
    const mid = line.smooth(10, 3);
    expect(mid.x).toBeCloseTo(10, 6);
    expect(mid.z).toBeCloseTo(0, 6);
    const corner = line.smooth(20, 3);
    expect(Math.hypot(corner.x - 20, corner.z)).toBeGreaterThan(0.3);
    expect(Math.hypot(corner.x - 20, corner.z)).toBeLessThan(1.5);
  });

  it('a track keeps absolute distances as it is trimmed and cut', () => {
    const t = new Track();
    for (const p of pts) t.push(p);
    const before = t.smooth(30, 3);
    t.trim(25);
    expect(t.start).toBeLessThanOrEqual(25);
    expect(t.smooth(30, 3)).toEqual(before);
    t.cut(41);
    expect(t.end).toBeGreaterThanOrEqual(41);
    expect(t.end).toBeLessThan(line.length);
  });
});
