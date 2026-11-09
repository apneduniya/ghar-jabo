// Trees and palms, instanced: big rain trees whose canopies cover the footpath, rounder mango and peepal
// trees, and coconut, areca and royal palms. Four draw calls for every tree on the map: trunks (palm trunks
// too, tinted per instance), wide canopies, round canopies, and palm crowns.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type PalmKind = 'coconut' | 'areca' | 'royal';
interface Tree { x: number; z: number; s: number; kind: 'rain' | 'round' | PalmKind; lean: number }

/** Deterministic 0..1 from a position, for size and tint variety. */
const h01 = (x: number, z: number, k = 0) => (Math.abs(Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453) % 1);

/** A lumpy canopy: a few squashed icosahedra merged, so the silhouette isn't one ball. */
function canopy(lumps: [number, number, number, number][]) {
  return mergeGeometries(lumps.map(([x, y, z, r]) => {
    const g = new THREE.IcosahedronGeometry(r, 0).toNonIndexed();
    g.scale(1, 0.62, 1);
    g.translate(x, y, z);
    g.deleteAttribute('uv');
    return g;
  }));
}

/** Palm crown: drooping fronds as thin bent blades around the top, plus a few nuts. Unit size, top at y = 0. */
function crown() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    // Two segments per frond: up and out, then out and down.
    for (const [len, tilt, off] of [[1.3, 0.35, 0], [1.4, -0.55, 1.15]] as const) {
      const g = new THREE.BoxGeometry(len, 0.04, 0.42).toNonIndexed();
      g.translate(len / 2, 0, 0);
      g.rotateZ(tilt);
      g.translate(off, off ? Math.sin(0.35) * 1.25 : 0, 0);
      g.rotateY(a);
      g.deleteAttribute('uv');
      parts.push(g);
    }
  }
  const nuts = new THREE.IcosahedronGeometry(0.22, 0).toNonIndexed();
  nuts.translate(0.15, -0.2, 0);
  nuts.deleteAttribute('uv');
  parts.push(nuts);
  return mergeGeometries(parts);
}

/**
 * Foliage dissolves (dithered) close to the camera, so the chase camera never ends up looking at the inside of a
 * canopy over the footpath.
 */
function nearFade(m: THREE.MeshLambertMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float camD = length(vViewPosition);
      if (camD < 10.0 && fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) > (camD - 5.0) / 5.0) discard;`);
  };
  return m;
}

export class Forest {
  trees: Tree[] = [];
  rain(x: number, z: number, s = 1) { this.trees.push({ x, z, s, kind: 'rain', lean: 0 }); }
  round(x: number, z: number, s = 1) { this.trees.push({ x, z, s, kind: 'round', lean: 0 }); }
  palm(x: number, z: number, kind: PalmKind, s = 1) { this.trees.push({ x, z, s, kind, lean: kind === 'coconut' ? (h01(x, z, 3) - 0.5) * 0.3 : 0 }); }

  /** Is (x, z) within `r` of a tree already planted? */
  near(x: number, z: number, r: number) { return this.trees.some((t) => Math.hypot(t.x - x, t.z - z) < r); }

  build(root: THREE.Object3D) {
    const list = this.trees;
    if (!list.length) return;
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.65, 1, 6).translate(0, 0.5, 0);
    const wideGeo = canopy([[0, 0, 0, 3.4], [2.4, -0.4, 0.8, 2.4], [-2.2, -0.3, -0.9, 2.5], [0.4, 0.5, -2.2, 2.2], [-0.6, -0.2, 2.3, 2.2]]);
    const roundGeo = canopy([[0, 0, 0, 2.4], [0.9, 1.3, 0.3, 1.8], [-0.8, 1.0, -0.4, 1.7], [0.2, -0.9, 1.0, 1.7]]);
    const crownGeo = crown();
    const mk = (geo: THREE.BufferGeometry, color: number, n: number, fade = true) => {
      const mat = new THREE.MeshLambertMaterial({ color });
      const m = new THREE.InstancedMesh(geo, fade ? nearFade(mat) : mat, Math.max(1, n));
      m.count = n;
      return m;
    };
    const wide = list.filter((t) => t.kind === 'rain'), round = list.filter((t) => t.kind === 'round');
    const palms = list.filter((t) => t.kind !== 'rain' && t.kind !== 'round');
    const trunks = mk(trunkGeo, 0xffffff, list.length, false);
    const wideMesh = mk(wideGeo, 0xffffff, wide.length), roundMesh = mk(roundGeo, 0xffffff, round.length), crownMesh = mk(crownGeo, 0xffffff, palms.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    const bark = [0x5b4636, 0x6a5240, 0x4f4034], palmBark = { coconut: 0x8a7a66, areca: 0x7f8a6a, royal: 0xb8b4aa };
    const leaf = [0x4f7a3a, 0x3f6b33, 0x5c8a3f, 0x476f36, 0x6a8f45];
    let ti = 0, wi = 0, ri = 0, pi = 0;
    for (const t of list) {
      const v = h01(t.x, t.z), rot = v * Math.PI * 2;
      if (t.kind === 'rain' || t.kind === 'round') {
        const H = (t.kind === 'rain' ? 4.2 : 3.4) * t.s, R = (t.kind === 'rain' ? 0.75 : 0.55) * t.s;
        m.compose(p.set(t.x, 0, t.z), q.setFromEuler(e.set(0, rot, 0)), sc.set(R, H + 1, R));
        trunks.setMatrixAt(ti, m); trunks.setColorAt(ti++, c.setHex(bark[Math.floor(v * 3) % 3]));
        const k = t.s * (0.85 + h01(t.x, t.z, 1) * 0.3);
        m.compose(p.set(t.x, H + (t.kind === 'rain' ? 1.6 : 2.2) * t.s, t.z), q, sc.set(k, k * (0.9 + v * 0.2), k));
        const target = t.kind === 'rain' ? wideMesh : roundMesh;
        const idx = t.kind === 'rain' ? wi++ : ri++;
        target.setMatrixAt(idx, m); target.setColorAt(idx, c.setHex(leaf[Math.floor(h01(t.x, t.z, 2) * leaf.length)]));
        continue;
      }
      // Palms: a thin trunk (leaning a little for coconuts) and a crown at its top.
      const H = { coconut: 8, areca: 5.5, royal: 9 }[t.kind] * t.s;
      const r = { coconut: 0.3, areca: 0.16, royal: 0.45 }[t.kind] * t.s;
      e.set(t.lean * Math.cos(rot), 0, t.lean * Math.sin(rot));
      q.setFromEuler(e);
      m.compose(p.set(t.x, 0, t.z), q, sc.set(r, H, r));
      trunks.setMatrixAt(ti, m); trunks.setColorAt(ti++, c.setHex(palmBark[t.kind]));
      const top = new THREE.Vector3(0, H, 0).applyQuaternion(q).add(p.set(t.x, 0, t.z));
      const k = { coconut: 1.9, areca: 1.2, royal: 2.2 }[t.kind] * t.s;
      m.compose(top, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), sc.set(k, k, k));
      crownMesh.setMatrixAt(pi, m); crownMesh.setColorAt(pi++, c.setHex(t.kind === 'areca' ? 0x6f9a45 : 0x5d8a3a));
    }
    for (const im of [trunks, wideMesh, roundMesh, crownMesh]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      if (im.count) root.add(im);
    }
  }
}
