// The run. Every run starts at 6:30 PM on day 1. `minute` counts game minutes since midnight of day 1,
// so 1:14 AM the next night is 1440 + 74.
//  - timed: get home before 10:30 PM (about 4 real minutes).
//  - free: no deadline; the clock runs on through the night into day 2, 3... and the record is how long it took.

export const START_MIN = 18 * 60 + 30;
export const END_MIN = 22 * 60 + 30;
export const DAY = 24 * 60;
/** Game minutes that pass per real second while the clock runs. */
export const CLOCK_RATE = 1;
export type PlayMode = 'timed' | 'free';
export const START_MONEY = 150;

export type Mode = 'rapinah' | 'bus' | 'metro';
/** How the player covered the last stretch home. */
export type ArriveMode = Mode | 'walk';

export type EndingId =
  | 'home-early'
  | 'home'
  | 'home-late'
  | 'home-next-day'
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
  bumped: number;
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
  constructor(readonly mode: PlayMode = 'timed') {}
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
    cancels: 0, rebooks: 0, tipsPaid: 0, footboardStops: 0, falls: 0, bumped: 0, busHops: 0, ditched: 0,
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

  get timeUp() { return this.mode === 'timed' && this.minute >= END_MIN; }

  /** Day 1, 2, 3... */
  get day() { return Math.floor(this.minute / DAY) + 1; }

  /** Minutes since midnight today (0..1439). */
  get timeOfDay() { return ((this.minute % DAY) + DAY) % DAY; }

  /** Game minutes since the 6:30 PM start. */
  get elapsed() { return this.minute - START_MIN; }

  /** Kolkata Metro runs roughly 6:50 AM to 10:30 PM. */
  get metroOpen() { return metroOpenAt(this.timeOfDay); }

  /** Traffic jam from 0 (free road) to 1 (gridlock). Peaks 7:30 to 9 PM. */
  get jam() { return jamAt(this.timeOfDay); }

  /** Metro crowd from 0 to 1. Peaks 6:45 to 8 PM. */
  get crowd() { return crowdAt(this.timeOfDay); }

  requestPhoto(drama: number, burst: string) {
    if (this.photo && this.photo.drama >= drama) return;
    if (this.photoRequest && this.photoRequest.drama >= drama) return;
    this.photoRequest = { drama, burst };
  }
}

const ramp = (m: number, a: number, b: number, from: number, to: number) => from + (to - from) * Math.min(1, Math.max(0, (m - a) / (b - a)));
const H = (h: number, mm = 0) => h * 60 + mm;

/** Traffic jam from 0 (free road) to 1 (gridlock) for a time of day (minutes since midnight). */
export function jamAt(m: number): number {
  m = ((m % DAY) + DAY) % DAY;
  if (m < H(5)) return 0.08; // empty roads, the odd truck
  if (m < H(9)) return ramp(m, H(5), H(9), 0.08, 0.75); // morning: Sector V fills up
  if (m < H(11)) return ramp(m, H(9), H(11), 0.75, 0.25);
  if (m < H(18, 30)) return 0.25; // working hours
  if (m < H(19, 30)) return ramp(m, H(18, 30), H(19, 30), 0.25, 1); // offices let out
  if (m < H(21)) return 1;
  return ramp(m, H(21), H(23, 30), 1, 0.08);
}

/** Metro crowd from 0 to 1 for a time of day. Peaks 6:45 to 8 PM, with a smaller morning peak. */
export function crowdAt(m: number): number {
  m = ((m % DAY) + DAY) % DAY;
  if (m < H(7)) return 0.1;
  if (m < H(10, 30)) return ramp(m, H(7), H(9, 30), 0.1, 0.8);
  if (m < H(18, 30)) return 0.4;
  if (m < H(18, 45)) return ramp(m, H(18, 30), H(18, 45), 0.6, 0.9);
  if (m < H(20)) return 0.95;
  return ramp(m, H(20), H(21, 30), 0.95, 0.35);
}

export function metroOpenAt(m: number): boolean {
  m = ((m % DAY) + DAY) % DAY;
  return m >= H(6, 50) && m < H(22, 30);
}

/** "6:30 PM", or "Day 2 · 1:14 AM" when asked to show the day. */
export function clockText(min: number, withDay = false): string {
  const day = Math.floor(min / DAY) + 1;
  const m = Math.floor(((min % DAY) + DAY) % DAY);
  let h = Math.floor(m / 60) % 24;
  const mm = String(m % 60).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return withDay ? `Day ${day} · ${h}:${mm} ${ampm}` : `${h}:${mm} ${ampm}`;
}
