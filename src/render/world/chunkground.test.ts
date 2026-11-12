import { describe, expect, it } from 'vitest';
import { GeoBuf } from './chunkgeo';
import { markings } from './chunkground';
import type { GenRoad } from '../../sim/gen/types';

const road = (p: [number, number][], w = 8): GenRoad => ({ p, w, cls: 'primary', real: true });
const dashes = (r: GenRoad, all: GenRoad[]) => { const b = new GeoBuf(); markings(b, r, 0.02, all); return b.vertices / 4; };

describe('centre-line dashes', () => {
  const main = road([[0, 0], [100, 0]]);
  it('stop where another carriageway crosses (junctions, squeezed carriageways meeting at an angle)', () => {
    const alone = dashes(main, [main]);
    const cross = road([[50, -40], [50, 40]], 10);
    const withCross = dashes(main, [main, cross]);
    expect(withCross).toBeLessThan(alone);
    expect(alone - withCross).toBeLessThanOrEqual(4); // only the junction box, about 10 u of a 5 u pitch plus ends
  });
  it('carry on across a continuation of the same road and under a flyover deck', () => {
    const next = road([[100, 0], [200, 0]]);
    const deck: GenRoad = { ...road([[50, -40], [50, 40]], 10), bridge: 'flyover' };
    expect(dashes(main, [main, next, deck])).toBe(dashes(main, [main]));
  });
});
