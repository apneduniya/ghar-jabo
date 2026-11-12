// Warping a net road into game space so a divided road's carriageways keep their true spacing (AUDIT.md 6).
// tools/build-world.py pulls the two carriageways of a divided road apart (and a ramp off the road beside it) and
// keeps, per vertex, how far it moved them (NetRoad.off). Warping each vertex on its own would squeeze that spacing
// with everything else in timed (the radial squeeze shrinks the gap across the radius about 3x while the widths stay
// true, so the carriageways would land on top of each other again). Instead the vertex's unmoved point is warped and
// the move is added back at true length, turned with the road: sizes stay true, like every model's.
// Every road vertex shared by two roads carries the same move, so their warped ends still coincide.

import type { NetRoad, Pt, Warp } from './types';

/** A road vertex `p` (real) that build-world moved by `v` (real), in game space. */
export function warpOff(warp: Warp, p: Pt, v: Pt | null | undefined): Pt {
  const L = v ? Math.hypot(v[0], v[1]) : 0;
  if (!v || L < 1e-6 || warp.mode === 'free') return warp.toGame(p);
  const m: Pt = [p[0] - v[0], p[1] - v[1]];
  // The road runs across the move: t is v turned a quarter (v = L * (t.z, -t.x)).
  const tx = -v[1] / L, tz = v[0] / L;
  const g = warp.toGame(m), a = warp.toGame([m[0] + tx, m[1] + tz]), b = warp.toGame([m[0] - tx, m[1] - tz]);
  let gx = a[0] - b[0], gz = a[1] - b[1];
  const k = Math.hypot(gx, gz) || 1;
  gx /= k; gz /= k;
  return [g[0] + gz * L, g[1] - gx * L];
}

/**
 * A road densified every `step` real units (its own vertices kept) and warped with its moves. `at[i]` is the
 * index in the result of the road's vertex i.
 */
export function roadToGame(road: Pick<NetRoad, 'p' | 'off'>, warp: Warp, step: number): { p: Pt[]; at: number[] } {
  const real = road.p, off = road.off;
  const p: Pt[] = [], at: number[] = [];
  for (let i = 0; i < real.length; i++) {
    at.push(p.length);
    p.push(warpOff(warp, real[i], off?.[i]));
    if (i + 1 === real.length) break;
    const [ax, az] = real[i], [bx, bz] = real[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / step);
    const va = off?.[i] ?? [0, 0], vb = off?.[i + 1] ?? [0, 0];
    for (let k = 1; k < n; k++) {
      const t = k / n, v: Pt = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t];
      p.push(warpOff(warp, [ax + (bx - ax) * t, az + (bz - az) * t], off ? v : null));
    }
  }
  return { p, at };
}
