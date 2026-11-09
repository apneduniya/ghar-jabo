// Street life for streamed chunks, after stalls.ts and models.ts but written straight into a GeoBuf (no Mesh per
// box): hawker sheds with tube lights, carts, people, parked bikes and cars. Every piece is built in its own frame
// `f` (local +z faces the road, x runs along it), like the Sector V stalls.

import * as THREE from 'three';
import { GeoBuf } from './chunkgeo';

const ROOF = [0x8a4b2a, 0x9c5b36, 0x5f86a8, 0xe6dcc2, 0x7d7f6a, 0x7a3f28, 0x4f79a8];
const BRIGHT = [0xe2402c, 0xf2c230, 0x2f6db5, 0x1f8a46, 0xd35c8a, 0xf08a24, 0xffffff];
const SHIRT = [0xd9534f, 0x3f7cc4, 0x6cae5a, 0xe0a83a, 0x8e5bb5, 0xeeeeee, 0x2b2b2b];
const PANTS = [0x2c3e50, 0x34495e, 0x4b3b2a, 0x222222];
const SKIN = 0xc68a5e, WOOD = 0x8a5a3c, STEEL = 0xb3b7bb, POST = 0x4a4038;
const CAR = [0xeeeeee, 0x9aa5b1, 0x2b2b2b, 0xb03a2e, 0x2c5f8a, 0xd8d2c4, 0x6b4f3a];

const cache = new Map<number, THREE.Color>();
/** Shared colour objects (GeoBuf copies the values, so sharing is safe). */
export const C = (hex: number) => { let c = cache.get(hex); if (!c) { c = new THREE.Color(hex); cache.set(hex, c); } return c; };

const child = (f: THREE.Matrix4, x: number, z: number, ry: number) =>
  new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z).premultiply(f);

/** A low-poly person facing local +z (toward the road) or away from it; seated drops them onto a stool. */
export function person(buf: GeoBuf, f: THREE.Matrix4, x: number, z: number, facingRoad: boolean, i: number, seated = false) {
  const m = child(f, x, z, facingRoad ? 0 : Math.PI);
  const y = seated ? -0.35 : 0, shirt = C(SHIRT[i % SHIRT.length]), pants = C(PANTS[i % PANTS.length]);
  buf.boxAt(m, -0.12, y, 0, 0.18, 0.75, 0.2, 0, pants); buf.boxAt(m, 0.12, y, 0, 0.18, 0.75, 0.2, 0, pants);
  buf.boxAt(m, 0, y + 0.75, 0, 0.55, 0.6, 0.3, 0, shirt);
  buf.boxAt(m, -0.36, y + 0.8, 0, 0.14, 0.55, 0.16, 0, shirt); buf.boxAt(m, 0.36, y + 0.8, 0, 0.14, 0.55, 0.16, 0, shirt);
  buf.boxAt(m, 0, y + 1.38, 0, 0.32, 0.32, 0.3, 0, C(SKIN)); buf.boxAt(m, 0, y + 1.68, 0, 0.34, 0.1, 0.32, 0, C(0x1d1d1d));
}

/** Posts and a roof sloping down to the front, with a tube light that glows after dark. */
function shed(buf: GeoBuf, f: THREE.Matrix4, x: number, w: number, d: number, roof: number, back = 2.8, front = 2.45) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) buf.boxAt(f, x + sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05), 0.08, sz < 0 ? back : front, 0.08, 0, C(POST));
  buf.boxAt(f, x, (back + front) / 2 - 0.03, 0.2, w + 0.3, 0.06, d + 0.7, 0, C(roof), 0, Math.atan2(back - front, d));
  buf.boxAt(f, x, front - 0.25, d / 2 - 0.25, Math.min(1.2, w * 0.5), 0.07, 0.07, 0, C(0xfff8e0), 3);
}

function goods(buf: GeoBuf, f: THREE.Matrix4, x: number, w: number, d: number, v: number, i: number) {
  const fz = d / 2 - 0.5;
  if (v === 0) { // tea: kettle on a stove, glasses
    buf.boxAt(f, x - w * 0.25, 0.95, fz, 0.35, 0.2, 0.35, 0, C(0x333333)); buf.boxAt(f, x - w * 0.25, 1.15, fz, 0.26, 0.3, 0.26, 0, C(0xb9b9b9));
    for (let k = 0; k < 5; k++) buf.boxAt(f, x + k * 0.14, 0.95, fz + 0.1, 0.07, 0.12, 0.07, 0, C(0xe9f2f4));
  } else if (v === 1) { // fruit: bananas hanging, crates on the counter
    for (let k = 0; k < 3; k++) buf.boxAt(f, x - w * 0.3 + k * 0.45, 1.55, d / 2 - 0.12, 0.22, 0.5, 0.22, 0, C(0xe9c437));
    for (let k = 0; k < 4; k++) buf.boxAt(f, x - w * 0.3 + k * 0.42, 0.95, fz, 0.4, 0.18, 0.35, 0, C(BRIGHT[(k + i) % 5]));
  } else if (v === 2) { // snacks: glass jars
    for (let k = 0; k < 6; k++) buf.boxAt(f, x - w * 0.32 + k * 0.26, 0.95, fz, 0.2, 0.28, 0.2, 0, C(0xa9d3df));
  } else if (v === 3) { // paan and cigarettes: strips of packets
    for (let k = 0; k < 6; k++) buf.boxAt(f, x - w * 0.35 + k * 0.28, 1.45, d / 2 - 0.1, 0.12, 0.7, 0.03, 0, C(BRIGHT[(k + i) % BRIGHT.length]));
  } else { // cooking: a kadai and a gas cylinder
    buf.boxAt(f, x + w * 0.15, 0.95, fz, 0.8, 0.15, 0.6, 0, C(0x2a2a2a)); buf.boxAt(f, x - w * 0.35, 0, fz - 0.6, 0.35, 0.65, 0.35, 0, C(0xc0281f));
  }
}

/** A hawker stall, or a row of them under one tarp when `len` is long. */
export function stall(buf: GeoBuf, f: THREE.Matrix4, len: number, v: number, i: number) {
  const n = Math.max(1, Math.round(len / 2.6)), w = len / n, d = 2.2;
  const roof = ROOF[(i + v) % ROOF.length];
  if (n > 2) {
    shed(buf, f, 0, len, d, ROOF[0]);
    buf.boxAt(f, 0, 0, -d / 2, len, 2.2, 0.06, 0, C(0x9a9488));
  }
  for (let k = 0; k < n; k++) {
    const x = -len / 2 + w * (k + 0.5), kk = i + k;
    if (n <= 2) {
      shed(buf, f, x, w, d, (k ? ROOF[(i + 3) % ROOF.length] : roof));
      buf.boxAt(f, x, 0, -d / 2, w, 2.5, 0.06, 0, C(ROOF[(kk + 3) % ROOF.length]));
    } else buf.boxAt(f, x - w / 2 + 0.05, 0, d / 2 - 0.05, 0.08, 2.45, 0.08, 0, C(POST));
    buf.boxAt(f, x, 0, d / 2 - 0.5, w * 0.8, 0.95, 0.6, 0, C(kk % 3 === 1 ? STEEL : WOOD));
    goods(buf, f, x, w, d, (v + k) % 5, kk);
    person(buf, f, x + 0.2, d / 2 - 1.1, true, kk);
    if (kk % 2 === 0) { buf.boxAt(f, x, 0, d / 2 + 0.75, Math.min(1.8, w * 0.8), 0.42, 0.35, 0, C(0x6b4a33)); person(buf, f, x - 0.4, d / 2 + 0.85, false, kk + 2, true); }
    else if (kk % 3 === 0) person(buf, f, x + 0.3, d / 2 + 0.9, false, kk + 4);
  }
}

/** Phuchka cart, fruit cart, or a table under a big umbrella. */
export function cart(buf: GeoBuf, f: THREE.Matrix4, v: number, i: number) {
  const kind = v % 3;
  if (kind === 0) {
    buf.boxAt(f, 0, 0, 0, 1.4, 0.8, 0.9, 0, C(0x8a8a8a)); buf.boxAt(f, 0, 0.8, 0, 1.2, 0.5, 0.7, 0, C(0x9fc4d6));
    for (let k = 0; k < 6; k++) buf.boxAt(f, -0.4 + (k % 3) * 0.3, 0.9 + Math.floor(k / 3) * 0.15, 0, 0.12, 0.12, 0.12, 0, C(0xe0b060));
    person(buf, f, 0, -0.9, true, i); person(buf, f, -0.5, 1.1, false, i + 1); person(buf, f, 0.5, 1.2, false, i + 2);
  } else if (kind === 1) {
    buf.boxAt(f, 0, 0.75, 0, 2.2, 0.15, 1.1, 0, C(0x7a5232));
    for (const s of [-0.6, 0.6]) buf.boxAt(f, s, 0.1, -0.6, 0.5, 0.5, 0.1, 0, C(0x222222));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) buf.boxAt(f, -0.75 + c * 0.5, 0.9 + r * 0.06, -0.35 + r * 0.33, 0.42, 0.18, 0.26, 0, C(BRIGHT[(r + c + i) % 5]));
    person(buf, f, 0, -1.0, true, i);
  } else {
    const yellow = i % 2 === 0, top = C(yellow ? 0xf2c230 : 0xd9342b);
    buf.boxAt(f, 0, 0.2, 0, 1.3, 0.9, 0.8, 0, C(yellow ? 0xf4f0e0 : WOOD));
    buf.boxAt(f, 0.3, 0.2, 0, 0.05, 2.2, 0.05, 0, C(0x333333));
    buf.boxAt(f, 0.3, 2.35, 0, 2.2, 0.12, 2.2, 0, top); buf.boxAt(f, 0.3, 2.45, 0, 1.5, 0.1, 1.5, 0, top);
    buf.boxAt(f, 0.3, 2.2, 0, 0.5, 0.08, 0.08, 0, C(0xfff8e0), 2.5); // a bulb under the umbrella
    person(buf, f, 0, -0.9, true, i);
  }
}

/** A wooden handcart (thela): flat bed, two big wheels, sacks. */
export function handcart(buf: GeoBuf, f: THREE.Matrix4, i: number) {
  buf.boxAt(f, 0, 0.75, 0, 2.6, 0.1, 1.2, 0, C(0x7a5232));
  for (const s of [-0.65, 0.65]) buf.boxAt(f, 0.3, 0, s, 1.0, 1.0, 0.08, 0, C(0x3a2a1e));
  for (const s of [-0.5, 0.5]) buf.boxAt(f, -1.7, 0.8, s, 1.0, 0.06, 0.06, 0, C(0x7a5232));
  for (let k = 0; k < 3; k++) buf.boxAt(f, -0.8 + k * 0.75, 0.85, 0, 0.65, 0.45, 0.9, 0, C([0xd8c9a3, 0xc9b48a, 0xe6dcc2][(k + i) % 3]));
}

/** A parked scooter or motorbike, side on to the kerb. */
export function bike(buf: GeoBuf, f: THREE.Matrix4, v: number) {
  const body = C(BRIGHT[v % BRIGHT.length]);
  for (const x of [-0.6, 0.6]) buf.boxAt(f, x, 0, 0, 0.55, 0.55, 0.12, 0, C(0x161616));
  buf.boxAt(f, 0, 0.3, 0, 1.2, 0.35, 0.36, 0, body);
  buf.boxAt(f, -0.2, 0.65, 0, 0.6, 0.12, 0.3, 0, C(0x222222));
  buf.boxAt(f, 0.55, 0.6, 0, 0.12, 0.55, 0.14, 0, body);
  buf.boxAt(f, 0.6, 1.1, 0, 0.06, 0.06, 0.6, 0, C(0x333333));
}

/** A parked car: hatchback, sedan or a yellow Ambassador taxi. */
export function car(buf: GeoBuf, f: THREE.Matrix4, v: number) {
  const taxi = v % 4 === 0, col = C(taxi ? 0xf5c518 : CAR[v % CAR.length]), glass = C(0x2f3a47);
  const L = taxi ? 2.6 : v % 2 ? 2.0 : 2.3, H = 0.55;
  buf.boxAt(f, 0, 0.2, 0, L, H, 1.12, 0, col);
  buf.boxAt(f, -0.1, 0.2 + H, 0, L * 0.55, 0.45, 1.02, 0, col);
  buf.boxAt(f, -0.1, 0.26 + H, 0, L * 0.55 - 0.16, 0.32, 1.04, 0, glass);
  for (const x of [-L * 0.32, L * 0.32]) for (const z of [-0.5, 0.5]) buf.boxAt(f, x, 0, z, 0.44, 0.44, 0.16, 0, C(0x161616));
  if (taxi) buf.boxAt(f, -0.1, 1.33, 0, 0.5, 0.15, 0.3, 0, C(0x1d1d1d));
}

/** Bus stop: blue roof on posts, a bench, people waiting. */
export function busStop(buf: GeoBuf, f: THREE.Matrix4, i: number) {
  buf.boxAt(f, 0, 2.5, 0, 4.6, 0.18, 1.8, 0, C(0x2f6db5));
  for (const s of [-2.1, 2.1]) buf.boxAt(f, s, 0, -0.7, 0.12, 2.5, 0.12, 0, C(0x555555));
  buf.boxAt(f, 0, 0.5, -0.5, 4.2, 0.12, 0.5, 0, C(0x8a8a8a));
  buf.boxAt(f, 0, 2.3, 0.6, 1.4, 0.06, 0.06, 0, C(0xfff8e0), 2.5);
  for (let k = 0; k < 3; k++) person(buf, f, -1.5 + k * 1.4, 0.2, true, i + k, k === 1);
}
