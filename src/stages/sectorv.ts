// The real Sector V map in play. The sim (src/sim/world.ts) owns every rule; this stage builds the 3D view,
// turns the stick into a world-space intent using the camera, steps the sim at 60 Hz and shows its events.

import * as THREE from 'three';
import type { Scene } from '../app/game';
import { game } from '../app/game';
import { C, resize, Shake, sign } from '../render/gfx';
import { playerPerson } from '../render/models';
import { Actors } from '../render/actors';
import { buildCityMap, map } from '../render/world/citymap';
import { buildProps } from '../render/world/props';
import { Minimap } from '../ui/minimap';
import { sceneLayer, el, hint, notify, setDateline, showHud, toast, shakeUi } from '../ui/ui';
import { input, enableStick, pressButton } from '../input/input';
import { sfx } from '../audio/audio';
import { T } from '../content/tuning';
import { pick, ticker } from '../content/text';
import { rng } from '../sim/rng';
import { World } from '../sim/world';
import type { Intent } from '../sim/player';
import type { GameEvent } from '../sim/events';

/** Where to start: on the footpath of Street No. 2, outside the college gate (next to TIU). */
function gateSpot(world: World) {
  const tiu = map.pois.tiu;
  let best = { x: tiu[0], z: tiu[1], d: Infinity, dx: 1, dz: 0, w: 7 };
  for (const r of map.roads) {
    if (!['secondary', 'tertiary', 'primary'].includes(r.k) || r.b) continue;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((tiu[0] - ax) * dx + (tiu[1] - az) * dz) / L2));
      const x = ax + dx * t, z = az + dz * t, d = Math.hypot(x - tiu[0], z - tiu[1]);
      if (d < best.d) best = { x, z, d, dx: dx / Math.sqrt(L2), dz: dz / Math.sqrt(L2), w: r.w };
    }
  }
  const nx = (tiu[0] - best.x) / (best.d || 1), nz = (tiu[1] - best.z) / (best.d || 1);
  const spot = world.freeSpotNear(best.x + nx * (best.w / 2 + 1.2), best.z + nz * (best.w / 2 + 1.2));
  return { ...spot, road: best, nx, nz };
}

function buildGate(scene: THREE.Scene, x: number, z: number, along: { dx: number; dz: number }, nx: number, nz: number) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xb04a3a });
  for (const s of [-3.2, 3.2]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.4, 0.8), mat);
    m.position.set(x + along.dx * s, 2.2, z + along.dz * s);
    scene.add(m);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.8, 0.8), mat);
  beam.position.set(x, 4.6, z);
  beam.rotation.y = -Math.atan2(along.dz, along.dx);
  scene.add(beam);
  const board = sign('COLLEGE GATE', 6.4, 0.7, '#f3e9d2', '#7a2a1f');
  board.position.set(x - nx * 0.45, 4.6, z - nz * 0.45);
  board.rotation.y = Math.atan2(-nx, -nz);
  scene.add(board);
}

export function sectorv(): Scene {
  const run = game.run;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.sky);
  scene.fog = new THREE.Fog(C.sky, 90, 260);
  scene.add(new THREE.HemisphereLight(0xffe2c4, 0x40304a, 1.7));
  const sun = new THREE.DirectionalLight(0xffc48a, 1.3);
  sun.position.set(-60, 90, 40);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 600);
  const shake = new Shake();
  const built = buildCityMap();
  scene.add(built.group);
  const actors = new Actors(scene);

  // The sim, starting at the college gate.
  const world = new World(map, run, rng, { x: map.pois.tiu[0], z: map.pois.tiu[1] });
  const gate = gateSpot(world);
  world.player.x = gate.x;
  world.player.z = gate.z;
  buildProps(scene, map, world.grid, world.metroEntrance);
  buildGate(scene, gate.road.x + gate.nx * (gate.road.w / 2 + 2.8), gate.road.z + gate.nz * (gate.road.w / 2 + 2.8), gate.road, gate.nx, gate.nz);

  const playerObj = playerPerson();
  scene.add(playerObj);

  // Landmark boards.
  const pwh = sign('PWH TOWER', 10, 1.4, '#22324a');
  pwh.position.set(map.pois.pwc[0], 14, map.pois.pwc[1]);
  scene.add(pwh);
  const seenStops = new Set<string>();
  for (const s of map.stops) {
    if (seenStops.has(s.n)) continue;
    seenStops.add(s.n);
    const b = sign(`${s.n.toUpperCase()} · BUS`, 5, 0.7, '#f5c518', '#1b1b1b');
    b.position.set(s.p[0], 3, s.p[1]);
    scene.add(b);
  }
  const ms = sign('SALT LAKE SECTOR V · METRO', 12, 1.4, '#2e9e5b');
  ms.position.set(built.stationPos.x, 17, built.stationPos.z);
  ms.rotation.y = built.stationDir;
  scene.add(ms);
  const ent = sign('🚇 METRO ↓', 3.6, 0.8, '#2e9e5b');
  ent.position.set(world.metroEntrance.x, 3.8, world.metroEntrance.z);
  scene.add(ent);

  let layer: HTMLElement;
  let actionBtn: HTMLButtonElement;
  const minimap = new Minimap(map);
  const exit = map.busPath[map.busPath.length - 1];
  let phoneBtn: HTMLButtonElement;
  let balanceUi: HTMLElement | null = null;
  let yaw = Math.atan2(-gate.z, -gate.x); // face the junction
  let acc = 0;
  let lastPlace = '';
  let leaving = false;
  const pending = { jump: false, action: false, phone: false };

  function intentFromInput(): Intent {
    const fx = Math.cos(yaw), fz = Math.sin(yaw);
    return {
      moveX: fx * input.mx - fz * input.mz,
      moveZ: fz * input.mx + fx * input.mz,
      jump: input.jump,
      action: input.action,
      phone: input.phone,
      // Hanging off the left door, the open side is screen-left: pushing right leans you back in.
      lean: input.mz,
    };
  }

  function handle(e: GameEvent) {
    switch (e.type) {
      case 'toast': toast(e.title, e.line); break;
      case 'notify': notify(e.title, e.body, e.tone); break;
      case 'sfx': sfx[e.name](); break;
      case 'shake': shake.kick(e.amp, e.secs); if (e.amp > 0.5) shakeUi(); break;
      case 'hitstop': game.hitStop = Math.max(game.hitStop, e.secs); break;
      case 'slowmo': game.timeScale = e.scale; setTimeout(() => { game.timeScale = 1; }, e.secs * 1000); break;
      case 'photo': run.requestPhoto(e.drama, e.burst); break;
      case 'end': game.fail(e.ending); break;
      case 'stage':
        leaving = true;
        if (e.to === 'station') game.go('station');
        else { run.rideMode = e.mode ?? 'bus'; run.spawnX = 260; game.go('city'); }
        break;
    }
  }

  function placeName(x: number, z: number) {
    let best = 'PWH MORE', bd = 60;
    for (const s of map.stops) { const d = Math.hypot(s.p[0] - x, s.p[1] - z); if (d < bd) { bd = d; best = s.n.toUpperCase(); } }
    return best;
  }

  return {
    scene, camera,
    enter() {
      resize(camera, 55, 72);
      game.debug = { world, map };
      layer = sceneLayer();
      showHud(true);
      run.clockRunning = true;
      enableStick(true);
      actionBtn = el('button', 'act-btn', '');
      actionBtn.hidden = true;
      pressButton(actionBtn, 'action');
      const jump = el('button', 'jump-btn', 'JUMP');
      pressButton(jump, 'jump');
      phoneBtn = el('button', 'phone-btn', '');
      pressButton(phoneBtn, 'phone');
      layer.append(actionBtn, jump, phoneBtn, minimap.el);
      notify(pick(ticker.start), '', 'news');
      hint('College gate, Street No. 2. Hop a bus, book a bike, or find the metro.');
      setTimeout(() => hint(''), 6000);
    },
    update(dt) {
      // Fixed 60 Hz simulation. Taps are latched until a step consumes them: a frame can run zero steps.
      acc += dt;
      const now = intentFromInput();
      pending.jump ||= now.jump; pending.action ||= now.action; pending.phone ||= now.phone;
      while (acc >= T.step && !leaving) {
        acc -= T.step;
        world.step({ ...now, ...pending });
        pending.jump = pending.action = pending.phone = false;
        for (const e of world.events.drain()) handle(e);
      }
      if (leaving) return;

      const p = world.player;
      const ride = world.riding;
      actors.sync(world.traffic.vehicles, world.captainId, world.captain?.captain?.name ?? '');

      // Player model.
      playerObj.position.set(p.x, p.state === 'hang' ? 0.6 : p.state === 'pillion' ? 0.55 : p.y, p.z);
      playerObj.rotation.set(p.state === 'hang' ? -p.lean * 0.6 : 0, -p.heading + Math.PI / 2, p.down ? Math.PI / 2 : 0);
      playerObj.scale.setScalar(p.state === 'pillion' ? 0.9 : 1);

      // UI: context button, phone, balance bar.
      const a = world.action();
      const label = p.state === 'hang' ? 'HOP OFF' : a?.kind === 'hop' ? 'HOP ON 🚌' : a?.kind === 'bike' ? 'SIT ON BIKE 🛵' : '';
      actionBtn.hidden = !label;
      if (label && actionBtn.textContent !== label) actionBtn.textContent = label;
      const busy = world.booking || world.captainId || p.state !== 'foot';
      phoneBtn.innerHTML = busy ? '📱 <small>…</small>' : `📱 Rapi-Nah <small>₹${world.fare()}</small>`;
      phoneBtn.classList.toggle('busy', !!busy);
      if (p.state === 'hang' && !balanceUi) {
        balanceUi = el('div', 'balance', '<i><b></b></i>');
        layer.appendChild(balanceUi);
        hint('Hanging on! ← → to balance. Jump to hop off.');
      } else if (p.state !== 'hang' && balanceUi) { balanceUi.remove(); balanceUi = null; hint(''); }
      const bar = balanceUi?.querySelector<HTMLElement>('b');
      if (bar) { bar.style.left = `${50 - p.lean * 45}%`; bar.classList.toggle('danger', Math.abs(p.lean) > 0.7); }

      // Camera: behind the direction of travel; while riding, behind the vehicle.
      const sp = Math.hypot(p.vx, p.vz);
      const targetYaw = ride ? ride.heading : sp > 1.5 && input.mx > -0.5 ? Math.atan2(p.vz, p.vx) : yaw;
      let d = targetYaw - yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += d * Math.min(1, dt * (ride ? 3 : 1.8));
      const fx = Math.cos(yaw), fz = Math.sin(yaw);
      const portrait = innerHeight > innerWidth;
      const back = (portrait ? 11 : 9.5) * (ride?.kind === 'bus' ? 1.4 : 1);
      let dist = back;
      for (let k = 1.5; k <= back; k += 0.75) if (world.grid.blocked(p.x - fx * k, p.z - fz * k, 0.6)) { dist = Math.max(2.5, k - 0.75); break; }
      const want = new THREE.Vector3(p.x - fx * dist, (portrait ? 8 : 6.5) * (0.6 + 0.4 * dist / back), p.z - fz * dist);
      camera.position.lerp(want, Math.min(1, dt * 6));
      camera.lookAt(p.x + fx * 6, 1.2, p.z + fz * 6);
      shake.apply(camera, dt);
      actors.billboard(camera);
      minimap.draw({ x: p.x, z: p.z, yaw, vehicles: world.traffic.vehicles, captainId: world.captainId, metro: world.metroEntrance, exit: { x: exit[0], z: exit[1] } }, performance.now());

      const place = placeName(p.x, p.z);
      if (place !== lastPlace) { lastPlace = place; setDateline(place); }
    },
    exit() {
      enableStick(false);
      layer.remove();
      hint('');
    },
  };
}
