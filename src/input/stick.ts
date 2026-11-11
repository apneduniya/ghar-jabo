// Fixed thumb stick maths (task 027: the base never moves, the knob stays inside it), kept free of the DOM so it can be unit tested.
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

/** The knob's offset for a thumb at (dx, dy) from the fixed base centre: the thumb's own spot, held to the rim. */
export function clampKnob(dx: number, dy: number, rim: number): [number, number] {
  const len = Math.hypot(dx, dy);
  if (len <= rim) return [dx, dy];
  return [(dx / len) * rim, (dy / len) * rim];
}
