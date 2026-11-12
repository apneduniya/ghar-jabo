// The Sector V metro, played in real time (task 033). The sim (src/sim/station.ts) owns every rule; this stage
// draws it (src/render/station.ts), turns the fixed stick and the swipe-to-look camera into a world-space intent
// like the street does, steps the sim at 60 Hz and shows its events.

import * as THREE from 'three';
import type { Scene } from '../app/game';
import { game } from '../app/game';
import { resize, Shake } from '../render/gfx';
import { StationView } from '../render/station';
import { sceneLayer, el, hint, toast, notify, shakeUi, setDateline } from '../ui/ui';
import { input, enableStick, pressButton } from '../input/input';
import { Look } from '../input/look';
import { sfx } from '../audio/audio';
import { voice } from '../audio/voice';
import { stickToWorld, type Intent } from '../sim/player';
import { StationSim } from '../sim/station';
import { rng } from '../sim/rng';
import { CONTROLS, STATION, T } from '../content/tuning';
import { greenLine, stationText as X } from '../content/text';
import type { GameEvent } from '../sim/events';

const S = STATION;
const clamp = (v: number, [a, b]: [number, number]) => Math.max(a, Math.min(b, v));

export function station(): Scene {
  const run = game.run;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d2a33);
  scene.fog = new THREE.Fog(0x1d2a33, 40, 90);
  scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x334455, 2.3));
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  const shake = new Shake();
  const sim = new StationSim(run, rng);
  const view = new StationView(scene, sim);
  // The camera's look (task 027): it turns only when the player drags on the right half; it opens looking up
  // the station (+x) towards the gates.
  const look = new Look();
  look.set(0, -0.15);
  let layer: HTMLElement;
  let acc = 0;
  let leaving = false;
  let riding = false;
  let tapBtn: HTMLButtonElement | null = null;
  let bar: HTMLElement | null = null;
  const pending = { jump: false, action: false };
  const pivot = new THREE.Vector3(sim.player.x, 0, sim.player.z);

  function intentFromInput(): Intent {
    const [mx, mz] = stickToWorld(input.mx, input.mz, look.yaw);
    // On the train any tap counts (the big button, or anywhere on the screen).
    const action = input.action || (riding && input.tap);
    return { moveX: mx, moveZ: mz, jump: input.jump, action, phone: false, lean: 0 };
  }

  function handle(e: GameEvent) {
    switch (e.type) {
      case 'toast': toast(e.title, e.line); break;
      case 'notify': notify(e.title, e.body, e.tone); break;
      case 'sfx': sfx[e.name](); break;
      case 'voice': voice(e.id); break;
      case 'shake': shake.kick(e.amp, e.secs); shakeUi(); break;
      case 'hint': hint(e.text); if (e.text === X.sealdah.hint && tapBtn) tapBtn.textContent = X.buttons.off; break;
      case 'photo': run.requestPhoto(e.drama, e.burst); break;
      case 'end': leaving = true; game.fail(e.ending); break;
      case 'arrive': leaving = true; game.arrive(e.mode); break;
      default: break;
    }
  }

  /** Boarded: swap the stick and jump for the ride's meter and its one big button. */
  function startRide() {
    riding = true;
    const ride = sim.ride!;
    enableStick(false);
    layer.querySelectorAll('.jump-btn').forEach((b) => b.remove());
    setDateline(X.towards);
    const meter = el('div', 'meter', `<span>${ride.seated ? X.buttons.drowsy : X.buttons.squeeze}</span><i><b></b></i>`);
    tapBtn = el('button', 'act-btn big', ride.seated ? X.buttons.awake : X.buttons.hold);
    pressButton(tapBtn, 'action');
    layer.append(meter, tapBtn);
    bar = meter.querySelector('b');
  }

  let lastLeg = -1;
  function rideUi() {
    const ride = sim.ride!;
    if (ride.leg !== lastLeg) {
      // The first leg keeps "towards Sealdah"; after that, the station the train is at.
      if (lastLeg >= 0) setDateline(`GREEN LINE · ${greenLine[ride.leg].toUpperCase()}`);
      lastLeg = ride.leg;
    }
    if (bar) bar.style.width = `${Math.min(100, (ride.seated ? ride.drowsy : 1 - ride.legT / S.ride.legSecs) * 100)}%`;
  }

  function placeCamera(dt: number) {
    if (riding) {
      // Alongside the moving train, from the platform side.
      camera.position.set(sim.train.x + 18, 3.2, 3);
      camera.lookAt(sim.train.x + 24, 1.5, S.edgeZ - 2);
      return;
    }
    // Same orbit as the street (stages/sectorv.ts): yaw and pitch from the look, the pivot easing after the
    // player; kept inside the station box so the camera never ends up behind a wall.
    const p = sim.player, yaw = look.yaw, fx = Math.cos(yaw), fz = Math.sin(yaw);
    const portrait = innerHeight > innerWidth, c = S.cam;
    const back = portrait ? c.back[0] : c.back[1], high = (portrait ? c.high[0] : c.high[1]) - CONTROLS.camPivot;
    const elev = Math.max(0.08, Math.min(1.25, Math.atan2(high, back) - look.pitch));
    const reach = Math.hypot(high, back), flat = Math.cos(elev) * reach;
    pivot.x += (p.x - pivot.x) * Math.min(1, dt * 10);
    pivot.z += (p.z - pivot.z) * Math.min(1, dt * 10);
    const cx = clamp(pivot.x - fx * flat, c.x), cz = clamp(pivot.z - fz * flat, c.z);
    const cy = Math.min(c.yMax, CONTROLS.camPivot + Math.sin(elev) * reach);
    camera.position.set(cx, cy, cz);
    const ahead = 6 * (1 - 0.65 * Math.min(0, look.pitch) / CONTROLS.pitchRange[0]);
    camera.lookAt(pivot.x + fx * ahead, 1.2 + Math.max(0, look.pitch) * CONTROLS.camLift * 0.4, pivot.z + fz * ahead);
  }

  return {
    scene, camera,
    enter() {
      resize(camera, 55, 75);
      game.debug = {
        sim, view, yaw: () => look.yaw, look: (v: number, pitch = 0) => look.set(v, pitch),
        teleport: (x: number, z: number) => { sim.player.x = x; sim.player.z = z; pivot.set(x, 0, z); },
      };
      layer = sceneLayer();
      run.clockRunning = true;
      setDateline(`${(run.metroFrom ?? 'Sector V').toUpperCase()} METRO`);
      enableStick(true);
      const jump = el('button', 'jump-btn', X.buttons.jump);
      pressButton(jump, 'jump');
      layer.appendChild(jump);
      hint(X.start);
    },
    update(dt) {
      look.turn(input.lookYaw + input.turn * CONTROLS.keyTurn * dt, input.lookPitch);
      look.step(dt);
      const now = intentFromInput();
      pending.jump ||= now.jump; pending.action ||= now.action;
      acc += dt;
      while (acc >= T.step && !leaving) {
        acc -= T.step;
        sim.step({ ...now, ...pending });
        pending.jump = pending.action = false;
        for (const e of sim.events.drain()) handle(e);
        if (sim.phase === 'ride' && !riding) startRide();
      }
      if (riding && sim.ride) rideUi();
      view.sync(sim, dt, performance.now());
      placeCamera(dt);
      shake.apply(camera, dt);
    },
    exit() {
      enableStick(false);
      layer.remove();
      hint('');
    },
  };
}
