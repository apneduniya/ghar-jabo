// The road from PWH More to Sealdah, played in real time: run, dodge taxis, hop onto moving buses,
// hang off the footboard, wave down Rapi-Nah bikes, or duck into the metro.

import * as THREE from 'three';
import type { Scene } from '../app/game';
import { game } from '../app/game';
import { bake, box, building, C, duskScene, rand, resize, Shake, sign } from '../render/gfx';
import { person } from '../render/models';
import { BUS_REAR_DOOR } from '../sim/vehicles';
import { sceneLayer, el, hint, toast, notify, shakeUi, setDateline, showHud } from '../ui/ui';
import { input, enableStick, pressButton } from '../input/input';
import { sfx, Engine } from '../audio/audio';
import { Body } from './player';
import { Traffic, type Vehicle } from './traffic';
import { FOOT_NEAR, HOME_X, LANES_EAST, METRO_IN_X, inFlood, floods, placeName, stops } from '../content/route';
import { cancelReasons, captainNames, pick, ticker } from '../content/text';

const DOOR_X = BUS_REAR_DOOR; // doors are on the left of Kolkata buses
const potholes = Array.from({ length: 40 }, () => ({ x: rand(-20, HOME_X), z: rand(-5.5, -0.5) }));

type State = 'foot' | 'hang' | 'pillion' | 'leaving';

export function city(): Scene {
  const run = game.run;
  const scene = duskScene();
  scene.fog = new THREE.Fog(C.sky, 60, 170);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  const shake = new Shake();
  const traffic = new Traffic(scene);
  const body = new Body();
  const busEngine = new Engine(48, 6);
  let layer: HTMLElement;
  let state: State = 'foot';
  let ride: Vehicle | null = null;
  let lean = 0, leanVel = 0;
  let actionBtn: HTMLButtonElement;
  let phoneBtn: HTMLButtonElement;
  let balanceUi: HTMLElement | null = null;
  let progress: HTMLElement;
  let booking: { t: number } | null = null;
  let captain: Vehicle | null = null;
  let lastStop = -1;
  let bumpT = 2;
  let marker: THREE.Mesh | null = null;
  let lastPlace = '';
  let rideMode: 'bus' | 'rapinah' | null = null;

  buildWorld(scene);
  bake(scene); // all static scenery in one draw call
  body.pos.set(run.spawnX, 0, -8);
  body.obj.rotation.y = Math.PI / 2;
  scene.add(body.obj);
  traffic.populate(run.spawnX, run.jam);

  // --- Buses ---------------------------------------------------------------

  function doorWorld(v: Vehicle) {
    return new THREE.Vector3(v.obj.position.x + DOOR_X, 0, v.lane - v.width / 2 - 0.5);
  }

  function nearestDoor(): Vehicle | null {
    let best: Vehicle | null = null, bd = 2.6;
    for (const v of traffic.list) {
      if (v.kind !== 'bus' || v.dir < 0) continue;
      const d = doorWorld(v).distanceTo(new THREE.Vector3(body.pos.x, 0, body.pos.z));
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }

  function hopOn(v: Vehicle) {
    if (v.speed > 11) {
      toast('TOO FAST!', 'The bus did not slow down for you. It never does.');
      body.knockDown(new THREE.Vector3(-0.3, 0, 1), 5);
      sfx.bad();
      return;
    }
    if ((v.hangers ?? 0) >= 3 && Math.random() < 0.5) {
      toast('JAYGA NEI!', 'Conductor: "Pichhone egiye jaan!" There is no pichhone.');
      body.knockDown(new THREE.Vector3(0, 0, 1), 3);
      sfx.bad();
      return;
    }
    state = 'hang';
    ride = v;
    rideMode = 'bus';
    lean = 0;
    leanVel = 0.3;
    v.obj.add(body.obj);
    body.pos.set(DOOR_X + 0.2, 0.6, -v.width / 2 - 0.25);
    body.obj.rotation.set(0, 0, 0);
    sfx.horn();
    busEngine.start();
    run.stats.busHops++;
    balanceUi = el('div', 'balance', '<i><b></b></i>');
    layer.appendChild(balanceUi);
    hint('Hanging on! ← → to balance. Jump to hop off.');
    if (run.stats.busHops === 1) notify(pick(ticker.bus), '', 'news');
    if (v.depotX) setTimeout(() => notify('Conductor: "Ultadanga obdhi!"', 'This bus might not go all the way.', 'app'), 1500);
  }

  function hopOff(fallen: boolean) {
    if (!ride) return;
    const wp = new THREE.Vector3();
    body.obj.getWorldPosition(wp);
    ride.obj.remove(body.obj);
    scene.add(body.obj);
    body.pos.set(wp.x, 0, Math.min(wp.z, FOOT_NEAR[1] + 0.5));
    const speed = ride.speed;
    ride = null;
    state = 'foot';
    busEngine.stop();
    balanceUi?.remove();
    balanceUi = null;
    hint('');
    if (fallen) {
      run.stats.falls++;
      run.hurtDignity(12);
      game.timeScale = 0.35;
      setTimeout(() => { game.timeScale = 1; }, 700);
      game.hitStop = 0.1;
      shake.kick(0.9, 0.6);
      shakeUi();
      sfx.crash();
      body.knockDown(new THREE.Vector3(0.5, 0, 1).normalize(), speed * 0.7 + 3);
      run.requestPhoto(4, 'DHOPAS!');
      toast('DHOPAS!', 'You have exited the bus. Not at a stop.');
      setTimeout(() => notify(pick(ticker.fall), '', 'news'), 900);
    } else {
      body.vel.set(speed * 0.8, 3, 1.5);
      body.onGround = false;
      sfx.whoosh();
    }
  }

  // --- Rapi-Nah --------------------------------------------------------------

  // Surge rises with the jam and with every rebook, but a student can still just about afford it.
  const surge = () => 1 + run.jam * 0.8;
  const fare = () => Math.round((49 + run.stats.rebooks * 12) * surge());

  function book() {
    if (booking || captain || state !== 'foot') return;
    const f = fare();
    if (run.money < f) { toast('₹' + f + ' LAGBE', `You have ₹${run.money}. Surge doesn't care.`); return; }
    booking = { t: rand(1.8, 3.2) };
    run.tried('rapinah');
    sfx.ting();
    notify('Finding captain…', `Bike · ₹${f}${run.jam > 0.35 ? ` · 🔥 ${surge().toFixed(1)}x surge` : ''}`, 'app');
  }

  function dispatchCaptain() {
    booking = null;
    const name = pick(captainNames);
    const first = run.stats.cancels === 0 && run.stats.rebooks === 0;
    const r = Math.random();
    // The very first booking always drives past: the joke that teaches the game.
    const plan = first ? 'pass' : r < 0.55 ? 'come' : r < 0.8 ? 'pass' : 'wrong';
    const stopX = plan === 'wrong' ? body.pos.x + rand(40, 60) : body.pos.x + rand(5, 9);
    captain = traffic.spawn('bike', body.pos.x + 95, LANES_EAST[1], -1, {
      captain: { name, plan, stopX, state: 'approach', waitT: 0 },
    });
    marker = sign(`CAPTAIN ${name.toUpperCase()} ⬇`, 4, 0.7, '#ffd400', '#111');
    marker.position.set(0, 3, 0);
    marker.rotation.y = Math.PI / 2; // faces the camera while the bike rides towards you
    captain.obj.add(marker);
    notify(`Captain ${name} is 2 min away`, 'Coming on the wrong side of the road, obviously.', 'app');
  }

  function cancelCaptain(reason: string) {
    if (!captain) return;
    run.stats.cancels++;
    run.stats.rebooks++;
    sfx.cancel();
    shakeUi();
    run.requestPhoto(2 + run.stats.cancels * 0.1, 'CANCEL!');
    notify('Captain cancelled', `Reason: "${reason}"`, 'bad');
    if (run.stats.cancels === 2 || run.stats.cancels === 4) setTimeout(() => notify(pick(ticker.cancel).replace('{n}', String(run.stats.cancels * 3)), '', 'news'), 1200);
    if (marker) captain.obj.remove(marker);
    captain.captain!.state = 'leaving';
    captain.captain = undefined;
    captain = null;
  }

  function updateCaptain(dt: number) {
    if (!captain?.captain) return;
    const c = captain.captain;
    const x = captain.obj.position.x;
    if (c.plan === 'pass' && c.state === 'approach' && x < body.pos.x - 12) cancelCaptain(pick(cancelReasons));
    else if (c.state === 'waiting') {
      if (c.waitT === 0) {
        sfx.ting();
        notify(`Captain ${c.name} has arrived`, c.plan === 'wrong' ? '…40 metres ahead. Run!' : 'Right there. Hop on before he changes his mind.', 'app');
      }
      c.waitT += dt;
      if (c.waitT > 9) cancelCaptain('Customer did not come');
    }
  }

  function sitOnBike(paid = false) {
    if (!captain) return;
    const f = fare();
    if (!paid && !run.spend(f)) { cancelCaptain('Cash only, dada'); return; }
    sfx.win();
    state = 'pillion';
    ride = captain;
    rideMode = 'rapinah';
    if (marker) captain.obj.remove(marker);
    captain.captain!.state = 'carrying';
    captain.base = 17;
    // Turn round and head for Sealdah.
    captain.dir = 1;
    captain.obj.rotation.y = 0;
    captain.obj.add(body.obj);
    body.pos.set(-0.45, 0.55, 0);
    body.obj.rotation.set(0, Math.PI / 2, 0);
    body.obj.scale.setScalar(0.9);
    notify('Captain has ARRIVED', 'Screenshot this. Nobody will believe you.', 'good');
    hint('Riding pillion. Hold on.');
    // Some rides end early, wherever the captain feels like.
    if (Math.random() < 0.35) ditchAt = captain.obj.position.x + rand(120, 300);
    else ditchAt = HOME_X - 25;
  }
  let ditchAt = Infinity;

  function getOffBike(early: boolean) {
    if (!ride) return;
    const wp = new THREE.Vector3();
    body.obj.getWorldPosition(wp);
    ride.obj.remove(body.obj);
    scene.add(body.obj);
    body.obj.scale.setScalar(1);
    body.pos.set(wp.x, 0, FOOT_NEAR[1] - 0.5);
    const v = ride;
    ride = null;
    state = 'foot';
    hint('');
    v.captain = undefined;
    v.base = 15;
    captain = null;
    if (early) {
      run.stats.ditched++;
      toast('RIDE ENDED', pick(['Captain: "Petrol khatam, dada."', 'Captain: "Ekhane namun, ami ar jabo na."', 'Captain: "Barir pashe eshe gechhi. Bye."']));
      sfx.cancel();
      run.requestPhoto(2.6, 'NAMUN!');
    }
  }

  // --- Frame -------------------------------------------------------------------

  function contextAction(): { label: string; go: () => void } | null {
    if (state === 'hang') return { label: 'HOP OFF', go: () => hopOff(false) };
    if (state !== 'foot' || body.down) return null;
    if (captain?.captain?.state === 'waiting' && captain.obj.position.distanceTo(body.pos) < 3.5) return { label: 'SIT ON BIKE 🛵', go: sitOnBike };
    const v = nearestDoor();
    if (v) return { label: 'HOP ON 🚌', go: () => hopOn(v) };
    return null;
  }

  function enterMetro() {
    if (run.money < 20) {
      toast('₹20 LAGBE', `You have ₹${run.money}. The token counter is unmoved.`);
      body.pos.x += 3;
      return;
    }
    state = 'leaving';
    run.tried('metro');
    run.spawnX = METRO_IN_X;
    sfx.chime();
    game.go('station');
  }

  return {
    scene, camera,
    enter() {
      resize(camera, 55, 75);
      game.debug = { traffic, body };
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
      progress = el('div', 'progress', '<i></i><b></b>');
      layer.append(actionBtn, jump, phoneBtn, progress);
      if (run.rideMode === 'bus') {
        // Came off the real map on a bus: keep hanging on it towards Sealdah.
        const v = traffic.spawn('bus', run.spawnX - 2, LANES_EAST[1], 1);
        v.speed = 6;
        v.depotX = undefined;
        hopOn(v);
      } else if (run.rideMode === 'rapinah') {
        const v = traffic.spawn('bike', run.spawnX, LANES_EAST[1], 1, { captain: { name: 'Bablu', plan: 'come', stopX: run.spawnX, state: 'waiting', waitT: 0 } });
        captain = v;
        sitOnBike(true);
      }
      run.rideMode = null;
      for (const s of stops) {
        const t = el('span', 'tick', '');
        t.style.left = `${(s.x / HOME_X) * 100}%`;
        progress.appendChild(t);
      }
      const m = el('span', 'tick metro', 'M');
      m.style.left = `${(METRO_IN_X / HOME_X) * 100}%`;
      progress.appendChild(m);
      if (run.spawnX < 20 && run.stats.busHops === 0 && run.stats.modesTried.length === 0) {
        notify(pick(ticker.start), '', 'news');
        setTimeout(() => hint('Get home to Sealdah →  Hop a bus, book a bike, or take the metro'), 600);
        setTimeout(() => hint(''), 6000);
      } else if (run.spawnX > 600) {
        toast('SEALDAH METRO', 'Out of the station. Ghar is just ahead!');
      }
    },
    update(dt) {
      const now = performance.now();
      // World x of the player (body.pos is local to the vehicle while riding).
      const wx = ride ? ride.obj.position.x : body.pos.x;
      traffic.update(dt, wx, run.jam, now);

      if (state === 'foot') {
        body.slow = inFlood(body.pos.x) ? 0.45 : 1;
        body.update(dt, -10.3, 10.3);
        if (inFlood(body.pos.x) && Math.random() < dt * 2) sfx.bump();
        // Getting hit by moving traffic.
        if (!body.down) {
          for (const v of traffic.list) {
            const dx = Math.abs(v.obj.position.x - body.pos.x);
            const dz = Math.abs(v.obj.position.z - body.pos.z);
            if (dx < v.len / 2 + 0.3 && dz < v.width / 2 + 0.35 && body.pos.y < 1.2) {
              if (v.speed > 3.5 && v !== captain) {
                run.stats.taxiHits++;
                run.hurtDignity(6);
                run.addMinutes(2);
                sfx.crash();
                shake.kick(0.6);
                shakeUi();
                game.hitStop = 0.12;
                run.requestPhoto(3, v.kind === 'taxi' ? 'TAXI TAKKAR!' : v.kind === 'bus' ? 'BUS-E DHAKKA!' : 'DHAKKA!');
                toast(v.kind === 'taxi' ? 'TAXI TAKKAR!' : v.kind === 'bus' ? 'BUS-E DHAKKA!' : 'DHAKKA!',
                  v.kind === 'taxi' ? 'Yellow taxi did not see you. Or did not care.' : 'Zebra crossing? Sheta abar ki?');
                body.knockDown(new THREE.Vector3(v.dir * 0.6, 0, body.pos.z > v.lane ? 1 : -1).normalize(), 6);
              } else {
                // Slow or stopped vehicle: just get pushed aside.
                body.pos.z += (body.pos.z > v.lane ? 1 : -1) * dt * 6;
              }
              break;
            }
          }
        }
        if (Math.abs(body.pos.x - METRO_IN_X) < 2.2 && body.pos.z < -7.5 && !body.down) {
          enterMetro();
          if ((state as State) === 'leaving') return; // this scene has already been replaced
        }
        if (input.phone) book();
      } else if (state === 'hang' && ride) {
        // Footboard pendulum: the bus sways and brakes, ← → pulls you back in.
        const sway = Math.sin(now / 700) * 0.8 + Math.sin(now / 290) * 0.35 + (ride.speed < 2 ? 0.6 : 0);
        leanVel += (sway * 0.9 + lean * 1.5 - input.mz * 3.2) * dt;
        leanVel *= 0.96;
        lean += leanVel * dt;
        body.obj.rotation.x = lean * 0.6;
        body.pos.z = -ride.width / 2 - 0.25 - Math.max(0, lean) * 0.5;
        const bar = balanceUi?.querySelector<HTMLElement>('b');
        if (bar) { bar.style.left = `${50 - lean * 45}%`; bar.classList.toggle('danger', Math.abs(lean) > 0.7); }
        // Potholes kick you about.
        bumpT -= dt;
        if (bumpT <= 0 || potholes.some((p) => Math.abs(p.x - ride!.obj.position.x) < ride!.speed * dt && p.z > 2)) {
          bumpT = rand(2.5, 4.5);
          sfx.bump();
          shake.kick(0.35, 0.25);
          game.hitStop = 0.05;
          leanVel += (Math.random() < 0.5 ? -1 : 1) * 1.6;
          if (Math.random() < 0.3) toast('DHADAK!', pick(['Pothole. KMC sends regards.', 'That pothole has a pin code.', 'Your spine filed a complaint.']));
        }
        const si = stops.findIndex((s) => Math.abs(s.x - ride!.obj.position.x) < 3);
        if (si >= 0 && si !== lastStop) { lastStop = si; run.stats.footboardStops++; }
        if (Math.abs(lean) > 1) hopOff(true);
        else if (input.jump || input.action) hopOff(false);
        else if (ride.depotX && ride.obj.position.x >= ride.depotX) {
          toast('DEPOT!', 'Conductor: "Ar jabe na! Sobai namun!"');
          sfx.bad();
          hopOff(false);
        }
      } else if (state === 'pillion' && ride) {
        if (ride.obj.position.x >= ditchAt) getOffBike(ditchAt < HOME_X - 30);
      }

      updateCaptain(dt);

      // Home!
      if (state !== 'leaving' && wx >= HOME_X - 4) {
        state = 'leaving';
        if (ride && rideMode === 'bus') hopOff(false);
        sfx.win();
        toast('GHORE FIRLAM!', 'Ma is at the door. Bhaat is warm. Mostly.');
        setTimeout(() => game.arrive(rideMode ?? 'walk'), 1300);
      }

      // Context button and phone label.
      const ctx = contextAction();
      actionBtn.hidden = !ctx;
      if (ctx) {
        if (actionBtn.textContent !== ctx.label) actionBtn.textContent = ctx.label;
        if (input.action) ctx.go();
      }
      const busy = booking || captain || state !== 'foot';
      phoneBtn.innerHTML = busy ? '📱 <small>…</small>' : `📱 Rapi-Nah <small>₹${fare()}</small>`;
      phoneBtn.classList.toggle('busy', !!busy);
      if (booking) { booking.t -= dt; if (booking.t <= 0) dispatchCaptain(); }

      // Place name and progress strip.
      const place = placeName(wx);
      if (place !== lastPlace) { lastPlace = place; setDateline(place.toUpperCase()); }
      progress.querySelector<HTMLElement>('b')!.style.left = `${Math.min(100, Math.max(0, wx / HOME_X * 100))}%`;

      // Chase camera, looking down the road towards home.
      const tgt = new THREE.Vector3();
      body.obj.getWorldPosition(tgt);
      const portrait = innerHeight > innerWidth;
      const back = portrait ? 10 : 9;
      camera.position.lerp(new THREE.Vector3(tgt.x - back, (portrait ? 7.5 : 6) + tgt.y * 0.3, tgt.z * 0.55 - 1.5), Math.min(1, dt * 5));
      camera.lookAt(tgt.x + 7, 1, tgt.z * 0.6);
      shake.apply(camera, dt);
    },
    exit() {
      busEngine.stop();
      enableStick(false);
      layer.remove();
      hint('');
    },
  };
}

function buildWorld(scene: THREE.Scene) {
  const L = HOME_X + 120;
  const cx = L / 2 - 60;
  scene.add(box(L + 40, 0.1, 120, 0x6d6a5f, cx, -0.12, 0));
  scene.add(box(L, 0.05, 12, C.road, cx, 0, 0));
  scene.add(box(L, 0.22, 4.5, C.footpath, cx, 0, 8.25));
  scene.add(box(L, 0.22, 4.5, C.footpath, cx, 0, -8.25));
  for (let x = -60; x < L - 60; x += 5) {
    scene.add(box(2.2, 0.06, 0.15, C.lane, x, 0, 3));
    scene.add(box(2.2, 0.06, 0.15, C.lane, x, 0, -3));
  }
  scene.add(box(L, 0.08, 0.25, 0xf5c518, cx, 0, 0));
  for (let x = -60; x < L - 60; x += 1.2) {
    const c = Math.round(x / 1.2) % 2 ? C.kerbA : C.kerbB;
    scene.add(box(0.6, 0.28, 0.3, c, x, 0, 6), box(0.6, 0.28, 0.3, c, x, 0, -6));
  }
  for (const p of potholes) scene.add(box(1.1, 0.07, 0.8, 0x2a2730, p.x, 0, p.z));
  for (const [a, b] of floods) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.12, 21), new THREE.MeshLambertMaterial({ color: 0x5b7f9a, transparent: true, opacity: 0.75 }));
    w.position.set((a + b) / 2, 0.08, 0);
    scene.add(w);
    const s = sign('JOL JOMECHHE · SECTOR VENICE', 7, 0.9, '#1f5f9a');
    s.position.set(a + 4, 2.6, -10.4);
    s.rotation.y = -Math.PI / 2 - 0.6;
    scene.add(s);
  }
  const colours = [0xd8c3a5, 0xc9a6a0, 0xa9b8a2, 0x9fb3c8, 0xe0c27a, 0xc7b9a6, 0x8fa9c4, 0xd7a9c9];
  for (const side of [1, -1]) {
    for (let x = -60; x < L - 60;) {
      const w = rand(8, 14);
      const tall = x < 300 ? rand(10, 26) : rand(6, 14); // glass offices in Sector V, older blocks later
      const b = building(w, tall, 8, colours[Math.floor(Math.random() * colours.length)]);
      b.position.set(x + w / 2, 0, side * 15);
      b.rotation.y = side > 0 ? Math.PI : 0;
      scene.add(b);
      x += w + rand(0.5, 2);
    }
  }
  for (let x = -50; x < L - 60; x += 14) scene.add(box(0.2, 6, 0.2, 0x444444, x, 0, 6.6), box(0.3, 0.2, 1.4, C.lamp, x, 6, 6));
  for (const s of stops) {
    const sh = new THREE.Group();
    sh.add(box(5, 0.2, 2, 0x2f6db5, 0, 2.6, 0), box(0.15, 2.6, 0.15, 0x555555, -2.3, 0, -0.8), box(0.15, 2.6, 0.15, 0x555555, 2.3, 0, -0.8));
    const sg = sign(`${s.name.toUpperCase()} · BUS`, 4.8, 0.7, '#f5c518', '#1b1b1b');
    sg.position.set(0, 3.1, 0);
    sg.rotation.y = -Math.PI / 2;
    sh.add(sg);
    sh.position.set(s.x, 0, -9);
    scene.add(sh);
    for (let i = 0; i < 3; i++) {
      const p = person();
      p.position.set(s.x + rand(-2, 2), 0.2, rand(-10, -8.8));
      p.rotation.y = -Math.PI / 2;
      scene.add(p);
    }
  }
  // Karunamoyee: where the real Sector V map hands over to the long ride.
  const kar = sign('KARUNAMOYEE → SEALDAH', 9, 1.1, '#1f5f3a');
  kar.position.set(-6, 4.5, -10.6);
  scene.add(kar, box(0.2, 4, 0.2, 0x555555, -6, 0, -10.8));
  // The Green Line viaduct runs alongside the whole way to Sealdah, with Central Park station on it.
  scene.add(box(L, 1.2, 3, C.viaduct, cx, 9, 9));
  for (let x = -55; x <= L - 60; x += 13) scene.add(box(1.4, 9, 1.4, C.viaduct, x, 0, 9));
  scene.add(box(30, 5, 7, 0xd9d4cc, METRO_IN_X, 10.2, 9));
  const ms = sign('CENTRAL PARK METRO', 10, 1.4, '#2e9e5b');
  ms.position.set(METRO_IN_X, 13.4, 5.4);
  scene.add(ms);
  // Metro entrance stairs on the player's footpath.
  const ent = new THREE.Group();
  ent.add(box(4, 3, 0.3, C.metro, 0, 0, 1.6), box(4, 3, 0.3, C.metro, 0, 0, -1.6), box(4.2, 0.3, 3.5, C.metro, 0, 3, 0));
  const es = sign('🚇 METRO ↓', 3.6, 0.8, '#2e9e5b');
  es.position.set(-2.12, 3.6, 0);
  es.rotation.y = -Math.PI / 2;
  ent.add(es);
  ent.position.set(METRO_IN_X, 0, -8.6);
  scene.add(ent);
  // Home.
  const home = new THREE.Group();
  home.add(box(1, 5, 1, 0xe2402c, 0, 0, -9), box(1, 5, 1, 0xe2402c, 0, 0, 9), box(1, 1.2, 19, 0xe2402c, 0, 5, 0));
  const hs = sign('🏠 GHAR · SEALDAH', 12, 1.1, '#f5c518', '#1b1430');
  hs.position.set(-0.55, 5.6, 0);
  hs.rotation.y = -Math.PI / 2;
  home.add(hs);
  home.position.set(HOME_X, 0, 0);
  scene.add(home);
  const ma = person(0xd35c8a);
  ma.position.set(HOME_X + 3, 0.2, -8.5);
  ma.rotation.y = -Math.PI / 2;
  scene.add(ma);
}
