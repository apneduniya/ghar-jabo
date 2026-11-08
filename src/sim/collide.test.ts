import { describe, expect, it } from 'vitest';
import { WaterMask, type Pt } from './collide';
import map from '../content/maps/sectorv.json';
import type { MapData } from './mapdata';

describe('WaterMask', () => {
  // A canal 10 units wide running north-south at x 0..10, with one bridge across it at z = 0.
  const canal: Pt[] = [[0, -100], [10, -100], [10, 100], [0, 100]];
  const bridge = { b: 1, w: 6, p: [[-20, 0], [30, 0]] as Pt[] };
  const road = { b: 0, w: 6, p: [[-20, 50], [30, 50]] as Pt[] };
  const mask = new WaterMask([canal], [bridge, road]);

  it('blocks the water and its edge', () => {
    expect(mask.blocked(5, 40)).toBe(true);
    expect(mask.blocked(-0.2, 40)).toBe(true);
    expect(mask.blocked(-3, 40)).toBe(false);
  });

  it('lets you cross on the bridge deck only', () => {
    expect(mask.blocked(5, 0)).toBe(false);
    expect(mask.blocked(5, 2)).toBe(false);
    expect(mask.blocked(5, 10)).toBe(true);
  });

  it('ignores ordinary roads: there is no walking across the water on a road without a bridge', () => {
    expect(mask.blocked(5, 50)).toBe(true);
  });

  it('the real Keshtopur canal blocks, its Street 13 bridge does not', () => {
    const m = map as unknown as MapData;
    const real = new WaterMask(m.water ?? [], m.roads);
    const deck = m.roads.find((r) => r.b && r.n === 'Street Number 13')!;
    const mid = deck.p[Math.floor(deck.p.length / 2)];
    expect(real.blocked(mid[0], mid[1])).toBe(false);
    // Some vertex of the canal outline, away from every bridge, is blocked.
    const ring = m.water![0];
    expect(ring.some(([x, z]) => !real.onBridge(x, z) && real.blocked(x, z))).toBe(true);
  });
});
