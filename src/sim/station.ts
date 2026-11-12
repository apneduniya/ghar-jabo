// The Sector V metro stage's rules (task 033). Squeeze through a ticket gate that works (₹20), walk left on the
// escalator past the people standing right, shove through the platform crowd to a door before it shuts, then
// ride the Green Line and don't miss Sealdah. Pure and seeded: the stage feeds it intents at 60 Hz and turns
// its events into toasts, sounds and the next stage.

import { STATION, T } from '../content/tuning';
import { stationText as X, ticker } from '../content/text';
import { Events, type GameEvent } from './events';
import { Player, type Intent } from './player';
import type { Rng } from './rng';
import type { Run } from './run';
import { StationCrowd } from './stationcrowd';
import { MetroRide } from './stationride';

const S = STATION, K = STATION.crowd;

export type StationPhase = 'gate' | 'escalator' | 'platform' | 'ride' | 'arrived' | 'missed';
export type TrainState = 'away' | 'arriving' | 'open' | 'leaving';

export interface Train {
  state: TrainState;
  /** Centre of the first car (the rest follow at +carLen each). */
  x: number;
  /** Seconds until the next arrival (away) or until the doors shut (open). */
  t: number;
}

export class StationSim {
  phase: StationPhase = 'gate';
  player = new Player();
  /** Which ticket gates work (green). At least one always does. */
  gateOpen: boolean[] = [];
  paid = false;
  crowd: StationCrowd;
  train: Train = { state: 'away', x: S.enterX, t: S.firstTrain };
  ride: MetroRide | null = null;
  events = new Events();
  /** Sim time, seconds. */
  t = 0;
  /** Seconds of shoving since the last bump; whether you touched anyone this step. */
  shoveT = 0;
  shoving = false;
  private queue: { at: number; e: GameEvent }[] = [];
  private nagAt = -Infinity;
  private standAt = -Infinity;

  constructor(readonly run: Run, private rng: Rng) {
    for (let i = 0; i < S.gateLanes; i++) this.gateOpen.push(rng.chance(S.gateWorks));
    if (!this.gateOpen.includes(true)) this.gateOpen[Math.floor(rng.next() * S.gateLanes)] = true;
    this.crowd = new StationCrowd(rng, run.crowd);
    this.player.x = S.start[0];
    this.player.z = S.start[1];
  }

  /** Lane centre for gate i. */
  laneZ(i: number) { return S.gateZ0 + i * S.gateGap; }
  /** The gate lane whose opening `z` is in, or -1 (a gate housing). */
  laneAt(z: number) {
    const i = Math.round((z - S.gateZ0) / S.gateGap);
    return i >= 0 && i < S.gateLanes && Math.abs(z - this.laneZ(i)) < S.gateHalf ? i : -1;
  }
  doorX(i: number) { return S.doors[i]; }

  /** Walls, the platform edge, the gates (shut ones and their housings) and the escalator's rails. */
  blocked = (x: number, z: number): boolean => {
    const r = T.player.radius;
    if (x < S.xMin + r || x > S.xMax - r || z > S.zMax - r) return true;
    // Past the escalator the track is beyond the platform edge; before it, the concourse wall.
    if (z < (x > S.esc[1] ? S.edgeZ : S.zMin + r)) return true;
    if (Math.abs(x - S.gateX) < S.gateDepth) {
      const lane = this.laneAt(z);
      if (lane < 0 || !this.gateOpen[lane]) return true;
    }
    // The escalator runs in a well: its rails, and its right lane where people stand (keep left).
    if (x > S.esc[0] - r && x < S.esc[1] && (z < S.escZ[0] + r || z > S.escSplit - r)) return true;
    return false;
  };

  /** At a door, at the platform edge. */
  atDoor() {
    const p = this.player;
    return S.doors.some((d) => Math.abs(d - p.x) < S.doorReach) && p.z < S.edgeZ + S.doorEdge;
  }

  /** On the moving steps. */
  onEscalator() {
    const p = this.player;
    return p.x > S.esc[0] && p.x < S.esc[1] && p.z > S.escZ[0] && p.z < S.escZ[1];
  }

  /** Something for the stage `secs` from now (sim time, so a seed replays it). */
  later = (secs: number, e: GameEvent) => { this.queue.push({ at: this.t + secs, e }); };

  step(intent: Intent) {
    const dt = T.step;
    this.t += dt;
    for (const q of this.queue.filter((q) => q.at <= this.t)) this.events.push(q.e);
    this.queue = this.queue.filter((q) => q.at > this.t);
    if (this.phase === 'ride') {
      const ride = this.ride!;
      this.train.x += S.ride.speed * dt;
      if (this.train.x > S.ride.wrapX) this.train.x = S.ride.wrapTo;
      ride.step(dt, intent.action);
      if (ride.outcome) this.phase = ride.outcome === 'arrived' ? 'arrived' : 'missed';
      return;
    }
    if (this.phase === 'arrived' || this.phase === 'missed') return;
    this.walk(dt, intent);
    this.crowd.update(dt, this.train.state === 'open');
    if (this.phase === 'platform') this.runTrain(dt);
  }

  private walk(dt: number, intent: Intent) {
    const p = this.player, x0 = p.x;
    p.stepFoot(dt, intent, this.blocked);
    // Walking into a red gate.
    const lane = this.laneAt(p.z);
    if (p.x < S.gateX && p.x > S.gateX - S.gateDepth - 0.3 && intent.moveX > 0.3 && (lane < 0 || !this.gateOpen[lane]) && this.t - this.nagAt > S.gateNag) {
      this.nagAt = this.t;
      this.events.toast(X.gateShut.title, X.gateShut.line);
    }
    // Through a green one: the token is auto-debited.
    if (!this.paid && x0 < S.gateX && p.x >= S.gateX) {
      this.paid = true;
      this.run.spend(T.metro.fare);
      this.events.sfx('coin');
      this.events.notify(X.token.title, X.token.body, 'metro');
    }
    // The escalator carries you up.
    if (this.onEscalator() && !this.blocked(p.x + S.escSpeed * dt, p.z)) p.x += S.escSpeed * dt;
    // Pushing into the people standing right.
    if (p.x > S.esc[0] - 1.2 && p.x < S.esc[1] && p.z > S.escSplit - 1 && p.z < S.escZ[1] + 0.3 && this.blocked(p.x + intent.moveX * 0.3, p.z + intent.moveZ * 0.3)
      && (intent.moveX > 0.3 || intent.moveZ > 0.3) && this.t - this.standAt > S.gateNag) {
      this.standAt = this.t;
      this.events.toast(X.standRight.title, X.standRight.line);
    }
    // Bodies.
    const sh = this.crowd.shove(p.x, p.z, this.run.crowd);
    if (sh.touching) {
      if (!this.blocked(p.x + sh.dx, p.z + sh.dz)) { p.x += sh.dx; p.z += sh.dz; }
      else if (!this.blocked(p.x + sh.dx, p.z)) p.x += sh.dx;
      else if (!this.blocked(p.x, p.z + sh.dz)) p.z += sh.dz;
      this.shoveT += dt;
      if (this.shoveT > K.shoveEvery) {
        this.shoveT = 0;
        this.events.sfx('bump');
        this.run.stats.squeezes++;
        if (this.rng.chance(K.shoveToast)) this.events.toast(X.shove.title, this.rng.pick(X.shove.lines));
      }
    }
    this.shoving = sh.touching;
    if (this.phase === 'gate' && p.x >= S.esc[0]) this.phase = 'escalator';
    if (this.phase === 'escalator' && p.x >= S.plat[0]) {
      this.phase = 'platform';
      this.events.push({ type: 'hint', text: X.platform });
      this.events.notify(X.yellowLine.title, X.yellowLine.body, 'metro');
      this.later(S.tickerAfter, { type: 'notify', title: this.rng.pick(ticker.metro), body: '', tone: 'news' });
    }
  }

  private runTrain(dt: number) {
    const tr = this.train, ev = this.events;
    if (tr.state === 'away') {
      tr.t -= dt;
      if (tr.t <= 0) { tr.state = 'arriving'; tr.x = S.enterX; ev.push({ type: 'hint', text: X.trainComing }); }
    } else if (tr.state === 'arriving') {
      const d = S.stopX - tr.x;
      tr.x = Math.min(S.stopX, tr.x + Math.max(S.arriveMin, Math.min(S.arriveMax, d * S.arriveK)) * dt);
      if (d < 0.05) {
        tr.x = S.stopX;
        tr.state = 'open';
        tr.t = S.doorsOpen;
        ev.sfx('chime');
        ev.push({ type: 'hint', text: X.doorsOpen });
        this.crowd.rush(this.rng);
      }
    } else if (tr.state === 'open') {
      const before = tr.t;
      tr.t -= dt;
      if (before >= S.doorWarn && tr.t < S.doorWarn) { ev.sfx('doorBeep'); ev.push({ type: 'hint', text: X.doorsClosing }); }
      if (this.atDoor() && !this.player.down) { this.board(); return; }
      if (tr.t <= 0) {
        tr.state = 'leaving';
        this.run.stats.missedTrains++;
        ev.sfx('bad');
        ev.toast(X.missedTrain.title, X.missedTrain.line);
        this.crowd.settle();
      }
    } else {
      tr.x += S.leaveSpeed * dt;
      if (tr.x > S.goneX) { tr.state = 'away'; tr.t = S.nextTrain; }
    }
  }

  private board() {
    const run = this.run, ev = this.events;
    this.phase = 'ride';
    this.player.state = 'gone';
    this.player.vx = this.player.vz = 0;
    this.ride = new MetroRide(run.metroFrom, run, this.rng, ev, this.later);
    ev.sfx('whoosh');
    if (run.crowd > 0.8) ev.push({ type: 'photo', drama: 2.5, burst: X.in.burst });
    ev.toast(X.in.title, run.crowd > 0.8 ? X.in.packed : X.in.calm);
    ev.push({ type: 'hint', text: this.ride.seated ? X.seatHint : X.standHint });
    ev.notify(`Agla station: ${this.ride.next}`, X.nextStation, 'metro');
  }
}
