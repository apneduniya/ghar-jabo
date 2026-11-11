// The student: runs, jumps, gets knocked down, hangs off buses, rides pillion. Pure logic.

import { CONTROLS, T } from '../content/tuning';

export type PlayerState = 'foot' | 'hang' | 'pillion' | 'gone';

/** What the player wants this tick, already in world space (the app converts the stick using the camera). */
export interface Intent {
  moveX: number; // world x, -1..1
  moveZ: number; // world z, -1..1
  jump: boolean;
  action: boolean;
  phone: boolean;
  /** Bus balance: -1..1, + leans back in (the app maps it from the stick across the screen). */
  lean: number;
}

export const NO_INTENT: Intent = { moveX: 0, moveZ: 0, jump: false, action: false, phone: false, lean: 0 };

/**
 * Road magnetism: a world-space move (mx, mz) that is within `snap` radians of a road's direction (dx, dz),
 * either way along it, is bent towards it, fully near the line and not at all at the edge of the window
 * (the offset angle is squared), so "up" runs along the road but you can still drift across. Length is kept.
 */
export function roadAssist(mx: number, mz: number, dx: number, dz: number, snap = CONTROLS.roadSnap): [number, number] {
  const mag = Math.hypot(mx, mz);
  if (mag < 1e-6) return [mx, mz];
  const sgn = mx * dx + mz * dz >= 0 ? 1 : -1;
  const road = Math.atan2(dz * sgn, dx * sgn);
  const off = Math.atan2(Math.sin(Math.atan2(mz, mx) - road), Math.cos(Math.atan2(mz, mx) - road));
  if (Math.abs(off) >= snap) return [mx, mz];
  const a = road + off * Math.abs(off) / snap;
  return [Math.cos(a) * mag, Math.sin(a) * mag];
}

/**
 * The stick (fwd = screen up, right = screen right) in world space for a camera looking along `camYaw`
 * (task 027: the camera only turns when the player looks, so this is read in the camera's yaw right now).
 */
export function stickToWorld(fwd: number, right: number, camYaw: number): [number, number] {
  const fx = Math.cos(camYaw), fz = Math.sin(camYaw);
  return [fx * fwd - fz * right, fz * fwd + fx * right];
}

export class Player {
  x = 0; y = 0; z = 0;
  vx = 0; vy = 0; vz = 0;
  heading = 0;
  onGround = true;
  downT = 0;
  slow = 1;
  state: PlayerState = 'foot';
  /** While riding: which vehicle, and footboard balance (|lean| > 1 means you fall). */
  rideId = 0;
  lean = 0;
  leanVel = 0;

  get down() { return this.downT > 0; }

  knockDown(dirX: number, dirZ: number, power: number) {
    this.downT = T.player.knockdownSecs;
    this.vx = dirX * power; this.vz = dirZ * power; this.vy = 4;
    this.onGround = false;
  }

  /** Turn smoothly (the short way round) to face `target`: fast, but never a snap. */
  turnTowards(target: number, dt: number) {
    const d = Math.atan2(Math.sin(target - this.heading), Math.cos(target - this.heading));
    const h = this.heading + d * Math.min(1, dt * CONTROLS.turnRate);
    this.heading = Math.atan2(Math.sin(h), Math.cos(h));
  }

  /** On-foot movement. `blocked(x, z)` says whether a spot is inside a building. */
  stepFoot(dt: number, intent: Intent, blocked: (x: number, z: number) => boolean) {
    const P = T.player;
    if (this.downT > 0) {
      this.downT -= dt;
      this.vx *= 1 - dt * 2;
      this.vz *= 1 - dt * 2;
    } else {
      const sp = P.runSpeed * this.slow;
      const k = this.onGround ? P.accelGround : P.accelAir;
      this.vx += (intent.moveX * sp - this.vx) * Math.min(1, dt * k);
      this.vz += (intent.moveZ * sp - this.vz) * Math.min(1, dt * k);
      if (intent.jump && this.onGround) { this.vy = P.jumpSpeed; this.onGround = false; }
      if (Math.hypot(this.vx, this.vz) > 0.5) this.turnTowards(Math.atan2(this.vz, this.vx), dt);
    }
    if (!this.onGround) {
      this.vy -= P.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.onGround = true; }
    }
    // Slide along walls: try the full move, then each axis on its own.
    const nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    if (!blocked(nx, nz)) { this.x = nx; this.z = nz; }
    else if (!blocked(nx, this.z)) { this.x = nx; this.vz = 0; }
    else if (!blocked(this.x, nz)) { this.z = nz; this.vx = 0; }
    else { this.vx = 0; this.vz = 0; }
  }

  /**
   * Footboard balance: the bus sways and brakes, potholes kick you, and you lean back in.
   * Returns true if you've fallen off. `t` is the sim time, `stopped` whether the bus is nearly still.
   */
  stepBalance(dt: number, intent: Intent, t: number, stopped: boolean): boolean {
    const B = T.bus;
    const sway = Math.sin(t / 0.7) * B.sway[0] + Math.sin(t / 0.29) * B.sway[1] + (stopped ? 0.6 : 0);
    this.leanVel += (sway * 0.9 + this.lean * B.unstable - intent.lean * B.control) * dt;
    this.leanVel *= B.damping;
    this.lean += this.leanVel * dt;
    return Math.abs(this.lean) > 1;
  }
}
