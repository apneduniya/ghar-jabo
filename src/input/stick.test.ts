import { describe, expect, it } from 'vitest';
import { clampBase, followBase, stickVector } from './stick';

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

  it('the base follows a thumb dragged past the rim, and stays put inside it', () => {
    expect(followBase(100, 100, 120, 100, rim)).toEqual([100, 100]);
    const [bx, by] = followBase(100, 100, 180, 100, rim);
    expect(bx).toBeCloseTo(130);
    expect(by).toBeCloseTo(100);
    // So reversing the thumb answers at once: no dead travel back across the old base.
    expect(stickVector(170 - bx, 0, rim).mag).toBeGreaterThan(0.5);
  });

  it('a base that lands at the screen edge is pulled fully on screen', () => {
    expect(clampBase(5, 830, 62, 390, 844)).toEqual([68, 776]);
    expect(clampBase(150, 600, 62, 390, 844)).toEqual([150, 600]);
  });
});
