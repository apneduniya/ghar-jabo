// Paths you can sample by distance: bus routes (Polyline) and a graph vehicle's road ahead (Track). Both can be
// read smoothed: the mean of the path over a short window, which rounds every corner and lane change into a curve
// a real vehicle could drive.

import type { Pt } from './mapdata';

export interface Pose { x: number; z: number; heading: number }

/** Index i of the segment pts[i] to pts[i + 1] holding distance s (cum is ascending). */
function segAt(cum: number[], s: number, lo = 0) {
  let hi = cum.length - 2;
  if (hi < lo) return lo;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (cum[m] <= s) lo = m; else hi = m - 1; }
  return lo;
}

function pointAt(pts: Pt[], cum: number[], s: number, i = segAt(cum, s)): Pt {
  if (pts.length === 1) return pts[0];
  const seg = cum[i + 1] - cum[i] || 1, t = Math.max(0, Math.min(1, (s - cum[i]) / seg));
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
}

/**
 * The path averaged over [s - h, s + h] (clamped to its ends), heading along the chord P(s + h) - P(s - h).
 * The mean point moves no faster than s does (a chord is never longer than its arc), and it moves and turns
 * continuously even where the path has a corner or a sideways lane jump.
 */
export function smoothAt(pts: Pt[], cum: number[], s: number, h: number): Pose {
  if (pts.length < 2) return { x: pts[0]?.[0] ?? 0, z: pts[0]?.[1] ?? 0, heading: 0 };
  const L = cum[cum.length - 1];
  const a = Math.max(cum[0], s - h), b = Math.min(L, s + h);
  const i0 = segAt(cum, a);
  let x = 0, z = 0, w = 0;
  for (let i = i0; i < pts.length - 1 && cum[i] < b; i++) {
    const lo = Math.max(a, cum[i]), hi = Math.min(b, cum[i + 1]);
    if (hi <= lo) continue;
    const m = pointAt(pts, cum, (lo + hi) / 2, i);
    x += m[0] * (hi - lo); z += m[1] * (hi - lo); w += hi - lo;
  }
  const pa = pointAt(pts, cum, a, i0), pb = pointAt(pts, cum, b);
  let dx = pb[0] - pa[0], dz = pb[1] - pa[1];
  if (Math.hypot(dx, dz) < 1e-6) {
    const i = Math.min(segAt(cum, s), pts.length - 2);
    dx = pts[i + 1][0] - pts[i][0]; dz = pts[i + 1][1] - pts[i][1];
  }
  if (w < 1e-9) { const p = pointAt(pts, cum, s); return { x: p[0], z: p[1], heading: Math.atan2(dz, dx) }; }
  return { x: x / w, z: z / w, heading: Math.atan2(dz, dx) };
}

export class Polyline {
  readonly cum: number[] = [0];
  readonly length: number;

  constructor(readonly pts: Pt[]) {
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.length = this.cum[this.cum.length - 1];
  }

  /** Position at distance s, `dir` +1 along the points or -1 against them, shifted left by `offset`. */
  at(s: number, dir: 1 | -1, offset: number): Pose {
    const d = Math.max(0, Math.min(this.length, s));
    const i = Math.min(segAt(this.cum, d), this.pts.length - 2) + 1;
    const [ax, az] = this.pts[i - 1], [bx, bz] = this.pts[i];
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const t = (d - this.cum[i - 1]) / seg;
    let dx = (bx - ax) / seg, dz = (bz - az) / seg;
    if (dir < 0) { dx = -dx; dz = -dz; }
    return { x: ax + (bx - ax) * t + dz * offset, z: az + (bz - az) * t - dx * offset, heading: Math.atan2(dz, dx) };
  }

  /** Smoothed position at distance s (see smoothAt). */
  smooth(s: number, h: number): Pose { return smoothAt(this.pts, this.cum, Math.max(0, Math.min(this.length, s)), h); }

  /** Distance along the path of the point nearest to (x, z), and how far away it is. */
  project(x: number, z: number): { s: number; dist: number } {
    let best = { s: 0, dist: Infinity };
    for (let i = 1; i < this.pts.length; i++) {
      const [ax, az] = this.pts[i - 1], [bx, bz] = this.pts[i];
      const dx = bx - ax, dz = bz - az;
      const L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
      if (d < best.dist) best = { s: this.cum[i - 1] + t * Math.sqrt(L2), dist: d };
    }
    return best;
  }
}

/**
 * A growing, trimmable path: the lane a graph vehicle has driven and the few edges it has picked ahead.
 * Distances are absolute (they keep counting as the start is trimmed away).
 */
export class Track {
  pts: Pt[] = [];
  cum: number[] = [];

  get start() { return this.cum[0] ?? 0; }
  get end() { return this.cum[this.cum.length - 1] ?? 0; }

  /** Append a point (closer than 1 cm to the last one: skipped). Returns the point's distance along the track. */
  push(p: Pt): number {
    const n = this.pts.length;
    if (!n) { this.pts.push(p); this.cum.push(0); return 0; }
    const q = this.pts[n - 1], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < 0.01) return this.cum[n - 1];
    this.pts.push(p); this.cum.push(this.cum[n - 1] + d);
    return this.cum[n];
  }

  /** Drop points wholly before distance u (one is kept before it so u stays on the track). */
  trim(u: number) {
    let k = 0;
    while (k < this.cum.length - 2 && this.cum[k + 1] <= u) k++;
    if (k) { this.pts.splice(0, k); this.cum.splice(0, k); }
  }

  /** Forget everything after distance u (keeps the segment holding u). */
  cut(u: number) {
    let k = this.cum.length;
    while (k > 2 && this.cum[k - 2] >= u) k--;
    this.pts.length = k; this.cum.length = k;
  }

  smooth(u: number, h: number): Pose { return smoothAt(this.pts, this.cum, Math.max(this.start, Math.min(this.end, u)), h); }
}
