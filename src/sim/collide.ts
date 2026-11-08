// Point-in-building tests on a coarse spatial hash, so the player can't walk through walls.

export type Pt = [number, number];

const CELL = 20;
const MAX_PAD = 2;

export class BuildingGrid {
  private cells = new Map<string, Pt[][]>();

  constructor(polys: Pt[][]) {
    for (const poly of polys) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      // Grown by the largest padding anyone asks for, so a point just across a cell border still sees the wall.
      for (let cx = Math.floor((x0 - MAX_PAD) / CELL); cx <= Math.floor((x1 + MAX_PAD) / CELL); cx++)
        for (let cz = Math.floor((z0 - MAX_PAD) / CELL); cz <= Math.floor((z1 + MAX_PAD) / CELL); cz++) {
          const k = `${cx},${cz}`;
          let list = this.cells.get(k);
          if (!list) { list = []; this.cells.set(k, list); }
          list.push(poly);
        }
    }
  }

  /** True if (x, z) is inside any building, grown by `pad`. */
  blocked(x: number, z: number, pad = 0.35): boolean {
    const list = this.cells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
    if (!list) return false;
    for (const poly of list) if (inside(poly, x, z) || near(poly, x, z, pad)) return true;
    return false;
  }
}

function inside(poly: Pt[], x: number, z: number) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

function near(poly: Pt[], x: number, z: number, pad: number) {
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    if (Math.hypot(ax + dx * t - x, az + dz * t - z) < pad) return true;
  }
  return false;
}

/**
 * Canals and ponds: you can't walk on water, except across a bridge (a road flagged `b`),
 * where the deck runs over the water.
 */
export class WaterMask {
  private water: BuildingGrid;
  private bridges: { ax: number; az: number; bx: number; bz: number; half: number }[] = [];

  constructor(water: Pt[][], roads: { b: number; w: number; p: Pt[] }[]) {
    this.water = new BuildingGrid(water);
    for (const r of roads) {
      if (!r.b) continue;
      for (let i = 1; i < r.p.length; i++)
        this.bridges.push({ ax: r.p[i - 1][0], az: r.p[i - 1][1], bx: r.p[i][0], bz: r.p[i][1], half: r.w / 2 + 1.5 });
    }
  }

  onBridge(x: number, z: number): boolean {
    for (const s of this.bridges) {
      const dx = s.bx - s.ax, dz = s.bz - s.az;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1)));
      if (Math.hypot(s.ax + dx * t - x, s.az + dz * t - z) < s.half) return true;
    }
    return false;
  }

  /** True if (x, z) is water (grown by `pad`) and not on a bridge. */
  blocked(x: number, z: number, pad = 0.35): boolean {
    return this.water.blocked(x, z, pad) && !this.onBridge(x, z);
  }
}
