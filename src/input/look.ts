// Swipe-to-look maths (task 027), free of the DOM so it can be unit tested.
// A drag is measured as a share of the screen's short side, so a phone, a tablet, portrait and landscape all
// turn the same amount for the same share of the screen. Drag right turns right, drag up looks up.

import { CONTROLS } from '../content/tuning';

const RAD = Math.PI / 180;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** A drag of (dx, dy) px on a w x h screen → [yaw, pitch] change in radians (yaw + = turn right, pitch + = look up). */
export function lookDelta(dx: number, dy: number, w: number, h: number): [number, number] {
  const side = Math.max(1, Math.min(w, h));
  return [(dx / side) * CONTROLS.lookYaw * RAD, (-dy / side) * CONTROLS.lookPitch * RAD];
}

/**
 * The camera's look: where the player has pointed it (target) and where it is (eased towards the target over
 * a few frames: light smoothing, no fling after the thumb lifts). Pitch is clamped. `yaw` follows the game's
 * convention (atan2(z, x) of the view direction), so turning right adds to it.
 */
export class Look {
  yaw = 0; pitch = 0;
  private ty = 0; private tp = 0;
  /** Seconds since the last look drag (riding uses it to ease back behind the vehicle). */
  idle = Infinity;

  /** Point straight at a yaw (and level pitch) with no easing. */
  set(yaw: number, pitch = 0) {
    this.yaw = this.ty = wrap(yaw);
    this.pitch = this.tp = clampPitch(pitch);
  }

  /** Add a look turn (radians). */
  turn(dYaw: number, dPitch: number) {
    if (!dYaw && !dPitch) return;
    this.ty = this.ty + dYaw;
    this.tp = clampPitch(this.tp + dPitch);
    this.idle = 0;
  }

  /** Swing the target yaw towards `yaw` at `rate` (1/s), e.g. back behind a bus. Not a look: idle keeps counting. */
  ease(yaw: number, rate: number, dt: number) {
    this.ty += wrap(yaw - this.ty) * Math.min(1, dt * rate);
  }

  step(dt: number) {
    this.idle += dt;
    const k = Math.min(1, dt / CONTROLS.lookSmooth);
    const d = this.ty - this.yaw;
    this.yaw += d * k;
    this.pitch += (this.tp - this.pitch) * k;
    // Keep both in range without a visible jump.
    const w = wrap(this.yaw);
    this.ty += w - this.yaw;
    this.yaw = w;
  }
}

export function clampPitch(p: number) {
  const [lo, hi] = CONTROLS.pitchRange;
  return Math.max(lo, Math.min(hi, p));
}
