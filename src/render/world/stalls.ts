// Hawker stalls, from the rows the sim placed (sim/streetlife.ts placeRow). Each unit is plain boxes in its own
// frame (local +z faces the road, x runs along it), baked with the rest of the dressing into one draw call.
// Looks follow the survey photos: tin and tarp roofs on posts (rusty brown, faded blue, cream canvas), counters
// with kettles, hanging bananas and jars, plastic stools, a white tubular railing in front.

import * as THREE from 'three';
import { box, sign } from '../gfx';
import { person } from '../models';
import { ROWS, STALL_SIGNS, STREETS, type CartKind } from '../../content/streetlife';
import type { MapData } from '../../sim/mapdata';
import { frameAt, kerbOffset, sideNormal, vary, type Unit } from '../../sim/streetlife';
import type { Rails } from './kit';

const ROOF = [0x8a4b2a, 0x9c5b36, 0x5f86a8, 0xe6dcc2, 0x7d7f6a, 0x7a3f28, 0x4f79a8];
const WOOD = 0x8a5a3c, STEEL = 0xb3b7bb, TARP_BLUE = 0x2f6db5;
const BRIGHT = [0xe2402c, 0xf2c230, 0x2f6db5, 0x1f8a46, 0xd35c8a, 0xf08a24, 0xffffff];

/** A person facing the road (+z) or away from it. */
function who(x: number, z: number, facingRoad: boolean, seated = false, i = 0) {
  const p = person(BRIGHT[i % BRIGHT.length]);
  p.position.set(x, seated ? -0.35 : 0, z);
  p.rotation.y = facingRoad ? -Math.PI / 2 : Math.PI / 2;
  return p;
}

/** Posts and a roof sloping down towards the front, over a w × d footprint. */
function shed(g: THREE.Group, w: number, d: number, roof: number, back = 2.8, front = 2.45) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.08, sz < 0 ? back : front, 0.08, 0x4a4038, sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05)));
  const r = box(w + 0.3, 0.06, d + 0.7, roof, 0, (back + front) / 2 - 0.03, 0.2);
  r.rotation.x = Math.atan2(back - front, d);
  g.add(r);
  // A tube light under the front of the roof: the row glows after dark.
  const tube = box(Math.min(1.2, w * 0.5), 0.07, 0.07, 0xfff8e0, 0, front - 0.25, d / 2 - 0.25);
  tube.userData.glow = 3;
  g.add(tube);
}

function goods(g: THREE.Group, w: number, d: number, v: number, i: number) {
  const fz = d / 2 - 0.5;
  if (v === 0) { // tea: a kettle on a stove, glasses
    g.add(box(0.35, 0.2, 0.35, 0x333333, -w * 0.25, 0.95, fz), box(0.26, 0.3, 0.26, 0xb9b9b9, -w * 0.25, 1.15, fz));
    for (let k = 0; k < 5; k++) g.add(box(0.07, 0.12, 0.07, 0xe9f2f4, k * 0.14, 0.95, fz + 0.1));
  } else if (v === 1) { // fruit: bananas hanging from the front beam, crates on the counter
    for (let k = 0; k < 3; k++) g.add(box(0.22, 0.5, 0.22, 0xe9c437, -w * 0.3 + k * 0.45, 1.55, d / 2 - 0.12));
    for (let k = 0; k < 4; k++) g.add(box(0.4, 0.18, 0.35, BRIGHT[(k + i) % 5], -w * 0.3 + k * 0.42, 0.95, fz));
  } else if (v === 2) { // snacks: a row of glass jars
    for (let k = 0; k < 6; k++) g.add(box(0.2, 0.28, 0.2, 0xa9d3df, -w * 0.32 + k * 0.26, 0.95, fz));
  } else if (v === 3) { // paan and cigarettes: strips of packets hanging
    for (let k = 0; k < 6; k++) g.add(box(0.12, 0.7, 0.03, BRIGHT[(k + i) % BRIGHT.length], -w * 0.35 + k * 0.28, 1.45, d / 2 - 0.1));
  } else { // cooking: a big kadai and a gas cylinder
    g.add(box(0.8, 0.15, 0.6, 0x2a2a2a, w * 0.15, 0.95, fz), box(0.35, 0.65, 0.35, 0xc0281f, -w * 0.35, 0, fz - 0.6));
  }
}

function stall(u: Unit): THREE.Group {
  const g = new THREE.Group();
  const { w, d, i } = u;
  const v = Math.floor(vary(i, 7) * 5);
  const roof = ROOF[Math.floor(vary(i, 1) * ROOF.length)];
  switch (u.kind) {
    case 'lunch': { // NORTH §1 ~180 m: long shed, blue tarp walls, benches and tables
      shed(g, w, d, 0x7a5a3a, 2.9, 2.5);
      g.add(box(w, 2.4, 0.06, TARP_BLUE, 0, 0, -d / 2), box(0.06, 2.0, d, TARP_BLUE, -w / 2, 0, 0), box(0.06, 2.0, d, TARP_BLUE, w / 2, 0, 0));
      g.add(box(w, 0.5, 0.06, TARP_BLUE, 0, 1.95, d / 2)); // valance
      for (let x = -w / 2 + 1.5; x < w / 2 - 1; x += 2.4) {
        g.add(box(1.6, 0.75, 0.7, WOOD, x, 0, 0), box(1.6, 0.42, 0.3, 0x6b4a33, x, 0, 0.75), box(1.6, 0.42, 0.3, 0x6b4a33, x, 0, -0.75));
        if (vary(Math.round(x), i) > 0.4) g.add(who(x - 0.3, 0.9, false, true, Math.round(x)));
      }
      g.add(box(0.05, 3.8, 0.05, 0x444444, w / 2 - 0.2, 0, d / 2), box(0.6, 0.35, 0.02, 0xf08a24, w / 2 + 0.1, 3.3, d / 2)); // flag
      break;
    }
    case 'longtarp': { // NORTH §1 ~90 m: 5–6 stalls under one long rusty tarp against the wall
      shed(g, w, d, 0x8a4b2a);
      for (let x = -w / 2 + 0.5; x < w / 2 - 0.5; x += 2.5) g.add(box(0.08, 2.5, 0.08, 0x4a4038, x, 0, d / 2 - 0.05));
      g.add(box(w, 2.2, 0.06, 0x9a9488, 0, 0, -d / 2));
      let k = 0;
      for (let x = -w / 2 + 1.3; x < w / 2 - 1; x += 2.5, k++) {
        g.add(box(2.1, 0.95, 0.6, k % 2 ? STEEL : WOOD, x, 0, d / 2 - 0.5), box(1.8, 0.6, 0.03, k % 2 ? 0xe2402c : 0xf08a24, x, 1.6, -d / 2 + 0.05)); // banners
        const sub = new THREE.Group(); sub.position.x = x; goods(sub, 2.1, d, (k + i) % 5, k); g.add(sub);
        g.add(who(x, d / 2 - 1.1, true, false, k), box(1.6, 0.42, 0.35, 0x6b4a33, x, 0, d / 2 + 0.7));
        if (k % 2 === 0) g.add(who(x + 0.4, d / 2 + 0.75, false, true, k + 3));
      }
      break;
    }
    case 'kiosk': case 'chairs': { // NORTH §1 ~320 m: paan/tea kiosks and a plastic-chair tea stall on the footpath
      if (u.kind === 'kiosk') {
        const c = BRIGHT[(i + 2) % 4];
        g.add(box(w - 0.6, 0.9, d - 0.4, c, 0, 0, 0), box(w - 0.6, 0.15, d - 0.4, c, 0, 1.9, 0));
        for (const sx of [-1, 1]) g.add(box(0.08, 1.0, 0.08, 0x444444, sx * (w / 2 - 0.35), 0.9, d / 2 - 0.25));
        g.add(box(w, 0.05, d + 0.3, roof, 0, 2.15, 0.15));
        goods(g, w - 0.6, d - 0.4, 3, i);
        g.add(who(0, -0.1, true, false, i));
      } else {
        g.add(box(w, 0.05, d + 1.6, TARP_BLUE, 0, 2.3, 0.6), box(0.06, 2.3, 0.06, 0x444444, -w / 2, 0, d / 2 + 1.2), box(0.06, 2.3, 0.06, 0x444444, w / 2, 0, d / 2 + 1.2));
        g.add(box(1.0, 0.9, 0.5, WOOD, -w / 2 + 0.6, 0, -d / 2 + 0.3), box(0.26, 0.3, 0.26, 0xb9b9b9, -w / 2 + 0.6, 0.9, -d / 2 + 0.3));
        for (let k = 0; k < 6; k++) {
          const x = -w / 2 + 0.7 + (k % 3) * 0.9, z = -0.2 + Math.floor(k / 3) * 1.1;
          g.add(box(0.45, 0.45, 0.45, [0xd9342b, 0x2f6db5, 0xf4f4f0][k % 3], x, 0, z), box(0.45, 0.45, 0.06, [0xd9342b, 0x2f6db5, 0xf4f4f0][k % 3], x, 0.45, z - 0.2));
          if (k % 2 === 0) g.add(who(x, z, k > 2, true, k));
        }
      }
      break;
    }
    case 'shack': { // lean-tos against a sheet fence: roof sloping back
      g.add(box(w, 2.3, 0.06, 0x8f8f86, 0, 0, -d / 2));
      shed(g, w, d, roof, 2.1, 2.5);
      g.add(box(w * 0.8, 0.9, 0.5, WOOD, 0, 0, d / 2 - 0.45), box(0.6, 0.6, 0.6, 0xc8a26a, w / 2 - 0.5, 0, -d / 2 + 0.5));
      goods(g, w, d, v, i);
      g.add(who(0, d / 2 - 1.0, true, false, i));
      if (i % 2) g.add(who(0.4, d / 2 + 0.8, false, false, i + 1));
      break;
    }
    default: { // tin, tea, food: the hawker shed
      shed(g, w, d, roof);
      g.add(box(w, 2.5, 0.06, u.kind === 'food' ? 0x9a9488 : ROOF[(i + 3) % ROOF.length], 0, 0, -d / 2)); // back tarp
      if (i % 3 === 0) g.add(box(0.06, 1.6, d * 0.7, roof, -w / 2, 0.9, -d * 0.1)); // side tarp
      g.add(box(w * 0.8, 0.95, 0.6, i % 3 === 1 ? STEEL : WOOD, 0, 0, d / 2 - 0.5));
      goods(g, w, d, u.kind === 'tea' ? 0 : u.kind === 'food' ? 4 : v, i);
      g.add(who(0.2, d / 2 - 1.1, true, false, i));
      if (u.kind === 'tea' || vary(i, 5) < 0.3) g.add(box(1.8, 0.42, 0.35, 0x6b4a33, 0, 0, d / 2 + 0.75)); // bench
      if (u.kind !== 'tin' || vary(i, 9) < 0.35) g.add(who(-0.4, d / 2 + 0.85, false, u.kind === 'tea', i + 2));
      if (vary(i, 11) < 0.4) g.add(box(0.35, 0.4, 0.35, [0xd9342b, 0x2f6db5][i % 2], w / 2 - 0.4, 0, d / 2 + 0.6)); // plastic stool
      if (i % 2 === 0) {
        const b = sign(STALL_SIGNS[i % STALL_SIGNS.length], Math.min(w * 0.9, 3.2), 0.45, ['#f6efe0', '#c0281f', '#1f5f9a', '#f2c230'][i % 4], i % 4 === 0 ? '#7a1f1f' : '#ffffff');
        b.position.set(0, 2.25, d / 2 + 0.33);
        b.rotation.x = -0.12;
        g.add(b);
      }
    }
  }
  return g;
}

function cart(kind: CartKind, i: number): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'phuchka') {
    g.add(box(1.4, 0.8, 0.9, 0x8a8a8a, 0, 0, 0), box(1.2, 0.5, 0.7, 0x9fc4d6, 0, 0.8, 0), box(0.4, 0.35, 0.4, 0xb0b0b0, 0.9, 0, 0.6));
    for (let k = 0; k < 6; k++) g.add(box(0.12, 0.12, 0.12, 0xe0b060, -0.4 + (k % 3) * 0.3, 0.9 + Math.floor(k / 3) * 0.15, 0));
    g.add(who(0, -0.9, true, false, i), who(-0.5, 1.1, false, false, i + 1), who(0.5, 1.2, false, false, i + 2));
  } else if (kind === 'fruit') {
    g.add(box(2.2, 0.15, 1.1, 0x7a5232, 0, 0.75, 0), box(0.5, 0.5, 0.1, 0x222222, -0.6, 0.1, -0.6), box(0.5, 0.5, 0.1, 0x222222, 0.6, 0.1, -0.6));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.add(box(0.42, 0.18, 0.26, BRIGHT[(r + c + i) % 5], -0.75 + c * 0.5, 0.9 + r * 0.06, -0.35 + r * 0.33));
    g.add(who(0, -1.0, true, false, i));
  } else {
    // Ice-cream cart under a yellow umbrella, or a table under a red one.
    const yellow = kind === 'umbrella';
    g.add(box(1.3, 0.9, 0.8, yellow ? 0xf4f0e0 : WOOD, 0, 0.2, 0), box(0.5, 0.5, 0.1, 0x222222, -0.4, 0, 0.45));
    if (yellow) g.add(box(1.3, 0.25, 0.82, 0xf2c230, 0, 0.75, 0));
    g.add(box(0.05, 2.2, 0.05, 0x333333, 0.3, 0.2, 0), box(2.2, 0.12, 2.2, yellow ? 0xf2c230 : 0xd9342b, 0.3, 2.35, 0), box(1.5, 0.1, 1.5, yellow ? 0xf2c230 : 0xd9342b, 0.3, 2.45, 0));
    g.add(who(0, -0.9, true, false, i));
  }
  return g;
}

export function buildStalls(root: THREE.Object3D, map: MapData, units: Unit[], rails: Rails) {
  for (const u of units) {
    const g = stall(u);
    g.position.set(u.x, 0, u.z);
    g.rotation.y = u.rot;
    root.add(g);
  }
  for (const row of ROWS) {
    const line = STREETS[row.street];
    const mine = units.filter((u) => u.kind === row.kind && u.m >= row.from && u.m <= row.to + 10);
    // SOUTH §1: a white tubular railing in front of the Street 2 stalls, with gaps to get in.
    if (row.railing) for (const u of mine) {
      if (u.i % 4 === 1) continue;
      const fx = u.x - u.nx * (u.d / 2 + 0.35), fz = u.z - u.nz * (u.d / 2 + 0.35);
      rails.strip(fx - u.dx * u.w / 2, fz - u.dz * u.w / 2, fx + u.dx * u.w / 2, fz + u.dz * u.w / 2, 0, 1.0, 'tube');
    }
    // Carts stand on the footpath in front of their row, never on their own.
    for (const c of row.carts ?? []) {
      const f = frameAt(line, c.at), n = sideNormal(f, row.side), k = kerbOffset(map.roads, f, n) + 1.0;
      const g = cart(c.kind, Math.round(c.at));
      g.position.set(f.x + n[0] * k, 0, f.z + n[1] * k);
      g.rotation.y = Math.atan2(-n[0], -n[1]);
      root.add(g);
    }
  }
}
