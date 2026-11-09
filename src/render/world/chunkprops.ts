// Props of a streamed chunk (GenProp), into the chunk's GeoBuf: trees and palms (greenery.ts shapes), trident
// lamps with night pools (lamps.ts), poles with sagging wire bundles, walls, dead ends with a parody sign, signs,
// hoardings, benches, shrines, and the street life in chunkstalls.ts. `rot` turns local +z toward the road.

import * as THREE from 'three';
import type { GenProp, GenRoad } from '../../sim/gen/types';
import { GeoBuf, place } from './chunkgeo';
import { AD_COUNT, Tile } from './chunkatlas';
import { lampPool, puddle } from './chunkground';
import { board } from './chunkbuildings';
import { canopy } from './greenery';
import { bike, busStop, C, car, cart, handcart, person, stall } from './chunkstalls';

/** Text slots for signs: a tile id for the text, or null when none is free. */
export type TextFn = (text: string, bg?: string, fg?: string) => number | null;

let shapes: { trunk: THREE.BufferGeometry; wide: THREE.BufferGeometry; round: THREE.BufferGeometry; crown: THREE.BufferGeometry } | null = null;
function treeShapes() {
  shapes ??= {
    trunk: new THREE.CylinderGeometry(0.5, 0.65, 1, 6).translate(0, 0.5, 0),
    wide: canopy([[0, 0, 0, 3.4], [2.4, -0.4, 0.8, 2.4], [-2.2, -0.3, -0.9, 2.5], [0.4, 0.5, -2.2, 2.2], [-0.6, -0.2, 2.3, 2.2]]),
    round: canopy([[0, 0, 0, 2.4], [0.9, 1.3, 0.3, 1.8], [-0.8, 1.0, -0.4, 1.7], [0.2, -0.9, 1.0, 1.7]]),
    crown: fronds(),
  };
  return shapes;
}

/** A light palm crown: nine drooping fronds, two double-sided blades each (greenery's crown is ~5x the vertices). */
function fronds() {
  const pos: number[] = [], nor: number[] = [];
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const pts = [[0, 0], [1.25, 0.45], [2.5, -0.5]]; // (out, up) along the frond
    for (let k = 1; k < 3; k++) {
      const [o0, y0] = pts[k - 1], [o1, y1] = pts[k], w0 = k === 1 ? 0.1 : 0.22, w1 = k === 1 ? 0.22 : 0.02;
      const P = [[o0, y0, -w0], [o1, y1, -w1], [o1, y1, w1], [o0, y0, w0]].map(([o, y, s]) => [o * ca - s * sa, y, o * sa + s * ca]);
      n.set(0, 1, 0);
      for (const tri of [[0, 2, 1], [0, 3, 2], [0, 1, 2], [0, 2, 3]]) for (const t of tri) { v.fromArray(P[t]); pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

const LEAF = [0x4f7a3a, 0x3f6b33, 0x5c8a3f, 0x476f36, 0x6a8f45], BARK = [0x5b4636, 0x6a5240, 0x4f4034];
const POST = 0xe8e6df, GLOBE = 0xfff6dc;
const m4 = new THREE.Matrix4();
/** Foliage is marked with glow −1: the chunk shader dissolves it near the camera (see chunkmat.ts). */
const FOLIAGE = -1;

function tree(buf: GeoBuf, p: GenProp, k: number) {
  const s = shapes ?? treeShapes(), v = p.v ?? k;
  const rain = v % 3 !== 1, sc = 0.85 + (k % 5) * 0.1;
  const H = (rain ? 4.2 : 3.4) * sc, R = (rain ? 0.75 : 0.55) * sc;
  buf.geometry(s.trunk, place(p.x, 0, p.z, k, R, H + 1, R, 0, m4), C(BARK[k % 3]));
  const c = sc * (0.85 + (k % 7) * 0.05);
  buf.geometry(rain ? s.wide : s.round, place(p.x, H + (rain ? 1.6 : 2.2) * sc, p.z, k * 0.7, c, c, c, 0, m4), C(LEAF[k % LEAF.length]), FOLIAGE);
}

function palm(buf: GeoBuf, p: GenProp, k: number) {
  const s = shapes ?? treeShapes(), kind = (p.v ?? k) % 3;
  const H = [8, 5.5, 9][kind], r = [0.3, 0.16, 0.45][kind], lean = kind === 0 ? ((k % 7) - 3) * 0.04 : 0;
  const m = place(p.x, 0, p.z, k, r, H, r, lean, m4);
  buf.geometry(s.trunk, m, C([0x8a7a66, 0x7f8a6a, 0xb8b4aa][kind]));
  const top = new THREE.Vector3(0, 1, 0).applyMatrix4(m);
  const c = [1.9, 1.2, 2.2][kind];
  buf.geometry(s.crown, place(top.x, top.y, top.z, k, c, c, c, 0, m4), C(kind === 1 ? 0x6f9a45 : 0x5d8a3a), FOLIAGE);
}

/** Three-globe trident (Sector V style) or, in the old city, a pole with one tube-light arm. */
function lamp(buf: GeoBuf, f: THREE.Matrix4, p: GenProp, roads: GenRoad[]) {
  if ((p.v ?? 0) % 2 === 0) {
    buf.boxAt(f, 0, 0, 0, 0.32, 0.5, 0.32, 0, C(POST)); buf.boxAt(f, 0, 0.5, 0, 0.14, 4.4, 0.14, 0, C(POST));
    for (const [ax, ay] of [[-0.55, 4.0], [0.55, 4.0], [0, 4.7]]) {
      if (ax) buf.boxAt(f, ax / 2, ay + 0.15, 0, 0.6, 0.06, 0.06, 0, C(POST));
      buf.boxAt(f, ax, ay + 0.2, 0, 0.36, 0.42, 0.36, 0, C(GLOBE), 2.6);
    }
  } else {
    buf.boxAt(f, 0, 0, 0, 0.22, 6.2, 0.22, 0, C(0x8d8d8d));
    buf.boxAt(f, 0, 5.9, 0.8, 0.08, 0.08, 1.6, 0, C(0x6b6b6b));
    buf.boxAt(f, 0, 5.75, 1.45, 0.16, 0.08, 0.9, 0, C(0xf4f6ff), 2.4);
  }
  const r = p.rot ?? 0;
  lampPool(buf, p.x, p.z, Math.sin(r), Math.cos(r), roads, (p.v ?? 0) % 2 ? 2.2 : 2.8);
}

/** A thin box from a to b (wires, rails), `t` thick. */
export function beam(buf: GeoBuf, a: THREE.Vector3, b: THREE.Vector3, t: number, col: THREE.Color) {
  const dir = b.clone().sub(a), len = dir.length();
  if (len < 1e-3) return;
  dir.divideScalar(len);
  const side = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(side, dir).normalize();
  const m = new THREE.Matrix4().makeBasis(side.multiplyScalar(t), dir.multiplyScalar(len), up.multiplyScalar(t)).setPosition(a);
  buf.box(m, col);
}

/** Sagging wires from a to b: `n` strands, each two straight pieces through a lowered middle. */
export function wires(buf: GeoBuf, a: THREE.Vector3, b: THREE.Vector3, n: number) {
  const black = C(0x1c1c1c);
  for (let k = 0; k < n; k++) {
    const o = (k - (n - 1) / 2) * 0.16, sag = 0.5 + k * 0.22;
    const A = a.clone().setY(a.y + o), B = b.clone().setY(b.y + o);
    const M = A.clone().lerp(B, 0.5).setY((A.y + B.y) / 2 - sag);
    beam(buf, A, M, 0.04, black); beam(buf, M, B, 0.04, black);
  }
}

function wall(buf: GeoBuf, f: THREE.Matrix4, p: GenProp) {
  const len = p.len ?? 4, v = p.v ?? 0;
  const col = C(v % 3 === 0 ? 0x9a5a44 : [0xe8b0a6, 0xefe2c2, 0xf0c9b4, 0xd8d2c6][v % 4]);
  const h = v % 3 === 0 ? 2.2 : 1.2;
  buf.boxAt(f, 0, 0, 0, len, h, 0.3, 0, col);
  for (let x = -len / 2; x <= len / 2 + 0.01; x += 3) buf.boxAt(f, x, 0, 0, 0.42, h + 0.2, 0.42, 0, col);
  if (v % 3 === 1) { // iron railing: a top rail and a bar every metre
    const iron = C(0x1f1f22);
    buf.boxAt(f, 0, h + 0.85, 0, len, 0.06, 0.06, 0, iron);
    for (let x = -len / 2 + 0.5; x < len / 2; x += 1) buf.boxAt(f, x, h, 0, 0.05, 0.85, 0.05, 0, iron);
  }
}

/** A signboard on two legs facing the road, with the given text (or a plain board when no slot is free). */
function signBoard(buf: GeoBuf, f: THREE.Matrix4, y: number, w: number, h: number, text: string | undefined, textFn: TextFn, bg: string, fg: string) {
  for (const s of [-w / 2 + 0.15, w / 2 - 0.15]) buf.boxAt(f, s, 0, -0.05, 0.08, y + h, 0.08, 0, C(0x444444));
  buf.boxAt(f, 0, y, -0.06, w + 0.1, h + 0.1, 0.06, 0, C(0x3a3a3a));
  const tile = text ? textFn(text, bg, fg) : null;
  if (tile !== null) board(buf, f, 0, y, 0, w, h, tile, 0.7);
  else buf.boxAt(f, 0, y, 0, w, h, 0.02, 0, new THREE.Color(bg));
}

/** Timed mode's end of a side street: a wall, a flooded lane or a police barrier, with a joke on a sign. */
function deadEnd(buf: GeoBuf, f: THREE.Matrix4, p: GenProp, textFn: TextFn) {
  const len = Math.max(3, p.len ?? 5), v = (p.v ?? 0) % 3;
  if (v === 0) { // a brick wall right across, posters on it
    buf.boxAt(f, 0, 0, -0.4, len + 1, 2.8, 0.4, 0, C(0x9a5a44));
    buf.boxAt(f, 0, 2.8, -0.4, len + 1.1, 0.12, 0.5, 0, C(0x7d4a38));
    signBoard(buf, f, 1.0, Math.min(len - 0.4, 3.4), 0.9, p.text, textFn, '#f6efe0', '#7a1f1f');
  } else if (v === 1) { // the lane goes under water: a pool, stepping bricks and a warning on a pole
    const water = C(0x6f8ea6);
    buf.boxAt(f, 0, 0.02, -5, len + 1, 0.08, 10, 0, water);
    for (let k = 0; k < 4; k++) buf.boxAt(f, -0.6 + (k % 2) * 1.0, 0.02, -1.2 - k * 1.8, 0.4, 0.16, 0.25, 0, C(0x9a5a44));
    buf.boxAt(f, 0, 0, -10.4, len + 1, 2.4, 0.4, 0, C(0x8a8174));
    signBoard(buf, f, 1.6, Math.min(len, 3.2), 0.8, p.text, textFn, '#1f5f9a', '#ffffff');
  } else { // yellow-and-black police barricades, a sign and a bored constable
    for (let x = -len / 2 + 0.6; x < len / 2; x += 1.6) {
      buf.boxAt(f, x, 0, -0.3, 1.4, 0.9, 0.08, 0, C(0xf2c230));
      buf.boxAt(f, x, 0.35, -0.25, 1.42, 0.2, 0.08, 0, C(0x1d1d1d));
    }
    buf.boxAt(f, 0, 0, -3, len + 1, 2.6, 0.4, 0, C(0x8f8f86));
    signBoard(buf, f, 1.2, Math.min(len - 0.4, 3.2), 0.85, p.text, textFn, '#c0281f', '#ffffff');
    person(buf, f, len / 2 - 0.4, 0.8, true, 6);
  }
}

function hoarding(buf: GeoBuf, f: THREE.Matrix4, p: GenProp, textFn: TextFn, k: number) {
  const w = Math.min(10, p.len ?? 8), h = w / 2;
  for (const s of [-w / 2 + 0.6, w / 2 - 0.6]) buf.boxAt(f, s, 0, -0.2, 0.3, 9 + h, 0.3, 0, C(0x555555));
  buf.boxAt(f, 0, 9, -0.2, w + 0.2, h + 0.2, 0.2, 0, C(0x4a4a4a));
  const tile = p.text ? textFn(p.text, '#ffd400', '#111111') : null;
  board(buf, f, 0, 9.05, -0.08, w, h, tile ?? Tile.ad0 + ((p.v ?? k) % AD_COUNT), 0.9);
  for (const s of [-w / 3, w / 3]) buf.boxAt(f, s, 9 + h + 0.15, 0.4, 0.3, 0.12, 0.25, 0, C(0xfff8e0), 2.6); // flood lights
}

function shrine(buf: GeoBuf, f: THREE.Matrix4) {
  buf.boxAt(f, 0, 0, 0, 1.4, 0.4, 1.2, 0, C(0xd8d2c6));
  buf.boxAt(f, 0, 0.4, -0.1, 1.0, 1.1, 0.9, 0, C(0xc0281f));
  buf.boxAt(f, 0, 0.6, 0.36, 0.5, 0.6, 0.02, 0, C(0x2a1a10));
  buf.boxAt(f, 0, 1.5, -0.1, 1.2, 0.12, 1.1, 0, C(0xf08a24));
  buf.boxAt(f, 0, 1.62, -0.1, 0.7, 0.45, 0.6, 0, C(0xf2c230));
  buf.boxAt(f, 0.55, 0, 0.5, 0.03, 2.6, 0.03, 0, C(0x6b4a33));
  buf.boxAt(f, 0.75, 2.2, 0.5, 0.4, 0.3, 0.02, 0, C(0xe86a1a));
  buf.boxAt(f, 0, 0.45, 0.42, 0.12, 0.08, 0.12, 0, C(0xffd27a), 3); // a diya
  buf.boxAt(f, -0.4, 0.4, 0.45, 0.4, 0.08, 0.15, 0, C(0xf08a24)); // marigolds
}

/** One prop into the buffer. Poles are only drawn here; chunks.ts strings wires between them. */
export function buildProp(buf: GeoBuf, prop: GenProp, index: number, textFn: TextFn, roads: GenRoad[] = []) {
  if (!Number.isFinite(prop.x) || !Number.isFinite(prop.z)) return;
  // Variant picks index colour tables with `%`: negative numbers (chunks west and north of the origin) would read
  // past the start of the table and paint the prop white.
  const k = Math.abs(Math.trunc(index)) || 0;
  const p = prop.v === undefined ? prop : { ...prop, v: Math.abs(Math.trunc(prop.v)) || 0 };
  const f = place(p.x, 0, p.z, p.rot ?? 0, 1, 1, 1, 0, new THREE.Matrix4());
  switch (p.kind) {
    case 'tree': tree(buf, p, k); break;
    case 'palm': palm(buf, p, k); break;
    case 'lamp': lamp(buf, f, p, roads); break;
    case 'pole':
      buf.boxAt(f, 0, 0, 0, 0.26, 7.2, 0.26, 0, C(0x8d8d8d));
      buf.boxAt(f, 0, 6.8, 0, 1.4, 0.1, 0.1, 0, C(0x6b6b6b));
      break;
    case 'stall': stall(buf, f, p.len ?? 2.6, p.v ?? 0, k); break;
    case 'cart': cart(buf, f, p.v ?? k, k); break;
    case 'handcart': handcart(buf, f, k); break;
    case 'parked-bike': bike(buf, f, p.v ?? k); break;
    case 'parked-car': car(buf, f, p.v ?? k); break;
    case 'bus-stop': busStop(buf, f, k); break;
    case 'wall': wall(buf, f, p); break;
    case 'dead-end': deadEnd(buf, f, p, textFn); break;
    case 'puddle': puddle(buf, p.x, p.z, (p.len ?? 3) / 2, k); break;
    case 'sign': signBoard(buf, f, 1.8, Math.min(4, p.len ?? 2.6), 0.7, p.text, textFn, '#1f5f3a', '#ffffff'); break;
    case 'hoarding': hoarding(buf, f, p, textFn, k); break;
    case 'bench':
      buf.boxAt(f, 0, 0.4, 0, 1.8, 0.1, 0.5, 0, C(0xb9b4aa));
      for (const s of [-0.7, 0.7]) buf.boxAt(f, s, 0, 0, 0.12, 0.4, 0.45, 0, C(0x9a958c));
      break;
    case 'shrine': shrine(buf, f); break;
  }
}

/** Pole tops in this chunk, wired to their nearest neighbour (and the odd bundle across the street). */
export function poleWires(buf: GeoBuf, props: GenProp[]) {
  const tops = props.filter((p) => p.kind === 'pole').map((p) => new THREE.Vector3(p.x, 6.8, p.z));
  const done = new Set<string>();
  tops.forEach((a, i) => {
    let best = -1, bd = 32;
    tops.forEach((b, j) => { const d = a.distanceTo(b); if (j !== i && d > 4 && d < bd) { bd = d; best = j; } });
    if (best >= 0) {
      const key = i < best ? `${i}-${best}` : `${best}-${i}`;
      if (!done.has(key)) { done.add(key); wires(buf, a, tops[best], 4); }
    }
  });
  props.forEach((p, i) => {
    if (p.kind !== 'pole' || i % 3) return;
    const a = new THREE.Vector3(p.x, 6.7, p.z), r = p.rot ?? 0;
    wires(buf, a, new THREE.Vector3(p.x + Math.sin(r) * 9, 6.2, p.z + Math.cos(r) * 9), 3);
  });
}
