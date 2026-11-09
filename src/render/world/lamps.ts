// Street lighting from the surveys: three-globe "trident" lamp posts along the footpaths (OSM street lamps
// where mapped), tall single-arm lights on the medians, the high mast at PwC More, and warm pools of light that
// fade in at night. Overhead wires only where the surveys saw them (Wipro More east, College More, Street 18).
// Posts and globes bake into the dressing (globes glow via `userData.glow`); pools and wires are one call each.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box } from '../gfx';
import { fadeInAtNight } from '../sky';
import { WIRE_ZONES } from '../../content/streetlife';
import type { MapData } from '../../sim/mapdata';
import type { StreetLayout } from '../../sim/streetlayout';
import { clearance, nearestRoad } from '../../sim/streetlife';

const MAIN = new Set(['primary', 'secondary', 'tertiary']);
const POST = 0xe8e6df, GLOBE = 0xfff6dc, IRON = 0x55585c;
const RADIUS = 330;

function trident(root: THREE.Object3D, x: number, z: number, rot: number) {
  const g = new THREE.Group();
  g.add(box(0.32, 0.5, 0.32, POST, 0, 0, 0), box(0.14, 4.4, 0.14, POST, 0, 0.5, 0));
  for (const [ax, ay] of [[-0.55, 4.0], [0.55, 4.0], [0, 4.7]]) {
    if (ax) { const arm = box(0.6, 0.06, 0.06, POST, ax / 2, ay + 0.15, 0); g.add(arm); }
    const globe = box(0.36, 0.42, 0.36, GLOBE, ax, ay + 0.2, 0);
    globe.userData.glow = 2.6;
    g.add(globe);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  root.add(g);
}

function medianLight(root: THREE.Object3D, x: number, z: number, dx: number, dz: number, side: number) {
  const g = new THREE.Group();
  g.add(box(0.22, 8.2, 0.22, IRON, 0, 0.28, 0), box(2.2, 0.1, 0.1, IRON, 1.1, 8.3, 0));
  const head = box(0.8, 0.14, 0.32, 0xf4f6ff, 2.1, 8.2, 0);
  head.userData.glow = 2.2;
  g.add(head);
  g.position.set(x, 0, z);
  // The arm reaches over one carriageway: along the normal (dz, -dx) times side.
  g.rotation.y = -Math.atan2(-dx * side, dz * side);
  root.add(g);
}

export function buildLamps(root: THREE.Object3D, map: MapData, layout: StreetLayout) {
  const pools: [number, number, number][] = [];
  const lamps: [number, number][] = [];
  const add = (x: number, z: number) => {
    if (lamps.some(([a, b]) => Math.hypot(a - x, b - z) < 5)) return;
    if (layout.units.some((u) => Math.hypot(u.x - x, u.z - z) < u.w / 2 + 0.8)) return;
    const r = nearestRoad(map.roads, x, z);
    lamps.push([x, z]);
    trident(root, x, z, Math.atan2(r.dx, r.dz));
    pools.push([x + (r.x - x) * 0.3, z + (r.z - z) * 0.3, 2.8]);
  };
  // OSM street lamps first, nudged onto the footpath edge if they were mapped on the carriageway.
  for (const [x0, z0] of map.lamps ?? []) {
    if (Math.hypot(x0, z0) > RADIUS) continue;
    let x = x0, z = z0;
    const r = nearestRoad(map.roads, x, z);
    for (let k = 0; k < 20 && clearance(map.roads, x, z) < 0.4; k++) {
      const d = Math.hypot(x - r.x, z - r.z) || 1;
      x += ((x - r.x) / d || -r.dz) * 0.5; z += ((z - r.z) / d || r.dx) * 0.5;
    }
    add(x, z);
  }
  // Then every main road's outer footpaths, about every 15 units, staggered between the two sides.
  for (const r of map.roads) {
    if (!MAIN.has(r.k) || r.b) continue;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
      for (let s = 3; s < L; s += 15) for (const side of [1, -1]) {
        const t = s + (side > 0 ? 0 : 7.5);
        if (t >= L) continue;
        const off = r.w / 2 + 0.55, x = ax + dx * t + dz * off * side, z = az + dz * t - dx * off * side;
        const c = clearance(map.roads, x, z);
        if (Math.hypot(x, z) > RADIUS || c < 0.3 || c > 0.9) continue; // on another carriageway, or not at a kerb
        add(x, z);
      }
    }
  }
  // Median lights, alternating which carriageway the arm reaches over.
  layout.medians.forEach((p, i) => {
    if (i % 8 !== 0 || Math.hypot(p.x, p.z) > RADIUS) return;
    const side = (i / 8) % 2 ? 1 : -1;
    medianLight(root, p.x, p.z, p.dx, p.dz, side);
    pools.push([p.x + p.dz * side * 2.6, p.z - p.dx * side * 2.6, 3.4]);
  });
  for (const s of layout.spots) if (s.spot.kind === 'highMast') pools.push([s.x, s.z, 14]);

  const poolGeo = mergeGeometries(pools.map(([x, z, r]) => new THREE.CircleGeometry(r, 14).rotateX(-Math.PI / 2).translate(x, 0.07, z)));
  const poolMat = fadeInAtNight(new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), 0.24);
  root.add(new THREE.Mesh(poolGeo, poolMat));
  wires(root, map);
  return { lamps: lamps.length };
}

/** Poles with sagging bundles of wire, and the odd bundle across the road: only inside WIRE_ZONES. */
function wires(root: THREE.Object3D, map: MapData) {
  const zone = (x: number, z: number) => WIRE_ZONES.some((w) => Math.hypot(w.x - x, w.z - z) < w.r);
  const wire: number[] = [];
  for (const r of map.roads) {
    if (!MAIN.has(r.k) || r.b) continue;
    let prev: THREE.Vector3 | null = null;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
      for (let s = 6; s < L; s += 18) {
        const off = r.w / 2 + 1.0, x = ax + dx * s - dz * off, z = az + dz * s + dx * off;
        if (!zone(x, z) || clearance(map.roads, x, z) < 0.5) { prev = null; continue; }
        root.add(box(0.26, 7.2, 0.26, 0x8d8d8d, x, 0, z), box(1.4, 0.1, 0.1, 0x6b6b6b, x, 6.8, z));
        const top = new THREE.Vector3(x, 6.8, z);
        if (prev && prev.distanceTo(top) < 30) {
          for (let k = 0; k < 4; k++) {
            const o = (k - 1.5) * 0.16, sag = 0.5 + k * 0.22;
            const a = prev.clone().setY(prev.y + o), c = top.clone().setY(top.y + o), mid = a.clone().lerp(c, 0.5).setY((a.y + c.y) / 2 - sag);
            wire.push(a.x, a.y, a.z, mid.x, mid.y, mid.z, mid.x, mid.y, mid.z, c.x, c.y, c.z);
          }
        }
        if (Math.abs(Math.round(x * 3 + z * 7)) % 3 === 0) { // a bundle across the road
          const fx = x + dz * (off * 2), fz = z - dx * (off * 2);
          for (let k = 0; k < 3; k++) wire.push(x, 6.7 - k * 0.15, z, (x + fx) / 2, 5.7 - k * 0.2, (z + fz) / 2, (x + fx) / 2, 5.7 - k * 0.2, (z + fz) / 2, fx, 6.5, fz);
        }
        prev = top;
      }
    }
  }
  if (!wire.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  root.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1c1c1c })));
}
