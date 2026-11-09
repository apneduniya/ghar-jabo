// The Nabadiganta flyover (research/streetview/NORTH.md §2-3): two separate decks, one per direction, on single
// oval columns with hammerhead caps; blue-and-white concrete parapets with a steel rail; blue-and-white side
// fascia and black-and-white chevrons over Wipro More; the NE-bound deck coming down to grade before the station
// on a panelled blue-grey retaining wall; and the big blue gantry sign facing Street 13.

import * as THREE from 'three';
import { sign } from '../gfx';
import { northSigns } from '../../content/text';
import { deckY, nearest, onCarriageway, type Deck } from '../../sim/elevated';
import type { Road } from '../../sim/mapdata';
import { type Parts, type Step, type V3, walk } from './northkit';

const C = {
  slab: 0xa9a59e, pier: 0xc4bdb2, blue: 0x2f5fa8, white: 0xeeeeea, rail: 0x6f7378, black: 0x1d1d1d,
  yellow: 0xf2c230, panelA: 0x8197a0, panelB: 0x6d838b, joint: 0x48545a, tin: 0x2c6fc0,
};
const PIER_STEP = 18;

/** Adds both decks to `parts` (posters on the columns to `posters`); returns the gantry sign for batching. */
export function buildFlyover(parts: Parts, posters: THREE.BufferGeometry[], decks: Deck[], roads: Road[]): THREE.Object3D[] {
  const signs: THREE.Object3D[] = [];
  const st13 = roads.filter((r) => r.n === 'Street Number 13' && !r.b);
  const nearSt13 = (x: number, z: number) => Math.min(...st13.map((r) => nearest(r.p, x, z).d));
  for (const deck of decks) {
    const half = deck.w / 2;
    let nextPier = 0, gantry: { s: Step; y: number; d: number } | null = null;
    for (const s of walk(deck.p, 2.5)) {
      const y = deckY(deck, s.dist);
      if (y < 0.15) continue; // at grade it is just road
      const nx = s.dz, nz = -s.dx; // left of travel
      const st = nearSt13(s.x, s.z);
      const band = Math.floor(s.dist / 3.2) % 2 ? C.blue : C.white;
      parts.box(s.len + 0.05, 0.85, deck.w, s.x, y - 0.9, s.z, s.rot, C.slab);
      for (const side of [1, -1]) {
        const o = (half + 0.05) * side;
        if (st < 12 && y > 4) chevrons(parts, s, side, half, y);
        else parts.box(s.len + 0.02, 0.9, 0.1, s.x + nx * o, y - 0.95, s.z + nz * o, s.rot, band);
        // Concrete crash barrier painted blue/white, a steel rail on posts above it.
        const b = (half - 0.2) * side;
        parts.box(s.len + 0.02, 0.8, 0.35, s.x + nx * b, y - 0.05, s.z + nz * b, s.rot, band);
        parts.box(s.len + 0.02, 0.07, 0.07, s.x + nx * b, y + 1.15, s.z + nz * b, s.rot, C.rail);
        parts.box(0.07, 0.4, 0.07, s.x + nx * b, y + 0.75, s.z + nz * b, s.rot, C.rail);
        if (y < 3.4) retaining(parts, s, side, half, y - 0.95);
      }
      if (y >= 3.4 && s.dist >= nextPier && !onCarriageway(roads, s.x, s.z, 0.6)) {
        nextPier = s.dist + PIER_STEP;
        pier(parts, posters, s, deck.w, y);
      }
      // Blue tin sheeting closes off the space under the NE-bound deck along the service road (fly_03).
      if (deck.ne && y > 2.6) parts.box(s.len + 0.02, 1.9, 0.06, s.x + nx * (half - 0.4), 0, s.z + nz * (half - 0.4), s.rot, C.tin);
      if (!deck.ne && y > 4 && (!gantry || st < gantry.d)) gantry = { s, y, d: st };
    }
    if (gantry) signs.push(...gantrySign(parts, gantry.s, gantry.y, half));
  }
  return signs;
}

/** Black-and-white (and some yellow) slanted bands on the side fascia over the junction. */
function chevrons(parts: Parts, s: Step, side: number, half: number, y: number) {
  const nx = s.dz * side, nz = -s.dx * side, o = half + 0.08, n = 4, w = s.len / n;
  const lean = 0.5 * (Math.floor(s.dist / 12) % 2 ? 1 : -1);
  const P = (u: number, yy: number): V3 => [s.x + s.dx * u + nx * o, yy, s.z + s.dz * u + nz * o];
  for (let k = 0; k < n; k++) {
    const u0 = -s.len / 2 + k * w, u1 = u0 + w;
    const c = (s.i * n + k) % 7 === 3 ? C.yellow : k % 2 ? C.black : C.white;
    parts.quad(P(u0, y - 0.05), P(u1, y - 0.05), P(u1 + lean, y - 0.95), P(u0 + lean, y - 0.95), c, 0, false);
  }
  parts.box(s.len + 0.02, 0.9, 0.08, s.x + nx * (half + 0.02), y - 0.95, s.z + nz * (half + 0.02), s.rot, C.white);
}

/** Reinforced-earth wall of interlocking blue-grey concrete panels under a ramp (fly_04_h136). */
function retaining(parts: Parts, s: Step, side: number, half: number, top: number) {
  if (top < 0.1) return;
  const nx = s.dz * side, nz = -s.dx * side, o = half - 0.15;
  parts.box(s.len + 0.02, top, 0.2, s.x + nx * (o - 0.1), 0, s.z + nz * (o - 0.1), s.rot, C.joint);
  const rows = Math.max(1, Math.round(top / 0.6)), rh = top / rows;
  for (let r = 0; r < rows; r++) {
    const shift = (r % 2) * 0.62 - 0.31;
    for (let k = 0; k < 2; k++) {
      const u = -s.len / 2 + (k + 0.5) * (s.len / 2) + shift, c = (r * 3 + k + s.i) % 4 === 0 ? C.panelB : C.panelA;
      const out = o + 0.04 + ((r + k) % 2) * 0.03;
      parts.box(s.len / 2 - 0.1, rh - 0.08, 0.12, s.x + s.dx * u + nx * out, r * rh + 0.04, s.z + s.dz * u + nz * out, s.rot, c);
    }
  }
}

/** A single oval column with a hammerhead cap, posters stuck on it. */
function pier(parts: Parts, posters: THREE.BufferGeometry[], s: Step, w: number, y: number) {
  parts.box(1.8, 1.0, w * 0.82, s.x, y - 1.9, s.z, s.rot, C.pier);
  parts.box(1.5, 0.5, w * 0.42, s.x, y - 2.4, s.z, s.rot, C.pier);
  parts.cyl(0.72, y - 2.4, s.x, 0, s.z, C.pier, 1.7, s.rot);
  for (const face of [0, Math.PI]) {
    const pg = new THREE.PlaneGeometry(1.1, 1.9);
    pg.rotateY(s.rot + face + Math.PI / 2);
    pg.translate(s.x + Math.cos(-s.rot + face) * 0.76, 1.5, s.z + Math.sin(-s.rot + face) * 0.76);
    posters.push(pg);
  }
}

/** The big blue "Welcome to Nabadiganta" board on the deck side facing Street 13 (wm_0_h90). */
function gantrySign(parts: Parts, s: Step, y: number, half: number) {
  // The side facing south-east, towards traffic coming up Street 13 from PwC More.
  let nx = s.dz, nz = -s.dx;
  if (nz < 0) { nx = -nx; nz = -nz; }
  const o = half + 0.3;
  parts.box(15, 2.3, 0.2, s.x + nx * (o - 0.12), y - 1.9, s.z + nz * (o - 0.12), s.rot, C.blue);
  const board = sign(northSigns.gantry, 14.4, 1.9, '#1e58a8', '#ffffff');
  board.position.set(s.x + nx * o, y - 0.75, s.z + nz * o);
  board.rotation.y = Math.atan2(nx, nz);
  return [board];
}
