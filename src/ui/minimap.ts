// GTA-style round minimap of the real roads. The roads are drawn once to an offscreen canvas; each frame
// just copies the right patch (rotated so you always face up) and draws a few markers on top.
// Tap it to open the whole map (north up).

import type { MapData } from '../sim/mapdata';
import type { Vehicle } from '../sim/traffic';
import type { ChunkSource } from '../sim/gen/types';
import { StreamedLayer } from './minimapworld';

const PX_PER_UNIT = 1; // offscreen map resolution
const VIEW_UNITS = 110; // radius of the round view, in world units

export interface MinimapState {
  x: number; z: number; yaw: number; // player position and camera heading
  vehicles: Vehicle[];
  captainId: number;
  metro: { x: number; z: number };
  exit: { x: number; z: number }; // where the road to Sealdah leaves the map
}

export class Minimap {
  readonly el: HTMLCanvasElement;
  private base: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private half: number;
  private big = false;
  private lastDraw = 0;
  private world: StreamedLayer | null = null;

  constructor(private map: MapData) {
    this.half = 380; // the playable area; long roads are cropped at the edge
    this.base = document.createElement('canvas');
    this.base.width = this.base.height = this.half * 2 * PX_PER_UNIT;
    this.drawBase();
    this.el = document.createElement('canvas');
    this.el.className = 'minimap';
    this.ctx = this.el.getContext('2d')!;
    this.el.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.big = !this.big; this.el.classList.toggle('big', this.big); this.resize(); });
    this.resize();
    const onResize = () => {
      if (!this.el.isConnected && this.lastDraw) { removeEventListener('resize', onResize); return; }
      this.resize(); this.lastDraw = 0;
    };
    addEventListener('resize', onResize);
  }

  /** Show the streamed world: loaded chunks' roads, the corridor network (big map) and the way to Sealdah. */
  attachWorld(src: ChunkSource) { this.world = new StreamedLayer(src); this.lastDraw = 0; }

  /** Small map size in CSS px: scales with the short side so it fits its corner slot (see style.css). */
  static size(w = innerWidth, h = innerHeight) {
    const s = w > h ? h * 0.24 : w * 0.29;
    return Math.round(Math.min(150, Math.max(84, s)));
  }

  private resize() {
    const css = this.big ? Math.min(innerWidth, innerHeight) - 40 : Minimap.size();
    const dpr = Math.min(devicePixelRatio, 2);
    this.el.width = this.el.height = Math.round(css * dpr);
    this.el.style.width = this.el.style.height = `${css}px`;
  }

  /** World (x, z) to offscreen pixels. */
  private px(x: number, z: number): [number, number] { return [(x + this.half) * PX_PER_UNIT, (z + this.half) * PX_PER_UNIT]; }

  private drawBase() {
    const g = this.base.getContext('2d')!;
    g.fillStyle = '#c9c2b4';
    g.fillRect(0, 0, this.base.width, this.base.height);
    g.fillStyle = '#b3ab9c';
    for (const b of this.map.buildings) {
      g.beginPath();
      b.p.forEach(([x, z], i) => { const [px, pz] = this.px(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); });
      g.fill();
    }
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const order = ['service', 'residential', 'unclassified', 'tertiary_link', 'tertiary', 'secondary_link', 'secondary', 'primary_link', 'primary'];
    for (const k of order) {
      for (const r of this.map.roads.filter((r) => r.k === k)) {
        g.strokeStyle = r.b ? '#e8a33c' : k === 'primary' || k === 'secondary' ? '#ffffff' : '#f2efe8';
        g.lineWidth = Math.max(1.5, r.w * PX_PER_UNIT);
        g.beginPath();
        r.p.forEach(([x, z], i) => { const [px, pz] = this.px(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); });
        g.stroke();
      }
    }
    // The Green Line viaduct.
    g.strokeStyle = 'rgba(46,158,91,0.85)';
    g.lineWidth = 3;
    for (const rail of this.map.rails) {
      g.beginPath();
      rail.forEach(([x, z], i) => { const [px, pz] = this.px(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); });
      g.stroke();
    }
  }

  draw(s: MinimapState, now: number) {
    if (now - this.lastDraw < 50) return; // 20 fps is plenty for a map
    this.lastDraw = now;
    const g = this.ctx, R = this.el.width / 2;
    // Marker sizes are tuned for the small map; the big map keeps them the same size on screen.
    const W = Math.min(this.el.width, 128 * Math.min(devicePixelRatio, 2));
    // Big map: the whole network when the streamed world is on, else the real map; centred on what it shows.
    const frame = this.big && this.world ? this.world.bounds(s.x, s.z, this.half) : null;
    const view = frame ? frame.half : this.big ? this.half : VIEW_UNITS;
    const scale = R / view; // canvas px per world unit
    g.save();
    g.clearRect(0, 0, R * 2, R * 2);
    if (this.world) { g.fillStyle = '#c9c2b4'; g.fillRect(0, 0, R * 2, R * 2); }
    g.beginPath();
    if (this.big) g.rect(0, 0, R * 2, R * 2); else g.arc(R, R, R, 0, Math.PI * 2);
    g.clip();
    g.translate(R, R);
    // Small map: rotate so the camera's heading points up. Big map: north up, centred on the map.
    const rot = this.big ? 0 : -s.yaw - Math.PI / 2;
    g.rotate(rot);
    const cx = frame ? frame.x : this.big ? 0 : s.x, cz = frame ? frame.z : this.big ? 0 : s.z;
    g.scale(scale / PX_PER_UNIT, scale / PX_PER_UNIT);
    const [bx, bz] = this.px(cx, cz);
    g.drawImage(this.base, -bx, -bz);
    // Streamed roads in world units around (cx, cz); real corridor roads bolder.
    if (this.world) { g.translate(-cx * PX_PER_UNIT, -cz * PX_PER_UNIT); this.world.draw(g, cx, cz, view, this.big, 1 / scale); }
    g.setTransform(1, 0, 0, 1, 0, 0);

    // Markers, in canvas space.
    const toCanvas = (x: number, z: number): [number, number] => {
      const dx = (x - cx) * scale, dz = (z - cz) * scale;
      const c = Math.cos(rot), sn = Math.sin(rot);
      return [R + dx * c - dz * sn, R + dx * sn + dz * c];
    };
    const dot = (x: number, z: number, r: number, fill: string, stroke = '#111') => {
      const [px, pz] = toCanvas(x, z);
      g.beginPath(); g.arc(px, pz, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
      g.lineWidth = Math.max(1, W / 128); g.strokeStyle = stroke; g.stroke();
    };
    for (const v of s.vehicles) {
      if (v.kind === 'bus') dot(v.x, v.z, W / 40, v.routeDir === 1 ? '#2f6db5' : '#b3262b', '#fff');
      else if (v.id === s.captainId) dot(v.x, v.z, W / 32, '#ffd400');
    }
    // Metro: a green M.
    const [mx, mz] = toCanvas(s.metro.x, s.metro.z);
    g.fillStyle = '#2e9e5b';
    g.fillRect(mx - W / 22, mz - W / 22, W / 11, W / 11);
    g.fillStyle = '#fff';
    g.font = `bold ${Math.round(W / 14)}px system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('M', mx, mz + 1);
    // Sealdah: an arrow on the rim when it's off the edge, a flag when it's in view.
    const home = this.world?.sealdah ?? s.exit;
    const [ex, ez] = toCanvas(home.x, home.z);
    const dx = ex - R, dz = ez - R, d = Math.hypot(dx, dz);
    const edge = R - W * 0.07;
    const ax = d > edge ? R + dx / d * edge : ex, az = d > edge ? R + dz / d * edge : ez;
    g.save();
    g.translate(ax, az);
    g.rotate(Math.atan2(dz, dx));
    g.fillStyle = '#e2402c';
    g.beginPath(); g.moveTo(W / 18, 0); g.lineTo(-W / 30, -W / 28); g.lineTo(-W / 30, W / 28); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = '#e2402c';
    g.font = `bold ${Math.round(W / 16)}px system-ui, sans-serif`;
    g.fillText('🏠', ax, az - W / 14);
    // You: an arrow in the middle (small map) or at your spot (big map).
    const [ux, uz] = toCanvas(s.x, s.z);
    g.save();
    g.translate(ux, uz);
    g.rotate(this.big ? s.yaw + Math.PI / 2 : 0);
    g.fillStyle = '#ff7a1a';
    g.strokeStyle = '#fff';
    g.lineWidth = W / 96;
    g.beginPath(); g.moveTo(0, -W / 18); g.lineTo(W / 28, W / 28); g.lineTo(0, W / 60); g.lineTo(-W / 28, W / 28); g.closePath();
    g.fill(); g.stroke();
    g.restore();
    g.restore();
  }
}
