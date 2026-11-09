// The two metro stations on Biswa Bangla Sarani (research/streetview/NORTH.md §3-4), side by side:
// - Salt Lake Sector V (Green Line terminus), canal side: an elevated box on piers, grey and copper-brown panels,
//   a curved blue truss roof with skylight strips over the platforms, open parking below, a mural wall on the
//   service road, a peach entrance block over the road at Gate A, the yellow name tower, and a stair tower on
//   Chavipatty Rd at Gate B (the station spans the canal).
// - IT Centre (Orange Line): a beige box straddling the road on piers, with the big trilingual sign and roundel.
// - An enclosed steel-truss skywalk between them.

import * as THREE from 'three';
import { sign } from '../gfx';
import { north as N } from '../../content/sectorv';
import { northSigns } from '../../content/text';
import { at, type Box, local, onCarriageway, stations } from '../../sim/elevated';
import type { Pt, Road } from '../../sim/mapdata';
import { heading, type Parts, type V3 } from './northkit';

const C = {
  pier: 0xb9b2a8, underside: 0xd8b896, core: 0x9da2a5, grey: 0xa7abae, copper: 0x9a5a38, glass: 0x86a3b4,
  white: 0xe6e3dc, roof: 0x2f62ad, sky: 0xc9d8e6, post: 0x5c6066, beige: 0xdccaa8, beigeDark: 0xc4b08c,
  yellow: 0xe9bf3c, peach: 0xe8b48c, wall: 0xc9c1b4, tower: 0xd6c6a6, orange: 0xd9622b,
};
const MURAL = [0xd9822b, 0xe8c547, 0x7bb661, 0x3e9c9a, 0x3f6fb5, 0x8d6aa8, 0xc4573f];
const U = N.stationUnderside, CONC = 9.6, ROOF = 12.6, CROWN = 15;

/** A box in a station's frame: s along its axis, t across (+t north-west), y up. */
function lb(parts: Parts, b: Box, s0: number, s1: number, t0: number, t1: number, y0: number, y1: number, color: number, glow = 0) {
  const [x, z] = at(b, (s0 + s1) / 2, (t0 + t1) / 2);
  parts.box(s1 - s0, y1 - y0, t1 - t0, x, y0, z, heading(b.u[0], b.u[1]), color, glow);
}
const p3 = (b: Box, s: number, t: number, y: number): V3 => { const [x, z] = at(b, s, t); return [x, y, z]; };

/** A sign on a station face: at (s, t, y), facing along (fs, ft) in the station frame. */
function board(b: Box, text: string, w: number, h: number, s: number, t: number, y: number, fs: number, ft: number, bg: string, fg: string) {
  const m = sign(text, w, h, bg, fg);
  const [x, z] = at(b, s, t);
  const dx = b.u[0] * fs + b.n[0] * ft, dz = b.u[1] * fs + b.n[1] * ft;
  m.position.set(x, y, z);
  m.rotation.y = Math.atan2(dx, dz);
  return m;
}

/** Adds both stations and the skywalk to `parts`; returns their signs for the sign atlas. */
export function buildStations(parts: Parts, roads: Road[], free: (x: number, z: number) => boolean): THREE.Object3D[] {
  const { sv, it } = stations();
  return [...sectorV(parts, sv, roads), ...itCentre(parts, it, roads, free), ...skywalk(parts, sv, it)];
}

function sectorV(parts: Parts, b: Box, roads: Road[]) {
  const h = b.half, n0 = b.n0, n1 = b.n1, signs: THREE.Object3D[] = [];
  // Piers on dry ground or in the canal, never on a carriageway; the box overhangs the service road.
  for (const t of [2, 9.5, 15.5]) for (let s = -h + 4; s <= h - 3; s += 10) {
    const [x, z] = at(b, s, t);
    if (!onCarriageway(roads, x, z, 0.5)) lb(parts, b, s - 0.6, s + 0.6, t - 0.6, t + 0.6, 0, U, C.pier);
  }
  // Concourse: the main body over the road and strip, a white wing across the canal to Chavipatty Rd.
  lb(parts, b, -h, h, n0, 7.7, U, U + 0.6, C.underside);
  lb(parts, b, -10, 22, 7.7, n1 - 1, U, U + 0.6, C.underside);
  lb(parts, b, -h + 0.2, h - 0.2, n0 + 0.3, 7.5, U + 0.6, CONC, C.core);
  lb(parts, b, -10, 22, 7.5, n1 - 1.2, U + 0.6, CONC, C.white);
  lb(parts, b, -9, 21, n1 - 1.3, n1 - 1.15, 7, 8.4, C.glass, 0.9);
  for (let i = 0, s = -h; s < h - 0.5; s += 2.4, i++) {
    const c = i % 3 === 0 ? C.copper : C.grey;
    for (const [t0, t1] of [[n0, n0 + 0.3], [7.5, 7.8]]) lb(parts, b, s, s + 2.3, t0, t1, U + 0.6, CONC, c);
    if (c === C.grey) lb(parts, b, s + 0.3, s + 2.0, n0 - 0.08, n0 + 0.02, 6.9, 8.6, C.glass, 0.9);
  }
  // Platform level: low walls, a glazed band and posts, under the curved truss roof.
  for (const t of [n0 + 0.5, 7.2]) {
    lb(parts, b, -h, h, t, t + 0.3, CONC, 10.9, C.grey);
    lb(parts, b, -h, h, t + 0.1, t + 0.2, 10.9, ROOF, C.glass, 0.6);
    for (let s = -h; s <= h; s += 6) lb(parts, b, s - 0.15, s + 0.15, t, t + 0.3, CONC, ROOF, C.post);
  }
  const t0 = n0 - 0.2, t1 = 7.9, K = 8, yAt = (k: number) => ROOF + (CROWN - ROOF) * Math.sin((Math.PI * k) / K);
  const tAt = (k: number) => t0 + ((t1 - t0) * k) / K;
  // Blue roof sheeting with a narrow polycarbonate skylight strip every 8 units (st1_h145).
  for (let i = 0, s = -h - 0.5; s < h + 0.5; s += 2, i++) {
    const s1 = Math.min(h + 0.5, s + 2), sky = i % 4 === 1;
    for (let k = 0; k < K; k++)
      parts.quad(p3(b, s, tAt(k), yAt(k)), p3(b, s1, tAt(k), yAt(k)), p3(b, s1, tAt(k + 1), yAt(k + 1)), p3(b, s, tAt(k + 1), yAt(k + 1)), sky ? C.sky : C.roof, sky ? 0.7 : 0);
  }
  for (const s of [-h - 0.5, h + 0.5]) for (let k = 0; k < K; k++)
    parts.quad(p3(b, s, tAt(k), ROOF), p3(b, s, tAt(k), yAt(k)), p3(b, s, tAt(k + 1), yAt(k + 1)), p3(b, s, tAt(k + 1), ROOF), C.glass, 0.4);
  for (const t of [t0, t1]) lb(parts, b, -h - 0.5, h + 0.5, t - 0.15, t + 0.15, ROOF - 0.4, ROOF + 0.1, C.roof);

  // Ground level: parking behind low walls on the Chavipatty side, a mural on the service-road wall.
  lb(parts, b, -20, 25, 12.6, 12.8, 0, 0.8, C.wall);
  for (let s = -16, i = 0; s <= 20; s += 6, i++) {
    lb(parts, b, s - 0.85, s + 0.85, 13.3, 16.6, 0.3, 1.1, [0xe8e8e8, 0xb83a32, 0x3b4b63, 0xc9c9c9, 0x6b6b6b, 0xe8e8e8, 0x2e6fae][i % 7]);
    lb(parts, b, s - 0.75, s + 0.75, 14.0, 16.0, 1.1, 1.65, 0x2a3440);
  }
  lb(parts, b, -33, -14, 4.15, 4.45, 0, 3.6, 0xb7a58e);
  for (let s = -33; s < -14; s += 0.8) for (let y = 0; y < 3.6; y += 0.6) {
    const c = MURAL[((Math.floor(y * 1.3 + 1.6 * Math.sin(s * 0.22) + 7)) % MURAL.length + MURAL.length) % MURAL.length];
    parts.quad(p3(b, s, 4.12, y), p3(b, s + 0.8, 4.12, y), p3(b, s + 0.8, 4.12, y + 0.6), p3(b, s, 4.12, y + 0.6), c, 0, false);
  }
  // Peach entrance block bridging the service road at Gate A, with the parody bank sign.
  const [g0, g1, gt0] = N.gateBlock;
  lb(parts, b, g0, g1, gt0, n0 + 0.2, U, 9.4, C.peach);
  lb(parts, b, g0 + 0.1, g1 - 0.1, gt0 - 0.1, gt0 + 0.1, 6.6, 7.8, C.glass, 0.9);
  signs.push(board(b, `${northSigns.bank} · ${northSigns.sectorV}`, 6.6, 0.95, g0 - 0.06, (gt0 + n0) / 2, 8.5, -1, 0, '#f3e6cf', '#b0322a'));
  // The yellow name tower at the west end, by the service road (st2_h235).
  lb(parts, b, -h - 2, -h + 2, 0.5, 4.5, 0, 16, C.yellow);
  signs.push(board(b, northSigns.bank, 3.6, 0.7, -h, 0.44, 13.8, 0, -1, '#f6d24a', '#b0322a'));
  signs.push(board(b, northSigns.sectorVBn, 3.8, 0.95, -h, 0.44, 11.6, 0, -1, '#f6d24a', '#2a2a2a'));
  signs.push(board(b, northSigns.sectorVBn, 3.8, 0.95, -h - 2.06, 2.5, 11.6, -1, 0, '#f6d24a', '#2a2a2a'));
  // Stair tower at Gate B on Chavipatty Rd, with the bilingual name (c4_h60).
  const [gs, gt] = local(b, N.gateB[0], N.gateB[1]);
  lb(parts, b, gs - 3, gs + 3, gt - 1.5, gt + 2.2, 0, 11.2, C.tower);
  lb(parts, b, gs - 3.2, gs + 3.2, gt - 1.7, gt + 2.4, 11.2, 11.6, C.beigeDark);
  signs.push(board(b, northSigns.sectorVBn, 5.4, 0.9, gs, gt + 2.26, 9.4, 0, 1, '#efe6d4', '#2b2b2b'));
  return signs;
}

function itCentre(parts: Parts, b: Box, roads: Road[], free: (x: number, z: number) => boolean) {
  const h = b.half, n0 = b.n0, n1 = b.n1, signs: THREE.Object3D[] = [];
  // Piers either side of the SW-bound carriageway: the south row on the footpath, the north row in the median.
  for (let s = -h + 3; s <= h - 2; s += 11) {
    const south = at(b, s, n0 + 0.9), mid = at(b, s, n1 - 0.8);
    if (!onCarriageway(roads, south[0], south[1], 0.4)) lb(parts, b, s - 0.65, s + 0.65, n0 + 0.25, n0 + 1.55, 0, 8, C.beige);
    if (!onCarriageway(roads, mid[0], mid[1], -1.2)) lb(parts, b, s - 0.55, s + 0.55, n1 - 1.35, n1 - 0.25, 0, 8, C.beige);
    lb(parts, b, s - 0.7, s + 0.7, n0, n1, 6.8, 8, C.beigeDark);
  }
  lb(parts, b, -h, h, n0, n1, 8, 13.4, C.beige);
  for (const [t0, t1] of [[n0 - 0.08, n0 + 0.02], [n1 - 0.02, n1 + 0.08]]) {
    lb(parts, b, -h + 1, h - 1, t0, t1, 10, 11.3, C.glass, 0.9);
    for (let s = -h; s <= h; s += 6) lb(parts, b, s - 0.25, s + 0.25, t0 - 0.1, t1 + 0.1, 8, 13.4, C.beigeDark);
  }
  lb(parts, b, -h - 0.5, h + 0.5, n0 - 0.5, n1 + 0.5, 13.4, 13.9, 0x8d98a0);
  const tm = (n0 + n1) / 2;
  for (const e of [-1, 1]) {
    signs.push(board(b, northSigns.itCentre, 10.5, 1.3, e * (h + 0.06), tm, 11.3, e, 0, '#e4d6bc', '#3a2a22'));
    signs.push(board(b, northSigns.itCentreBn, 5, 0.8, e * (h + 0.06), tm, 12.75, e, 0, '#e4d6bc', '#3a2a22'));
    signs.push(board(b, '◉', 1.3, 1.3, e * (h + 0.07), tm + e * 6.4, 11.3, e, 0, '#e4d6bc', '#c0392b'));
  }
  // Street stair on the north side (st4_h235): the first dry spot off the carriageways north of the NE end.
  const s = h - 6;
  for (let t = n1 + 1; t < n1 + 16; t += 0.5) {
    const [x, z] = at(b, s, t + 1.5);
    if (onCarriageway(roads, x, z, 1.8) || !free(x, z)) continue;
    lb(parts, b, s - 2.5, s + 2.5, t, t + 3, 0, 8.6, C.beige);
    lb(parts, b, s - 2.55, s + 2.55, t - 0.05, t + 3.05, 7.2, 7.8, C.orange);
    lb(parts, b, s - 1.2, s + 1.2, n1, t, 7.6, 8.6, C.beige);
    signs.push(board(b, 'METRO · IT CENTRE', 4.2, 0.6, s, t + 3.08, 6.6, 0, 1, '#d9622b', '#ffffff'));
    break;
  }
  return signs;
}

/** Enclosed steel-truss footbridge from Sector V's south face over the road to IT Centre's north face. */
function skywalk(parts: Parts, sv: Box, it: Box): THREE.Object3D[] {
  const A = at(sv, 22, sv.n0 + 0.4), [sa] = local(it, A[0], A[1]), B = at(it, sa, it.n1 - 0.4);
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]), dx = (B[0] - A[0]) / L, dz = (B[1] - A[1]) / L, nx = dz, nz = -dx;
  const off = (p: Pt, o: number): Pt => [p[0] + nx * o, p[1] + nz * o];
  parts.span(A, B, 0.3, 3, 7.9, C.post);
  parts.span(A, B, 0.25, 3.1, 10.6, C.post);
  for (const side of [1.4, -1.4]) {
    parts.span(off(A, side), off(B, side), 2.3, 0.06, 8.2, C.glass, 0.5);
    for (const y of [8.15, 10.4]) parts.span(off(A, side * 1.05), off(B, side * 1.05), 0.2, 0.15, y, C.post);
    const n = Math.max(2, Math.round(L / 1.6));
    for (let k = 0; k < n; k++) {
      const a = k / n, c = (k + 1) / n, q = (u: number, y: number, w: number): V3 =>
        [A[0] + (B[0] - A[0]) * u + nx * side * 1.06 + dx * w, y, A[1] + (B[1] - A[1]) * u + nz * side * 1.06 + dz * w];
      const [lo, hi] = k % 2 ? [a, c] : [c, a];
      parts.quad(q(lo, 8.3, -0.08), q(lo, 8.3, 0.08), q(hi, 10.4, 0.08), q(hi, 10.4, -0.08), C.post);
    }
  }
  return [];
}
