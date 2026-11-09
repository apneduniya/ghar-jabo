// A growable vertex buffer for streamed chunks: position, normal, colour, uv (in tile repeats), `glow` and `tile`
// (which atlas region the uv maps into, see chunkatlas.ts). Everything a chunk draws is appended here and turned
// into ONE BufferGeometry, so a chunk costs one draw call. Pure three.js maths: no DOM, safe in unit tests.

import * as THREE from 'three';
import type { Pt } from '../../sim/gen/types';
import { Tile } from './chunkatlas';

export type Rgb = THREE.Color;

const UNIT_BOX: { n: [number, number, number]; c: [number, number, number][] }[] = [
  // Unit box: x and z in -0.5..0.5, y in 0..1. Corners counter-clockwise seen from outside.
  { n: [0, 0, 1], c: [[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]] },
  { n: [0, 0, -1], c: [[0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5]] },
  { n: [1, 0, 0], c: [[0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5]] },
  { n: [-1, 0, 0], c: [[-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5]] },
  { n: [0, 1, 0], c: [[-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5]] },
  { n: [0, -1, 0], c: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]] },
];

const v3 = new THREE.Vector3(), n3 = new THREE.Vector3(), nm = new THREE.Matrix3();
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();

/** A placement matrix: translate (x, y, z), rotate (rx, ry), scale (sx, sy, sz). */
export function place(x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, out = new THREE.Matrix4()) {
  return out.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, 0, 'YXZ')), tmpS.set(sx, sy, sz));
}

export class GeoBuf {
  // Growable typed arrays: one vertex is 13 floats (position, normal, colour, uv, glow, tile).
  private f = new Float32Array(13 * 4096);
  private n = 0;
  private ix = new Uint32Array(6 * 4096);
  private ni = 0;

  get vertices() { return this.n; }
  get indices() { return this.ni; }

  vert(x: number, y: number, z: number, nx: number, ny: number, nz: number, c: Rgb, u: number, v: number, glow: number, tile: number) {
    if ((this.n + 1) * 13 > this.f.length) { const g = new Float32Array(this.f.length * 2); g.set(this.f); this.f = g; }
    const f = this.f, o = this.n * 13;
    f[o] = x; f[o + 1] = y; f[o + 2] = z; f[o + 3] = nx; f[o + 4] = ny; f[o + 5] = nz;
    f[o + 6] = c.r; f[o + 7] = c.g; f[o + 8] = c.b; f[o + 9] = u; f[o + 10] = v; f[o + 11] = glow; f[o + 12] = tile;
    return this.n++;
  }

  private tri(a: number, b: number, c: number) {
    if (this.ni + 3 > this.ix.length) { const g = new Uint32Array(this.ix.length * 2); g.set(this.ix); this.ix = g; }
    this.ix[this.ni++] = a; this.ix[this.ni++] = b; this.ix[this.ni++] = c;
  }

  /** Quad a-b-c-d (counter-clockwise from the front) with uvs per corner. */
  quad(a: number[], b: number[], c: number[], d: number[], n: number[], col: Rgb, uvs: number[][], glow = 0, tile: number = Tile.white) {
    const i = this.vert(a[0], a[1], a[2], n[0], n[1], n[2], col, uvs[0][0], uvs[0][1], glow, tile);
    this.vert(b[0], b[1], b[2], n[0], n[1], n[2], col, uvs[1][0], uvs[1][1], glow, tile);
    this.vert(c[0], c[1], c[2], n[0], n[1], n[2], col, uvs[2][0], uvs[2][1], glow, tile);
    this.vert(d[0], d[1], d[2], n[0], n[1], n[2], col, uvs[3][0], uvs[3][1], glow, tile);
    this.tri(i, i + 1, i + 2); this.tri(i, i + 2, i + 3);
  }

  /**
   * A vertical wall quad from (ax, az) to (bx, bz), y0..y1, facing (nx, nz). The winding is fixed up so the
   * front faces along the normal. u runs u0..u1 along the wall, v v0..v1 up it.
   */
  wall(ax: number, az: number, bx: number, bz: number, y0: number, y1: number, nx: number, nz: number, col: Rgb, u0: number, u1: number, v0: number, v1: number, tile: number, glow = 0) {
    if (-(bz - az) * nx + (bx - ax) * nz < 0) { [ax, bx] = [bx, ax]; [az, bz] = [bz, az]; [u0, u1] = [u1, u0]; }
    this.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [nx, 0, nz], col, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], glow, tile);
  }

  /** A unit box (x, z centred, y from 0 to 1) under matrix `m`. One colour, white tile unless given. */
  box(m: THREE.Matrix4, col: Rgb, glow = 0, bottom = false, tile: number = Tile.white) {
    nm.getNormalMatrix(m);
    for (let f = 0; f < (bottom ? 6 : 5); f++) {
      const face = UNIT_BOX[f];
      n3.set(...face.n).applyMatrix3(nm).normalize();
      const base = this.vertices;
      for (const c of face.c) {
        v3.set(c[0], c[1], c[2]).applyMatrix4(m);
        this.vert(v3.x, v3.y, v3.z, n3.x, n3.y, n3.z, col, 0.5, 0.5, glow, tile);
      }
      this.tri(base, base + 1, base + 2); this.tri(base, base + 2, base + 3);
    }
  }

  /** Box sized w × h × d standing at (x, y, z), turned `ry` (three.js rotation.y), inside an optional parent frame. */
  boxAt(parent: THREE.Matrix4 | null, x: number, y: number, z: number, w: number, h: number, d: number, ry: number, col: Rgb, glow = 0, rx = 0) {
    const m = place(x, y, z, ry, w, h, d, rx, tmpM);
    if (parent) m.premultiply(parent);
    this.box(m, col, glow);
  }

  /** Append a three.js geometry (indexed or not) under matrix `m`, painted `col` (or its own colour attribute). */
  geometry(g: THREE.BufferGeometry, m: THREE.Matrix4, col: Rgb | null, glow = 0, tile: number = Tile.white) {
    nm.getNormalMatrix(m);
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    const base = this.vertices;
    const tmpC = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      v3.fromBufferAttribute(p, i).applyMatrix4(m);
      if (n) n3.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); else n3.set(0, 1, 0);
      const cc = col ?? (c ? tmpC.fromBufferAttribute(c, i) : tmpC.set(1, 1, 1));
      this.vert(v3.x, v3.y, v3.z, n3.x, n3.y, n3.z, cc, 0.5, 0.5, glow, tile);
    }
    if (g.index) for (let i = 0; i < g.index.count; i += 3) this.tri(base + g.index.getX(i), base + g.index.getX(i + 1), base + g.index.getX(i + 2));
    else for (let i = 0; i < p.count; i += 3) this.tri(base + i, base + i + 1, base + i + 2);
  }

  /** A flat polygon (triangulated, convex or not) at height y, facing up. UVs are world x/z times `uvScale`. */
  flat(ring: Pt[], y: number, col: Rgb, tile: number = Tile.white, uvScale = 1, glow = 0) {
    if (ring.length < 3) return;
    const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const base = this.vertices;
    for (const [x, z] of ring) this.vert(x, y, z, 0, 1, 0, col, x * uvScale, z * uvScale, glow, tile);
    for (const [a, b, c] of tris) {
      // Face up (+y): with x east and z south, the triangle must wind clockwise in (x, z).
      const [ax, az] = ring[a], [bx, bz] = ring[b], [cx, cz] = ring[c];
      const cross = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      if (cross > 0) this.tri(base + a, base + c, base + b); else this.tri(base + a, base + b, base + c);
    }
  }

  /** A disc fan facing up: `glow` in the middle falling to `rimGlow` at the edge. */
  disc(x: number, z: number, r: number, y: number, col: Rgb, glow: number, rimGlow: number, tile: number, seg = 10, squash = 1, uvScale = 1, lumpy = true) {
    const base = this.vert(x, y, z, 0, 1, 0, col, x * uvScale, z * uvScale, glow, tile);
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2, rr = lumpy ? r * (0.85 + 0.15 * Math.sin(k * 2.7 + x)) : r;
      const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr * squash;
      this.vert(px, y, pz, 0, 1, 0, col, px * uvScale, pz * uvScale, rimGlow, tile);
    }
    for (let k = 0; k < seg; k++) this.tri(base, base + 1 + ((k + 1) % seg), base + 1 + k);
  }

  /**
   * A flat strip along a polyline, `w` wide, at height y, uv = world coords times uvScale (so textures line up
   * across pieces and chunks). Offset shifts the strip sideways (left is +).
   */
  ribbon(p: Pt[], w: number, y: number, col: Rgb, tile: number, uvScale: number, offset = 0, glow = 0) {
    if (p.length < 2) return;
    const L: number[][] = [], R: number[][] = [];
    for (let i = 0; i < p.length; i++) {
      const [nx, nz] = normalAt(p, i);
      L.push([p[i][0] + nx * (offset + w / 2), p[i][1] + nz * (offset + w / 2)]);
      R.push([p[i][0] + nx * (offset - w / 2), p[i][1] + nz * (offset - w / 2)]);
    }
    for (let i = 1; i < p.length; i++) {
      const a = L[i - 1], b = R[i - 1], c = R[i], d = L[i];
      const quad = [a, b, c, d];
      const up = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]) < 0;
      const order = up ? quad : [a, d, c, b];
      const base = this.vertices;
      for (const q of order) this.vert(q[0], y, q[1], 0, 1, 0, col, q[0] * uvScale, q[1] * uvScale, glow, tile);
      this.tri(base, base + 1, base + 2); this.tri(base, base + 2, base + 3);
    }
  }

  /** The finished geometry: one interleaved buffer, so building it is a single copy. Call once. */
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    const ib = new THREE.InterleavedBuffer(this.f.slice(0, this.n * 13), 13);
    g.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 3, 0));
    g.setAttribute('normal', new THREE.InterleavedBufferAttribute(ib, 3, 3));
    g.setAttribute('color', new THREE.InterleavedBufferAttribute(ib, 3, 6));
    g.setAttribute('uv', new THREE.InterleavedBufferAttribute(ib, 2, 9));
    g.setAttribute('glow', new THREE.InterleavedBufferAttribute(ib, 1, 11));
    g.setAttribute('tile', new THREE.InterleavedBufferAttribute(ib, 1, 12));
    const idx = this.n > 65535 ? this.ix.slice(0, this.ni) : Uint16Array.from(this.ix.subarray(0, this.ni));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** Unit left normal of a polyline at vertex i (averaged over its neighbours). Left = +90° from the direction. */
export function normalAt(p: Pt[], i: number): [number, number] {
  const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
  return [dz / L, -dx / L];
}

export function polyLength(p: Pt[]) {
  let s = 0;
  for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return s;
}

/** Walk a polyline every `step` units from `start`: (x, z, unit direction dx, dz, distance). */
export function along(p: Pt[], step: number, start: number, each: (x: number, z: number, dx: number, dz: number, d: number) => void) {
  let acc = 0, next = start;
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-6) continue;
    const dx = (bx - ax) / L, dz = (bz - az) / L;
    while (next <= acc + L) { const t = next - acc; each(ax + dx * t, az + dz * t, dx, dz, next); next += step; }
    acc += L;
  }
}

/** Distance from (x, z) to segment a-b. */
export function segDist(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
  return Math.hypot(ax + dx * t - x, az + dz * t - z);
}

/** Distance from (x, z) to a polyline. */
export function polyDist(p: Pt[], x: number, z: number) {
  let d = Infinity;
  for (let i = 1; i < p.length; i++) d = Math.min(d, segDist(x, z, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]));
  return d;
}
