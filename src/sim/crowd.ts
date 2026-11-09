// Pedestrians on the footpaths. They walk their stretch of pavement, step aside when you come close,
// and if you barge into one at a run you both stumble (and you hear about it). Pure logic.

import type { MapData } from './mapdata';
import type { BuildingGrid } from './collide';
import type { Rng } from './rng';
import { clearance } from './streetlife';

export interface Walker {
  ax: number; az: number; bx: number; bz: number;
  t: number; // 0..1 along the stretch
  speed: number; // fraction of the stretch per second, signed for direction
  side: number; // sidestep offset (world units) away from the player
  stunned: number; // seconds left knocked off balance
  cooldown: number;
  look: number;
  x: number; z: number; heading: number;
}

export interface Bump { line: string; x: number; z: number }

const LINES = ['"Dada, dekhe cholun!"', '"Chokh ki pocket-e?"', '"Arre arre, ki korchho!"', '"Bhai, aste!"', '"Ei je, line-e daran!"'];

export class Crowd {
  walkers: Walker[] = [];

  constructor(map: MapData, grid: BuildingGrid, rng: Rng, count: number) {
    const segs: [number, number, number, number][] = [];
    for (const r of map.roads) {
      if (!['primary', 'secondary', 'tertiary'].includes(r.k) || r.b) continue;
      for (let i = 1; i < r.p.length; i++) {
        const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 12) continue;
        for (const s of [1, -1]) {
          const off = r.w / 2 + 1.6, nx = (bz - az) / L * off * s, nz = -(bx - ax) / L * off * s;
          const seg: [number, number, number, number] = [ax + nx, az + nz, bx + nx, bz + nz];
          // Not the inner side of a divided road (that is the other carriageway) or across a junction.
          const onRoad = [0, 0.5, 1].some((t) => clearance(map.roads, seg[0] + (seg[2] - seg[0]) * t, seg[1] + (seg[3] - seg[1]) * t) < 0);
          if (!onRoad && !grid.blocked((seg[0] + seg[2]) / 2, (seg[1] + seg[3]) / 2, 0.6)) segs.push(seg);
        }
      }
    }
    // Busier near bus stops.
    const pool = segs.flatMap((s) => {
      const near = map.stops.some((st) => Math.hypot(st.p[0] - (s[0] + s[2]) / 2, st.p[1] - (s[1] + s[3]) / 2) < 45);
      return Array(near ? 4 : 1).fill(s) as [number, number, number, number][];
    });
    for (let i = 0; i < count && pool.length; i++) {
      const [ax, az, bx, bz] = rng.pick(pool);
      const L = Math.hypot(bx - ax, bz - az);
      const w: Walker = { ax, az, bx, bz, t: rng.next(), speed: (rng.chance(0.5) ? 1 : -1) * rng.range(1.2, 1.8) / L, side: 0, stunned: 0, cooldown: 0, look: i % 6, x: 0, z: 0, heading: 0 };
      this.place(w);
      this.walkers.push(w);
    }
  }

  private place(w: Walker) {
    const dx = w.bx - w.ax, dz = w.bz - w.az, L = Math.hypot(dx, dz) || 1;
    // Sidestep is perpendicular to the footpath.
    w.x = w.ax + dx * w.t + (dz / L) * w.side;
    w.z = w.az + dz * w.t - (dx / L) * w.side;
    w.heading = Math.atan2(dz * Math.sign(w.speed), dx * Math.sign(w.speed));
  }

  /** Move everyone; returns a bump if the player barged into someone this step. */
  update(dt: number, px: number, pz: number, pSpeed: number, rng: Rng): Bump | null {
    let bump: Bump | null = null;
    for (const w of this.walkers) {
      w.cooldown = Math.max(0, w.cooldown - dt);
      const d = Math.hypot(w.x - px, w.z - pz);
      if (w.stunned > 0) {
        w.stunned -= dt;
      } else if (d < 2.2) {
        // Make room: drift sideways away from the player and wait.
        const dx = w.bx - w.ax, dz = w.bz - w.az, L = Math.hypot(dx, dz) || 1;
        const away = Math.sign((w.x - px) * (dz / L) + (w.z - pz) * (-dx / L)) || 1;
        w.side = Math.max(-1.6, Math.min(1.6, w.side + away * dt * 2.5));
      } else {
        w.t += w.speed * dt;
        if (w.t > 1 || w.t < 0) { w.speed = -w.speed; w.t = Math.max(0, Math.min(1, w.t)); }
        w.side *= 1 - dt * 0.8; // drift back to the middle of the pavement
      }
      if (d < 0.7 && pSpeed > 4 && w.cooldown <= 0 && !bump) {
        w.stunned = 1.1;
        w.cooldown = 4;
        bump = { line: rng.pick(LINES), x: w.x, z: w.z };
      }
      this.place(w);
    }
    return bump;
  }
}
