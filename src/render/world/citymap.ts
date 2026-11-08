// Builds the real Sector V streets from src/data/sectorv.json (OpenStreetMap, ODbL):
// road ribbons, footpaths, lane dashes, extruded building footprints, the Nabadiganta flyover
// and the Green Line viaduct with Sector V station. Everything static ends up in a handful of draw calls.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import mapData from '../../content/maps/sectorv.json';

export type Pt = [number, number]; // x, z
export interface Road { n: string; k: string; w: number; b: number; o: number; p: Pt[] }
export interface MapData {
  roads: Road[];
  rails: Pt[][];
  stations: { n: string; p: Pt }[];
  stops: { n: string; p: Pt }[];
  buildings: { p: Pt[]; h: number; n?: string }[];
  busPath: Pt[];
  pois: Record<string, Pt>;
}

export const map = mapData as unknown as MapData;

export const FLYOVER_Y = 5.5;
export const VIADUCT_Y = 9;
const ROAD_Y: Record<string, number> = { primary: 0.05, trunk: 0.05, secondary: 0.045, tertiary: 0.04, primary_link: 0.042, secondary_link: 0.042, tertiary_link: 0.038, residential: 0.03, unclassified: 0.03, service: 0.025 };
const MAIN = new Set(['primary', 'trunk', 'secondary', 'tertiary', 'primary_link', 'secondary_link']);

/** Height of a point along a bridge: ramps up over the first and last 20 units. */
function bridgeY(dist: number, total: number) {
  const ramp = Math.min(20, total / 3);
  return FLYOVER_Y * Math.min(1, Math.min(dist, total - dist) / ramp);
}

function lengths(p: Pt[]) {
  const out = [0];
  for (let i = 1; i < p.length; i++) out.push(out[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return out;
}

/** A flat strip of width w along a polyline, as a coloured geometry. heightAt gives y per point. */
function ribbon(p: Pt[], w: number, color: THREE.Color, heightAt: (i: number) => number): THREE.BufferGeometry | null {
  if (p.length < 2) return null;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const nx = -dz * w / 2, nz = dx * w / 2;
    const y = heightAt(i);
    pos.push(p[i][0] + nx, y, p[i][1] + nz, p[i][0] - nx, y, p[i][1] - nz);
    col.push(color.r, color.g, color.b, color.r, color.g, color.b);
    if (i > 0) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Ribbons wind inconsistently; force normals up so lighting is flat and even.
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g.toNonIndexed();
}

function boxGeo(w: number, h: number, d: number, x: number, y: number, z: number, rotY: number, color: THREE.Color) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.rotateY(rotY);
  g.translate(x, y + h / 2, z);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([color.r, color.g, color.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}

function windowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#5b6680';
  g.fillRect(14, 14, 36, 30);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 3, 1 / 3.2); // one window every 3 units across, every floor up
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Copy a vertex range of a non-indexed geometry into its own geometry. */
function slice(g: THREE.BufferGeometry, start: number, count: number) {
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(g.attributes)) {
    const a = attr as THREE.BufferAttribute;
    out.setAttribute(name, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
  }
  return out;
}

const PALETTE = [0xd8c3a5, 0xc9a6a0, 0xa9b8a2, 0x9fb3c8, 0xe0c27a, 0xc7b9a6, 0x8fa9c4, 0xd7a9c9, 0xbfc6cf];

export interface BuiltMap { group: THREE.Group; stationPos: THREE.Vector3; stationDir: number }

export function buildCityMap(): BuiltMap {
  const group = new THREE.Group();

  // Ground.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: 0x8d8778 }));
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Roads, footpaths and lane dashes in one geometry.
  const parts: THREE.BufferGeometry[] = [];
  const asphalt = new THREE.Color(0x4a4650), lane = new THREE.Color(0xf1ece2), path = new THREE.Color(0xb9a99a), minor = new THREE.Color(0x6e6a72);
  for (const r of map.roads) {
    const L = lengths(r.p);
    const total = L[L.length - 1];
    const hy = (base: number) => (i: number) => base + (r.b ? bridgeY(L[i], total) : 0);
    const main = MAIN.has(r.k);
    if (main && !r.b) { const f = ribbon(r.p, r.w + 3.2, path, hy(0.012)); if (f) parts.push(f); }
    const road = ribbon(r.p, r.w, main ? asphalt : minor, hy(ROAD_Y[r.k] ?? 0.03));
    if (road) parts.push(road);
    // Centre dashes on two-way main roads.
    if (main && !r.o && r.w >= 5) {
      for (let i = 1; i < r.p.length; i++) {
        const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
        const seg = Math.hypot(bx - ax, bz - az);
        const rot = -Math.atan2(bz - az, bx - ax);
        for (let d = 2; d < seg - 1; d += 5) {
          const t = d / seg;
          const y = (ROAD_Y[r.k] ?? 0.04) + 0.01 + (r.b ? bridgeY(L[i - 1] + d, total) : 0);
          parts.push(boxGeo(2, 0.01, 0.18, ax + (bx - ax) * t, y, az + (bz - az) * t, rot, lane));
        }
      }
    }
    // Flyover: a deck edge and pillars.
    if (r.b) {
      const pillar = new THREE.Color(0xb8b0a6);
      for (let i = 0; i < r.p.length; i++) {
        const y = bridgeY(L[i], total);
        if (y > 2) parts.push(boxGeo(1.2, y, 1.2, r.p[i][0], 0, r.p[i][1], 0, pillar));
      }
    }
  }

  // Green Line viaduct and Sector V station.
  const concrete = new THREE.Color(0xc9c2ba);
  for (const rail of map.rails) {
    for (let i = 1; i < rail.length; i++) {
      const [ax, az] = rail[i - 1], [bx, bz] = rail[i];
      const seg = Math.hypot(bx - ax, bz - az);
      const rot = -Math.atan2(bz - az, bx - ax);
      parts.push(boxGeo(seg + 0.4, 1.0, 3.2, (ax + bx) / 2, VIADUCT_Y, (az + bz) / 2, rot, concrete));
      for (let d = 0; d < seg; d += 14) parts.push(boxGeo(1.3, VIADUCT_Y, 1.3, ax + (bx - ax) * d / seg, 0, az + (bz - az) * d / seg, rot, concrete));
    }
  }
  const st = map.stations.find((s) => s.n === 'Salt Lake Sector V') ?? map.stations[0];
  // Station box aligned with the nearest viaduct segment.
  let stationDir = 0, best = Infinity;
  for (const rail of map.rails) for (let i = 1; i < rail.length; i++) {
    const mx = (rail[i][0] + rail[i - 1][0]) / 2, mz = (rail[i][1] + rail[i - 1][1]) / 2;
    const d = Math.hypot(mx - st.p[0], mz - st.p[1]);
    if (d < best) { best = d; stationDir = -Math.atan2(rail[i][1] - rail[i - 1][1], rail[i][0] - rail[i - 1][0]); }
  }
  parts.push(boxGeo(36, 5, 9, st.p[0], VIADUCT_Y + 1, st.p[1], stationDir, new THREE.Color(0xd9d4cc)));
  parts.push(boxGeo(38, 0.5, 10, st.p[0], VIADUCT_Y + 6, st.p[1], stationDir, new THREE.Color(0x2e9e5b)));
  const stationPos = new THREE.Vector3(st.p[0], 0, st.p[1]);

  const flat = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  group.add(flat);

  // Buildings: real footprints, extruded. Walls get a window texture tinted per building.
  const roofs: THREE.BufferGeometry[] = [];
  const walls: THREE.BufferGeometry[] = [];
  for (const b of map.buildings) {
    const shape = new THREE.Shape(b.p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: b.h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    const c = new THREE.Color(PALETTE[Math.abs(Math.round(b.p[0][0] * 7 + b.p[0][1] * 13)) % PALETTE.length]);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // ExtrudeGeometry has two groups: caps (roof and floor) and sides. Split them so each can be merged.
    for (const grp of g.groups) (grp.materialIndex === 0 ? roofs : walls).push(slice(g, grp.start, grp.count));
  }
  group.add(new THREE.Mesh(mergeGeometries(roofs), new THREE.MeshLambertMaterial({ vertexColors: true })));
  group.add(new THREE.Mesh(mergeGeometries(walls), new THREE.MeshLambertMaterial({ vertexColors: true, map: windowTexture() })));

  return { group, stationPos, stationDir };
}
