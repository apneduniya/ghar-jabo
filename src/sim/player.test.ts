import { describe, expect, it } from 'vitest';
import { T } from '../content/tuning';
import { camFollowRate, NO_INTENT, Player, roadAssist, StickFrame } from './player';

describe('road magnetism and the follow camera', () => {
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

  it('the camera recentres after a moment, gently sideways, never when you run back at it', () => {
    expect(camFollowRate(1, 1)).toBeGreaterThan(1);
    expect(camFollowRate(1, 0.1)).toBe(0); // not straight away
    expect(camFollowRate(0, 5)).toBeGreaterThan(0);
    expect(camFollowRate(0, 5)).toBeLessThan(camFollowRate(1, 5));
    expect(camFollowRate(-1, 5)).toBe(0); // idle or backwards
  });

  // The stage's loop in miniature: stick → world move in the latched frame → velocity → camera follows.
  function hold(stick: (t: number) => [number, number], secs: number) {
    const p = new Player(), frame = new StickFrame(), dt = T.step;
    let yaw = 0;
    const path: number[] = [];
    for (let t = 0; t < secs; t += dt) {
      const [f, r] = stick(t);
      const fy = frame.update(f, r, yaw, dt), fx = Math.cos(fy), fz = Math.sin(fy);
      p.stepFoot(dt, { ...NO_INTENT, moveX: fx * f - fz * r, moveZ: fz * f + fx * r }, open);
      const sp = Math.hypot(p.vx, p.vz), run = Math.atan2(p.vz, p.vx);
      const rate = camFollowRate(sp > 1.5 ? Math.cos(run - yaw) : -1, frame.held);
      yaw += Math.atan2(Math.sin(run - yaw), Math.cos(run - yaw)) * Math.min(1, dt * rate);
      path.push(run);
    }
    return { yaw, path };
  }

  it('holding the stick sideways runs straight while the camera swings round behind: no spiral', () => {
    const { yaw, path } = hold(() => [0, 1], 8);
    const tail = path.slice(60);
    expect(Math.max(...tail) - Math.min(...tail)).toBeLessThan(0.02); // a straight line, not a circle
    expect(Math.abs(tail[0] - Math.PI / 2)).toBeLessThan(0.02); // screen-right of where the camera faced
    expect(Math.abs(yaw - Math.PI / 2)).toBeLessThan(0.1); // and the camera has come round behind
  });

  it('turning the thumb steers from what is on screen now', () => {
    // Hold right until the camera is behind, then sweep the thumb up: you keep running the same way.
    const { path } = hold((t) => (t < 6 ? [0, 1] : [Math.sin(Math.min(1, t - 6) * Math.PI / 2), Math.cos(Math.min(1, t - 6) * Math.PI / 2)]), 9);
    const end = path[path.length - 1];
    expect(Math.abs(end - Math.PI / 2)).toBeLessThan(0.15);
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
