// Green Line stations along the streamed world (LANDMARKS.md §6-7):
// - Karunamoyee: the bulging blue metal-clad shell with a curved roof (karunamoyee_clock_h0).
// - Central Park: station piers painted with folk murals (red, orange, blue).
// - Salt Lake Stadium: a dark undercroft with piers clad in multicolour mosaic (stadium_metro_h0).
// - Others (City Centre, Bengal Chemical): the generic elevated box, grey panels and a blue curved roof.
// - Underground stations (Phoolbagan, Sealdah): a street entrance kiosk beside the nearest road.
// - The Orange Line's Beleghata Gate 1: a black glass box under a swooping single-pitch dark roof.

import { LM, LM_TEXT } from '../../../content/landmarks';
import type { Ctx, Frame } from './ctx';
import { pier, type PierLook } from './metro';

const C = {
  panel: 0xa7abae, white: 0xe6e3dc, glass: 0x86a3b4, roof: 0x2f62ad, sky: 0xc9d8e6, post: 0x5c6066, under: 0xd8d2c6,
  shell: 0x2f74c0, shellRib: 0x5d97d6, stair: 0xd6c6a6, green: 0x2e9e5b, black: 0x1b1d22, dark: 0x2a2d33,
};
const MOSAIC = [0xd9822b, 0x3f6fb5, 0xe8c547, 0x9a4f7a, 0x5aa36a, 0xc4573f, 0x8a8f96];
const MURAL = [0xc4392f, 0xe8892b, 0x2f5fa8, 0xe8c547, 0xc4392f, 0x2f5fa8];

type S = { x: number; z: number; dx: number; dz: number };

/** How a station's piers are dressed, by station name. */
export function pierLook(name: string): PierLook {
  const n = name.toLowerCase();
  if (n.includes('stadium')) return { base: [0, 1, 2, 3, 4].map((i) => MOSAIC[i]), shaft: 0xb7a68f };
  if (n.includes('central park')) return { base: MURAL.slice(0, 5), shaft: 0xbfb8ad };
  return { base: [0x2f5fa8, 0xeeeeea, 0x2f5fa8], shaft: 0xbfb8ad };
}

export const displayName = (name: string) => name.toUpperCase();

/** An elevated station centred on the line at q, its axis along the line. */
export function elevatedStation(ctx: Ctx, q: S, name: string) {
  const f = ctx.frame(q.x, q.z, Math.atan2(q.dz, q.dx));
  const { len, w, concourse: U, platform: Pf, roof: R } = LM.station;
  const h = len / 2, t = w / 2, look = pierLook(name);
  // Pier pairs under the box, either side of the road below, with the station's own dressing.
  for (let u = -h + 5; u <= h - 4; u += 10) for (const v of [-t + 1.6, t - 1.6]) {
    const [x, z] = f.p(u, v);
    pier(ctx, { x, z, dx: q.dx, dz: q.dz }, U + 2.1, look);
  }
  f.box(-h, h, -t, t, U, U + 0.7, C.under);
  const shell = name.toLowerCase().includes('karunamoyee');
  if (shell) karunamoyeeShell(f, h, t, U);
  else genericBox(f, h, t, U, Pf, R);
  // Stair towers at both ends down to the footpaths.
  for (const e of [-1, 1]) {
    f.box(e * (h - 9), e * (h - 2), e * (t + 0.2), e * (t + 4.2), 0, U + 0.7, shell ? C.shell : C.stair);
    f.box(e * (h - 9.2), e * (h - 1.8), e * (t + 0.1), e * (t + 4.4), U + 0.7, U + 1.1, C.post);
    f.sign(LM_TEXT.metro, 3.2, 0.8, e * (h - 5.5), e * (t + 4.25), U - 1.2, 0, e, '#2e9e5b', '#ffffff');
  }
  // Name boards on both long faces, lit at night by the glow band under them.
  for (const e of [-1, 1]) f.sign(displayName(name), 13, 1.3, 0, e * (t + 0.08), U + 3.1, 0, e, '#1f7a4a', '#ffffff');
}

function genericBox(f: Frame, h: number, t: number, U: number, Pf: number, R: number) {
  f.box(-h, h, -t + 0.3, t - 0.3, U + 0.7, Pf - 0.4, C.white);
  for (let u = -h, i = 0; u < h - 0.5; u += 3, i++) for (const e of [-1, 1]) {
    f.box(u, u + 2.9, e * t - 0.15, e * t + 0.15, U + 0.7, Pf - 0.4, i % 3 === 0 ? 0x9a5a38 : C.panel);
    if (i % 3) f.box(u + 0.3, u + 2.6, e * (t + 0.02) - 0.05, e * (t + 0.02) + 0.05, U + 1.8, U + 3.6, C.glass, 0.9);
  }
  for (const e of [-1, 1]) {
    f.box(-h, h, e * (t - 0.3) - 0.15, e * (t - 0.3) + 0.15, Pf - 0.4, Pf + 1, C.panel);
    f.box(-h, h, e * (t - 0.3) - 0.05, e * (t - 0.3) + 0.05, Pf + 1, R - 3, C.glass, 0.6);
    for (let u = -h; u <= h; u += 7) f.box(u - 0.15, u + 0.15, e * (t - 0.3) - 0.15, e * (t - 0.3) + 0.15, Pf, R - 3, C.post);
  }
  // Curved blue roof with a skylight strip every few bays.
  const K = 6, y0 = R - 3, yAt = (k: number) => y0 + 3 * Math.sin((Math.PI * k) / K), vAt = (k: number) => -t - 0.5 + ((2 * t + 1) * k) / K;
  for (let u = -h - 0.5, i = 0; u < h + 0.5; u += 5, i++) {
    const u1 = Math.min(h + 0.5, u + 5), sky = i % 3 === 1;
    for (let k = 0; k < K; k++) f.quad([u, vAt(k), yAt(k)], [u1, vAt(k), yAt(k)], [u1, vAt(k + 1), yAt(k + 1)], [u, vAt(k + 1), yAt(k + 1)], sky ? C.sky : C.roof, sky ? 0.6 : 0);
  }
  for (const u of [-h - 0.5, h + 0.5]) for (let k = 0; k < K; k++)
    f.quad([u, vAt(k), y0], [u, vAt(k), yAt(k)], [u, vAt(k + 1), yAt(k + 1)], [u, vAt(k + 1), y0], C.glass, 0.4);
}

/** Karunamoyee: the whole body is a blue metal shell bulging out over the road, ribbed, under a curved roof. */
function karunamoyeeShell(f: Frame, h: number, t: number, U: number) {
  const K = 9, bulge = 2.2, top = 17;
  const prof = (k: number): [number, number] => {
    const a = (Math.PI * k) / K; // 0 at one side's foot, PI at the other's
    return [-Math.cos(a) * (t + bulge * Math.sin(a) * 0.6), U + 0.7 + (top - U - 0.7) * Math.sin(a) ** 0.7];
  };
  for (let u = -h, i = 0; u < h - 1e-6; u += 3.5, i++) {
    const u1 = Math.min(h, u + 3.5);
    for (let k = 0; k < K; k++) {
      const [v0, y0] = prof(k), [v1, y1] = prof(k + 1);
      const band = k === 2 || k === K - 3;
      f.quad([u, v0, y0], [u1, v0, y0], [u1, v1, y1], [u, v1, y1], band ? C.glass : i % 4 === 0 ? C.shellRib : C.shell, band ? 0.9 : 0);
    }
  }
  // End walls: glazed, closing the shell.
  for (const u of [-h, h]) for (let k = 0; k < K; k++) {
    const [v0, y0] = prof(k), [v1, y1] = prof(k + 1);
    f.quad([u, v0, U + 0.7], [u, v0, y0], [u, v1, y1], [u, v1, U + 0.7], C.glass, 0.5);
  }
}

/** A street entrance to an underground station: a kiosk with a canopy and a lit sign, beside the nearest road. */
export function undergroundEntrance(ctx: Ctx, x: number, z: number, name: string) {
  const road = ctx.nearestRoad(x, z);
  let f: Frame;
  if (road && road.d < 60) {
    // Stand on the station's side of the road, at the kerb, the entrance facing the road.
    const nx = -road.dz, nz = road.dx, side = (x - road.x) * nx + (z - road.z) * nz >= 0 ? 1 : -1;
    const o = road.w / 2 + 5;
    f = ctx.frame(road.x + nx * side * o, road.z + nz * side * o, Math.atan2(-nz * side, -nx * side));
  } else f = ctx.frame(x, z, 0);
  f.box(-3, 3, -4, 4, 0, 3.4, C.white);
  f.box(2.9, 3.05, -2.2, 2.2, 0, 2.6, C.dark); // the open stair mouth
  f.box(-3.4, 4.6, -4.4, 4.4, 3.4, 3.8, C.green);
  f.box(4.4, 4.6, -4.4, 4.4, 2.9, 3.4, 0xfff4d0, 2); // lit fascia strip
  f.sign(`${LM_TEXT.metro} · ${displayName(name)}`, 7.6, 0.9, 4.65, 0, 4.4, 1, 0, '#2e9e5b', '#ffffff');
  f.cyl(0, 5.4, 0.12, 0, 4.2, C.post, 6);
  f.sign('M', 1.1, 1.1, 0.15, 5.4, 4.6, 1, 0, '#c0392b', '#ffffff');
}

/** Orange Line Beleghata Gate 1: a black glass box, a swooping single-pitch dark roof (beleghata_bypass_*). */
export function glassEntrance(f: Frame, name: string) {
  f.box(-5, 5, -3, 3, 0, 4.6, C.black);
  for (let v = -2.6; v <= 2.6; v += 1.3) f.box(4.98, 5.04, v - 0.04, v + 0.04, 0, 4.6, 0x3a3d44);
  f.box(4.95, 5.0, -2.8, 2.8, 0.2, 4.2, 0x4b6a86, 0.7);
  const roof: [number, number][] = [[-7, 6.8], [-2, 6.2], [3, 5.2], [7.5, 4.8]];
  for (let i = 1; i < roof.length; i++) {
    const [u0, y0] = roof[i - 1], [u1, y1] = roof[i];
    f.quad([u0, -4, y0], [u1, -4, y1], [u1, 4, y1], [u0, 4, y0], C.dark);
  }
  f.box(-5, -4.2, -3, 3, 4.6, 6.6, C.black);
  f.sign(`${LM_TEXT.metro} · ${displayName(name)}`, 6, 0.8, 5.1, 0, 3.6, 1, 0, '#1b1d22', '#f08a24');
}
