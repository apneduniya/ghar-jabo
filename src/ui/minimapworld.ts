// The streamed world on the minimap: roads of the loaded chunks (real corridor roads bolder than side streets),
// the warped corridor network on the big map, and where Sealdah is. Drawn in world units on top of the Sector V
// base image, in the minimap's own transform.

import { CHUNK, type ChunkSource, type Pt } from '../sim/gen/types';

export class StreamedLayer {
  readonly sealdah: { x: number; z: number };
  private net: { p: Pt[]; w: number }[];
  private box: [number, number, number, number];

  constructor(private src: ChunkSource) {
    const [sx, sz] = src.warp.toGame([src.net.sealdah.x, src.net.sealdah.z]);
    this.sealdah = { x: sx, z: sz };
    this.net = src.net.roads.map((r) => ({ p: r.p.map((q) => src.warp.toGame(q)), w: r.w }));
    let x0 = Math.min(-360, sx), x1 = Math.max(360, sx), z0 = Math.min(-360, sz), z1 = Math.max(360, sz);
    for (const r of this.net) for (const [x, z] of r.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    this.box = [x0, z0, x1, z1];
  }

  /** The big map's frame: the whole network, Sector V and the player, centred, with a margin. */
  bounds(px: number, pz: number, minHalf: number) {
    const [a, b, c, d] = this.box;
    const x0 = Math.min(a, px), x1 = Math.max(c, px), z0 = Math.min(b, pz), z1 = Math.max(d, pz);
    return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, half: Math.max(minHalf, (x1 - x0) / 2, (z1 - z0) / 2) * 1.06 };
  }

  /** Draw around (cx, cz) within `view` units. `px` is one screen pixel in world units. */
  draw(g: CanvasRenderingContext2D, cx: number, cz: number, view: number, big: boolean, px: number) {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const line = (p: Pt[]) => { g.beginPath(); p.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); g.stroke(); };
    if (big) {
      g.strokeStyle = '#8a8174';
      for (const r of this.net) { g.lineWidth = Math.max(r.w + 4 * px, 6 * px); line(r.p); }
      g.strokeStyle = '#ffffff';
      for (const r of this.net) { g.lineWidth = Math.max(r.w, 3.5 * px); line(r.p); }
    }
    const reach = view * 1.5 + CHUNK;
    const near = [...this.src.loaded()].filter((c) => Math.hypot(c.x0 + CHUNK / 2 - cx, c.z0 + CHUNK / 2 - cz) < reach);
    g.strokeStyle = '#ece6da';
    for (const c of near) for (const r of c.roads) if (!r.real) { g.lineWidth = Math.max(r.w * 0.85, 1.2 * px); line(r.p); }
    g.strokeStyle = '#ffffff';
    for (const c of near) for (const r of c.roads) if (r.real) { g.lineWidth = Math.max(r.w * 1.15, 2.5 * px); line(r.p); }
  }
}
