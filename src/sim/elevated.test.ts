import { describe, expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import { north } from '../content/sectorv';
import { at, deckY, flyoverDecks, gateADoor, greenLine, inBox, isFlyover, local, nearest, onCarriageway, orangeLine, pierSpots, roofs, stations } from './elevated';
import type { MapData } from './mapdata';

const map = mapJson as unknown as MapData;

describe('Nabadiganta flyover', () => {
  const decks = flyoverDecks(map.roads);

  it('is two separate decks, one per direction, with daylight between them', () => {
    expect(decks.length).toBe(2);
    expect(decks.filter((d) => d.ne).length).toBe(1);
    const [a, b] = decks;
    // Over Wipro More and along the service road, the deck centres are a deck width plus the gap apart.
    for (const [x, z] of [[-150, -125], [-110, -150], [-200, -90]] as const) {
      const pa = nearest(a.p, x, z), pb = nearest(b.p, pa.x, pa.z);
      expect(pb.d).toBeGreaterThanOrEqual(north.deckW + north.deckGap - 0.3);
    }
  });

  it('passes over Street 13 at full height and the NE-bound deck lands at grade before the station', () => {
    const ne = decks.find((d) => d.ne)!, sw = decks.find((d) => !d.ne)!;
    for (const d of decks) {
      const m = nearest(d.p, -150, -125);
      let best = 0, bd = Infinity;
      d.p.forEach((p, i) => { const k = Math.hypot(p[0] - m.x, p[1] - m.z); if (k < bd) { bd = k; best = i; } });
      expect(deckY(d, d.d[best])).toBeCloseTo(north.flyoverH, 1);
    }
    expect(deckY(ne, ne.total - 5)).toBe(0); // Gate A side: at grade
    expect(deckY(ne, ne.total - north.landing - north.rampLong / 2)).toBeGreaterThan(1); // on the retaining wall
    expect(deckY(sw, 0)).toBe(0);
    expect(isFlyover(ne.road) && isFlyover(sw.road)).toBe(true);
  });

  it('keeps the camera under the decks and the stations', () => {
    const roof = roofs(map.roads);
    const ne = decks.find((d) => d.ne)!, i = Math.floor(ne.p.length / 2);
    expect(roof(ne.p[i][0], ne.p[i][1])).toBeLessThan(north.flyoverH);
    const { sv, it, gate } = stations();
    for (const b of [sv, it, gate]) expect(roof(b.c[0], b.c[1])).toBe(north.stationUnderside);
    expect(roof(0, 0)).toBeUndefined(); // PwC More: open sky
  });
});

describe('metro', () => {
  it('puts the two stations side by side, Sector V on the canal side, without overlapping', () => {
    const { sv, it } = stations();
    for (let s = -sv.half; s <= sv.half; s += 2) for (let t = sv.n0; t <= sv.n1; t += 2) {
      const [x, z] = at(sv, s, t);
      expect(inBox(it, x, z)).toBe(false);
    }
    const [, t] = local(sv, it.c[0], it.c[1]);
    expect(t).toBeLessThan(sv.n0); // IT Centre is south-east of Sector V, across the road
    // Sector V reaches across the canal to Chavipatty Rd: Gate B is inside its footprint.
    expect(inBox(sv, north.gateB[0], north.gateB[1])).toBe(true);
  });

  it('runs the Green Line from the terminus SW to Wipro More, then NW along 3rd Ave', () => {
    const g = greenLine(map.rails);
    const { sv } = stations();
    expect(inBox(sv, g[0][0], g[0][1], 2)).toBe(true);
    expect(nearest(g, -100, -163).d).toBeLessThan(4); // in the strip beside the service road
    expect(nearest(g, -205, -194).d).toBeLessThan(4); // over 3rd Ave
  });

  it('never stands a pier on a carriageway, and spaces them about 30 m apart', () => {
    const g = greenLine(map.rails);
    const { sv } = stations();
    const piers = pierSpots(g, north.greenPierStep, map.roads, 0.4, (x, z) => inBox(sv, x, z, 1));
    expect(piers.length).toBeGreaterThan(15);
    for (const p of piers) expect(onCarriageway(map.roads, p.cx, p.cz, 0.4)).toBe(false);
    for (let i = 1; i < piers.length; i++) expect(piers[i].d - piers[i - 1].d).toBeGreaterThanOrEqual(north.greenPierStep);
  });

  it('lays the Orange Line along the Biswa Bangla Sarani median beyond IT Centre', () => {
    const o = orangeLine(map.roads, stations().it);
    const mid = o[Math.floor(o.length * 0.6)];
    const prim = map.roads.filter((r) => r.k === 'primary' && r.o && !r.b);
    const d = prim.map((r) => nearest(r.p, mid[0], mid[1]).d).sort((a, b) => a - b);
    expect(Math.abs(d[0] - d[1])).toBeLessThan(2.5); // halfway between the two carriageways
  });

  it('puts the street entrance in the real Gate A doorway, on the station side of the service road', () => {
    const g = gateADoor();
    expect(Math.hypot(g[0] - north.gateA.real[0], g[1] - north.gateA.real[1])).toBeLessThan(2);
    expect(onCarriageway(map.roads, g[0], g[1])).toBe(false);
    // The service road: the nearest at-grade road. The door is on its north-west side (+t, the station's side);
    // OSM's node, where the entrance used to be pushed to, is on the other side.
    const { sv } = stations();
    let best: ReturnType<typeof nearest> | null = null;
    for (const r of map.roads) if (!r.b) { const m = nearest(r.p, g[0], g[1]); if (!best || m.d < best.d) best = m; }
    const side = (p: [number, number]) => local(sv, p[0], p[1])[1] - local(sv, best!.x, best!.z)[1];
    expect(side(g)).toBeGreaterThan(0);
    expect(side(north.gateAOsm)).toBeLessThan(0);
  });
});
