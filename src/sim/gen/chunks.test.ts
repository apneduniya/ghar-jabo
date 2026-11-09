import { describe, expect, it } from 'vitest';
import worldJson from '../../../public/data/world.json';
import { chunkJob, generateChunk } from './chunks';
import { HALF } from './clip';
import { pointInRing, segDist, segsCross } from './geom';
import { loadNet } from './net';
import { CHUNK, type Chunk, type Pt } from './types';
import { makeWarp } from './warp';

const net = loadNet(worldJson);
const free = makeWarp('free'), timed = makeWarp('timed');
const SEED = 1234;

const insideSq = ([x, z]: Pt) => Math.abs(x) < HALF && Math.abs(z) < HALF;
function ringsOverlap(a: Pt[], b: Pt[]) {
  if (a.some(([x, z]) => pointInRing(b, x, z)) || b.some(([x, z]) => pointInRing(a, x, z))) return true;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) if (segsCross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true;
  return false;
}
const shrink = (r: Pt[], f = 0.97): Pt[] => {
  const cx = r.reduce((s, p) => s + p[0], 0) / r.length, cz = r.reduce((s, p) => s + p[1], 0) / r.length;
  return r.map(([x, z]) => [cx + (x - cx) * f, cz + (z - cz) * f]);
};

/** A spread of chunks: on the corridors near Sealdah, Salt Lake, Beliaghata, the Sector V edge, and far out. */
const SAMPLE: [number, number][] = [[-24, 4], [-23, 3], [-16, 2], [-9, -5], [-4, -4], [-3, 1], [-3, -3], [2, -3], [-13, 6], [-30, -20], [12, 15]];
/** Timed chunks lie closer in (the world is squeezed): the chunks of a spread of warped landmarks. */
const SAMPLE_T: [number, number][] = [...new Set(net.landmarks.filter((_, i) => i % 9 === 0).map((l) => {
  const [x, z] = timed.toGame([l.x, l.z]);
  return `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
}))].map((k) => k.split(',').map(Number) as [number, number]);
const samples = (mode: 'free' | 'timed') => (mode === 'free' ? SAMPLE : SAMPLE_T);

describe('generateChunk', () => {
  it('is deterministic', () => {
    for (const [cx, cz] of SAMPLE.slice(0, 5)) {
      const a = JSON.stringify(generateChunk(net, free, 'free', cx, cz, SEED));
      // Visit the neighbours in between (memo tables fill differently), then again with fresh warps (cold caches).
      generateChunk(net, free, 'free', cx + 1, cz, SEED);
      expect(JSON.stringify(generateChunk(net, free, 'free', cx, cz, SEED))).toBe(a);
      expect(JSON.stringify(generateChunk(net, makeWarp('free'), 'free', cx, cz, SEED))).toBe(a);
    }
    for (const [cx, cz] of SAMPLE_T.slice(0, 5)) {
      const a = JSON.stringify(generateChunk(net, timed, 'timed', cx, cz, SEED));
      expect(JSON.stringify(generateChunk(net, makeWarp('timed'), 'timed', cx, cz, SEED))).toBe(a);
    }
  }, 60_000);

  it('fills chunks with streets and buildings, in both modes', () => {
    const c = generateChunk(net, free, 'free', -16, 2, SEED);
    expect(c.roads.some((r) => r.real)).toBe(true);
    expect(c.roads.some((r) => !r.real)).toBe(true);
    expect(c.buildings.length).toBeGreaterThan(20);
    const far = generateChunk(net, free, 'free', 30, -40, SEED);
    expect(far.area).toBe('generic');
    expect(far.roads.length).toBeGreaterThan(5);
    expect(far.buildings.length).toBeGreaterThan(20);
    for (const [cx, cz] of SAMPLE_T) expect(generateChunk(net, timed, 'timed', cx, cz, SEED).roads.some((r) => r.real)).toBe(true);
  }, 60_000);

  it('never puts buildings on roads, on each other, or in water', () => {
    for (const mode of ['free', 'timed'] as const) {
      const warp = mode === 'free' ? free : timed;
      for (const [cx, cz] of samples(mode)) {
        const c = generateChunk(net, warp, mode, cx, cz, SEED);
        for (const b of c.buildings) {
          for (const r of c.roads) for (let i = 1; i < r.p.length; i++) {
            const [a, e] = [r.p[i - 1], r.p[i]];
            for (const p of b.p) expect(segDist(p[0], p[1], a[0], a[1], e[0], e[1]), `${mode} ${cx},${cz}`).toBeGreaterThan(r.w / 2);
            for (let k = 0; k < b.p.length; k++) expect(segsCross(b.p[k], b.p[(k + 1) % b.p.length], a, e)).toBe(false);
          }
          for (const w of c.water ?? []) expect(ringsOverlap(shrink(b.p), w)).toBe(false);
        }
        for (let i = 0; i < c.buildings.length; i++)
          for (let j = i + 1; j < c.buildings.length; j++) expect(ringsOverlap(shrink(c.buildings[i].p), shrink(c.buildings[j].p))).toBe(false);
      }
    }
  }, 60_000);

  it('never emits anything inside the Sector V square', () => {
    for (const mode of ['free', 'timed'] as const) {
      const warp = mode === 'free' ? free : timed;
      for (let cx = -4; cx <= 3; cx++) for (let cz = -4; cz <= 3; cz++) {
        const c = generateChunk(net, warp, mode, cx, cz, SEED);
        for (const b of c.buildings) for (const p of b.p) expect(insideSq(p)).toBe(false);
        for (const r of c.roads) for (const p of r.p) expect(insideSq(p)).toBe(false);
        for (const p of c.props) expect(insideSq([p.x, p.z])).toBe(false);
      }
    }
  }, 60_000);

  it('timed side streets end in dead ends with a joke', () => {
    let ends = 0;
    for (const [cx, cz] of SAMPLE_T) {
      const c = generateChunk(net, timed, 'timed', cx, cz, SEED);
      for (const r of c.roads) if (!r.real) for (const p of r.p) expect(Math.abs(p[0]) < HALF && Math.abs(p[1]) < HALF).toBe(false);
      for (const p of c.props) if (p.kind === 'dead-end') { ends++; expect(p.text).toBeTruthy(); }
      // No free lattice in timed mode: every generated street is short.
      for (const r of c.roads) if (!r.real) expect(Math.hypot(r.p[r.p.length - 1][0] - r.p[0][0], r.p[r.p.length - 1][1] - r.p[0][1])).toBeLessThanOrEqual(61);
    }
    expect(ends).toBeGreaterThan(5);
  }, 60_000);

  it('streets meet at chunk seams', () => {
    for (const mode of ['free', 'timed'] as const) {
      const warp = mode === 'free' ? free : timed;
      for (const [cx, cz] of samples(mode).slice(0, 6)) {
        const a = generateChunk(net, warp, mode, cx, cz, SEED), b = generateChunk(net, warp, mode, cx + 1, cz, SEED);
        const edge = (cx + 1) * CHUNK;
        const at = (c: Chunk) => c.roads.flatMap((r) => [r.p[0], r.p[r.p.length - 1]].filter((p) => p[0] === edge).map((p) => `${p[1]}|${r.w}|${r.real}`)).sort();
        expect(at(a)).toEqual(at(b));
      }
    }
  }, 60_000);

  it('generates chunks in slices of a few milliseconds, the same chunk as in one go', () => {
    // A walk west along the corridors, as the store sees it: a new row of chunks at a time, each in slices.
    for (const [cx, cz] of SAMPLE) generateChunk(net, free, 'free', cx, cz, 99); // warm the JIT and the net caches
    const slices: number[] = [], whole: number[] = [];
    for (const [mode, warp, xs, zs] of [['free', free, [-14, -9], [-3, 4]], ['timed', timed, [-7, -2], [-3, 2]]] as const) {
      for (let cx = xs[0]; cx <= xs[1]; cx++) for (let cz = zs[0]; cz <= zs[1]; cz++) {
        const job = chunkJob(net, warp, mode, cx, cz, 99);
        const t0 = Date.now();
        for (let t = Date.now(); ; t = Date.now()) {
          const r = job.next();
          slices.push(Date.now() - t);
          if (r.done) {
            whole.push(Date.now() - t0);
            if (cx === xs[0] && cz === zs[0]) expect(JSON.stringify(r.value)).toBe(JSON.stringify(generateChunk(net, warp, mode, cx, cz, 99)));
            break;
          }
        }
      }
    }
    const pct = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * q)];
    const mean = whole.reduce((a, b) => a + b, 0) / whole.length;
    console.log(`chunk gen: ${mean.toFixed(1)} ms per chunk (mean of ${whole.length}), slices p50 ${pct(slices, 0.5)} ms, p95 ${pct(slices, 0.95)} ms, max ${Math.max(...slices)} ms`);
    // Generous bounds: this runs on a shared server next to other builds; the report above is what matters.
    expect(pct(slices, 0.95)).toBeLessThanOrEqual(12);
    expect(mean).toBeLessThan(60);
  }, 60_000);
});
