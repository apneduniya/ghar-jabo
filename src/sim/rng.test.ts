import { describe, expect, it } from 'vitest';
import { Rng } from './rng';

describe('Rng', () => {
  it('replays the same sequence for the same seed', () => {
    const a = new Rng(42), b = new Rng(42);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });

  it('stays in [0, 1) and picks every item eventually', () => {
    const r = new Rng(7);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      seen.add(r.pick(['a', 'b', 'c']));
    }
    expect(seen.size).toBe(3);
  });
});
