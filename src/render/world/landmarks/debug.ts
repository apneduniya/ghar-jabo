// ?landmarks=1: a dev-only view of the streamed world's landmarks and linear structures at their real positions,
// from the fixture WorldNet (public/dev/landmarks-fixture.json), with flat roads and water for context. Loaded with
// a dynamic import, so none of it is in the game bundle's entry chunk.
// URL: ?landmarks=1[&mode=timed][&t=<minute of day>][&at=<landmark id>]. Drag to orbit, wheel to zoom, WASD to pan.
// Scripts drive it through window.gjl (see `api` below) for screenshots.

import * as THREE from 'three';
import { renderer, resize } from '../../gfx';
import { Sky, clearGlow } from '../../sky';
import { CHUNK, type Pt } from '../../../sim/gen/types';
import { Soup } from './soup';
import { prepareStructures, structuresForChunk } from './index';
import { fixtureChunk, fixtureWarp, loadFixture } from './fixture';

export async function run() {
  for (const el of Array.from(document.body.children)) if (el.id !== 'gl') (el as HTMLElement).style.display = 'none';
  const q = new URLSearchParams(location.search);
  const net = await loadFixture();
  const warp = fixtureWarp(q.get('mode') === 'timed' ? 'timed' : 'free');
  const scene = new THREE.Scene();
  clearGlow();
  const sky = new Sky(scene);
  let minute = Number(q.get('t') ?? 12 * 60);
  sky.update(minute);
  const fog = scene.fog as THREE.Fog;
  fog.near = 400; fog.far = 1600;
  const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 4000);
  resize(camera);
  addEventListener('resize', () => resize(camera));

  // Context: ground, flat road ribbons with footpaths, canal water.
  const ctx = new Soup();
  const ground = new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2).translate(-1500, -0.03, 0);
  ctx.add(ground, 0x8c8676);
  for (const r of net.roads) {
    if (r.bridge === 'flyover') continue;
    const p = r.p.map((v) => warp.toGame(v));
    for (let i = 1; i < p.length; i++) {
      ctx.span(p[i - 1], p[i], 0.02, r.w + 3.2, -0.02, 0xb9a99a);
      ctx.span(p[i - 1], p[i], 0.02, r.w, 0.0, r.tram ? 0x55505a : 0x4a4650);
    }
  }
  for (const ring of net.water) {
    const shape = new THREE.Shape(ring.map((v) => { const [x, z] = warp.toGame(v); return new THREE.Vector2(x, -z); }));
    const g = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, 0.03, 0);
    ctx.add(g, 0x2b4632);
  }
  const base = ctx.mesh();
  if (base) scene.add(base);

  // Every chunk over the fixture's extent, built the way the streamer will build them.
  const pts: Pt[] = net.roads.flatMap((r) => r.p).map((v) => warp.toGame(v));
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  let chunks = 0;
  const t0 = performance.now();
  prepareStructures(net, warp);
  const prepMs = performance.now() - t0;
  const slow: [number, string][] = [];
  for (let cx = Math.floor(Math.min(...xs) / CHUNK); cx <= Math.floor(Math.max(...xs) / CHUNK); cx++)
    for (let cz = Math.floor(Math.min(...zs) / CHUNK); cz <= Math.floor(Math.max(...zs) / CHUNK); cz++) {
      const c0 = performance.now();
      const o = structuresForChunk(fixtureChunk(net, warp, cx, cz), net, warp);
      slow.push([performance.now() - c0, `${cx},${cz}`]);
      if (o) { scene.add(o); chunks++; }
    }
  const buildMs = performance.now() - t0;
  slow.sort((a, b) => b[0] - a[0]);
  const slowest = slow.slice(0, 5).map(([t, c]) => {
    // Build it again (thrown away) to tell one-off costs (font fallback, JIT) from the steady state.
    const [cx, cz] = c.split(',').map(Number), c0 = performance.now();
    const again = structuresForChunk(fixtureChunk(net, warp, cx, cz), net, warp);
    const t2 = performance.now() - c0;
    (again?.userData.dispose as (() => void) | undefined)?.();
    return `${c}: ${t.toFixed(1)} ms, again ${t2.toFixed(1)} ms`;
  });

  // Orbit camera around a target.
  const target = new THREE.Vector3();
  let yaw = 0.8, pitch = 0.35, dist = 90, free: { eye: THREE.Vector3; look: THREE.Vector3 } | null = null;
  const place = () => {
    if (free) { camera.position.copy(free.eye); camera.lookAt(free.look); return; }
    camera.position.set(target.x + Math.cos(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.sin(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(target);
  };
  const lmPos = (id: string) => { const l = net.landmarks.find((m) => m.id === id); return l ? warp.toGame([l.x, l.z]) : null; };
  const go = (id: string, d = 90, p = 0.35, y = 0.8) => { const g = lmPos(id); if (!g) return false; free = null; target.set(g[0], 4, g[1]); dist = d; pitch = p; yaw = y; return true; };
  if (!go(q.get('at') ?? 'sealdah')) go('sealdah');
  let drag: { x: number; y: number } | null = null;
  addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('pointerup', () => { drag = null; });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    free = null;
    yaw += (e.clientX - drag.x) * 0.005; pitch = Math.max(0.03, Math.min(1.45, pitch + (e.clientY - drag.y) * 0.005));
    drag = { x: e.clientX, y: e.clientY };
  });
  addEventListener('wheel', (e) => { dist = Math.max(5, Math.min(1500, dist * (e.deltaY > 0 ? 1.1 : 0.9))); });
  addEventListener('keydown', (e) => {
    const s = dist * 0.05, fx = -Math.cos(yaw), fz = -Math.sin(yaw);
    if (e.key === 'w') target.add(new THREE.Vector3(fx * s, 0, fz * s));
    if (e.key === 's') target.add(new THREE.Vector3(-fx * s, 0, -fz * s));
    if (e.key === 'a') target.add(new THREE.Vector3(fz * s, 0, -fx * s));
    if (e.key === 'd') target.add(new THREE.Vector3(-fz * s, 0, fx * s));
  });

  const api = {
    net, warp, chunks, buildMs, prepMs, slowest,
    /** Orbit a landmark: distance, pitch and yaw in radians. */
    go,
    /** A fixed eye and look-at point in game coordinates (photo viewpoints). */
    view(ex: number, ey: number, ez: number, lx: number, ly: number, lz: number, fov = 60) {
      free = { eye: new THREE.Vector3(ex, ey, ez), look: new THREE.Vector3(lx, ly, lz) };
      camera.fov = fov; camera.updateProjectionMatrix();
    },
    /** Time of day in minutes (night glow, sky). */
    time(m: number) { minute = m; sky.update(minute); },
    fog(near: number, far: number) { fog.near = near; fog.far = far; },
    calls: () => renderer.info.render.calls,
    triangles: () => renderer.info.render.triangles,
    frames: 0,
  };
  (window as unknown as { gjl: typeof api }).gjl = api;

  const frame = () => {
    requestAnimationFrame(frame);
    place();
    renderer.render(scene, camera);
    api.frames++;
  };
  requestAnimationFrame(frame);
}
