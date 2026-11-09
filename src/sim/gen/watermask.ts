// A conservative raster of all water the generator must keep clear of (net canals and lakes, bheri ponds,
// timed-mode canal patches), built lazily in 64-unit blocks of 2-unit cells. A cell is water if any part of it
// might be: its centre is inside a ring, or a ring edge passes through it. Point, segment and rectangle tests are
// then O(cells touched) instead of O(ring vertices).

import { type Rect } from './geom';
import type { Pt } from './types';

const CELL = 2;
const BLOCK = 32; // cells per block side (64 units)

const EMPTY: Uint8Array = new Uint8Array(0);

export class WaterRaster {
  private blocks = new Map<number, Uint8Array>();
  private lastK = NaN;
  private lastB: Uint8Array = EMPTY;

  /** `ringsIn(x0, z0, x1, z1)` returns every water ring that may touch the box. */
  constructor(private ringsIn: (x0: number, z0: number, x1: number, z1: number) => Pt[][]) {}

  private block(bx: number, bz: number): Uint8Array {
    const k = (bx + 20000) * 40000 + (bz + 20000);
    if (k === this.lastK) return this.lastB;
    let b = this.blocks.get(k);
    if (!b) {
      const x0 = bx * BLOCK * CELL, z0 = bz * BLOCK * CELL, size = BLOCK * CELL;
      const rings = this.ringsIn(x0, z0, x0 + size, z0 + size);
      b = rings.length ? new Uint8Array(BLOCK * BLOCK) : EMPTY;
      for (const ring of rings) fill(b, ring, x0, z0);
      if (b !== EMPTY && b.every((v) => v === 0)) b = EMPTY;
      this.blocks.set(k, b);
    }
    this.lastK = k; this.lastB = b;
    return b;
  }

  /** Is the cell containing (x, z) water? */
  point(x: number, z: number): boolean {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    const bx = Math.floor(cx / BLOCK), bz = Math.floor(cz / BLOCK);
    const b = this.block(bx, bz);
    return b !== EMPTY && b[(cx - bx * BLOCK) * BLOCK + (cz - bz * BLOCK)] === 1;
  }

  /** True if every block meeting the box is dry (the common case away from canals). */
  private dry(x0: number, z0: number, x1: number, z1: number): boolean {
    const s = BLOCK * CELL;
    for (let bx = Math.floor(x0 / s); bx <= Math.floor(x1 / s); bx++)
      for (let bz = Math.floor(z0 / s); bz <= Math.floor(z1 / s); bz++) if (this.block(bx, bz) !== EMPTY) return false;
    return true;
  }

  /** Does a segment (grown by `pad`) touch water? Sampled every unit. */
  segment(a: Pt, b: Pt, pad = 0): boolean {
    if (this.dry(Math.min(a[0], b[0]) - pad - CELL, Math.min(a[1], b[1]) - pad - CELL, Math.max(a[0], b[0]) + pad + CELL, Math.max(a[1], b[1]) + pad + CELL)) return false;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L));
    const ux = (b[0] - a[0]) / (L || 1), uz = (b[1] - a[1]) / (L || 1);
    for (let i = 0; i <= n; i++) {
      const x = a[0] + (b[0] - a[0]) * (i / n), z = a[1] + (b[1] - a[1]) * (i / n);
      if (this.point(x, z)) return true;
      if (pad > 0 && (this.point(x - uz * pad, z + ux * pad) || this.point(x + uz * pad, z - ux * pad))) return true;
    }
    return false;
  }

  /** Does a rectangle touch water? Sampled on a 1.5-unit lattice over it, edges included. */
  rect(r: Rect): boolean {
    const e = r.hl + r.hd + CELL;
    if (this.dry(r.x - e, r.z - e, r.x + e, r.z + e)) return false;
    const nl = Math.max(1, Math.ceil((r.hl * 2) / 1.5)), nd = Math.max(1, Math.ceil((r.hd * 2) / 1.5));
    const vx = -r.uz, vz = r.ux;
    for (let i = 0; i <= nl; i++) {
      const u = -r.hl + (2 * r.hl * i) / nl;
      for (let j = 0; j <= nd; j++) {
        const v = -r.hd + (2 * r.hd * j) / nd;
        if (this.point(r.x + r.ux * u + vx * v, r.z + r.uz * u + vz * v)) return true;
      }
    }
    return false;
  }
}

/** Marks a ring's cells in one block: interior by scanline at cell centres, boundary by walking the edges. */
function fill(b: Uint8Array, ring: Pt[], x0: number, z0: number) {
  const n = ring.length;
  const size = BLOCK * CELL;
  // Only edges spanning some of this block's rows matter for the scanline.
  const rows: [number, number, number, number][] = [];
  for (let i = 0, k = n - 1; i < n; k = i++) {
    const [ax, az] = ring[k], [bx, bz] = ring[i];
    if (Math.max(az, bz) >= z0 && Math.min(az, bz) <= z0 + size) rows.push([ax, az, bx, bz]);
  }
  for (let j = 0; j < BLOCK; j++) {
    const z = z0 + (j + 0.5) * CELL;
    const xs: number[] = [];
    for (const [ax, az, bx, bz] of rows) if ((az > z) !== (bz > z)) xs.push(ax + ((z - az) * (bx - ax)) / (bz - az));
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    for (let s = 0; s + 1 < xs.length; s += 2) {
      const i0 = Math.max(0, Math.ceil((xs[s] - x0) / CELL - 0.5)), i1 = Math.min(BLOCK - 1, Math.floor((xs[s + 1] - x0) / CELL - 0.5));
      for (let i = i0; i <= i1; i++) b[i * BLOCK + j] = 1;
    }
  }
  for (const [ax, az, bx, bz] of rows) {
    if (Math.max(ax, bx) < x0 - 1 || Math.min(ax, bx) > x0 + size + 1 || Math.max(az, bz) < z0 - 1 || Math.min(az, bz) > z0 + size + 1) continue;
    const L = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(L / (CELL * 0.4)));
    for (let s = 0; s <= steps; s++) {
      const x = ax + ((bx - ax) * s) / steps, z = az + ((bz - az) * s) / steps;
      const ci = Math.floor((x - x0) / CELL), cj = Math.floor((z - z0) / CELL);
      if (ci >= 0 && ci < BLOCK && cj >= 0 && cj < BLOCK) b[ci * BLOCK + cj] = 1;
    }
  }
}
