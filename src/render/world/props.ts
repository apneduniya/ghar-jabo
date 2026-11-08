// Street life on the real map: bus shelters with people waiting, the metro stairs, roadside trees,
// shop fronts on the café strip, puddles at Webel More. All static, batched into a few draw calls.

import * as THREE from 'three';
import { bake, box, sign } from '../gfx';
import { person } from '../models';
import type { MapData, Pt } from '../../sim/mapdata';
import type { BuildingGrid } from '../../sim/collide';
import { floods } from '../../content/sectorv';

const MAIN = new Set(['primary', 'secondary', 'tertiary']);

/** Distance from (x, z) to the nearest road centre line, minus that road's half width. */
function roadClearance(map: MapData, x: number, z: number) {
  let best = Infinity;
  for (const r of map.roads) {
    if (r.k === 'service') continue;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z) - r.w / 2);
    }
  }
  return best;
}

/** Points along a polyline every `step`, with the road direction there. */
function along(p: Pt[], step: number) {
  const out: { x: number; z: number; dx: number; dz: number }[] = [];
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const L = Math.hypot(bx - ax, bz - az);
    for (let d = step / 2; d < L; d += step) out.push({ x: ax + (bx - ax) * d / L, z: az + (bz - az) * d / L, dx: (bx - ax) / L, dz: (bz - az) / L });
  }
  return out;
}

const SHOPS = ['BURGER RAJA', 'CHA-BUCKS', 'RONG DE BASANTI DHABA', 'MOMO MAHAL', 'PUCHKA POINT', 'XEROX · LAMINATION · RECHARGE', 'BIRYANI BHAVAN', 'MAA KALI FAST FOOD'];

export function buildProps(scene: THREE.Scene, map: MapData, grid: BuildingGrid, metro: { x: number; z: number }) {
  const statics = new THREE.Group();

  // Bus shelters at the real stops, with a few people waiting.
  const seen = new Set<string>();
  for (const s of map.stops) {
    const key = `${s.n}:${Math.round(s.p[0] / 20)}:${Math.round(s.p[1] / 20)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const g = new THREE.Group();
    g.add(box(4.6, 0.18, 1.8, 0x2f6db5, 0, 2.5, 0), box(0.12, 2.5, 0.12, 0x555555, -2.1, 0, -0.7), box(0.12, 2.5, 0.12, 0x555555, 2.1, 0, -0.7));
    g.add(box(4.2, 0.12, 0.5, 0x8a8a8a, 0, 0.5, -0.5));
    for (let i = 0; i < 3; i++) {
      const p = person();
      p.position.set(-1.5 + i * 1.4, 0, 0.2);
      g.add(p);
    }
    g.position.set(s.p[0], 0, s.p[1]);
    g.rotation.y = Math.random() * Math.PI * 2;
    statics.add(g);
  }

  // Metro entrance: green walls and a roof over stairs going down.
  const ent = new THREE.Group();
  ent.add(box(3.4, 2.8, 0.3, 0x2e9e5b, 0, 0, 1.6), box(3.4, 2.8, 0.3, 0x2e9e5b, 0, 0, -1.6), box(3.8, 0.3, 3.6, 0x2e9e5b, 0, 2.8, 0));
  for (let i = 0; i < 5; i++) ent.add(box(0.5, 0.15, 2.9, 0x9a9a9a, -1.2 + i * 0.5, -0.15 * i, 0));
  ent.position.set(metro.x, 0, metro.z);
  statics.add(ent);

  // Puddles that never dry (Webel More): a cluster of shallow, sky-tinted pools rather than one slab.
  for (const f of floods) {
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, d = (i % 3) * f.r * 0.3;
      statics.add(box(f.r * (0.35 + (i % 4) * 0.08), 0.03, f.r * (0.25 + (i % 3) * 0.07), 0x7d9bb3, f.x + Math.cos(a) * d, 0.07, f.z + Math.sin(a) * d));
    }
  }

  // Shop fronts along the café strip: Street No. 13 from the PWH junction towards College More.
  const strip = map.busPath.slice(0, 2);
  let n = 0;
  for (const p of along(strip, 32)) {
    for (const side of [1, -1]) {
      const off = 8;
      const x = p.x + p.dz * off * side, z = p.z - p.dx * off * side;
      if (grid.blocked(x, z, 1.5) || roadClearance(map, x, z) < 1.5) continue;
      // The shop's front (local +z) faces the road.
      const fx = -side * p.dz, fz = side * p.dx;
      const shop = new THREE.Group();
      shop.add(box(5.5, 3, 0.4, [0xe6b8a2, 0xa8c69f, 0xd7a9c9, 0xf2c14e][n % 4], 0, 0, 0));
      shop.add(box(5.7, 0.15, 1.6, 0x7a2a1f, 0, 3, 0.8)); // awning
      shop.position.set(x, 0, z);
      shop.rotation.y = Math.atan2(fx, fz);
      statics.add(shop);
      const board = sign(SHOPS[n % SHOPS.length], 5.2, 0.8, '#2b1b12', '#ffd38a');
      board.position.set(x + fx * 0.3, 3.6, z + fz * 0.3);
      board.rotation.y = shop.rotation.y;
      scene.add(board);
      n++;
    }
  }
  bake(statics);
  scene.add(statics);

  // Roadside trees, instanced: one draw call for trunks, one for canopies.
  const spots: THREE.Vector3[] = [];
  for (const r of map.roads) {
    if (!MAIN.has(r.k) || r.b) continue;
    for (const p of along(r.p, 16)) for (const side of [1, -1]) {
      const off = r.w / 2 + 3.2;
      const x = p.x + p.dz * off * side, z = p.z - p.dx * off * side;
      if (grid.blocked(x, z, 1.2) || roadClearance(map, x, z) < 1) continue;
      spots.push(new THREE.Vector3(x, 0, z));
    }
  }
  const trunks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 2.4, 0.35).translate(0, 1.2, 0), new THREE.MeshLambertMaterial({ color: 0x5b4030 }), spots.length);
  const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7, 0).translate(0, 3.4, 0), new THREE.MeshLambertMaterial({ color: 0x4f7a3a }), spots.length);
  const m = new THREE.Matrix4();
  spots.forEach((s, i) => {
    const k = 0.8 + ((i * 37) % 10) / 20;
    m.makeScale(k, k, k).setPosition(s);
    trunks.setMatrixAt(i, m);
    canopy.setMatrixAt(i, m);
  });
  scene.add(trunks, canopy);
  return { trees: spots.length };
}
