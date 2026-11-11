import { describe, expect, it } from 'vitest';
import { clampKnob, stickVector } from './stick';

describe('thumb stick', () => {
  const rim = 50;

  it('reads nothing inside the dead zone (10% of the rim)', () => {
    expect(stickVector(0, 0, rim).mag).toBe(0);
    expect(stickVector(3, -3, rim).mag).toBe(0); // ~8.5% of the rim
    expect(stickVector(0, -4.9, rim)).toEqual({ fwd: 0, right: 0, mag: 0 });
    expect(stickVector(0, -6, rim).mag).toBeGreaterThan(0);
  });

  it('is analog: a light push walks, the rim runs, past the rim stays full', () => {
    const light = stickVector(0, -20, rim).mag, mid = stickVector(0, -35, rim).mag;
    expect(light).toBeGreaterThan(0);
    expect(light).toBeLessThan(0.3);
    expect(mid).toBeGreaterThan(light);
    expect(stickVector(0, -50, rim).mag).toBeCloseTo(1);
    expect(stickVector(0, -90, rim).mag).toBeCloseTo(1);
  });

  it('rises smoothly and never jumps', () => {
    let prev = 0;
    for (let d = 0; d <= 60; d += 0.5) {
      const m = stickVector(d, 0, rim).mag;
      expect(m).toBeGreaterThanOrEqual(prev);
      expect(m - prev).toBeLessThan(0.05);
      prev = m;
    }
  });

  it('keeps the exact direction: screen up is forward, screen right is right', () => {
    const up = stickVector(0, -40, rim);
    expect(up.fwd).toBeGreaterThan(0);
    expect(up.right).toBeCloseTo(0);
    const diag = stickVector(30, 30, rim);
    expect(diag.fwd).toBeLessThan(0);
    expect(diag.right).toBeCloseTo(-diag.fwd);
    expect(Math.hypot(diag.fwd, diag.right)).toBeCloseTo(diag.mag);
  });

  it('the knob sits under the thumb inside the rim and is held to the rim beyond it (the base never moves)', () => {
    expect(clampKnob(20, -10, rim)).toEqual([20, -10]);
    const [kx, ky] = clampKnob(0, -180, rim);
    expect(kx).toBeCloseTo(0);
    expect(ky).toBeCloseTo(-rim);
    const [dx, dy] = clampKnob(90, 120, rim); // keeps the direction
    expect(Math.hypot(dx, dy)).toBeCloseTo(rim);
    expect(Math.atan2(dy, dx)).toBeCloseTo(Math.atan2(120, 90));
    // A thumb far past the rim still runs at full speed, and reversing it answers as soon as it crosses back.
    expect(stickVector(0, -180, rim).mag).toBeCloseTo(1);
    expect(stickVector(0, 30, rim).fwd).toBeLessThan(0);
  });
});
