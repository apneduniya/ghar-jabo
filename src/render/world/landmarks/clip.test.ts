import netJson from '../../../../public/dev/landmarks-fixture.json';
import { describe, expect, it } from 'vitest';
import { CHUNK, type Pt, type WorldNet } from '../../../sim/gen/types';
import { inSectorV, intervals, marks, owns, pieces, prepLine, sample } from './clip';
import { fixtureWarp } from './fixture';

const net = netJson as unknown as WorldNet;

/** Length of a line outside the Sector V square, measured by fine sampling. */
function outsideLength(l: ReturnType<typeof prepLine>) {
  let sum = 0;
  const n = Math.ceil(l.len / 0.05);
  for (let i = 0; i < n; i++) {
    const s = ((i + 0.5) / n) * l.len, q = sample(l, s);
    if (!inSectorV(q.x, q.z)) sum += l.len / n;
  }
  return sum;
}

function chunksOf(l: ReturnType<typeof prepLine>) {
  const xs = l.p.map((p) => p[0]), zs = l.p.map((p) => p[1]);
  const out: [number, number][] = [];
  for (let cx = Math.floor(Math.min(...xs) / CHUNK) - 1; cx <= Math.floor(Math.max(...xs) / CHUNK) + 1; cx++)
    for (let cz = Math.floor(Math.min(...zs) / CHUNK) - 1; cz <= Math.floor(Math.max(...zs) / CHUNK) + 1; cz++) out.push([cx, cz]);
  return out;
}

const lines: [string, Pt[]][] = [
  ['green line', net.metro[0].p],
  ['a road along a chunk edge', [[-1000, 512], [-400, 512], [-400, 768]]],
  ['a diagonal through chunk corners', [[-1280, -1280], [-384, -384], [-200, -200]]],
  ['a vidyapati flyover way', net.roads.find((r) => r.bridge === 'flyover')!.p],
];

describe('linear structures cut per chunk', () => {
  for (const mode of ['free', 'timed'] as const) for (const [name, p] of lines) {
    it(`${name} (${mode}): intervals cover the line once, with no gaps or overlaps at seams`, () => {
      const l = prepLine(p, fixtureWarp(mode));
      const all = chunksOf(l).flatMap(([cx, cz]) => intervals(l, cx, cz));
      const total = all.reduce((a, [s0, s1]) => a + (s1 - s0), 0);
      expect(total).toBeCloseTo(outsideLength(l), 0);
      const sorted = [...all].sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i][0]).toBeGreaterThanOrEqual(sorted[i - 1][1] - 1e-6);
    });

    it(`${name} (${mode}): pieces cut on a global grid, the same from either side of a seam`, () => {
      const l = prepLine(p, fixtureWarp(mode));
      for (const [cx, cz] of chunksOf(l)) for (const [a, b] of pieces(intervals(l, cx, cz), 2.5)) {
        expect(b - a).toBeLessThanOrEqual(2.5 + 1e-6);
        // A piece never straddles a grid line: both ends sit in the same 2.5-unit cell (or end on its boundary).
        expect(Math.floor(a / 2.5 + 1e-9)).toBe(Math.ceil(b / 2.5 - 1e-9) - 1);
      }
    });

    it(`${name} (${mode}): piers are owned by exactly one chunk and none is lost`, () => {
      const l = prepLine(p, fixtureWarp(mode));
      const got = chunksOf(l).flatMap(([cx, cz]) => marks(l, cx, cz, 14).map((s) => ({ s, cx, cz })));
      const want: number[] = [];
      for (let s = 0; s <= l.len; s += 14) { const q = sample(l, s); if (!inSectorV(q.x, q.z)) want.push(s); }
      expect(got.map((g) => g.s).sort((a, b) => a - b)).toEqual(want);
      for (const g of got) { const q = sample(l, g.s); expect(owns(g.cx, g.cz, q.x, q.z)).toBe(true); }
    });
  }

  it('a point on a chunk boundary belongs to the chunk on its positive side', () => {
    expect(owns(1, 0, 128, 5)).toBe(true);
    expect(owns(0, 0, 128, 5)).toBe(false);
    expect(owns(-1, -1, -0.001, -128)).toBe(true);
  });

  it('the fixture warp is identity inside Sector V and invertible outside', () => {
    const w = fixtureWarp('timed');
    expect(w.toGame([100, -200])).toEqual([100, -200]);
    const g = w.toGame([-3020, 530]);
    expect(Math.abs(g[0])).toBeLessThan(3020);
    const r = w.toReal(g);
    expect(r[0]).toBeCloseTo(-3020, 6);
    expect(r[1]).toBeCloseTo(530, 6);
  });
});
