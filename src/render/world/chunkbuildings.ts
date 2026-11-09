// Generated buildings in the Sector V house kit (buildings.ts + frontage.ts), written straight into a chunk's
// GeoBuf with atlas tiles instead of one material per facade:
// - old: 3–6 storeys built to the edge, shops with signboards and awnings on the ground floor, balconies above.
// - house: Salt Lake bungalows, set back behind a boundary wall with a gate, a porch slab, a water tank.
// - resi: plain blocks with the odd balcony; office: glass or clad towers with a crown; market and shop rows.

import * as THREE from 'three';
import { FLOOR_U, SHOP_U } from '../../content/tuning';
import type { GenBuilding, GenRoad, Pt } from '../../sim/gen/types';
import { GeoBuf, place, polyDist } from './chunkgeo';
import { SIGN_COUNT, Tile } from './chunkatlas';
import { footWidth } from './chunkground';

const BAY = 3;
const SHOP_TINTS = [0xe2402c, 0xf2c230, 0x2f6db5, 0x1f8a46, 0xd35c8a, 0xf08a24, 0xffffff];
const AWNINGS = [0xd9342b, 0x1f8a46, 0x2f6db5, 0xf2c230, 0xe86a1a, 0x8e2a6b];
const PASTEL = [0xe8b0a6, 0xe39a84, 0xefe2c2, 0xf0c9b4, 0xe9d7b0, 0xd7e3c8];
const ROOF = new THREE.Color(0x8f8a82), TOWER_ROOF = new THREE.Color(0x6f747a), TANK = new THREE.Color(0x1b1b1b);
const tankGeo = new THREE.CylinderGeometry(0.7, 0.75, 1.3, 8);
const tmp = new THREE.Matrix4();

export function signedArea(p: Pt[]) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length]; a += x1 * z2 - x2 * z1; }
  return a / 2;
}

/** Drop a repeated closing point and degenerate edges. */
export function cleanRing(p: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const q of p) if (!out.length || Math.hypot(q[0] - out[out.length - 1][0], q[1] - out[out.length - 1][1]) > 0.05) out.push(q);
  if (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 0.05) out.pop();
  return out;
}

const hashOf = (p: Pt[]) => Math.abs(Math.round(p[0][0] * 73 + p[0][1] * 151 + p.length * 7));

interface Edge { ax: number; az: number; bx: number; bz: number; L: number; nx: number; nz: number; street: GenRoad | null; gap: number }

/** Each wall with its outward normal and the road it faces (if it faces one closely). */
export function edgesOf(ring: Pt[], roads: GenRoad[]): Edge[] {
  const flip = signedArea(ring) < 0;
  const out: Edge[] = [];
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 0.2) continue;
    let nx = (bz - az) / L, nz = -(bx - ax) / L;
    if (flip) { nx = -nx; nz = -nz; }
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    let street: GenRoad | null = null, gap = Infinity;
    for (const r of roads) {
      const d = polyDist(r.p, mx + nx * 3, mz + nz * 3);
      const kerb = r.w / 2 + footWidth(r);
      if (d < kerb + 8 && d - kerb < gap) {
        // Facing it: the road must be in front of the wall, not behind it.
        const back = polyDist(r.p, mx - nx * 3, mz - nz * 3);
        if (back > d) { street = r; gap = d + 3 - kerb; }
      }
    }
    out.push({ ax, az, bx, bz, L, nx, nz, street, gap });
  }
  return out;
}

/** A balcony with a solid concrete parapet, as one box (cheap: old-city walls carry dozens). */
const balcony = (buf: GeoBuf, f: THREE.Matrix4, c: THREE.Color) => buf.boxAt(f, 0, 0, 0.45, 2.2, 1.0, 0.9, 0, c);

/** A flat textured board facing local +z: a shop sign, an ad or a text slot. */
export function board(buf: GeoBuf, f: THREE.Matrix4, x: number, y: number, z: number, w: number, h: number, tile: number, glow = 0.8) {
  const corners = [[x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z]].map((c) => new THREE.Vector3(c[0], c[1], c[2]).applyMatrix4(f));
  const n = new THREE.Vector3(0, 0, 1).transformDirection(f);
  const white = new THREE.Color(1, 1, 1), e = 0.002;
  buf.quad(corners[0].toArray(), corners[1].toArray(), corners[2].toArray(), corners[3].toArray(), n.toArray(), white, [[e, e], [1 - e, e], [1 - e, 1 - e], [e, 1 - e]], glow, tile);
}

/** One generated building into the buffer. `roads` are the chunk's roads (for which walls face a street). */
export function buildBuilding(buf: GeoBuf, b: GenBuilding, roads: GenRoad[]) {
  const ring = cleanRing(b.p);
  if (ring.length < 3) return;
  const k = hashOf(ring), lv = Math.max(1, Math.round(b.storeys));
  const tint = new THREE.Color(b.colour);
  const edges = edgesOf(ring, roads);
  const style = b.style;
  const shopBand = (b.shop && style !== 'office' && style !== 'shop') || style === 'market';
  const base = shopBand ? SHOP_U : 0;
  const h = style === 'shop' ? SHOP_U * lv : base + (style === 'market' ? lv - 1 : lv) * FLOOR_U;
  const warm = tint.r > tint.b + 0.05;
  const skin = style === 'office' ? (warm ? Tile.clad : Tile.office) : style === 'house' ? Tile.house : style === 'old' ? Tile.old
    : style === 'market' ? Tile.block : style === 'shop' ? Tile.shop : Tile.resi;
  const shopTint = new THREE.Color(SHOP_TINTS[k % SHOP_TINTS.length]);
  const capCol = tint.clone().multiplyScalar(style === 'office' ? 0.8 : 0.9);

  let u = 0;
  for (const e of edges) {
    const u1 = u + e.L / BAY;
    if (shopBand) buf.wall(e.ax, e.az, e.bx, e.bz, 0, base, e.nx, e.nz, style === 'market' ? new THREE.Color(1, 1, 1) : shopTint, u, u1, 0, 1, style === 'market' ? Tile.market : Tile.shop, 0.9);
    if (h > base) buf.wall(e.ax, e.az, e.bx, e.bz, base, h, e.nx, e.nz, style === 'shop' ? shopTint : tint, u, u1, 0, style === 'shop' ? lv : (h - base) / FLOOR_U, skin, 0.8);
    const cap = style === 'office' ? 0.8 : 0.5;
    buf.wall(e.ax, e.az, e.bx, e.bz, h, h + cap, e.nx, e.nz, capCol, 0, 0, 0, 0, Tile.white);
    buf.wall(e.bx, e.bz, e.ax, e.az, h, h + cap, -e.nx, -e.nz, capCol, 0, 0, 0, 0, Tile.white); // parapet's inner face
    if (e.street && e.L > 3) dressWall(buf, e, style, lv, base, k, tint, shopBand);
    u = u1;
  }
  buf.flat(ring, h + 0.02, style === 'office' ? TOWER_ROOF : ROOF);
  const [cx, cz] = mean(ring);
  if (style !== 'office' && style !== 'shop' && style !== 'market' && k % 3 !== 1) {
    buf.geometry(tankGeo, place(cx + ((k % 5) - 2) * 0.5, h + 0.67, cz, 0, 1, 1, 1, 0, tmp), TANK);
  }
  if (style === 'office' && lv >= 8) buf.boxAt(null, cx, h, cz, 4, 1.8, 4, 0, capCol.clone().multiplyScalar(0.8));
  if (style === 'house') houseFront(buf, edges, k, h);
}

/** Balconies, shop signs and awnings on a street-facing wall, one per 3-unit bay. */
function dressWall(buf: GeoBuf, e: Edge, style: string, lv: number, base: number, k: number, tint: THREE.Color, shops: boolean) {
  const rot = Math.atan2(e.nx, e.nz), f = new THREE.Matrix4();
  const bal = tint.clone().multiplyScalar(0.88);
  // Corridor fronts get the full treatment; side lanes every other bay and the lower floors only.
  const main = !!e.street?.real;
  const floors = style === 'shop' || style === 'office' ? 0 : Math.min(lv - (style === 'market' ? 1 : 0), main ? 6 : 4);
  for (let d = BAY / 2, i = 0; d < e.L - 0.5; d += BAY, i++) {
    const x = e.ax + (e.bx - e.ax) * d / e.L, z = e.az + (e.bz - e.az) * d / e.L;
    const kk = k + i * 7;
    if ((style === 'old' || style === 'resi' || style === 'house') && (main || i % 2 === 0)) {
      for (let fl = 1; fl < floors; fl++) {
        if ((kk + fl) % 3 === 0) continue;
        if (style === 'house' && fl > 1) continue;
        place(x, base + fl * FLOOR_U - 0.1, z, rot, 1, 1, 1, 0, f);
        balcony(buf, f, bal);
      }
    }
    if (shops || style === 'shop') {
      const top = style === 'shop' ? SHOP_U : base;
      place(x + e.nx * 0.08, 0, z + e.nz * 0.08, rot, 1, 1, 1, 0, f);
      board(buf, f, 0, top - 0.8, 0, 2.7, 0.75, Tile.sign0 + (kk % SIGN_COUNT), 0.9);
      if (main || i % 2) buf.boxAt(f, 0, top - 1.0, 0.65, 2.8, 0.08, 1.3, 0, new THREE.Color(AWNINGS[kk % AWNINGS.length]), 0, 0.32);
    }
  }
}

/** Salt Lake: a boundary wall between the house and the footpath, with an iron gate and pillars, and a porch. */
function houseFront(buf: GeoBuf, edges: Edge[], k: number, h: number) {
  const front = edges.filter((e) => e.street).sort((a, b) => a.gap - b.gap)[0];
  if (!front) return;
  const wallCol = new THREE.Color(PASTEL[k % PASTEL.length]), iron = new THREE.Color(0x2b2b2b);
  const rot = Math.atan2(front.nx, front.nz), f = new THREE.Matrix4();
  const mx = (front.ax + front.bx) / 2, mz = (front.az + front.bz) / 2;
  // Porch slab over the door, on two thin columns.
  place(mx, 0, mz, rot, 1, 1, 1, 0, f);
  buf.boxAt(f, 0, Math.min(FLOOR_U, h) - 0.15, 0.9, 3.2, 0.15, 1.8, 0, wallCol.clone().multiplyScalar(0.92));
  for (const s of [-1.4, 1.4]) buf.boxAt(f, s, 0, 1.65, 0.18, Math.min(FLOOR_U, h) - 0.15, 0.18, 0, wallCol);
  const s = front.gap - 0.4;
  if (s < 1.2 || s > 9) return;
  const ux = (front.bx - front.ax) / front.L, uz = (front.bz - front.az) / front.L;
  const ext = 1.5; // the plot is a little wider than the house
  const A: Pt = [front.ax - ux * ext + front.nx * s, front.az - uz * ext + front.nz * s];
  const B: Pt = [front.bx + ux * ext + front.nx * s, front.bz + uz * ext + front.nz * s];
  const len = front.L + ext * 2, gate = 2.8, half = (len - gate) / 2;
  const seg = (ax: number, az: number, bx: number, bz: number) => {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 0.2) return;
    buf.boxAt(null, (ax + bx) / 2, 0, (az + bz) / 2, L + 0.1, 1.15, 0.25, -Math.atan2(bz - az, bx - ax), wallCol);
  };
  seg(A[0], A[1], A[0] + ux * half, A[1] + uz * half);
  seg(B[0] - ux * half, B[1] - uz * half, B[0], B[1]);
  // Side returns back to the house corners.
  seg(A[0], A[1], front.ax - ux * ext, front.az - uz * ext);
  seg(B[0], B[1], front.bx + ux * ext, front.bz + uz * ext);
  const g0x = A[0] + ux * half, g0z = A[1] + uz * half;
  for (const t of [0, gate]) buf.boxAt(null, g0x + ux * t, 0, g0z + uz * t, 0.45, 1.6, 0.45, rot, wallCol.clone().multiplyScalar(0.9));
  // The gate: iron bars, half open.
  place(g0x + ux * gate / 2, 0, g0z + uz * gate / 2, rot, 1, 1, 1, 0, f);
  for (let b = -1.2; b <= 1.21; b += 0.2) buf.boxAt(f, b, 0.1, 0, 0.05, 1.3, 0.05, 0, iron);
  buf.boxAt(f, 0, 1.3, 0, 2.5, 0.08, 0.06, 0, iron);
}

function mean(p: Pt[]): Pt {
  return [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
}
