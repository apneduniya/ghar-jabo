// Kolkata buildings on the real OSM footprints: walls with facade textures (residential, old, Sector V glass),
// a shop row on the ground floor, flat roofs with the black water tanks you see on every Kolkata rooftop.
// One geometry per style, so ~800 buildings draw in about five calls.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Pt } from '../../sim/mapdata';
import { facadeOffice, facadeOld, facadeResidential, facadeShop } from './textures';

type Style = 'resi' | 'old' | 'office';
const BAY = 3; // window bay width, world units
const FLOOR = 3.2;
const SHOP_H = 3.4;

const TINTS: Record<Style, number[]> = {
  resi: [0xf2dfa7, 0xf0c0a8, 0xcfe3c4, 0xc8dcef, 0xf6efe0, 0xe8cfe6, 0xf3d28e],
  old: [0xd9a876, 0xc98a6a, 0xe0c39a, 0xb9a48c],
  office: [0xffffff, 0xe8eef4, 0xdfe7ee],
};
const SHOP_TINTS = [0xe2402c, 0xf2c230, 0x2f6db5, 0x1f8a46, 0xd35c8a, 0xf08a24, 0xffffff];

class Wall {
  pos: number[] = []; nor: number[] = []; uv: number[] = []; col: number[] = [];
  /** A wall quad from (ax,az) to (bx,bz), y0..y1, facing outward along (nx, nz). */
  quad(ax: number, az: number, bx: number, bz: number, y0: number, y1: number, u0: number, u1: number, v0: number, v1: number, nx: number, nz: number, c: THREE.Color) {
    // Make the triangles' front face point along the outward normal (so back-face culling keeps them).
    if (-(bz - az) * nx + (bx - ax) * nz < 0) { [ax, bx] = [bx, ax]; [az, bz] = [bz, az]; [u0, u1] = [u1, u0]; }
    const P = [[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y0, az], [bx, y1, bz], [ax, y1, az]];
    const U = [[u0, v0], [u1, v0], [u1, v1], [u0, v0], [u1, v1], [u0, v1]];
    for (let i = 0; i < 6; i++) {
      this.pos.push(...P[i]); this.uv.push(...U[i]); this.nor.push(nx, 0, nz); this.col.push(c.r, c.g, c.b);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

function signedArea(p: Pt[]) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length]; a += x1 * z2 - x2 * z1; }
  return a / 2;
}

/** Small deterministic hash per building for picking styles and tints. */
const hash = (p: Pt[]) => Math.abs(Math.round(p[0][0] * 73 + p[0][1] * 151 + p.length * 7));

export function buildBuildings(list: { p: Pt[]; h: number }[]) {
  const walls: Record<Style | 'shop', Wall> = { resi: new Wall(), old: new Wall(), office: new Wall(), shop: new Wall() };
  const roofs: THREE.BufferGeometry[] = [];
  const roofCol = new THREE.Color(0x8f8a82);
  const tankCol = new THREE.Color(0x1b1b1b);

  for (const b of list) {
    const area = Math.abs(signedArea(b.p));
    const k = hash(b.p);
    const style: Style = area > 700 || b.h > 24 ? 'office' : k % 5 === 0 ? 'old' : 'resi';
    const tint = new THREE.Color(TINTS[style][k % TINTS[style].length]);
    const shopTint = new THREE.Color(SHOP_TINTS[k % SHOP_TINTS.length]);
    const ccw = signedArea(b.p) > 0; // with z pointing south, this decides which side is "out"
    const hasShops = style !== 'office' && b.h > 6;
    let u = 0;
    for (let i = 0; i < b.p.length; i++) {
      const [ax, az] = b.p[i], [bx, bz] = b.p[(i + 1) % b.p.length];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 0.2) continue;
      let nx = (bz - az) / L, nz = -(bx - ax) / L;
      if (!ccw) { nx = -nx; nz = -nz; }
      const u1 = u + L / BAY;
      const base = hasShops ? SHOP_H : 0;
      if (hasShops) walls.shop.quad(ax, az, bx, bz, 0, SHOP_H, u, u1, 0, 1, nx, nz, shopTint);
      walls[style].quad(ax, az, bx, bz, base, b.h, u, u1, 0, (b.h - base) / FLOOR, nx, nz, tint);
      u = u1;
    }
    // Flat roof, plus a black water tank (or two) on the houses.
    const shape = new THREE.Shape(b.p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const roof = new THREE.ShapeGeometry(shape);
    roof.rotateX(-Math.PI / 2);
    roof.translate(0, b.h, 0);
    const rg = roof.toNonIndexed();
    rg.deleteAttribute('uv');
    paint(rg, roofCol);
    roofs.push(rg);
    if (style !== 'office' && area < 600) {
      const cx = b.p.reduce((a, q) => a + q[0], 0) / b.p.length, cz = b.p.reduce((a, q) => a + q[1], 0) / b.p.length;
      const tank = new THREE.CylinderGeometry(0.7, 0.75, 1.3, 8).toNonIndexed();
      tank.translate(cx, b.h + 0.65, cz);
      tank.deleteAttribute('uv');
      paint(tank, tankCol);
      roofs.push(tank);
    }
  }

  const group = new THREE.Group();
  const make = (w: Wall, map: THREE.Texture) => new THREE.Mesh(w.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, map }));
  group.add(make(walls.resi, facadeResidential()), make(walls.old, facadeOld()), make(walls.office, facadeOffice()), make(walls.shop, facadeShop()));
  group.add(new THREE.Mesh(mergeGeometries(roofs), new THREE.MeshLambertMaterial({ vertexColors: true })));
  return group;
}

function paint(g: THREE.BufferGeometry, c: THREE.Color) {
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
