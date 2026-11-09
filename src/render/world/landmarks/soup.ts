// A fast vertex-coloured triangle soup with the same API as northkit's Parts, for building chunk structures while
// the player moves: boxes, quads and spans are written straight into typed arrays (no BufferGeometry per box, no
// merge pass), so a chunk builds in a few milliseconds. Other shapes (cylinders, icosahedra) go through `add`.
// The result is one mesh with the shared baked material (colours plus the night `glow` attribute).

import * as THREE from 'three';
import { bakedMat } from '../../gfx';
import type { Pt } from '../../../sim/gen/types';

export type V3 = [number, number, number];

/** The unit box (±0.5) as 12 outward-wound triangles: positions and flat normals. */
const UNIT: { p: number[]; n: number[] } = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  return { p: Array.from(g.attributes.position.array), n: Array.from(g.attributes.normal.array) };
})();

/** Unit cylinders (radius 1, height 1, centred) by segment count. */
const CYL = new Map<number, { p: number[]; n: number[] }>();

const colors = new Map<number, THREE.Color>();
const col = (c: number) => { let k = colors.get(c); if (!k) { k = new THREE.Color(c); colors.set(c, k); } return k; };

export class Soup {
  private pos = new Float32Array(1 << 15);
  private nor = new Float32Array(1 << 15);
  private rgb = new Float32Array(1 << 15);
  private glw = new Float32Array(1 << 13);
  private n = 0; // vertices written

  get count() { return this.n; }

  private grow(extra: number) {
    if ((this.n + extra) * 3 <= this.pos.length) return;
    let size = this.pos.length;
    while ((this.n + extra) * 3 > size) size *= 2;
    const re = (a: Float32Array, len: number) => { const b = new Float32Array(len); b.set(a); return b; };
    this.pos = re(this.pos, size); this.nor = re(this.nor, size); this.rgb = re(this.rgb, size); this.glw = re(this.glw, size / 3);
  }

  private vert(x: number, y: number, z: number, nx: number, ny: number, nz: number, c: THREE.Color, glow: number) {
    const i = this.n * 3;
    this.pos[i] = x; this.pos[i + 1] = y; this.pos[i + 2] = z;
    this.nor[i] = nx; this.nor[i + 1] = ny; this.nor[i + 2] = nz;
    this.rgb[i] = c.r; this.rgb[i + 1] = c.g; this.rgb[i + 2] = c.b;
    this.glw[this.n++] = glow;
  }

  /** A box `w` long along `rot` (radians, as from heading()), `d` deep across it, standing on y. */
  box(w: number, h: number, d: number, x: number, y: number, z: number, rot: number, color: number, glow = 0) {
    this.grow(36);
    const c = col(color), cs = Math.cos(rot), sn = Math.sin(rot), cy = y + h / 2, P = UNIT.p, N = UNIT.n;
    for (let k = 0; k < 108; k += 3) {
      const lx = P[k] * w, ly = P[k + 1] * h, lz = P[k + 2] * d, nx = N[k], nz = N[k + 2];
      // rotateY(rot): x' = x cos + z sin, z' = -x sin + z cos
      this.vert(x + lx * cs + lz * sn, cy + ly, z - lx * sn + lz * cs, nx * cs + nz * sn, N[k + 1], -nx * sn + nz * cs, c, glow);
    }
  }

  /** A box between two ground points (a beam or wall), `h` tall from y, `d` thick. */
  span(a: Pt, b: Pt, h: number, d: number, y: number, color: number, glow = 0) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-3) return;
    this.box(L, h, d, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, -Math.atan2(b[1] - a[1], b[0] - a[0]), color, glow);
  }

  /** A flat quad a-b-c-d, two-faced by default so it shows from both sides. */
  quad(a: V3, b: V3, c: V3, d: V3, color: number, glow = 0, twoSided = true) {
    this.tri(a, b, c, color, glow); this.tri(a, c, d, color, glow);
    if (twoSided) { this.tri(a, c, b, color, glow); this.tri(a, d, c, color, glow); }
  }

  private tri(a: V3, b: V3, c: V3, color: number, glow: number) {
    this.grow(3);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1;
    nx /= L; ny /= L; nz /= L;
    const k = col(color);
    for (const p of [a, b, c]) this.vert(p[0], p[1], p[2], nx, ny, nz, k, glow);
  }

  /** A vertical cylinder standing on y; `sx` stretches it across `rot` into an oval. */
  cyl(r: number, h: number, x: number, y: number, z: number, color: number, sx = 1, rot = 0, seg = 10, glow = 0) {
    let u = CYL.get(seg);
    if (!u) {
      const g = new THREE.CylinderGeometry(1, 1, 1, seg).toNonIndexed();
      CYL.set(seg, (u = { p: Array.from(g.attributes.position.array), n: Array.from(g.attributes.normal.array) }));
    }
    const m = u.p.length / 3;
    this.grow(m);
    const c = col(color), cs = Math.cos(rot), sn = Math.sin(rot), cy = y + h / 2, P = u.p, N = u.n;
    for (let k = 0; k < m * 3; k += 3) {
      const lx = P[k] * r, ly = P[k + 1] * h, lz = P[k + 2] * r * sx;
      let nx = N[k], nz = N[k + 2] / (sx || 1);
      const L = Math.hypot(nx, N[k + 1], nz) || 1;
      nx /= L; nz /= L;
      this.vert(x + lx * cs + lz * sn, cy + ly, z - lx * sn + lz * cs, nx * cs + nz * sn, N[k + 1] / L, -nx * sn + nz * cs, c, glow);
    }
  }

  /** Any geometry, already placed in world space. */
  add(geo: THREE.BufferGeometry, color: number, glow = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position.array, nr = g.attributes.normal.array, m = g.attributes.position.count, c = col(color);
    this.grow(m);
    for (let i = 0; i < m * 3; i += 3) this.vert(p[i], p[i + 1], p[i + 2], nr[i], nr[i + 1], nr[i + 2], c, glow);
  }

  mesh(): THREE.Mesh | null {
    if (!this.n) return null;
    const g = new THREE.BufferGeometry(), k = this.n * 3;
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, k), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor.slice(0, k), 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.rgb.slice(0, k), 3));
    g.setAttribute('glow', new THREE.BufferAttribute(this.glw.slice(0, this.n), 1));
    g.computeBoundingSphere();
    this.n = 0;
    return new THREE.Mesh(g, bakedMat);
  }
}
