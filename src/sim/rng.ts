// Seeded random numbers (mulberry32). Game logic uses this instead of Math.random, so a seed replays a run.

export class Rng {
  private s: number;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }

  /** Uniform in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number) { return a + this.next() * (b - a); }
  chance(p: number) { return this.next() < p; }
  pick<T>(xs: readonly T[]): T { return xs[Math.floor(this.next() * xs.length)]; }
  reseed(seed: number) { this.s = seed >>> 0 || 1; }
}

/** The run's shared generator. Reseeded at the start of every run. */
export const rng = new Rng(Date.now() & 0xffffffff);
