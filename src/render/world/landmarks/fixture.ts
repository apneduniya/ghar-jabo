// Dev fixture for task 020 landmarks, until G's generator and world.json land: a stand-in warp and empty chunks.
// The WorldNet itself is public/dev/landmarks-fixture.json (tools/landmarks-fixture.py, real positions from
// research/routes/corridors.json and OSM). Used by the unit tests and the ?landmarks=1 debug view only.

import { CHUNK, type Chunk, type PlayMode, type Pt, type Warp, type WorldNet } from '../../../sim/gen/types';
import { SECTOR_V_HALF } from '../../../content/landmarks';

/** Identity inside the Sector V square; timed squeezes everything outside it 3x toward it (radially, by the
 *  square's own metric). Free roam is the identity. G's real warp is piecewise; this is enough to test with. */
export function fixtureWarp(mode: PlayMode, squeeze = 3): Warp {
  const H = SECTOR_V_HALF;
  const scale = (p: Pt, f: (s: number) => number): Pt => {
    const s = Math.max(Math.abs(p[0]), Math.abs(p[1]));
    if (mode === 'free' || s <= H) return [p[0], p[1]];
    const k = f(s) / s;
    return [p[0] * k, p[1] * k];
  };
  return {
    mode,
    toGame: (p) => scale(p, (s) => H + (s - H) / squeeze),
    toReal: (p) => scale(p, (s) => H + (s - H) * squeeze),
  };
}

/** An empty chunk (no generated roads, buildings or props) with the landmark ids whose warped position is in it. */
export function fixtureChunk(net: WorldNet, warp: Warp, cx: number, cz: number): Chunk {
  const landmarks = net.landmarks.filter((l) => {
    const [x, z] = warp.toGame([l.x, l.z]);
    return Math.floor(x / CHUNK) === cx && Math.floor(z / CHUNK) === cz;
  }).map((l) => l.id);
  return { cx, cz, x0: cx * CHUNK, z0: cz * CHUNK, area: 'generic', roads: [], buildings: [], props: [], landmarks, blockers: [] };
}

export async function loadFixture(): Promise<WorldNet> {
  const r = await fetch(`${import.meta.env.BASE_URL}dev/landmarks-fixture.json`);
  return (await r.json()) as WorldNet;
}
