// FIXTURE helpers: deterministic hashing, polyline clipping to a chunk (minus the Sector V square), and road
// distance queries. Debug-only code (`?fixture=1`), loaded lazily so it never sits in the main bundle.

import type { NetRoad, Pt } from '../../../sim/gen/types';

/** Deterministic 0..1 from integers. */
export function hash(...n: number[]) {
  let x = 0x9e3779b9 | 0;
  for (const v of n) {
    x = Math.imul(x ^ (Math.round(v) | 0), 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
  }
  return (x >>> 0) / 4294967296;
}

export type Rect = [number, number, number, number]; // x0, z0, x1, z1

/** Liang–Barsky: the part of segment a→b inside the rectangle, as [t0, t1], or null. */
export function clipSeg(ax: number, az: number, bx: number, bz: number, r: Rect): [number, number] | null {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  const tests: [number, number][] = [[-dx, ax - r[0]], [dx, r[2] - ax], [-dz, az - r[1]], [dz, r[3] - az]];
  for (const [p, q] of tests) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return t1 - t0 > 1e-9 ? [t0, t1] : null;
}

/** Pieces of polyline `p` inside rect `r` and outside the square |x|, |z| ≤ sq. Exact, so chunks meet seamlessly. */
export function clipPolyline(p: Pt[], r: Rect, sq: number): Pt[][] {
  const pieces: Pt[][] = [];
  let cur: Pt[] | null = null;
  const square: Rect = [-sq, -sq, sq, sq];
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const inR = clipSeg(ax, az, bx, bz, r);
    if (!inR) { cur = null; continue; }
    const inS = clipSeg(ax, az, bx, bz, square);
    const keep: [number, number][] = inS ? [[inR[0], Math.min(inR[1], inS[0])], [Math.max(inR[0], inS[1]), inR[1]]] : [inR];
    for (const [t0, t1] of keep) {
      if (t1 - t0 < 1e-6) continue;
      const A: Pt = [ax + (bx - ax) * t0, az + (bz - az) * t0], B: Pt = [ax + (bx - ax) * t1, az + (bz - az) * t1];
      const last = cur?.[cur.length - 1];
      if (cur && last && Math.hypot(last[0] - A[0], last[1] - A[1]) < 1e-6) cur.push(B);
      else { cur = [A, B]; pieces.push(cur); }
    }
    if (inR[1] < 1 - 1e-9 || (inS && inS[1] >= 1 - 1e-9)) cur = null;
  }
  return pieces;
}

/** Nearest point on any of these roads: distance, the road, and the direction there. */
export function nearestRoad(roads: NetRoad[], x: number, z: number) {
  let best = { d: Infinity, r: roads[0], dx: 1, dz: 0 };
  for (const r of roads) for (let i = 1; i < r.p.length; i++) {
    const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (d < best.d) { const L = Math.sqrt(L2); best = { d, r, dx: dx / L, dz: dz / L }; }
  }
  return best;
}

/** Point in polygon (even-odd). */
export function inside(poly: Pt[], x: number, z: number) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/** Roads whose bounding box comes within `pad` of the rectangle (to keep queries cheap). */
export function roadsNear(roads: NetRoad[], r: Rect, pad: number) {
  return roads.filter((road) => {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of road.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    return x1 >= r[0] - pad && x0 <= r[2] + pad && z1 >= r[1] - pad && z0 <= r[3] + pad;
  });
}
