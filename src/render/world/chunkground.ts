// The ground of a streamed chunk, in the Sector V style (citymap.ts): dusty ground, textured asphalt, paver
// footpaths, blue-and-white kerbs, dashed centre lines, tram rails and puddles. (Lamp pools are lamps.ts LampPools, one instanced mesh.)
// Everything goes into the chunk's GeoBuf; see chunks.ts for how it becomes one draw call.

import * as THREE from 'three';
import { CHUNK, type AreaKind, type Chunk, type GenRoad, type Pt, type RoadClass } from '../../sim/gen/types';
import { GeoBuf, along, normalAt, polyLength, segDist } from './chunkgeo';
import { Tile } from './chunkatlas';

/** The real Sector V map covers this square (|x|, |z| ≤ SQUARE); chunks never draw ground over it. */
export const SQUARE = 360;

const ROAD_Y: Record<RoadClass, number> = { primary: 0.06, secondary: 0.055, tertiary: 0.05, residential: 0.045, lane: 0.04 };
const FOOT: Record<RoadClass, number> = { primary: 2.5, secondary: 2.5, tertiary: 2.0, residential: 1.6, lane: 1.0 };
const FOOT_Y = 0.03, KERB_H = 0.28;
const ASPHALT_UV = 1 / 14, PAVER_UV = 1 / 2.2;

/** Ground colour by area: greener in Salt Lake, dustier in the old city. */
const GROUND: Partial<Record<AreaKind, number>> = { saltlake: 0x8b8a6c, sectorv: 0x8a8174, bypass: 0x8a8573, chingrighata: 0x8a8573 };
const OLD_GROUND = 0x7f766b;
export const OLD_AREAS = new Set<AreaKind>(['ultadanga', 'kankurgachi', 'phoolbagan', 'beliaghata', 'narkeldanga', 'maniktala', 'sealdah']);

/** Footpath width each side of a road (0 when `noFoot`). */
export const footWidth = (r: GenRoad) => (r.noFoot ? 0 : FOOT[r.cls]);
export const roadY = (r: GenRoad) => ROAD_Y[r.cls] ?? 0.04;

/** The chunk's rectangle minus the Sector V square, as up to four rectangles [x0, z0, x1, z1]. */
export function groundRects(x0: number, z0: number, size = CHUNK, sq = SQUARE): [number, number, number, number][] {
  const x1 = x0 + size, z1 = z0 + size;
  const ix0 = Math.max(x0, -sq), ix1 = Math.min(x1, sq), iz0 = Math.max(z0, -sq), iz1 = Math.min(z1, sq);
  if (ix0 >= ix1 || iz0 >= iz1) return [[x0, z0, x1, z1]];
  const out: [number, number, number, number][] = [];
  if (z0 < iz0) out.push([x0, z0, x1, iz0]);
  if (iz1 < z1) out.push([x0, iz1, x1, z1]);
  if (x0 < ix0) out.push([x0, iz0, ix0, iz1]);
  if (ix1 < x1) out.push([ix1, iz0, x1, iz1]);
  return out;
}

/** Is (x, z) on some carriageway of these roads (other than `skip`)? */
export function onCarriageway(roads: GenRoad[], x: number, z: number, skip?: GenRoad, pad = 0) {
  for (const r of roads) {
    if (r === skip) continue;
    for (let i = 1; i < r.p.length; i++) if (segDist(x, z, r.p[i - 1][0], r.p[i - 1][1], r.p[i][0], r.p[i][1]) < r.w / 2 + pad) return true;
  }
  return false;
}

export function buildGroundBase(buf: GeoBuf, chunk: Chunk) {
  const col = new THREE.Color(GROUND[chunk.area] ?? (OLD_AREAS.has(chunk.area) ? OLD_GROUND : 0x8a8174));
  for (const [ax, az, bx, bz] of groundRects(chunk.x0, chunk.z0)) {
    buf.quad([ax, 0.008, bz], [bx, 0.008, bz], [bx, 0.008, az], [ax, 0.008, az], [0, 1, 0], col, QUAD_UV);
  }
}

const MAIN_COL = new THREE.Color(0xffffff), MINOR_COL = new THREE.Color(0xc9c4c0), LANE_COL = new THREE.Color(0xb3aca6);
const PATH_COL = new THREE.Color(0xffffff), WHITE = new THREE.Color(0xf1ece2), RAIL = new THREE.Color(0x8a8d90), GROOVE = new THREE.Color(0x77737a);

const roadColour = (r: GenRoad) => (r.real || r.cls === 'primary' || r.cls === 'secondary' ? MAIN_COL : r.cls === 'lane' ? LANE_COL : MINOR_COL);

/** One road: carriageway, footpaths, kerbs, markings and tram rails. */
export function buildRoad(buf: GeoBuf, r: GenRoad, all: GenRoad[]) {
  const y = roadY(r);
  buf.ribbon(r.p, r.w, y, roadColour(r), Tile.asphalt, ASPHALT_UV);
  const foot = footWidth(r);
  if (foot > 0) {
    buf.ribbon(r.p, r.w + foot * 2, FOOT_Y, PATH_COL, Tile.pavers, PAVER_UV);
    for (const side of [1, -1]) kerb(buf, r, side, all);
  }
  if (r.w >= 6 && r.cls !== 'lane' && !r.tram) markings(buf, r, y, all);
  if (r.tram) tramRails(buf, r, y);
}

/** Kerb stones along one edge; left out where the outside is another carriageway (a junction mouth). */
function kerb(buf: GeoBuf, r: GenRoad, side: number, all: GenRoad[]) {
  const off = (r.w / 2) * side;
  let u = 0;
  for (let i = 1; i < r.p.length; i++) {
    const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-3) continue;
    const ux = (bx - ax) / L, uz = (bz - az) / L, nx = uz * side, nz = -ux * side;
    const n = Math.max(1, Math.ceil(L / 3));
    for (let k = 0; k < n; k++) {
      const t0 = (k / n) * L, t1 = ((k + 1) / n) * L;
      const mx = ax + ux * (t0 + t1) / 2 + uz * off + nx * 0.6, mz = az + uz * (t0 + t1) / 2 - ux * off + nz * 0.6;
      if (onCarriageway(all, mx, mz, r)) continue;
      const A = [ax + ux * t0 + uz * off, az + uz * t0 - ux * off], B = [ax + ux * t1 + uz * off, az + uz * t1 - ux * off];
      buf.wall(A[0], A[1], B[0], B[1], FOOT_Y, FOOT_Y + KERB_H, nx, nz, PATH_COL, (u + t0) / 1.2, (u + t1) / 1.2, 0, 1, Tile.kerb);
    }
    u += L;
  }
}

/** Is (x, z) on the surface of another ground carriageway running across (dx, dz) (not a continuation or a deck)? */
function crossedAt(all: GenRoad[], r: GenRoad, x: number, z: number, dx: number, dz: number) {
  for (const o of all) {
    if (o === r || (o.bridge === 'flyover') !== (r.bridge === 'flyover')) continue;
    for (let i = 1; i < o.p.length; i++) {
      const [ax, az] = o.p[i - 1], [bx, bz] = o.p[i], L = Math.hypot(bx - ax, bz - az);
      if (L < 1e-3 || segDist(x, z, ax, az, bx, bz) >= o.w / 2) continue;
      if (Math.abs(((bx - ax) * dx + (bz - az) * dz) / L) < 0.9) return true;
    }
  }
  return false;
}

/**
 * Dashed white centre line, left out where another carriageway crosses it at an angle: junctions have none, and where
 * squeezed carriageways meet (timed, e.g. KNI Avenue at Ultadanga) their dashes would criss-cross.
 */
export function markings(buf: GeoBuf, r: GenRoad, y: number, all: GenRoad[] = []) {
  const my = y + 0.012;
  along(r.p, 5, 1, (x, z, dx, dz) => {
    if ([-1.1, 0, 1.1].some((t) => crossedAt(all, r, x + dx * t, z + dz * t, dx, dz))) return;
    const hx = dx * 1.1, hz = dz * 1.1, wx = -dz * 0.09, wz = dx * 0.09;
    // Corner order chosen so the quad faces up for any direction (w is always 90° clockwise of d).
    buf.quad([x - hx - wx, my, z - hz - wz], [x - hx + wx, my, z - hz + wz], [x + hx + wx, my, z + hz + wz], [x + hx - wx, my, z + hz - wz], [0, 1, 0], WHITE, QUAD_UV);
  });
}

/** Two tram tracks (no trams run): a dark groove band with two steel rails each, in the middle of the road. */
function tramRails(buf: GeoBuf, r: GenRoad, y: number) {
  const tracks = r.w >= 10 ? [-1.6, 1.6] : [0];
  for (const t of tracks) {
    buf.ribbon(r.p, 0.85, y + 0.006, GROOVE, Tile.asphalt, ASPHALT_UV, t);
    for (const s of [-0.36, 0.36]) buf.ribbon(r.p, 0.08, y + 0.012, RAIL, Tile.white, 1, t + s);
  }
}

const QUAD_UV = [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5], [0.5, 0.5]];

/** A puddle that never dries: a lumpy sky-tinted pool just above the road. */
export function puddle(buf: GeoBuf, x: number, z: number, r: number, k: number) {
  const water = new THREE.Color(0x7d9bb3);
  buf.disc(x, z, r, 0.075, water, 0, 0, Tile.white, 9, 0.6 + (k % 3) * 0.15);
  if (k % 2) buf.disc(x + r * 0.9, z + r * 0.3, r * 0.5, 0.076, water, 0, 0, Tile.white, 7);
}

/** Total road length in a chunk (for tests and stats). */
export const roadLength = (roads: GenRoad[]) => roads.reduce((s, r) => s + polyLength(r.p), 0);

/** Unit left normal at the start of a road, for things placed relative to it. */
export const startNormal = (p: Pt[]) => normalAt(p, 0);
