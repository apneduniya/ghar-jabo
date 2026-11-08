// The run: one evening, 6:30 PM to 10:30 PM of game time, about 2 minutes of real time.

export const START_MIN = 18 * 60 + 30;
export const END_MIN = 22 * 60 + 30;
/** Game minutes that pass per real second while the clock runs. */
export const CLOCK_RATE = 2;
export const START_MONEY = 150;

export type Mode = 'rapinah' | 'bus' | 'metro';
/** How the player covered the last stretch home. */
export type ArriveMode = Mode | 'walk';

export type EndingId =
  | 'home-early'
  | 'home'
  | 'home-late'
  | 'rapinah-miracle'
  | 'howrah-express'
  | 'still-sector-v'
  | 'walked-home';

export interface Stats {
  cancels: number;
  rebooks: number;
  tipsPaid: number;
  footboardStops: number;
  falls: number;
  busHops: number;
  ditched: number;
  missedBuses: number;
  missedTrains: number;
  seatFound: boolean;
  gaveSeat: boolean;
  squeezes: number;
  taxiHits: number;
  momMissed: number;
  momAnswered: number;
  surgePaid: number;
  modesTried: Mode[];
}

/** A canvas frame kept for the newspaper photo. Higher drama replaces lower. */
export interface Photo {
  dataUrl: string;
  drama: number;
  burst: string;
}

export class Run {
  minute = START_MIN;
  money = START_MONEY;
  dignity = 100;
  clockRunning = false;
  /** When Ma calls next. */
  nextCall = 19 * 60;
  /** Where the player appears when the city scene starts (the metro drops you near Sealdah). */
  spawnX = 0;
  /** The seed this run was played with (for "beat my run" links). */
  seed = 0;
  /** Set when the player leaves the real map on a vehicle: the long ride continues on it. */
  rideMode: 'bus' | 'rapinah' | null = null;
  stats: Stats = {
    cancels: 0, rebooks: 0, tipsPaid: 0, footboardStops: 0, falls: 0, busHops: 0, ditched: 0,
    missedBuses: 0, missedTrains: 0, seatFound: false, gaveSeat: false,
    squeezes: 0, taxiHits: 0, momMissed: 0, momAnswered: 0, surgePaid: 0, modesTried: [],
  };
  photo: Photo | null = null;
  ending: EndingId | null = null;
  homeMode: ArriveMode | null = null;
  /** Set when a scene wants a photo taken right after the next render. */
  photoRequest: { drama: number; burst: string } | null = null;

  tick(dt: number) {
    if (this.clockRunning && !this.ending) this.minute += dt * CLOCK_RATE;
  }

  addMinutes(m: number) { this.minute += m; }

  spend(amount: number): boolean {
    if (this.money < amount) return false;
    this.money -= amount;
    return true;
  }

  hurtDignity(n: number) { this.dignity = Math.max(0, Math.min(100, this.dignity - n)); }

  tried(mode: Mode) {
    if (!this.stats.modesTried.includes(mode)) this.stats.modesTried.push(mode);
  }

  get timeUp() { return this.minute >= END_MIN; }

  /** Traffic jam from 0 (free road) to 1 (gridlock). Peaks 7:30 to 9 PM. */
  get jam() { return jamAt(this.minute); }

  /** Metro crowd from 0 to 1. Peaks 6:45 to 8 PM. */
  get crowd() {
    const m = this.minute;
    if (m < 18 * 60 + 45) return 0.6 + (m - START_MIN) / 15 * 0.3;
    if (m < 20 * 60) return 0.95;
    return Math.max(0.35, 0.95 - (m - 20 * 60) / 90 * 0.6);
  }

  requestPhoto(drama: number, burst: string) {
    if (this.photo && this.photo.drama >= drama) return;
    if (this.photoRequest && this.photoRequest.drama >= drama) return;
    this.photoRequest = { drama, burst };
  }
}

export function jamAt(m: number): number {
  if (m < 19 * 60 + 30) return Math.max(0.15, (m - START_MIN) / 60);
  if (m < 21 * 60) return 1;
  return Math.max(0.3, 1 - (m - 21 * 60) / 60 * 0.7);
}

export function clockText(min: number): string {
  const m = Math.floor(min);
  let h = Math.floor(m / 60) % 24;
  const mm = String(m % 60).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mm} ${ampm}`;
}
