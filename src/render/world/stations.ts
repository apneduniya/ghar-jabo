// The two metro stations on Biswa Bangla Sarani (research/streetview/NORTH.md §3-4), side by side:
// - Salt Lake Sector V (Green Line terminus), canal side: an elevated box on piers, grey and copper-brown panels,
//   a curved blue truss roof with skylight strips over the platforms, open parking below, Gate A on the service
//   road (gateA below), a peach bank block over the road NE of it, the yellow name tower, and Gate B on Chavipatty Rd
//   (gateB below; the station spans the canal).
// - IT Centre (Orange Line): a beige box straddling the road on piers, with the big trilingual sign and roundel.
// - An enclosed steel-truss skywalk between them.

import * as THREE from 'three';
import { sign } from '../gfx';
import { north as N } from '../../content/sectorv';
import { northSigns } from '../../content/text';
import { at, type Box, local, stations } from '../../sim/elevated';
import { itPierRects, itPiers, itStair, itStairRect, type LocalRect, SV_PIER_HALF, svGateA, svGateB, svGround, svPiers } from '../../sim/structures';
import { auto } from '../models';
import type { Pt, Road } from '../../sim/mapdata';
import { hash, heading, type Parts, type V3 } from './northkit';

const C = {
  pier: 0xb9b2a8, underside: 0xd8b896, core: 0x9da2a5, grey: 0xa7abae, copper: 0x9a5a38, glass: 0x86a3b4,
  white: 0xe6e3dc, roof: 0x2f62ad, sky: 0xc9d8e6, post: 0x5c6066, beige: 0xdccaa8, beigeDark: 0xc4b08c,
  yellow: 0xe9bf3c, peach: 0xe8b48c, wall: 0xc9c1b4, tower: 0xd6c6a6, orange: 0xd9622b,
};
const MURAL = [0xd9822b, 0xe8c547, 0x7bb661, 0x3e9c9a, 0x3f6fb5, 0x8d6aa8, 0xc4573f];
/** Gate A's mosaic: big swirls of orange, ochre, teal, slate and sand (p1z_h310). */
const MOSAIC = [0xd47a35, 0xc9a24a, 0xd9c49a, 0x4f8f8a, 0x7f8a90, 0xb85a3a, 0xe0b25a];
const U = N.stationUnderside, CONC = 9.6, ROOF = 12.6, CROWN = 15;

/** A box in a station's frame: s along its axis, t across (+t north-west), y up. */
function lb(parts: Parts, b: Box, s0: number, s1: number, t0: number, t1: number, y0: number, y1: number, color: number, glow = 0) {
  const [x, z] = at(b, (s0 + s1) / 2, (t0 + t1) / 2);
  parts.box(s1 - s0, y1 - y0, t1 - t0, x, y0, z, heading(b.u[0], b.u[1]), color, glow);
}
/** A ground footprint from the shared layout (sim/structures.ts), y0..y1. */
const rb = (parts: Parts, b: Box, r: LocalRect, y0: number, y1: number, color: number) => lb(parts, b, r.s0, r.s1, r.t0, r.t1, y0, y1, color);
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
  for (const [s, t] of svPiers(b, roads)) lb(parts, b, s - SV_PIER_HALF, s + SV_PIER_HALF, t - SV_PIER_HALF, t + SV_PIER_HALF, 0, U, C.pier);
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

  // Ground level: parking behind low walls on the Chavipatty side, Gate A on the service road.
  const g = svGround(b);
  rb(parts, b, g.parkWall, 0, 0.8, C.wall);
  g.cars.forEach((c, i) => {
    rb(parts, b, c, 0.3, 1.1, [0xe8e8e8, 0xb83a32, 0x3b4b63, 0xc9c9c9, 0x6b6b6b, 0xe8e8e8, 0x2e6fae][i % 7]);
    lb(parts, b, c.s0 + 0.1, c.s1 - 0.1, 14.0, 16.0, 1.1, 1.65, 0x2a3440);
  });
  signs.push(...gateA(parts, b));
  // The peach bank block bridging the service road NE of Gate A's mural, with the parody bank sign.
  const [g0, g1, gt0] = N.gateBlock;
  lb(parts, b, g0, g1, gt0, n0 + 0.2, U, 9.4, C.peach);
  lb(parts, b, g0 + 0.1, g1 - 0.1, gt0 - 0.1, gt0 + 0.1, 6.6, 7.8, C.glass, 0.9);
  signs.push(board(b, `${northSigns.bank} · ${northSigns.sectorV}`, 6.6, 0.95, g0 - 0.06, (gt0 + n0) / 2, 8.5, -1, 0, '#f3e6cf', '#b0322a'));
  // The yellow name tower at the west end, by the service road (st2_h235).
  rb(parts, b, g.tower, 0, 16, C.yellow);
  signs.push(board(b, northSigns.bank, 3.6, 0.7, -h, 0.44, 13.8, 0, -1, '#f6d24a', '#b0322a'));
  signs.push(board(b, northSigns.sectorVBn, 3.8, 0.95, -h, 0.44, 11.6, 0, -1, '#f6d24a', '#2a2a2a'));
  signs.push(board(b, northSigns.sectorVBn, 3.8, 0.95, -h - 2.06, 2.5, 11.6, -1, 0, '#f6d24a', '#2a2a2a'));
  signs.push(...gateB(parts, b));
  return signs;
}

function itCentre(parts: Parts, b: Box, roads: Road[], free: (x: number, z: number) => boolean) {
  const h = b.half, n0 = b.n0, n1 = b.n1, signs: THREE.Object3D[] = [];
  // Piers either side of the SW-bound carriageway: the south row on the footpath, the north row in the median.
  for (const p of itPiers(b, roads)) {
    const s = p.s, r = itPierRects(b, s);
    if (p.south) rb(parts, b, r.south, 0, 8, C.beige);
    if (p.mid) rb(parts, b, r.mid, 0, 8, C.beige);
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
  const st = itStair(b, roads, free);
  if (st) {
    const { s, t } = st;
    rb(parts, b, itStairRect(st), 0, 8.6, C.beige);
    lb(parts, b, s - 2.55, s + 2.55, t - 0.05, t + 3.05, 7.2, 7.8, C.orange);
    lb(parts, b, s - 1.2, s + 1.2, n1, t, 7.6, 8.6, C.beige);
    signs.push(board(b, 'METRO · IT CENTRE', 4.2, 0.6, s, t + 3.08, 6.6, 0, 1, '#d9622b', '#ffffff'));
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

/**
 * Gate A (Street View Jan 2026, research/streetview/NORTH.md §3): a recessed doorway in a ground block under the
 * station's SW end, a black plate with a white "A" over it and a stair rising inside; the big mosaic mural NE of it;
 * a paved forecourt behind white railings with coloured square motifs; blue-and-white kerb; the grey sign pillar with
 * a red disc with a white "M" (lit at night), an angled navy name board in three scripts and a route map; autos queued at the kerb.
 */
function gateA(parts: Parts, b: Box): THREE.Object3D[] {
  const A = N.gateA, g = svGateA(), f = A.face, d = A.door, hw = A.doorW / 2, out: THREE.Object3D[] = [];
  const [b0, b1, back] = A.block, rot = heading(b.u[0], b.u[1]);
  // The block, its jambs and the lintel over the door, up to the station's underside.
  for (const r of g.block) rb(parts, b, r, 0, U, C.wall);
  lb(parts, b, d - hw, d + hw, f, f + A.recess, 2.9, U, C.wall);
  lb(parts, b, b0 - 0.1, b1 + 0.1, f - 0.12, f, 2.75, 2.9, 0x8e8a84); // a ledge
  // Inside the doorway: dark, with a stair rising away from the road.
  lb(parts, b, d - hw, d + hw, f + A.recess - 0.05, f + A.recess, 0, 2.9, 0x23262a);
  for (let k = 0; k < 6; k++) lb(parts, b, d - hw + 0.1, d + hw - 0.1, f + 0.25 + k * 0.14, f + A.recess - 0.05, 0, 0.22 * (k + 1), 0x8f8f8a);
  lb(parts, b, d - hw, d + hw, f + 0.02, f + 0.08, 2.75, 2.9, 0x2d2d2d, 0.6); // door light
  out.push(board(b, 'A', 1.1, 0.5, d, f - 0.14, 3.25, 0, -1, '#141414', '#ffffff'));
  // The mosaic mural NE of the door.
  rb(parts, b, g.mural, 0, U, 0xb7a58e);
  const [m0, m1] = A.mural;
  for (let s = m0; s < m1 - 0.01; s += 0.8) for (let y = 0; y < 4.2; y += 0.6) {
    const k = Math.floor(y * 0.8 + 2.4 * Math.sin(s * 0.33 + y * 0.45) + 1.2 * Math.cos(s * 0.71) + 9);
    const c = MOSAIC[k % MOSAIC.length], s1 = Math.min(m1, s + 0.8);
    parts.quad(p3(b, s, f - 0.02, y), p3(b, s1, f - 0.02, y), p3(b, s1, f - 0.02, y + 0.6), p3(b, s, f - 0.02, y + 0.6), c, 0, false);
  }
  // Paved forecourt and footpath, blue-and-white kerb.
  lb(parts, b, A.forecourt, m1, A.kerb, f, 0, 0.1, 0xc7b29c);
  lb(parts, b, A.forecourt, b0, f, back, 0, 0.1, 0xc7b29c);
  for (let s = A.forecourt, i = 0; s < m1 + 6; s += 1, i++) lb(parts, b, s, s + 1, A.kerb, A.kerb + 0.2, 0, 0.22, i % 2 ? 0x2f4f9a : 0xeeeeee);
  // White railing along the kerb: posts, two rails and coloured square frames.
  const r = g.rail, rt = (r.t0 + r.t1) / 2;
  for (const y of [0.35, 1.1]) lb(parts, b, r.s0, r.s1, r.t0, r.t1, y, y + 0.06, 0xf2f2f0);
  for (let s = r.s0, i = 0; s <= r.s1; s += 1.2, i++) {
    lb(parts, b, s - 0.03, s + 0.03, r.t0, r.t1, 0, 1.16, 0xf2f2f0);
    if (i % 2 === 0 || s + 0.9 > r.s1) continue;
    const c = MURAL[i % MURAL.length], s0 = s + 0.25, y0 = 0.5 + (i % 3) * 0.12;
    for (const [a, z, w, h] of [[s0, y0, 0.45, 0.05], [s0, y0 + 0.4, 0.45, 0.05], [s0, y0, 0.05, 0.45], [s0 + 0.4, y0, 0.05, 0.45]])
      lb(parts, b, a, a + w, rt - 0.03, rt + 0.03, z, z + h, c);
  }
  // The sign pillar: grey, a red "M" disc on top (lit at night), the angled navy board, a route map facing the road.
  const p = g.pillar, [ps, pt] = A.pillar;
  rb(parts, b, p, 0, 4.4, 0x9c9c98);
  // The marker on top, facing along the road (a disc shows both ways): a plain red disc with a white "M" on each
  // face. Generic on purpose: a ring with a bar across it reads as a real transit logo.
  const [rx, rz] = at(b, ps, pt);
  const disc = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 20);
  disc.rotateX(Math.PI / 2);
  disc.rotateY(rot + Math.PI / 2);
  disc.translate(rx, 4.9, rz);
  parts.add(disc, 0xc8262c, 1.2);
  const mark = new THREE.Group();
  for (const side of [1, -1]) {
    const m = sign('M', 0.5, 0.5, '#c8262c', '#ffffff');
    m.position.set(0, 0, side * 0.045);
    if (side < 0) m.rotation.y = Math.PI;
    mark.add(m);
  }
  mark.position.set(rx, 4.9, rz);
  mark.rotation.y = rot + Math.PI / 2;
  out.push(mark);
  lb(parts, b, ps - 0.1, ps + 0.1, pt - 0.1, pt + 0.1, 4.4, 4.45, 0x9c9c98);
  lb(parts, b, ps - 0.36, ps + 0.36, p.t0 - 0.04, p.t0, 1.3, 2.7, 0xf4f4f0);
  for (const [k, c] of [[0, 0x2e9e5b], [1, 0x6a3fa0], [2, 0xd9622b], [3, 0x2f62ad]] as const)
    lb(parts, b, ps - 0.28 + k * 0.15, ps - 0.2 + k * 0.15, p.t0 - 0.05, p.t0 - 0.04, 1.45 + k * 0.1, 2.5 - k * 0.15, c);
  // The navy board sticks out from the pillar towards the road, angled, three scripts on both faces.
  const board3 = new THREE.Group(), [bx, bz] = at(b, ps, pt);
  board3.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.95, 0.08), new THREE.MeshLambertMaterial({ color: 0x1f3a6e })));
  for (const side of [1, -1]) northSigns.gateA.forEach((text, i) => {
    const m = sign(text, 1.75, 0.26, '#1f3a6e', '#ffffff');
    m.position.set(0, 0.3 - i * 0.3, side * 0.045);
    if (side < 0) m.rotation.y = Math.PI;
    board3.add(m);
  });
  // Its long side runs across the road at an angle, so it reads from Wipro More and from the NE; it hangs over the
  // footpath, behind the kerb.
  board3.position.set(bx + b.n[0] * 0.5, 3.75, bz + b.n[1] * 0.5);
  board3.rotation.y = rot + Math.PI / 2 - 0.4;
  out.push(board3);
  // Autos queued nose to tail at the kerb, facing up the road.
  for (const r of g.autos) {
    const a = auto(), [x, z] = at(b, (r.s0 + r.s1) / 2, (r.t0 + r.t1) / 2);
    a.position.set(x, 0, z);
    a.rotation.y = rot;
    out.push(a);
  }
  return out;
}

/** Gate B's mosaic: red-orange and yellow tiles (gbz_h195). */
const TILES = [0xd8452b, 0xe8b33a, 0xe07a2e, 0xc9382a, 0xf0cf55, 0xe39a3a];
const HAND = 0xa9adb0, TILE = 0.3;

/**
 * Gate B on Chavipatty Rd (Street View Jan 2026, gbz_h195, g_gb): a doorway in the station's NW face with a black "B"
 * plate; NE of it the sloped stair enclosure (grey stone base, a red-orange-yellow mosaic with three grey hand
 * gestures and a white disc, a sloped band of blue-trimmed glazing over it); a steel-railed ramp along the face up to
 * the door, open at the door end; the "drop off point" plate on the base; the station's name over the door.
 */
function gateB(parts: Parts, b: Box): THREE.Object3D[] {
  const B = N.gateB, g = svGateB(), f = B.face, d = B.door, hw = B.doorW / 2, out: THREE.Object3D[] = [];
  const [b0, b1] = B.block, [e0, e1, y0, y1] = B.stair, [r0, r1, rt] = B.ramp, fr = f + 0.02;
  const top = (s: number) => y0 + ((y1 - y0) * (s - e0)) / (e1 - e0); // the sloped top of the mosaic
  /** A panel on the NW face (facing +t) from s0 to s1: bottom edge ya (at s0) to yb (at s1), top edge yc to yd. */
  const face = (s0: number, s1: number, ya: number, yb: number, yc: number, yd: number, c: number, t = fr, glow = 0) =>
    parts.quad(p3(b, s1, t, yb), p3(b, s0, t, ya), p3(b, s0, t, yc), p3(b, s1, t, yd), c, glow, false);
  for (const r of g.block) rb(parts, b, r, 0, U, C.tower);
  lb(parts, b, d - hw, d + hw, f - B.recess, f, 2.9, U, C.tower); // lintel
  // Inside the doorway: dark, a stair rising away from the road, a light, the "B" plate over it.
  lb(parts, b, d - hw, d + hw, f - B.recess, f - B.recess + 0.05, 0, 2.9, 0x23262a);
  for (let k = 0; k < 6; k++) lb(parts, b, d - hw + 0.1, d + hw - 0.1, f - B.recess + 0.05, f - 0.25 - k * 0.14, 0, 0.22 * (k + 1), 0x8f8f8a);
  lb(parts, b, d - hw, d + hw, f - 0.08, f - 0.02, 2.75, 2.9, 0x2d2d2d, 0.6);
  out.push(board(b, 'B', 1.1, 0.5, d, f + 0.14, 3.25, 0, 1, '#141414', '#ffffff'));
  // The enclosure's face: stone base, mosaic up to the slope, the hands and the disc, glazing with blue trim.
  face(b0, d - hw, 0, 0, 1.2, 1.2, 0x6f7275);
  face(d + hw, b1, 0, 0, 1.2, 1.2, 0x6f7275);
  for (let s = e0, i = 0; s < e1 - 0.01; s += TILE, i++) {
    const s1 = Math.min(e1, s + TILE), ta = top(s), tb = top(s1);
    for (let y = 1.2, j = 0; y < Math.min(ta, tb) - 0.01; y += TILE, j++) {
      const c = TILES[Math.floor(hash(i * 31 + j * 7) * TILES.length)], last = y + TILE >= Math.min(ta, tb);
      face(s, s1, y, y, last ? ta : y + TILE, last ? tb : y + TILE, c);
    }
    face(s, s1, ta, tb, ta + 0.12, tb + 0.12, C.roof); // blue trim, glazing, blue trim
    face(s, s1, ta + 0.12, tb + 0.12, ta + 0.9, tb + 0.9, C.glass, fr, 0.6);
    face(s, s1, ta + 0.9, tb + 0.9, ta + 1.02, tb + 1.02, C.roof);
    if (i % 4 === 0) face(s - 0.04, s + 0.04, ta, ta, ta + 1.0, ta + 1.0, C.roof, fr + 0.01);
  }
  const hf = fr + 0.02;
  const hand = (s: number, fingers: number[]) => { // a palm and its fingers (heights), pointing up
    face(s - 0.55, s + 0.55, 1.4, 1.4, 2.5, 2.5, HAND, hf);
    fingers.forEach((h, k) => { if (h > 0) face(s - 0.53 + k * 0.28, s - 0.33 + k * 0.28, 2.5, 2.5, 2.5 + h, 2.5 + h, HAND, hf); });
  };
  hand(e0 + 1.0, [0.6, 0.85, 0.9, 0.75]); // open palm
  hand(e0 + 2.6, [0, 0.85, 0.9, 0.7]); // thumb and finger in a ring
  face(e0 + 1.95, e0 + 2.25, 2.5, 2.5, 2.85, 2.85, HAND, hf);
  face(e0 + 3.8, e0 + 4.9, 1.4, 1.4, 3.4, 1.5, HAND, hf); // palms together
  const disc = new THREE.CircleGeometry(0.42, 16), [dx, dz] = at(b, e0 + 3.4, hf);
  disc.rotateY(Math.atan2(b.n[0], b.n[1]));
  disc.translate(dx, top(e0 + 3.4) - 0.5, dz);
  parts.add(disc, 0xf2f2ee);
  // The ramp: a paved strip along the face, steel posts and two rails on its outer edge, a handrail on the wall.
  lb(parts, b, b0, b1, f, rt, 0, 0.08, 0xb9b3a8);
  const r = g.rail;
  for (const y of [0.55, 1.0]) lb(parts, b, r.s0, r.s1, r.t0, r.t1, y, y + 0.05, 0xbfc3c7);
  for (let s = r0; s <= r1 + 0.01; s += 1.25) lb(parts, b, s - 0.03, s + 0.03, r.t0, r.t1, 0, 1.05, 0xbfc3c7);
  lb(parts, b, d + hw, b1, f + 0.05, f + 0.1, 0.9, 0.95, 0xbfc3c7);
  // The "drop off point" plate on the base by the ramp's low end, and the station's name over the door.
  lb(parts, b, b1 - 2.0, b1 - 1.2, fr, fr + 0.02, 0.45, 1.15, 0xe9c84a);
  northSigns.dropOff.forEach((text, i) => out.push(board(b, text, 0.7, 0.13, b1 - 1.6, fr + 0.04, 0.72 - i * 0.16, 0, 1, '#e9c84a', '#1d2a6b')));
  out.push(board(b, northSigns.sectorVBn, 5.4, 0.9, d + 3, 16.0, 6.6, 0, 1, '#efe6d4', '#2b2b2b'));
  return out;
}
