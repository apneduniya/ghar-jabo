// Shared building context for one chunk's structures: the vertex-coloured Soup (one draw call), the signs
// (one atlas mesh), lookups into the warped network (nearest road, area character), and a local Frame so models
// are written in their own coordinates: u along the facing direction, v across it, y up.

import * as THREE from 'three';
import { sign as makeSign } from '../../gfx';
import type { AreaKind, NetRoad, Pt, Warp, WorldNet } from '../../../sim/gen/types';
import { Soup, type V3 } from './soup';
import type { Line } from './clip';
import { areaNear, nearestRoad, netLines, type RoadHit } from '../../../sim/gen/layout';

export { memo, type RoadHit } from '../../../sim/gen/layout';

export class Ctx {
  readonly parts = new Soup();
  readonly signs: THREE.Object3D[] = [];
  constructor(readonly net: WorldNet, readonly warp: Warp, readonly cx: number, readonly cz: number) {}

  /** Every network road, warped into game space. */
  roads(): { r: NetRoad; l: Line }[] { return netLines(this.net, this.warp); }

  /** The nearest road (optionally filtered) to a game point, with its direction there. */
  nearestRoad(x: number, z: number, ok?: (r: NetRoad) => boolean): RoadHit | null { return nearestRoad(this.net, this.warp, x, z, ok); }

  /** Street character at a game point (nearest area centre in real coordinates). */
  area(x: number, z: number): AreaKind { return areaNear(this.net, this.warp, x, z); }

  frame(x: number, z: number, h: number) { return new Frame(this, x, z, h); }

  /** A signboard at (x, y, z) facing along (dx, dz). */
  sign(text: string, w: number, h: number, x: number, y: number, z: number, dx: number, dz: number, bg: string, fg: string) {
    const m = makeSign(text, w, h, bg, fg);
    m.position.set(x, y, z);
    m.rotation.y = Math.atan2(dx, dz);
    this.signs.push(m);
    return m;
  }
}

/** Local coordinates around (x, z): u along heading h (facing), v to its side, y up. */
export class Frame {
  readonly fx: number;
  readonly fz: number;
  constructor(readonly ctx: Ctx, readonly x: number, readonly z: number, readonly h: number) {
    this.fx = Math.cos(h);
    this.fz = Math.sin(h);
  }

  p(u: number, v: number): Pt { return [this.x + this.fx * u - this.fz * v, this.z + this.fz * u + this.fx * v]; }
  p3(u: number, v: number, y: number): V3 { const [x, z] = this.p(u, v); return [x, y, z]; }
  /** World direction of a local direction (du, dv). */
  dir(du: number, dv: number): Pt { return [this.fx * du - this.fz * dv, this.fz * du + this.fx * dv]; }

  /** An axis-aligned (in the frame) box from u0..u1, v0..v1, y0..y1. */
  box(u0: number, u1: number, v0: number, v1: number, y0: number, y1: number, color: number, glow = 0) {
    const [x, z] = this.p((u0 + u1) / 2, (v0 + v1) / 2);
    this.ctx.parts.box(Math.abs(u1 - u0), y1 - y0, Math.abs(v1 - v0), x, y0, z, -this.h, color, glow);
  }

  /** A box centred at (u, v), `w` along u and `d` along v, turned by `rot` within the frame. */
  boxAt(u: number, v: number, w: number, d: number, y0: number, hgt: number, color: number, rot = 0, glow = 0) {
    const [x, z] = this.p(u, v);
    this.ctx.parts.box(w, hgt, d, x, y0, z, -this.h - rot, color, glow);
  }

  cyl(u: number, v: number, r: number, y0: number, hgt: number, color: number, seg = 10) {
    const [x, z] = this.p(u, v);
    this.ctx.parts.cyl(r, hgt, x, y0, z, color, 1, 0, seg);
  }

  /** A box between two local points (a beam or a wall), `hgt` tall from y0, `d` thick. */
  span(u0: number, v0: number, u1: number, v1: number, y0: number, hgt: number, d: number, color: number, glow = 0) {
    this.ctx.parts.span(this.p(u0, v0), this.p(u1, v1), hgt, d, y0, color, glow);
  }

  quad(a: V3, b: V3, c: V3, d: V3, color: number, glow = 0) {
    const w = (q: V3): V3 => this.p3(q[0], q[1], q[2]);
    this.ctx.parts.quad(w(a), w(b), w(c), w(d), color, glow);
  }

  /** Any geometry built in local coordinates (x = u, z = v), placed and merged. */
  geo(g: THREE.BufferGeometry, color: number, glow = 0) {
    g.rotateY(-this.h);
    g.translate(this.x, 0, this.z);
    this.ctx.parts.add(g, color, glow);
  }

  /** A signboard at local (u, v, y) facing local direction (du, dv). */
  sign(text: string, w: number, h: number, u: number, v: number, y: number, du: number, dv: number, bg: string, fg: string) {
    const [x, z] = this.p(u, v), [dx, dz] = this.dir(du, dv);
    return this.ctx.sign(text, w, h, x, y, z, dx, dz, bg, fg);
  }
}
