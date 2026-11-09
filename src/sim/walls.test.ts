import { describe, expect, it } from 'vitest';
import map from '../content/maps/sectorv.json';
import { FOOTPATH, STREETS } from '../content/streetlife';
import { BuildingGrid } from './collide';
import type { MapData, Road } from './mapdata';
import { layoutStreet } from './streetlayout';
import { clearance, frameAt, kerbOffset, sideNormal } from './streetlife';
import { compoundWalls, rectEdges, SegmentGrid, type KeepOut } from './walls';

const roads: Road[] = [
  // A road along z = 0 (the plot's north edge is drawn on its centre line, as OSM often does) ...
  { n: 'A', k: 'secondary', w: 7, b: 0, o: 0, p: [[-80, 0], [80, 0]] },
  // ... a side road crossing the plot's west edge, and a driveway into it from the north.
  { n: 'B', k: 'tertiary', w: 5, b: 0, o: 0, p: [[-80, 25], [-20, 25]] },
  { n: '', k: 'service', w: 3, b: 0, o: 0, p: [[10, 0], [10, 12]] },
];
const plot: [number, number][] = [[-40, 0], [40, 0], [40, 50], [-40, 50]];
const base = { roads, rails: [], stations: [], stops: [], buildings: [], busPath: [], pois: {}, compounds: [{ t: 'commercial', p: plot }] } as unknown as MapData;

describe('compound walls', () => {
  const gate: [number, number] = [-20, 0];
  const walls = compoundWalls({ ...base, gates: [{ p: gate, k: 'gate' }] }, null);

  it('are pushed into the plot, clear of the carriageway and the footpath', () => {
    const north = walls.filter((w) => w.az < 20 && w.bz < 20 && Math.abs(w.ax - w.bx) > 1);
    expect(north.length).toBeGreaterThan(10);
    for (const w of north) {
      expect(clearance(roads, (w.ax + w.bx) / 2, (w.az + w.bz) / 2)).toBeGreaterThanOrEqual(FOOTPATH);
      expect(w.nz).toBeLessThan(-0.99); // outward faces the road (north)
    }
  });

  it('leave openings at gates, driveways and where a road crosses the ring', () => {
    const near = (x: number, z: number, r: number) => walls.some((w) => Math.hypot((w.ax + w.bx) / 2 - x, (w.az + w.bz) / 2 - z) < r);
    expect(near(-20, 6.3, 2)).toBe(false); // gate
    expect(near(10, 6.3, 2)).toBe(false); // driveway
    expect(near(-40, 25, 3)).toBe(false); // side road through the west edge
    expect(near(-40, 34, 3)).toBe(true); // the rest of the west edge is walled
  });

  it('stand behind a stall row instead of through it', () => {
    const stall: KeepOut = { x: 30, z: 8, dx: 1, dz: 0, nx: 0, nz: 1, w: 8, d: 3 };
    const w2 = compoundWalls(base, null, [], [stall]);
    const behind = w2.filter((w) => Math.abs((w.ax + w.bx) / 2 - 30) < 3 && w.az < 20);
    expect(behind.length).toBeGreaterThan(0);
    for (const w of behind) expect(Math.min(w.az, w.bz)).toBeGreaterThan(9.5);
  });

  it('skip pieces that a building already fills', () => {
    const grid = new BuildingGrid([[[-10, 3], [0, 3], [0, 20], [-10, 20]]]);
    const w3 = compoundWalls(base, grid);
    expect(w3.some((w) => (w.ax + w.bx) / 2 > -10 && (w.ax + w.bx) / 2 < 0 && w.az < 10)).toBe(false);
  });
});

describe('segment collision', () => {
  it('blocks a body touching a wall and lets it through an opening', () => {
    const g = new SegmentGrid([{ ax: 0, az: 0, bx: 10, bz: 0 }, { ax: 14, az: 0, bx: 24, bz: 0 }]);
    expect(g.blocked(5, 0.3)).toBe(true);
    expect(g.blocked(5, 1)).toBe(false);
    expect(g.blocked(12, 0)).toBe(false); // the gap
  });

  it('turns a stall footprint into four edges', () => {
    const e = rectEdges({ x: 0, z: 0, dx: 1, dz: 0, nx: 0, nz: 1, w: 4, d: 2 });
    expect(e).toHaveLength(4);
    expect(new SegmentGrid(e).blocked(0, 1)).toBe(true);
  });
});

describe('the real map', () => {
  const m = map as unknown as MapData;
  const grid = new BuildingGrid(m.buildings.map((b) => b.p));
  const s = layoutStreet(m, grid);

  it('walls the compounds near the centre, with every piece off the carriageway', () => {
    expect(s.walls.length).toBeGreaterThan(200);
    for (const w of s.walls) expect(clearance(m.roads, (w.ax + w.bx) / 2, (w.az + w.bz) / 2)).toBeGreaterThan(FOOTPATH);
  });

  it('PwC gets its white wall, TIU its railing', () => {
    expect(s.walls.some((w) => w.style === 'pwc')).toBe(true);
    expect(s.walls.some((w) => w.style === 'tiu')).toBe(true);
  });

  it('the footpath at the start and the roads stay walkable', () => {
    // Street 2 west footpath outside TIU (the start), and the middle of Street 13.
    for (const at of [60, 100, 140]) {
      const f = frameAt(STREETS.st2, at), n = sideNormal(f, 'W'), k = kerbOffset(m.roads, f, n) + FOOTPATH / 2;
      expect(s.blocks.blocked(f.x + n[0] * k, f.z + n[1] * k, 0.35)).toBe(false);
    }
    expect(s.blocks.blocked(100, 60, 0.35)).toBe(false);
  });
});
