// The ride (task 033): Green Line stops one after another towards Sealdah. Seated, you fight sleep by tapping;
// standing, you tap HOLD ON just before the brakes or end up in someone's armpit. At Sealdah the doors stay
// open a moment: tap to get off, or ride on to Howrah. Pure logic.

import { STATION } from '../content/tuning';
import { greenLine, stationText as X } from '../content/text';
import type { Events, GameEvent } from './events';
import type { Run } from './run';
import type { Rng } from './rng';

const R = STATION.ride;
const LAST = greenLine.length - 1;

export type RideOutcome = 'arrived' | 'asleep' | 'missed';

/** Where a ride boarded at `from` starts: its Green Line index, at least one stop short of Sealdah. */
export function startLeg(from: string | null): number {
  return Math.min(LAST - 1, Math.max(0, greenLine.indexOf(from ?? '')));
}

export class MetroRide {
  leg: number;
  /** Seconds to the next station. */
  legT: number = R.legSecs;
  seated: boolean;
  /** 0..1; at 1 you are asleep. Only grows while seated. */
  drowsy = 0;
  /** Seconds left at Sealdah with the doors open (0 = not there yet). */
  exitT = 0;
  /** Seconds since the last tap. */
  sinceTap = Infinity;
  /** Brakes taken without holding on. */
  jolts = 0;
  outcome: RideOutcome | null = null;

  constructor(from: string | null, private run: Run, private rng: Rng, private events: Events, private later: (secs: number, e: GameEvent) => void) {
    this.leg = startLeg(from);
    // Later in the evening there's a chance of a seat. Seats make you sleepy.
    this.seated = rng.chance(run.crowd < R.seatCrowd ? R.seat[0] : R.seat[1]);
    run.stats.seatFound = this.seated;
  }

  /** The station after this leg. */
  get next() { return greenLine[Math.min(this.leg + 1, LAST)]; }
  get station() { return greenLine[this.leg]; }
  get atSealdah() { return this.exitT > 0; }

  step(dt: number, tap: boolean) {
    if (this.outcome) return;
    const ev = this.events;
    this.sinceTap = tap ? 0 : this.sinceTap + dt;
    if (this.exitT > 0) {
      this.exitT -= dt;
      if (tap) { this.arrive(); return; }
      if (this.exitT <= 0) {
        this.exitT = 0;
        this.outcome = 'missed';
        ev.toast(X.doorsShut.title, X.doorsShut.line);
        ev.push({ type: 'photo', drama: 5, burst: X.asleep.burst });
        this.later(R.missDelay, { type: 'end', ending: 'howrah-express' });
      }
      return;
    }
    this.legT -= dt;
    if (this.legT <= 0) {
      this.leg++;
      this.legT = R.legSecs;
      ev.sfx('chime');
      if (this.leg >= LAST) {
        ev.notify(X.sealdah.title, X.sealdah.body, 'metro');
        ev.push({ type: 'hint', text: X.sealdah.hint });
        this.exitT = R.exitSecs;
        return;
      }
      ev.notify(`Agla station: ${this.next}`, '', 'metro');
      if (!this.seated) {
        ev.push({ type: 'shake', amp: 0.3, secs: 0.3 });
        ev.sfx('bump');
        if (this.sinceTap > R.holdWindow) {
          this.jolts++;
          ev.toast(X.brakes.title, this.rng.pick(X.brakes.lines));
        }
      }
    }
    if (this.seated) {
      this.drowsy += dt * (R.drowsyBase + Math.max(0, this.run.minute - R.lateFrom) / R.lateDiv);
      if (tap) { this.drowsy = Math.max(0, this.drowsy - R.wake); ev.sfx('tap'); }
      if (this.drowsy >= 1) {
        this.drowsy = 1;
        this.outcome = 'asleep';
        ev.toast(X.asleep.title, X.asleep.line);
        ev.push({ type: 'photo', drama: 5, burst: X.asleep.burst });
        this.later(R.asleepDelay, { type: 'end', ending: 'howrah-express' });
      }
    }
  }

  private arrive() {
    this.outcome = 'arrived';
    this.events.sfx('win');
    this.events.toast(X.out.title, X.out.line);
    this.later(R.arriveDelay, { type: 'arrive', mode: 'metro' });
  }
}
