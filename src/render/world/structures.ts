// Elevated structures: the Nabadiganta flyover (a real deck on T-pillars with parapets and smooth ramps),
// the short Street 13 bridges over the Keshtopur canal (flat, with railings), and the Green Line:
// a U-girder viaduct on round pillars with Sector V station on top. Everything merges into two meshes.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Pt, Road } from '../../sim/mapdata';
import { posters } from './textures';

export const FLYOVER_H = 6.5;
export const VIADUCT_Y = 10;
const FLYOVER_MIN_LEN = 80; // shorter "bridges" in OSM are canal crossings, not flyovers
const RAMP = 45;

const concrete = new THREE.Color(0xc4bdb2), darkConcrete = new THREE.Color(0x9c958b), metroGreen = new THREE.Color(0x2e9e5b);

function boxAt(w: number, h: number, d: number, x: number, y: number, z: number, rotY: number, c: THREE.Color) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.rotateY(rotY);
  g.translate(x, y + h / 2, z);
  g.deleteAttribute('uv');
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Walk a polyline in steps, giving position, heading and distance along it. */
function* walk(p: Pt[], step: number) {
  let dist = 0;
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const L = Math.hypot(bx - ax, bz - az);
    const rot = -Math.atan2(bz - az, bx - ax);
    for (let d = 0; d < L; d += step) {
      const len = Math.min(step, L - d);
      const t = (d + len / 2) / L;
      yield { x: ax + (bx - ax) * t, z: az + (bz - az) * t, rot, len, dist: dist + d + len / 2, dx: (bx - ax) / L, dz: (bz - az) / L };
    }
    dist += L;
  }
}

export const isFlyover = (r: Road) => !!r.b && polyLen(r.p) >= FLYOVER_MIN_LEN;
export function polyLen(p: Pt[]) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }

/** Deck height along a flyover: smooth ramps up and down at each end. */
export function flyoverY(dist: number, total: number) {
  const t = Math.min(1, Math.min(dist, total - dist) / RAMP);
  return FLYOVER_H * t * t * (3 - 2 * t);
}

export interface BuiltStructures { group: THREE.Group; stationPos: THREE.Vector3; stationDir: number }

export function buildStructures(roads: Road[], rails: Pt[][], station: Pt): BuiltStructures {
  const parts: THREE.BufferGeometry[] = [];
  const posterParts: THREE.BufferGeometry[] = [];

  for (const r of roads.filter((r) => r.b)) {
    const total = polyLen(r.p);
    if (total >= FLYOVER_MIN_LEN) {
      // Flyover deck slab, parapets, and T-pillars wherever the deck is high enough.
      let nextPillar = 0;
      for (const s of walk(r.p, 4)) {
        const y = flyoverY(s.dist, total);
        parts.push(boxAt(s.len + 0.05, 0.9, r.w + 1.2, s.x, y - 0.95, s.z, s.rot, darkConcrete));
        for (const side of [1, -1]) {
          const ox = s.dz * (r.w / 2 + 0.45) * side, oz = -s.dx * (r.w / 2 + 0.45) * side;
          parts.push(boxAt(s.len + 0.05, 0.85, 0.35, s.x + ox, y - 0.05, s.z + oz, s.rot, concrete));
        }
        if (s.dist >= nextPillar && y > 3) {
          nextPillar = s.dist + 18;
          parts.push(boxAt(1.6, y - 1.9, 1.6, s.x, 0, s.z, s.rot, concrete));
          parts.push(boxAt(1.8, 0.9, r.w + 0.6, s.x, y - 1.95, s.z, s.rot, concrete)); // pillar cap
          const poster = new THREE.PlaneGeometry(1.5, 2.2);
          for (const face of [0, Math.PI]) {
            const pg = poster.clone();
            pg.rotateY(s.rot + face + Math.PI / 2);
            pg.translate(s.x + Math.cos(-s.rot + face) * 0.81, 1.6, s.z + Math.sin(-s.rot + face) * 0.81);
            posterParts.push(pg);
          }
        }
      }
    } else {
      // Short canal bridge: flat deck edges with railings.
      for (const s of walk(r.p, 2)) for (const side of [1, -1]) {
        const ox = s.dz * (r.w / 2 + 0.3) * side, oz = -s.dx * (r.w / 2 + 0.3) * side;
        parts.push(boxAt(s.len, 0.9, 0.15, s.x + ox, 0.2, s.z + oz, s.rot, concrete));
      }
    }
  }

  // Green Line: U-girder (slab plus two lips) on round pillars.
  for (const rail of rails) {
    let nextPillar = 0;
    for (const s of walk(rail, 6)) {
      parts.push(boxAt(s.len + 0.05, 0.9, 4.2, s.x, VIADUCT_Y - 0.9, s.z, s.rot, concrete));
      for (const side of [1, -1]) {
        const ox = s.dz * 2.0 * side, oz = -s.dx * 2.0 * side;
        parts.push(boxAt(s.len + 0.05, 1.3, 0.3, s.x + ox, VIADUCT_Y, s.z + oz, s.rot, concrete));
      }
      if (s.dist >= nextPillar) {
        nextPillar = s.dist + 24;
        const col = new THREE.CylinderGeometry(0.9, 1.0, VIADUCT_Y - 1.6, 10).toNonIndexed();
        col.translate(s.x, (VIADUCT_Y - 1.6) / 2, s.z);
        col.deleteAttribute('uv');
        const n = col.attributes.position.count, c = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) c.set([concrete.r, concrete.g, concrete.b], i * 3);
        col.setAttribute('color', new THREE.BufferAttribute(c, 3));
        parts.push(col, boxAt(4.4, 0.8, 1.8, s.x, VIADUCT_Y - 1.7, s.z, s.rot, concrete));
      }
    }
  }

  // Sector V station, aligned with the nearest stretch of viaduct.
  let stationDir = 0, best = Infinity;
  for (const rail of rails) for (let i = 1; i < rail.length; i++) {
    const mx = (rail[i][0] + rail[i - 1][0]) / 2, mz = (rail[i][1] + rail[i - 1][1]) / 2;
    const d = Math.hypot(mx - station[0], mz - station[1]);
    if (d < best) { best = d; stationDir = -Math.atan2(rail[i][1] - rail[i - 1][1], rail[i][0] - rail[i - 1][0]); }
  }
  const [sx, sz] = station;
  parts.push(boxAt(44, 6, 12, sx, VIADUCT_Y - 1, sz, stationDir, new THREE.Color(0xe4ded4)));
  parts.push(boxAt(46, 0.6, 14, sx, VIADUCT_Y + 5, sz, stationDir, metroGreen)); // roof
  parts.push(boxAt(44.2, 1.2, 12.2, sx, VIADUCT_Y + 3.4, sz, stationDir, metroGreen)); // fascia band
  for (const d of [-16, 0, 16]) {
    const x = sx + Math.cos(-stationDir) * d, z = sz + Math.sin(-stationDir) * d;
    parts.push(boxAt(2.2, VIADUCT_Y - 1, 2.2, x, 0, z, stationDir, concrete));
  }

  const group = new THREE.Group();
  group.add(new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ vertexColors: true })));
  if (posterParts.length) group.add(new THREE.Mesh(mergeGeometries(posterParts.map((g) => g.toNonIndexed())), new THREE.MeshLambertMaterial({ map: posters() })));
  return { group, stationPos: new THREE.Vector3(sx, 0, sz), stationDir };
}
