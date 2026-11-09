// Shared three.js renderer and the low-poly kit: boxes, people, vehicles, buildings.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const canvas = document.getElementById('gl') as HTMLCanvasElement;
const phone = matchMedia('(pointer: coarse)').matches;
// No preserveDrawingBuffer: photos are captured right after a render instead (see app/main.ts).
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: !phone, powerPreference: 'high-performance' });
export const maxPixelRatio = Math.min(devicePixelRatio, phone ? 1.5 : 2);
renderer.setPixelRatio(maxPixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
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

/** 0 by day, 1 at night. Baked vertices with a `glow` value (headlights, lamps) light up as it rises. */
export const nightUniform = { value: 0 };
export const bakedMat = new THREE.MeshLambertMaterial({ vertexColors: true });
bakedMat.onBeforeCompile = (sh) => {
  sh.uniforms.uNight = nightUniform;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float glow;\nvarying float vGlow;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = glow;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying float vGlow;')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vGlow * uNight * 1.6;');
};

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
    if (!m.isMesh || o.userData.keep || (m as THREE.InstancedMesh).isInstancedMesh) return;
    const material = m.material as THREE.MeshLambertMaterial;
    if (Array.isArray(material) || material.map || material.transparent) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    // Already-baked meshes (e.g. a person riding a bike) keep their own vertex colours.
    if (!(material.vertexColors && g.attributes.color)) {
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = material.color.r; col[i * 3 + 1] = material.color.g; col[i * 3 + 2] = material.color.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    if (!g.attributes.glow) {
      const glow = Number(m.userData.glow ?? 0);
      g.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(glow), 1));
    }
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'glow'].includes(k)) g.deleteAttribute(k);
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

/**
 * Pack every static canvas-textured sign under `root` into one texture atlas and one mesh.
 * Forty separate signboards become a single draw call. Moving things (vehicles) must not be under `root`.
 */
export function batchSigns(root: THREE.Object3D): THREE.Mesh | null {
  root.updateMatrixWorld(true);
  const found: { mesh: THREE.Mesh; img: HTMLCanvasElement; side: THREE.Side }[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o.userData.keep) return;
    const mat = m.material as THREE.MeshBasicMaterial;
    const img = (mat as THREE.MeshBasicMaterial).map?.image as HTMLCanvasElement | undefined;
    if (Array.isArray(m.material) || !(mat instanceof THREE.MeshBasicMaterial) || !(img instanceof HTMLCanvasElement)) return;
    if (img.width > 1024) return; // atlases themselves (bus text) are left alone
    found.push({ mesh: m, img, side: mat.side });
  });
  if (found.length < 2) return null;
  // Shelf-pack scaled-down copies into a 2048-wide atlas.
  const W = 2048, scale = 0.5;
  let x = 0, y = 0, rowH = 0;
  const slots = found.map((f) => {
    const w = Math.ceil(f.img.width * scale), h = Math.ceil(f.img.height * scale);
    if (x + w > W) { x = 0; y += rowH + 2; rowH = 0; }
    const s = { x, y, w, h };
    x += w + 2; rowH = Math.max(rowH, h);
    return s;
  });
  const H = THREE.MathUtils.ceilPowerOfTwo(y + rowH);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const geos: THREE.BufferGeometry[] = [];
  found.forEach((f, i) => {
    const s = slots[i];
    g.drawImage(f.img, s.x, s.y, s.w, s.h);
    const geo = (f.mesh.geometry.index ? f.mesh.geometry.toNonIndexed() : f.mesh.geometry.clone());
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, f.mesh.matrixWorld));
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (s.x + uv.getX(k) * s.w) / W, 1 - (s.y + (1 - uv.getY(k)) * s.h) / H);
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    geos.push(geo);
    f.mesh.parent?.remove(f.mesh);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  root.add(mesh);
  return mesh;
}
