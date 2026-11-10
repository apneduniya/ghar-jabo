import { describe, expect, it } from 'vitest';
import { DAY, END_MIN, Run, START_MIN, clockText, crowdAt, jamAt } from './run';

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

describe('free mode', () => {
  it('never runs out of time and rolls over into the next day', () => {
    const r = new Run('free');
    r.minute = END_MIN + 120;
    expect(r.timeUp).toBe(false);
    r.minute = DAY + 74;
    expect(r.day).toBe(2);
    expect(r.timeOfDay).toBe(74);
    expect(clockText(r.minute, true)).toBe('Day 2 · 1:14 AM');
    expect(r.metroOpen).toBe(false); // the metro sleeps at 1 AM
    r.minute = DAY + 9 * 60;
    expect(r.metroOpen).toBe(true);
  });

  it('runs one game minute per real second in the timed run', () => {
    const r = new Run();
    r.clockRunning = true;
    r.tick(60);
    expect(r.minute).toBe(START_MIN + 60);
  });

  it('runs one game minute every five real seconds in free roam (true-scale distances)', () => {
    const r = new Run('free');
    r.clockRunning = true;
    r.tick(60);
    expect(r.minute).toBeCloseTo(START_MIN + 12);
  });
});

describe('jam curve', () => {
  it('builds from light traffic to gridlock between 7:30 and 9 PM', () => {
    expect(jamAt(START_MIN)).toBeLessThan(0.3);
    expect(jamAt(20 * 60)).toBe(1);
    expect(jamAt(22 * 60)).toBeLessThan(1);
  });

  it('covers the whole day: empty at night, busy in the morning, the same on day 2', () => {
    expect(jamAt(3 * 60)).toBeLessThan(0.1);
    expect(jamAt(9 * 60)).toBeGreaterThan(0.6);
    expect(jamAt(DAY + 20 * 60)).toBe(jamAt(20 * 60));
    expect(crowdAt(2 * 60)).toBeLessThan(0.2);
    expect(crowdAt(19 * 60)).toBeGreaterThan(0.9);
  });
});
