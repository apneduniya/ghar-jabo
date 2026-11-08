// Depth on the street-facing walls: real balconies with railings, striped shop awnings and a signboard
// for every shop. Each culling cell is ONE draw call: balconies and awnings are vertex-coloured and sample
// a white strip at the bottom of the sign atlas, so they share the signs' material.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Bay } from './buildings';
import { glowAtNight } from '../sky';

const FLOOR = 3.2, SHOP_H = 3.4;
const SIGNS = [
  ['MAA DURGA SWEETS', '#d9342b', '#fff6c9'], ['SRI GANESH TELECOM', '#1f5f9a', '#ffffff'], ['XEROX · LAMINATION', '#ffffff', '#1d1d1d'],
  ['BIRYANI BHAVAN', '#2b7a3b', '#ffe680'], ['ANNAPURNA HOTEL', '#f2c230', '#7a1f1f'], ['MEDICINE POINT 24×7', '#0e8a5b', '#ffffff'],
  ['PUCHKA CORNER', '#e86a1a', '#ffffff'], ['BIJOLI ELECTRICALS', '#1d1d1d', '#f2c230'], ['LOKNATH BASTRALAYA', '#8e2a6b', '#ffffff'],
  ['CYBER CAFÉ · PRINT', '#2f6db5', '#ffffff'], ['EGG ROLL · CHICKEN ROLL', '#c0281f', '#fff'], ['TEA · TOAST · OMELETTE', '#f6efe0', '#7a2a1f'],
  ['MOBILE REPAIRING', '#00a3a3', '#ffffff'], ['মিষ্টি মুখ', '#f08a24', '#ffffff'], ['NEW STAR TAILORS', '#5a3fa0', '#ffffff'], ['ঘরোয়া হোটেল', '#2b2b2b', '#ffd400'],
];
const AWNINGS = [0xd9342b, 0x1f8a46, 0x2f6db5, 0xf2c230, 0xe86a1a, 0x8e2a6b];

function signAtlas() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 1024; // signs fill the top half; the bottom half is plain white
  const g = cv.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 512, 1024, 512);
  SIGNS.forEach(([text, bg, fg], i) => {
    const x = (i % 4) * 256, y = Math.floor(i / 4) * 128;
    g.fillStyle = bg; g.fillRect(x, y, 256, 128);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6; g.strokeRect(x + 3, y + 3, 250, 122);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 46;
    g.font = `bold ${size}px system-ui, "Noto Sans Bengali", sans-serif`;
    while (g.measureText(text).width > 230 && size > 14) { size -= 2; g.font = `bold ${size}px system-ui, "Noto Sans Bengali", sans-serif`; }
    g.fillText(text, x + 128, y + 66);
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  // Same atlas for the night glow, minus the white strip, so lit signs glow and balconies don't.
  const gcv = document.createElement('canvas');
  gcv.width = cv.width; gcv.height = cv.height;
  const gg = gcv.getContext('2d')!;
  gg.drawImage(cv, 0, 0);
  gg.fillStyle = '#000'; gg.fillRect(0, 512, 1024, 512);
  const glow = new THREE.CanvasTexture(gcv);
  glow.colorSpace = THREE.SRGBColorSpace;
  return { map: t, glow };
}

const CELL = 110; // world units per culling cell: big enough that a view touches only a few
const DRAW_DISTANCE = 130;

/**
 * Balconies, awnings and signs for every street-facing wall, split into a grid of cells. Each cell is its own
 * small batch, so the frustum skips cells behind the camera and `cull()` hides cells beyond draw distance.
 * That's how the side lanes get the same depth as the main roads without the iPhone drawing all of it.
 */
export function buildFrontage(bays: Bay[]) {
  const group = new THREE.Group();
  const cells = new Map<string, Bay[]>();
  for (const b of bays) {
    const k = `${Math.floor(b.x / CELL)},${Math.floor(b.z / CELL)}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k)!.push(b);
  }
  const mat = cellMat(signAtlas());
  const meshes: { obj: THREE.Object3D; x: number; z: number }[] = [];
  for (const [k, list] of cells) {
    const [cx, cz] = k.split(',').map(Number);
    const cell = buildCell(list, mat);
    if (!cell) continue;
    group.add(cell);
    meshes.push({ obj: cell, x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL });
  }
  const cull = (x: number, z: number) => {
    for (const m of meshes) m.obj.visible = Math.hypot(m.x - x, m.z - z) < DRAW_DISTANCE + CELL / 2;
  };
  return { group, cull, counts: { bays: bays.length, cells: cells.size } };
}

const balconyGeo = mergeGeometries([
  new THREE.BoxGeometry(2.2, 0.15, 0.9).translate(0, 0, 0.45),
  new THREE.BoxGeometry(2.2, 0.9, 0.06).translate(0, 0.5, 0.88),
  new THREE.BoxGeometry(0.06, 0.9, 0.9).translate(-1.07, 0.5, 0.45),
  new THREE.BoxGeometry(0.06, 0.9, 0.9).translate(1.07, 0.5, 0.45),
].map((g) => g.toNonIndexed()));
const awningGeo = new THREE.BoxGeometry(2.8, 0.08, 1.3).translate(0, 0, 0.65).rotateX(0.32).toNonIndexed();
const cellMat = (atlas: { map: THREE.Texture; glow: THREE.Texture }) =>
  glowAtNight(new THREE.MeshLambertMaterial({ map: atlas.map, vertexColors: true, emissive: 0xffffff, emissiveMap: atlas.glow, emissiveIntensity: 0 }), 0.75);

/** A copy of `geo` placed at pos/rot, painted one colour, every UV on the atlas's white strip. */
function painted(geo: THREE.BufferGeometry, pos: THREE.Vector3, rot: number, c: THREE.Color) {
  const g = geo.clone().rotateY(rot).translate(pos.x, pos.y, pos.z);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { col.set([c.r, c.g, c.b], i * 3); uv.set([0.5, 0.25], i * 2); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

function buildCell(bays: Bay[], mat: THREE.Material) {
  const geos: THREE.BufferGeometry[] = [];
  const white = new THREE.Color(1, 1, 1);
  for (const b of bays) {
    const rot = Math.atan2(b.nx, b.nz); // local +z faces out of the wall
    const base = b.shop ? SHOP_H : 0;
    for (let f = 1; f < Math.min(b.floors, 7); f++) {
      if ((b.k + f) % 3 === 0) continue; // not every flat has a balcony
      geos.push(painted(balconyGeo, new THREE.Vector3(b.x, base + f * FLOOR - 0.1, b.z), rot, b.tint.clone().multiplyScalar(0.9)));
    }
    if (b.shop) {
      geos.push(painted(awningGeo, new THREE.Vector3(b.x + b.nx * 0.05, SHOP_H - 0.55, b.z + b.nz * 0.05), rot, new THREE.Color(AWNINGS[b.k % AWNINGS.length])));
      const i = b.k % SIGNS.length;
      const sg = new THREE.PlaneGeometry(2.7, 0.75).toNonIndexed();
      const uv = sg.attributes.uv as THREE.BufferAttribute;
      const u0 = (i % 4) / 4, v0 = 1 - (Math.floor(i / 4) + 1) / 8;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 4, v0 + uv.getY(k) / 8);
      const n = sg.attributes.position.count;
      sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(white.r), 3));
      sg.rotateY(rot);
      sg.translate(b.x + b.nx * 0.08, SHOP_H - 0.05, b.z + b.nz * 0.08);
      geos.push(sg);
    }
  }
  if (!geos.length) return null; // e.g. a cell of single-storey walls with no shops
  const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
  mesh.geometry.computeBoundingSphere(); // so the frustum can skip this cell
  return mesh;
}
