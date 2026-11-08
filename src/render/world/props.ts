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

const ADS = [
  ['RAPI-NAH', 'Captain 2 min away. Always.', '#ffd400', '#111'],
  ['TEN MINUTE', 'We deliver faster than your bus', '#6b2bd9', '#fff'],
  ['SECTOR V HEIGHTS', '2BHK with canal view (monsoon only)', '#1f5f9a', '#fff'],
  ['TAKA PAY', 'Pay the conductor. In coins. Exact change.', '#0e8a5b', '#fff'],
  ['MISHTI MOBILE', 'Unlimited data, limited signal in Sector V', '#e2402c', '#fff'],
];

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
  // Electric poles with tangled, sagging wires along the main roads; the odd bundle crosses the road.
  const wire: number[] = [];
  const poleCol = 0x8d8d8d;
  for (const r of map.roads) {
    if (!MAIN.has(r.k) || r.b) continue;
    let prev: THREE.Vector3 | null = null;
    for (const p of along(r.p, 22)) {
      const off = r.w / 2 + 2.2;
      const x = p.x - p.dz * off, z = p.z + p.dx * off;
      if (grid.blocked(x, z, 0.8)) { prev = null; continue; }
      statics.add(box(0.28, 7.5, 0.28, poleCol, x, 0, z), box(1.6, 0.12, 0.12, 0x6b6b6b, x, 7.0, z));
      const top = new THREE.Vector3(x, 7.0, z);
      if (prev && prev.distanceTo(top) < 30) {
        for (let k = 0; k < 4; k++) {
          const o = (k - 1.5) * 0.18, sag = 0.6 + k * 0.25;
          const a = prev.clone().add(new THREE.Vector3(0, o, 0)), c = top.clone().add(new THREE.Vector3(0, o, 0));
          const mid = a.clone().lerp(c, 0.5).add(new THREE.Vector3(0, -sag, 0));
          wire.push(a.x, a.y, a.z, mid.x, mid.y, mid.z, mid.x, mid.y, mid.z, c.x, c.y, c.z);
        }
      }
      // Every few poles, a bundle of wires across the road to the other side.
      if (Math.abs(Math.round(x * 3 + z * 7)) % 4 === 0) {
        const fx = p.x + p.dz * off, fz = p.z - p.dx * off;
        for (let k = 0; k < 3; k++) wire.push(x, 6.8 - k * 0.15, z, (x + fx) / 2, 5.6 - k * 0.2, (z + fz) / 2, (x + fx) / 2, 5.6 - k * 0.2, (z + fz) / 2, fx, 6.6, fz);
      }
      prev = top;
    }
  }
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  scene.add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x1c1c1c })));

  // Tea stalls (cha dokan) by the busy stops: a counter, a blue tarp, a bench, a kettle and customers.
  for (const s of map.stops.filter((_, i) => i % 3 === 0)) {
    const g = new THREE.Group();
    g.add(box(2.2, 1.0, 1.0, 0x8a5a3c, 0, 0, 0), box(2.6, 0.08, 1.8, 0x2f6db5, 0, 2.3, 0.3));
    g.add(box(0.06, 2.3, 0.06, 0x555555, -1.2, 0, 1.1), box(0.06, 2.3, 0.06, 0x555555, 1.2, 0, 1.1));
    g.add(box(2.4, 0.45, 0.4, 0x6b4a33, 0, 0, 1.6)); // bench
    g.add(box(0.3, 0.35, 0.3, 0x9a9a9a, -0.6, 1.0, 0)); // kettle
    for (let i = 0; i < 2; i++) { const pp = person(); pp.position.set(-0.6 + i * 1.2, 0, 2.2); pp.rotation.y = Math.PI; g.add(pp); }
    g.position.set(s.p[0] + 6, 0, s.p[1] + 3);
    g.rotation.y = (s.p[0] * 13) % 6;
    if (!grid.blocked(g.position.x, g.position.z, 2)) statics.add(g);
  }

  bake(statics);
  scene.add(statics);

  // Billboards with parody ads on tall frames near the junction and the flyover.
  const spotsAd = [[-30, -40], [40, -25], [-120, -150], [150, 90], [-60, 120]];
  spotsAd.forEach(([x, z], i) => {
    if (grid.blocked(x, z, 1)) return;
    const [title, line, bg, fg] = ADS[i % ADS.length];
    const frame = new THREE.Group();
    frame.add(box(0.3, 9, 0.3, 0x555555, -3, 0, 0), box(0.3, 9, 0.3, 0x555555, 3, 0, 0));
    bake(frame);
    const face = adBoard(title, line, bg, fg);
    face.position.set(0, 10.2, 0.2);
    frame.add(face);
    frame.position.set(x, 0, z);
    frame.rotation.y = Math.atan2(-x, -z); // face the PWH junction
    scene.add(frame);
  });

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

/** A billboard face: brand in big letters, the punchline under it. */
function adBoard(title: string, line: string, bg: string, fg: string) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.fillStyle = fg; g.textAlign = 'center';
  g.font = 'bold 84px system-ui, sans-serif';
  g.fillText(title, 256, 120);
  g.font = '30px system-ui, sans-serif';
  g.fillText(line, 256, 190);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 246);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
}
