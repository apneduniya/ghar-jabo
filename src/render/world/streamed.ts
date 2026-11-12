// Glue between the Sector V stage and the streamed world: owns the ChunkView and its material and the lamp pools,
// sets the fog by area once you leave the Sector V square (chunks past the fog are hidden, so nothing pops in), and
// hides the whole Sector V map once you are well outside it (a plain ground stands in for it). Works with builder G's ChunkStore (`world.chunks`) or, behind
// `?fixture=1`, with the fixture source in ./fixture (loaded lazily, so it stays out of the main bundle).

import * as THREE from 'three';
import { fitFont, nightUniform, renderer } from '../gfx';
import { LM_TEXT } from '../../content/landmarks';
import { northSigns } from '../../content/text';
import { CHUNK, type Chunk, type ChunkSource } from '../../sim/gen/types';
import { CHUNK_VIEW } from '../../content/tuning';
import { ChunkView } from './chunks';
import { prepareStructures, structuresForChunk } from './landmarks';
import { chunkMaterial, type ChunkMaterial } from './chunkmat';
import { OLD_AREAS, SQUARE } from './chunkground';
import { LampPools } from './lamps';
import { windUniform } from './trees';

/** A source we drive ourselves (the fixture); G's ChunkStore is stepped by the sim instead. */
export interface Driven { update(x: number, z: number): void }

export function areaFogFar(src: ChunkSource, x: number, z: number) {
  const [rx, rz] = src.warp.toReal([x, z]);
  let kind = 'generic', bd = Infinity;
  for (const a of src.net.areas) { const d = Math.hypot(a.x - rx, a.z - rz) - a.r; if (d < bd) { bd = d; kind = a.kind; } }
  const F = CHUNK_VIEW.fogFar;
  const far = kind === 'saltlake' ? F.saltlake : OLD_AREAS.has(kind as never) ? F.old : F.generic;
  const out = Math.max(Math.abs(x), Math.abs(z)) - SQUARE;
  const t = Math.min(1, Math.max(0, out / CHUNK_VIEW.fogBlend));
  return F.sectorv + (far - F.sectorv) * t;
}

/** How far (x, z) is outside the Sector V square (0 inside it). */
export const outsideSquare = (x: number, z: number) => Math.hypot(Math.max(0, Math.abs(x) - SQUARE), Math.max(0, Math.abs(z) - SQUARE));

/** Lowest share of the draw distance the adaptive view may use: higher at night, when fog is all you'd see. */
export const reachFloor = (night: number) => CHUNK_VIEW.adapt.min + (CHUNK_VIEW.adapt.minNight - CHUNK_VIEW.adapt.min) * Math.min(1, Math.max(0, night));

export class StreamedWorld {
  readonly view: ChunkView;
  private mat: ChunkMaterial;
  readonly pools: LampPools;
  /** Stands in for the Sector V ground while the map is hidden, so looking back shows ground, not sky. */
  private standIn: THREE.Mesh;

  /** Tests only: load every chunk around (x, z) now (the real store streams a slice per frame otherwise). */
  pump: ((x: number, z: number) => void) | null = null;
  /** Share of the full draw distance in use (adaptive, see update). */
  reach = 1;

  constructor(private scene: THREE.Scene, readonly src: ChunkSource, private sectorV: THREE.Object3D, private driven: Driven | null = null) {
    // Warp the network for the landmark builders once, so the first landmark chunk doesn't do it mid-ride.
    prepareStructures(src.net, src.warp);
    warmText(src);
    warmLandmarks(src);
    this.mat = chunkMaterial();
    this.view = new ChunkView(src, { material: this.mat.material, text: this.mat.text, budgetMs: CHUNK_VIEW.budgetMs });
    scene.add(this.view.group);
    this.pools = new LampPools(src, sectorV);
    scene.add(this.pools.mesh);
    this.standIn = new THREE.Mesh(new THREE.PlaneGeometry(SQUARE * 2, SQUARE * 2).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x8a8174 }));
    this.standIn.name = 'sector v stand-in';
    this.standIn.visible = false;
    scene.add(this.standIn);
  }

  /** Once per frame with the player's position. Returns the draw distance in use. */
  update(x: number, z: number) {
    this.driven?.update(x, z);
    // Adaptive draw distance: if the last frame came close to the draw-call budget (lots of chunks, landmarks and
    // traffic in view), pull the view and fog in a little; ease back out when there's room. Fog and visibility
    // move together, so nothing pops.
    // At night the view stops shrinking at a floor, unless the frame is close to the budget itself.
    const calls = renderer.info.render.calls, A = CHUNK_VIEW.adapt;
    const floor = calls > A.hard ? A.min : reachFloor(nightUniform.value);
    if (calls > A.high) this.reach = Math.max(Math.min(floor, this.reach), this.reach - A.down);
    else if (calls < A.low) this.reach = Math.min(1, this.reach + A.up);
    const far = areaFogFar(this.src, x, z) * this.reach;
    const fog = this.scene.fog as THREE.Fog | null;
    if (fog) { fog.far = far; fog.near = far * CHUNK_VIEW.fogNear; }
    this.view.update(x, z, far);
    this.mat.flush();
    windUniform.value = performance.now() / 1000;
    // By distance from the player, not from the origin: the map and the chunks both drawn at the square's edge
    // were the draw-call peak that pulled the fog in (AUDIT.md issue 31).
    this.sectorV.visible = outsideSquare(x, z) < CHUNK_VIEW.hideSectorV;
    this.standIn.visible = !this.sectorV.visible;
    this.pools.update(nightUniform.value, this.sectorV.visible);
    return far;
  }

  /** Tests and screenshots: load and mesh everything around (x, z) right now, ignoring the frame budget. */
  settle(x: number, z: number) {
    for (let i = 0; i < 200; i++) this.driven?.update(x, z);
    this.pump?.(x, z);
    const far = areaFogFar(this.src, x, z);
    while (this.view.pending) this.view.update(x, z, far, Infinity);
    this.update(x, z);
  }

  /** Is the real Sector V map drawn? */
  get sectorVisible() { return this.sectorV.visible; }

  dispose() {
    this.view.dispose();
    this.mat.dispose();
    this.pools.dispose();
    this.standIn.removeFromParent();
    this.standIn.geometry.dispose();
    (this.standIn.material as THREE.Material).dispose();
  }
}

/** The fixture source when the URL asks for it (`?fixture=1`), else null. */
export async function fixtureSource(): Promise<(ChunkSource & Driven) | null> {
  if (new URLSearchParams(location.search).get('fixture') !== '1') return null;
  const m = await import('./fixture/source');
  return new m.FixtureSource();
}

/**
 * Build the heaviest landmark chunks once and throw them away, while the title screen is up. Their first build
 * pays one-time costs (text shaping, code warm-up: ~100 ms for Sealdah on an M2) that would otherwise land as a
 * stall in the middle of the ride; later builds take ~10 ms and fit the per-frame slice.
 */
function warmLandmarks(src: ChunkSource) {
  const heavy = src.net.landmarks.filter((l) => l.kind === 'sealdah-station' || l.kind === 'metro-station' || l.kind === 'flyover');
  const seen = new Set<string>();
  for (const l of heavy) {
    const [x, z] = src.warp.toGame([l.x, l.z]);
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK), key = `${cx},${cz}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const chunk: Chunk = { cx, cz, x0: cx * CHUNK, z0: cz * CHUNK, area: 'generic', roads: [], buildings: [], props: [], landmarks: [l.id], blockers: [] };
    const obj = structuresForChunk(chunk, src.net, src.warp);
    (obj?.userData.dispose as (() => void) | undefined)?.();
  }
}

let textWarm = false;
/**
 * Measure every landmark sign's text once per page, in both faces the signs use. The first measurement of a string
 * in a new script (Bidhan Nagar Road's Bengali and Hindi boards) costs ~35 ms of text shaping, which landed as a
 * stall mid-ride; afterwards the browser has the glyphs and later measurements are cheap.
 */
function warmText(src: ChunkSource) {
  if (textWarm) return;
  textWarm = true;
  const g = document.createElement('canvas').getContext('2d');
  if (!g) return;
  const texts = new Set<string>();
  const walk = (v: unknown) => { if (typeof v === 'string') texts.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(LM_TEXT);
  walk(northSigns);
  for (const l of src.net.landmarks) texts.add(l.name);
  for (const t of texts) for (const face of ['system-ui, sans-serif', 'system-ui, "Noto Sans Bengali", sans-serif']) {
    fitFont(g, t, 400, 64, 10, (n) => `bold ${n}px ${face}`);
  }
}
