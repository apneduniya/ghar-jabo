// Sector V's trees and palms, from the shared tree kit (trees.ts): the surveyed big roadside trees (rain trees
// with the odd gulmohar), rounder trees (neem, debdaru, banyan), median saplings, and coconut, areca and royal
// palms. Every tree is baked into two world-space meshes, so the whole forest costs two draw calls: wood
// (trunks, limbs, painted bases, platforms) and leaves (crowns and fronds, dissolving near the camera and
// swaying in the wind).

import * as THREE from 'three';
import { TREES } from '../../content/worldgen';
import { addWind, pickWeighted, type Species, treeKit, VARIANTS, windUniform } from './trees';

type PalmKind = 'coconut' | 'areca' | 'royal';
interface Tree { x: number; z: number; s: number; species: Species }

/** Deterministic 0..1 from a position, for species, size and tint variety. */
const h01 = (x: number, z: number, k = 0) => (Math.abs(Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453) % 1);

/**
 * Foliage dissolves (dithered) close to the camera, so the chase camera never ends up looking at the inside of a
 * canopy over the footpath.
 */
function nearFade(m: THREE.MeshLambertMaterial, leaf: boolean) {
  m.onBeforeCompile = (sh) => {
    addWind(sh, leaf, TREES.wind);
    if (!leaf) return;
    sh.fragmentShader = sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float camD = length(vViewPosition);
      if (camD < 10.0 && fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) > (camD - 5.0) / 5.0) discard;`);
  };
  m.customProgramCacheKey = () => (leaf ? 'tree-leaf' : 'tree-wood');
  return m;
}

/** A growable world-space mesh buffer: tree shapes are appended under a matrix, colours tinted. */
class Bake {
  pos: number[] = []; nor: number[] = []; col: number[] = []; idx: number[] = [];
  add(g: THREE.BufferGeometry, m: THREE.Matrix4, tint: THREE.Color) {
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color, base = this.pos.length / 3;
    const nm = new THREE.Matrix3().getNormalMatrix(m), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m); this.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); this.nor.push(v.x, v.y, v.z);
      this.col.push(c.getX(i) * tint.r, c.getY(i) * tint.g, c.getZ(i) * tint.b);
    }
    const ix = g.index!;
    for (let i = 0; i < ix.count; i++) this.idx.push(base + ix.getX(i));
  }
  mesh(mat: THREE.Material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return new THREE.Mesh(g, mat);
  }
}

export class Forest {
  trees: Tree[] = [];
  private add(x: number, z: number, s: number, mix: Partial<Record<Species, number>>) { this.trees.push({ x, z, s, species: pickWeighted(mix, h01(x, z, 5)) }); }
  /** A big roadside tree: mostly rain trees, the odd gulmohar. */
  rain(x: number, z: number, s = 1) { this.add(x, z, s, TREES.sectorv.rain); }
  /** A rounder tree: neem, debdaru or banyan; small ones (medians) are neem or debdaru saplings. */
  round(x: number, z: number, s = 1) { this.add(x, z, s < 0.6 ? s * 1.4 : s, s < 0.6 ? TREES.sectorv.median : TREES.sectorv.round); }
  palm(x: number, z: number, kind: PalmKind, s = 1) { this.trees.push({ x, z, s, species: kind }); }

  /** Is (x, z) within `r` of a tree already planted? */
  near(x: number, z: number, r: number) { return this.trees.some((t) => Math.hypot(t.x - x, t.z - z) < r); }

  build(root: THREE.Object3D) {
    if (!this.trees.length) return;
    const wood = new Bake(), leaf = new Bake();
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    const tint = new THREE.Color(), white = new THREE.Color(1, 1, 1);
    for (const t of this.trees) {
      const kit = treeKit(t.species, Math.floor(h01(t.x, t.z, 1) * VARIANTS));
      const palm = t.species === 'coconut' || t.species === 'areca' || t.species === 'royal';
      const k = t.s * (0.88 + h01(t.x, t.z, 2) * 0.24), tilt = palm ? 0 : (h01(t.x, t.z, 3) - 0.5) * 0.08;
      m.compose(p.set(t.x, 0, t.z), q.setFromEuler(e.set(tilt, h01(t.x, t.z, 4) * Math.PI * 2, tilt * 0.5, 'YXZ')), sc.set(k, k * (0.92 + h01(t.x, t.z, 6) * 0.16), k));
      wood.add(kit.wood, m, white);
      const v = h01(t.x, t.z, 7);
      leaf.add(kit.leaf, m, tint.setRGB(0.9 + v * 0.18, 0.92 + v * 0.14, 0.88 + (1 - v) * 0.14));
    }
    const woodMat = nearFade(new THREE.MeshLambertMaterial({ vertexColors: true }), false);
    const leafMat = nearFade(new THREE.MeshLambertMaterial({ vertexColors: true }), true);
    const woodMesh = wood.mesh(woodMat), leafMesh = leaf.mesh(leafMat);
    leafMesh.onBeforeRender = () => { windUniform.value = performance.now() / 1000; };
    // Keep our own materials (wind, near fade): the stage's bake() would otherwise merge these into bakedMat.
    woodMesh.userData.keep = leafMesh.userData.keep = true;
    root.add(woodMesh, leafMesh);
  }
}
