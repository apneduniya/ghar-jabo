// Personal bests and the free-roam diary, kept in this browser only (localStorage).

import { clockText, type Run } from '../sim/run';

export interface Records {
  /** Earliest arrival in a timed run, in game minutes. */
  timedBest?: number;
  /** Shortest free-roam trip, in game minutes from the 6:30 PM start. */
  freeBest?: number;
  /** Last few free-roam arrivals, newest first. */
  diary: { reached: string; took: number; how: string; on: string }[];
  played: number;
}

const KEY = 'gj.records.v1';

export function loadRecords(): Records {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? '') as Records;
    if (r && Array.isArray(r.diary)) return r;
  } catch { /* private mode or nothing saved yet */ }
  return { diary: [], played: 0 };
}

export function saveRecord(run: Run) {
  const r = loadRecords();
  r.played++;
  if (run.mode === 'timed') {
    if (r.timedBest === undefined || run.minute < r.timedBest) r.timedBest = run.minute;
  } else {
    if (r.freeBest === undefined || run.elapsed < r.freeBest) r.freeBest = run.elapsed;
    r.diary.unshift({ reached: clockText(run.minute, true), took: Math.round(run.elapsed), how: run.homeMode ?? 'walk', on: new Date().toISOString().slice(0, 10) });
    r.diary = r.diary.slice(0, 10);
  }
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* storage blocked: records are a nicety */ }
}
