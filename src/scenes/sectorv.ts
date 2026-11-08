// The real start area around TIU, built from OpenStreetMap: walk it GTA-style with a camera that turns with you.

import * as THREE from 'three';
import type { Scene } from '../game';
import { game } from '../game';
import { C, resize, Shake, sign } from '../gfx';
import { sceneLayer, el, hint, notify, setDateline, showHud } from '../ui';
import { input, enableStick, pressButton } from '../input';
import { Body } from '../player';
import { buildCityMap, map, type Pt } from '../world/citymap';
import { BuildingGrid } from '../world/collide';
import { pick, ticker } from '../text';

/** Nearest point on any main road to p, and that road's width. */
function nearestMainRoad(p: Pt) {
  let best = { x: p[0], z: p[1], w: 7, d: Infinity, dx: 1, dz: 0 };
  for (const r of map.roads) {
    if (!['primary', 'secondary', 'tertiary'].includes(r.k) || r.b) continue;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / (dx * dx + dz * dz || 1)));
      const x = ax + dx * t, z = az + dz * t;
      const d = Math.hypot(x - p[0], z - p[1]);
      const len = Math.hypot(dx, dz) || 1;
      if (d < best.d) best = { x, z, w: r.w, d, dx: dx / len, dz: dz / len };
    }
  }
  return best;
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
  const body = new Body();
  const built = buildCityMap();
  scene.add(built.group);
  const grid = new BuildingGrid(map.buildings.map((b) => b.p));
  let layer: HTMLElement;
  let yaw = 0;
  let lastPlace = '';

  // Start at the college gate: the edge of Street No. 2 in front of TIU.
  const tiu = map.pois.tiu;
  const road = nearestMainRoad(tiu);
  const toTiu = new THREE.Vector2(tiu[0] - road.x, tiu[1] - road.z).normalize();
  // Stand on the footpath just outside the gate (the first spot that isn't inside a building).
  const gatePos = new THREE.Vector2(road.x, road.z).add(toTiu.clone().multiplyScalar(road.w / 2 + 1.2));
  body.pos.set(gatePos.x, 0, gatePos.y);
  scene.add(body.obj);
  // The gate: two pillars along the road edge with a board across, facing the road.
  const gate = new THREE.Group();
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xb04a3a });
  const gx = gatePos.x + toTiu.x * 1.6, gz = gatePos.y + toTiu.y * 1.6;
  for (const s of [-3.2, 3.2]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.4, 0.8), pillarMat);
    m.position.set(gx + road.dx * s, 2.2, gz + road.dz * s);
    gate.add(m);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.8, 0.8), pillarMat);
  beam.position.set(gx, 4.6, gz);
  beam.rotation.y = -Math.atan2(road.dz, road.dx);
  gate.add(beam);
  const board = sign('COLLEGE GATE', 6.4, 0.7, '#f3e9d2', '#7a2a1f');
  board.position.set(gx - toTiu.x * 0.45, 4.6, gz - toTiu.y * 0.45);
  board.rotation.y = Math.atan2(-toTiu.x, -toTiu.y); // faces the road
  gate.add(board);
  scene.add(gate);
  // Face along the road towards the junction.
  yaw = Math.atan2(-gatePos.y, -gatePos.x);

  // Landmark signs (parody names) on the real buildings.
  const pwh = sign('PWH TOWER', 10, 1.4, '#22324a');
  pwh.position.set(map.pois.pwc[0], 14, map.pois.pwc[1]);
  scene.add(pwh);
  for (const s of map.stops) {
    const board = sign(`${s.n.toUpperCase()} · BUS`, 5, 0.7, '#f5c518', '#1b1b1b');
    board.position.set(s.p[0], 3, s.p[1]);
    scene.add(board);
  }
  const ms = sign('SALT LAKE SECTOR V · METRO', 12, 1.4, '#2e9e5b');
  ms.position.set(built.stationPos.x, 17, built.stationPos.z);
  ms.rotation.y = built.stationDir;
  scene.add(ms);

  function placeName(x: number, z: number) {
    let best = 'PWH MORE', bd = 60;
    for (const s of map.stops) { const d = Math.hypot(s.p[0] - x, s.p[1] - z); if (d < bd) { bd = d; best = s.n.toUpperCase(); } }
    return best;
  }

  return {
    scene, camera,
    enter() {
      resize(camera, 55, 72);
      game.debug = { body, map };
      layer = sceneLayer();
      showHud(true);
      run.clockRunning = true;
      enableStick(true);
      const jump = el('button', 'jump-btn', 'JUMP');
      pressButton(jump, 'jump');
      layer.appendChild(jump);
      notify(pick(ticker.start), '', 'news');
      hint('College gate, Street No. 2. Head for the junction →');
      setTimeout(() => hint(''), 5000);
    },
    update(dt) {
      // Move relative to the camera, and don't walk through buildings.
      const px = body.pos.x, pz = body.pos.z;
      body.update(dt, -Infinity, Infinity, yaw);
      if (grid.blocked(body.pos.x, body.pos.z)) {
        if (!grid.blocked(body.pos.x, pz)) body.pos.z = pz;
        else if (!grid.blocked(px, body.pos.z)) body.pos.x = px;
        else { body.pos.x = px; body.pos.z = pz; }
      }
      // The camera swings round behind the direction you're running, like GTA on a phone.
      const sp = Math.hypot(body.vel.x, body.vel.z);
      if (sp > 1.5 && input.mx > -0.5) {
        const target = Math.atan2(body.vel.z, body.vel.x);
        let d = target - yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        yaw += d * Math.min(1, dt * 1.8);
      }
      const fx = Math.cos(yaw), fz = Math.sin(yaw);
      const portrait = innerHeight > innerWidth;
      const back = portrait ? 11 : 9.5;
      let dist = back;
      for (let d = 1.5; d <= back; d += 0.75) if (grid.blocked(body.pos.x - fx * d, body.pos.z - fz * d, 0.6)) { dist = Math.max(2.5, d - 0.75); break; }
      const want = new THREE.Vector3(body.pos.x - fx * dist, (portrait ? 8 : 6.5) * (0.6 + 0.4 * dist / back) + body.pos.y * 0.3, body.pos.z - fz * dist);
      camera.position.lerp(want, Math.min(1, dt * 6));
      camera.lookAt(body.pos.x + fx * 6, 1.2, body.pos.z + fz * 6);
      shake.apply(camera, dt);

      const place = placeName(body.pos.x, body.pos.z);
      if (place !== lastPlace) { lastPlace = place; setDateline(place); }
    },
    exit() {
      enableStick(false);
      layer.remove();
      hint('');
    },
  };
}
