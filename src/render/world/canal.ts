// The Keshtopur canal as it really looks (research/streetview/NORTH.md §5): a ~15 m channel sunk below grade
// with sloped banks and dark green water, almost hidden by a belt of palms and trees; a red-brick plinth with a
// blue iron railing on the Chavipatty (north) bank; a white railing with coloured square motifs and a park strip
// on the south bank; and a flat Street 13 crossing with a low, faded blue-and-white balustrade covered in posters.

import * as THREE from 'three';
import { north as N } from '../../content/sectorv';
import type { CanalLine, Railing } from '../../sim/canal';
import { RailingMask } from '../../sim/canal';
import { isCanalBridge, nearest, onCarriageway } from '../../sim/elevated';
import type { MapData, Pt } from '../../sim/mapdata';
import { hash, type Parts, type V3 } from './kit';

const C = {
  bank: 0x5b5638, lawnS: 0x5e8b43, lawnN: 0x6a8749, brick: 0xa3523a, blue: 0x2f55a4, white: 0xf0efea,
  palm: 0x4d7a2e, leaf: [0x3f6b2f, 0x4d7a34, 0x56803a], trunk: 0x7a6248, flower: 0xf6f1e4, frangi: 0x6f9a4a,
  concrete: 0xb9b3a9, baluBlue: 0x7c97bd, baluWhite: 0xe1ded4,
};
const MOTIF = [0x4caf50, 0xf2c230, 0x2f7fd0];

/** The channel's two top edges (from the centre line and its half width), and the ground hole they enclose. */
export function channel(line: CanalLine, inset = 0) {
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < line.p.length; i++) {
    const a = line.p[Math.max(0, i - 1)], b = line.p[Math.min(line.p.length - 1, i + 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
    const w = line.hw[i] - inset, [x, z] = line.p[i];
    left.push([x + nx * w, z + nz * w]);
    right.push([x - nx * w, z - nz * w]);
  }
  return { left, right, hole: [...left, ...[...right].reverse()] };
}

/** Builds the banks, railings, trees and the crossing into `parts`; returns the water surface (vertex-coloured). */
export function buildCanal(parts: Parts, posters: THREE.BufferGeometry[], map: MapData, line: CanalLine, railings: Railing[], avoid: (x: number, z: number) => boolean) {
  const D = N.canalDepth, top = channel(line), low = channel(line, 1.3);
  // Sloped earth banks from the edge down into the water.
  for (const [e, w] of [[top.left, low.left], [top.right, low.right]] as const)
    for (let i = 1; i < e.length; i++)
      parts.quad([e[i - 1][0], 0, e[i - 1][1]], [e[i][0], 0, e[i][1]], [w[i][0], -D - 0.2, w[i][1]], [w[i - 1][0], -D - 0.2, w[i - 1][1]], C.bank);
  // A grass strip along both banks (the trees stand in it; roads and footpaths are drawn over it).
  const strip = channel({ p: line.p, hw: line.hw.map((h) => h + 5) });
  for (const [e, w, c] of [[top.left, strip.left, C.lawnN], [top.right, strip.right, C.lawnS]] as const)
    for (let i = 1; i < e.length; i++)
      parts.quad([e[i - 1][0], 0.012, e[i - 1][1]], [e[i][0], 0.012, e[i][1]], [w[i][0], 0.012, w[i][1]], [w[i - 1][0], 0.012, w[i - 1][1]], c);

  railingsGeometry(parts, posters, railings);
  crossing(parts, map, line);
  trees(parts, map, line, railings, avoid);

  // Dark green water, 1.7 units below grade, wound to face up.
  const pos: number[] = [];
  for (let i = 1; i < low.left.length; i++) {
    const a = low.left[i - 1], b = low.left[i], c = low.right[i], d = low.right[i - 1];
    pos.push(a[0], -D, a[1], d[0], -D, d[1], b[0], -D, b[1], b[0], -D, b[1], d[0], -D, d[1], c[0], -D, c[1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  const c = new THREE.Color(0x2b4632);
  g.setAttribute('color', new THREE.Float32BufferAttribute(pos.map((_, i) => [c.r, c.g, c.b][i % 3]), 3));
  return g;
}

function railingsGeometry(parts: Parts, posters: THREE.BufferGeometry[], railings: Railing[]) {
  railings.forEach((r, i) => {
    const L = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]);
    if (L < 0.05) return;
    const ux = (r.b[0] - r.a[0]) / L, uz = (r.b[1] - r.a[1]) / L;
    const mid: Pt = [(r.a[0] + r.b[0]) / 2, (r.a[1] + r.b[1]) / 2];
    if (r.kind === 'north') {
      // Red-brick plinth, brick pillars every few metres, blue iron railing between them (c3_h60).
      parts.span(r.a, r.b, 0.6, 0.35, 0, C.brick);
      parts.span(r.a, r.b, 0.06, 0.06, 0.75, C.blue);
      parts.span(r.a, r.b, 0.07, 0.07, 1.75, C.blue);
      for (const t of [0.25, 0.75]) parts.box(0.05, 1.05, 0.05, r.a[0] + ux * L * t, 0.65, r.a[1] + uz * L * t, 0, C.blue);
      if (i % 2 === 0) parts.box(0.42, 1.95, 0.42, r.a[0], 0, r.a[1], 0, C.brick);
    } else if (r.kind === 'south') {
      // White railing with coloured square-frame motifs (fly_03_h46).
      parts.span(r.a, r.b, 0.07, 0.06, 0.2, C.white);
      parts.span(r.a, r.b, 0.08, 0.06, 1.15, C.white);
      parts.box(0.07, 1.2, 0.07, r.a[0], 0, r.a[1], 0, C.white);
      parts.box(0.05, 1.0, 0.05, mid[0] - ux * 0.55, 0.2, mid[1] - uz * 0.55, 0, C.white);
      const sq = MOTIF[i % 3];
      parts.box(0.5, 0.5, 0.05, mid[0], 0.45, mid[1], -Math.atan2(uz, ux), sq);
    } else {
      // Low concrete balustrade, faded blue and white, plastered with posters (c1_h225).
      const n = Math.max(1, Math.round(L / 1.6));
      for (let k = 0; k < n; k++) {
        const a: Pt = [r.a[0] + ux * L * k / n, r.a[1] + uz * L * k / n], b: Pt = [r.a[0] + ux * L * (k + 1) / n, r.a[1] + uz * L * (k + 1) / n];
        parts.span(a, b, 0.85, 0.28, 0, k % 2 ? C.baluBlue : C.baluWhite);
        if ((k + i) % 3 !== 0) for (const side of [0.15, -0.15]) {
          const pg = new THREE.PlaneGeometry(1.1, 0.6);
          pg.rotateY(Math.atan2(uz * Math.sign(side), -ux * Math.sign(side)));
          pg.translate((a[0] + b[0]) / 2 + uz * side, 0.45, (a[1] + b[1]) / 2 - ux * side);
          posters.push(pg);
        }
      }
    }
  });
}

/** The flat Street 13 crossing: a slab under each carriageway where it spans the sunken channel. */
function crossing(parts: Parts, map: MapData, line: CanalLine) {
  for (const r of map.roads.filter(isCanalBridge)) {
    for (let i = 1; i < r.p.length; i++) {
      const a = r.p[i - 1], b = r.p[i];
      if (nearest(line.p, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2).d > 30) continue;
      parts.span(a, b, 0.85, r.w + 1, -0.82, C.concrete);
    }
  }
}

/** The tree-and-palm belt on both banks (NORTH.md §5: the water is almost never visible from the road). */
function trees(parts: Parts, map: MapData, line: CanalLine, railings: Railing[], avoid: (x: number, z: number) => boolean) {
  const mask = new RailingMask(railings), bridges = map.roads.filter((r) => r.b);
  let n = 0;
  for (let i = 0; i < line.p.length; i += 1) {
    const a = line.p[Math.max(0, i - 1)], b = line.p[Math.min(line.p.length - 1, i + 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
    for (const side of [1, -1]) {
      const h = hash(i * 2 + (side > 0 ? 0 : 1));
      if (h < 0.35) continue; // about one tree every 4-5 units per bank
      const o = line.hw[i] + 0.9 + hash(i * 7 + side) * 3.4, x = line.p[i][0] + nx * o * side, z = line.p[i][1] + nz * o * side;
      if (Math.abs(x) > 400 || Math.abs(z) > 400 || avoid(x, z) || mask.blocked(x, z, 1.1) || onCarriageway(map.roads, x, z, 2.8)) continue;
      if (bridges.some((r) => nearest(r.p, x, z).d < r.w / 2 + 2.5)) continue;
      const kind = hash(i * 13 + side * 5);
      if (kind < 0.45) palm(parts, x, z, n++);
      else if (side < 0 && kind < 0.75) frangipani(parts, x, z, n++);
      else broadleaf(parts, x, z, n++);
    }
  }
}

function palm(parts: Parts, x: number, z: number, n: number) {
  const h = 5.5 + hash(n) * 3, lean = (hash(n + 1) - 0.5) * 0.8, tx = x + lean, tz = z + lean * 0.5;
  // The trunk leans: two cylinder pieces.
  parts.cyl(0.17, h / 2, x, 0, z, C.trunk, 1, 0, 6);
  parts.cyl(0.15, h / 2, (x + tx) / 2 + lean / 2, h / 2, (z + tz) / 2 + lean / 4, C.trunk, 1, 0, 6);
  const top: V3 = [tx + lean / 2, h, tz + lean / 4];
  for (let k = 0; k < 7; k++) {
    const ang = (k / 7) * Math.PI * 2 + hash(n + 3), cx = Math.cos(ang), cz = Math.sin(ang), r = 2.3;
    const tip: V3 = [top[0] + cx * r, h - 1.1, top[2] + cz * r], mid: V3 = [top[0] + cx * r * 0.5, h + 0.25, top[2] + cz * r * 0.5];
    const wx = -cz * 0.35, wz = cx * 0.35;
    parts.quad(top, [mid[0] + wx, mid[1], mid[2] + wz], tip, [mid[0] - wx, mid[1], mid[2] - wz], C.palm);
  }
}

function broadleaf(parts: Parts, x: number, z: number, n: number) {
  const r = 1.7 + hash(n) * 0.9, h = 2.4 + hash(n + 2) * 1.2;
  parts.cyl(0.24, h, x, 0, z, C.trunk, 1, 0, 6);
  const g = new THREE.IcosahedronGeometry(r, 0);
  g.scale(1, 0.8, 1);
  g.translate(x, h + r * 0.6, z);
  parts.add(g, C.leaf[n % 3]);
}

function frangipani(parts: Parts, x: number, z: number, n: number) {
  parts.cyl(0.14, 1.6, x, 0, z, C.trunk, 1, 0, 5);
  const g = new THREE.IcosahedronGeometry(1.25, 0);
  g.scale(1.1, 0.55, 1.1);
  g.translate(x, 2.2, z);
  parts.add(g, C.frangi);
  for (let k = 0; k < 4; k++) {
    const a = k * 1.7 + n;
    parts.box(0.22, 0.12, 0.22, x + Math.cos(a) * 0.9, 2.45, z + Math.sin(a) * 0.9, 0, C.flower, 0.2);
  }
}
