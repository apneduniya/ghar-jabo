// Crossings at true width (ROUTES.md §5: never squeezed):
// - Canal bridges. In old Kolkata (Beliaghata, Narkeldanga, Sealdah, Maniktala) the old bridge: a squat rust-brown
//   masonry parapet with square piers, and in front of it the ornate cast-iron railing of looped rings between blue
//   posts (beliaghata_khalpar_h0). Elsewhere a low blue-and-white balustrade.
// - Rail underbridges: the road dips under a steel plate-girder rail bridge on brick abutments, with the embankment
//   carrying on either side; a banner on the girder.
// - Road over rail: parapets as on a canal bridge, over the rail corridor.

import * as THREE from 'three';
import { LM, LM_TEXT } from '../../../content/landmarks';
import { type BridgeSite, parapet, underbridge } from '../../../sim/gen/layout';
import type { Ctx, Frame } from './ctx';

const C = {
  masonry: 0x8a5a43, masonryDark: 0x6e4634, rust: 0xa0522d, post: 0x3f6fb5, deck: 0x9c978e, white: 0xeeeeea, blue: 0x2f5fa8,
  brick: 0x9a4a35, girder: 0x56685c, ballast: 0x6d655c, rail: 0x8b8f94, sleeper: 0x5a4a3c, earth: 0x6f6047, grass: 0x58733f,
  lamp: 0x3a3d42, light: 0xfff2c8,
};
/** A bridge where the layout puts it (sim/gen/layout.ts): frame at the site, u along the road, v across. */
export function buildBridge(ctx: Ctx, b: BridgeSite) {
  const f = ctx.frame(b.x, b.z, b.h);
  if (b.kind === 'under') railUnder(f, b.width, b.roadW);
  else canalBridge(f, b.width, b.roadW, b.ornate, b.water);
}

/** Parapets along both edges of the road over a span `width` (+ abutments), the deck edge and supports below. */
export function canalBridge(f: Frame, width: number, roadW: number, ornate: boolean, water: boolean) {
  const { L, e } = parapet({ width, roadW }); // parapet line: past the footpath
  for (const s of [-1, 1]) {
    const v = s * e;
    f.box(-L, L, v - 0.2, v + 0.2, -1.4, 0.05, C.deck); // deck edge fascia
    if (ornate) {
      f.box(-L, L, v - 0.25 * s - 0.2, v - 0.25 * s + 0.2, 0, 1.15, C.masonry);
      f.box(-L, L, v - 0.25 * s - 0.25, v - 0.25 * s + 0.25, 1.15, 1.3, C.masonryDark);
      for (let u = -L; u <= L + 1e-6; u += 6) f.box(u - 0.35, u + 0.35, v - 0.25 * s - 0.35, v - 0.25 * s + 0.35, 0, 1.75, C.masonryDark);
      ironRailing(f, -L + 0.5, L - 0.5, v - 0.9 * s);
    } else {
      for (let u = -L, i = 0; u < L - 1e-6; u += 2, i++) f.box(u, Math.min(L, u + 2), v - 0.18, v + 0.18, 0, 0.95, i % 2 ? C.blue : C.white);
      f.box(-L, L, v - 0.22, v + 0.22, 0.95, 1.05, C.white);
    }
    // Abutments at the banks and a pier mid-stream on long spans.
    if (water) for (const u of [-width / 2, width / 2]) f.box(u - 0.8, u + 0.8, -e, e, -3, -1.4, C.masonryDark);
    if (width > 18) f.box(-0.7, 0.7, -e + 0.5, e - 0.5, -3, -1.4, C.masonryDark);
  }
  if (ornate) { // the single lamp on the old bridge
    f.cyl(0, e - 0.9, 0.08, 0, 4.6, C.lamp, 6);
    f.box(-0.25, 0.25, e - 1.15, e - 0.65, 4.6, 4.8, C.light, 3);
  }
}

/** Blue posts with rusty looped rings between (the Beleghata khalpar railing). */
function ironRailing(f: Frame, u0: number, u1: number, v: number) {
  const step = 2.2, n = Math.max(1, Math.round((u1 - u0) / step)), w = (u1 - u0) / n;
  for (let i = 0; i <= n; i++) f.box(u0 + i * w - 0.06, u0 + i * w + 0.06, v - 0.06, v + 0.06, 0, 1.25, C.post);
  for (const y of [0.15, 1.1]) f.box(u0, u1, v - 0.03, v + 0.03, y, y + 0.06, C.post);
  for (let i = 0; i < n; i++) for (const k of [0.27, 0.73]) {
    const ring = new THREE.TorusGeometry(0.27, 0.025, 3, 8); // in the u-y plane, seen from the road
    ring.translate(u0 + (i + k) * w, 0.63, v);
    f.geo(ring, C.rust);
  }
}

/** A steel plate-girder rail bridge across the road (rail corridor `width` along the road) on brick abutments. */
export function railUnder(f: Frame, width: number, roadW: number) {
  const { S, w, emb } = underbridge({ width, roadW }), H = LM.railClearance;
  for (const s of [-1, 1]) {
    // Abutment walls beside the footpaths, and the embankment carrying on beyond them.
    f.box(-w - 1, w + 1, s * S, s * (S + 1.6), 0, H + 0.3, C.brick);
    f.box(-w - 1.4, w + 1.4, s * (S + 1.6), s * (S + emb), 0, H - 0.4, C.earth);
    f.box(-w - 1.4, w + 1.4, s * (S + 1.6), s * (S + emb), H - 0.4, H + 0.2, C.grass);
    for (const u of [-w - 1.2, w + 1.2]) f.box(u - 0.5, u + 0.5, s * S - 0.2, s * S + 0.2, 0, H + 0.8, C.brick); // pilasters
  }
  // Plate girders on the two faces, cross deck between, ballast, sleepers and two tracks.
  for (const u of [-w, w]) {
    f.box(u - 0.2, u + 0.2, -S - 1.6, S + 1.6, H, H + 1.5, C.girder);
    for (let v = -S; v <= S; v += 1.6) f.box(u - 0.26, u + 0.26, v - 0.06, v + 0.06, H + 0.1, H + 1.4, 0x48584e); // stiffeners
  }
  f.box(-w, w, -S - 1.6, S + 1.6, H, H + 0.5, C.girder);
  f.box(-w + 0.3, w - 0.3, -S - emb, S + emb, H + 0.5, H + 0.75, C.ballast);
  for (const t of [-w / 2, w / 2]) {
    for (const r of [-0.42, 0.42]) f.box(t + r - 0.04, t + r + 0.04, -S - emb, S + emb, H + 0.75, H + 0.9, C.rail);
    for (let v = -S - emb + 0.4; v < S + emb; v += 1.4) f.box(t - 0.75, t + 0.75, v - 0.12, v + 0.12, H + 0.72, H + 0.8, C.sleeper);
  }
  for (const s of [-1, 1]) f.sign(LM_TEXT.roadSafety, Math.min(2 * S - 1, 10), 0.9, s * (w + 0.23), 0, H + 0.75, s, 0, '#f2c230', '#1d1d1d');
}
