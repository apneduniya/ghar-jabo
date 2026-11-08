// Depth on the street-facing walls: real balconies with railings, striped shop awnings and a signboard
// for every shop. Balconies and awnings are instanced (one draw call each); all signs share one atlas.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Bay } from './buildings';

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
  cv.width = 1024; cv.height = 512;
  const g = cv.getContext('2d')!;
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
  return t;
}

export function buildFrontage(bays: Bay[]) {
  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);

  // Balcony: slab, front railing and two side rails, built facing +z (outwards) and placed per instance.
  const balconyGeo = mergeGeometries([
    new THREE.BoxGeometry(2.2, 0.15, 0.9).translate(0, 0, 0.45),
    new THREE.BoxGeometry(2.2, 0.9, 0.06).translate(0, 0.5, 0.88),
    new THREE.BoxGeometry(0.06, 0.9, 0.9).translate(-1.07, 0.5, 0.45),
    new THREE.BoxGeometry(0.06, 0.9, 0.9).translate(1.07, 0.5, 0.45),
  ].map((g) => g.toNonIndexed()));
  const awningGeo = new THREE.BoxGeometry(2.8, 0.08, 1.3).translate(0, 0, 0.65).rotateX(0.32);

  const balconies: { pos: THREE.Vector3; rot: number; c: THREE.Color }[] = [];
  const awnings: { pos: THREE.Vector3; rot: number; c: THREE.Color }[] = [];
  const signs: THREE.BufferGeometry[] = [];
  for (const b of bays) {
    const rot = Math.atan2(b.nx, b.nz); // local +z faces out of the wall
    const base = b.shop ? SHOP_H : 0;
    for (let f = 1; f < Math.min(b.floors, 7); f++) {
      if ((b.k + f) % 3 === 0) continue; // not every flat has a balcony
      balconies.push({ pos: new THREE.Vector3(b.x, base + f * FLOOR - 0.1, b.z), rot, c: b.tint.clone().multiplyScalar(0.9) });
    }
    if (b.shop) {
      awnings.push({ pos: new THREE.Vector3(b.x + b.nx * 0.05, SHOP_H - 0.55, b.z + b.nz * 0.05), rot, c: new THREE.Color(AWNINGS[b.k % AWNINGS.length]) });
      const i = b.k % SIGNS.length;
      const sg = new THREE.PlaneGeometry(2.7, 0.75);
      const uv = sg.attributes.uv as THREE.BufferAttribute;
      const u0 = (i % 4) / 4, v0 = 1 - (Math.floor(i / 4) + 1) / 4;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 4, v0 + uv.getY(k) / 4);
      sg.rotateY(rot);
      sg.translate(b.x + b.nx * 0.08, SHOP_H - 0.05, b.z + b.nz * 0.08);
      signs.push(sg.toNonIndexed());
    }
  }

  const place = (geo: THREE.BufferGeometry, list: typeof balconies) => {
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, list.length));
    list.forEach((it, i) => {
      q.setFromAxisAngle(up, it.rot);
      m.compose(it.pos, q, one);
      im.setMatrixAt(i, m);
      im.setColorAt(i, it.c);
    });
    im.count = list.length;
    return im;
  };
  group.add(place(balconyGeo, balconies), place(awningGeo, awnings));
  if (signs.length) group.add(new THREE.Mesh(mergeGeometries(signs), new THREE.MeshLambertMaterial({ map: signAtlas() })));
  return { group, counts: { balconies: balconies.length, awnings: awnings.length, signs: signs.length } };
}
