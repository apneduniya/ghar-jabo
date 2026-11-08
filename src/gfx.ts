// Shared three.js renderer and the low-poly kit: boxes, people, vehicles, buildings.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const canvas = document.getElementById('gl') as HTMLCanvasElement;
const phone = matchMedia('(pointer: coarse)').matches;
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: !phone, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 2));
renderer.shadowMap.enabled = false;

export const C = {
  sky: 0xf2a96b,
  skyTop: 0x6a4c8c,
  road: 0x4a4650,
  lane: 0xf4efe6,
  kerbA: 0xf5c518,
  kerbB: 0x222222,
  footpath: 0xb9a99a,
  busBlue: 0x2f6db5,
  busWhite: 0xf1efe8,
  taxi: 0xf5c518,
  metro: 0x2e9e5b,
  viaduct: 0xc9c2ba,
  tower: 0x8fa9c4,
  glass: 0x5d7fa3,
  skin: 0xc68a5e,
  shirt: [0xd9534f, 0x3f7cc4, 0x6cae5a, 0xe0a83a, 0x8e5bb5, 0xeeeeee, 0x2b2b2b],
  pants: [0x2c3e50, 0x34495e, 0x4b3b2a, 0x222222],
  player: 0xff7a1a,
  lamp: 0xffb347,
};

const mats = new Map<number, THREE.MeshLambertMaterial>();
export function mat(color: number) {
  let m = mats.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); mats.set(color, m); }
  return m;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
export function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(boxGeo, mat(color));
  m.scale.set(w, h, d);
  m.position.set(x, y + h / 2, z);
  return m;
}

const bakedMat = new THREE.MeshLambertMaterial({ vertexColors: true });

/**
 * Merge every plain-coloured mesh under `root` into one vertex-coloured mesh, so it costs one draw call
 * instead of one per box. Textured meshes (signs) are kept as they are. Returns the merged mesh.
 */
export function bake(root: THREE.Object3D): THREE.Mesh | null {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const geos: THREE.BufferGeometry[] = [];
  const doomed: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o.userData.keep) return;
    const material = m.material as THREE.MeshLambertMaterial;
    if (Array.isArray(material) || material.map || material.vertexColors || material.transparent) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = material.color.r; col[i * 3 + 1] = material.color.g; col[i * 3 + 2] = material.color.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
    geos.push(g);
    doomed.push(m);
  });
  if (!geos.length) return null;
  for (const m of doomed) m.parent?.remove(m);
  const merged = new THREE.Mesh(mergeGeometries(geos), bakedMat);
  root.add(merged);
  return merged;
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pickColor = (xs: number[]) => xs[Math.floor(Math.random() * xs.length)];

/** A blocky person, about 1.7 units tall, origin at the feet. */
export function person(shirt = pickColor(C.shirt), opts: { umbrella?: boolean; bag?: boolean } = {}): THREE.Group {
  const g = new THREE.Group();
  const pants = pickColor(C.pants);
  g.add(box(0.18, 0.75, 0.2, pants, -0.12, 0, 0));
  g.add(box(0.18, 0.75, 0.2, pants, 0.12, 0, 0));
  g.add(box(0.55, 0.6, 0.3, shirt, 0, 0.75, 0));
  g.add(box(0.14, 0.55, 0.16, shirt, -0.36, 0.8, 0));
  g.add(box(0.14, 0.55, 0.16, shirt, 0.36, 0.8, 0));
  g.add(box(0.32, 0.32, 0.3, C.skin, 0, 1.38, 0));
  g.add(box(0.34, 0.1, 0.32, 0x1d1d1d, 0, 1.68, 0));
  if (opts.bag) g.add(box(0.42, 0.45, 0.18, 0x2b2b2b, 0, 0.8, -0.24));
  if (opts.umbrella) {
    g.add(box(0.04, 1.0, 0.04, 0x222222, 0.42, 0.9, 0));
  }
  bake(g);
  return g;
}

export function playerPerson() { return person(C.player, { bag: true }); }

export function car(color: number, long = 2.2): THREE.Group {
  const g = new THREE.Group();
  g.add(box(long, 0.55, 1.1, color, 0, 0.2, 0));
  g.add(box(long * 0.55, 0.45, 1.0, color, -0.1, 0.75, 0));
  g.add(box(long * 0.5, 0.36, 1.02, 0x2a3440, -0.1, 0.8, 0));
  for (const x of [-long * 0.32, long * 0.32]) for (const z of [-0.5, 0.5]) g.add(box(0.36, 0.36, 0.12, 0x111111, x, 0.02, z));
  bake(g);
  return g;
}

export function taxi() { return ambassador(); }

/** Rear door position along a Kolkata bus (local x; the bus faces +x). Doors are on the left side, local -z. */
export const BUS_REAR_DOOR = -1.9;
export const BUS_FRONT_DOOR = 3.2;
export const BUS_LEN = 10;
export const BUS_WIDTH = 2.5;

const busSlogans = [
  'মা তারা ভরসা', 'জয় বাবা লোকনাথ', 'MAA TARA BHAROSA', 'JOY BABA LOKNATH', 'AASTE LADIES · KOLE BACHCHA',
  'PICHHONE EGIYE JAAN', 'MAYER ASHIRBAD', 'BIPODE MA', 'HORN PLEASE · USE DIPPER AT NIGHT', 'NO SMOKING · NO SPITTING · NO HOPE',
];
const busBoards = ['SEALDAH ↔ SECTOR V', 'শিয়ালদহ — সেক্টর ফাইভ', 'KARUNAMOYEE · SEALDAH', 'HOWRAH ↔ SALT LAKE', 'ULTADANGA · SEALDAH'];

/** Paint text onto a canvas texture. */
function textTexture(text: string, w: number, h: number, bg: string, fg: string, bold = true) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = Math.max(32, Math.round(512 * (h / w)));
  const g = cv.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = fg;
  let size = cv.height * 0.62;
  const font = (n: number) => `${bold ? 'bold ' : ''}${n}px system-ui, "Noto Sans Bengali", sans-serif`;
  g.font = font(size);
  while (g.measureText(text).width > cv.width * 0.92 && size > 8) { size -= 2; g.font = font(size); }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, cv.width / 2, cv.height / 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function panel(text: string, w: number, h: number, bg: string, fg: string) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(text, w, h, bg, fg) }));
}

/**
 * A Kolkata bus: a blue-and-white government bus or a red private one, doors on the left (local -z),
 * destination board up front, a painted slogan along the side and a conductor hanging at the rear door.
 */
export function bus(variant: 'govt' | 'private' = Math.random() < 0.55 ? 'govt' : 'private'): THREE.Group {
  const g = new THREE.Group();
  const L = BUS_LEN, W = BUS_WIDTH;
  const lower = variant === 'govt' ? 0x2f6db5 : 0xb3262b;
  const upper = variant === 'govt' ? 0xf1efe8 : 0xf2c14e;
  const stripe = variant === 'govt' ? 0xf5c518 : 0x1f7a3a;
  g.add(box(L, 1.3, W, lower, 0, 0.45, 0));
  g.add(box(L, 1.25, W, upper, 0, 1.75, 0));
  g.add(box(L + 0.02, 0.62, W + 0.02, 0x2a3440, 0, 2.0, 0)); // window band
  g.add(box(L + 0.04, 0.14, W + 0.04, stripe, 0, 1.68, 0));
  g.add(box(L - 0.6, 0.12, W - 0.3, 0xdddddd, 0, 3.0, 0)); // roof
  g.add(box(0.12, 0.7, W - 0.4, 0x2a3440, L / 2, 1.9, 0)); // windscreen
  // Door openings on the left side: dark recesses, front and rear.
  for (const dx of [BUS_FRONT_DOOR, BUS_REAR_DOOR]) g.add(box(1.1, 2.3, 0.1, 0x161616, dx, 0.35, -W / 2 - 0.02));
  for (const x of [-L / 2 + 1.6, L / 2 - 1.8]) for (const z of [-W / 2, W / 2]) g.add(box(1.0, 1.0, 0.25, 0x111111, x, 0, z));
  // Destination board above the windscreen.
  const board = panel(busBoards[Math.floor(Math.random() * busBoards.length)], 2.2, 0.38, '#111', '#ffb347');
  board.position.set(L / 2 + 0.07, 2.62, 0);
  board.rotation.y = Math.PI / 2;
  g.add(board);
  // Painted slogan on both sides, under the windows.
  const slogan = busSlogans[Math.floor(Math.random() * busSlogans.length)];
  const fg = variant === 'govt' ? '#ffffff' : '#ffe680';
  const bg = variant === 'govt' ? '#2f6db5' : '#b3262b';
  for (const side of [-1, 1]) {
    const s = panel(slogan, 5.2, 0.55, bg, fg);
    s.position.set(-0.4, 0.95, side * (W / 2 + 0.03));
    if (side < 0) s.rotation.y = Math.PI;
    g.add(s);
  }
  const back = panel('HORN PLEASE · OK TATA', 2, 0.4, bg, fg);
  back.position.set(-L / 2 - 0.03, 1.0, 0);
  back.rotation.y = -Math.PI / 2;
  g.add(back);
  // The conductor, half out of the rear door.
  const cond = person(0x6b5d4a);
  cond.position.set(BUS_REAR_DOOR + 0.1, 0.55, -W / 2 - 0.25);
  cond.rotation.y = Math.PI;
  cond.rotation.x = 0.12;
  g.add(cond);
  bake(g);
  return g;
}

/** The yellow Ambassador taxi: rounded hump, black bumpers, roof sign. */
export function ambassador(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(2.5, 0.55, 1.15, C.taxi, 0, 0.22, 0));
  g.add(box(1.2, 0.5, 1.05, C.taxi, -0.15, 0.75, 0));
  g.add(box(1.1, 0.36, 1.07, 0x2a3440, -0.15, 0.8, 0));
  g.add(box(0.5, 0.2, 1.1, C.taxi, 0.8, 0.6, 0)); // bonnet hump
  g.add(box(0.08, 0.16, 1.2, 0x222222, 1.27, 0.25, 0), box(0.08, 0.16, 1.2, 0x222222, -1.27, 0.25, 0));
  g.add(box(0.5, 0.14, 0.3, 0x222222, -0.15, 1.25, 0));
  for (const x of [-0.8, 0.8]) for (const z of [-0.55, 0.55]) g.add(box(0.4, 0.4, 0.12, 0x111111, x, 0.02, z));
  bake(g);
  return g;
}

export function bike(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.5, 0.35, 0.3, 0xd9534f, 0, 0.45, 0));
  g.add(box(0.5, 0.5, 0.12, 0x111111, -0.6, 0, 0));
  g.add(box(0.5, 0.5, 0.12, 0x111111, 0.6, 0, 0));
  g.add(box(0.1, 0.6, 0.6, 0x333333, 0.6, 0.6, 0));
  bake(g);
  return g;
}

export function building(w: number, h: number, d: number, color: number, windows = true): THREE.Group {
  const g = new THREE.Group();
  g.add(box(w, h, d, color));
  if (windows) {
    const rows = Math.floor(h / 1.6);
    const cols = Math.max(1, Math.floor(w / 1.4));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const lit = Math.random() < 0.55;
      g.add(box(0.7, 0.8, 0.05, lit ? 0xffd88a : 0x3b3f55, -w / 2 + (c + 0.5) * (w / cols), 0.6 + r * 1.6, d / 2 + 0.02));
    }
  }
  return g;
}

/** A flat signboard with text drawn on a canvas texture. */
export function sign(text: string, w: number, h: number, bg = '#1f5f3a', fg = '#ffffff'): THREE.Mesh {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = Math.round(512 * (h / w));
  const g = cv.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = fg;
  let size = cv.height * 0.6;
  g.font = `bold ${size}px system-ui, sans-serif`;
  while (g.measureText(text).width > cv.width * 0.9 && size > 10) { size -= 2; g.font = `bold ${size}px system-ui, sans-serif`; }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, cv.width / 2, cv.height / 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  return m;
}

/** Dusk lighting and sky shared by outdoor scenes. */
export function duskScene(): THREE.Scene {
  const s = new THREE.Scene();
  s.background = new THREE.Color(C.sky);
  s.fog = new THREE.Fog(C.sky, 40, 110);
  s.add(new THREE.HemisphereLight(0xffe2c4, 0x40304a, 1.6));
  const sun = new THREE.DirectionalLight(0xffc48a, 1.4);
  sun.position.set(-20, 30, 10);
  s.add(sun);
  return s;
}

/** Fit the renderer to the window. Side views pass a wider portrait FOV so the scene fits a phone. */
export function resize(camera: THREE.PerspectiveCamera, landscapeFov = camera.fov, portraitFov = landscapeFov) {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? portraitFov : landscapeFov;
  camera.updateProjectionMatrix();
  camera.userData.fovs = [landscapeFov, portraitFov];
}

/** Camera shake with a decaying amplitude. Call apply() after positioning the camera each frame. */
export class Shake {
  private t = 0;
  private amp = 0;
  kick(amp = 0.4, dur = 0.35) { this.amp = amp; this.t = dur; }
  apply(camera: THREE.Camera, dt: number) {
    if (this.t <= 0) return;
    this.t -= dt;
    const a = this.amp * Math.max(0, this.t) * 3;
    camera.position.x += (Math.random() - 0.5) * a;
    camera.position.y += (Math.random() - 0.5) * a;
  }
}

/** Downscaled JPEG of the current frame, for the newspaper photo. */
export function capturePhoto(): string {
  const w = 640;
  const h = Math.round(w * (canvas.height / canvas.width));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = Math.min(h, 640);
  const g = cv.getContext('2d')!;
  const srcH = canvas.width * (cv.height / w);
  g.drawImage(canvas, 0, (canvas.height - srcH) / 2, canvas.width, srcH, 0, 0, w, cv.height);
  return cv.toDataURL('image/jpeg', 0.8);
}
