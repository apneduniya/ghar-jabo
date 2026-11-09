// Glue between the Sector V stage and the streamed world: owns the ChunkView and its material, pulls the fog
// in by area once you leave the Sector V square (chunks past the fog are hidden, so nothing pops in), and hides
// the whole Sector V map when you are far from it. Works with builder G's ChunkStore (`world.chunks`) or, behind
// `?fixture=1`, with the fixture source in ./fixture (loaded lazily, so it stays out of the main bundle).

import * as THREE from 'three';
import type { ChunkSource } from '../../sim/gen/types';
import { CHUNK_VIEW } from '../../content/tuning';
import { ChunkView } from './chunks';
import { prepareStructures } from './landmarks';
import { chunkMaterial, type ChunkMaterial } from './chunkmat';
import { OLD_AREAS, SQUARE } from './chunkground';

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

export class StreamedWorld {
  readonly view: ChunkView;
  private mat: ChunkMaterial;

  /** Tests only: load every chunk around (x, z) now (the real store streams a slice per frame otherwise). */
  pump: ((x: number, z: number) => void) | null = null;

  constructor(private scene: THREE.Scene, readonly src: ChunkSource, private sectorV: THREE.Object3D, private driven: Driven | null = null) {
    // Warp the network for the landmark builders once, so the first landmark chunk doesn't do it mid-ride.
    prepareStructures(src.net, src.warp);
    this.mat = chunkMaterial();
    this.view = new ChunkView(src, { material: this.mat.material, text: this.mat.text, budgetMs: CHUNK_VIEW.budgetMs });
    scene.add(this.view.group);
  }

  /** Once per frame with the player's position. Returns the draw distance in use. */
  update(x: number, z: number) {
    this.driven?.update(x, z);
    const far = areaFogFar(this.src, x, z);
    const fog = this.scene.fog as THREE.Fog | null;
    if (fog) { fog.far = far; fog.near = far * CHUNK_VIEW.fogNear; }
    this.view.update(x, z, far);
    this.mat.flush();
    this.sectorV.visible = Math.hypot(x, z) < CHUNK_VIEW.hideSectorV;
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
  }
}

/** The fixture source when the URL asks for it (`?fixture=1`), else null. */
export async function fixtureSource(): Promise<(ChunkSource & Driven) | null> {
  if (new URLSearchParams(location.search).get('fixture') !== '1') return null;
  const m = await import('./fixture/source');
  return new m.FixtureSource();
}
