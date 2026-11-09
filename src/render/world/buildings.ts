// Kolkata buildings on the real OSM footprints, styled by the map's `t` (office, block, college, resi, shop, low),
// sized by `lv` storeys and tinted by `colour` where Street View gave one.
// - office: glass curtain wall, one window row per storey, a parapet crown and a rooftop plant box.
// - block: plain concrete with a window ribbon per storey (government and older office blocks).
// - college: a banded 2-storey podium under glass.
// - resi, shop, low: the Kolkata house kit (shop row on the ground floor, black water tanks on the roof).
// One geometry per facade texture plus one for roofs and trim, so ~1000 buildings draw in six calls.

import * as THREE from 'three';
import { FLOOR_U, SHOP_U } from '../../content/tuning';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Building, BuildingStyle, Pt } from '../../sim/mapdata';
import { facadeBlock, facadeClad, facadeOffice, facadeOld, facadeResidential, facadeShop, litMask } from './textures';
import { glowAtNight } from '../sky';

type Skin = 'resi' | 'old' | 'office' | 'clad' | 'block' | 'shop';
const BAY = 3; // window bay width for the house kit, world units
const FLOOR = FLOOR_U; // one storey: the facade texture repeats once per floor; the frontage uses the same
const SHOP_H = SHOP_U;
const PODIUM = 2; // storeys of banded podium under a college's glass

const TINTS: Record<Skin, number[]> = {
  resi: [0xf2dfa7, 0xf0c0a8, 0xcfe3c4, 0xc8dcef, 0xf6efe0, 0xe8cfe6, 0xf3d28e],
  old: [0xd9a876, 0xc98a6a, 0xe0c39a, 0xb9a48c],
  office: [0x9db4c8, 0xa7bccd, 0x8fa9bf, 0xb3c4d2],
  clad: [0xd8d2c6],
  block: [0xe9e4d8, 0xd8d3c8, 0xefe9dc, 0xcfd3d6, 0xe2d6c0],
  shop: [0xffffff],
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
  geometry(withUv = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    if (withUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

function signedArea(p: Pt[]) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length]; a += x1 * z2 - x2 * z1; }
  return a / 2;
}

function insidePoly(p: Pt[], x: number, z: number) {
  let hit = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/** Small deterministic hash per building for picking variants and tints. */
const hash = (p: Pt[]) => Math.abs(Math.round(p[0][0] * 73 + p[0][1] * 151 + p.length * 7));

/** Storeys for older map data without `lv` (h was in world units, 3.3 m per storey at half scale). */
const storeys = (b: Building) => b.lv ?? Math.max(1, Math.round(b.h / FLOOR_U));

/** Legacy style when `t` is missing: big or tall footprints are offices, the rest houses. */
function styleOf(b: Building, area: number): BuildingStyle {
  return b.t ?? (area > 700 || b.h > 24 ? 'office' : 'resi');
}

export interface Bay { x: number; z: number; nx: number; nz: number; floors: number; tint: THREE.Color; shop: boolean; k: number }

/** Each ring edge with its outward normal (outward = away from the building mass; courtyards face inward). */
function edges(ring: Pt[], hole: boolean, each: (ax: number, az: number, bx: number, bz: number, L: number, nx: number, nz: number) => void) {
  const ccw = signedArea(ring) > 0; // with z pointing south, this decides which side is "out"
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 0.2) continue;
    let nx = (bz - az) / L, nz = -(bx - ax) / L;
    if (ccw === hole) { nx = -nx; nz = -nz; }
    each(ax, az, bx, bz, L, nx, nz);
  }
}

/**
 * `streetSide(x, z)` says whether a wall midpoint faces a main road; only those house walls get balconies,
 * awnings and signboards (the ones the player actually sees), which keeps the vertex count down.
 */
export function buildBuildings(list: Building[], streetSide: (x: number, z: number) => boolean, shopsOk: (x: number, z: number) => boolean = () => true) {
  const bays: Bay[] = [];
  const walls: Record<Skin, Wall> = { resi: new Wall(), old: new Wall(), office: new Wall(), clad: new Wall(), block: new Wall(), shop: new Wall() };
  const trim = new Wall(); // parapets and rooftop boxes: untextured, merged with the roofs
  const roofs: THREE.BufferGeometry[] = [];
  const roofCol = new THREE.Color(0x8f8a82), towerRoof = new THREE.Color(0x6f747a);
  const tankCol = new THREE.Color(0x1b1b1b);

  for (const b of list) {
    const area = Math.abs(signedArea(b.p));
    const k = hash(b.p);
    const style = styleOf(b, area);
    const lv = storeys(b);
    const rings: [Pt[], boolean][] = [[b.p, false], ...(b.holes ?? []).map((h): [Pt[], boolean] => [h, true])];
    const pick = (s: Skin) => new THREE.Color(b.colour ?? TINTS[s][k % TINTS[s].length]);

    if (style === 'office' || style === 'block' || style === 'college') {
      // One window row per storey: the texture's v runs in storeys, u in 3-unit bays.
      const fh = b.h / lv, bay = BAY;
      const podium = style === 'college' ? Math.min(PODIUM, lv - 1) * fh : style === 'block' ? b.h : 0;
      const glass = pick('office');
      // Warm colours (peach, stone, yellow) are cladding with glass strips; cool ones are a glass curtain wall.
      const upper: Skin = style === 'office' && b.colour && glass.r > glass.b ? 'clad' : 'office';
      const band = style === 'college' ? new THREE.Color(0xb9bcbf) : pick('block');
      for (const [ring, hole] of rings) {
        let u = 0;
        edges(ring, hole, (ax, az, bx, bz, L, nx, nz) => {
          const u1 = u + L / bay;
          if (podium > 0) walls.block.quad(ax, az, bx, bz, 0, podium, u, u1, 0, podium / fh, nx, nz, band);
          if (podium < b.h) walls[upper].quad(ax, az, bx, bz, podium, b.h, u, u1, podium / fh, lv, nx, nz, glass);
          // Crown: a parapet band (taller on glass towers), a shade off the facade.
          const cap = style === 'block' ? 0.35 : 0.8;
          const capCol = (style === 'block' ? band : glass).clone().multiplyScalar(style === 'block' ? 0.92 : 0.8);
          if (!hole) trim.quad(ax, az, bx, bz, b.h, b.h + cap, 0, 0, 0, 0, nx, nz, capCol);
          u = u1;
        });
      }
      roof(b, b.h + (style === 'block' ? 0.2 : 0.5), style === 'office' ? towerRoof : roofCol);
      if (style !== 'block' && lv >= 8) plantBox(b, glass);
      continue;
    }

    // The house kit (resi, shop, low), unchanged from before apart from the height.
    const skin: Skin = style === 'shop' ? 'shop' : style === 'low' || k % 5 === 0 ? 'old' : 'resi';
    const tint = pick(skin);
    const shopTint = new THREE.Color(SHOP_TINTS[k % SHOP_TINTS.length]);
    const hasShops = skin !== 'shop' && b.h > 6 && shopsOk(...mean(b.p));
    for (const [ring, hole] of rings) {
      let u = 0;
      edges(ring, hole, (ax, az, bx, bz, L, nx, nz) => {
        const u1 = u + L / BAY;
        const base = hasShops ? SHOP_H : 0;
        if (hasShops) walls.shop.quad(ax, az, bx, bz, 0, SHOP_H, u, u1, 0, 1, nx, nz, shopTint);
        if (!hole && skin !== 'shop' && L > 3 && streetSide((ax + bx) / 2 + nx * 2, (az + bz) / 2 + nz * 2)) {
          for (let d = BAY / 2; d < L - 0.5; d += BAY) {
            bays.push({ x: ax + (bx - ax) * d / L, z: az + (bz - az) * d / L, nx, nz, floors: Math.max(0, Math.floor((b.h - base) / FLOOR)), tint, shop: hasShops, k: k + Math.round(d) });
          }
        }
        walls[skin].quad(ax, az, bx, bz, base, b.h, u, u1, 0, skin === 'shop' ? 1 : (b.h - base) / FLOOR, nx, nz, skin === 'shop' ? shopTint : tint);
        u = u1;
      });
    }
    roof(b, b.h, roofCol);
    if (skin !== 'shop' && area < 600) {
      // A black water tank on the roof, as on every Kolkata house.
      const [cx, cz] = mean(b.p);
      const tank = new THREE.CylinderGeometry(0.7, 0.75, 1.3, 8).toNonIndexed();
      tank.translate(cx, b.h + 0.65, cz);
      tank.deleteAttribute('uv');
      paint(tank, tankCol);
      roofs.push(tank);
    }
  }

  /** Flat roof over the footprint (courtyards stay open). */
  function roof(b: Building, y: number, c: THREE.Color) {
    const shape = new THREE.Shape(b.p.map(([x, z]) => new THREE.Vector2(x, -z)));
    for (const h of b.holes ?? []) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    const rg = g.toNonIndexed();
    rg.deleteAttribute('uv');
    paint(rg, c);
    roofs.push(rg);
  }

  /** The lift and plant room on a tower's roof, if the footprint's middle is inside the building. */
  function plantBox(b: Building, c: THREE.Color) {
    const [cx, cz] = mean(b.p);
    if (!insidePoly(b.p, cx, cz) || (b.holes ?? []).some((h) => insidePoly(h, cx, cz))) return;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of b.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const s = Math.max(1.5, Math.min(6, Math.min(x1 - x0, z1 - z0) * 0.3)) / 2;
    const y0 = b.h, y1 = b.h + 1.8, box = c.clone().multiplyScalar(0.7);
    const sides: [number, number, number, number, number, number][] = [
      [cx - s, cz + s, cx + s, cz + s, 0, 1], [cx + s, cz + s, cx + s, cz - s, 1, 0],
      [cx + s, cz - s, cx - s, cz - s, 0, -1], [cx - s, cz - s, cx - s, cz + s, -1, 0]];
    for (const [ax, az, bx, bz, nx, nz] of sides) trim.quad(ax, az, bx, bz, y0, y1, 0, 0, 0, 0, nx, nz, box);
    const top = new THREE.PlaneGeometry(2 * s, 2 * s).toNonIndexed();
    top.rotateX(-Math.PI / 2);
    top.translate(cx, y1, cz);
    top.deleteAttribute('uv');
    paint(top, box);
    roofs.push(top);
  }

  const group = new THREE.Group();
  // Lit windows glow after dark (emissive = the facade's warm pixels only), at no extra draw calls.
  const make = (w: Wall, map: THREE.Texture, glow: number) => new THREE.Mesh(w.geometry(), glowAtNight(
    new THREE.MeshLambertMaterial({ vertexColors: true, map, emissive: 0xffd49a, emissiveMap: litMask(map), emissiveIntensity: 0 }), glow));
  const skins: [Skin, () => THREE.Texture, number][] = [['resi', facadeResidential, 0.8], ['old', facadeOld, 0.7], ['office', facadeOffice, 0.9], ['clad', facadeClad, 0.9], ['block', facadeBlock, 0.8], ['shop', facadeShop, 1]];
  for (const [s, tex, glow] of skins) if (walls[s].pos.length) group.add(make(walls[s], tex(), glow));
  if (trim.pos.length) roofs.push(trim.geometry(false));
  group.add(new THREE.Mesh(mergeGeometries(roofs), new THREE.MeshLambertMaterial({ vertexColors: true })));
  return { group, bays };
}

function mean(p: Pt[]): Pt {
  return [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
}

function paint(g: THREE.BufferGeometry, c: THREE.Color) {
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
