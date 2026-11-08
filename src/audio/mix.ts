// Pure mixing rules for the ambience: no WebAudio here, so they're unit-tested.

import { ambience as A } from '../content/sounds';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Traffic horn bed: quiet on a free road, loud in gridlock. */
export function hornBedGain(jam: number): number {
  const j = clamp01(Number.isFinite(jam) ? jam : 0);
  return A.hornMin + (A.hornMax - A.hornMin) * j;
}

export interface Spot { x: number; z: number; r: number }

/** How far (world units) the point is outside the nearest spot's edge; 0 when inside one. */
export function distOutside(spots: readonly Spot[], x: number, z: number): number {
  let best = Infinity;
  for (const s of spots) best = Math.min(best, Math.max(0, Math.hypot(s.x - x, s.z - z) - s.r));
  return best;
}

/** Rain bed: full in a flood, fading to silence `rainFade` units away. */
export function rainBedGain(floods: readonly Spot[], x: number, z: number): number {
  const d = distOutside(floods, x, z);
  return A.rainMax * clamp01(1 - d / A.rainFade);
}

export function inSpot(s: Spot, x: number, z: number): boolean {
  return Math.hypot(s.x - x, s.z - z) <= s.r;
}

/** Seconds until the next hawker call, from a 0–1 random number. */
export function hawkerGap(r: number): number {
  return A.hawkerGapMin + (A.hawkerGapMax - A.hawkerGapMin) * clamp01(r);
}

/** Endings where you actually got home: the dhaak plays. */
const homeEndings = new Set(['home-early', 'home', 'home-late', 'rapinah-miracle', 'walked-home']);
export function isHomeEnding(ending: string | null): boolean {
  return !!ending && homeEndings.has(ending);
}
