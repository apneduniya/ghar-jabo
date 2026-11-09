// northkit: a small geometry kit for the static north (flyover, viaducts, stations, canal): every piece is a vertex-coloured
// triangle soup with a night `glow` value, merged at the end into one mesh with the shared baked material.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakedMat } from '../gfx';
import type { Pt } from '../../sim/mapdata';

export type V3 = [number, number, number];
const colors = new Map<number, THREE.Color>();
const col = (c: number) => { let k = colors.get(c); if (!k) { k = new THREE.Color(c); colors.set(c, k); } return k; };

export class Parts {
  private geos: THREE.BufferGeometry[] = [];

  add(geo: THREE.BufferGeometry, color: number, glow = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g.attributes.uv) g.deleteAttribute('uv');
    const n = g.attributes.position.count, c = col(color), cs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { cs[i * 3] = c.r; cs[i * 3 + 1] = c.g; cs[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(cs, 3));
    g.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(n).fill(glow), 1));
    this.geos.push(g);
  }

  /** A box `w` long along `rot` (radians, as from heading()), `d` deep across it, standing on y. */
  box(w: number, h: number, d: number, x: number, y: number, z: number, rot: number, color: number, glow = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.rotateY(rot);
    g.translate(x, y + h / 2, z);
    this.add(g, color, glow);
  }

  /** A vertical cylinder standing on y; `sx` stretches it across `rot` into an oval. */
  cyl(r: number, h: number, x: number, y: number, z: number, color: number, sx = 1, rot = 0, seg = 10) {
    const g = new THREE.CylinderGeometry(r, r, h, seg);
    g.scale(1, 1, sx);
    g.rotateY(rot);
    g.translate(x, y + h / 2, z);
    this.add(g, color);
  }

  /** A flat quad a-b-c-d (any winding; it's two-faced so it shows from both sides). */
  quad(a: V3, b: V3, c: V3, d: V3, color: number, glow = 0, twoSided = true) {
    const p = twoSided ? [...a, ...b, ...c, ...a, ...c, ...d, ...a, ...c, ...b, ...a, ...d, ...c] : [...a, ...b, ...c, ...a, ...c, ...d];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.computeVertexNormals();
    this.add(g, color, glow);
  }

  /** A box between two ground points (a beam or wall), `h` tall from y, `d` thick. */
  span(a: Pt, b: Pt, h: number, d: number, y: number, color: number, glow = 0) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-3) return;
    this.box(L, h, d, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, heading(b[0] - a[0], b[1] - a[1]), color, glow);
  }

  get count() { return this.geos.length; }

  mesh(): THREE.Mesh | null {
    if (!this.geos.length) return null;
    const m = new THREE.Mesh(mergeGeometries(this.geos), bakedMat);
    this.geos = [];
    return m;
  }
}

/** Box rotation for a direction (dx, dz) in the ground plane: the box's length runs along it. */
export const heading = (dx: number, dz: number) => -Math.atan2(dz, dx);

export interface Step { x: number; z: number; rot: number; len: number; dist: number; dx: number; dz: number; i: number }

/** Walk a polyline in steps of about `step`, giving each step's centre, heading, length and distance along. */
export function* walk(p: Pt[], step: number): Generator<Step> {
  let dist = 0, i = 0;
  for (let k = 1; k < p.length; k++) {
    const [ax, az] = p[k - 1], [bx, bz] = p[k];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-6) continue;
    const n = Math.max(1, Math.round(L / step)), len = L / n;
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n;
      yield { x: ax + (bx - ax) * t, z: az + (bz - az) * t, rot: heading(bx - ax, bz - az), len, dist: dist + len * (j + 0.5), dx: (bx - ax) / L, dz: (bz - az) / L, i: i++ };
    }
    dist += L;
  }
}

/** Deterministic 0..1 noise from an integer (so screenshots repeat). */
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
