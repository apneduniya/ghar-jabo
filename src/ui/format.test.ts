import { describe, expect, it } from 'vitest';
import { timeLeftFraction, timeLeftText, tookText } from './format';
import { END_MIN, START_MIN } from '../sim/run';

describe('format', () => {
  it('says how long a trip took', () => {
    expect(tookText(45)).toBe('45 min');
    expect(tookText(134)).toBe('2 h 14 min');
    expect(tookText(1440 + 190)).toBe('1 day 3 h');
    expect(tookText(2 * 1440)).toBe('2 days 0 h');
    expect(tookText(-5)).toBe('0 min');
  });

  it('counts down to 10:30 PM', () => {
    expect(timeLeftText(START_MIN)).toBe('4 h 00 m left');
    expect(timeLeftText(END_MIN - 128)).toBe('2 h 08 m left');
    expect(timeLeftText(END_MIN - 9)).toBe('9 m left');
    expect(timeLeftText(END_MIN + 30)).toBe('0 m left');
  });

  it('drains the deadline bar from full to empty', () => {
    expect(timeLeftFraction(START_MIN)).toBe(1);
    expect(timeLeftFraction((START_MIN + END_MIN) / 2)).toBeCloseTo(0.5);
    expect(timeLeftFraction(END_MIN + 10)).toBe(0);
  });
});
