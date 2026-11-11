// Nothing in the streamed world stands where traffic can't get past it (structureConflicts), except what the timed
// squeeze can't make room for, listed here with the reason.
import { describe, expect, it } from 'vitest';
import worldJson from '../../../public/data/world.json';
import { metroLayout } from './layout';
import { sample } from './lines';
import { loadNet } from './net';
import { allSolids, structureConflicts } from './solids';
import { makeWarp } from './warp';

const net = loadNet(worldJson);

/**
 * Timed only, all within 40 of the Green Line's tunnel portal at Subhas Sarobar. Timed squeezes the Bypass ring
 * hardest: the stretch from Salt Lake Stadium to the portal, beside the Kadapara road (r13, 6 wide, two-way), shrinks
 * about 7x, and the rail line that crosses r13 about 20 m from the Bypass ends up a few units from it. True-width
 * structures can't fit there, so these stay walkable (left out of the collision) and the traffic is unaffected.
 */
const ALLOWED: { kinds: string[]; roads: string[]; max: number; why: string }[] = [
  {
    kinds: ['metro ramp', 'metro cut', 'tunnel portal'], roads: ['r13'], max: 9,
    why: 'the 7.5-wide cut and portal have no room beside the 6-wide Kadapara road; nowhere between the Stadium station and the OSM portal clears it',
  },
  {
    kinds: ['rail bridge abutment', 'rail embankment'], roads: ['Eastern Metropolitan Bypass', 'r13'], max: 3,
    why: 'the rail bridge over r13 stands a few units from the Bypass in timed: its abutments reach the Bypass and r13\'s bend',
  },
];

describe('structure conflicts', () => {
  it('free roam (true scale): nothing stands where traffic cannot pass', () => {
    expect(structureConflicts(net, makeWarp('free'))).toEqual([]);
  });

  it('timed: only the listed squeeze at Subhas Sarobar, and all of it walkable', () => {
    const warp = makeWarp('timed'), c = structureConflicts(net, warp);
    const mp = metroLayout(net, warp)[0], portal = sample(mp.l, mp.portals[0].s);
    for (const a of ALLOWED) {
      const hits = c.filter((x) => a.kinds.includes(x.kind) && a.roads.includes(x.road));
      expect(hits.length, a.why).toBeLessThanOrEqual(a.max);
    }
    const listed = (x: (typeof c)[number]) => ALLOWED.some((a) => a.kinds.includes(x.kind) && a.roads.includes(x.road));
    expect(c.filter((x) => !listed(x)).map((x) => `${x.kind} on ${x.road} at ${x.x.toFixed(0)},${x.z.toFixed(0)}`)).toEqual([]);
    for (const x of c) {
      expect(Math.hypot(x.x - portal.x, x.z - portal.z), `${x.kind} at ${x.x.toFixed(0)},${x.z.toFixed(0)}`).toBeLessThan(40);
      expect(x.kept, 'a conflict is left walkable').toBe(false);
    }
    // ...and left out of the collision, so it can't cut r13 off.
    const solids = allSolids(net, warp);
    for (const x of c) expect(solids.some((s) => s.x === x.x && s.z === x.z)).toBe(false);
  });
});
