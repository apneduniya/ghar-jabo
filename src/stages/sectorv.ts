// The real Sector V map in play. The sim (src/sim/world.ts) owns every rule; this stage builds the 3D view,
// turns the stick into a world-space intent using the camera, steps the sim at 60 Hz and shows its events.

import * as THREE from 'three';
import type { Scene } from '../app/game';
import { game } from '../app/game';
import { bake, batchSigns, resize, Shake, sign } from '../render/gfx';
import { clearGlow, Sky } from '../render/sky';
import { playerPerson } from '../render/models';
import { Actors } from '../render/actors';
import { buildCityMap, map } from '../render/world/citymap';
import { buildProps } from '../render/world/props';
import { Walkers } from '../render/world/walkers';
import { fixtureSource, StreamedWorld } from '../render/world/streamed';
import type { ChunkSource } from '../sim/gen/types';
import { Minimap } from '../ui/minimap';
import { showTitle } from '../ui/title';
import { unlockAudio } from '../audio/audio';
import { NO_INTENT, roadAssist, stickToWorld } from '../sim/player';
import { clearance, nearestRoad } from '../sim/streetlife';
import { roofs } from '../sim/elevated';
import { sceneLayer, el, hint, notify, setDateline, showHud, toast, shakeUi } from '../ui/ui';
import { input, enableStick, pressButton } from '../input/input';
import { Look } from '../input/look';
import { sfx } from '../audio/audio';
import { Ambience } from '../audio/ambience';
import { floods } from '../content/sectorv';
import { CONTROLS, T } from '../content/tuning';
import { STREAM } from '../content/worldgen';
import { pick, ticker } from '../content/text';
import { rng } from '../sim/rng';
import { World } from '../sim/world';
import { assets } from '../app/assets';
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
  const spot = world.freeSpotNear(best.x + nx * (best.w / 2 + 0.8), best.z + nz * (best.w / 2 + 0.8));
  return { ...spot, road: best, nx, nz };
}

/** A vertical sky gradient as the scene background (cheaper than a sky dome). */
const AREA_NAMES: Record<string, string> = {
  sectorv: 'SALT LAKE SECTOR V', saltlake: 'SALT LAKE', bypass: 'EM BYPASS', chingrighata: 'CHINGRIGHATA',
  ultadanga: 'ULTADANGA', kankurgachi: 'KANKURGACHI', phoolbagan: 'PHOOLBAGAN', beliaghata: 'BELIAGHATA',
  narkeldanga: 'NARKELDANGA', maniktala: 'MANIKTALA', sealdah: 'SEALDAH', generic: 'KOLKATA',
};

export function sectorv(): Scene {
  const run = game.run;
  const scene = new THREE.Scene();
  // Golden dusk at 6:30 PM, night by 7:45, and on through the night in free roam (render/sky.ts).
  clearGlow();
  const sky = new Sky(scene);
  sky.update(run.minute);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 600);
  const shake = new Shake();
  const built = buildCityMap();
  // Everything that belongs to the real map, so it can be hidden as a whole far out in the streamed world.
  const sectorGroup = new THREE.Group();
  scene.add(sectorGroup);
  sectorGroup.add(built.group);
  const actors = new Actors(scene);

  // The sim, starting at the college gate.
  const world = new World(map, run, rng, { x: map.pois.tiu[0], z: map.pois.tiu[1] }, assets.net);
  const gate = gateSpot(world);
  world.player.x = gate.x;
  world.player.z = gate.z;
  // Everything static that stands on the map goes in `dressing`, merged into a few draw calls below.
  const dressing = new THREE.Group();
  buildProps(dressing, map, world);
  const walkers = new Walkers(scene, world.crowd);

  const playerObj = playerPerson();
  scene.add(playerObj);

  // Landmark boards. (PwC is a low building: its small "pwh" sign is on the parapet, see world/furniture.ts.)
  const seenStops = new Set<string>();
  for (const s of map.stops) {
    if (seenStops.has(s.n)) continue;
    seenStops.add(s.n);
    const b = sign(`${s.n.toUpperCase()} · BUS`, 5, 0.7, '#f5c518', '#1b1b1b');
    b.position.set(s.p[0], 3, s.p[1]);
    dressing.add(b);
  }
  // Station names, the IT Centre sign and the Nabadiganta gantry (render/world/structures.ts).
  dressing.add(...built.signs);
  // Gate A is marked by its own pillar: red roundel (lit at night) and navy name board (render/world/stations.ts).
  // Static geometry in one draw call, every static board (landmarks, shops, billboards) in one more.
  bake(dressing);
  batchSigns(dressing);
  sectorGroup.add(dressing);

  // The streamed world beyond the map (task 020): builder G's ChunkStore when the sim has one, else the debug
  // fixture behind `?fixture=1`.
  let streamed: StreamedWorld | null = null;
  let exited = false;
  const chunks: ChunkSource | undefined = world.streamed?.store;
  const attach = (src: ChunkSource, driven: ConstructorParameters<typeof StreamedWorld>[3] = null) => {
    streamed = new StreamedWorld(scene, src, sectorGroup, driven);
    minimap.attachWorld(src);
    game.debug.streamed = streamed;
  };

  // What is overhead (a flyover deck or a station), so the camera can stay underneath it.
  const overhead = roofs(map.roads);

  let layer: HTMLElement;
  let actionBtn: HTMLButtonElement;
  const minimap = new Minimap(map);
  if (chunks) {
    attach(chunks);
    (streamed as StreamedWorld | null)!.pump = (x, z) => world.streamed?.stream(x, z, () => true);
  }
  else void fixtureSource().then((fx) => { if (fx && !exited) attach(fx, fx); });
  const exit = map.busPath[map.busPath.length - 1];
  let phoneBtn: HTMLButtonElement;
  let balanceUi: HTMLElement | null = null;
  // Open looking along Street No. 2 towards the junction, not diagonally into a wall.
  const toJunction = -gate.x * gate.road.dx - gate.z * gate.road.dz > 0 ? 1 : -1;
  // The camera's look (task 027): it turns only when the player drags on the right half (or J/L, or a mouse drag).
  const look = new Look();
  look.set(Math.atan2(gate.road.dz * toJunction, gate.road.dx * toJunction));
  let acc = 0;
  let camReady = false;
  let lastPlace = '';
  let leaving = false;
  const pending = { jump: false, action: false, phone: false };
  const ambience = new Ambience(floods);
  // Attract mode: the title screen floats over this same live scene; PLAY starts the run in place.
  let attracting = game.attract;
  game.attract = false;
  let orbit = 0;
  // The point the camera orbits (eases after the player) and its current distance (eases after walls).
  const pivot = new THREE.Vector3();
  let camDist = 0;

  /** The stick, read in the camera's yaw right now (the camera never turns by itself on foot). */
  function intentFromInput(): Intent {
    const p = world.player;
    let [mx, mz] = stickToWorld(input.mx, input.mz, look.yaw);
    // Near a road, "up" runs along it (sim/player.ts roadAssist).
    if (p.state === 'foot' && (mx || mz) && clearance(map.roads, p.x, p.z) < CONTROLS.roadNear) {
      const r = nearestRoad(map.roads, p.x, p.z);
      if (r.d < Infinity) [mx, mz] = roadAssist(mx, mz, r.dx, r.dz);
    }
    return {
      moveX: mx,
      moveZ: mz,
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
        game.go('station');
        break;
      case 'arrive':
        leaving = true;
        game.arrive(e.mode);
        break;
    }
  }

  // Where you are, for the HUD: a bus stop inside Sector V; outside it, the nearest named landmark of the streamed
  // world, else the area (Salt Lake, Beliaghata...). Landmark positions are warped once for this mode.
  const sw = world.streamed;
  const marks = sw ? sw.net.landmarks.filter((l) => l.kind !== 'generic' || l.name.length < 28).map((l) => {
    const [lx, lz] = sw.store.warp.toGame([l.x, l.z]);
    return { x: lx, z: lz, n: l.name.toUpperCase() };
  }) : [];
  function placeName(x: number, z: number) {
    const inside = Math.abs(x) <= 360 && Math.abs(z) <= 360;
    let best = inside ? 'PWH MORE' : '', bd = inside ? 60 : 90;
    for (const s of map.stops) { const d = Math.hypot(s.p[0] - x, s.p[1] - z); if (d < bd) { bd = d; best = s.n.toUpperCase(); } }
    if (inside || !sw) return best;
    for (const m of marks) { const d = Math.hypot(m.x - x, m.z - z); if (d < bd) { bd = d; best = m.n; } }
    if (best) return best;
    const [rx, rz] = sw.store.warp.toReal([x, z]);
    let area = sw.net.areas[0], ad = Infinity;
    for (const a of sw.net.areas) { const d = Math.hypot(a.x - rx, a.z - rz); if (d < ad) { ad = d; area = a; } }
    return AREA_NAMES[area?.kind ?? 'generic'];
  }

  return {
    scene, camera,
    enter() {
      resize(camera, 55, 72);
      game.debug = { world, map, chunks: world.streamed?.store, streamed, yaw: () => look.yaw, pitch: () => look.pitch, setYaw: (v: number) => { look.set(v); camReady = false; }, look: (v: number) => { look.set(v); camReady = false; } };
      layer = sceneLayer();
      if (attracting) {
        showHud(false);
        run.clockRunning = false;
        const seed = new URLSearchParams(location.search).get('seed');
        showTitle({
          seed: seed ? Number(seed) : null,
          onPlay: (mode) => {
            unlockAudio();
            if (mode !== run.mode) { game.newRun(mode); return; } // fresh run in the chosen mode, straight into play
            sfx.shankh();
            attracting = false;
            camReady = false;
            startPlay();
          },
        });
        return;
      }
      startPlay();
    },
    update(dt) {
      sky.update(run.minute);
      if (attracting) {
        // Slow sweep around the PWH junction while traffic carries on below.
        acc += dt;
        while (acc >= T.step) { acc -= T.step; world.step(NO_INTENT); world.events.drain(); }
        actors.sync(world.traffic.vehicles, 0, '');
        streamChunks();
        walkers.update(performance.now());
        orbit += dt * 0.06;
        camera.position.set(Math.cos(orbit) * 75, 36, Math.sin(orbit) * 75);
        camera.lookAt(0, 4, 0);
        built.cull(0, 0);
        streamed?.update(0, 0);
        playerObj.position.set(world.player.x, 0, world.player.z);
        return;
      }
      playUpdate(dt);
    },
    exit() {
      exited = true;
      streamed?.dispose();
      ambience.stop();
      enableStick(false);
      layer.remove();
      hint('');
    },
  };

  /** Chunk generation gets a few milliseconds a frame, nearest chunk first (sim/gen/stream.ts). */
  function streamChunks() {
    const t0 = performance.now();
    world.streamed?.stream(world.player.x, world.player.z, () => performance.now() - t0 < STREAM.frameMs);
  }

  function startPlay() {
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
      ambience.start();
      setTimeout(() => hint(''), 6000);
  }

  function playUpdate(dt: number) {
      // Fixed 60 Hz simulation. Taps are latched until a step consumes them: a frame can run zero steps.
      acc += dt;
      // Look first, so the stick is read in the camera the player sees this frame.
      look.turn(input.lookYaw + input.turn * CONTROLS.keyTurn * dt, input.lookPitch);
      const riding = world.riding;
      // Riding: the camera follows the vehicle's heading, but a look drag wins for a few seconds.
      if (riding && look.idle > CONTROLS.rideLookHold) look.ease(riding.heading, CONTROLS.rideFollow, dt);
      look.step(dt);
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
      streamChunks();
      ambience.update(dt, run.jam, p.x, p.z);
      walkers.update(performance.now());
      const ride = world.riding;
      actors.sync(world.traffic.vehicles, world.captainId, world.captain?.captain?.name ?? '');

      // Player model.
      playerObj.position.set(p.x, p.state === 'hang' ? 0.6 : p.state === 'pillion' ? 0.55 : p.y, p.z);
      playerObj.rotation.set(p.state === 'hang' ? -p.lean * 0.6 : 0, -p.heading + Math.PI / 2, p.down ? Math.PI / 2 : 0);
      playerObj.scale.setScalar(p.state === 'pillion' ? 0.9 : 1);
      playerObj.animate(dt, { speed: p.state === 'foot' ? Math.hypot(p.vx, p.vz) : 0, airborne: p.state === 'foot' && !p.onGround, vy: p.vy, down: p.down, hang: p.state === 'hang', sit: p.state === 'pillion' });

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

      // Camera (task 027): it orbits the player on the look's yaw and pitch, and never turns by itself on foot
      // (riding eases it behind the vehicle above). Pitch tilts the orbit: looking down rises over the player,
      // looking up drops behind the shoulder and lifts the gaze. Walls pull it in; decks keep it underneath.
      const yaw = look.yaw, fx = Math.cos(yaw), fz = Math.sin(yaw);
      const portrait = innerHeight > innerWidth;
      const back = (portrait ? 11 : 9.5) * (ride?.kind === 'bus' ? 1.4 : 1);
      const high = (portrait ? 8 : 6.5) - CONTROLS.camPivot;
      const elev = Math.max(0.08, Math.min(1.25, Math.atan2(high, back) - look.pitch));
      const reach = Math.hypot(high, back);
      const flat = Math.cos(elev) * reach;
      let dist = flat;
      for (let k = 1.5; k <= flat; k += 0.75) if (world.grid.blocked(p.x - fx * k, p.z - fz * k, 0.6)) { dist = Math.max(2.5, k - 0.75); break; }
      // First frame: snap behind the player instead of gliding in from the map's centre.
      if (!camReady) { pivot.set(p.x, 0, p.z); camDist = dist; camReady = true; }
      pivot.x += (p.x - pivot.x) * Math.min(1, dt * 10);
      pivot.z += (p.z - pivot.z) * Math.min(1, dt * 10);
      camDist += (dist - camDist) * Math.min(1, dt * (dist < camDist ? 12 : 3)); // in fast at a wall, out gently
      const s = camDist / flat;
      camera.position.set(pivot.x - fx * camDist, Math.max(0.7, CONTROLS.camPivot + Math.sin(elev) * reach * s), pivot.z - fz * camDist);
      const roof = Math.min(overhead(camera.position.x, camera.position.z) ?? Infinity, overhead(p.x, p.z) ?? Infinity);
      if (roof < Infinity) camera.position.y = Math.min(camera.position.y, roof - 1.4);
      // Looking down, the gaze comes in towards the player so they stay on screen.
      const ahead = 6 * (1 - 0.65 * Math.min(0, look.pitch) / CONTROLS.pitchRange[0]);
      camera.lookAt(pivot.x + fx * ahead, 1.2 + Math.max(0, look.pitch) * CONTROLS.camLift, pivot.z + fz * ahead);
      shake.apply(camera, dt);
      actors.billboard(camera);
      built.cull(camera.position.x, camera.position.z);
      streamed?.update(p.x, p.z);
      minimap.draw({ x: p.x, z: p.z, yaw, vehicles: world.traffic.vehicles, captainId: world.captainId, metro: world.metroEntrance, exit: { x: exit[0], z: exit[1] } }, performance.now());

      const place = placeName(p.x, p.z);
      if (place !== lastPlace) { lastPlace = place; setDateline(place); }
  }
}
