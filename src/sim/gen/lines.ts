// Linear structures (viaducts, flyovers, medians) cut into chunks. Pure geometry, no three.js.
// A line is warped once into game space with cumulative distances; every chunk takes the stretches of it that lie
// inside its square (half-open: [x0, x0 + CHUNK)), minus the Sector V square. Pieces are cut on a global grid of
// arc length, and point features (piers) sit at global arc positions owned by exactly one chunk, so the seams
// between chunks have no gaps and no doubles.

import { CHUNK, type Pt, type Warp } from './types';
import { roadToGame } from './roadwarp';
import { SECTOR_V_HALF } from '../../content/landmarks';

export interface Line {
  p: Pt[];
  /** Cumulative arc length at each vertex (game units). */
  d: number[];
  /** For each original (real) vertex index, its arc length in game space. */
  at: number[];
  len: number;
}

/**
 * Densify a real polyline every `step` real units, warp it into game space and measure it. `off`: a net road's
 * per-vertex moves (NetRoad.off), kept at true length through the warp (roadwarp.ts).
 */
export function prepLine(real: Pt[], warp: Warp, step = 8, off?: (Pt | null)[]): Line {
  const { p, at } = roadToGame({ p: real, off }, warp, step);
  const d = [0];
  for (let i = 1; i < p.length; i++) d.push(d[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { p, d, at: at.map((i) => d[i]), len: d[d.length - 1] ?? 0 };
}

export interface Sample { x: number; z: number; dx: number; dz: number }

/** Point and unit tangent at arc length `s` (clamped to the line). */
export function sample(l: Line, s: number): Sample {
  const n = l.p.length;
  if (n < 2) return { x: l.p[0]?.[0] ?? 0, z: l.p[0]?.[1] ?? 0, dx: 1, dz: 0 };
  s = Math.max(0, Math.min(l.len, s));
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (l.d[m] <= s) lo = m; else hi = m; }
  const a = l.p[lo], b = l.p[hi], L = l.d[hi] - l.d[lo] || 1, t = (s - l.d[lo]) / L;
  const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, k = Math.hypot(dx, dz) || 1;
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dx: dx / k, dz: dz / k };
}

/** Parameter range [t0, t1] of segment a→b inside the axis-aligned box, or null (Liang–Barsky). */
function clipSeg(a: Pt, b: Pt, x0: number, z0: number, x1: number, z1: number): [number, number] | null {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const edges: [number, number][] = [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dz, a[1] - z0], [dz, z1 - a[1]]];
  for (const [p, q] of edges) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return t1 > t0 ? [t0, t1] : null;
}

/** Subtract [a, b] from a sorted list of disjoint intervals. */
function subtract(iv: [number, number][], a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  for (const [s0, s1] of iv) {
    if (b <= s0 || a >= s1) { out.push([s0, s1]); continue; }
    if (a > s0) out.push([s0, a]);
    if (b < s1) out.push([b, s1]);
  }
  return out;
}

/** Arc-length intervals of `l` inside chunk (cx, cz), outside the Sector V square. Sorted, merged. */
export function intervals(l: Line, cx: number, cz: number): [number, number][] {
  const x0 = cx * CHUNK, z0 = cz * CHUNK, x1 = x0 + CHUNK, z1 = z0 + CHUNK, H = SECTOR_V_HALF;
  let iv: [number, number][] = [];
  for (let i = 1; i < l.p.length; i++) {
    const a = l.p[i - 1], b = l.p[i], L = l.d[i] - l.d[i - 1];
    if (L <= 0) continue;
    const r = clipSeg(a, b, x0, z0, x1, z1);
    if (!r) continue;
    // Half-open squares: a stretch running exactly along a chunk edge belongs to the chunk on its positive side.
    const tm = (r[0] + r[1]) / 2;
    if (!owns(cx, cz, a[0] + (b[0] - a[0]) * tm, a[1] + (b[1] - a[1]) * tm)) continue;
    const s0 = l.d[i - 1] + r[0] * L, s1 = l.d[i - 1] + r[1] * L;
    const last = iv[iv.length - 1];
    if (last && Math.abs(last[1] - s0) < 1e-6) last[1] = s1; else iv.push([s0, s1]);
    const sq = clipSeg(a, b, -H, -H, H, H);
    if (sq) iv = subtract(iv, l.d[i - 1] + sq[0] * L, l.d[i - 1] + sq[1] * L);
  }
  return iv.filter(([a, b]) => b - a > 1e-6);
}

/** Cut intervals into pieces on a global grid of `step` (so neighbouring chunks cut the same way). */
export function pieces(iv: [number, number][], step: number): [number, number][] {
  const out: [number, number][] = [];
  for (const [a, b] of iv) {
    let s = a;
    while (s < b - 1e-6) {
      const next = Math.min(b, (Math.floor(s / step + 1e-9) + 1) * step);
      out.push([s, next]);
      s = next;
    }
  }
  return out;
}

/** True if (x, z) belongs to chunk (cx, cz): floor division, so every point has exactly one owner. */
export const owns = (cx: number, cz: number, x: number, z: number) => Math.floor(x / CHUNK) === cx && Math.floor(z / CHUNK) === cz;

export const inSectorV = (x: number, z: number) => Math.abs(x) <= SECTOR_V_HALF && Math.abs(z) <= SECTOR_V_HALF;

/** Arc positions k * step (k >= 0, offset by `phase`) whose point lies in chunk (cx, cz) and outside Sector V. */
export function marks(l: Line, cx: number, cz: number, step: number, phase = 0): number[] {
  const out: number[] = [];
  for (const [a, b] of intervals(l, cx, cz)) {
    for (let k = Math.ceil((a - phase) / step - 1e-9); phase + k * step <= b + 1e-9; k++) {
      const s = phase + k * step;
      if (s < 0 || s > l.len) continue;
      const q = sample(l, s);
      if (owns(cx, cz, q.x, q.z) && !inSectorV(q.x, q.z) && !out.includes(s)) out.push(s);
    }
  }
  return out;
}

/** Nearest point of a polyline to (x, z): distance, arc length and the point. */
export function nearestOn(l: Line, x: number, z: number) {
  let best = { d: Infinity, s: 0, x: 0, z: 0 };
  for (let i = 1; i < l.p.length; i++) {
    const [ax, az] = l.p[i - 1], [bx, bz] = l.p[i];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(px - x, pz - z);
    if (d < best.d) best = { d, s: l.d[i - 1] + t * (l.d[i] - l.d[i - 1]), x: px, z: pz };
  }
  return best;
}
