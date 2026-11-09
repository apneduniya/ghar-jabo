// The street's edges, from the sim's layout: compound walls in the surveyed styles, median planting and
// railings, blue footpath barriers along compound frontages, and the big trees over the footpaths.
// Solid parts go into `root` (baked into one draw call with the rest of the dressing); see-through parts go
// into the shared Rails atlas mesh; trees into the instanced Forest.

import * as THREE from 'three';
import { box, mat } from '../gfx';
import { FOOTPATH, STREETS, type StreetId } from '../../content/streetlife';
import type { MapData } from '../../sim/mapdata';
import type { StreetLayout } from '../../sim/streetlayout';
import { clearance, frameAt, kerbOffset, medianStyle, sideNormal, type MedianPiece } from '../../sim/streetlife';
import type { WallPiece } from '../../sim/walls';
import type { BuildingGrid } from '../../sim/collide';
import type { Forest } from './greenery';
import type { Rails } from './kit';

const PASTEL = [0xe8b0a6, 0xe39a84, 0xefe2c2, 0xf0c9b4, 0xe9d7b0];
const RAIL_TINT = [0x1f1f22, 0x5a2a20, 0x1f1f22];
const HEDGE = 0x3f6b34, SHRUB = 0x4f7d3a;

/** A box rotated to run along (dx, dz), centred at (x, z), standing on y0. */
function along(w: number, h: number, d: number, color: number, x: number, y0: number, z: number, dx: number, dz: number) {
  const b = box(w, h, d, color, x, y0, z);
  b.rotation.y = -Math.atan2(dz, dx);
  return b;
}

const bushGeo = new THREE.IcosahedronGeometry(1, 0);
/** A round shrub (a squashed icosahedron), baked like the boxes. */
function bush(r: number, color: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(bushGeo, mat(color));
  m.scale.set(r, r * 0.8, r);
  m.position.set(x, y + r * 0.6, z);
  return m;
}

/** Stable per-position pick, so a compound keeps its colours between loads. */
const pick = <T>(xs: T[], x: number, z: number) => xs[Math.abs(Math.round(x * 0.07) * 31 + Math.round(z * 0.07) * 17) % xs.length];

function wall(root: THREE.Object3D, rails: Rails, w: WallPiece) {
  const dx = w.bx - w.ax, dz = w.bz - w.az, L = Math.hypot(dx, dz) || 1;
  const ux = dx / L, uz = dz / L, cx = (w.ax + w.bx) / 2, cz = (w.az + w.bz) / 2;
  switch (w.style) {
    case 'pwc': // SOUTH §3: 2 m white wall with a hedge along the top
      root.add(along(L + 0.05, 2.0, 0.35, 0xf3f1ea, cx, 0, cz, ux, uz), along(L + 0.05, 0.45, 0.7, HEDGE, cx, 2.0, cz, ux, uz));
      break;
    case 'tiu': // SOUTH §1: blue iron railing on brick-red pillars over a low plinth
      root.add(along(L + 0.05, 0.35, 0.35, 0x9a9a96, cx, 0, cz, ux, uz), box(0.5, 1.9, 0.5, 0xa0452e, w.ax, 0, w.az));
      rails.strip(w.ax, w.az, w.bx, w.bz, 0.35, 1.75, 'spear', 0x2456a8);
      break;
    case 'hoarding': // SOUTH §1: blue corrugated sheets about 2.5 m tall
      rails.strip(w.ax, w.az, w.bx, w.bz, 0, 2.4, 'sheet', 0x2f6db5);
      break;
    default: { // pastel wall about 1 m with an iron railing on top; CSTARI: cream with red-brown railing
      const col = w.style === 'cstari' ? 0xefe3c4 : pick(PASTEL, cx, cz);
      const rail = w.style === 'cstari' ? 0x5a2a20 : pick(RAIL_TINT, cz, cx);
      root.add(along(L + 0.05, 1.0, 0.3, col, cx, 0, cz, ux, uz), box(0.42, 2.25, 0.42, col, w.ax, 0, w.az));
      rails.strip(w.ax, w.az, w.bx, w.bz, 1.0, 2.15, 'iron', rail);
    }
  }
}

/** Median dressing over the raised strip that citymap.ts draws (kerbs and grass come from there). */
function median(root: THREE.Object3D, rails: Rails, forest: Forest, p: MedianPiece, i: number) {
  const { kind, width } = medianStyle(p);
  const nx = p.dz, nz = -p.dx, hw = width / 2, y = 0.28;
  const ax = p.x - p.dx * p.len / 2, az = p.z - p.dz * p.len / 2, bx = p.x + p.dx * p.len / 2, bz = p.z + p.dz * p.len / 2;
  const edge = (s: number, y0: number, y1: number, band: Parameters<Rails['strip']>[6], col?: number) =>
    rails.strip(ax + nx * hw * s, az + nz * hw * s, bx + nx * hw * s, bz + nz * hw * s, y0, y1, band, col);
  switch (kind) {
    case 'pipe': // Street 2: green bamboo-like pipe railing, shrubs inside
      edge(1, y, y + 0.9, 'pipe'); edge(-1, y, y + 0.9, 'pipe');
      if (i % 2 === 0) root.add(bush(0.45, SHRUB, p.x, y, p.z));
      break;
    case 'island': // PwC More west arm: kerbed island with a blue railing
      edge(1, y, y + 0.95, 'barrier'); edge(-1, y, y + 0.95, 'barrier');
      root.add(along(p.len, 0.5, width - 0.6, HEDGE, p.x, y, p.z, p.dx, p.dz));
      break;
    case 'planted': // Street 13 west: hedge, small trees
      root.add(along(p.len + 0.02, 0.6, width - 0.5, HEDGE, p.x, y, p.z, p.dx, p.dz));
      if (i % 4 === 0) forest.round(p.x, p.z, 0.45);
      break;
    case 'grass': // Street 13 east: grass, a low hedge, areca palms and oleander
      root.add(along(p.len + 0.02, 0.45, 0.8, HEDGE, p.x, y, p.z, p.dx, p.dz));
      if (i % 3 === 0) forest.palm(p.x + nx * hw * 0.5, p.z + nz * hw * 0.5, 'areca', 0.9);
      if (i % 2 === 1) {
        root.add(bush(0.55, SHRUB, p.x - nx * hw * 0.5, y, p.z - nz * hw * 0.5));
        root.add(bush(0.18, 0xe86a9a, p.x - nx * hw * 0.5 + 0.2, y + 0.55, p.z - nz * hw * 0.5)); // oleander flowers
      }
      break;
    case 'balustrade': // Street 13 near College More: white concrete balusters
      edge(1, y, y + 0.85, 'baluster'); edge(-1, y, y + 0.85, 'baluster');
      if (i % 3 === 0) root.add(bush(0.5, SHRUB, p.x, y, p.z));
      break;
    case 'barrier': // Street 18 south: steel median barrier
      edge(0, y, y + 0.9, 'iron', 0x8f9499);
      break;
    default:
      root.add(along(p.len + 0.02, 0.5, Math.max(0.5, width - 0.5), HEDGE, p.x, y, p.z, p.dx, p.dz));
  }
}

/** Blue footpath barriers along the kerb on Street 13 and Street 18, with gaps to cross. */
function barriers(map: MapData, layout: StreetLayout, rails: Rails) {
  const lines: [StreetId, 'N' | 'S' | 'E' | 'W', number, number][] = [
    ['st13e', 'N', 24, 505], ['st13e', 'S', 24, 505], ['st18n', 'E', 14, 260], ['st18n', 'W', 14, 260],
    ['st18s', 'E', 14, 300], ['st18s', 'W', 14, 300],
  ];
  const busy = [...layout.units, ...layout.spots.filter((s) => s.spot.where !== 'median')];
  for (const [id, side, from, to] of lines) {
    let prev: [number, number] | null = null;
    for (let m = from; m < to; m += 3) {
      const f = frameAt(STREETS[id], m), n = sideNormal(f, side), k = kerbOffset(map.roads, f, n);
      const x = f.x + n[0] * (k + 0.35), z = f.z + n[1] * (k + 0.35);
      const ok = k < 8 && clearance(map.roads, x, z, true) > 0.1 && Math.round(m) % 40 >= 4 &&
        !busy.some((u) => Math.hypot(u.x - x, u.z - z) < 4.5);
      if (ok && prev) rails.strip(prev[0], prev[1], x, z, 0, 1.0, 'barrier');
      prev = ok ? [x, z] : null;
    }
  }
}

/**
 * Big rain trees and the odd mango or peepal along every main road, just behind the footpath (inside the
 * compound wall, canopy over the path), with coconut and royal palms here and there.
 */
function roadsideTrees(map: MapData, grid: BuildingGrid, layout: StreetLayout, forest: Forest) {
  const MAIN = new Set(['primary', 'secondary', 'tertiary']);
  const stalls = layout.units;
  for (const r of map.roads) {
    if (!MAIN.has(r.k) || r.b) continue;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      const L = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / L, dz = (bz - az) / L;
      for (let s = 4; s < L; s += 9) for (const side of [1, -1]) {
        const off = r.w / 2 + FOOTPATH + 1.6 + ((s * 7) % 3) * 0.6;
        const x = ax + dx * s + dz * off * side, z = az + dz * s - dx * off * side;
        if (Math.hypot(x, z) > 340 || clearance(map.roads, x, z, true) < FOOTPATH + 0.8 || grid.blocked(x, z, 1.2)) continue;
        if (stalls.some((u) => Math.hypot(u.x - x, u.z - z) < 2.4) || forest.near(x, z, 5)) continue;
        const v = Math.abs(Math.round(x * 3.1 + z * 1.7)) % 10;
        if (v < 6) forest.rain(x, z, 0.9 + (v % 3) * 0.15);
        else if (v < 8) forest.round(x, z, 0.9);
        else forest.palm(x, z, v === 8 ? 'coconut' : 'royal');
      }
    }
  }
}

export function buildStreetKit(root: THREE.Object3D, map: MapData, grid: BuildingGrid, layout: StreetLayout, rails: Rails, forest: Forest) {
  for (const w of layout.walls) wall(root, rails, w);
  layout.medians.forEach((p, i) => { if (Math.hypot(p.x, p.z) < 340) median(root, rails, forest, p, i); });
  barriers(map, layout, rails);
  roadsideTrees(map, grid, layout, forest);
}
