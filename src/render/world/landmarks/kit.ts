// Small props shared by the landmark models, written in a Frame's local coordinates (u, v, y):
// hoardings on steel lattice frames, steel crowd barriers, tin-roofed stall sheds, Ambassador taxis, buses, flags,
// round trees, statues. All boxes and a few low-poly shapes, merged into the chunk's one mesh.

import * as THREE from 'three';
import type { Frame } from './ctx';

export const K = {
  steel: 0x8e959b, lattice: 0x5c6066, barrier: 0xb7bcc1, yellowBarrier: 0xf2c230, taxi: 0xf5c518, tyre: 0x1a1a1a,
  glass: 0x3b4a5a, trunk: 0x6b5340, leaf: [0x3f6b2f, 0x4d7a34, 0x56803a], white: 0xf1efe8, marble: 0xe9e6de,
  bronze: 0x8a5f34, gold: 0xd4a73a, tin: [0x8a4b2a, 0x5f86a8, 0x7d7f6a, 0x2f6db5, 0x9c5b36, 0x3a3a3a],
};

/** A hoarding on a steel lattice frame: legs, a lattice back, a lit board facing local direction (du, dv). */
export function hoarding(f: Frame, u: number, v: number, y: number, w: number, h: number, text: string, du: number, dv: number, bg: string, fg: string) {
  const rot = Math.atan2(dv, du) + Math.PI / 2; // the board runs across its facing
  const along = (t: number): [number, number] => [u + Math.cos(rot) * t, v + Math.sin(rot) * t];
  for (const t of [-w * 0.35, w * 0.35]) {
    const [lu, lv] = along(t);
    f.boxAt(lu - du * 0.6, lv - dv * 0.6, 0.3, 0.3, 0, y + h, K.lattice);
    if (y > 2) f.boxAt(lu - du * 0.6, lv - dv * 0.6, 0.08, 1.4, y * 0.5, 0.08, K.lattice, rot); // a lattice brace
  }
  f.boxAt(u - du * 0.25, v - dv * 0.25, w, 0.25, y - 0.15, h + 0.3, K.lattice, rot);
  f.boxAt(u + du * 0.05, v + dv * 0.05, w, 0.1, y - 0.35, 0.12, 0xfff4d0, rot, 2.5); // floodlight bar
  f.sign(text, w, h, u + du * 0.12, v + dv * 0.12, y + h / 2, du, dv, bg, fg);
}

/** A run of steel crowd barriers from (u0, v0) to (u1, v1). */
export function barriers(f: Frame, u0: number, v0: number, u1: number, v1: number, color = K.barrier) {
  // Long rails over the whole run and a pair of feet per 2 m section: cheap enough to ring a forecourt.
  const L = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.round(L / 1.1)), rot = Math.atan2(v1 - v0, u1 - u0);
  f.span(u0, v0, u1, v1, 0.85, 0.07, 0.05, color);
  f.span(u0, v0, u1, v1, 0.2, 0.06, 0.04, color);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    f.boxAt(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, 0.06, 0.06, 0, 0.92, color, rot);
  }
}

/** A tin-roofed hawker shed `w` along u and `d` deep, front facing +v (rotated by rot). */
export function shed(f: Frame, u: number, v: number, w: number, d: number, rot: number, i: number) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const at = (a: number, b: number): [number, number] => [u + c * a - s * b, v + s * a + c * b];
  for (const [a, b] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    const [pu, pv] = at(a, b);
    f.boxAt(pu, pv, 0.08, 0.08, 0, b < 0 ? 2.8 : 2.4, 0x4a4038, rot);
  }
  const [cu, cv] = at(0, 0.2);
  f.boxAt(cu, cv, w + 0.3, d + 0.6, 2.45, 0.08, K.tin[i % K.tin.length], rot);
  const [ku, kv] = at(0, d / 2 - 0.4);
  f.boxAt(ku, kv, w - 0.2, 0.6, 0, 0.9, [0x8a5a3c, 0xb3b7bb, 0xe6dcc2][i % 3], rot);
  const [gu, gv] = at(0, d / 2 - 0.4);
  f.boxAt(gu, gv, w - 0.5, 0.4, 0.9, 0.25, [0xe2402c, 0xf2c230, 0x1f8a46, 0xd35c8a][i % 4], rot);
  const [lu, lv] = at(0, d / 2 - 0.2);
  f.boxAt(lu, lv, Math.min(1.2, w * 0.5), 0.07, 2.2, 0.07, 0xfff8e0, rot, 3);
}

/** A yellow Ambassador taxi, nose along local angle rot. */
export function taxi(f: Frame, u: number, v: number, rot: number) {
  const c = Math.cos(rot), s = Math.sin(rot), at = (a: number): [number, number] => [u + c * a, v + s * a];
  f.boxAt(u, v, 4.2, 1.6, 0.3, 0.75, K.taxi, rot);
  const [hu, hv] = at(-0.3);
  f.boxAt(hu, hv, 2.2, 1.45, 1.05, 0.55, K.taxi, rot);
  f.boxAt(hu, hv, 2.0, 1.5, 1.12, 0.38, K.glass, rot);
  f.boxAt(u, v, 4.25, 1.62, 0.6, 0.08, 0x2f5fa8, rot); // the blue band
  for (const a of [-1.3, 1.3]) { const [wu, wv] = at(a); f.boxAt(wu, wv, 0.6, 1.7, 0, 0.6, K.tyre, rot); }
  const [fu, fv] = at(2.1);
  f.boxAt(fu, fv, 0.06, 1.2, 0.55, 0.2, 0xfff4d0, rot, 2);
}

/** A parked bus: `body` colour with a `band`, windows, nose along rot. */
export function bus(f: Frame, u: number, v: number, rot: number, body: number, band: number, len = 11) {
  f.boxAt(u, v, len, 2.5, 0.45, 2.6, body, rot);
  f.boxAt(u, v, len + 0.04, 2.54, 1.55, 0.95, K.glass, rot);
  f.boxAt(u, v, len + 0.06, 2.56, 0.9, 0.35, band, rot);
  const c = Math.cos(rot), s = Math.sin(rot);
  for (const a of [-len * 0.32, len * 0.3]) f.boxAt(u + c * a, v + s * a, 1.0, 2.6, 0, 0.9, K.tyre, rot);
}

/** A round tree: trunk and a squashed icosahedron crown. */
export function tree(f: Frame, u: number, v: number, s = 1, i = 0) {
  f.cyl(u, v, 0.22 * s, 0, 2.6 * s, K.trunk, 5);
  const g = new THREE.IcosahedronGeometry(2.2 * s, 0);
  g.scale(1, 0.8, 1);
  const [x, z] = [u, v];
  g.translate(x, 2.6 * s + 1.4 * s, z);
  f.geo(g, K.leaf[i % K.leaf.length]);
}

/** A palm: thin trunk and a few drooping fronds. */
export function palm(f: Frame, u: number, v: number, h = 7) {
  f.cyl(u, v, 0.18, 0, h, 0x8b7355, 5);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    f.boxAt(u + Math.cos(a) * 1.1, v + Math.sin(a) * 1.1, 2.4, 0.5, h - 0.4, 0.08, 0x4d7a2e, a);
  }
}

/** A standing figure (a statue): legs, body, arms, head, in one colour. `pose` raises an arm. */
export function figure(f: Frame, u: number, v: number, y: number, s: number, color: number, rot = 0, pose = 0) {
  const c = Math.cos(rot), sn = Math.sin(rot), at = (a: number, b: number): [number, number] => [u + c * a - sn * b, v + sn * a + c * b];
  for (const b of [-0.13, 0.13]) { const [lu, lv] = at(0, b * s); f.boxAt(lu, lv, 0.22 * s, 0.2 * s, y, 0.85 * s, color, rot); }
  f.boxAt(u, v, 0.36 * s, 0.55 * s, y + 0.85 * s, 0.75 * s, color, rot);
  for (const b of [-0.36, 0.36]) {
    const [au, av] = at(0, b * s), up = pose && b > 0;
    f.boxAt(au, av, 0.16 * s, 0.16 * s, y + (up ? 1.45 : 0.9) * s, (up ? 0.75 : 0.7) * s, color, rot);
  }
  const head = new THREE.IcosahedronGeometry(0.17 * s, 0);
  head.translate(u, y + 1.82 * s, v);
  f.geo(head, color);
}

/** A tall flagpole with a coloured flag. */
export function flag(f: Frame, u: number, v: number, h: number, color: number) {
  f.cyl(u, v, 0.05, 0, h, 0xd0d0d0, 5);
  f.boxAt(u + 0.6, v, 1.2, 0.03, h - 0.9, 0.75, color);
}
