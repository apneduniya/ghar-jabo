import { describe, expect, it } from 'vitest';
import { END_MIN, Run, START_MIN, clockText, jamAt } from './run';

describe('Run clock', () => {
  it('runs 6:30 PM to 10:30 PM and only ticks while running', () => {
    const r = new Run();
    expect(clockText(r.minute)).toBe('6:30 PM');
    r.tick(10);
    expect(r.minute).toBe(START_MIN);
    r.clockRunning = true;
    r.tick(10);
    expect(r.minute).toBeGreaterThan(START_MIN);
    r.minute = END_MIN;
    expect(r.timeUp).toBe(true);
  });

  it('spends money only when there is enough', () => {
    const r = new Run();
    expect(r.spend(100)).toBe(true);
    expect(r.spend(100)).toBe(false);
    expect(r.money).toBe(50);
  });
});

describe('jam curve', () => {
  it('builds from light traffic to gridlock between 7:30 and 9 PM', () => {
    expect(jamAt(START_MIN)).toBeLessThan(0.3);
    expect(jamAt(20 * 60)).toBe(1);
    expect(jamAt(22 * 60)).toBeLessThan(1);
  });
});
