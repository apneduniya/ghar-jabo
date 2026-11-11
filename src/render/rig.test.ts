import { describe, expect, it } from 'vitest';
import { figure, gait, HeroAnim, PART, PARTS, SKEL, type BodyState, type Look } from './rig';

const looks: Look[] = [
  { dress: 'shirt', skin: 1, hair: 2, top: 3, bottom: 4, shoes: 5, bag: 'shoulder' },
  { dress: 'saree', skin: 1, hair: 2, top: 3, bottom: 4, shoes: 5, accent: 6, longHair: true },
  { dress: 'uniform', skin: 1, hair: 2, top: 3, bottom: 4, shoes: 5, accent: 6, shorts: true, bag: 'backpack' },
  { dress: 'tee', skin: 1, hair: 2, top: 3, bottom: 4, shoes: 5, umbrella: true, bag: 'backpack' },
];

describe('rig layout', () => {
  for (const look of looks) {
    it(`${look.dress}: every vertex belongs to a part, with a sensible pivot`, () => {
      const g = figure(look);
      const pos = g.attributes.position, rig = g.attributes.rig;
      expect(rig.count).toBe(pos.count);
      const parts = new Set<number>();
      let top = 0;
      for (let i = 0; i < pos.count; i++) {
        const part = rig.getX(i), py = rig.getY(i), parent = rig.getW(i), y = pos.getY(i);
        expect(Number.isInteger(part) && part >= 0 && part < PARTS).toBe(true);
        parts.add(part);
        top = Math.max(top, y);
        expect(y).toBeGreaterThanOrEqual(-1e-6); // nothing below the soles
        if (part === PART.thighL || part === PART.thighR) { expect(py).toBeCloseTo(SKEL.hip, 5); expect(y).toBeLessThanOrEqual(SKEL.hip + 0.03); expect(y).toBeGreaterThan(SKEL.knee - 0.05); }
        if (part === PART.shinL || part === PART.shinR) { expect(py).toBeCloseTo(SKEL.knee, 5); expect(parent).toBeCloseTo(SKEL.hip, 5); expect(y).toBeLessThanOrEqual(SKEL.knee + 0.02); }
        if (part === PART.armL || part === PART.armR) { expect(py).toBeCloseTo(SKEL.shoulder, 5); expect(y).toBeGreaterThan(SKEL.elbow - 0.05); }
        if (part === PART.foreL || part === PART.foreR) { expect(py).toBeCloseTo(SKEL.elbow, 5); expect(parent).toBeCloseTo(SKEL.shoulder, 5); expect(y).toBeLessThanOrEqual(SKEL.elbow + 0.02); }
        if (part === PART.head) expect(y).toBeGreaterThan(SKEL.neck - 0.05);
        // Left parts on the figure's left (+x), right parts on its right.
        if ([PART.thighL, PART.shinL, PART.armL, PART.foreL].includes(part as 2)) expect(pos.getX(i)).toBeGreaterThan(0);
        if ([PART.thighR, PART.shinR, PART.armR, PART.foreR].includes(part as 3)) expect(pos.getX(i)).toBeLessThan(0);
      }
      expect(parts.size).toBe(PARTS);
      expect(top).toBeGreaterThan(1.7);
      expect(top).toBeLessThan(1.85);
    });
  }
});

describe('gait', () => {
  it('stride × cadence = speed (no foot sliding), at a walk and at a run', () => {
    for (const v of [0.6, 1.2, 1.8, 3, 4.5, 6.5]) {
      const g = gait(v);
      expect(g.stride * g.rate / (2 * Math.PI)).toBeCloseTo(v, 6);
    }
  });

  it('strides lengthen and cadence quickens with speed; standing is still', () => {
    const walk = gait(1.5), run = gait(6.5);
    expect(run.stride).toBeGreaterThan(walk.stride * 2);
    expect(run.rate).toBeGreaterThan(walk.rate);
    expect(run.lean).toBeGreaterThan(walk.lean);
    expect(gait(0).swing).toBe(0);
    expect(gait(0).rate).toBe(0);
    // A walk's two steps a second, a run's about three: what people actually do.
    expect(walk.rate / Math.PI).toBeGreaterThan(1.6);
    expect(walk.rate / Math.PI).toBeLessThan(2.6);
    expect(run.rate / Math.PI).toBeGreaterThan(2.4);
    expect(run.rate / Math.PI).toBeLessThan(3.6);
  });
});

describe('hero animation', () => {
  const foot = (speed: number): BodyState => ({ speed, airborne: false, vy: 0, down: false, hang: false, sit: false });

  it('phase advances with the distance run', () => {
    const a = new HeroAnim(), b = new HeroAnim();
    for (let i = 0; i < 60; i++) { a.update(1 / 60, foot(2), 0); b.update(1 / 60, foot(0), 0); }
    expect(a.pose.phase).toBeCloseTo(gait(2).rate, 1);
    expect(b.pose.phase).toBe(0);
  });

  it('tucks in the air and squashes on landing', () => {
    const h = new HeroAnim();
    for (let i = 0; i < 20; i++) h.update(1 / 60, { ...foot(5), airborne: true, vy: 3 }, 0);
    expect(h.pose.sit).toBeGreaterThan(0.4);
    h.update(1 / 60, { ...foot(5), airborne: true, vy: -8 }, 0);
    h.update(1 / 60, foot(5), 0);
    h.update(1 / 60, foot(5), 0);
    expect(h.pose.squash).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) h.update(1 / 60, foot(5), 0);
    expect(h.pose.squash).toBe(0);
  });

  it('shuffles the feet when turning on the spot', () => {
    const h = new HeroAnim();
    for (let i = 0; i < 30; i++) h.update(1 / 60, foot(0), i * 0.1);
    expect(h.pose.phase).toBeGreaterThan(0);
  });
});
