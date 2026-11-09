// FIXTURE chunk generator (debug only, `?fixture=1`): realistic Chunk data for the renderer before builder G's
// real generator lands. Corridor roads from the fixture net, plus by area: a rotated Salt Lake grid of set-back
// houses and pocket parks, a dense old-city lane grid with shops, wires and dead ends, or a plain generic grid.
// Deterministic from (cx, cz): every feature is laid out globally and clipped, so chunks meet seamlessly.

import { CHUNK, type AreaKind, type Chunk, type GenBuilding, type GenProp, type GenRoad, type Pt, type WorldNet } from '../../../sim/gen/types';
import { clipPolyline, hash, inside, nearestRoad, roadsNear, type Rect } from './geom';
import { FIXTURE_DEAD_ENDS } from './net';

const SQ = 360;
const OLD = new Set<AreaKind>(['ultadanga', 'kankurgachi', 'phoolbagan', 'beliaghata', 'narkeldanga', 'maniktala', 'sealdah']);
type Style = 'saltlake' | 'old' | 'generic';
const GRID: Record<Style, { S: number; w: number; foot: number; cls: GenRoad['cls'] }> = {
  saltlake: { S: 46, w: 6, foot: 1.6, cls: 'residential' },
  old: { S: 30, w: 4, foot: 0, cls: 'lane' },
  generic: { S: 56, w: 7, foot: 1.6, cls: 'residential' },
};
const OLD_TINTS = [0xd9a876, 0xc98a6a, 0xe0c39a, 0xb9a48c, 0xd7b9a0, 0xc9b79b, 0xe6d3a8, 0xa9b8a0, 0xb7c4cf];
const HOUSE_TINTS = [0xf2dfa7, 0xf0c0a8, 0xcfe3c4, 0xc8dcef, 0xf6efe0, 0xe8cfe6, 0xf3d28e];

function areaOf(net: WorldNet, x: number, z: number) {
  let best: { kind: AreaKind; gridDeg?: number } = { kind: 'generic', gridDeg: 0 }, bd = 520;
  for (const a of net.areas) { const d = Math.hypot(a.x - x, a.z - z); if (d < bd) { bd = d; best = a; } }
  return best;
}
const styleOf = (k: AreaKind): Style => (k === 'saltlake' ? 'saltlake' : OLD.has(k) ? 'old' : 'generic');

/** Facing angle so local +z points along (fx, fz); wall angle so local x runs along (dx, dz). */
const face = (fx: number, fz: number) => Math.atan2(fx, fz);
const runAlong = (dx: number, dz: number) => Math.atan2(-dz, dx);

export function fixtureChunk(net: WorldNet, cx: number, cz: number): Chunk {
  const x0 = cx * CHUNK, z0 = cz * CHUNK, rect: Rect = [x0, z0, x0 + CHUNK, z0 + CHUNK];
  const area = areaOf(net, x0 + CHUNK / 2, z0 + CHUNK / 2);
  const style = styleOf(area.kind), G = GRID[style];
  const real = roadsNear(net.roads, rect, 60);
  const roads: GenRoad[] = [], buildings: GenBuilding[] = [], props: GenProp[] = [];
  const inRect = (x: number, z: number) => x >= rect[0] && x < rect[2] && z >= rect[1] && z < rect[3];
  const outSq = (x: number, z: number, pad = 0) => Math.max(Math.abs(x), Math.abs(z)) > SQ + pad;
  const realGap = (x: number, z: number) => { const n = nearestRoad(real, x, z); return n.d - (n.r ? n.r.w / 2 + 2.5 : 0); };

  // 1. Real corridor roads, clipped exactly.
  for (const r of real) for (const p of clipPolyline(r.p, rect, SQ)) roads.push({ p, w: r.w, cls: r.cls, real: true, tram: r.tram });

  // 2. The side-street grid, rotated to the area's bearing.
  const th = ((area.gridDeg ?? 0) * Math.PI) / 180, cu = Math.cos(th), su = Math.sin(th);
  const toXZ = (u: number, v: number): Pt => [u * cu - v * su, u * su + v * cu];
  const corners = [[rect[0], rect[1]], [rect[2], rect[1]], [rect[0], rect[3]], [rect[2], rect[3]]].map(([x, z]) => [x * cu + z * su, -x * su + z * cu]);
  const umin = Math.min(...corners.map((c) => c[0])), umax = Math.max(...corners.map((c) => c[0]));
  const vmin = Math.min(...corners.map((c) => c[1])), vmax = Math.max(...corners.map((c) => c[1]));
  const { S } = G;
  const i0 = Math.floor(umin / S) - 1, i1 = Math.ceil(umax / S) + 1, j0 = Math.floor(vmin / S) - 1, j1 = Math.ceil(vmax / S) + 1;
  const side: GenRoad[] = [];
  const addStreet = (a: Pt, b: Pt) => {
    // Keep it off the corridors it runs alongside (crossings are fine: that's a junction).
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
    let run: Pt[] | null = null;
    const flush = () => { if (run && run.length > 1) for (const p of clipPolyline(run, rect, SQ)) side.push({ p, w: G.w, cls: G.cls, real: false, noFoot: G.foot === 0 }); run = null; };
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const A: Pt = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], B: Pt = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
      const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2, near = nearestRoad(real, mx, mz);
      const dx = (b[0] - a[0]), dz = (b[1] - a[1]), L = Math.hypot(dx, dz) || 1;
      const parallel = Math.abs((dx * near.dx + dz * near.dz) / L) > 0.6;
      const bad = near.r && near.d < near.r.w / 2 + G.w / 2 + (parallel ? 14 : 0.5) && (parallel || near.d < near.r.w / 2);
      if (bad) { flush(); continue; }
      if (!run) run = [A];
      run.push(B);
    }
    flush();
  };
  for (let i = i0; i <= i1; i++) addStreet(toXZ(i * S, vmin - 4), toXZ(i * S, vmax + 4));
  const deadEnds: { at: Pt; dir: Pt; k: number }[] = [];
  for (let j = j0; j <= j1; j++) {
    if (style !== 'old') { addStreet(toXZ(umin - 4, j * S), toXZ(umax + 4, j * S)); continue; }
    for (let i = i0; i <= i1; i++) {
      if (hash(i, j, 7) > 0.8) continue;
      const stub = hash(i, j, 9) < 0.3, end = stub ? i * S + 0.55 * S : (i + 1) * S;
      addStreet(toXZ(i * S, j * S), toXZ(end, j * S));
      if (stub) deadEnds.push({ at: toXZ(end, j * S), dir: [cu, su], k: Math.round(hash(i, j, 11) * 1000) });
    }
  }
  roads.push(...side);

  // 3. Buildings, cell by cell, plus the old city's frontage along the corridor.
  const rectBuilding = (u0: number, v0: number, u1: number, v1: number, b: Omit<GenBuilding, 'p'>, clear: number) => {
    const p = [toXZ(u0, v0), toXZ(u1, v0), toXZ(u1, v1), toXZ(u0, v1)];
    const c: Pt = [(p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2];
    if (!inRect(c[0], c[1]) || !outSq(c[0], c[1], 6) || [...p, c].some(([x, z]) => !outSq(x, z, 2) || realGap(x, z) < clear)) return false;
    buildings.push({ p, ...b });
    return true;
  };
  const hw = G.w / 2 + G.foot + 0.3;
  for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) {
    const u0 = i * S + hw, u1 = (i + 1) * S - hw, v0 = j * S + hw, v1 = (j + 1) * S - hw;
    const cu0 = toXZ((u0 + u1) / 2, (v0 + v1) / 2);
    // Buildings belong to the chunk holding their centroid: skip cells that can't have one here.
    if (cu0[0] < rect[0] - S * 0.75 || cu0[0] > rect[2] + S * 0.75 || cu0[1] < rect[1] - S * 0.75 || cu0[1] > rect[3] + S * 0.75) continue;
    const hk = (k: number) => hash(i, j, k);
    if (style === 'saltlake') {
      if (hk(3) < 0.14) { park(u0, v0, u1, v1, i, j); continue; }
      const n = 3, pw = (u1 - u0) / n, mid = (v0 + v1) / 2;
      for (let k = 0; k < n; k++) for (const front of [0, 1]) {
        const a = u0 + pw * k + 1.2, b = u0 + pw * (k + 1) - 1.2;
        const [va, vb] = front === 0 ? [v0 + 3.5, mid - 1] : [mid + 1, v1 - 3.5];
        const tall = hash(i, j, k, front) < 0.1;
        rectBuilding(a, va, b, vb, { storeys: tall ? 4 : 2 + Math.floor(hash(i, j, k, front, 2) * 3), style: tall ? 'resi' : 'house', colour: HOUSE_TINTS[Math.floor(hash(i, j, k, front, 3) * 7)], shop: false }, 1.5);
      }
    } else if (style === 'old') {
      const D = 9;
      const tint = (k: number) => OLD_TINTS[Math.floor(hash(i, j, k, 5) * OLD_TINTS.length)];
      const kind = (k: number): GenBuilding['style'] => { const r = hash(i, j, k, 6); return r < 0.08 ? 'market' : r < 0.28 ? 'resi' : 'old'; };
      const lv = (k: number) => 3 + Math.floor(hash(i, j, k, 8) * 4);
      let k = 0;
      for (const [va, vb] of [[v0, v0 + D], [v1 - D, v1]]) for (let a = u0; a < u1 - 3; k++) {
        const b = Math.min(u1, a + 5.5 + hash(i, j, k, 1) * 3);
        rectBuilding(a, va, b, vb, { storeys: lv(k), style: kind(k), colour: tint(k), shop: hash(i, j, k, 2) < 0.7 }, 12.5);
        a = b;
      }
      for (const [ua, ub] of [[u0, u0 + D], [u1 - D, u1]]) for (let a = v0 + D; a < v1 - D - 3; k++) {
        const b = Math.min(v1 - D, a + 5.5 + hash(i, j, k, 1) * 3);
        rectBuilding(ua, a, ub, b, { storeys: lv(k), style: kind(k), colour: tint(k), shop: hash(i, j, k, 2) < 0.5 }, 12.5);
        a = b;
      }
    } else {
      const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
      for (const [a, b, c, d] of [[u0 + 2, v0 + 2, um - 1.5, vm - 1.5], [um + 1.5, v0 + 2, u1 - 2, vm - 1.5], [u0 + 2, vm + 1.5, um - 1.5, v1 - 2], [um + 1.5, vm + 1.5, u1 - 2, v1 - 2]]) {
        const r = hash(i, j, a, b);
        const st: GenBuilding['style'] = r < 0.15 ? 'office' : r < 0.25 ? 'market' : 'resi';
        rectBuilding(a, b, c, d, { storeys: st === 'office' ? 6 + Math.floor(r * 20) : st === 'market' ? 2 : 3 + Math.floor(hash(i, j, b, a) * 3), style: st, colour: st === 'office' ? 0x9db4c8 : HOUSE_TINTS[Math.floor(r * 70) % 7], shop: r > 0.6 }, 2);
      }
    }
  }
  function park(u0: number, v0: number, u1: number, v1: number, i: number, j: number) {
    const sides: [Pt, Pt][] = [[toXZ(u0 + 0.5, v0 + 0.5), toXZ(u1 - 0.5, v0 + 0.5)], [toXZ(u1 - 0.5, v0 + 0.5), toXZ(u1 - 0.5, v1 - 0.5)], [toXZ(u1 - 0.5, v1 - 0.5), toXZ(u0 + 0.5, v1 - 0.5)], [toXZ(u0 + 0.5, v1 - 0.5), toXZ(u0 + 0.5, v0 + 0.5)]];
    for (const [a, b] of sides) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, half = (L - 4) / 2;
      for (const t of [half / 2, L - half / 2]) addProp({ kind: 'wall', x: a[0] + dx * t, z: a[1] + dz * t, rot: runAlong(dx, dz), len: half, v: 1 });
    }
    for (let k = 0; k < 10; k++) {
      const t = (k / 10) * Math.PI * 2, r = 0.32 * (u1 - u0);
      const [x, z] = toXZ((u0 + u1) / 2 + Math.cos(t) * r, (v0 + v1) / 2 + Math.sin(t) * r);
      addProp({ kind: k % 4 === 3 ? 'palm' : 'tree', x, z, rot: 0, v: Math.floor(hash(i, j, k) * 3) });
    }
    for (let k = 0; k < 4; k++) { const [x, z] = toXZ((u0 + u1) / 2 + (k - 1.5) * 4, (v0 + v1) / 2); addProp({ kind: 'bench', x, z, rot: th, v: 0 }); }
  }

  // Old-city frontage along the corridor: shops built to the footpath on both sides.
  if (style === 'old') for (const r of real) {
    const cum: number[] = [0];
    for (let i = 1; i < r.p.length; i++) cum.push(cum[i - 1] + Math.hypot(r.p[i][0] - r.p[i - 1][0], r.p[i][1] - r.p[i - 1][1]));
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i], L = cum[i] - cum[i - 1];
      if (L < 1) continue;
      const dx = (bx - ax) / L, dz = (bz - az) / L, nx = dz, nz = -dx;
      for (let s = 4 - (cum[i - 1] % 7); s < L - 4; s += 7) for (const sd of [1, -1]) {
        const g = Math.round((cum[i - 1] + s) / 7), off = r.w / 2 + 2.5 + 0.2;
        const p0: Pt = [ax + dx * (s - 3.2) + nx * off * sd, az + dz * (s - 3.2) + nz * off * sd];
        const p = [p0, [p0[0] + dx * 6.4, p0[1] + dz * 6.4], [p0[0] + dx * 6.4 + nx * 10 * sd, p0[1] + dz * 6.4 + nz * 10 * sd], [p0[0] + nx * 10 * sd, p0[1] + nz * 10 * sd]] as Pt[];
        const c: Pt = [(p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2];
        if (!inRect(c[0], c[1]) || !outSq(c[0], c[1], 8) || hash(g, sd, 4) < 0.08) continue;
        if (p.some(([x, z]) => realGap(x, z) < -0.1 || side.some((q) => q.p.some((_, k) => k > 0 && segNear(q.p[k - 1], q.p[k], x, z, q.w / 2 + 0.5))))) continue;
        buildings.push({ p, storeys: 3 + Math.floor(hash(g, sd, 1) * 4), style: hash(g, sd, 2) < 0.15 ? 'market' : 'old', colour: OLD_TINTS[Math.floor(hash(g, sd, 3) * OLD_TINTS.length)], shop: true });
      }
    }
  }

  // 4. Props.
  function addProp(p: GenProp) {
    if (!inRect(p.x, p.z) || !outSq(p.x, p.z, 2)) return;
    if (p.kind !== 'wall' && buildings.some((b) => inside(b.p, p.x, p.z))) return;
    props.push(p);
  }
  for (const r of real) {
    const cum: number[] = [0];
    for (let i = 1; i < r.p.length; i++) cum.push(cum[i - 1] + Math.hypot(r.p[i][0] - r.p[i - 1][0], r.p[i][1] - r.p[i - 1][1]));
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i], L = cum[i] - cum[i - 1];
      if (L < 1) continue;
      const dx = (bx - ax) / L, dz = (bz - az) / L, nx = dz, nz = -dx;
      const at = (s: number, off: number): [number, number] => [ax + dx * s + nx * off, az + dz * s + nz * off];
      for (let s = 2 - (cum[i - 1] % 8); s < L; s += 8) {
        if (s < 0) continue;
        const g = Math.round((cum[i - 1] + s) / 8), sd = g % 2 ? 1 : -1;
        if (g % 2 === 0) { const [x, z] = at(s, (r.w / 2 + 0.55) * sd); addProp({ kind: 'lamp', x, z, rot: face(-nx * sd, -nz * sd), v: style === 'old' ? 1 : 0 }); }
        const [tx, tz] = at(s + 4, (r.w / 2 + 4.2) * -sd);
        if (style !== 'old' && hash(g, 3) < 0.7) addProp({ kind: hash(g, 4) < 0.2 ? 'palm' : 'tree', x: tx, z: tz, rot: 0, v: Math.floor(hash(g, 5) * 3) });
        if (style === 'old') {
          if (g % 2 === 1) { const [x, z] = at(s, (r.w / 2 + 0.9) * sd); addProp({ kind: 'pole', x, z, rot: face(-nx * sd, -nz * sd) }); }
          const [sx, sz] = at(s + 3, (r.w / 2 + 1.3) * -sd);
          if (hash(g, 6) < 0.45) addProp({ kind: 'stall', x: sx, z: sz, rot: face(nx * sd, nz * sd), len: hash(g, 7) < 0.3 ? 7.8 : 2.6, v: Math.floor(hash(g, 8) * 5) });
          else if (hash(g, 6) < 0.6) { const [kx, kz] = at(s + 3, (r.w / 2 - 1.2) * -sd); addProp({ kind: hash(g, 9) < 0.5 ? 'parked-bike' : 'handcart', x: kx, z: kz, rot: runAlong(dx, dz), v: g }); }
        }
        if (g % 32 === 5) { const [x, z] = at(s, (r.w / 2 + 1.4) * sd); addProp({ kind: 'bus-stop', x, z, rot: face(-nx * sd, -nz * sd) }); }
        if (g % 40 === 17) { const [x, z] = at(s, (r.w / 2 + 6) * -sd); addProp({ kind: 'hoarding', x, z, rot: face(nx * sd, nz * sd), len: 8, v: g }); }
        if (style === 'old' && g % 9 === 4) { const [x, z] = at(s + 2, r.w / 4); addProp({ kind: 'puddle', x, z, rot: 0, len: 3 + hash(g, 10) * 3 }); }
      }
    }
  }
  side.forEach((r, ri) => {
    const [ax, az] = r.p[0], [bx, bz] = r.p[r.p.length - 1], L = Math.hypot(bx - ax, bz - az);
    if (L < 2) return;
    const dx = (bx - ax) / L, dz = (bz - az) / L, nx = dz, nz = -dx;
    const base = Math.round((ax * 7 + az * 13) / 10);
    for (let s = 3, k = 0; s < L - 2; s += style === 'old' ? 5 : 10, k++) {
      const gx = ax + dx * s, gz = az + dz * s, sd = k % 2 ? 1 : -1, h = hash(base, k, ri);
      if (style === 'old') {
        if (k % 3 === 0) addProp({ kind: 'pole', x: gx + nx * (r.w / 2 + 0.3) * sd, z: gz + nz * (r.w / 2 + 0.3) * sd, rot: face(-nx * sd, -nz * sd) });
        else if (h < 0.3) addProp({ kind: 'parked-bike', x: gx + nx * (r.w / 2 - 0.5) * sd, z: gz + nz * (r.w / 2 - 0.5) * sd, rot: runAlong(dx, dz), v: k });
        else if (h < 0.36) addProp({ kind: 'shrine', x: gx + nx * (r.w / 2 + 0.2) * sd, z: gz + nz * (r.w / 2 + 0.2) * sd, rot: face(-nx * sd, -nz * sd) });
        else if (h < 0.45) addProp({ kind: 'puddle', x: gx, z: gz, rot: 0, len: 2 + h * 4 });
        if (k % 6 === 2) addProp({ kind: 'lamp', x: gx - nx * (r.w / 2 + 0.2) * sd, z: gz - nz * (r.w / 2 + 0.2) * sd, rot: face(nx * sd, nz * sd), v: 1 });
      } else {
        const off = r.w / 2 + G.foot + 1.2;
        if (h < 0.75) addProp({ kind: h < 0.12 ? 'palm' : 'tree', x: gx + nx * off * sd, z: gz + nz * off * sd, rot: 0, v: k });
        if (k % 3 === 1) addProp({ kind: 'lamp', x: gx - nx * (r.w / 2 + 0.4) * sd, z: gz - nz * (r.w / 2 + 0.4) * sd, rot: face(nx * sd, nz * sd), v: 0 });
        if (style === 'generic' && h > 0.85) addProp({ kind: 'parked-car', x: gx + nx * (r.w / 2 - 1) * sd, z: gz + nz * (r.w / 2 - 1) * sd, rot: runAlong(dx, dz), v: k });
      }
    }
  });
  for (const d of deadEnds) {
    addProp({ kind: 'dead-end', x: d.at[0], z: d.at[1], rot: face(-d.dir[0], -d.dir[1]), len: G.w + 1, v: d.k % 3, text: FIXTURE_DEAD_ENDS[d.k % FIXTURE_DEAD_ENDS.length] });
  }
  const blockers: Pt[][] = [];
  return { cx, cz, x0, z0, area: area.kind, roads, buildings, props, landmarks: [], blockers };
}

function segNear(a: Pt, b: Pt, x: number, z: number, r: number) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z) < r;
}

/** Test helper: every road, building and prop coordinate is finite. */
export const finiteChunk = (c: Chunk) => [...c.roads.flatMap((r) => r.p), ...c.buildings.flatMap((b) => b.p), ...c.props.map((p): Pt => [p.x, p.z])].every(([x, z]) => Number.isFinite(x) && Number.isFinite(z));
