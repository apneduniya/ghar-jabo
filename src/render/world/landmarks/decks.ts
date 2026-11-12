// Flyovers and the EM Bypass median (LANDMARKS.md "Things that repeat", §1-2, §6), cut per chunk.
// - Ultadanga flyover: separate one-way decks about 8 m up, parapets with a big blue-and-white diamond pattern, tall
//   lamps on the parapet (ultadanga_flyover_h0).
// - Vidyapati Setu (Sealdah): about 6.5 m up, concrete posts and blue panels with white frames, red-and-white bollards
//   between the lanes and tram rails in the deck (sealdah_flyover_top_*, sealdah_north_entry_h90).
// - Any other flyover: blue-and-white banded parapets.
// A flyover way rises from a free end (one no other flyover way joins) over LM.flyoverRamp; joined ways stay level.
// - EM Bypass: blue-and-white kerb blocks and a blue spear-top railing along the median (stadium_bypass_h90).

import type { Pt } from '../../../sim/gen/types';
import { medianLines } from '../../../sim/gen/medians';
import { LM } from '../../../content/landmarks';
import { DECK_MIN_Y, DECK_PIECE, DECK_PIER, DECK_PIER_PHASE, DECK_PIER_Y, type NetDeck, deckHalf, deckPierAt, flyoverNear as netFlyoverNear, netDeckY, netDecks } from '../../../sim/gen/layout';
import { intervals, marks, pieces, sample } from './clip';
import type { Ctx } from './ctx';

const C = {
  slab: 0xa9a59e, top: 0x45424a, pier: 0xc4bdb2, blue: 0x2f5fa8, white: 0xeeeeea, post: 0xd2cdc4, rail: 0x6f7378,
  red: 0xc8322b, tram: 0x8b8f94, lamp: 0x5c6066, light: 0xfff2c8, kerbB: 0x2f5fa8, kerbW: 0xf1efe8, grille: 0x3c4a55,
};

type Deck = NetDeck;
const decks = (ctx: Ctx) => netDecks(ctx.net, ctx.warp);
const deckY = netDeckY;

/** True if any flyover deck passes within `r` of a game point (landmark models use it to avoid doubles). */
export const flyoverNear = (ctx: Ctx, x: number, z: number, r: number) => netFlyoverNear(ctx.net, ctx.warp, x, z, r);

export function buildDecks(ctx: Ctx) {
  for (const d of decks(ctx)) {
    const half = deckHalf(d);
    for (const [a, b] of pieces(intervals(d.l, ctx.cx, ctx.cz), DECK_PIECE)) {
      const y = deckY(d, (a + b) / 2);
      if (y < DECK_MIN_Y) continue;
      const p = sample(d.l, a), q = sample(d.l, b), k = Math.floor((a + b) / 5);
      deckPiece(ctx, d, p, q, y, half, k);
    }
    for (const m of marks(d.l, ctx.cx, ctx.cz, LM.flyoverPierStep, DECK_PIER_PHASE)) {
      if (deckY(d, m) < DECK_PIER_Y) continue;
      const s = deckPierAt(ctx.net, ctx.warp, d, m); // off the cross streets below
      if (s === null) continue;
      const y = deckY(d, s), q = sample(d.l, s), rot = -Math.atan2(q.dz, q.dx);
      ctx.parts.box(1.6, 0.8, half * 1.7, q.x, y - 1.7, q.z, rot, C.pier);
      ctx.parts.cyl(DECK_PIER.r, y - 1.7, q.x, 0, q.z, C.pier, DECK_PIER.stretch, rot + Math.PI / 2, 10);
    }
    if (d.style !== 'band') for (const s of marks(d.l, ctx.cx, ctx.cz, 30, 11)) {
      const y = deckY(d, s);
      if (y < 1) continue;
      const q = sample(d.l, s), nx = q.dz, nz = -q.dx, o = half - 0.15;
      ctx.parts.box(0.12, 9, 0.12, q.x + nx * o, y, q.z + nz * o, 0, C.lamp);
      ctx.parts.box(1.6, 0.12, 0.12, q.x + nx * (o - 0.8), y + 9, q.z + nz * (o - 0.8), Math.atan2(nz, nx) * -1, C.lamp);
      ctx.parts.box(0.5, 0.15, 0.3, q.x + nx * (o - 1.5), y + 8.85, q.z + nz * (o - 1.5), 0, C.light, 3);
    }
  }
}

type S = { x: number; z: number; dx: number; dz: number };

function deckPiece(ctx: Ctx, d: Deck, p: S, q: S, y: number, half: number, k: number) {
  const P = ctx.parts, nx = p.dz, nz = -p.dx;
  const A: Pt = [p.x, p.z], B: Pt = [q.x, q.z];
  const off = (o: number): [Pt, Pt] => [[p.x + nx * o, p.z + nz * o], [q.x + nx * o, q.z + nz * o]];
  P.span(A, B, 0.9, half * 2, y - 0.95, C.slab);
  P.span(A, B, 0.06, half * 2 - 1.2, y - 0.05, C.top);
  if (d.tram) for (const t of [-1.6, -0.85, 0.85, 1.6]) { const [a, b] = off(t); P.span(a, b, 0.04, 0.1, y + 0.01, C.tram); }
  if (d.style === 'panel' && k % 2 === 0) { // red-and-white bollards splitting the lanes
    const mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2;
    P.cyl(0.09, 0.45, mx, y, mz, C.red, 1, 0, 6);
    P.cyl(0.095, 0.15, mx, y + 0.45, mz, C.white, 1, 0, 6);
    P.cyl(0.09, 0.15, mx, y + 0.6, mz, C.red, 1, 0, 6);
  }
  for (const side of [1, -1]) {
    const o = (half - 0.15) * side, [a, b] = off(o);
    if (d.style === 'band') {
      const band = k % 2 ? C.blue : C.white;
      P.span(a, b, 1.0, 0.3, y - 0.05, band);
      const [fa, fb] = off((half + 0.03) * side);
      P.span(fa, fb, 0.9, 0.06, y - 0.95, band);
    } else if (d.style === 'diamond') {
      P.span(a, b, 1.1, 0.3, y - 0.05, C.white);
      diamond(ctx, p, q, side, half, y);
    } else {
      // Vidyapati: a white-framed blue panel between concrete posts, a dark grille in the panel.
      P.span(a, b, 1.15, 0.26, y - 0.05, C.blue);
      P.span(a, b, 0.12, 0.34, y + 1.0, C.white);
      P.span(a, b, 0.12, 0.34, y - 0.05, C.white);
      const [ga, gb] = off((half - 0.15 + 0.14) * side);
      P.span(ga, gb, 0.55, 0.02, y + 0.3, C.grille);
      P.box(0.35, 1.3, 0.4, a[0], y - 0.05, a[1], -Math.atan2(p.dz, p.dx), C.post);
    }
  }
}

/** A blue rhombus on the parapet's outer and inner face per piece: the big diamond band seen from far off. */
function diamond(ctx: Ctx, p: S, q: S, side: number, half: number, y: number) {
  const nx = p.dz * side, nz = -p.dx * side, mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2;
  const yb = y - 0.05, yt = y + 1.05, ym = (yb + yt) / 2;
  for (const o of [half + 0.06, half - 0.36]) {
    const P = (x: number, z: number, yy: number): [number, number, number] => [x + nx * o, yy, z + nz * o];
    ctx.parts.quad(P(mx, mz, yb), P(q.x, q.z, ym), P(mx, mz, yt), P(p.x, p.z, ym), C.blue);
  }
  // The side fascia below the parapet carries the same pattern, inverted.
  const o = half + 0.07, Q = (x: number, z: number, yy: number): [number, number, number] => [x + nx * o, yy, z + nz * o];
  ctx.parts.quad(Q(p.x, p.z, y - 0.95), Q(q.x, q.z, y - 0.95), Q(q.x, q.z, y - 0.1), Q(p.x, p.z, y - 0.1), C.white);
  ctx.parts.quad(Q(mx, mz, y - 0.95), Q(q.x, q.z, y - 0.5), Q(mx, mz, y - 0.1), Q(p.x, p.z, y - 0.5), C.blue);
}

/**
 * The EM Bypass median: blue-and-white kerb blocks under a blue spear-top railing, once per carriageway pair, midway
 * between their inner edges, with a gap at every junction (sim/gen/medians.ts; its collision is in solids.ts).
 */
export function buildMedians(ctx: Ctx) {
  for (const l of medianLines(ctx.net, ctx.warp)) {
    const at = (s: number) => sample(l, s);
    for (const [a, b] of pieces(intervals(l, ctx.cx, ctx.cz), 1.5)) {
      const p = at(a), q = at(b);
      ctx.parts.span([p.x, p.z], [q.x, q.z], 0.25, 1.1, 0, Math.floor((a + b) / 3) % 2 ? C.kerbB : C.kerbW);
    }
    for (const [a, b] of pieces(intervals(l, ctx.cx, ctx.cz), 8)) {
      const p = at(a), q = at(b);
      for (const y of [0.55, 1.15]) ctx.parts.span([p.x, p.z], [q.x, q.z], 0.06, 0.06, y, C.blue);
    }
    for (const s of marks(l, ctx.cx, ctx.cz, 2.5)) {
      const q = at(s);
      ctx.parts.box(0.07, 1.4, 0.07, q.x, 0.25, q.z, 0, C.blue); // spear-top post
    }
  }
}
