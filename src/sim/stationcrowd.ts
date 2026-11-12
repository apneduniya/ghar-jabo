// The station's people (task 033): a queue at the gates, standers on the escalator's right, a packed platform.
// You shove through them (they give a little, push back more when it's packed); standers don't budge, so you
// walk left. When the doors open, most of the platform rushes them and gets in. Pure logic.

import { STATION } from '../content/tuning';
import type { Rng } from './rng';

export type StationPersonKind = 'queue' | 'stander' | 'platform';

export interface StationPerson {
  kind: StationPersonKind;
  x: number; z: number;
  /** Their spot: they drift back to it after a shove. */
  hx: number; hz: number;
  heading: number;
  /** Speed this step (units/s), so the render can match the stride. */
  v: number;
  boarding: boolean;
  /** Got on a train. */
  gone: boolean;
  idle: 'phone' | 'look';
}

const S = STATION, K = STATION.crowd;

export class StationCrowd {
  people: StationPerson[] = [];

  constructor(rng: Rng, crowd: number) {
    const add = (kind: StationPersonKind, x: number, z: number, heading = rng.range(-Math.PI, Math.PI)) => this.people.push({
      kind, x, z, hx: x, hz: z, heading, v: 0, boarding: false, gone: false,
      idle: this.people.length % 3 ? 'look' : 'phone',
    });
    const n = Math.round(K.base + crowd * K.perCrowd);
    for (let i = 0; i < n; i++) add('platform', rng.range(S.plat[0] + 2, S.plat[1] - 2), rng.range(S.edgeZ + 0.8, 3.5));
    // Standing right on the escalator (the +z half), facing up it.
    for (let x = S.esc[0] + 1; x < S.esc[1]; x += K.escGap) add('stander', x, (S.escSplit + S.escZ[1]) / 2 + rng.range(-0.2, 0.2), 0);
    for (let i = 0; i < K.gateQueue; i++) add('queue', rng.range(3, S.gateX - 2), rng.range(-4, 4));
  }

  /**
   * Shove: bodies within reach push each other apart. Returns how far to move the player and whether they
   * touched anyone. (Standers fill the escalator's right lane, which the sim treats as solid.)
   */
  shove(px: number, pz: number, crowd: number): { dx: number; dz: number; touching: boolean } {
    let dx = 0, dz = 0, touching = false;
    const back = K.pushBack[0] + crowd * K.pushBack[1];
    for (const n of this.people) {
      if (n.boarding || n.gone || n.kind === 'stander') continue;
      const ox = n.x - px, oz = n.z - pz, d = Math.hypot(ox, oz);
      if (d >= K.reach || d < 1e-3) continue;
      const push = (K.reach - d) / d;
      touching = true;
      n.x += ox * push * K.push;
      n.z += oz * push * K.push;
      dx -= ox * push * back;
      dz -= oz * push * back;
    }
    return { dx, dz, touching };
  }

  /** The doors opened: a share of the platform heads for them. */
  rush(rng: Rng) {
    for (const n of this.people) if (n.kind === 'platform' && !n.gone && rng.chance(K.boardShare)) n.boarding = true;
  }

  /** The doors closed: whoever didn't make it goes back to waiting. */
  settle() {
    for (const n of this.people) n.boarding = false;
  }

  update(dt: number, doorsOpen: boolean) {
    for (const n of this.people) {
      if (n.gone) { n.v = 0; continue; }
      const x0 = n.x, z0 = n.z;
      if (n.boarding && doorsOpen) {
        const door = nearestDoor(n.x);
        const tx = door - n.x, tz = S.edgeZ - 0.5 - n.z, d = Math.hypot(tx, tz);
        if (d < 0.6) { n.gone = true; n.v = 0; continue; }
        const step = Math.min(d, K.rushSpeed * dt);
        n.x += tx / d * step; n.z += tz / d * step;
      } else {
        const k = Math.min(1, dt * K.homeDrift);
        n.x += (n.hx - n.x) * k; n.z += (n.hz - n.z) * k;
      }
      const mx = n.x - x0, mz = n.z - z0;
      n.v = dt > 0 ? Math.hypot(mx, mz) / dt : 0;
      if (n.v > 0.8) {
        const want = Math.atan2(mz, mx);
        n.heading += Math.atan2(Math.sin(want - n.heading), Math.cos(want - n.heading)) * Math.min(1, dt * 10);
      }
    }
  }
}

export function nearestDoor(x: number) {
  return S.doors.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
}
