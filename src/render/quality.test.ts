import { describe, expect, it } from 'vitest';
import type * as THREE from 'three';
import { Quality } from './quality';

const fakeRenderer = () => {
  const r = { ratio: 0, setPixelRatio(v: number) { r.ratio = v; } };
  return r;
};

describe('adaptive quality', () => {
  it('drops resolution when frames are slow', () => {
    const r = fakeRenderer();
    const q = new Quality(r as unknown as THREE.WebGLRenderer, 1.5);
    for (let i = 0; i < 90; i++) q.frame(28);
    expect(r.ratio).toBe(1.25);
  });

  it('leaves resolution alone at a steady 30 fps (iOS Low Power Mode cap)', () => {
    const r = fakeRenderer();
    const q = new Quality(r as unknown as THREE.WebGLRenderer, 1.5);
    for (let i = 0; i < 270; i++) q.frame(33.3 + (i % 3) * 0.4);
    expect(r.ratio).toBe(1.5);
  });

  it('climbs back after sustained headroom, never past the max', () => {
    const r = fakeRenderer();
    const q = new Quality(r as unknown as THREE.WebGLRenderer, 1.5);
    for (let i = 0; i < 90; i++) q.frame(40);
    for (let i = 0; i < 90 * 20; i++) q.frame(10);
    expect(r.ratio).toBe(1.5);
  });
});
