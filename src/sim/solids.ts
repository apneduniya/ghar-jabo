// Solid structure footprints (piers, ramp and retaining walls, abutments, station walls and stair towers) as simple
// shapes on a spatial hash, so a walking query looks at one cell and a handful of shapes. Pure: no three.js.

export type Pt = [number, number];

/**
 * A solid footprint: an oriented box (centre, unit axis u along it, half length `hl`, half width `hw`), with
 * rounded corners of radius `r` (a capsule is a box with hw = 0, a circle one with hl = hw = 0).
 */
export interface Solid { x: number; z: number; ux: number; uz: number; hl: number; hw: number; r: number }

export const circle = (x: number, z: number, r: number): Solid => ({ x, z, ux: 1, uz: 0, hl: 0, hw: 0, r });

/** A box from a to b (its long axis), `hw` either side of that line. */
export function boxAlong(a: Pt, b: Pt, hw: number, r = 0): Solid {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return { x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, ux: (b[0] - a[0]) / L, uz: (b[1] - a[1]) / L, hl: L / 2, hw, r };
}

/** A box centred at (x, z), its long axis along (ux, uz) (unit), `len` long and `wid` wide. */
export const box = (x: number, z: number, ux: number, uz: number, len: number, wid: number): Solid => ({ x, z, ux, uz, hl: len / 2, hw: wid / 2, r: 0 });

/** Distance from (x, z) to the solid's outline (0 or less inside). */
export function solidDist(s: Solid, x: number, z: number) {
  const dx = x - s.x, dz = z - s.z;
  const a = Math.abs(dx * s.ux + dz * s.uz) - s.hl, c = Math.abs(dz * s.ux - dx * s.uz) - s.hw;
  const out = Math.hypot(Math.max(a, 0), Math.max(c, 0)), inside = Math.min(Math.max(a, c), 0);
  return out + inside - s.r;
}

/** A structure overlapping a carriageway by less than this (about a kerb) isn't counted as standing on the road. */
export const ON_ROAD = 0.5;

const CELL = 8;
/** The largest pad anyone asks for: shapes are filed into every cell they reach grown by this. */
const MAX_PAD = 2;
const key = (cx: number, cz: number) => (cx + 50000) * 100000 + (cz + 50000);

export class SolidGrid {
  private cells = new Map<number, Solid[]>();
  readonly solids: Solid[] = [];

  constructor(solids: Solid[] = []) { for (const s of solids) this.add(s); }

  add(s: Solid) {
    this.solids.push(s);
    // Bounding half-extents of the oriented box, plus its rounding and the largest pad.
    const ex = Math.abs(s.ux) * s.hl + Math.abs(s.uz) * s.hw + s.r + MAX_PAD;
    const ez = Math.abs(s.uz) * s.hl + Math.abs(s.ux) * s.hw + s.r + MAX_PAD;
    for (let cx = Math.floor((s.x - ex) / CELL); cx <= Math.floor((s.x + ex) / CELL); cx++)
      for (let cz = Math.floor((s.z - ez) / CELL); cz <= Math.floor((s.z + ez) / CELL); cz++) {
        const k = key(cx, cz), list = this.cells.get(k);
        if (list) list.push(s); else this.cells.set(k, [s]);
      }
  }

  get size() { return this.solids.length; }

  /** True if a body of radius `pad` (at most 2) at (x, z) overlaps a solid. */
  blocked(x: number, z: number, pad = 0.35): boolean {
    const list = this.cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list) return false;
    for (const s of list) if (solidDist(s, x, z) < pad) return true;
    return false;
  }
}
