import { describe, expect, it } from 'vitest';
import { T } from '../content/tuning';
import { NO_INTENT, Player, roadAssist, stickToWorld } from './player';

describe('road magnetism and camera-relative movement', () => {
  it('a push nearly along the road runs along it, either way; across it is left alone', () => {
    const [x, z] = roadAssist(Math.cos(0.05), Math.sin(0.05), 1, 0);
    expect(Math.abs(Math.atan2(z, x))).toBeLessThan(0.01);
    const [bx, bz] = roadAssist(-Math.cos(0.05), Math.sin(0.05), 1, 0);
    expect(Math.abs(Math.atan2(bz, bx))).toBeGreaterThan(Math.PI - 0.01);
    expect(roadAssist(0, 1, 1, 0)).toEqual([0, 1]);
    const [hx, hz] = roadAssist(0.5 * Math.cos(0.2), 0.5 * Math.sin(0.2), 1, 0); // still drifts, a little
    expect(Math.atan2(hz, hx)).toBeGreaterThan(0.05);
    expect(Math.atan2(hz, hx)).toBeLessThan(0.2);
    expect(Math.hypot(hx, hz)).toBeCloseTo(0.5);
  });

  it('the stick is read in the camera yaw: up is where the camera looks, right is screen right', () => {
    const [ux, uz] = stickToWorld(1, 0, 0.7);
    expect(Math.atan2(uz, ux)).toBeCloseTo(0.7);
    const [rx, rz] = stickToWorld(0, 1, 0); // camera along +x: screen right is +z (three.js, y up)
    expect(rx).toBeCloseTo(0);
    expect(rz).toBeCloseTo(1);
    expect(Math.hypot(...stickToWorld(0.6, 0.3, 2))).toBeCloseTo(Math.hypot(0.6, 0.3));
  });

  it('holding the stick sideways with a still camera runs in a straight line (no auto-turn, no spiral)', () => {
    const p = new Player(), yaw = 0, path: number[] = [];
    for (let i = 0; i < 480; i++) {
      const [mx, mz] = stickToWorld(0, 1, yaw);
      p.stepFoot(T.step, { ...NO_INTENT, moveX: mx, moveZ: mz }, open);
      path.push(Math.atan2(p.vz, p.vx));
    }
    const tail = path.slice(60);
    expect(Math.max(...tail) - Math.min(...tail)).toBeLessThan(0.01);
    expect(tail[0]).toBeCloseTo(Math.PI / 2, 2);
  });
});

const open = () => false;

describe('player turning', () => {
  it('turns smoothly towards the stick instead of snapping, and gets there', () => {
    const p = new Player();
    p.heading = 0;
    const left = { ...NO_INTENT, moveX: 0, moveZ: 1 }; // a quarter turn
    const seen: number[] = [];
    for (let i = 0; i < 40; i++) { p.stepFoot(T.step, left, open); seen.push(p.heading); }
    for (let i = 1; i < seen.length; i++) expect(Math.abs(seen[i] - seen[i - 1])).toBeLessThan(0.3);
    expect(seen[3]).toBeLessThan(Math.PI / 2 - 0.2);
    expect(p.heading).toBeCloseTo(Math.PI / 2, 1);
  });

  it('turns the short way round across ±π', () => {
    const p = new Player();
    p.heading = Math.PI - 0.1;
    p.vx = -6; p.vz = -0.6; // already running just past π
    const intent = { ...NO_INTENT, moveX: -1, moveZ: -0.1 };
    for (let i = 0; i < 30; i++) {
      p.stepFoot(T.step, intent, open);
      expect(Math.abs(Math.cos(p.heading) + 1)).toBeLessThan(0.05); // never swings round through 0
    }
  });

  it('a light push walks and a full push runs', () => {
    const walk = new Player(), run = new Player();
    for (let i = 0; i < 120; i++) {
      walk.stepFoot(T.step, { ...NO_INTENT, moveX: 0.3 }, open);
      run.stepFoot(T.step, { ...NO_INTENT, moveX: 1 }, open);
    }
    expect(walk.vx).toBeCloseTo(T.player.runSpeed * 0.3, 1);
    expect(run.vx).toBeCloseTo(T.player.runSpeed, 1);
  });
});
