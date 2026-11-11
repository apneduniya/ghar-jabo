// Sector V station's two street entrances (task 032): Gate A on the service road at its real width, and Gate B on
// Chavipatty Rd.
import { describe, expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import { T } from '../content/tuning';
import { north } from '../content/sectorv';
import { at, gateADoor, gateBDoor, local, nearest, onCarriageway, stations } from './elevated';
import { clipMap } from './gen/clip';
import type { MapData, Pt } from './mapdata';
import { NO_INTENT } from './player';
import { Rng } from './rng';
import { Run } from './run';
import { World } from './world';

const map = clipMap(mapJson as unknown as MapData);
const R = T.player.radius;
const { sv } = stations();

function makeWorld() {
  const run = new Run('timed');
  run.clockRunning = true;
  return new World(map, run, new Rng(5), { x: map.pois.tiu[0], z: map.pois.tiu[1] }, null);
}

/** The at-grade road nearest a point, with the nearest point on it. */
function nearestRoad(p: Pt) {
  let best: { road: MapData['roads'][number]; m: ReturnType<typeof nearest> } | null = null;
  for (const road of map.roads) if (!road.b) { const m = nearest(road.p, p[0], p[1]); if (!best || m.d < best.m.d) best = { road, m }; }
  return best!;
}

/** Flood fill on a 0.5 u grid with the player's radius, from `a` until within `r` of `b` (or `limit` cells). */
function reachable(w: World, a: Pt, b: Pt, r = 1, limit = 200_000) {
  const C = 0.5, key = (i: number, j: number) => `${i},${j}`;
  const start: Pt = [Math.round(a[0] / C), Math.round(a[1] / C)], seen = new Set([key(...start)]), q: Pt[] = [start];
  for (let n = 0; n < q.length && n < limit; n++) {
    const [i, j] = q[n];
    if (Math.hypot(i * C - b[0], j * C - b[1]) < r) return true;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = key(i + di, j + dj);
      if (seen.has(k) || w.walkBlocked((i + di) * C, (j + dj) * C, R)) continue;
      seen.add(k);
      q.push([i + di, j + dj]);
    }
  }
  return false;
}

/** Walk the player through `pts` (world points); true if the metro opened on the way. */
function walkThrough(w: World, pts: Pt[]) {
  const p = w.player;
  let into = false;
  for (const [gx, gz] of pts)
    for (let i = 0; i < 400 && p.state === 'foot' && Math.hypot(gx - p.x, gz - p.z) > 0.3; i++) {
      const L = Math.hypot(gx - p.x, gz - p.z);
      w.step({ ...NO_INTENT, moveX: (gx - p.x) / L, moveZ: (gz - p.z) / L });
      if (w.events.drain().some((ev) => ev.type === 'stage' && ev.to === 'station')) into = true;
    }
  return into;
}

describe('Gate A on the service road', () => {
  it('the service road under the station is one lane plus an auto kerb lane (7-8 m), not 18 m', () => {
    const { road, m } = nearestRoad(gateADoor());
    expect(road.w).toBeGreaterThanOrEqual(3.5);
    expect(road.w).toBeLessThanOrEqual(4);
    // Its NW kerb is the content's kerb line, where the real one is (just short of the door).
    const kerb = local(sv, m.x, m.z)[1] + road.w / 2;
    expect(Math.abs(kerb - north.gateA.kerb)).toBeLessThan(0.3);
  });

  it('the door, forecourt railing and pillar stand on the kerb line, at the real door', () => {
    const A = north.gateA, door = gateADoor();
    expect(Math.hypot(door[0] - A.real[0], door[1] - A.real[1])).toBeLessThan(1);
    expect(A.rail).toBeGreaterThan(A.kerb);
    expect(A.pillar[1] - 0.25).toBeGreaterThan(A.kerb);
    expect(A.face - A.kerb).toBeLessThan(3); // a narrow forecourt, as on Street View
    expect(onCarriageway(map.roads, door[0], door[1])).toBe(false);
    for (const t of [A.rail, A.pillar[1], A.face]) {
      const [x, z] = at(sv, A.door, t);
      expect(onCarriageway(map.roads, x, z), `t ${t}`).toBe(false);
    }
    // The autos queue in the kerb lane, on the carriageway (traffic moves out round them: structures.test.ts).
    const [x, z] = at(sv, A.autos[0], A.autos[3]);
    expect(onCarriageway(map.roads, x, z)).toBe(true);
  });

  it('turned away at a shut metro, you step back onto the forecourt, out of the doorway', () => {
    const w = makeWorld(), p = w.player;
    w.run.minute = 23 * 60;
    expect(w.run.metroOpen).toBe(false);
    [p.x, p.z] = gateADoor();
    w.step(NO_INTENT);
    expect(w.events.drain().some((e) => e.type === 'toast')).toBe(true);
    expect(w.walkBlocked(p.x, p.z, R)).toBe(false);
    expect(Math.hypot(p.x - w.metroEntrance.x, p.z - w.metroEntrance.z)).toBeGreaterThan(2.5);
  });
});

describe('Gate B on Chavipatty Rd', () => {
  const B = north.gateB;

  it('is in the station NW face by the real door, off the carriageway, with Chavipatty Rd in front', () => {
    const door = gateBDoor();
    expect(Math.hypot(door[0] - B.real[0], door[1] - B.real[1])).toBeLessThan(4);
    expect(onCarriageway(map.roads, door[0], door[1], 1)).toBe(false);
    const { road } = nearestRoad(at(sv, B.door, B.ramp[2] + 1));
    expect(road.k).toBe('tertiary'); // Chavipatty Rd (OSM's Canal Side Road way)
    // The ramp's rail stands off the road.
    for (const s of [B.ramp[0], B.ramp[1]]) expect(onCarriageway(map.roads, ...at(sv, s, B.ramp[2] + 0.1))).toBe(false);
  });

  it('opens the metro: reachable on foot from Chavipatty Rd, and walking into the doorway takes you in', () => {
    const w = makeWorld();
    expect(w.metroEntrances).toHaveLength(2);
    const e = w.metroEntrances[1], door = gateBDoor();
    expect(Math.hypot(e.x - door[0], e.z - door[1])).toBeLessThan(1);
    // From the road NE of the ramp (around its open end) and from the road SW of the station.
    for (const s of [25, -15]) {
      const { m } = nearestRoad(at(sv, s, 20.3));
      expect(reachable(w, [m.x, m.z], [e.x, e.z]), `s ${s}`).toBe(true);
    }
    // In off the footpath straight to the door.
    const p = w.player;
    [p.x, p.z] = at(sv, B.door, B.ramp[2] + 0.8);
    expect(w.walkBlocked(p.x, p.z, R)).toBe(false);
    expect(w.run.metroOpen).toBe(true);
    expect(walkThrough(w, [at(sv, B.door, B.face - B.recess + 0.4)])).toBe(true);
    expect(p.state).toBe('gone');
  });

  it('turned away, you step back out onto the road side, clear of the ramp', () => {
    const w = makeWorld(), p = w.player;
    w.run.minute = 23 * 60;
    [p.x, p.z] = gateBDoor();
    w.step(NO_INTENT);
    expect(w.events.drain().some((e) => e.type === 'toast')).toBe(true);
    expect(w.walkBlocked(p.x, p.z, R)).toBe(false);
    expect(Math.hypot(p.x - w.metroEntrances[1].x, p.z - w.metroEntrances[1].z)).toBeGreaterThan(2.5);
  });
});
