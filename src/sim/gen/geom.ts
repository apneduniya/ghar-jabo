// Small pure geometry and hashing helpers for the world generator.

import type { Pt } from './types';

const mix = (h: number, v: number) => {
  h = Math.imul(h ^ (v | 0), 0x01000193);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  return h ^ (h >>> 15);
};

/** Deterministic hash of a list of integers to [0, 1). Same inputs, same value, forever. */
export function hash(...n: number[]): number {
  let h = 0x811c9dc5;
  for (const v of n) h = mix(h, v);
  return (h >>> 0) / 4294967296;
}

/** A hash-driven stream of numbers, for one generated thing (a plot, a stub). Allocation-free per draw. */
export class Hasher {
  private i = 0;
  private readonly base: number;
  constructor(key: number[]) {
    let h = 0x811c9dc5;
    for (const v of key) h = mix(h, v);
    this.base = h;
  }
  next() { return (mix(this.base, this.i++) >>> 0) / 4294967296; }
  range(a: number, b: number) { return a + this.next() * (b - a); }
  int(a: number, b: number) { return Math.floor(this.range(a, b + 1 - 1e-9)); }
  chance(p: number) { return this.next() < p; }
  pick<T>(xs: readonly T[]): T { return xs[Math.min(xs.length - 1, Math.floor(this.next() * xs.length))]; }
}

/** Stable integer from a string id ('r12' -> a number). */
export function strHash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i) | 0;
  return h;
}

export function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const L2 = dx * dx + dz * dz;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)) : 0;
  return Math.hypot(ax + dx * t - px, az + dz * t - pz);
}

function cross(ax: number, az: number, bx: number, bz: number, cx: number, cz: number) {
  return (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
}

/** True if segments ab and cd intersect. */
export function segsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const d1 = cross(c[0], c[1], d[0], d[1], a[0], a[1]), d2 = cross(c[0], c[1], d[0], d[1], b[0], b[1]);
  const d3 = cross(a[0], a[1], b[0], b[1], c[0], c[1]), d4 = cross(a[0], a[1], b[0], b[1], d[0], d[1]);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

/** Distance between segments ab and cd. */
export function segSegDist(a: Pt, b: Pt, c: Pt, d: Pt): number {
  if (segsCross(a, b, c, d)) return 0;
  return Math.min(
    segDist(a[0], a[1], c[0], c[1], d[0], d[1]), segDist(b[0], b[1], c[0], c[1], d[0], d[1]),
    segDist(c[0], c[1], a[0], a[1], b[0], b[1]), segDist(d[0], d[1], a[0], a[1], b[0], b[1]));
}

export function pointInRing(ring: Pt[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/** An oriented rectangle: centre, unit axis along its length, half sizes. */
export interface Rect { x: number; z: number; ux: number; uz: number; hl: number; hd: number }

export function rectRing(r: Rect): Pt[] {
  const { x, z, ux, uz, hl, hd } = r;
  const vx = -uz, vz = ux;
  return [
    [x - ux * hl - vx * hd, z - uz * hl - vz * hd], [x + ux * hl - vx * hd, z + uz * hl - vz * hd],
    [x + ux * hl + vx * hd, z + uz * hl + vz * hd], [x - ux * hl + vx * hd, z - uz * hl + vz * hd],
  ];
}

/** Separating-axis test for two oriented rectangles (touching counts as apart). Allocation-free. */
export function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  const dx = b.x - a.x, dz = b.z - a.z;
  if (Math.abs(dx) > a.hl + a.hd + b.hl + b.hd + gap || Math.abs(dz) > a.hl + a.hd + b.hl + b.hd + gap) return false;
  return !sep(a, b, dx, dz, a.ux, a.uz, gap) && !sep(a, b, dx, dz, -a.uz, a.ux, gap) &&
    !sep(a, b, dx, dz, b.ux, b.uz, gap) && !sep(a, b, dx, dz, -b.uz, b.ux, gap);
}

function sep(a: Rect, b: Rect, dx: number, dz: number, ax: number, az: number, gap: number) {
  const ra = a.hl * Math.abs(a.ux * ax + a.uz * az) + a.hd * Math.abs(-a.uz * ax + a.ux * az);
  const rb = b.hl * Math.abs(b.ux * ax + b.uz * az) + b.hd * Math.abs(-b.uz * ax + b.ux * az);
  return Math.abs(dx * ax + dz * az) >= ra + rb + gap;
}

/** Distance from a rectangle to segment ab (0 if they touch). */
export function rectSegDist(r: Rect, a: Pt, b: Pt): number {
  // Segment end inside the rectangle?
  for (const p of [a, b]) {
    const dx = p[0] - r.x, dz = p[1] - r.z;
    if (Math.abs(dx * r.ux + dz * r.uz) <= r.hl && Math.abs(-dx * r.uz + dz * r.ux) <= r.hd) return 0;
  }
  const c = rectRing(r);
  let d = Infinity;
  for (let i = 0; i < 4; i++) d = Math.min(d, segSegDist(c[i], c[(i + 1) % 4], a, b));
  return d;
}

export const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Splits long segments so no piece is longer than `step`. */
export function densify(p: Pt[], step: number): Pt[] {
  const out: Pt[] = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const n = Math.max(1, Math.ceil(Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) / step));
    for (let k = 1; k < n; k++) out.push(lerp(p[i - 1], p[i], k / n));
    out.push(p[i]);
  }
  return out;
}

/** Clips a segment to an axis-aligned box (Liang-Barsky), or null when it misses. */
export function clipSegToBox(a: Pt, b: Pt, x0: number, z0: number, x1: number, z1: number): [Pt, Pt] | null {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const checks: [number, number][] = [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dz, a[1] - z0], [dz, z1 - a[1]]];
  for (const [p, q] of checks) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  if (t1 - t0 < 1e-9) return null;
  return [t0 === 0 ? a : lerp(a, b, t0), t1 === 1 ? b : lerp(a, b, t1)];
}

/** The parts of a polyline inside a box, as polylines. */
export function clipLineToBox(p: Pt[], x0: number, z0: number, x1: number, z1: number): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] | null = null;
  for (let i = 1; i < p.length; i++) {
    const c = clipSegToBox(p[i - 1], p[i], x0, z0, x1, z1);
    if (!c) { if (cur) { out.push(cur); cur = null; } continue; }
    if (cur && c[0] === p[i - 1]) cur.push(c[1]);
    else { if (cur) out.push(cur); cur = [c[0], c[1]]; }
    if (c[1] !== p[i]) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}
