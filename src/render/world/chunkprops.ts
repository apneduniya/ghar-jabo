// Props of a streamed chunk (GenProp), into the chunk's GeoBuf: trees and palms (the trees.ts kit), trident
// lamps, masts and median lights (their night pools are lamps.ts LampPools), poles with sagging wire bundles, walls, dead ends with a parody sign, signs,
// hoardings, benches, shrines, and the street life in chunkstalls.ts. `rot` turns local +z toward the road.

import * as THREE from 'three';
import type { GenProp, GenRoad } from '../../sim/gen/types';
import { GeoBuf, place } from './chunkgeo';
import { AD_COUNT, Tile } from './chunkatlas';
import { puddle } from './chunkground';
import { LampKind } from '../../sim/gen/lamps';
import { board } from './chunkbuildings';
import { pickWeighted, type Species, treeKit, VARIANTS } from './trees';
import { TREES } from '../../content/worldgen';
import { bike, busStop, C, car, cart, handcart, person, stall } from './chunkstalls';

/** Text slots for signs: a tile id for the text, or null when none is free. */
export type TextFn = (text: string, bg?: string, fg?: string) => number | null;

const POST = 0xe8e6df, GLOBE = 0xfff6dc, IRON = 0x55585c;
const m4 = new THREE.Matrix4();
/** Foliage is marked with glow −1: the chunk shader dissolves it near the camera (see chunkmat.ts). */
const FOLIAGE = -1;

/** Deterministic 0..1 per prop position (props carry no per-tree seed beyond `v`). */
const h01 = (x: number, z: number, k: number) => (Math.abs(Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453) % 1);

/** A tree or palm from the shared kit (trees.ts): wood as is, leaves marked as foliage, a little size and tilt. */
function kitTree(buf: GeoBuf, p: GenProp, species: Species) {
  const t = treeKit(species, Math.floor(h01(p.x, p.z, 1) * VARIANTS)), k = 0.86 + h01(p.x, p.z, 2) * 0.28;
  const tilt = species === 'coconut' || species === 'areca' || species === 'royal' ? 0 : (h01(p.x, p.z, 3) - 0.5) * 0.08;
  const m = place(p.x, 0, p.z, h01(p.x, p.z, 4) * Math.PI * 2, k, k * (0.92 + h01(p.x, p.z, 6) * 0.16), k, tilt, m4);
  buf.geometry(t.wood, m, null);
  buf.geometry(t.leaf, m, null, FOLIAGE);
}

const PALMS: Species[] = ['coconut', 'areca', 'royal'];
const tree = (buf: GeoBuf, p: GenProp) => kitTree(buf, p, pickWeighted<Species>(TREES.street, h01(p.x, p.z, 5)));
const palm = (buf: GeoBuf, p: GenProp, k: number) => kitTree(buf, p, PALMS[(p.v ?? k) % 3]);

/**
 * Street lights (sim/gen/lamps.ts LampKind): a three-globe trident (Sector V style), an old-city pole with one
 * tube-light arm, a tall double-arm median light, or a high mast at a big junction. Local +z faces the road; the
 * light pools on the ground are one instanced mesh for all chunks (lamps.ts LampPools).
 */
function lamp(buf: GeoBuf, f: THREE.Matrix4, p: GenProp) {
  const v = p.v ?? 0;
  if (v === LampKind.trident) {
    buf.boxAt(f, 0, 0, 0, 0.32, 0.5, 0.32, 0, C(POST)); buf.boxAt(f, 0, 0.5, 0, 0.14, 4.4, 0.14, 0, C(POST));
    for (const [ax, ay] of [[-0.55, 4.0], [0.55, 4.0], [0, 4.7]]) {
      if (ax) buf.boxAt(f, ax / 2, ay + 0.15, 0, 0.6, 0.06, 0.06, 0, C(POST));
      buf.boxAt(f, ax, ay + 0.2, 0, 0.36, 0.42, 0.36, 0, C(GLOBE), 2.6);
    }
  } else if (v === LampKind.tube) {
    buf.boxAt(f, 0, 0, 0, 0.22, 6.2, 0.22, 0, C(0x8d8d8d));
    buf.boxAt(f, 0, 5.9, 0.8, 0.08, 0.08, 1.6, 0, C(0x6b6b6b));
    buf.boxAt(f, 0, 5.75, 1.45, 0.16, 0.08, 0.9, 0, C(0xf4f6ff), 2.4);
  } else if (v === LampKind.median) {
    // In the median: one arm over each carriageway.
    buf.boxAt(f, 0, 0, 0, 0.22, 8.4, 0.22, 0, C(IRON));
    for (const s of [1, -1]) {
      buf.boxAt(f, 0, 8.3, 1.1 * s, 0.1, 0.1, 2.2, 0, C(IRON));
      buf.boxAt(f, 0, 8.2, 2.1 * s, 0.32, 0.14, 0.8, 0, C(0xfff2d8), 2.2);
    }
  } else {
    buf.boxAt(f, 0, 0, 0, 0.9, 1.2, 0.9, 0, C(0xb9b4aa));
    buf.boxAt(f, 0, 1.2, 0, 0.42, 16.5, 0.42, 0, C(IRON));
    buf.boxAt(f, 0, 17.6, 0, 2.6, 0.18, 2.6, 0, C(IRON));
    for (const [ax, az] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) buf.boxAt(f, ax, 17.3, az, 0.7, 0.3, 0.7, 0, C(0xfff2d8), 2.6);
  }
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
export function buildProp(buf: GeoBuf, prop: GenProp, index: number, textFn: TextFn, _roads: GenRoad[] = []) {
  if (!Number.isFinite(prop.x) || !Number.isFinite(prop.z)) return;
  // Variant picks index colour tables with `%`: negative numbers (chunks west and north of the origin) would read
  // past the start of the table and paint the prop white.
  const k = Math.abs(Math.trunc(index)) || 0;
  const p = prop.v === undefined ? prop : { ...prop, v: Math.abs(Math.trunc(prop.v)) || 0 };
  const f = place(p.x, 0, p.z, p.rot ?? 0, 1, 1, 1, 0, new THREE.Matrix4());
  switch (p.kind) {
    case 'tree': tree(buf, p); break;
    case 'palm': palm(buf, p, k); break;
    case 'lamp': lamp(buf, f, p); break;
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
