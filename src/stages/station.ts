// Sector V metro, played in real time: squeeze through a gate that works, walk left on the escalator,
// shove through the platform crowd and get in before the doors shut. Then the ride: don't miss Sealdah.

import * as THREE from 'three';
import type { Scene } from '../app/game';
import { game } from '../app/game';
import { bake, box, C, rand, resize, Shake, sign } from '../render/gfx';
import { person } from '../render/models';
import { sceneLayer, el, hint, toast, notify, shakeUi, setDateline } from '../ui/ui';
import { input, enableStick, pressButton } from '../input/input';
import { sfx } from '../audio/audio';
import { Body } from './player';
import { greenLine, pick, ticker } from '../content/text';
import { METRO_OUT_X } from '../content/route';

const GATE_X = 12;
const ESC: [number, number] = [22, 34];
const PLAT: [number, number] = [36, 96];
const EDGE_Z = -3.6; // platform edge; the train is beyond it
const DOORS = [44, 52, 60, 68, 76, 84];

interface Npc { obj: THREE.Group; vx: number; vz: number; home: THREE.Vector3; boarding: boolean }

export function station(): Scene {
  const run = game.run;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d2a33);
  scene.fog = new THREE.Fog(0x1d2a33, 40, 90);
  scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x334455, 2.3));
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  const shake = new Shake();
  const body = new Body();
  let layer: HTMLElement;
  let phase: 'walk' | 'ride' | 'done' = 'walk';
  let paid = false;
  let trainT = 4; // first train arrives a few seconds after you reach the platform
  let trainState: 'away' | 'arriving' | 'open' | 'leaving' = 'away';
  let doorT = 0;
  let onPlatform = false;
  let shoveT = 0;
  const npcs: Npc[] = [];

  // Concourse, gates, escalator, platform.
  scene.add(box(110, 0.1, 14, 0xcfc8bd, 45, -0.1, 0));
  scene.add(box(110, 6, 0.3, 0xa9b3bb, 45, 0, 7.5));
  // Ceiling lights instead of a ceiling, so the camera can sit above the crowd.
  for (let x = 0; x < 100; x += 6) scene.add(box(3, 0.1, 0.4, 0xfff6d5, x, 6.5, 0));
  const gateOpen: boolean[] = [];
  for (let i = 0; i < 6; i++) {
    const z = -5 + i * 2;
    scene.add(box(0.8, 1.1, 0.6, 0xb0b8c0, GATE_X, 0, z - 0.7));
    const ok = Math.random() > 0.35;
    gateOpen.push(ok);
    scene.add(box(0.1, 0.12, 0.6, ok ? 0x34c759 : 0xff3b30, GATE_X, 1.12, z - 0.7));
    if (!ok) scene.add(box(0.15, 0.9, 1.3, 0xff3b30, GATE_X, 0, z + 0.3));
  }
  scene.add(box(0.8, 1.1, 0.6, 0xb0b8c0, GATE_X, 0, 6.3));
  const tg = sign('TOKEN · AUTO-DEBIT ₹20 · টোকেন', 6, 0.8, '#2e9e5b');
  tg.position.set(GATE_X - 0.5, 3.4, 0);
  tg.rotation.y = -Math.PI / 2;
  scene.add(tg);
  // Escalator: two lanes. Right lane full of people standing; left lane free to walk.
  scene.add(box(ESC[1] - ESC[0], 0.15, 4.4, 0x3a3a3a, (ESC[0] + ESC[1]) / 2, 0, 0.5));
  const sr = sign('STAND RIGHT · WALK LEFT', 6, 0.8, '#f5c518', '#111');
  sr.position.set(ESC[0] - 0.6, 3, 0.5);
  sr.rotation.y = -Math.PI / 2;
  scene.add(sr);
  scene.add(box(PLAT[1] - PLAT[0], 0.06, 0.4, 0xf5c518, (PLAT[0] + PLAT[1]) / 2, 0, EDGE_Z + 0.3));
  scene.add(box(PLAT[1] - PLAT[0] + 20, 0.3, 4, 0x333333, (PLAT[0] + PLAT[1]) / 2, -1.2, EDGE_Z - 2.2));
  for (const d of DOORS) scene.add(box(1.6, 0.05, 0.6, C.metro, d, 0, EDGE_Z + 0.9));
  const ps = sign('GREEN LINE · সবুজ লাইন · TOWARDS SEALDAH →', 14, 1.2, '#1f5f9a');
  ps.position.set(64, 4.2, 6.6);
  ps.rotation.y = Math.PI;
  scene.add(ps);

  bake(scene); // static station geometry in one draw call

  // People: some queue at the gates, some stand on the escalator's right, the platform is packed.
  const crowdN = Math.round(18 + run.crowd * 26);
  function npcAt(x: number, z: number) {
    const o = person();
    o.position.set(x, 0, z);
    o.rotation.y = rand(-2, 2);
    scene.add(o);
    npcs.push({ obj: o, vx: 0, vz: 0, home: o.position.clone(), boarding: false });
  }
  for (let i = 0; i < crowdN; i++) npcAt(rand(PLAT[0] + 2, PLAT[1] - 2), rand(EDGE_Z + 0.8, 3.5));
  for (let x = ESC[0] + 1; x < ESC[1]; x += 1.4) npcAt(x, 1.8 + rand(-0.2, 0.2));
  for (let i = 0; i < 6; i++) npcAt(rand(3, GATE_X - 2), rand(-4, 4));

  // The train.
  const train = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    c.add(box(8.6, 3, 2.8, 0xdcdcdc, 0, 0, 0), box(8.62, 0.5, 2.82, C.metro, 0, 0.6, 0), box(8.62, 0.8, 2.82, 0x2a3440, 0, 1.6, 0));
    c.position.x = i * 8.8;
    train.add(c);
  }
  const TRAIN_STOP = DOORS[0] - 4.4;
  train.position.set(-80, 0.1, EDGE_Z - 1.9);
  scene.add(train);

  body.pos.set(1, 0, 0);
  scene.add(body.obj);

  function walkUpdate(dt: number) {
    // Gates: solid unless you pick a green one.
    const prevX = body.pos.x;
    body.update(dt, -5.6, 6.2);
    if (prevX < GATE_X && body.pos.x >= GATE_X - 0.3) {
      const lane = Math.round((body.pos.z + 5 - 0.3) / 2);
      const ok = lane >= 0 && lane < 6 && gateOpen[lane] && Math.abs(body.pos.z - (-5 + lane * 2 + 0.3)) < 0.75;
      if (!ok) {
        body.pos.x = GATE_X - 0.35;
        body.vel.x = 0;
        if (Math.random() < 0.05) toast('GATE BONDHO', 'Red gate. Try a green one, dada.');
      } else if (!paid) {
        paid = true;
        run.spend(20);
        sfx.coin();
        notify('₹20 token', 'The gate beeped at you. Twice.', 'metro');
      }
    }
    if (body.pos.x > GATE_X + 0.5 && body.pos.x < GATE_X + 1 && !paid) { paid = true; run.spend(20); }
    // Escalator carries you; the right side is blocked by people standing.
    if (body.pos.x > ESC[0] && body.pos.x < ESC[1]) {
      body.pos.x += 3 * dt;
    }
    if (!onPlatform && body.pos.x > PLAT[0]) {
      onPlatform = true;
      hint('Get to a door before it shuts! Shove through the crowd.');
      notify('"Holud line-er pechhone thakun."', 'Stay behind the yellow line.', 'metro');
      setTimeout(() => notify(pick(ticker.metro), '', 'news'), 2000);
    }
    // Shoving: people block you and slow you down.
    let shoving = false;
    for (const n of npcs) {
      if (n.boarding) continue;
      const dx = n.obj.position.x - body.pos.x;
      const dz = n.obj.position.z - body.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.75 && d > 0.001) {
        const push = (0.75 - d) / d;
        // You move people a little; they move you more when it's packed.
        n.obj.position.x += dx * push * 0.4;
        n.obj.position.z += dz * push * 0.4;
        body.pos.x -= dx * push * (0.3 + run.crowd * 0.4);
        body.pos.z -= dz * push * (0.3 + run.crowd * 0.4);
        shoving = true;
      }
    }
    if (shoving) {
      shoveT += dt;
      if (shoveT > 0.6) {
        shoveT = 0;
        sfx.bump();
        if (Math.random() < 0.25) toast('DHAKKA!', pick(['"Dada, thik kore daran!"', '"Bag-ta shorie nin!"', '"Line-e daran!"', 'Someone\'s elbow is in your ear.']));
        run.stats.squeezes++;
      }
    }
    body.pos.z = Math.max(onPlatform ? EDGE_Z : -5.6, body.pos.z);

    // Train cycle.
    if (onPlatform) {
      if (trainState === 'away') {
        trainT -= dt;
        if (trainT <= 0) { trainState = 'arriving'; train.position.x = -80; hint('📢 Train aschhe!'); }
      } else if (trainState === 'arriving') {
        const d = TRAIN_STOP - train.position.x;
        train.position.x += Math.max(0.5, Math.min(30, d * 1.5)) * dt;
        if (d < 0.05) {
          trainState = 'open';
          doorT = 6;
          sfx.chime();
          hint('Doors open! Get in!');
          for (const n of npcs) if (n.obj.position.x > PLAT[0] && Math.random() < 0.6) n.boarding = true;
        }
      } else if (trainState === 'open') {
        doorT -= dt;
        if (doorT < 2 && doorT + dt >= 2) { sfx.doorBeep(); hint('Darja bondho hochhe! Doors closing!'); }
        // Boarding: be at a door, at the edge.
        const atDoor = DOORS.some((d) => Math.abs(d - body.pos.x) < 1.1) && body.pos.z < EDGE_Z + 0.9;
        if (atDoor) { board(); return; }
        if (doorT <= 0) {
          trainState = 'leaving';
          run.stats.missedTrains++;
          sfx.bad();
          toast('TRAIN CHHERE DILO', 'Doors closed on your hopes. Next one soon.');
        }
      } else {
        train.position.x += 18 * dt;
        if (train.position.x > 140) { trainState = 'away'; trainT = 6; }
      }
    }
    // Crowd behaviour: drift home, or rush the doors.
    for (const n of npcs) {
      if (n.boarding && trainState === 'open') {
        const door = DOORS.reduce((a, b) => (Math.abs(b - n.obj.position.x) < Math.abs(a - n.obj.position.x) ? b : a));
        const t = new THREE.Vector3(door, 0, EDGE_Z - 0.5);
        const v = t.sub(n.obj.position);
        if (v.length() < 0.6) { n.obj.visible = false; continue; }
        n.obj.position.add(v.normalize().multiplyScalar(dt * 4));
      } else if (n.obj.visible) {
        n.obj.position.lerp(n.home, dt * 0.3);
      }
    }
  }

  // --- The ride ---
  let leg = 0;
  let legT = 2;
  let drowsy = 0;
  let exitT = 0;
  let seated = false;
  let tapBtn: HTMLButtonElement | null = null;
  let meter: HTMLElement | null = null;

  function board() {
    phase = 'ride';
    sfx.whoosh();
    if (run.crowd > 0.8) run.requestPhoto(2.5, 'GHUSHE GECHHI!');
    toast('IN!', run.crowd > 0.8 ? 'Someone\'s bag, someone\'s elbow, all on you.' : 'You\'re in. Breathe.');
    enableStick(false);
    layer.querySelectorAll('.jump-btn').forEach((b) => b.remove());
    setDateline('GREEN LINE · TOWARDS SEALDAH');
    // Later in the evening there's a chance of a seat. Seats make you sleepy.
    seated = Math.random() < (run.crowd < 0.7 ? 0.7 : 0.25);
    run.stats.seatFound = seated;
    body.obj.visible = false;
    meter = el('div', 'meter', seated ? '<span>DROWSY</span><i><b></b></i>' : '<span>SQUEEZE</span><i><b></b></i>');
    tapBtn = el('button', 'act-btn big', seated ? 'STAY AWAKE' : 'HOLD ON');
    pressButton(tapBtn, 'action');
    layer.append(meter, tapBtn);
    hint(seated ? 'A seat! Tap to stay awake. Don\'t miss Sealdah.' : 'Standing. Tap when the train brakes.');
    notify(`Agla station: ${greenLine[1]}`, 'Next station · porer station', 'metro');
  }

  function rideUpdate(dt: number) {
    train.position.x += 30 * dt;
    if (train.position.x > 160) train.position.x = -60;
    legT -= dt;
    const bar = meter?.querySelector<HTMLElement>('b');
    if (exitT > 0) {
      exitT -= dt;
      if (input.action || input.tap) { arrive(); return; }
      if (exitT <= 0) {
        phase = 'done';
        toast('DARJA BONDHO', 'Doors closed. Next stop: Esplanade… Howrah Maidan…');
        run.requestPhoto(5, 'GHUMIYE PORLAM!');
        setTimeout(() => game.fail('howrah-express'), 1600);
      }
      return;
    }
    if (legT <= 0) {
      leg++;
      legT = 2;
      sfx.chime();
      setDateline(`GREEN LINE · ${greenLine[leg].toUpperCase()}`);
      if (leg === greenLine.length - 1) {
        notify('SEALDAH!', '"Sealdah. Darja dan dike khulbe." Get off NOW!', 'metro');
        hint('SEALDAH! Tap to get off!');
        if (tapBtn) tapBtn.textContent = 'UTRO! GET OFF';
        exitT = 2.4;
        return;
      }
      notify(`Agla station: ${greenLine[leg + 1]}`, '', 'metro');
      if (!seated) {
        shake.kick(0.3, 0.3);
        shakeUi();
        sfx.bump();
        if (!input.action) { run.hurtDignity(3); toast('BRAKES!', pick(['You are now in someone\'s armpit.', 'Your face is on the door glass.', 'Umbrella in your ribs.'])); }
      }
    }
    if (seated) {
      drowsy += dt * (0.12 + Math.max(0, run.minute - 20 * 60) / 500);
      if (input.action || input.tap) { drowsy = Math.max(0, drowsy - 0.2); sfx.tap(); }
      if (bar) bar.style.width = `${Math.min(100, drowsy * 100)}%`;
      if (drowsy >= 1) {
        phase = 'done';
        toast('GHUMIYE PORLAM', 'Eyes closed for one second. It was a long second.');
        run.requestPhoto(5, 'GHUMIYE PORLAM!');
        setTimeout(() => game.fail('howrah-express'), 1800);
      }
    } else if (bar) bar.style.width = `${(1 - legT / 2) * 100}%`;
  }

  function arrive() {
    phase = 'done';
    sfx.win();
    toast('SEALDAH!', 'Out of the coach. Barely.');
    run.spawnX = METRO_OUT_X;
    setTimeout(() => game.go('city'), 1000);
  }

  return {
    scene, camera,
    enter() {
      resize(camera, 55, 75);
      game.debug = { body };
      layer = sceneLayer();
      run.clockRunning = true;
      setDateline(run.spawnX > 20 ? 'CENTRAL PARK METRO' : 'SECTOR V METRO');
      enableStick(true);
      const jump = el('button', 'jump-btn', 'JUMP');
      pressButton(jump, 'jump');
      layer.appendChild(jump);
      hint('Find a green gate. Walk left on the escalator.');
    },
    update(dt) {
      if (phase === 'walk') walkUpdate(dt);
      else if (phase === 'ride') rideUpdate(dt);
      const p = body.pos;
      if (phase === 'walk') {
        const portrait = innerHeight > innerWidth;
        camera.position.lerp(new THREE.Vector3(p.x - (portrait ? 8 : 7), portrait ? 6 : 5, p.z * 0.5 + 2), Math.min(1, dt * 5));
        camera.lookAt(p.x + 6, 1, p.z * 0.5 - 0.5);
      } else {
        // Ride: alongside the moving train, from the platform side.
        camera.position.set(train.position.x + 18, 3.2, 3);
        camera.lookAt(train.position.x + 24, 1.5, EDGE_Z - 2);
      }
      shake.apply(camera, dt);
    },
    exit() {
      enableStick(false);
      layer.remove();
      hint('');
    },
  };
}
