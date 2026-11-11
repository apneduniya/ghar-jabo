// Floating thumb stick maths, kept free of the DOM so it can be unit tested.
// Screen coordinates: x right, y down. Output: `fwd` = screen up, `right` = screen right, both -1..1.

import { CONTROLS } from '../content/tuning';

export interface StickOut { fwd: number; right: number; mag: number }

/**
 * Knob offset (dx, dy) from the base centre, for a rim radius `rim` (px) → move vector. Inside the dead zone
 * it reads zero; past it the magnitude rises from 0 to 1 along a power curve, so a light push walks and a
 * push to the rim runs. Direction is always exact.
 */
export function stickVector(dx: number, dy: number, rim: number, deadZone = CONTROLS.deadZone, curve = CONTROLS.curve): StickOut {
  const len = Math.hypot(dx, dy);
  const raw = Math.min(1, len / (rim || 1));
  if (raw <= deadZone || len === 0) return { fwd: 0, right: 0, mag: 0 };
  const mag = Math.pow((raw - deadZone) / (1 - deadZone), curve);
  return { fwd: (-dy / len) * mag, right: (dx / len) * mag, mag };
}

/**
 * Base centre after the thumb moves to (tx, ty): if the thumb is past the rim, the base slides along behind
 * it so the knob stays at the rim (no dead travel when you reverse). Otherwise the base stays put.
 */
export function followBase(bx: number, by: number, tx: number, ty: number, rim: number): [number, number] {
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy);
  if (len <= rim) return [bx, by];
  const k = (len - rim) / len;
  return [bx + dx * k, by + dy * k];
}

/** Keep a base of radius `r` fully on screen (w x h) with a margin. */
export function clampBase(x: number, y: number, r: number, w: number, h: number, margin = 6): [number, number] {
  const lo = r + margin;
  return [Math.max(lo, Math.min(w - lo, x)), Math.max(lo, Math.min(h - lo, y))];
}
