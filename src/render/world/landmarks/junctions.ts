// Junction landmarks (LANDMARKS.md §3, §5). Frames face the road (u toward it).
// - Phoolbagan (phoolbagan_x_*): a round raised island with a dark-tiled plinth, shrubs, flags, bunting and blank
//   festival banners (no faces); a white statue pair on a corner pedestal; a pandal-style welcome arch across one arm;
//   a pink-red guest-house sign high on the corner. Rooftop hoardings are the separate `billboards` landmark.
// - Beliaghata, Hem Chandra Naskar Rd crossing (beliaghata_x2_*): the "I ♥ KOLKATA" letters on a steel frame over a
//   mural wall, a large bald head bust beside it, bronze and gilt statue groups on white plinths either side.
// - Kolkata Traffic Police kiosk: a white-and-blue box with the crest.

import * as THREE from 'three';
import type { Landmark } from '../../../sim/gen/types';
import { LM_TEXT } from '../../../content/landmarks';
import type { Ctx, Frame } from './ctx';
import { figure, flag, hoarding, K, tree } from './kit';

const C = {
  tile: 0x2f3236, tileTop: 0x4a4d52, shrub: 0x3f7a34, kerbB: 0x2f5fa8, kerbW: 0xf1efe8, plinth: 0xe8e4da, pole: 0x8a8f94,
  mural: [0x2f8a57, 0x3d9bd6, 0xb8452f, 0xe8d6a8, 0x6b8f3a], frame: 0x3a3f47, skin: 0xc49a72, police: 0x2a4f9a,
};
const FLAGS = [0xff9933, 0xffffff, 0x138808, 0x2f5fa8, 0xd8352a, 0xf2c230];
const BANNER = [0xf6e7c8, 0xd9e8f5, 0xf5d0dc, 0xe0f0d8];

/** Phoolbagan's round flag-and-banner island, with the corner statue, welcome arch and guest-house sign. */
export function trafficIsland(ctx: Ctx, f: Frame) {
  const R = 5.2;
  for (let k = 0; k < 24; k++) { // blue-and-white kerb ring
    const a = (k / 24) * Math.PI * 2;
    f.boxAt(Math.cos(a) * (R + 0.3), Math.sin(a) * (R + 0.3), 0.6, 1.4, 0, 0.3, k % 2 ? C.kerbB : C.kerbW, a + Math.PI / 2);
  }
  f.cyl(0, 0, R, 0, 0.8, C.tile, 16);
  f.cyl(0, 0, R - 0.3, 0.8, 0.12, C.tileTop, 16);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2, g = new THREE.IcosahedronGeometry(0.9, 0);
    g.translate(Math.cos(a) * 3, 1.5, Math.sin(a) * 3);
    f.geo(g, C.shrub);
  }
  // Flags on a ring of poles, bunting strung from the centre mast, two banners on frames, street-name signs.
  f.cyl(0, 0, 0.1, 0.9, 8.5, C.pole, 6);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, u = Math.cos(a) * (R - 0.6), v = Math.sin(a) * (R - 0.6);
    flag(f, u, v, 5.2, FLAGS[k % FLAGS.length]);
    for (let j = 0; j < 5; j++) {
      const t0 = j / 5, t1 = (j + 1) / 5;
      f.span(u * t0, v * t0, u * t1, v * t1, 9.2 - 4 * t1, 0.12, 0.02, FLAGS[(j + k) % FLAGS.length]);
    }
  }
  for (const s of [-1, 1]) {
    f.box(s * 2 - 0.8, s * 2 + 0.8, -0.05, 0.05, 1.8, 4.4, BANNER[(s + 1) / 2]);
    f.box(s * 2 - 0.9, s * 2 + 0.9, -0.08, 0.08, 4.4, 4.5, C.pole);
  }
  f.sign('CIT ROAD · PHOOLBAGAN', 3, 0.5, R - 0.2, 0, 2.3, 1, 0, '#1e58a8', '#ffffff');
  // The white statue pair on a corner pedestal, by the kerb.
  statuePair(f, 15, 14, K.white, 1.25);
  // A pandal-style welcome arch across one arm, about 22 units up the road from the junction.
  const road = ctx.nearestRoad(f.x, f.z);
  if (road) {
    const a = ctx.frame(road.x + road.dx * 22, road.z + road.dz * 22, Math.atan2(road.dz, road.dx));
    const S = road.w / 2 + 1.2;
    for (const s of [-1, 1]) a.box(-0.6, 0.6, s * S - 0.6, s * S + 0.6, 0, 5.4, BANNER[s > 0 ? 0 : 2]);
    a.box(-0.4, 0.4, -S - 0.6, S + 0.6, 5.4, 6.6, 0xf6f0e4);
    for (const d of [-1, 1]) a.sign(LM_TEXT.festival, 2 * S + 0.8, 1.1, d * 0.42, 0, 6.0, d, 0, '#fdf6e8', '#b0322a');
  }
  // The guest-house sign high on the corner building (the building itself is generated).
  f.cyl(-12, 15, 0.12, 0, 8, C.pole, 6);
  f.sign(LM_TEXT.hotel, 9, 1.4, -12, 15.2, 8.2, 0, -1, '#d8304a', '#ffffff');
  tree(f, -14, -13, 1.2, 1);
}

/** Two figures on a white pedestal (Phoolbagan's white statue; bronze in Beliaghata). */
export function statuePair(f: Frame, u: number, v: number, color: number, s: number) {
  f.box(u - 1.1, u + 1.1, v - 1.1, v + 1.1, 0, 0.5, 0xb9b3a9);
  f.box(u - 0.85, u + 0.85, v - 0.85, v + 0.85, 0.5, 2.4, C.plinth);
  figure(f, u, v - 0.35, 2.4, s, color, 0, 1);
  figure(f, u, v + 0.35, 2.4, s * 0.95, color, 0, 0);
}

/** A statue on a pedestal, standing alone. */
export function statue(ctx: Ctx, f: Frame) {
  statuePair(f, 0, 0, ctx.area(f.x, f.z) === 'beliaghata' ? K.bronze : K.marble, 1.3);
}

/** Beliaghata: I ♥ KOLKATA letters over a mural wall, the big head bust, statue groups either side. */
export function kolkataSign(f: Frame) {
  // The mural wall, painted in blocks (a green field, a red-tiled house, a blue sky) facing the road (+u).
  // Seen from the road, +v is the viewer's left: the bust, the I and the gilt group are on the left (beliaghata_x2_h270).
  f.box(-0.6, 0, -5, 5, 0, 3.4, 0xd8d0c0);
  f.quad([0.02, -5, 0.4], [0.02, 5, 0.4], [0.02, 5, 1.4], [0.02, -5, 1.4], C.mural[4]);
  f.quad([0.03, 1.4, 1.2], [0.03, -4.6, 1.2], [0.03, -4.6, 2.4], [0.03, 1.4, 2.4], C.mural[2]);
  f.quad([0.03, 1.4, 2.4], [0.03, -4.6, 2.4], [0.03, -4.0, 3.1], [0.03, 0.8, 3.1], 0x8a3a2a);
  f.quad([0.02, 5, 1.4], [0.02, 1.6, 1.4], [0.02, 1.6, 3.3], [0.02, 5, 3.3], C.mural[1]);
  // The bust: a big bald head on shoulders, in front of the wall's left end.
  f.box(0.3, 1.9, 1.7, 4.3, 0, 1.0, C.plinth);
  f.box(0.6, 1.6, 1.9, 4.1, 1.0, 2.0, C.skin);
  const head = new THREE.IcosahedronGeometry(1.0, 1);
  head.scale(0.9, 1.1, 0.85);
  head.translate(1.1, 2.9, 3.0);
  f.geo(head, C.skin);
  // The letters on a steel frame above the wall, lit at night by a floodlight bar.
  for (const s of [-1, 1]) f.box(-0.3, 0.1, s * 5.2 - 0.12, s * 5.2 + 0.12, 0, 6.8, C.frame);
  f.box(-0.3, 0.1, -5.3, 5.3, 6.6, 6.8, C.frame);
  f.sign('I', 0.9, 1.8, 0.2, 4.2, 5.4, 1, 0, '#3a3f47', '#ffffff');
  f.sign('♥', 1.6, 1.8, 0.2, 2.9, 5.4, 1, 0, '#3a3f47', '#d8202a');
  f.sign('KOLKATA', 6.4, 1.8, 0.2, -1.3, 5.4, 1, 0, '#3a3f47', '#ffffff');
  f.sign(LM_TEXT.ward, 5, 0.8, 0.2, -1.3, 4.0, 1, 0, '#3a3f47', '#e8e8e8');
  f.box(0.3, 0.6, -5, 5, 4.35, 4.5, 0xfff4d0, 3);
  // Statue groups either side, on white plinths with a round emblem.
  for (const s of [-1, 1]) {
    const v = s * 9;
    f.box(-2, 2, v - 2.2, v + 2.2, 0, 1.6, C.plinth);
    f.sign('◉', 1.0, 1.0, 2.03, v, 0.8, 1, 0, '#e8e4da', '#2e8a57');
    for (const k of [-1, 0, 1]) figure(f, k * 0.4, v + k * 1.1, 1.6, 1.35, s < 0 ? K.bronze : 0x9a7a3a, 0.2 * k, k === 0 ? 1 : 0);
    if (s > 0) { // the gilt one with a fan-shaped halo behind
      const halo = new THREE.CylinderGeometry(1.1, 1.1, 0.1, 10, 1, false, 0, Math.PI);
      halo.rotateZ(Math.PI / 2);
      halo.translate(-0.6, 3.4, v);
      f.geo(halo, K.gold);
    }
  }
}

/** Kolkata Traffic Police kiosk: a white box on a blue base, windows on three sides, the name board and crest. */
export function policeKiosk(f: Frame) {
  f.box(-1.4, 1.4, -1.6, 1.6, 0, 0.6, C.police);
  f.box(-1.3, 1.3, -1.5, 1.5, 0.6, 2.7, 0xf0efea);
  f.box(1.3, 1.34, -1.1, 1.1, 1.3, 2.3, 0x34404c, 0.6);
  for (const s of [-1, 1]) f.box(-0.9, 0.9, s * 1.5, s * 1.54, 1.3, 2.3, 0x34404c, 0.6);
  f.box(-1.7, 1.7, -1.9, 1.9, 2.7, 3.0, C.police);
  f.sign(LM_TEXT.police, 3.6, 0.45, 1.75, 0, 2.85, 1, 0, '#2a4f9a', '#ffffff');
  f.sign('◉', 0.7, 0.7, 1.36, 0.95, 1.9, 1, 0, '#f0efea', '#2a4f9a');
}

/** Stacked hoardings on one steel frame (2–3 boards), parody ads only. */
export function billboards(f: Frame, lm: Landmark) {
  const h = [...lm.id].reduce((a, c) => a + c.charCodeAt(0), 0), n = 2 + (h % 2);
  const BG = ['#7a1f2b', '#f2c230', '#1e58a8', '#2b2b2b'], FG = ['#ffe9b0', '#1d3f8a', '#ffffff', '#f2c230'];
  for (let i = 0; i < n; i++) {
    const t = LM_TEXT.hoardings[(h + i) % LM_TEXT.hoardings.length];
    hoarding(f, 0, (i - (n - 1) / 2) * 1.5, 6 + i * 4.6, 13, 4, t, 1, 0, BG[(h + i) % 4], FG[(h + i) % 4]);
  }
}
