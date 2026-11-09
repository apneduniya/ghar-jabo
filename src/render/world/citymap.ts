// Builds the real Sector V streets from src/content/maps/sectorv.json (OpenStreetMap, ODbL):
// textured asphalt, paver footpaths, blue-and-white kerbs, raised medians, lane markings, the canal and parks,
// Kolkata buildings, the flyover and the Green Line. Static, and merged into a handful of draw calls.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import mapData from '../../content/maps/sectorv.json';
import type { MapData, Pt, Road } from '../../sim/mapdata';
import { clearance, medians, medianStyle } from '../../sim/streetlife';
import { NO_SHOPS } from '../../content/streetlife';
import { asphalt, kerbStripes, pavers } from './textures';
import { buildBuildings } from './buildings';
import { buildFrontage } from './frontage';
import { buildStructures, flyoverY, isFlyover, polyLen } from './structures';

export type { Pt };
export const map = mapData as unknown as MapData & { water: Pt[][]; green: Pt[][] };

const ROAD_Y: Record<string, number> = { primary: 0.06, trunk: 0.06, secondary: 0.055, tertiary: 0.05, primary_link: 0.052, secondary_link: 0.052, tertiary_link: 0.048, residential: 0.04, unclassified: 0.04, service: 0.035 };
const MAIN = new Set(['primary', 'trunk', 'secondary', 'tertiary', 'primary_link', 'secondary_link']);
const TEX_SCALE = 1 / 14; // asphalt texture repeats every 14 units

function cumLen(p: Pt[]) {
  const out = [0];
  for (let i = 1; i < p.length; i++) out.push(out[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return out;
}

/** A flat strip along a polyline with world-space UVs and a vertex colour. */
function ribbon(p: Pt[], w: number, color: THREE.Color, heightAt: (i: number) => number, uvScale = TEX_SCALE) {
  if (p.length < 2) return null;
  const pos: number[] = [], col: number[] = [], uv: number[] = [], nor: number[] = [];
  const left: number[][] = [], right: number[][] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const y = heightAt(i);
    left.push([p[i][0] - dz * w / 2, y, p[i][1] + dx * w / 2]);
    right.push([p[i][0] + dz * w / 2, y, p[i][1] - dx * w / 2]);
  }
  const push = (v: number[]) => { pos.push(...v); uv.push(v[0] * uvScale, v[2] * uvScale); col.push(color.r, color.g, color.b); nor.push(0, 1, 0); };
  for (let i = 1; i < p.length; i++) {
    // Two triangles per segment, wound to face up.
    const [l0, r0, l1, r1] = [left[i - 1], right[i - 1], left[i], right[i]];
    const up = (r0[0] - l0[0]) * (l1[2] - l0[2]) - (r0[2] - l0[2]) * (l1[0] - l0[0]) < 0;
    if (up) { push(l0); push(r0); push(l1); push(l1); push(r0); push(r1); }
    else { push(l0); push(l1); push(r0); push(l1); push(r1); push(r0); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/**
 * A low vertical strip along a road edge (the kerb), textured with blue-and-white blocks. Pieces whose outside
 * is another carriageway are left out: no kerb across a junction mouth or between a divided road's two halves.
 */
function kerb(p: Pt[], offset: number, heightAt: (i: number) => number, roads: Road[]) {
  const pos: number[] = [], uv: number[] = [], nor: number[] = [];
  const L = cumLen(p);
  const side = Math.sign(offset);
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const ux = (bx - ax) / len, uz = (bz - az) / len, nx = uz * offset, nz = -ux * offset;
    const y0 = heightAt(i - 1), y1 = heightAt(i);
    const n = Math.max(1, Math.ceil(len / 3));
    for (let k = 0; k < n; k++) {
      const t0 = (k / n) * len, t1 = ((k + 1) / n) * len;
      const mx = ax + ux * (t0 + t1) / 2 + nx + uz * side * 0.6, mz = az + uz * (t0 + t1) / 2 + nz - ux * side * 0.6;
      if (clearance(roads, mx, mz) < 0) continue;
      kerbQuad(pos, uv, nor, [ax + ux * t0 + nx, az + uz * t0 + nz], [ax + ux * t1 + nx, az + uz * t1 + nz], y0, y1, (L[i - 1] + t0) / 1.2, (L[i - 1] + t1) / 1.2, [nx / Math.abs(offset), nz / Math.abs(offset)]);
    }
  }
  return kerbGeo(pos, uv, nor);
}

function kerbQuad(pos: number[], uv: number[], nor: number[], A: number[], B: number[], y0: number, y1: number, u0: number, u1: number, n: number[]) {
  const quad = [[A[0], y0, A[1], u0, 0], [B[0], y1, B[1], u1, 0], [B[0], y1 + 0.28, B[1], u1, 1], [A[0], y0, A[1], u0, 0], [B[0], y1 + 0.28, B[1], u1, 1], [A[0], y0 + 0.28, A[1], u0, 1]];
  for (const q of quad) { pos.push(q[0], q[1], q[2]); uv.push(q[3], q[4]); nor.push(n[0], 0, n[1]); }
}

function kerbGeo(pos: number[], uv: number[], nor: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** Raised medians between the halves of divided roads: kerbed sides and a grass or earth top. */
function medianGeometry(roads: Road[]) {
  const pos: number[] = [], uv: number[] = [], nor: number[] = [];
  const tops: THREE.BufferGeometry[] = [];
  medians(roads).forEach((m, i) => {
    const { kind, width } = medianStyle(m);
    const hw = width / 2, nx = m.dz, nz = -m.dx, h = m.len / 2 + 0.02;
    for (const s of [1, -1]) {
      const A = [m.x - m.dx * h + nx * hw * s, m.z - m.dz * h + nz * hw * s], B = [m.x + m.dx * h + nx * hw * s, m.z + m.dz * h + nz * hw * s];
      kerbQuad(pos, uv, nor, A, B, 0.03, 0.03, i * m.len / 1.2, (i + 1) * m.len / 1.2, [nx * s, nz * s]);
    }
    const top = new THREE.PlaneGeometry(m.len + 0.04, width).toNonIndexed();
    top.rotateX(-Math.PI / 2);
    top.rotateY(-Math.atan2(m.dz, m.dx));
    top.translate(m.x, 0.31, m.z);
    top.deleteAttribute('uv');
    const c = new THREE.Color(kind === 'pipe' || kind === 'barrier' ? 0x7d6f58 : kind === 'island' ? 0x9a958c : 0x5f7f3f);
    const n = top.attributes.position.count, col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) col.set([c.r, c.g, c.b], k * 3);
    top.setAttribute('color', new THREE.BufferAttribute(col, 3));
    tops.push(top);
  });
  return { kerbs: kerbGeo(pos, uv, nor), tops };
}

function flatPoly(p: Pt[], y: number, color: THREE.Color) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)))).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  g.deleteAttribute('uv');
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([color.r, color.g, color.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export interface BuiltMap { group: THREE.Group; stationPos: THREE.Vector3; stationDir: number; cull: (x: number, z: number) => void }

export function buildCityMap(): BuiltMap {
  const group = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshLambertMaterial({ color: 0x8a8174 }));
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const roads: THREE.BufferGeometry[] = [], paths: THREE.BufferGeometry[] = [], kerbs: THREE.BufferGeometry[] = [], marks: THREE.BufferGeometry[] = [];
  const mainCol = new THREE.Color(0xffffff), minorCol = new THREE.Color(0xc9c4c0), pathCol = new THREE.Color(0xffffff), white = new THREE.Color(0xf1ece2), yellow = new THREE.Color(0xf2c230);

  for (const r of map.roads) {
    const L = cumLen(r.p), total = L[L.length - 1];
    const fly = isFlyover(r);
    const lift = (i: number) => (fly ? flyoverY(L[i], total) : r.b ? 0.2 : 0);
    const main = MAIN.has(r.k);
    const road = ribbon(r.p, r.w, main ? mainCol : minorCol, (i) => (ROAD_Y[r.k] ?? 0.04) + lift(i));
    if (road) roads.push(road);
    if (main && !r.b) {
      const fp = ribbon(r.p, r.w + 5, pathCol, () => 0.03, 1 / 2.2);
      if (fp) paths.push(fp);
      for (const side of [1, -1]) kerbs.push(kerb(r.p, (r.w / 2) * side, () => 0.03, map.roads));
    }
    // Lane markings: dashed white centre line on two-way roads, solid yellow edge on one-way carriageways.
    if (main && r.w >= 5) {
      for (let i = 1; i < r.p.length; i++) {
        const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
        const seg = Math.hypot(bx - ax, bz - az);
        const dx = (bx - ax) / seg, dz = (bz - az) / seg;
        for (let d = 1; d < seg - 1; d += 5) {
          const x = ax + dx * d, z = az + dz * d, y = (ROAD_Y[r.k] ?? 0.05) + 0.012 + (fly ? flyoverY(L[i - 1] + d, total) : r.b ? 0.2 : 0);
          const dash = r.o ? [x + dz * (r.w / 2 - 0.4), z - dx * (r.w / 2 - 0.4)] : [x, z];
          const g = new THREE.PlaneGeometry(r.o ? 4.8 : 2.2, r.o ? 0.14 : 0.18).toNonIndexed();
          g.rotateX(-Math.PI / 2);
          g.rotateY(-Math.atan2(dz, dx));
          g.translate(dash[0], y, dash[1]);
          g.deleteAttribute('uv');
          const c = r.o ? yellow : white;
          const n = g.attributes.position.count, col = new Float32Array(n * 3);
          for (let k = 0; k < n; k++) col.set([c.r, c.g, c.b], k * 3);
          g.setAttribute('color', new THREE.BufferAttribute(col, 3));
          marks.push(g);
        }
      }
    }
  }

  const med = medianGeometry(map.roads);
  kerbs.push(med.kerbs);
  marks.push(...med.tops);

  // Water and parks.
  const flats: THREE.BufferGeometry[] = [];
  for (const g of map.green ?? []) flats.push(flatPoly(g, 0.012, new THREE.Color(0x6d8f4e)));
  const water = (map.water ?? []).map((w) => flatPoly(w, 0.02, new THREE.Color(0x3d6f86)));

  group.add(new THREE.Mesh(mergeGeometries(roads), new THREE.MeshLambertMaterial({ vertexColors: true, map: asphalt() })));
  group.add(new THREE.Mesh(mergeGeometries(paths), new THREE.MeshLambertMaterial({ vertexColors: true, map: pavers() })));
  group.add(new THREE.Mesh(mergeGeometries(kerbs), new THREE.MeshLambertMaterial({ map: kerbStripes() })));
  group.add(new THREE.Mesh(mergeGeometries([...marks, ...flats]), new THREE.MeshLambertMaterial({ vertexColors: true })));
  if (water.length) group.add(new THREE.Mesh(mergeGeometries(water), new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 80, specular: 0x88aacc })));

  // Which wall midpoints face a main road: those get balconies, awnings and signs.
  const mainSegs: number[][] = [];
  // Main roads and the side lanes alike (not private service roads): the culling cells keep this cheap.
  for (const r of map.roads) if (r.k !== 'service' && !r.b) for (let i = 1; i < r.p.length; i++) mainSegs.push([...r.p[i - 1], ...r.p[i], r.w]);
  const streetSide = (x: number, z: number) => mainSegs.some(([ax, az, bx, bz, w]) => {
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return Math.hypot(ax + dx * t - x, az + dz * t - z) < w / 2 + 9;
  });
  // No shop signs on the campus walls and offices the surveys walked past (content/streetlife.ts NO_SHOPS).
  const shopsOk = (x: number, z: number) => !NO_SHOPS.some(({ a, b, r }) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z) < r;
  });
  const b = buildBuildings(map.buildings, streetSide, shopsOk);
  const frontage = buildFrontage(b.bays);
  group.add(b.group, frontage.group);

  const st = map.stations.find((s) => s.n === 'Salt Lake Sector V') ?? map.stations[0];
  const s = buildStructures(map.roads, map.rails, st.p);
  group.add(s.group);
  return { group, stationPos: s.stationPos, stationDir: s.stationDir, cull: frontage.cull };
}

export { polyLen };
