// The tree kit, shared by Sector V (greenery.ts) and the streamed world (chunkprops.ts). Modelled on Street View
// (Sector V, Salt Lake, the Bypass, Sealdah; notes in docs/tasks/028-trees.md): rain trees whose grey trunks split
// into a few big limbs under a wide umbrella crown, rounder neem and mango, flat gulmohar, banyan and peepal on a
// painted platform with aerial roots, columnar debdaru, and coconut, areca and royal palms.
// Each tree is two indexed geometries in metres, base at the origin: `wood` (trunk, limbs, painted band,
// platform) and `leaf` (crown clumps and fronds), both with vertex colours. Crowns are overlapping jittered
// icosahedra whose normals bend out from the crown centre, so they shade as one soft mass; colour runs darker
// underneath and inside (a cheap ambient occlusion) and lighter on top. Built once per (species, variant).

import * as THREE from 'three';

export type Species = 'rain' | 'neem' | 'gulmohar' | 'banyan' | 'ashoka' | 'coconut' | 'areca' | 'royal';
export const SPECIES: Species[] = ['rain', 'neem', 'gulmohar', 'banyan', 'ashoka', 'coconut', 'areca', 'royal'];
export interface TreeGeo { wood: THREE.BufferGeometry; leaf: THREE.BufferGeometry; tris: number; height: number }

/** Most triangles one tree of a species may have (tested). */
export const TRI_CAP: Record<Species, number> = { rain: 340, neem: 300, gulmohar: 320, banyan: 460, ashoka: 200, coconut: 320, areca: 200, royal: 340 };
/** Shapes per species, chosen per tree by a hash. */
export const VARIANTS = 6;

/** mulberry32: deterministic 0..1 per seed. */
function rng(seed: number) {
  let a = (seed * 0x9e3779b1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Part {
  pos: number[] = []; nor: number[] = []; col: number[] = []; idx: number[] = [];
  v(p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color) {
    this.pos.push(p.x, p.y, p.z); this.nor.push(n.x, n.y, n.z); this.col.push(c.r, c.g, c.b);
    return this.pos.length / 3 - 1;
  }
  tri(a: number, b: number, c: number) { this.idx.push(a, b, c); }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    return g;
  }
}

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const col = (hex: number, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const UP = V(0, 1, 0);

/** A tapered prism from a to b (no caps), radius r0 to r1, colour c0 to c1. 2 × sides triangles. */
function limb(w: Part, a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, c0: THREE.Color, c1 = c0, sides = 5) {
  const d = b.clone().sub(a).normalize();
  const s = V().crossVectors(d, Math.abs(d.y) > 0.9 ? V(1, 0, 0) : UP).normalize(), u = V().crossVectors(s, d);
  const base = w.pos.length / 3, n = V(), p = V();
  for (let i = 0; i < sides; i++) {
    const t = (i / sides) * Math.PI * 2;
    n.copy(s).multiplyScalar(Math.cos(t)).addScaledVector(u, Math.sin(t));
    w.v(p.copy(a).addScaledVector(n, r0), n, c0);
    w.v(p.copy(b).addScaledVector(n, r1), n, c1);
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides, a0 = base + i * 2, a1 = base + j * 2;
    w.tri(a0, a0 + 1, a1); w.tri(a1, a0 + 1, a1 + 1);
  }
}

const ICO_T = (1 + Math.sqrt(5)) / 2;
const ICO_V = [[-1, ICO_T, 0], [1, ICO_T, 0], [-1, -ICO_T, 0], [1, -ICO_T, 0], [0, -1, ICO_T], [0, 1, ICO_T], [0, -1, -ICO_T], [0, 1, -ICO_T], [ICO_T, 0, -1], [ICO_T, 0, 1], [-ICO_T, 0, -1], [-ICO_T, 0, 1]]
  .map(([x, y, z]) => V(x, y, z).normalize());
const ICO_F = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];

interface Crown { c: THREE.Vector3; r: number; y0: number; y1: number; leaf: THREE.Color; R: () => number }

/** One foliage clump: a jittered, squashed icosahedron (20 triangles) shaded as part of the whole crown. */
function clump(L: Part, cr: Crown, at: THREE.Vector3, r: number, squash: number) {
  const base = L.pos.length / 3, p = V(), n = V(), c = new THREE.Color();
  // Each clump a little lighter or darker, a little yellower or bluer: no two lumps the same green.
  const tone = 0.82 + cr.R() * 0.34, warm = (cr.R() - 0.5) * 0.08;
  for (const d of ICO_V) {
    const k = 1 + (cr.R() - 0.5) * 0.45;
    p.set(d.x * r * k, d.y * r * k * squash, d.z * r * k).add(at);
    n.copy(p).sub(cr.c); n.y /= 0.8; n.normalize().multiplyScalar(0.65).addScaledVector(d, 0.35).normalize();
    const h = THREE.MathUtils.clamp((p.y - cr.y0) / Math.max(0.1, cr.y1 - cr.y0), 0, 1);
    const out = THREE.MathUtils.clamp(p.distanceTo(cr.c) / cr.r, 0, 1);
    const shade = (0.58 + 0.7 * h) * (0.72 + 0.28 * out) * tone;
    c.copy(cr.leaf).multiplyScalar(shade);
    c.r *= 1 + warm + h * 0.06; c.g *= 1 + h * 0.04; c.b *= 1 - warm;
    L.v(p, n, c);
  }
  for (let i = 0; i < ICO_F.length; i += 3) L.tri(base + ICO_F[i], base + ICO_F[i + 1], base + ICO_F[i + 2]);
}

/**
 * A palm frond: a rib arching out and down with leaflets folded down either side (a shallow V), both faces.
 * 8 × segs triangles.
 */
function frond(L: Part, at: THREE.Vector3, a: number, len: number, rise: number, droop: number, width: number, leaf: THREE.Color, segs: number) {
  const dir = V(Math.cos(a), 0, Math.sin(a)), side = V(-Math.sin(a), 0, Math.cos(a));
  const rib: THREE.Vector3[] = [], half: number[] = [];
  for (let k = 0; k <= segs; k++) {
    const t = k / segs;
    rib.push(at.clone().addScaledVector(dir, len * t).add(V(0, rise * t - droop * t * t, 0)));
    half.push(width * (k === segs ? 0.05 : 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.25 + 0.15))));
  }
  for (const s of [1, -1]) {
    const nUp = V().addScaledVector(side, s * 0.4).add(UP).normalize(), nDn = nUp.clone().negate();
    const edge = (k: number) => rib[k].clone().addScaledVector(side, s * half[k]).add(V(0, -half[k] * 0.45, 0));
    for (let k = 0; k < segs; k++) {
      const c0 = col(leaf.getHex(), 0.8 + 0.25 * (k / segs)), c1 = col(leaf.getHex(), 0.8 + 0.25 * ((k + 1) / segs));
      const q = [rib[k], rib[k + 1], edge(k + 1), edge(k)];
      const top = q.map((p, i) => L.v(p, nUp, i % 3 === 0 ? c0 : c1));
      const bot = q.map((p, i) => L.v(p, nDn, (i % 3 === 0 ? c0 : c1).clone().multiplyScalar(0.7)));
      // Winding: the face seen from above for s = 1 is (0, 2, 1), mirrored for the other side.
      if (s > 0) { L.tri(top[0], top[2], top[1]); L.tri(top[0], top[3], top[2]); L.tri(bot[0], bot[1], bot[2]); L.tri(bot[0], bot[2], bot[3]); }
      else { L.tri(top[0], top[1], top[2]); L.tri(top[0], top[2], top[3]); L.tri(bot[0], bot[2], bot[1]); L.tri(bot[0], bot[3], bot[2]); }
    }
  }
}

const PAINT = { white: 0xe9e5da, red: 0xa83a2c, ochre: 0xc8662e };

/** A trunk from the ground to `top`, the bottom metre whitewashed (sometimes with a red ring) when `painted`. */
function trunk(W: Part, top: THREE.Vector3, r0: number, r1: number, bark: THREE.Color, painted: number, sides = 5) {
  const band = Math.min(1.1, top.y * 0.4), mid = V(0, band, 0);
  if (painted < 0.55) { limb(W, V(), top, r0, r1, bark, bark, sides); return; }
  // Whitewash to about a metre; on some a red ring above it (both common on Kolkata kerbside trees).
  const white = col(PAINT.white), up = painted > 0.8 ? V(0, band + 0.22, 0) : mid;
  limb(W, V(), mid, r0 * 1.02, r0, white, white, sides);
  if (up !== mid) limb(W, mid, up, r0, r0 * 0.99, col(PAINT.red), col(PAINT.red), sides);
  limb(W, up, top, r0 * 0.98, r1, bark, bark, sides);
}

/** Limbs fanning out of the trunk top: returns their tips. */
function limbs(W: Part, R: () => number, top: THREE.Vector3, n: number, elev: [number, number], len: [number, number], r0: number, bark: THREE.Color, fork = false) {
  const tips: THREE.Vector3[] = [], a0 = R() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const az = a0 + (i / n) * Math.PI * 2 + (R() - 0.5) * 0.6, el = elev[0] + R() * (elev[1] - elev[0]), L = len[0] + R() * (len[1] - len[0]);
    const d = V(Math.sin(el) * Math.cos(az), Math.cos(el), Math.sin(el) * Math.sin(az));
    const tip = top.clone().addScaledVector(d, L);
    limb(W, top, tip, r0, r0 * 0.5, bark, bark, 5);
    if (fork) { // a secondary branch off the limb's middle, higher and further out
      const mid = top.clone().lerp(tip, 0.55), d2 = V(Math.cos(az + 0.7), 1.1, Math.sin(az + 0.7)).normalize();
      const t2 = mid.clone().addScaledVector(d2, L * 0.5);
      limb(W, mid, t2, r0 * 0.45, r0 * 0.2, bark, bark, 4);
      tips.push(t2);
    }
    tips.push(tip);
  }
  return tips;
}

function crownOf(R: () => number, leafHex: number, c: THREE.Vector3, r: number, y0: number, y1: number): Crown {
  const leaf = col(leafHex, 0.92 + R() * 0.16);
  leaf.offsetHSL((R() - 0.5) * 0.025, (R() - 0.5) * 0.08, 0);
  return { c, r, y0, y1, leaf, R };
}

/** Clumps on a ring around the crown centre. */
function ring(L: Part, cr: Crown, n: number, rad: number, y: number, r: number, squash: number) {
  const a0 = cr.R() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + (cr.R() - 0.5) * 0.5, rr = rad * (0.85 + cr.R() * 0.3);
    clump(L, cr, V(Math.cos(a) * rr, y + (cr.R() - 0.5) * 0.6, Math.sin(a) * rr), r * (0.85 + cr.R() * 0.3), squash);
  }
}

const OCT = [V(1, 0, 0), V(-1, 0, 0), V(0, 1, 0), V(0, -1, 0), V(0, 0, 1), V(0, 0, -1)];
const OCT_F = [0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 4, 2, 1, 3, 4, 1, 5, 3, 1, 2, 5];

/** Small ragged tufts (8 triangles each) scattered on the crown's rim, so the silhouette isn't a smooth dome. */
function tufts(L: Part, cr: Crown, n: number, rad: number, y: number, r: number) {
  const p = V(), nn = V(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = cr.R() * Math.PI * 2, up = cr.R(), at = V(Math.cos(a) * rad * (0.8 + 0.3 * cr.R()), y + up * r * 2.2, Math.sin(a) * rad * (0.8 + 0.3 * cr.R()));
    const base = L.pos.length / 3, rr = r * (0.7 + cr.R() * 0.6), tone = 0.9 + cr.R() * 0.35;
    for (const d of OCT) {
      p.set(d.x * rr * (0.7 + cr.R() * 0.6), d.y * rr * 0.6, d.z * rr * (0.7 + cr.R() * 0.6)).add(at);
      nn.copy(p).sub(cr.c).normalize().multiplyScalar(0.6).addScaledVector(d, 0.4).normalize();
      const h = THREE.MathUtils.clamp((p.y - cr.y0) / Math.max(0.1, cr.y1 - cr.y0), 0, 1);
      L.v(p, nn, c.copy(cr.leaf).multiplyScalar((0.62 + 0.65 * h) * tone));
    }
    for (let k = 0; k < OCT_F.length; k += 3) L.tri(base + OCT_F[k], base + OCT_F[k + 1], base + OCT_F[k + 2]);
  }
}

type Builder = (W: Part, L: Part, R: () => number) => number;

const BUILD: Record<Species, Builder> = {
  // Rain tree / shirish: a short grey trunk splitting into 3-4 big limbs, a wide flat-topped umbrella crown.
  rain(W, L, R) {
    const H = 2.6 + R() * 0.8, bark = col(0x6b6258, 0.85 + R() * 0.3), top = V((R() - 0.5) * 0.4, H, (R() - 0.5) * 0.4);
    trunk(W, top, 0.4, 0.3, bark, R());
    const tips = limbs(W, R, top, 3 + (R() < 0.5 ? 1 : 0), [0.6, 0.95], [3.2, 4.2], 0.26, bark);
    const cy = H + 3.0, cr = crownOf(R, 0x3e6a2f, V(0, cy, 0), 5.6, H + 1.4, H + 5.2);
    clump(L, cr, V(0, cy + 1.2, 0), 2.7, 0.5);
    for (const t of tips) clump(L, cr, t.clone().setY(t.y + 0.7), 2.3 + R() * 0.4, 0.52);
    ring(L, cr, 4, 3.9, cy + 0.1, 2.0, 0.55);
    tufts(L, cr, 7, 5.0, cy - 0.6, 0.9);
    return cy + 2.6;
  },
  // Neem, mango, mahogany: a short trunk, two or three limbs, a dense round crown.
  neem(W, L, R) {
    const H = 2.0 + R() * 0.6, bark = col(0x4f4339, 0.85 + R() * 0.3), top = V(0, H, 0);
    trunk(W, top, 0.3, 0.24, bark, R());
    limbs(W, R, top, 3, [0.35, 0.6], [1.8, 2.4], 0.18, bark);
    const cy = H + 2.4, cr = crownOf(R, 0x47733a, V(0, cy, 0), 3.2, H + 0.6, H + 4.6);
    clump(L, cr, V((R() - 0.5) * 0.6, cy + 1.3, (R() - 0.5) * 0.6), 1.8, 0.8);
    ring(L, cr, 5, 1.9, cy + 0.2, 1.55, 0.8);
    ring(L, cr, 3, 1.4, cy - 1.0, 1.3, 0.75);
    tufts(L, cr, 5, 2.9, cy - 0.6, 0.7);
    return cy + 2.6;
  },
  // Gulmohar / radhachura: a low fork into spreading limbs, a thin flat feathery crown, lighter green.
  gulmohar(W, L, R) {
    const H = 1.7 + R() * 0.5, bark = col(0x6f675c, 0.85 + R() * 0.3), top = V(0, H, 0);
    trunk(W, top, 0.28, 0.22, bark, R());
    const tips = limbs(W, R, top, 5, [0.85, 1.15], [3.0, 3.8], 0.17, bark);
    const cy = H + 2.6, cr = crownOf(R, 0x6a9442, V(0, cy, 0), 4.6, H + 1.6, H + 3.6);
    clump(L, cr, V(0, cy + 0.7, 0), 2.4, 0.42);
    for (const t of tips) clump(L, cr, t.clone().setY(t.y + 0.5), 1.9 + R() * 0.4, 0.42);
    ring(L, cr, 3, 2.4, cy + 0.4, 1.8, 0.45);
    tufts(L, cr, 6, 4.4, cy - 0.2, 0.8);
    return cy + 1.6;
  },
  // Banyan / peepal: a massive fluted trunk on a painted platform, long limbs, aerial roots, a huge dark crown.
  banyan(W, L, R) {
    const H = 3.0 + R() * 0.6, bark = col(0x8a8378, 0.85 + R() * 0.2), top = V(0, H, 0);
    // The platform (bedi): a low octagon, red-ochre sides, a cement top.
    const pr = 2.2, ph = 0.45, side = col(PAINT.ochre, 0.9 + R() * 0.2), cement = col(0xcfc8b8), base = W.pos.length / 3;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, n = V(Math.cos(a + Math.PI / 8), 0, Math.sin(a + Math.PI / 8));
      for (const [x, y] of [[0, 0], [0, ph], [1, ph], [1, 0]]) {
        const aa = ((i + x) / 8) * Math.PI * 2;
        W.v(V(Math.cos(aa) * pr, y, Math.sin(aa) * pr), n, side);
      }
    }
    for (let i = 0; i < 8; i++) { const o = base + i * 4; W.tri(o, o + 1, o + 2); W.tri(o, o + 2, o + 3); }
    const ctr = W.v(V(0, ph, 0), UP, cement), rim = W.pos.length / 3;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; W.v(V(Math.cos(a) * pr, ph, Math.sin(a) * pr), UP, cement); }
    for (let i = 0; i < 8; i++) W.tri(ctr, rim + ((i + 1) % 8), rim + i);
    // Fluted trunk: a main stem with three fused stems around it, the base smeared vermilion.
    limb(W, V(0, ph, 0), top, 0.9, 0.7, col(PAINT.red, 0.9), bark, 6);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + R();
      limb(W, V(Math.cos(a) * 0.75, ph, Math.sin(a) * 0.75), V(Math.cos(a) * 0.35, H * 0.9, Math.sin(a) * 0.35), 0.35, 0.25, bark, bark, 4);
    }
    const tips = limbs(W, R, top, 5, [0.75, 1.1], [4.2, 5.4], 0.42, bark);
    // Aerial roots: thin strands hanging from the limbs.
    for (let i = 0; i < 6; i++) {
      const t = tips[i % tips.length], f = 0.35 + R() * 0.45, p = top.clone().lerp(t, f).add(V((R() - 0.5) * 0.6, -0.2, (R() - 0.5) * 0.6));
      limb(W, p, V(p.x, 0.4 + R() * 1.6, p.z), 0.05, 0.035, col(0x7a6f60), col(0x9a8f7e), 3);
    }
    const cy = H + 4.2, cr = crownOf(R, 0x325a29, V(0, cy, 0), 7, H + 1.6, H + 7.4);
    clump(L, cr, V(0, cy + 1.6, 0), 3.3, 0.6);
    for (const t of tips) clump(L, cr, t.clone().setY(t.y + 0.8), 2.8 + R() * 0.5, 0.6);
    ring(L, cr, 5, 4.8, cy + 0.4, 2.6, 0.6);
    tufts(L, cr, 6, 6.6, cy - 0.4, 1.1);
    return cy + 3.6;
  },
  // Debdaru / mast tree (Polyalthia): tall and narrow, a column of dark drooping foliage nearly to the ground.
  ashoka(W, L, R) {
    const H = 9 + R() * 3, bark = col(0x4a3f35), top = V(0, H * 0.7, 0);
    limb(W, V(), top, 0.17, 0.1, bark, bark, 4);
    const cr = crownOf(R, 0x3b6a30, V(0, H * 0.5, 0), 1.6, 1.2, H);
    const n = 8;
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1), y = 1.9 + t * (H - 2.6), r = 1.35 * (1 - t * 0.75) + 0.2;
      clump(L, cr, V((R() - 0.5) * 0.25, y, (R() - 0.5) * 0.25), r, 1.45 - t * 0.2);
    }
    return H;
  },
  // Coconut: a curving ringed trunk, nine long drooping fronds, a bunch of nuts.
  coconut(W, L, R) {
    const H = 7.5 + R() * 2.5, az = R() * Math.PI * 2, lean = 0.06 + R() * 0.12;
    const pts = [0, 1, 2, 3, 4, 5].map((k) => { const t = k / 5, o = lean * H * t * t; return V(Math.cos(az) * o, H * t, Math.sin(az) * o); });
    const bark = col(0x8a7a66), dark = col(0x6f6252);
    for (let k = 1; k < pts.length; k++) limb(W, pts[k - 1], pts[k], 0.22 - k * 0.012, 0.21 - (k + 1) * 0.012, k % 2 ? bark : dark, k % 2 ? dark : bark, 5);
    const top = pts[pts.length - 1], cr = crownOf(R, 0x67893a, top, 3, top.y - 2, top.y + 1);
    clump(L, { ...cr, leaf: col(0x6b6a2a) }, top.clone().add(V(0, -0.35, 0)), 0.42, 0.9);
    for (let i = 0; i < 9; i++) frond(L, top, (i / 9) * Math.PI * 2 + R() * 0.5, 3.2 + R() * 0.8, 0.9, 2.3 + R() * 0.6, 0.55, cr.leaf, 3);
    return top.y + 1;
  },
  // Areca (supari): a slim pale ringed stem, a green crownshaft, a small upright crown.
  areca(W, L, R) {
    const H = 6 + R() * 2, bark = col(0xa8a594), ringC = col(0x8d8a7a), shaft = col(0x7a9a4a);
    for (let k = 0; k < 4; k++) limb(W, V(0, (H - 1.1) * k / 4, 0), V(0, (H - 1.1) * (k + 1) / 4, 0), 0.11, 0.1, k % 2 ? bark : ringC, k % 2 ? ringC : bark, 4);
    limb(W, V(0, H - 1.1, 0), V(0, H, 0), 0.13, 0.11, shaft, shaft, 4);
    const top = V(0, H, 0), cr = crownOf(R, 0x76a046, top, 2, H - 1, H + 1.5);
    for (let i = 0; i < 7; i++) frond(L, top, (i / 7) * Math.PI * 2 + R() * 0.5, 2.1 + R() * 0.4, 1.4, 1.2, 0.42, cr.leaf, 2);
    return H + 1.4;
  },
  // Royal palm: a smooth pale grey trunk that swells in the middle, a long green crownshaft, arching fronds.
  royal(W, L, R) {
    const H = 9 + R() * 2, bark = col(0xbab6ab, 0.92 + R() * 0.1), shaft = col(0x6e8f3e);
    const prof = [[0, 0.32], [0.3, 0.38], [0.6, 0.34], [1, 0.26]];
    const S = H - 1.8;
    for (let k = 1; k < prof.length; k++) limb(W, V(0, prof[k - 1][0] * S, 0), V(0, prof[k][0] * S, 0), prof[k - 1][1], prof[k][1], bark, bark, 6);
    limb(W, V(0, S, 0), V(0, H, 0), 0.28, 0.22, shaft, shaft, 6);
    const top = V(0, H, 0), cr = crownOf(R, 0x5f8a36, top, 3, H - 2, H + 1);
    for (let i = 0; i < 11; i++) frond(L, top, (i / 11) * Math.PI * 2 + R() * 0.4, 3.4 + R() * 0.6, 1.1, 1.9 + R() * 0.5, 0.5, cr.leaf, 3);
    return H + 1.1;
  },
};

/** Build one tree. Deterministic: the same species and seed always give the same geometry. */
export function buildTree(species: Species, seed: number): TreeGeo {
  const W = new Part(), L = new Part();
  const height = BUILD[species](W, L, rng(seed * 8 + SPECIES.indexOf(species) + 1));
  return { wood: W.geo(), leaf: L.geo(), tris: (W.idx.length + L.idx.length) / 3, height };
}

const cache = new Map<string, TreeGeo>();
/** The shared shape for (species, variant), built on first use. */
export function treeKit(species: Species, variant: number): TreeGeo {
  const v = ((Math.trunc(variant) % VARIANTS) + VARIANTS) % VARIANTS, key = `${species}:${v}`;
  let t = cache.get(key);
  if (!t) { t = buildTree(species, v); cache.set(key, t); }
  return t;
}

/** Pick from weighted options with u in 0..1. */
export function pickWeighted<T extends string>(mix: Partial<Record<T, number>>, u: number): T {
  const entries = Object.entries(mix) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let acc = 0;
  for (const [k, w] of entries) { acc += w / total; if (u < acc) return k; }
  return entries[entries.length - 1][0];
}

/** Seconds, for the wind; set from a mesh's onBeforeRender. */
export const windUniform = { value: 0 };

/**
 * Wind sway for a Lambert shader: displaces by world height (trunks barely move, crowns most), coherent per tree
 * (low-frequency phase over x/z), with a faster flutter for leaves, faded out beyond `far` from the camera.
 * Assumes the mesh is in world coordinates on flat ground (y = 0).
 */
export function addWind(sh: { vertexShader: string; uniforms: Record<string, unknown> }, leaf: boolean, w: { amp: number; flutter: number; near: number; far: number }) {
  sh.uniforms.uWindT = windUniform;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uWindT;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
    {
      vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
      float wk = smoothstep(1.5, 9.0, wp.y) * (1.0 - smoothstep(${w.near.toFixed(1)}, ${w.far.toFixed(1)}, distance(wp, cameraPosition)));
      if (wk > 0.0) {
        float ph = wp.x * 0.11 + wp.z * 0.07;
        vec3 sway = vec3(sin(uWindT * 1.1 + ph), 0.0, cos(uWindT * 0.9 + ph * 1.3) * 0.6) * ${w.amp.toFixed(3)};
        ${leaf ? `sway += vec3(sin(uWindT * 4.3 + wp.x * 0.9 + wp.y * 1.7), sin(uWindT * 3.7 + wp.z * 1.1) * 0.5, cos(uWindT * 4.9 + wp.z * 0.8 + wp.y)) * ${w.flutter.toFixed(3)};` : ''}
        transformed += sway * wk;
      }
    }`);
}
