import { describe, expect, it } from 'vitest';
import { ambience as A, clips, loadOrder, type ClipId } from '../content/sounds';
import { floods } from '../content/sectorv';
import { distOutside, hawkerGap, hornBedGain, inSpot, isHomeEnding, rainBedGain } from './mix';

describe('horn bed follows the jam', () => {
  it('maps jam 0..1 onto hornMin..hornMax, clamped', () => {
    expect(hornBedGain(0)).toBeCloseTo(A.hornMin);
    expect(hornBedGain(1)).toBeCloseTo(A.hornMax);
    expect(hornBedGain(-3)).toBeCloseTo(A.hornMin);
    expect(hornBedGain(9)).toBeCloseTo(A.hornMax);
    expect(hornBedGain(NaN)).toBeCloseTo(A.hornMin);
  });
  it('gets louder as the jam grows', () => {
    let prev = -1;
    for (let j = 0; j <= 1; j += 0.1) { const g = hornBedGain(j); expect(g).toBeGreaterThan(prev); prev = g; }
  });
});

describe('rain near the floods', () => {
  const webel = floods[0];
  it('is full inside a flood', () => {
    expect(rainBedGain(floods, webel.x, webel.z)).toBeCloseTo(A.rainMax);
    expect(distOutside(floods, webel.x + webel.r - 1, webel.z)).toBe(0);
  });
  it('fades with distance and is silent far away', () => {
    const near = rainBedGain(floods, webel.x + webel.r + 10, webel.z);
    const far = rainBedGain(floods, webel.x + webel.r + 30, webel.z);
    expect(near).toBeLessThan(A.rainMax);
    expect(far).toBeLessThan(near);
    expect(rainBedGain(floods, -300, -300)).toBe(0);
    expect(rainBedGain([], 0, 0)).toBe(0);
  });
});

describe('hawkers and endings', () => {
  it('hawker gaps stay within the tuned range', () => {
    expect(hawkerGap(0)).toBe(A.hawkerGapMin);
    expect(hawkerGap(1)).toBe(A.hawkerGapMax);
    expect(hawkerGap(0.5)).toBeGreaterThan(A.hawkerGapMin);
  });
  it('the café strip is a spot you can stand in', () => {
    expect(inSpot(A.cafe, A.cafe.x, A.cafe.z)).toBe(true);
    expect(inSpot(A.cafe, A.cafe.x + A.cafe.r + 1, A.cafe.z)).toBe(false);
  });
  it('dhaak only for endings where you got home', () => {
    expect(isHomeEnding('home')).toBe(true);
    expect(isHomeEnding('walked-home')).toBe(true);
    expect(isHomeEnding('still-sector-v')).toBe(false);
    expect(isHomeEnding('howrah-express')).toBe(false);
    expect(isHomeEnding(null)).toBe(false);
  });
});

// The project has no Node types (it targets the browser), so load fs untyped; tests run in Node.
const fsModule = 'node:fs';
const fs = (await import(fsModule)) as {
  readFileSync(p: string, enc: 'utf8'): string;
  statSync(p: string): { size: number };
};

describe('clip manifest', () => {
  const ids = Object.keys(clips) as ClipId[];
  const readme = fs.readFileSync('README.md', 'utf8');
  it('every clip has a licence, a credit and a source', () => {
    for (const id of ids) {
      const c = clips[id];
      expect(['CC0', 'CC BY 4.0', 'PD Mark 1.0']).toContain(c.licence);
      expect(c.credit.length).toBeGreaterThan(5);
      expect(c.source).toMatch(/^https:\/\//);
    }
  });
  it('every clip file exists in public/sounds and is at most 120 KB', () => {
    for (const id of ids) expect(fs.statSync(`public/sounds/${clips[id].file}`).size).toBeLessThanOrEqual(120 * 1024);
  });
  it('every clip author is credited in the README', () => {
    for (const id of ids) {
      const author = clips[id].credit.split(' by ')[1].split(',')[0];
      expect(readme).toContain(author);
    }
  });
  it('loads every clip exactly once, shankh first', () => {
    expect([...loadOrder].sort()).toEqual([...ids].sort());
    expect(loadOrder[0]).toBe('shankh');
  });
});
