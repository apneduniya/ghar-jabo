// Small text formatters shared by the HUD, title and newspaper. Pure, so they're unit-tested.

import { DAY, END_MIN, START_MIN } from '../sim/run';

/** "2 h 14 min", "45 min", or "1 day 3 h" for very long free-roam runs. */
export function tookText(min: number): string {
  const t = Math.max(0, Math.floor(min));
  const d = Math.floor(t / DAY), h = Math.floor((t % DAY) / 60), m = t % 60;
  if (d) return `${d} day${d > 1 ? 's' : ''} ${h} h`;
  return h ? `${h} h ${m} min` : `${m} min`;
}

/** Timed mode: "3 h 52 m left", "9 m left", "0 m left". */
export function timeLeftText(minute: number): string {
  const left = Math.max(0, Math.ceil(END_MIN - minute));
  const h = Math.floor(left / 60), m = left % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} m left` : `${m} m left`;
}

/** Share of the timed evening still left, 1 at 6:30 PM and 0 at 10:30 PM. */
export function timeLeftFraction(minute: number): number {
  return Math.min(1, Math.max(0, (END_MIN - minute) / (END_MIN - START_MIN)));
}
