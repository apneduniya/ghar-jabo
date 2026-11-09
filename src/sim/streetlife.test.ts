import { describe, expect, it } from 'vitest';
import map from '../content/maps/sectorv.json';
import { FURNITURE, ROWS, STREETS, type RowSpec } from '../content/streetlife';
import type { MapData, Road } from './mapdata';
import { clearance, footprintClear, frameAt, kerbOffset, medians, placeRow, placeSpot, project, sideNormal } from './streetlife';

const m = map as unknown as MapData;

describe('street frames', () => {
  const line: [number, number][] = [[0, 0], [10, 0], [10, 10]];
  it('walks metres along the line (0.5 units per metre)', () => {
    expect(frameAt(line, 10)).toMatchObject({ x: 5, z: 0, dx: 1, dz: 0 });
    expect(frameAt(line, 30)).toMatchObject({ x: 10, z: 5, dx: 0, dz: 1 });
  });
  it('projects a point back to metres and a signed side', () => {
    const p = project(line, 4, -2);
    expect(p.m).toBeCloseTo(8);
    expect(p.lat).toBeCloseTo(2); // left of travel (east-bound: north is left)
  });
  it('picks the normal on the requested compass side', () => {
    const f = frameAt(line, 4);
    expect(sideNormal(f, 'N')).toEqual([0, -1]);
    expect(sideNormal(f, 'S')).toEqual([-0, 1]);
  });
});

describe('hawker rows on a synthetic street', () => {
  // A divided road along +x: two one-way carriageways 7 wide, 6 apart; a driveway crosses the south side at x = 40.
  const roads: Road[] = [
    { n: 'A', k: 'secondary', w: 7, b: 0, o: 1, p: [[-50, -3], [150, -3]] },
    { n: 'A', k: 'secondary', w: 7, b: 0, o: 1, p: [[150, 3], [-50, 3]] },
    { n: '', k: 'service', w: 3, b: 0, o: 0, p: [[40, 3], [40, 30]] },
  ];
  const line: [number, number][] = [[0, 0], [150, 0]];
  const row: RowSpec = { street: 'st2', from: 0, to: 200, side: 'S', kind: 'tin', gaps: [[120, 140]] };
  const units = placeRow(roads, line, row);

  it('stands on the requested side, behind the kerb and the footpath', () => {
    expect(units.length).toBeGreaterThan(15);
    const kerb = kerbOffset(roads, frameAt(line, 50), [0, 1]);
    expect(kerb).toBeCloseTo(6.5, 0);
    for (const u of units) {
      expect(u.z).toBeGreaterThan(kerb + 2.5);
      expect(footprintClear(roads, u)).toBe(true);
      // Faces the road: local +z points north, back at the kerb.
      expect(Math.cos(u.rot)).toBeLessThan(-0.99);
    }
  });

  it('leaves the driveway and the surveyed gap open', () => {
    expect(units.some((u) => Math.abs(u.x - 40) < 3)).toBe(false);
    expect(units.some((u) => u.m > 121 && u.m < 139)).toBe(false);
  });
});

describe('the surveyed rows on the real map', () => {
  it('every stall stays off every carriageway and driveway', () => {
    for (const row of ROWS) for (const u of placeRow(m.roads, STREETS[row.street], row)) {
      expect(footprintClear(m.roads, u), `${row.street} ${row.kind} @${u.m.toFixed(0)} m`).toBe(true);
    }
  });

  it('the Street 2 row is on the east side, opposite TIU, about 150 m long', () => {
    const units = placeRow(m.roads, STREETS.st2, ROWS[0]);
    const tiu = m.pois.tiu;
    expect(units.length).toBeGreaterThan(14);
    for (const u of units) {
      const p = project(STREETS.st2, u.x, u.z);
      expect(Math.sign(p.lat)).toBe(Math.sign(project(STREETS.st2, tiu[0] + 60, tiu[1]).lat)); // east of the median
      expect(u.x).toBeGreaterThan(tiu[0]);
    }
    const span = Math.max(...units.map((u) => u.m)) - Math.min(...units.map((u) => u.m));
    expect(span).toBeGreaterThan(130);
  });

  it('Street 13 rows: south of the road going east, north-east of it going to Wipro More', () => {
    const east = placeRow(m.roads, STREETS.st13e, ROWS[1]);
    for (const u of east) expect(project(STREETS.st13e, u.x, u.z).lat).toBeLessThan(0); // right of travel = south
    const west = ROWS.filter((r) => r.street === 'st13w').flatMap((r) => placeRow(m.roads, STREETS.st13w, r));
    expect(west.length).toBeGreaterThan(8);
    for (const u of west) expect(project(STREETS.st13w, u.x, u.z).lat).toBeLessThan(0); // NW-bound: right = NE
  });

  it('furniture on the kerb or behind it is off the carriageway; median furniture is between the carriageways', () => {
    for (const s of FURNITURE) {
      const p = placeSpot(m.roads, STREETS[s.street], s);
      if (s.where === 'median') expect(project(STREETS[s.street], p.x, p.z).d, s.kind).toBeLessThan(1.5);
      else expect(clearance(m.roads, p.x, p.z), `${s.kind} on ${s.street}`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('medians', () => {
  it('finds the strip between paired one-way ways, with a gap where a road crosses', () => {
    const roads: Road[] = [
      { n: 'A', k: 'secondary', w: 7, b: 0, o: 1, p: [[-50, -3], [50, -3]] },
      { n: 'A', k: 'secondary', w: 7, b: 0, o: 1, p: [[50, 3], [-50, 3]] },
      { n: 'B', k: 'secondary', w: 7, b: 0, o: 0, p: [[0, -40], [0, 40]] },
    ];
    const pieces = medians(roads);
    expect(pieces.length).toBeGreaterThan(20);
    for (const p of pieces) expect(Math.abs(p.z)).toBeLessThan(0.01);
    expect(pieces.some((p) => Math.abs(p.x) < 4)).toBe(false);
  });

  it('runs down the real Street 13 and Street 2', () => {
    const pieces = medians(m.roads);
    const on = (id: keyof typeof STREETS) => pieces.filter((p) => project(STREETS[id], p.x, p.z).d < 1).length;
    expect(on('st13e')).toBeGreaterThan(50);
    expect(on('st2')).toBeGreaterThan(20);
    expect(on('st13w')).toBeGreaterThan(30);
  });
});
