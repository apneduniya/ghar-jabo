// Compound walls from the OSM plot outlines (`compounds`), as short straight pieces the player can't walk
// through. OSM plots are often drawn to the road centre line, so each piece is pushed into its plot until it
// clears the carriageway and the footpath (and any hawker row in front of it). Openings: OSM gates, surveyed
// gateways, driveways, and wherever a road crosses the ring. Pure: no three.js.

import { FOOTPATH, WALL, WALL_RULES, type WallStyle } from '../content/streetlife';
import type { BuildingGrid, Pt } from './collide';
import type { MapData, Road } from './mapdata';
import { clearance, segDist, segsNear } from './streetlife';

export interface WallPiece { ax: number; az: number; bx: number; bz: number; /** outward: from the compound to the street */ nx: number; nz: number; style: WallStyle }

/** A rectangle the wall must stay behind (a stall), centre + axes + size. */
export interface KeepOut { x: number; z: number; dx: number; dz: number; nx: number; nz: number; w: number; d: number }

export function insideRing(p: Pt[], x: number, z: number) {
  let hit = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/** Direction of the nearest non-service road at (x, z). */
function roadDir(roads: Road[], x: number, z: number): Pt {
  let best = Infinity, dir: Pt = [1, 0];
  for (const g of segsNear(roads, x, z)) {
    if (g.service) continue;
    const d = segDist(x, z, g.ax, g.az, g.bx, g.bz) - g.half;
    if (d < best) { best = d; const L = Math.hypot(g.bx - g.ax, g.bz - g.az) || 1; dir = [(g.bx - g.ax) / L, (g.bz - g.az) / L]; }
  }
  return dir;
}

function inKeepOut(k: KeepOut[], x: number, z: number, pad: number) {
  return k.some((r) => {
    const rx = x - r.x, rz = z - r.z;
    return Math.abs(rx * r.dx + rz * r.dz) < r.w / 2 + pad && Math.abs(rx * r.nx + rz * r.nz) < r.d / 2 + pad;
  });
}

export function wallStyle(map: MapData, c: { t: string; n?: string; p: Pt[] }): WallStyle {
  for (const rule of WALL_RULES) {
    if (rule.poi && map.pois[rule.poi] && insideRing(c.p, ...map.pois[rule.poi])) return rule.style;
    if (rule.name && c.n?.includes(rule.name)) return rule.style;
    if (rule.type && c.t === rule.type) return rule.style;
  }
  return 'pastel';
}

/**
 * Wall pieces along every compound ring near the centre that faces a street (within `street` units of a road).
 * `openings` are extra gateway points (surveyed gates and arches); `keepOut` are stall footprints.
 */
export function compoundWalls(map: MapData, grid: BuildingGrid | null, openings: Pt[] = [], keepOut: KeepOut[] = [], street = 12): WallPiece[] {
  const out: WallPiece[] = [];
  const gates: Pt[] = [...(map.gates ?? []).map((g) => g.p), ...openings];
  const want = FOOTPATH + 0.3;
  const seen = new Map<string, WallPiece[]>();
  for (const c of map.compounds ?? []) {
    const ring = c.p;
    if (ring.length < 3 || !ring.some(([x, z]) => Math.hypot(x, z) < WALL.radius)) continue;
    const style = wallStyle(map, c);
    for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 1) continue;
      const dx = (bx - ax) / L, dz = (bz - az) / L;
      // Interior normal: whichever side of the edge's middle is inside the ring.
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const left = insideRing(ring, mx + dz * 0.6, mz - dx * 0.6);
      const ix = left ? dz : -dz, iz = left ? -dx : dx;
      const n = Math.max(1, Math.round(L / WALL.piece)), len = L / n;
      for (let k = 0; k < n; k++) {
        let x0 = ax + dx * len * k, z0 = az + dz * len * k, x1 = x0 + dx * len, z1 = z0 + dz * len;
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        if (Math.hypot(cx, cz) > WALL.radius) continue;
        const c0 = clearance(map.roads, cx, cz);
        if (c0 > street + 2) continue; // deep inside the block: nobody sees it
        if (gates.some(([gx, gz]) => Math.hypot(gx - cx, gz - cz) < WALL.gateHalf + len / 2)) continue;
        if (c0 < want) {
          const [rx, rz] = roadDir(map.roads, cx, cz);
          if (Math.abs(rx * dx + rz * dz) < 0.75) continue; // the ring crosses a road here: leave it open
        }
        // Push into the plot until the piece clears the road, the footpath and any stall in front.
        let s = 0;
        const bad = (q: number) => [[x0, z0], [cx, cz], [x1, z1]].some(([x, z]) => clearance(map.roads, x + ix * q, z + iz * q) < want ||
          inKeepOut(keepOut, x + ix * q, z + iz * q, 0.4));
        while (s <= 14 && bad(s)) s += 0.5;
        if (s > 14) continue;
        x0 += ix * s; z0 += iz * s; x1 += ix * s; z1 += iz * s;
        const px = (x0 + x1) / 2, pz = (z0 + z1) / 2;
        if (clearance(map.roads, px, pz) > street) continue; // deep inside the block: nobody sees it
        if (gates.some(([gx, gz]) => Math.hypot(gx - px, gz - pz) < WALL.gateHalf + len / 2)) continue;
        if (segsNear(map.roads, px, pz).some((g) => g.service && segDist(px, pz, g.ax, g.az, g.bx, g.bz) < g.half + 0.8)) continue;
        if (grid?.blocked(px, pz, 0.2)) continue; // a building wall stands here already
        // Neighbouring plots share edges: one wall is enough.
        const key = `${Math.round(px / 3)},${Math.round(pz / 3)}`;
        const near: WallPiece[] = [];
        for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) near.push(...(seen.get(`${Math.round(px / 3) + gx},${Math.round(pz / 3) + gz}`) ?? []));
        if (near.some((w) => Math.hypot((w.ax + w.bx) / 2 - px, (w.az + w.bz) / 2 - pz) < 1.5 && Math.abs((w.bx - w.ax) * dx + (w.bz - w.az) * dz) / (Math.hypot(w.bx - w.ax, w.bz - w.az) || 1) > 0.8)) continue;
        const piece: WallPiece = { ax: x0, az: z0, bx: x1, bz: z1, nx: -ix, nz: -iz, style };
        out.push(piece);
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key)!.push(piece);
      }
    }
  }
  return out;
}

/** Segment collision on a spatial hash: walls, stall backs, railings. */
export class SegmentGrid {
  private cells = new Map<string, number[][]>();
  constructor(segs: { ax: number; az: number; bx: number; bz: number }[], private half = WALL.thickness / 2, private cell = 8) {
    for (const s of segs) {
      const x0 = Math.floor((Math.min(s.ax, s.bx) - 2) / cell), x1 = Math.floor((Math.max(s.ax, s.bx) + 2) / cell);
      const z0 = Math.floor((Math.min(s.az, s.bz) - 2) / cell), z1 = Math.floor((Math.max(s.az, s.bz) + 2) / cell);
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
        const k = `${cx},${cz}`;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k)!.push([s.ax, s.az, s.bx, s.bz]);
      }
    }
  }

  /** True if a body of radius `pad` at (x, z) overlaps a segment. */
  blocked(x: number, z: number, pad = 0.35): boolean {
    const list = this.cells.get(`${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`);
    return !!list?.some(([ax, az, bx, bz]) => segDist(x, z, ax, az, bx, bz) < pad + this.half);
  }
}

/** The four edges of a rectangle footprint, for the segment grid. */
export function rectEdges(r: KeepOut) {
  const c = (a: number, b: number): Pt => [r.x + r.dx * r.w * a + r.nx * r.d * b, r.z + r.dz * r.w * a + r.nz * r.d * b];
  const p = [c(-0.5, -0.5), c(0.5, -0.5), c(0.5, 0.5), c(-0.5, 0.5)];
  return p.map((q, i) => ({ ax: q[0], az: q[1], bx: p[(i + 1) % 4][0], bz: p[(i + 1) % 4][1] }));
}
