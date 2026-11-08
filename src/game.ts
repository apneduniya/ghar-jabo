// Scene switching and the shared run. Scenes import `game` to move between each other.

import type * as THREE from 'three';
import { Run, type ArriveMode, type EndingId } from './state';

export interface Scene {
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  enter(): void;
  update(dt: number): void;
  exit(): void;
}

type SceneName = 'lobby' | 'sectorv' | 'city' | 'station' | 'result';

class Game {
  run = new Run();
  current: Scene | null = null;
  private factories = new Map<SceneName, () => Scene>();
  /** Slow motion: 1 is normal speed. Used for falls and fail beats. */
  timeScale = 1;
  /** Freeze frames left (hit-stop). */
  hitStop = 0;
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

  newRun() {
    this.run = new Run();
    this.go('sectorv');
  }

  /** Arrived at Sealdah by some mode. */
  arrive(mode: ArriveMode) {
    const r = this.run;
    r.homeMode = mode;
    if (mode === 'walk' && r.stats.busHops === 0 && !r.stats.modesTried.length) r.ending = 'walked-home';
    else if (mode === 'rapinah') r.ending = 'rapinah-miracle';
    else if (r.minute < 20 * 60) r.ending = 'home-early';
    else if (r.minute < 21 * 60 + 30) r.ending = 'home';
    else r.ending = 'home-late';
    this.go('result');
  }

  fail(ending: EndingId) {
    this.run.ending = ending;
    this.go('result');
  }
}

export const game = new Game();
