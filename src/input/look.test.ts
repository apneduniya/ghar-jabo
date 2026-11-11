import { describe, expect, it } from 'vitest';
import { CONTROLS } from '../content/tuning';
import { clampPitch, Look, lookDelta } from './look';

const RAD = Math.PI / 180;

describe('swipe to look', () => {
  it('a drag right turns right, a drag up looks up', () => {
    const [y, p] = lookDelta(40, -30, 390, 844);
    expect(y).toBeGreaterThan(0);
    expect(p).toBeGreaterThan(0);
    const [y2, p2] = lookDelta(-40, 30, 390, 844);
    expect(y2).toBeLessThan(0);
    expect(p2).toBeLessThan(0);
  });

  it('turns the same for the same share of the screen on a phone, a tablet, portrait or landscape', () => {
    const phone = lookDelta(390 * 0.25, 0, 390, 844)[0];
    expect(phone).toBeCloseTo(CONTROLS.lookYaw * 0.25 * RAD);
    expect(lookDelta(390 * 0.25, 0, 844, 390)[0]).toBeCloseTo(phone); // landscape: same short side
    expect(lookDelta(820 * 0.25, 0, 820, 1180)[0]).toBeCloseTo(phone); // tablet
    // A comfortable thumb swipe (a quarter of the phone's width) turns a useful amount, not a whole circle.
    expect(phone / RAD).toBeGreaterThan(30);
    expect(phone / RAD).toBeLessThan(90);
    // Up/down is gentler than sideways.
    expect(Math.abs(lookDelta(0, 100, 390, 844)[1])).toBeLessThan(Math.abs(lookDelta(100, 0, 390, 844)[0]));
  });

  it('eases in over a few frames, then stops dead when the thumb stops (no fling)', () => {
    const l = new Look();
    l.set(0);
    l.turn(1, 0);
    l.step(1 / 60);
    expect(l.yaw).toBeGreaterThan(0);
    expect(l.yaw).toBeLessThan(1);
    for (let i = 0; i < 60; i++) l.step(1 / 60);
    expect(l.yaw).toBeCloseTo(1, 3);
    for (let i = 0; i < 60; i++) l.step(1 / 60);
    expect(l.yaw).toBeCloseTo(1, 3);
  });

  it('pitch stays within its limits however far you drag', () => {
    const l = new Look();
    l.set(0);
    for (let i = 0; i < 50; i++) { l.turn(0, 0.2); l.step(1 / 60); }
    for (let i = 0; i < 60; i++) l.step(1 / 60);
    expect(l.pitch).toBeCloseTo(CONTROLS.pitchRange[1], 3);
    for (let i = 0; i < 50; i++) { l.turn(0, -0.2); l.step(1 / 60); }
    for (let i = 0; i < 60; i++) l.step(1 / 60);
    expect(l.pitch).toBeCloseTo(CONTROLS.pitchRange[0], 3);
    expect(clampPitch(9)).toBe(CONTROLS.pitchRange[1]);
  });

  it('turns smoothly across ±π and keeps yaw in range', () => {
    const l = new Look();
    l.set(Math.PI - 0.05);
    let prev = l.yaw;
    for (let i = 0; i < 30; i++) {
      l.turn(0.02, 0);
      l.step(1 / 60);
      const step = Math.atan2(Math.sin(l.yaw - prev), Math.cos(l.yaw - prev));
      expect(step).toBeGreaterThanOrEqual(0);
      expect(step).toBeLessThan(0.1);
      expect(Math.abs(l.yaw)).toBeLessThanOrEqual(Math.PI);
      prev = l.yaw;
    }
  });

  it('riding: eases back behind the vehicle, and a look drag counts as recent', () => {
    const l = new Look();
    l.set(0);
    l.turn(0.5, 0);
    expect(l.idle).toBe(0);
    for (let i = 0; i < 300; i++) { l.ease(Math.PI / 2, 2.5, 1 / 60); l.step(1 / 60); }
    expect(l.yaw).toBeCloseTo(Math.PI / 2, 2);
    expect(l.idle).toBeGreaterThan(4);
  });
});
