// One rig for every walking person (task 025). A figure is baked to one mesh; each vertex carries the body part
// it belongs to and that part's pivot, and the vertex shader swings legs, knees, arms and elbows by a walk
// phase. Pedestrians drive it per instance (`anim0`/`anim1` on an InstancedMesh), the player through a
// one-instance InstancedMesh, so a whole crowd still costs one draw call per look.
//
// How cheap game people read as alive (study notes in docs/tasks/025-people-walk.md): legs and arms swing in
// opposite phase, the body dips when the feet are apart (so it bobs at twice the step rate), the stride grows
// with speed and the phase advances by distance covered (no foot sliding), runners lean in and bend their
// elbows, idle people breathe and look around, and the hero has a tuck, a landing squash and a tumble.
//
// Figures face +z with feet at y = 0; the figure's left is +x. No gfx.ts import: tests build figures in node.

import * as THREE from 'three';
import { GAIT } from '../content/tuning';

export const PART = { torso: 0, head: 1, thighL: 2, thighR: 3, shinL: 4, shinR: 5, armL: 6, armR: 7, foreL: 8, foreR: 9 } as const;
export const PARTS = 10;

/** One skeleton for everyone (height varies through the instance scale). */
export const SKEL = { hip: 0.86, knee: 0.47, shoulder: 1.36, elbow: 1.08, neck: 1.44, hipX: 0.1, shoulderX: 0.29 } as const;

/** Per part: pivot y, pivot z, and the parent joint's y (hip for shins, shoulder for forearms, hip otherwise). */
const PIVOTS: [number, number, number][] = [
  [SKEL.hip, 0, SKEL.hip], [SKEL.neck, 0, SKEL.hip],
  [SKEL.hip, 0, SKEL.hip], [SKEL.hip, 0, SKEL.hip], [SKEL.knee, 0, SKEL.hip], [SKEL.knee, 0, SKEL.hip],
  [SKEL.shoulder, 0, SKEL.hip], [SKEL.shoulder, 0, SKEL.hip], [SKEL.elbow, 0, SKEL.shoulder], [SKEL.elbow, 0, SKEL.shoulder],
];

export interface Look {
  skin: number; hair: number; top: number; bottom: number; shoes: number;
  dress: 'shirt' | 'tee' | 'kurta' | 'saree' | 'salwar' | 'uniform';
  /** Pallu, dupatta or school tie. */
  accent?: number;
  bag?: 'backpack' | 'shoulder';
  bagColor?: number;
  umbrella?: boolean;
  longHair?: boolean;
  /** Shorts (school uniform): shins and knees bare. */
  shorts?: boolean;
  /** Default: long for shirts, kurtas and salwars, short otherwise. */
  sleeves?: 'short' | 'long';
}

/** A box from y = 0 to h whose width and depth taper from bottom (wB, dB) to top (wT, dT). Flat-shaded. */
export function slab(wB: number, wT: number, h: number, dB: number, dT: number) {
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) + 0.5;
    p.setXYZ(i, p.getX(i) * (wB + (wT - wB) * t), t * h, p.getZ(i) * (dB + (dT - dB) * t));
  }
  g.computeVertexNormals();
  return g;
}

function ball(r: number, sy = 1, thetaLen = Math.PI) {
  const g = new THREE.SphereGeometry(r, 8, 5, 0, Math.PI * 2, 0, thetaLen).toNonIndexed();
  g.scale(1, sy, 1);
  g.computeVertexNormals();
  return g;
}

/** Collects parts into one geometry with position, normal, color, rig (part, pivot y, pivot z, parent y), cloth. */
export class FigureBuilder {
  private pos: number[] = []; private nor: number[] = []; private col: number[] = [];
  private rig: number[] = []; private cloth: number[] = [];
  private c = new THREE.Color();

  /** Add `g` (already shaped) for `part`, moved to (x, y, z) and turned `rz` about z. `tint`: instance colour applies. */
  add(part: number, g: THREE.BufferGeometry, color: number, x: number, y: number, z: number, opts: { rz?: number; rx?: number; tint?: boolean } = {}) {
    if (opts.rz) g.rotateZ(opts.rz);
    if (opts.rx) g.rotateX(opts.rx);
    g.translate(x, y, z);
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    this.c.setHex(color);
    const [py, pz, parent] = PIVOTS[part];
    for (let i = 0; i < p.length / 3; i++) {
      this.pos.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      this.nor.push(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]);
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.rig.push(part, py, pz, parent);
      this.cloth.push(opts.tint ? 1 : 0);
    }
    return this;
  }

  /** Mirror-pair helper: the same shape on the figure's left (+x) and right. */
  pair(partL: number, make: () => THREE.BufferGeometry, color: number, x: number, y: number, z: number, opts: { rz?: number; tint?: boolean } = {}) {
    this.add(partL, make(), color, x, y, z, opts.rz ? { ...opts, rz: opts.rz } : opts);
    return this.add(partL + 1, make(), color, -x, y, z, opts.rz ? { ...opts, rz: -opts.rz } : opts);
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('rig', new THREE.Float32BufferAttribute(this.rig, 4));
    g.setAttribute('cloth', new THREE.Float32BufferAttribute(this.cloth, 1));
    return g;
  }
}

/** A low-poly Kolkata office-hour person in one geometry: tapered limbs, shoulders, hair, shoes, clothes. */
export function figure(L: Look): THREE.BufferGeometry {
  const f = new FigureBuilder(), S = SKEL;
  const long = L.dress === 'kurta' || L.dress === 'salwar';
  const legCol = L.bottom;
  // Legs: thigh, shin (bare under shorts, with a sock), shoe.
  f.pair(PART.thighL, () => slab(0.15, 0.18, S.hip - S.knee + 0.04, 0.16, 0.19), legCol, S.hipX, S.knee - 0.02, 0);
  f.pair(PART.shinL, () => slab(0.11, 0.145, S.knee - 0.07, 0.13, 0.16), L.shorts ? L.skin : legCol, S.hipX, 0.07, 0);
  if (L.shorts) f.pair(PART.shinL, () => slab(0.12, 0.12, 0.14, 0.14, 0.14), 0xf2f2f2, S.hipX, 0.06, 0);
  f.pair(PART.shinL, () => slab(0.13, 0.12, 0.09, 0.26, 0.22), L.shoes, S.hipX, 0, 0.045);
  // Hips and torso: narrow waist, broad shoulders.
  f.add(PART.torso, slab(0.36, 0.37, 0.14, 0.22, 0.23), L.bottom, 0, S.hip - 0.08, 0);
  const tintTop = L.dress !== 'uniform';
  f.add(PART.torso, slab(0.34, 0.48, S.shoulder + 0.07 - 0.86, 0.21, 0.25), L.top, 0, 0.86, 0, { tint: tintTop });
  if (L.dress === 'shirt' || L.dress === 'uniform') {
    f.add(PART.torso, slab(0.355, 0.355, 0.045, 0.225, 0.225), 0x2a211b, 0, 0.87, 0); // belt
    f.add(PART.torso, slab(0.22, 0.2, 0.06, 0.2, 0.18), L.top, 0, S.neck - 0.04, 0.01, { tint: tintTop }); // collar
  }
  if (L.dress === 'uniform' && L.accent !== undefined) f.add(PART.torso, slab(0.05, 0.04, 0.3, 0.02, 0.02), L.accent, 0, 1.08, 0.12); // tie
  if (long) f.add(PART.torso, slab(0.5, 0.37, S.hip - 0.46, 0.3, 0.24), L.top, 0, 0.47, 0, { tint: true }); // kurta/kameez skirt
  if (L.dress === 'saree') {
    f.add(PART.torso, slab(0.5, 0.37, S.hip - 0.06, 0.36, 0.25), L.bottom, 0, 0.06, 0, { tint: true }); // pleated drape
    const pallu = L.accent ?? L.bottom;
    f.add(PART.torso, slab(0.13, 0.13, 0.62, 0.03, 0.03), pallu, 0.03, 0.96, 0.125, { rz: -0.62, tint: true }); // across the chest
    f.add(PART.torso, slab(0.2, 0.16, 0.6, 0.03, 0.03), pallu, 0.14, 0.82, -0.135, { tint: true }); // down the back
  }
  if (L.dress === 'salwar' && L.accent !== undefined) {
    f.add(PART.torso, slab(0.4, 0.44, 0.07, 0.27, 0.27), L.accent, 0, S.shoulder - 0.02, 0); // dupatta round the shoulders
    f.add(PART.torso, slab(0.12, 0.14, 0.5, 0.03, 0.03), L.accent, 0.17, 0.88, -0.14); // and its tail
  }
  // Arms: sleeve, bare or sleeved forearm, hand.
  const sleeveLong = L.sleeves ? L.sleeves === 'long' : L.dress === 'kurta' || L.dress === 'salwar' || L.dress === 'shirt';
  f.pair(PART.armL, () => slab(0.11, 0.135, S.shoulder - S.elbow + 0.06, 0.115, 0.14), L.skin, S.shoulderX, S.elbow - 0.02, 0);
  f.pair(PART.armL, () => slab(0.135, 0.15, sleeveLong ? S.shoulder - S.elbow + 0.08 : 0.17, 0.14, 0.16), L.top, S.shoulderX, sleeveLong ? S.elbow - 0.03 : S.shoulder - 0.12, 0, { tint: tintTop });
  f.pair(PART.foreL, () => slab(0.085, 0.105, S.elbow - 0.82, 0.09, 0.11), sleeveLong ? L.top : L.skin, S.shoulderX, 0.83, 0, { tint: sleeveLong && tintTop });
  f.pair(PART.foreL, () => slab(0.07, 0.09, 0.1, 0.1, 0.09), L.skin, S.shoulderX, 0.74, 0.005);
  // Head: neck, a faceted head, a nose (so you can tell which way they face), hair.
  f.add(PART.head, slab(0.1, 0.1, 0.1, 0.1, 0.1), L.skin, 0, S.neck - 0.03, 0);
  f.add(PART.head, ball(0.15, 1.12), L.skin, 0, 1.6, 0);
  f.add(PART.head, slab(0.04, 0.035, 0.06, 0.05, 0.03), L.skin, 0, 1.55, 0.145);
  f.add(PART.head, ball(0.163, 1.1, Math.PI * 0.55), L.hair, 0, 1.61, -0.01, { rx: -0.45 }); // tipped back: forehead bare, nape covered
  if (L.longHair) {
    if (L.dress === 'saree') f.add(PART.head, ball(0.075), L.hair, 0, 1.6, -0.17); // bun
    else f.add(PART.head, slab(0.06, 0.08, 0.42, 0.05, 0.06), L.hair, 0, 1.18, -0.13, { rx: 0.08 }); // plait
  }
  // Bags and things carried.
  if (L.bag === 'backpack') {
    const c = L.bagColor ?? 0x2b2b2b;
    f.add(PART.torso, slab(0.34, 0.33, 0.44, 0.15, 0.13), c, 0, 0.94, -0.19);
    for (const x of [-0.13, 0.13]) f.add(PART.torso, slab(0.05, 0.05, 0.36, 0.02, 0.02), 0x1a1a1a, x, 1.04, 0.125); // straps
  } else if (L.bag === 'shoulder') {
    const c = L.bagColor ?? 0x6b3a2a;
    f.add(PART.torso, slab(0.035, 0.035, 0.66, 0.02, 0.02), c, -0.02, 0.98, 0.125, { rz: 0.72 }); // strap across
    f.add(PART.torso, slab(0.1, 0.1, 0.24, 0.26, 0.24), c, -0.25, 0.76, -0.04);
  }
  if (L.umbrella) {
    f.add(PART.foreR, slab(0.035, 0.035, 0.66, 0.035, 0.035), 0x222222, -S.shoulderX, 0.14, 0.03); // shaft
    f.add(PART.foreR, slab(0.06, 0.11, 0.44, 0.06, 0.11), 0x1f1f2a, -S.shoulderX, 0.24, 0.03); // furled canopy
  }
  return f.build();
}

// --- Shader -----------------------------------------------------------------------

const HIP = SKEL.hip.toFixed(3);
const GLSL_PARS = /* glsl */`
attribute vec4 rig;
attribute float cloth;
attribute vec4 anim0; // phase, swing (rad), lean (rad), head yaw
attribute vec4 anim1; // sit/tuck, squash, right arm, left arm (0..1 hold a phone, 1..2 reach up)
uniform float uRigTime;
void rSwing(inout vec3 p, inout vec3 n, float py, float pz, float a) {
  float c = cos(a), s = sin(a), dy = p.y - py, dz = p.z - pz;
  p.y = py + dy * c + dz * s; p.z = pz + dz * c - dy * s;
  float ny = n.y * c + n.z * s; n.z = n.z * c - n.y * s; n.y = ny;
}
void rYaw(inout vec3 p, inout vec3 n, float a) {
  float c = cos(a), s = sin(a);
  p.xz = vec2(p.x * c + p.z * s, p.z * c - p.x * s);
  n.xz = vec2(n.x * c + n.z * s, n.z * c - n.x * s);
}
void rigPose(inout vec3 p, inout vec3 n) {
  int part = int(rig.x + 0.5);
  float ph = anim0.x, A = anim0.y, s = sin(ph), c = cos(ph);
  float side = (part == 2 || part == 4 || part == 6 || part == 8) ? 1.0 : -1.0;
  float run = clamp((A - ${GAIT.elbowFrom.toFixed(3)}) * 3.0, 0.0, 1.0);
  if (part >= 2 && part <= 5) {
    float th = side * s * A + anim1.x * 1.5;
    if (part >= 4) rSwing(p, n, rig.y, rig.z, -(A * (1.1 + run) * max(0.0, side * c) + anim1.x * 1.6));
    rSwing(p, n, rig.w, 0.0, th);
  }
  if (part >= 6) {
    float v = side > 0.0 ? anim1.w : anim1.z, hold = clamp(v, 0.0, 1.0), up = clamp(v - 1.0, 0.0, 1.0);
    float upper = -side * s * A * (1.0 + 0.4 * run) * (1.0 - hold) + hold * 0.35 + up * 2.55;
    if (part >= 8) rSwing(p, n, rig.y, rig.z, (0.2 + run * 1.2) * (1.0 - hold) + hold * 1.5 * (1.0 - up));
    rSwing(p, n, part >= 8 ? rig.w : rig.y, 0.0, upper);
  }
  bool upperBody = part <= 1 || part >= 6;
  if (part == 1) rYaw(p, n, anim0.w);
  if (upperBody) {
    p.y += 0.008 * sin(uRigTime * 2.4 + ph) * (1.0 - min(1.0, A * 3.0)); // breathing when still
    rYaw(p, n, -s * A * 0.28); // shoulders counter the hips
    rSwing(p, n, ${HIP}, 0.0, -anim0.z); // lean into it
  }
  // Feet apart = hips lower: the bob at twice the step rate that keeps the planted foot on the ground.
  p.y -= ${HIP} * (1.0 - cos(A * s)) * 0.9;
  p.y *= 1.0 - anim1.y * 0.3;
  p.xz *= 1.0 + anim1.y * 0.15;
}
`;

export const rigTime = { value: 0 };

/** The shared material for every rigged figure. Instance colour tints clothes only (vertices with `cloth`). */
export const rigMat = new THREE.MeshLambertMaterial({ vertexColors: true });
rigMat.onBeforeCompile = (sh) => {
  sh.uniforms.uRigTime = rigTime;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', `#include <common>\n${GLSL_PARS}`)
    .replace('#include <color_vertex>', THREE.ShaderChunk.color_vertex.replace('vColor.rgb *= instanceColor.rgb;', 'vColor.rgb *= mix(vec3(1.0), instanceColor.rgb, cloth);'))
    .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvec3 rigPos = position;\nrigPose(rigPos, objectNormal);')
    .replace('#include <begin_vertex>', 'vec3 transformed = rigPos;');
};
rigMat.customProgramCacheKey = () => 'rig';

/** `count` rigged copies of `geo` in one draw call; poses go in through `setPose`. */
export function rigged(geo: THREE.BufferGeometry, count: number) {
  geo.setAttribute('anim0', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
  geo.setAttribute('anim1', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
  const im = new THREE.InstancedMesh(geo, rigMat, count);
  im.frustumCulled = false;
  return im;
}

export interface Pose { phase: number; swing: number; lean: number; look: number; sit: number; squash: number; armR: number; armL: number }
export const restPose = (): Pose => ({ phase: 0, swing: 0, lean: 0, look: 0, sit: 0, squash: 0, armR: 0, armL: 0 });

export function setPose(im: THREE.InstancedMesh, i: number, p: Pose) {
  const a0 = im.geometry.attributes.anim0 as THREE.InstancedBufferAttribute, a1 = im.geometry.attributes.anim1 as THREE.InstancedBufferAttribute;
  a0.setXYZW(i, p.phase, p.swing, p.lean, p.look);
  a1.setXYZW(i, p.sit, p.squash, p.armR, p.armL);
  a0.needsUpdate = a1.needsUpdate = true;
}

// --- Gait ---------------------------------------------------------------------------

/**
 * How someone moving at `speed` (units/s) walks: leg swing (radians), lean, how much of a run it is, the stride
 * (distance per full cycle, two steps) and the phase rate (radians/s). One cycle covers one stride, so
 * stride × cadence = speed: the feet never slide. `strideScale` shortens the step (a saree, a child).
 */
export function gait(speed: number, strideScale = 1) {
  const G = GAIT;
  const fade = Math.min(1, speed / G.fadeBelow);
  const swing = Math.min(G.maxSwing, G.swingBase + G.swingPerSpeed * speed) * fade * strideScale;
  const run = Math.max(0, Math.min(1, (speed - G.walkMax) / (G.runFrom - G.walkMax)));
  const stride = 4 * SKEL.hip * Math.sin(swing) * (1 + run * G.flight);
  const rate = stride > 1e-4 ? (2 * Math.PI * speed) / stride : 0;
  const lean = (G.lean[0] + (G.lean[1] - G.lean[0]) * run) * fade;
  return { swing, rate, stride, lean, run };
}

const approach = (a: number, b: number, k: number) => a + (b - a) * k;

/** What the player's body is doing this frame (from the sim). */
export interface BodyState { speed: number; airborne: boolean; vy: number; down: boolean; hang: boolean; sit: boolean }

/** The hero's animation: walk/run from real speed, shuffle when turning on the spot, tuck, squash, tumble, hang. */
export class HeroAnim {
  pose = restPose();
  private t = 0;
  private squashT = 0;
  private wasAir = false;
  private fallV = 0;
  private lastYaw: number | null = null;

  update(dt: number, s: BodyState, yaw: number) {
    const P = this.pose, k = Math.min(1, dt * 14);
    this.t += dt;
    const turn = this.lastYaw === null ? 0 : Math.abs(Math.atan2(Math.sin(yaw - this.lastYaw), Math.cos(yaw - this.lastYaw))) / Math.max(dt, 1e-3);
    this.lastYaw = yaw;
    if (this.wasAir && !s.airborne && !s.down) this.squashT = GAIT.landSecs * Math.min(1, this.fallV / 10 + 0.4);
    if (s.airborne) this.fallV = Math.max(0, -s.vy);
    this.wasAir = s.airborne;
    this.squashT = Math.max(0, this.squashT - dt);
    // Turning on the spot shuffles the feet.
    const speed = s.airborne || s.hang || s.sit ? 0 : Math.max(s.speed, s.speed < 0.6 ? Math.min(1.2, turn * GAIT.turnShuffle) : 0);
    const g = gait(speed);
    P.phase += g.rate * dt;
    let swing = g.swing, lean = g.lean, sit = 0, armR = 0, armL = 0;
    if (s.down) { // tumble: arms and legs everywhere
      P.phase += dt * 14; swing = 0.5; sit = 0.25; armR = 1.5 + 0.4 * Math.sin(this.t * 13); armL = 1.4 + 0.4 * Math.cos(this.t * 11); lean = 0;
    } else if (s.hang) { // one hand on the rail, feet scrabbling on the footboard
      swing = 0.18; P.phase = Math.PI / 2 + Math.sin(this.t * 3) * 0.3; armR = 2; armL = 0.15; sit = 0.1; lean = -0.15;
    } else if (s.sit) { // pillion: knees up, hands on the rider
      swing = 0; sit = 1; armR = armL = 0.7; lean = 0.1;
    } else if (s.airborne) { // jump: tuck the knees, arms up
      swing = 0.15; sit = s.vy > 0 ? 0.55 : 0.35; armR = armL = 1.25; lean = 0.1;
    }
    P.swing = approach(P.swing, swing, k); P.lean = approach(P.lean, lean, k); P.sit = approach(P.sit, sit, k);
    P.armR = approach(P.armR, armR, k); P.armL = approach(P.armL, armL, k);
    P.squash = this.squashT > 0 ? Math.sin((this.squashT / GAIT.landSecs) * Math.PI) * GAIT.landSquash : 0;
    P.look = speed < 0.1 && !s.down ? Math.sin(this.t * 0.6) * 0.35 * Math.max(0, Math.sin(this.t * 0.23)) : approach(P.look, 0, k);
    return P;
  }
}

/** A rigged one-figure group for the hero: position/rotate the group, call `animate` every frame. */
export class RiggedFigure extends THREE.Group {
  readonly mesh: THREE.InstancedMesh;
  readonly anim = new HeroAnim();
  constructor(look: Look) {
    super();
    this.mesh = rigged(figure(look), 1);
    this.mesh.setMatrixAt(0, new THREE.Matrix4());
    this.add(this.mesh);
  }

  animate(dt: number, s: BodyState) { setPose(this.mesh, 0, this.anim.update(dt, s, this.rotation.y)); }
}
