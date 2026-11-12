// Draws the Sector V metro stage (task 033) from the sim (src/sim/station.ts): the concourse, ticket gates
// (green or red as the sim dealt them), the escalator, the platform and track, the train, the crowd (rigged
// instanced figures, render/world/walkers.ts) and the student. Reads sim state only.

import * as THREE from 'three';
import { bake, batchSigns, box, C, sign } from './gfx';
import { playerPerson } from './models';
import { Figures } from './world/walkers';
import { STATION } from '../content/tuning';
import { stationText as X } from '../content/text';
import type { StationSim } from '../sim/station';

const S = STATION;
const FLOOR = 0xcfc8bd, WALL = 0xa9b3bb, STEEL = 0xb0b8c0, DARK = 0x3a3a3a;

/** The static station: one baked mesh and one batch of signs. */
function buildStation(sim: StationSim): THREE.Group {
  const g = new THREE.Group();
  const len = S.xMax - S.xMin + 12, mid = (S.xMin + S.xMax) / 2;
  // Floor, the back wall behind the platform, the concourse's other wall, and the two end walls.
  g.add(box(len, 0.1, 14, FLOOR, mid, -0.1, 0));
  g.add(box(len, 6.5, 0.3, WALL, mid, 0, 7.5));
  g.add(box(S.esc[1] - S.xMin + 2, 6.5, 0.3, WALL, (S.xMin + S.esc[1]) / 2, 0, S.zMin - 0.5));
  g.add(box(0.3, 6.5, 15, WALL, S.xMin - 0.3, 0, 0), box(0.3, 6.5, 15, WALL, S.xMax + 0.3, 0, 0));
  // Ceiling lights instead of a ceiling, so the camera can sit above the crowd.
  for (let x = S.xMin; x < S.xMax; x += 6) g.add(box(3, 0.1, 0.4, 0xfff6d5, x, 6.5, 0));
  // Ticket gates: a housing between every pair of lanes; a green or red lamp on each lane, a red flap if it's shut.
  for (let i = 0; i <= S.gateLanes; i++) g.add(box(0.8, 1.1, S.gateGap - 2 * S.gateHalf, STEEL, S.gateX, 0, sim.laneZ(i) - S.gateGap / 2));
  sim.gateOpen.forEach((ok, i) => {
    const z = sim.laneZ(i);
    g.add(box(0.12, 0.12, 0.5, ok ? 0x34c759 : 0xff3b30, S.gateX - 0.35, 1.12, z - S.gateGap / 2));
    if (!ok) g.add(box(0.15, 0.9, S.gateHalf * 2, 0xff3b30, S.gateX, 0.1, z));
  });
  // Escalator: dark steps with lighter treads, rails each side, and a yellow line between standing and walking.
  const [e0, e1] = S.esc, ez = (S.escZ[0] + S.escZ[1]) / 2, ew = S.escZ[1] - S.escZ[0];
  g.add(box(e1 - e0, 0.15, ew, DARK, (e0 + e1) / 2, 0, ez));
  for (let x = e0 + 0.4; x < e1; x += 0.8) g.add(box(0.08, 0.17, ew - 0.2, 0x5a5a5a, x, 0, ez));
  for (const z of S.escZ) g.add(box(e1 - e0, 1, 0.3, 0x2b3238, (e0 + e1) / 2, 0, z), box(e1 - e0, 0.08, 0.36, 0x111111, (e0 + e1) / 2, 1, z));
  g.add(box(e1 - e0, 0.18, 0.06, 0xf5c518, (e0 + e1) / 2, 0, S.escSplit));
  // The well's sides: solid housings either side of the escalator, up to the walls.
  g.add(box(e1 - e0, 1, S.escZ[0] - S.zMin + 0.5, 0x6f777e, (e0 + e1) / 2, 0, (S.escZ[0] + S.zMin - 0.5) / 2 - 0.15));
  g.add(box(e1 - e0, 1, S.zMax + 1.3 - S.escZ[1], 0x6f777e, (e0 + e1) / 2, 0, (S.escZ[1] + S.zMax + 1.3) / 2 + 0.15));
  // Platform: the yellow line, the edge, the track bed below, rails, and the green door marks.
  const [p0, p1] = S.plat, pm = (p0 + p1) / 2;
  g.add(box(p1 - S.esc[1], 0.06, 0.4, 0xf5c518, (S.esc[1] + p1) / 2, 0, S.edgeZ + 0.3));
  g.add(box(len, 1.3, 4.2, 0x2a2a2a, mid, -1.4, S.edgeZ - 2.15));
  for (const dz of [-1.1, 0.4]) g.add(box(len, 0.12, 0.12, 0x8d8d8d, mid, -0.1, S.edgeZ - 2.2 + dz));
  g.add(box(len, 6.5, 0.3, WALL, mid, -1.3, S.edgeZ - 4.5));
  for (const d of S.doors) g.add(box(1.6, 0.05, 0.6, C.metro, d, 0, S.edgeZ + 0.9));
  bake(g);
  // Signs.
  const tg = sign(X.signs.token, 6, 0.8, '#2e9e5b');
  tg.position.set(S.gateX - 0.5, 3.4, 0.3);
  tg.rotation.y = -Math.PI / 2;
  const sr = sign(X.signs.escalator, 4, 0.8, '#f5c518', '#111');
  sr.position.set(e0 - 0.6, 3, ez);
  sr.rotation.y = -Math.PI / 2;
  const ps = sign(X.signs.platform, 14, 1.2, '#1f5f9a');
  ps.position.set(pm, 4.2, 7.3);
  ps.rotation.y = Math.PI;
  g.add(tg, sr, ps);
  batchSigns(g);
  return g;
}

function buildTrain(): THREE.Group {
  const train = new THREE.Group();
  for (let i = 0; i < S.cars; i++) {
    const c = new THREE.Group();
    c.add(box(8.6, 3, 2.8, 0xdcdcdc, 0, 0, 0), box(8.62, 0.5, 2.82, C.metro, 0, 0.6, 0), box(8.62, 0.8, 2.82, 0x2a3440, 0, 1.6, 0));
    // Doors (dark when shut) on the platform side.
    for (const dx of [-2.2, 2.2]) c.add(box(1.3, 2.4, 0.05, 0x9aa3ab, dx, 0, 1.42));
    c.position.x = i * S.carLen;
    train.add(c);
  }
  bake(train);
  return train;
}

export class StationView {
  readonly player = playerPerson();
  private figs: Figures;
  private train = buildTrain();

  constructor(scene: THREE.Scene, sim: StationSim) {
    scene.add(buildStation(sim));
    this.train.position.set(S.enterX, 0.1, S.edgeZ - 1.9);
    scene.add(this.train);
    this.figs = new Figures(scene, sim.crowd.people.length);
    scene.add(this.player);
  }

  /** Move everything to the sim's state; `now` in ms for the idle animations. */
  sync(sim: StationSim, dt: number, now: number) {
    const t = now / 1000;
    // On the ride the camera runs beside the train between stations: the Sector V platform crowd isn't there.
    const away = sim.phase !== 'gate' && sim.phase !== 'escalator' && sim.phase !== 'platform';
    sim.crowd.people.forEach((n, i) => {
      if (n.gone || away) this.figs.hide(i);
      else this.figs.place(i, dt, n.x, 0, n.z, n.heading, n.v, { idle: n.idle, t });
    });
    this.figs.flush(now);
    this.train.position.x = sim.train.x;
    this.train.visible = sim.phase === 'ride' || sim.train.state !== 'away';
    const p = sim.player, o = this.player;
    o.visible = p.state === 'foot';
    if (!o.visible) return;
    o.position.set(p.x, p.y, p.z);
    o.rotation.set(0, -p.heading + Math.PI / 2, p.down ? Math.PI / 2 : 0);
    o.animate(dt, { speed: Math.hypot(p.vx, p.vz), airborne: !p.onGround, vy: p.vy, down: p.down, hang: false, sit: false });
  }
}
