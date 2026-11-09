import { describe, expect, it } from 'vitest';
import corridors from '../../../research/routes/corridors.json';
import { HALF, inSquare } from './clip';
import { densify } from './geom';
import { makeWarp, norm8, R0 } from './warp';
import type { Pt } from './types';

const timed = makeWarp('timed');
const lines = corridors.corridors.map((c) => ({ id: c.id, p: c.polyline.map((q) => q.game as Pt), lm: c.landmarks }));

function len(p: Pt[]) { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; }

/** Length of a corridor outside the square, in game units, after warping. */
export function beyond(p: Pt[]) {
  const d = densify(p, 5).map((q) => timed.toGame(q));
  let s = 0;
  for (let i = 1; i < d.length; i++) if (!inSquare(d[i]) || !inSquare(d[i - 1])) s += Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]);
  return s;
}

function project(p: Pt[], x: number, z: number) {
  let best = { s: 0, d: Infinity }, acc = 0;
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, L = Math.sqrt(L2);
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (d < best.d) best = { s: acc + t * L, d };
    acc += L;
  }
  return best.s;
}

function at(p: Pt[], s: number): Pt {
  for (let i = 1; i < p.length; i++) {
    const L = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (s <= L) return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * (s / L), p[i - 1][1] + (p[i][1] - p[i - 1][1]) * (s / L)];
    s -= L;
  }
  return p[p.length - 1];
}

describe('warp', () => {
  it('is identity inside the Sector V square and in free mode', () => {
    for (const p of [[0, 0], [HALF, HALF], [-HALF, 200], [359, -360]] as Pt[]) expect(timed.toGame(p)).toEqual(p);
    expect(makeWarp('free').toGame([-3000, 500])).toEqual([-3000, 500]);
  });

  it('is continuous at the edge and monotone outwards', () => {
    let bad = 0;
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const c = Math.cos(a), s = Math.sin(a);
      let prev = 0;
      for (let r = 300; r < 4000; r += 1) {
        const [x, z] = timed.toGame([c * r, s * r]);
        const n = norm8(x, z);
        // Strictly increasing, and slope ≤ 1 everywhere: no jump at the edge and never stretched.
        if (n <= prev || (prev && n - prev > 1.0001)) bad++;
        prev = n;
      }
    }
    expect(bad).toBe(0);
    const [x, z] = timed.toGame([R0 + 1e-6, 0]);
    expect(norm8(x, z)).toBeCloseTo(R0, 4);
  });

  it('is invertible', () => {
    for (let i = 0; i < 400; i++) {
      const p: Pt = [Math.sin(i * 12.9898) * 3500, Math.cos(i * 78.233) * 2000];
      const q = timed.toReal(timed.toGame(p));
      expect(q[0]).toBeCloseTo(p[0], 6);
      expect(q[1]).toBeCloseTo(p[1], 6);
    }
  });

  it('squeezes corridor A beyond the square to about 1,500 u (ROUTES §5)', () => {
    const a = lines.find((l) => l.id.startsWith('A_'))!;
    const real = len(densify(a.p, 5).filter((q) => !inSquare(q)));
    const got = beyond(a.p);
    expect(real).toBeGreaterThan(4500);
    expect(got).toBeGreaterThan(1350);
    expect(got).toBeLessThan(1650);
    for (const l of lines) expect(beyond(l.p)).toBeLessThan(2000);
  });

  it('keeps landmark order along every corridor', () => {
    for (const l of lines) {
      const real = densify(l.p, 5);
      const g = real.map((q) => timed.toGame(q));
      // Each landmark's foot on the corridor, in real order; after warping, the feet stay in that order along the
      // warped corridor, and landmarks set back from the road (≤ 30 u) stay within a few units of it.
      const lm = l.lm.filter((m) => m.offset_m < 60).map((m) => {
        const r = project(real, ...(m.game as Pt));
        return { r, foot: project(g, ...timed.toGame(at(real, r))), s: project(g, ...timed.toGame(m.game as Pt)) };
      }).sort((a, b) => a.r - b.r);
      for (let i = 1; i < lm.length; i++) {
        if (lm[i].r - lm[i - 1].r < 1) continue; // the same spot in reality: either order
        expect(lm[i].foot, `${l.id} landmark ${i}`).toBeGreaterThan(lm[i - 1].foot);
        expect(lm[i].s, `${l.id} landmark ${i} (set back)`).toBeGreaterThan(lm[i - 1].s - 10);
      }
    }
  });
});
