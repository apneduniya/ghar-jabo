// Scene switching and the shared run. Scenes import `game` to move between each other.

import type * as THREE from 'three';
import { Run, type ArriveMode, type EndingId, type PlayMode } from '../sim/run';
import { saveRecord } from './records';
import { rng } from '../sim/rng';

export interface Scene {
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  enter(): void;
  update(dt: number): void;
  exit(): void;
}

type SceneName = 'lobby' | 'sectorv' | 'station' | 'result';

class Game {
  run = new Run();
  /** The mode of the last run started, so "play again" keeps it. */
  mode: PlayMode = 'timed';
  current: Scene | null = null;
  private factories = new Map<SceneName, () => Scene>();
  /** Slow motion: 1 is normal speed. Used for falls and fail beats. */
  timeScale = 1;
  /** Freeze frames left (hit-stop). */
  hitStop = 0;
  /** Set when an ending is waiting for one more rendered frame, so the newspaper has a photo. */
  resultPending = false;
  /** True when the next real-map scene should open as the title screen (attract mode). */
  attract = false;
  /** Handles for automated playtests. */
  debug: Record<string, unknown> = {};

  register(name: SceneName, make: () => Scene) { this.factories.set(name, make); }

  go(name: SceneName) {
    this.current?.exit();
    this.timeScale = 1;
    this.hitStop = 0;
    this.current = this.factories.get(name)!();
    this.current.enter();
  }

  newRun(mode: PlayMode = this.mode) {
    this.mode = mode;
    this.run = new Run(mode);
    // `?seed=123` replays the same run (traffic, captains, cancellations); otherwise a fresh seed.
    const seed = Number(new URLSearchParams(location.search).get('seed')) || (Date.now() & 0x7fffffff);
    this.run.seed = seed;
    rng.reseed(seed);
    this.go('sectorv');
  }

  /** Arrived at Sealdah by some mode. */
  arrive(mode: ArriveMode) {
    const r = this.run;
    r.homeMode = mode;
    if (mode === 'walk' && r.stats.busHops === 0 && !r.stats.modesTried.length) r.ending = 'walked-home';
    else if (mode === 'rapinah') r.ending = 'rapinah-miracle';
    else if (r.day > 1) r.ending = 'home-next-day';
    // A good bus ride from Sector V takes about 190 game minutes (task 020, src/sim/ride.test.ts).
    else if (r.elapsed < 150) r.ending = 'home-early';
    else if (r.elapsed < 210) r.ending = 'home';
    else r.ending = 'home-late';
    saveRecord(r);
    this.finish();
  }

  fail(ending: EndingId) {
    this.run.ending = ending;
    this.finish();
  }

  private finish() {
    if (this.run.photo || !this.current?.scene) { this.go('result'); return; }
    this.run.photoRequest = { drama: 0, burst: 'EXCLUSIVE' };
    this.resultPending = true;
  }
}

export const game = new Game();
