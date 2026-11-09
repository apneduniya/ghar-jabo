// Real coords -> game coords. Identity inside the Sector V square in both modes; free roam is identity
// everywhere; timed squeezes everything outside the square radially (piecewise, content/worldgen.ts SQUEEZE).
//
// "Radius" is the 8-norm (|x|^8 + |z|^8)^(1/8): its unit ball is a rounded square that contains the Sector V
// square exactly (its corners touch), so the square is untouched while roads don't kink on the diagonals the
// way they would with a max-norm. Only positions are warped; sizes stay true.

import { SQUEEZE } from '../../content/worldgen';
import { HALF } from './clip';
import type { PlayMode, Pt, Warp } from './types';

const N = 8;
/** The identity radius: the 8-norm ball of this radius contains the square |x|, |z| <= HALF. */
export const R0 = HALF * Math.pow(2, 1 / N);

export function norm8(x: number, z: number): number {
  const ax = Math.abs(x), az = Math.abs(z);
  const m = Math.max(ax, az);
  if (m === 0) return 0;
  const a = ax / m, b = az / m;
  return m * Math.pow(a ** N + b ** N, 1 / N);
}

/** Piecewise-linear squeeze g(s) for s real units beyond R0, with its inverse. */
export function squeeze(table: [number, number][] = SQUEEZE) {
  const knots: { s: number; g: number; k: number }[] = [];
  let g = 0;
  for (let i = 0; i < table.length; i++) {
    const [s, k] = table[i];
    if (i > 0) g += (s - table[i - 1][0]) * table[i - 1][1];
    knots.push({ s, g, k });
  }
  const fwd = (s: number) => {
    let i = knots.length - 1;
    while (i > 0 && knots[i].s > s) i--;
    return knots[i].g + (s - knots[i].s) * knots[i].k;
  };
  const inv = (v: number) => {
    let i = knots.length - 1;
    while (i > 0 && knots[i].g > v) i--;
    return knots[i].s + (v - knots[i].g) / knots[i].k;
  };
  return { fwd, inv };
}

export function makeWarp(mode: PlayMode, table: [number, number][] = SQUEEZE): Warp {
  if (mode === 'free') return { mode, toGame: (p) => p, toReal: (p) => p };
  const g = squeeze(table);
  return {
    mode,
    toGame(p: Pt): Pt {
      const r = norm8(p[0], p[1]);
      if (r <= R0) return p;
      const f = (R0 + g.fwd(r - R0)) / r;
      return [p[0] * f, p[1] * f];
    },
    toReal(p: Pt): Pt {
      const r = norm8(p[0], p[1]);
      if (r <= R0) return p;
      const f = (R0 + g.inv(r - R0)) / r;
      return [p[0] * f, p[1] * f];
    },
  };
}
