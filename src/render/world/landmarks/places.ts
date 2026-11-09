// Set-back places along the route (LANDMARKS.md §6-7). Frames face the road (u toward it), v across.
// - Salt Lake Stadium (stadium_bypass_h90): a white vertical-bar fence round a pink paver plaza, the concrete
//   portal gate (two square pillars, a lintel, the round emblem on top), the VYBK letters, floodlight masts and the
//   bowl's rim only suggested behind a tree belt (the bowl isn't visible from the road), the beige admin block.
// - Karunamoyee bus terminus (karunamoyee_bus_h90): an open asphalt yard with angled bays split by grass islands,
//   white sheds with blue trim, the blue-and-white gate arch, coaches and buses parked.
// - Karunamoyee clock tower: a tall square tan-brick shaft with clock faces near the top (lit at night).
// - Generic models for kinds without a surveyed look: mall (City Centre's facade is unverified, so a plain one),
//   market, hospital, and a name board for anything else.

import * as THREE from 'three';
import type { Landmark } from '../../../sim/gen/types';
import { LM_TEXT } from '../../../content/landmarks';
import type { Frame } from './ctx';
import { bus, hoarding, K, palm, shed, tree } from './kit';

const C = {
  paver: 0xc98c86, fence: 0xf2f2ee, concrete: 0xb9b4aa, emblem: 0xe8e4da, mast: 0x8e959b, light: 0xfff6dc, bowl: 0xd8d4cc,
  bowlDark: 0x9a968e, beige: 0xd9c8a4, asphalt: 0x4c4a50, grass: 0x5e8b43, shedWhite: 0xeeece6, blue: 0x2f6db5,
  brick: 0xc8975e, brickDark: 0x9c6c3e, face: 0xf4f1e6, hand: 0x1d1d1d, cream: 0xe9dcc0, glass: 0x5d7fa3,
};

export function stadiumGate(f: Frame) {
  f.box(-44, 6, -60, 60, 0, 0.05, C.paver);
  for (let v = -60; v < 60 - 1e-6; v += 0.9) { // the fence of white vertical bars, open at the gate
    if (Math.abs(v + 0.45) < 8) continue;
    f.box(6, 6.08, v, v + 0.08, 0, 2.4, C.fence);
  }
  for (const y of [0.3, 2.3]) for (const s of [-1, 1]) f.box(5.95, 6.12, s * 8, s * 60, y, y + 0.08, C.fence);
  for (let v = -56; v <= 56; v += 16) if (Math.abs(v) > 8) f.box(5.6, 6.5, v - 0.45, v + 0.45, 0, 2.8, C.fence);
  // The portal: two square pillars, a lintel, the round emblem standing on top.
  for (const s of [-1, 1]) f.box(-1.2, 1.2, s * 7 - 1.2, s * 7 + 1.2, 0, 7.4, C.concrete);
  f.box(-1.5, 1.5, -9, 9, 7.4, 8.6, C.concrete);
  const disc = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 16);
  disc.rotateZ(Math.PI / 2);
  disc.translate(0, 10.3, 0);
  f.geo(disc, C.emblem);
  f.sign('◉', 2.4, 2.4, 0.2, 0, 10.3, 1, 0, '#e8e4da', '#2a5aa8');
  f.box(-0.4, 0.4, -0.4, 0.4, 8.6, 9, C.concrete);
  f.sign(LM_TEXT.stadium, 7, 2.4, -12, -3, 1.3, 1, 0, '#dfe8f2', '#2a5aa8');
  f.sign(LM_TEXT.stadiumBn, 9, 1.0, 1.55, 0, 8.0, 1, 0, '#b9b4aa', '#1e3f7a');
  // Tall pole lamps across the plaza.
  for (const v of [-40, -20, 20, 40]) {
    f.cyl(-8, v, 0.12, 0, 10, C.mast, 6);
    f.box(-8.6, -7.4, v - 0.2, v + 0.2, 10, 10.2, C.light, 3);
  }
  // Tree belt, then the bowl rim (upper tier only) and floodlight masts beyond it.
  for (let v = -56, i = 0; v <= 56; v += 8, i++) tree(f, -48 - (i % 2) * 4, v, 1.4, i);
  const cu = -112, R = 52;
  for (let k = -6; k < 6; k++) {
    const a0 = (k / 6) * 0.8, a1 = ((k + 1) / 6) * 0.8;
    const P = (a: number, r: number, y: number): [number, number, number] => [cu + Math.cos(a) * r, Math.sin(a) * r, y];
    f.quad(P(a0, R, 6), P(a1, R, 6), P(a1, R - 6, 17), P(a0, R - 6, 17), k % 2 ? C.bowl : C.bowlDark);
    f.quad(P(a0, R - 6, 17), P(a1, R - 6, 17), P(a1, R - 6.5, 18.2), P(a0, R - 6.5, 18.2), C.concrete);
    f.quad(P(a0, R, 0), P(a1, R, 0), P(a1, R, 6), P(a0, R, 6), C.bowlDark);
  }
  for (const a of [-0.75, 0.75]) {
    const u = cu + Math.cos(a) * (R + 4), v = Math.sin(a) * (R + 4);
    f.box(u - 0.8, u + 0.8, v - 0.8, v + 0.8, 0, 42, C.mast);
    f.box(u - 0.4, u + 2.4, v - 3, v + 3, 42, 46, 0x6c7378);
    f.box(u + 2.4, u + 2.5, v - 2.8, v + 2.8, 42.2, 45.8, C.light, 3);
  }
  // The beige admin block with its curved glass front, to the north-east.
  f.box(-30, -8, 36, 58, 0, 13, C.beige);
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI / 2, a1 = ((k + 1) / 6) * Math.PI / 2;
    const P = (a: number, y: number): [number, number, number] => [-8 + Math.cos(a) * 6 - 6, 36 + 11 - Math.sin(a) * 11 + 0, y];
    f.quad(P(a0, 0.5), P(a1, 0.5), P(a1, 12.5), P(a0, 12.5), C.glass, 0.5);
  }
}

export function busTerminus(f: Frame) {
  f.box(-34, 8, -24, 24, 0, 0.04, C.asphalt);
  for (let i = 0; i < 4; i++) f.box(-30 + i * 9, -28 + i * 9, -18, 4, 0.04, 0.3, C.grass); // islands between bays
  const LOOK: [number, number][] = [[0x2c86c9, 0xf1efe8], [0xe9c437, 0xd8352a], [0x2e8a57, 0xf1efe8], [0xf1efe8, 0x2f6db5], [0xd8352a, 0xf2c230]];
  for (let i = 0; i < 5; i++) bus(f, -25.5 + i * 9, -7, Math.PI / 2 + 0.35, LOOK[i][0], LOOK[i][1], i === 0 ? 12 : 10);
  // Single-storey white sheds with blue trim along the back, with a long name board.
  for (let i = 0; i < 3; i++) {
    const v0 = -22 + i * 15;
    f.box(-34, -26, v0, v0 + 12, 0, 3.4, C.shedWhite);
    f.box(-34.3, -25.6, v0 - 0.3, v0 + 12.3, 3.4, 3.8, C.blue);
    f.box(-26.05, -25.95, v0 + 1, v0 + 11, 0.4, 2.6, 0x34404c, 0.5);
  }
  f.sign(LM_TEXT.terminus, 16, 1.2, -25.5, 0, 4.6, 1, 0, '#2f6db5', '#ffffff');
  // The blue-and-white gate arch over the entrance.
  for (const s of [-1, 1]) for (let y = 0; y < 6; y += 1) f.box(6.4, 7.6, s * 9 - 0.6, s * 9 + 0.6, y, y + 1, (y + (s > 0 ? 1 : 0)) % 2 ? C.blue : 0xf1efe8);
  for (let v = -9.6, i = 0; v < 9.6; v += 1.6, i++) f.box(6.4, 7.6, v, Math.min(9.6, v + 1.6), 6, 7, i % 2 ? C.blue : 0xf1efe8);
  for (const v of [-20, 20]) tree(f, 2, v, 1.2, 2);
}

export function clockTower(f: Frame) {
  const s = 1.3, top = 21;
  f.box(-s - 0.4, s + 0.4, -s - 0.4, s + 0.4, 0, 1.2, C.brickDark);
  f.box(-s, s, -s, s, 1.2, top, C.brick);
  for (let y = 4; y < top - 3; y += 3.2) f.box(-s - 0.08, s + 0.08, -s - 0.08, s + 0.08, y, y + 0.25, C.brickDark);
  for (let y = 3; y < top - 5; y += 3.2) for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    f.boxAt(du * s, dv * s, du ? 0.12 : 0.6, du ? 0.6 : 0.12, y, 1.2, 0x5a3a24); // slit windows
  }
  f.box(-s - 0.4, s + 0.4, -s - 0.4, s + 0.4, top, top + 3.6, C.brick);
  f.box(-s - 0.6, s + 0.6, -s - 0.6, s + 0.6, top + 3.6, top + 4.1, C.brickDark);
  f.box(-0.8, 0.8, -0.8, 0.8, top + 4.1, top + 5, C.brickDark);
  for (let k = 0; k < 4; k++) { // a lit clock face on every side
    const a = (k * Math.PI) / 2, du = Math.cos(a), dv = Math.sin(a), o = s + 0.42;
    const face = new THREE.CylinderGeometry(1.05, 1.05, 0.06, 14);
    face.rotateZ(Math.PI / 2);
    face.rotateY(-a);
    face.translate(du * o, top + 1.8, dv * o);
    f.geo(face, C.face, 1.5);
    f.boxAt(du * (o + 0.05), dv * (o + 0.05), 0.04, 0.08, top + 1.8, 0.7, C.hand, a);
    f.boxAt(du * (o + 0.06), dv * (o + 0.06), 0.04, 0.5, top + 1.75, 0.08, C.hand, a);
  }
}

export function mall(f: Frame) {
  f.box(-40, 0, -28, 28, 0, 15, C.beige);
  f.box(-40.3, 0.3, -28.3, 28.3, 15, 15.8, 0xb9a98a);
  for (let y = 1; y < 14; y += 3.6) f.box(0, 0.08, -26, -10, y, y + 2.4, C.glass, 0.6);
  f.box(-2, 0.1, -8, 8, 0, 12, C.glass, 0.7); // the glass atrium
  f.box(0, 4, -9, 9, 4.2, 4.6, 0xb9a98a);
  f.sign(LM_TEXT.mall, 14, 1.6, 0.15, 0, 13.4, 1, 0, '#7a1f2b', '#ffe9b0');
  hoarding(f, -2, 18, 6, 12, 4, LM_TEXT.hoardings[3], 1, 0, '#2b2b2b', '#f2c230');
  for (const v of [-24, -14, 14, 24]) palm(f, 4, v);
}

export function market(f: Frame) {
  f.box(-30, 0, -20, 20, 0, 0.04, 0x8a847a);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) shed(f, -26 + i * 3.4, -14 + row * 13, 3.2, 3, row % 2 ? Math.PI : 0, row * 9 + i);
  for (let i = 0; i < 14; i++) f.boxAt(-20 + (i % 7) * 3.5, (i < 7 ? -6 : 6) + (i % 3) * 0.6, 0.9, 0.7, 0, 0.5 + (i % 2) * 0.5, [0xb5651d, 0x7da84a, 0xd8a028][i % 3]);
  for (const s of [-1, 1]) f.box(1, 1.8, s * 6 - 0.4, s * 6 + 0.4, 0, 5.4, 0x8a5a3c);
  f.box(1, 1.8, -6.4, 6.4, 5.4, 6.4, 0x8a5a3c);
  f.sign(LM_TEXT.market, 11, 1.0, 1.85, 0, 5.9, 1, 0, '#f2c230', '#7a1f2b');
}

export function hospital(f: Frame) {
  const top = 6 * 2.4 + 1;
  f.box(-40, -6, -24, 24, 0, top, C.cream);
  for (let k = 0; k < 6; k++) for (let v = -22; v < 22; v += 3) {
    f.box(-6, -5.88, v, v + 2, 1.2 + k * 2.4, 2.8 + k * 2.4, 0xe2b832);
    f.box(-5.9, -5.82, v + 0.25, v + 1.75, 1.4 + k * 2.4, 2.6 + k * 2.4, 0x34404c, (k + v) % 3 === 0 ? 0.6 : 0.15);
  }
  f.box(-6, 0, -6, 6, 3.6, 4.1, C.cream); // porch
  for (const s of [-1, 1]) f.box(-0.5, 0, s * 5.5 - 0.25, s * 5.5 + 0.25, 0, 3.6, C.cream);
  f.sign(LM_TEXT.hospital, 16, 1.2, -5.8, 0, top - 2.2, 1, 0, '#f4f1e6', '#b0322a');
  f.sign('+', 1.6, 1.6, 0.05, 0, 4.9, 1, 0, '#ffffff', '#d8202a');
}

/** A plain green name board on two posts, for any landmark without a model of its own. */
export function nameBoard(f: Frame, lm: Landmark) {
  for (const s of [-1, 1]) f.box(-0.08, 0.08, s * 2.2 - 0.08, s * 2.2 + 0.08, 0, 3.2, K.steel);
  f.sign(lm.name.toUpperCase(), 4.8, 0.9, 0.1, 0, 2.8, 1, 0, '#1f6b3a', '#ffffff');
}
