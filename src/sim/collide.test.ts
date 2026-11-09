import { describe, expect, it } from 'vitest';
import { WaterMask, type Pt } from './collide';
import map from '../../public/data/sectorv.json';
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

describe('WaterMask on the real map', () => {
  const m = map as unknown as MapData;
  const real = new WaterMask(m.water ?? [], m.roads);
  const decks = m.roads.filter((r) => r.b && r.n === 'Street Number 13');

  it('blocks the middle of the canal away from the bridges', () => {
    // Canal centre points (from the two banks of w153755336), well clear of Street 13.
    for (const [x, z] of [[-230, -88], [-300, -45], [-90, -178], [3, -239], [110, -310]] as Pt[]) {
      expect(real.onBridge(x, z)).toBe(false);
      expect(real.blocked(x, z), `${x},${z}`).toBe(true);
    }
  });

  it('lets you walk the whole length of both Street 13 bridge decks', () => {
    expect(decks.length).toBeGreaterThanOrEqual(2);
    for (const r of decks) for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      for (let t = 0; t <= 1; t += 0.05) expect(real.blocked(ax + (bx - ax) * t, az + (bz - az) * t)).toBe(false);
    }
  });

  it('closes the pinch beside the bridge: the canal is at least 11 m wide there', () => {
    // OSM squeezes the canal to 2-6 m just east of the bridges (banks snapped to the deck). Across a line of
    // centre points through that pinch, a 5.6-unit band (11 m) perpendicular to the canal must all be water.
    const n = [0.545, 0.838]; // across the canal (it runs about ENE here)
    for (const [x, z] of [[-143, -143], [-139, -144.5], [-135, -146.5], [-132.5, -150]] as Pt[]) {
      for (let s = -2.8; s <= 2.8; s += 0.7) expect(real.blocked(x + n[0] * s, z + n[1] * s), `${x},${z} +${s}`).toBe(true);
    }
  });

  it('a straight walk across the canal at the pinch is stopped', () => {
    let hit = false;
    for (let s = -15; s <= 15 && !hit; s += 0.2) hit = real.blocked(-138 + 0.545 * s, -145 + 0.838 * s);
    expect(hit).toBe(true);
  });
});
