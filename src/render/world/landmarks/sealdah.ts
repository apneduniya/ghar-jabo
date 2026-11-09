// Sealdah station, the finale (LANDMARKS.md §1). Local frame: origin at the forecourt, u toward the flyover and
// APC Road (the landmark's heading, about west), v to its right-hand side seen from above (about north).
// - Sealdah North (sealdah_d_h0/h90, fore2_h0): a long 4-storey block, white with bright orange vertical fins and
//   floor bands, box windows and AC units, a concrete canopy with big pink "SEALDAH (NORTH)" letters, wide steps,
//   white railings and murals on the ground floor. It fronts the forecourt from the north.
// - Sealdah Main (sealdah_front_h90): the older red-brick block with cream bands and white window frames, a yellow
//   Ambassador taxi rank with barricades in front.
// - The concourse between them under a green translucent roof on a steel lattice (sealdah_front_h0), the yellow
//   "Sealdah Main" sign, food kiosks.
// - The forecourt: paved, steel crowd barriers, the round brick planter with the golden winged statue on a blue disc
//   (sealdah_d_h270), hoardings on lattice frames around it, the tall flag mast, hawker sheds toward the flyover.
// - The footbridge over SH1 south of the station, yellow-green girders under ad banners (sealdah_e_h180).
// - Vidyapati Setu itself comes from the network's flyover roads (decks.ts); if the network has none nearby, a
//   stand-in deck is drawn here. No station clock: the survey found none.

import * as THREE from 'three';
import { LM_TEXT } from '../../../content/landmarks';
import type { Ctx, Frame } from './ctx';
import { flyoverNear } from './decks';
import { barriers, flag, hoarding, K, shed, taxi, tree } from './kit';

const C = {
  pave: 0xa8a29a, paveDark: 0x928c84, white: 0xf0ede6, orange: 0xf08a24, glass: 0x34404c, lit: 0x8a7a58, ac: 0xb9bcbe, canopy: 0xe9e4da,
  step: 0xbdb7ad, mural: [0x3f6fb5, 0xd9822b, 0x7bb661, 0xc4573f, 0xe8c547, 0x8d6aa8], rail: 0xf4f4f0,
  brick: 0xb4543c, roof: 0x9a958c, cream: 0xe9dcc0, frame: 0xf5f2ea, roofGreen: 0x1f9a6e, steel: 0x4a5560, floor: 0xc8c2b6,
  kiosk: 0xd8352a, yellow: 0xf2c230, blue: 0x2f5fa8, planter: 0x9a5b3e, grass: 0x5e8b43,
};

export function sealdah(ctx: Ctx, f: Frame) {
  forecourt(f);
  northBlock(f);
  mainBlock(f);
  concourse(f);
  hawkers(f);
  footbridge(ctx, f);
  if (!flyoverNear(ctx, f.x, f.z, 120)) standInSetu(f);
}

function forecourt(f: Frame) {
  f.box(-24, 34, -72, 46, 0, 0.05, C.pave);
  for (let v = -70; v < 44; v += 8) f.box(-24, 34, v, v + 0.25, 0.05, 0.06, C.paveDark); // paving joints
  // Queue barriers and a ring of them along the station front.
  barriers(f, -18, 38, 12, 38);
  barriers(f, -18, 30, 4, 30);
  barriers(f, 12, 38, 12, 22);
  barriers(f, -6, -2, -6, 18);
  // The round planter with railings and the golden winged statue on a blue disc.
  const pu = 12, pv = 6;
  f.cyl(pu, pv, 4.2, 0, 0.9, C.planter, 16);
  f.cyl(pu, pv, 4.0, 0.9, 0.08, C.grass, 16);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, b = ((k + 1) / 16) * Math.PI * 2, r = 4.05;
    f.boxAt(pu + Math.cos(a) * r, pv + Math.sin(a) * r, 0.08, 0.08, 0.9, 1.0, k % 4 ? C.rail : 0xb8322a);
    f.span(pu + Math.cos(a) * r, pv + Math.sin(a) * r, pu + Math.cos(b) * r, pv + Math.sin(b) * r, 1.8, 0.07, 0.07, 0xb8322a);
  }
  f.box(pu - 0.6, pu + 0.6, pv - 0.6, pv + 0.6, 0.9, 2.2, C.white);
  const disc = new THREE.CylinderGeometry(2.1, 2.1, 0.25, 16);
  disc.rotateZ(Math.PI / 2);
  disc.translate(pu - 1.0, 4.2, pv);
  f.geo(disc, C.blue);
  f.box(pu - 0.35, pu + 0.35, pv - 0.35, pv + 0.35, 2.2, 4.4, K.gold); // the figure, robed
  const head = new THREE.IcosahedronGeometry(0.32, 0);
  head.translate(pu, 4.75, pv);
  f.geo(head, K.gold);
  for (const s of [-1, 1]) f.quad([pu - 0.2, pv + s * 0.3, 3.6], [pu - 0.2, pv + s * 2.2, 5.6], [pu - 0.2, pv + s * 2.6, 4.6], [pu - 0.2, pv + s * 0.4, 3.2], K.gold);
  // Hoardings ringing the forecourt, the flag mast, a few trees.
  hoarding(f, 30, -20, 4, 12, 4, LM_TEXT.hoardings[0], -1, 0, '#f2c230', '#1d3f8a');
  hoarding(f, 30, 4, 7, 14, 4.5, LM_TEXT.hoardings[1], -1, 0, '#7a1f2b', '#ffe9b0');
  hoarding(f, 4, -70, 5, 14, 4, LM_TEXT.hoardings[2], 0, 1, '#2b2b2b', '#f2c230');
  hoarding(f, -40, 66, 13, 16, 4.5, LM_TEXT.welcome, 0, -1, '#1e58a8', '#ffffff');
  flag(f, 22, 50, 26, 0xff9933);
  f.boxAt(22.6, 50, 1.2, 0.03, 24.35, 0.25, 0xffffff);
  f.boxAt(22.6, 50, 1.2, 0.03, 24.1, 0.25, 0x138808);
  for (const [u, v, i] of [[26, -40, 0], [27, 30, 1], [-20, -68, 2]] as const) tree(f, u, v, 1, i);
}

/** Sealdah North: facade on v = 48 facing -v, 150 units (300 m) long. */
function northBlock(f: Frame) {
  const v0 = 48, v1 = 62, u0 = -130, u1 = 18, G = 4.2, FL = 2.9, top = G + 3 * FL;
  f.box(u0, u1, v0, v1, 0, top + 0.6, C.white);
  f.box(u0 + 0.5, u1 - 0.5, v0 + 0.5, v1 - 0.5, top + 0.6, top + 0.65, C.roof);
  for (const [a, b, c, d] of [[u0, u1, v0 - 0.4, v0 + 0.2], [u0, u1, v1 - 0.2, v1], [u0, u0 + 0.3, v0, v1], [u1 - 0.3, u1, v0, v1]])
    f.box(a, b, c, d, top + 0.6, top + 1.3, C.orange); // parapet rim
  for (let k = 0; k < 3; k++) f.box(u0, u1, v0 - 0.7, v0, G + k * FL - 0.3, G + k * FL + 0.25, C.orange); // floor bands
  // Bays: a white box frame standing out round each window, orange fins between the bays, AC units here and there.
  for (let u = u0 + 1.5, i = 0; u < u1 - 1; u += 3.2, i++) {
    f.box(u - 0.2, u + 0.2, v0 - 0.9, v0, G - 0.3, top + 0.6, C.orange);
    for (let k = 0; k < 3; k++) {
      const y = G + k * FL;
      f.box(u + 0.35, u + 2.85, v0 - 0.6, v0, y + 0.45, y + 2.45, C.white);
      const lit = (i + k) % 4 === 1;
      f.box(u + 0.6, u + 2.6, v0 - 0.62, v0 - 0.5, y + 0.7, y + 2.2, lit ? C.lit : C.glass, lit ? 1.2 : 0);
    }
    if (i % 3 === 1) f.box(u + 1.7, u + 2.5, v0 - 1.0, v0 - 0.6, G + FL * (i % 2) + 0.5, G + FL * (i % 2) + 1.0, C.ac);
  }
  // Ground floor: murals, open entrances, the canopy with the big letters and its night light.
  for (let u = u0, i = 0; u < u1; u += 3.6, i++) {
    const door = u > -42 && u < 6 && i % 3 !== 0;
    f.box(u, u + 3.6, v0 - 0.06, v0, 0.6, G - 0.4, door ? 0x1e1e22 : C.mural[i % C.mural.length], door ? 0.4 : 0);
  }
  f.box(-44, 8, v0 - 5, v0, G - 0.2, G + 0.5, C.canopy);
  f.box(-44, 8, v0 - 5.05, v0 - 4.9, G - 1.2, G + 0.9, C.canopy);
  f.box(-43, 7, v0 - 4.8, v0 - 4.5, G - 0.35, G - 0.2, 0xfff4d0, 3);
  f.sign(LM_TEXT.sealdahNorth, 26, 2.1, -18, v0 - 5.12, G - 0.15, 0, -1, '#efe9de', '#c2386b');
  f.sign(LM_TEXT.sealdahNorthBn, 10, 1.4, -38, v0 - 5.12, G - 0.15, 0, -1, '#efe9de', '#b03060');
  f.sign(LM_TEXT.sealdahNorthHi, 8, 1.4, 2, v0 - 5.12, G - 0.15, 0, -1, '#efe9de', '#b03060');
  for (let k = 0; k < 4; k++) f.box(-40, 4, v0 - 5 - k * 0.9, v0 - 4.1 - k * 0.9, 0, 0.6 - k * 0.15, C.step);
  barriers(f, -60, v0 - 1.5, -44, v0 - 1.5, C.rail);
  barriers(f, 8, v0 - 1.5, 17, v0 - 1.5, C.rail);
  f.box(-80, -74, v0 + 2, v0 + 5, top + 1.2, top + 2.6, 0x103a20); // the green LED display on the roof line
  f.box(-79.8, -74.2, v0 + 1.95, v0 + 2.0, top + 1.4, top + 2.4, 0x3fdc6a, 2);
}

/** Sealdah Main: red brick with cream bands and white window frames, facade on u = -24 facing +u. */
function mainBlock(f: Frame) {
  const u0 = -46, u1 = -24, v0 = -78, v1 = 4, G = 3.6, FL = 2.8, top = G + 3 * FL;
  f.box(u0, u1, v0, v1, 0, top + 0.8, C.brick);
  f.box(u0 + 0.4, u1 - 0.4, v0 + 0.4, v1 - 0.4, top + 0.8, top + 0.85, C.roof);
  f.box(u1, u1 + 0.4, v0 - 0.3, v1 + 0.3, top + 0.5, top + 1.1, C.cream);
  for (let k = 0; k < 4; k++) f.box(u1, u1 + 0.25, v0, v1, G - 0.55 + k * FL, G + 0.1 + k * FL, C.cream);
  for (let v = v0 + 1.2, i = 0; v < v1 - 1.5; v += 3.4, i++) for (let k = 0; k < 4; k++) {
    const y = k === 0 ? 0.8 : G + 0.5 + (k - 1) * FL;
    f.box(u1, u1 + 0.15, v, v + 2, y, y + (k === 0 ? 2.2 : 1.7), C.frame);
    f.box(u1 + 0.1, u1 + 0.2, v + 0.25, v + 1.75, y + 0.2, y + (k === 0 ? 2.0 : 1.5), k === 0 && i % 4 === 0 ? 0x1e1e22 : (i + k) % 3 === 0 ? C.lit : C.glass, (i + k) % 3 === 0 ? 1.2 : 0);
  }
  // The taxi rank: angled rows of yellow Ambassadors inside yellow barricades.
  for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) taxi(f, -18 + row * 5.2, -36 + i * 6.5 + row * 1.5, 0.35 + (row % 2) * 0.2);
  barriers(f, -21, -40, -21, -2, K.yellowBarrier);
  barriers(f, -4, -40, -4, -8, K.yellowBarrier);
  barriers(f, -21, -40, -4, -40, K.yellowBarrier);
  // A parody bank sign on a pole at the rank's corner.
  f.cyl(-3, -44, 0.12, 0, 5.5, 0x5c6066, 6);
  f.sign(LM_TEXT.hoardings[5], 6, 2.2, -3, -44, 5.2, 1, 0, '#e8e2c8', '#1f4f9a');
}

/** The concourse between the two blocks: green translucent roof on a steel lattice, kiosks, the yellow sign. */
function concourse(f: Frame) {
  const u0 = -64, u1 = -24, v0 = 6, v1 = 47, y = 9, ridge = 10.6;
  f.box(u0, u1, v0, v1, 0, 0.08, C.floor);
  for (let u = u0 + 2; u <= u1; u += 8) for (const v of [v0 + 1, (v0 + v1) / 2, v1 - 1]) {
    f.box(u - 0.2, u + 0.2, v - 0.2, v + 0.2, 0, y, C.steel);
  }
  for (let v = v0; v < v1 - 1e-6; v += 4) {
    const va = v, vb = Math.min(v1, v + 4), mid = (v0 + v1) / 2;
    const yAt = (vv: number) => y + (ridge - y) * (1 - Math.abs(vv - mid) / ((v1 - v0) / 2));
    f.quad([u0, va, yAt(va)], [u1 + 0.5, va, yAt(va)], [u1 + 0.5, vb, yAt(vb)], [u0, vb, yAt(vb)], C.roofGreen, 0.7);
    f.span(u0, va, u1 + 0.5, va, yAt(va) - 0.25, 0.25, 0.12, C.steel);
  }
  for (let u = u0; u <= u1; u += 4) f.span(u, v0, u, v1, y - 0.3, 0.25, 0.12, C.steel);
  // Food kiosks along the north side, murals of old Calcutta on the south wall.
  for (let i = 0; i < 5; i++) {
    const u = u0 + 4 + i * 7;
    f.box(u, u + 5, v1 - 5, v1 - 1, 0, 3, i % 2 ? C.kiosk : 0xe8b030);
    f.box(u - 0.2, u + 5.2, v1 - 5.4, v1 - 0.8, 3, 3.4, 0x2b8a3e, 1);
  }
  for (let u = u0, i = 0; u < u1; u += 4, i++) f.box(u, u + 3.8, v0 - 0.1, v0, 1, 3.4, C.mural[(i + 2) % C.mural.length]);
  f.sign(LM_TEXT.sealdahMain, 14, 1.4, u1 + 0.2, (v0 + v1) / 2, y - 1.2, 1, 0, '#f2c230', '#1d1d1d');
}

/** Tin-roofed hawker sheds in rows along the flyover side of the forecourt. */
function hawkers(f: Frame) {
  for (let i = 0; i < 18; i++) shed(f, 37, -66 + i * 5.2, 3.8, 3.2, -Math.PI / 2, i);
  for (let i = 0; i < 4; i++) shed(f, 20 + i * 4.3, -78, 3.8, 3.2, Math.PI, i + 3);
}

/** The steel footbridge over the main road south of the station, banners on both faces. */
function footbridge(ctx: Ctx, f: Frame) {
  const [x, z] = f.p(85, -140), road = ctx.nearestRoad(x, z, (r) => r.bridge !== 'flyover' && r.cls === 'primary');
  if (!road || road.d > 50) return;
  const b = ctx.frame(road.x, road.z, Math.atan2(road.dz, road.dx));
  const S = road.w / 2 + 5, y = 6.2, G = 0x9cb83a;
  for (const s of [-1, 1]) {
    b.box(-1.2, 1.2, s * S - 1.2, s * S + 1.2, 0, y, 0x6b7a4a); // stair tower
    for (const u of [-1, 1]) b.box(u - 0.15, u + 0.15, s * (S - 2) - 0.15, s * (S - 2) + 0.15, 0, y + 2.6, G);
  }
  b.box(-1.3, 1.3, -S, S, y, y + 0.35, 0x6b7a4a);
  for (const u of [-1.3, 1.3]) {
    b.box(u - 0.1, u + 0.1, -S, S, y + 0.35, y + 2.6, G);
    for (let v = -S; v <= S; v += 1.8) b.span(u, v, u, v + 1.8, y + 0.4, 0.12, 0.08, G);
  }
  for (const s of [-1, 1]) b.sign(LM_TEXT.footbridge, 2 * S - 2, 1.5, s * 1.45, 0, y + 1.5, s, 0, '#f5d33a', '#c4202a');
}

/** If the network has no Vidyapati Setu here: a straight stand-in deck west of the forecourt, tram rails and all. */
function standInSetu(f: Frame) {
  const u = 50, y = 6.5, h = 4.8;
  for (let v = -160; v < 160; v += 4) {
    f.box(u - h, u + h, v, v + 4, y - 0.9, y, 0xa9a59e);
    for (const t of [-1.6, -0.85, 0.85, 1.6]) f.box(u + t - 0.05, u + t + 0.05, v, v + 4, y, y + 0.04, 0x8b8f94);
    for (const s of [-1, 1]) f.box(u + s * (h - 0.15) - 0.13, u + s * (h - 0.15) + 0.13, v, v + 4, y, y + 1.15, C.blue);
    if ((v / 4) % 2 === 0) f.cyl(u, v + 2, 0.09, y, 0.75, 0xc8322b, 6);
    if ((v + 160) % 16 === 0) f.box(u - 0.7, u + 0.7, v - 0.5, v + 0.5, 0, y - 0.9, 0xc4bdb2);
  }
}
