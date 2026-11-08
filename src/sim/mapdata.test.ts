// Invariants of the built map (tools/build-map.py -> src/content/maps/sectorv.json) and the Street View overrides.
import { describe, expect, it } from 'vitest';
import mapJson from '../content/maps/sectorv.json';
import overridesJson from '../../research/map/overrides.json';
import type { Building, MapData, Pt } from './mapdata';

const map = mapJson as unknown as MapData & { scale: number };
const overrides = overridesJson as unknown as { buildings: Record<string, { lv?: number; t?: string; colour?: string; label?: string; drop?: boolean; n?: string | null }> };
const HALF = 360; // the play square, |x| and |z| <= 720 m * 0.5
const STOREY = 3.3 * map.scale;

const centroid = (p: Pt[]): Pt => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];

describe('buildings', () => {
  it('every building has at least one storey and its height is storeys x 3.3 m x scale', () => {
    for (const b of map.buildings) {
      expect(b.lv).toBeGreaterThanOrEqual(1);
      expect(b.h).toBeCloseTo(b.lv! * STOREY, 1);
      expect(['office', 'block', 'college', 'resi', 'shop', 'low']).toContain(b.t);
      expect(['osm', 'sv', 'guess']).toContain(b.hs);
    }
  });

  it('keeps footprints whose centre is in the square, including ones that cross its edge', () => {
    // (the build uses the area centroid; the vertex mean here can differ by a few units)
    for (const b of map.buildings) for (const v of centroid(b.p)) expect(Math.abs(v)).toBeLessThanOrEqual(HALF + 8);
    expect(map.buildings.some((b) => b.p.some(([x, z]) => Math.abs(x) > HALF || Math.abs(z) > HALF))).toBe(true);
  });

  it('no unnamed, uncounted building is taller than the tallest named tower', () => {
    const named = Math.max(...map.buildings.filter((b) => b.n).map((b) => b.lv!));
    expect(named).toBeGreaterThanOrEqual(18); // Adventz Infinity
    for (const b of map.buildings.filter((b) => !b.n && b.hs !== 'sv')) expect(b.lv!).toBeLessThanOrEqual(named);
    // Guesses never invent towers: 9 storeys for anonymous blocks, 14 for named IT buildings.
    for (const b of map.buildings.filter((b) => b.hs === 'guess')) expect(b.lv!).toBeLessThanOrEqual(b.n ? 14 : 9);
  });

  it('applies every Street View override', () => {
    const byId = new Map<string, Building>(map.buildings.map((b) => [String(b.id), b]));
    for (const [id, o] of Object.entries(overrides.buildings)) {
      if (id.startsWith('_')) continue;
      const b = byId.get(id);
      if (o.drop) { expect(b).toBeUndefined(); continue; }
      expect(b, id).toBeDefined();
      if (o.lv !== undefined) expect(b!.lv, id).toBe(o.lv);
      if (o.t) expect(b!.t, id).toBe(o.t);
      if (o.colour) expect(b!.colour, id).toBe(o.colour);
      if (o.label) expect(b!.label, id).toBe(o.label);
      if (o.n === null) expect(b!.n, id).toBeUndefined();
    }
  });

  it('puts the peach tower on the SW corner of PwC More and keeps PwC itself low', () => {
    const tower = map.buildings.find((b) => b.id === 'new:pwc-more-sw-tower')!;
    const [x, z] = centroid(tower.p);
    expect(x).toBeLessThan(0); // west of Street 2
    expect(z).toBeGreaterThan(0); // south of Street 13
    expect(tower.lv).toBeGreaterThan(Math.max(...map.buildings.filter((b) => b.id !== tower.id && Math.hypot(...centroid(b.p)) < 150).map((b) => b.lv!)));
    expect(map.buildings.find((b) => b.id === 134101085)!.lv).toBeLessThanOrEqual(3);
  });

  it('keeps the footprints added from Street View off the carriageways', () => {
    for (const b of map.buildings.filter((b) => String(b.id).startsWith('new:'))) {
      for (let i = 0; i < b.p.length; i++) {
        const [ax, az] = b.p[i], [bx, bz] = b.p[(i + 1) % b.p.length];
        for (let t = 0; t <= 1; t += 0.125) {
          const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
          for (const r of map.roads) {
            if (r.k === 'service' || r.b) continue;
            for (let j = 1; j < r.p.length; j++) {
              const [cx, cz] = r.p[j - 1], [dx, dz] = r.p[j];
              const ex = dx - cx, ez = dz - cz, L2 = ex * ex + ez * ez || 1;
              const s = Math.max(0, Math.min(1, ((x - cx) * ex + (z - cz) * ez) / L2));
              expect(Math.hypot(cx + ex * s - x, cz + ez * s - z), String(b.id)).toBeGreaterThan(r.w / 2);
            }
          }
        }
      }
    }
  });

  it('skips the metro station box (drawn with the viaduct) and has one entry per footprint', () => {
    expect(map.buildings.some((b) => b.n === 'Salt Lake Sector V')).toBe(false);
    const ids = new Set(map.buildings.map((b) => b.id));
    expect(ids.size).toBe(map.buildings.length);
  });
});

describe('water', () => {
  it('ships the canal clipped near the square, not the whole 8 km of it', () => {
    expect(map.water!.length).toBeGreaterThan(0);
    for (const ring of map.water!) for (const [x, z] of ring) {
      expect(Math.abs(x)).toBeLessThanOrEqual(HALF * 1.15 + 0.1);
      expect(Math.abs(z)).toBeLessThanOrEqual(HALF * 1.15 + 0.1);
    }
  });

  it('has no storage tank: Tank No 10 is not a pond', () => {
    const near = (ring: Pt[]) => ring.some(([x, z]) => Math.hypot(x + 276.7, z + 286.3) < 12);
    expect(map.water!.some(near)).toBe(false);
  });

  it('flags the Street 13 canal bridges', () => {
    expect(map.roads.filter((r) => r.b && r.n === 'Street Number 13').length).toBeGreaterThanOrEqual(2);
  });
});

describe('stops and points of interest', () => {
  it('includes the platform-only Techno India stop near PwC More, once', () => {
    const ti = map.stops.filter((s) => s.n === 'Techno India');
    expect(ti.length).toBe(1);
    expect(Math.hypot(ti[0].p[0], ti[0].p[1] - 9.6)).toBeLessThan(10);
  });

  it('dedupes stops of the same name within 30 m', () => {
    for (const a of map.stops) for (const b of map.stops) {
      if (a === b || a.n !== b.n) continue;
      expect(Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1])).toBeGreaterThanOrEqual(15);
    }
  });

  it('keeps stops off the carriageway', () => {
    for (const s of map.stops) for (const r of map.roads) {
      if (r.k === 'service' || r.b) continue;
      for (let i = 1; i < r.p.length; i++) {
        const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
        const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((s.p[0] - ax) * dx + (s.p[1] - az) * dz) / L2));
        expect(Math.hypot(ax + dx * t - s.p[0], az + dz * t - s.p[1]), s.n).toBeGreaterThan(r.w / 2);
      }
    }
  });

  it('puts the burger joint on its OSM node and PwC on its corner', () => {
    expect(map.pois.burger).toEqual([71.6, 33.5]);
    expect(Math.hypot(map.pois.pwc[0], map.pois.pwc[1])).toBeLessThan(15);
  });

  it('exports lamps, compounds and gates for the street furniture', () => {
    expect(map.lamps!.length).toBeGreaterThan(50);
    expect(map.compounds!.some((c) => c.t === 'commercial')).toBe(true);
    expect(map.gates!.some((g) => g.a === 'private')).toBe(true);
  });
});
