// A path you can sample by distance (bus routes). Positions are shifted to the left lane.

import type { Pt } from './mapdata';

export class Polyline {
  readonly cum: number[] = [0];
  readonly length: number;

  constructor(readonly pts: Pt[]) {
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.length = this.cum[this.cum.length - 1];
  }

  /** Position at distance s, `dir` +1 along the points or -1 against them, shifted left by `offset`. */
  at(s: number, dir: 1 | -1, offset: number): { x: number; z: number; heading: number } {
    const d = Math.max(0, Math.min(this.length, s));
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const [ax, az] = this.pts[i - 1], [bx, bz] = this.pts[i];
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const t = (d - this.cum[i - 1]) / seg;
    let dx = (bx - ax) / seg, dz = (bz - az) / seg;
    if (dir < 0) { dx = -dx; dz = -dz; }
    return { x: ax + (bx - ax) * t + dz * offset, z: az + (bz - az) * t - dx * offset, heading: Math.atan2(dz, dx) };
  }

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
