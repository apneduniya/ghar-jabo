// Sky, sun and ambient light through the whole day. The run starts at 6:30 PM in a golden dusk (the look
// players share), slides through blue hour into night by about 7:45, and in free roam carries on to dawn
// and a hazy Kolkata day. `night` (0..1) drives lit windows, street lamps and headlights elsewhere.

import * as THREE from 'three';
import { nightUniform } from './gfx';

interface Key {
  at: number; // minutes since midnight
  top: string; mid: string; low: string; // sky gradient, top to horizon
  fog: string;
  hemiSky: string; hemiGround: string; hemi: number;
  sun: string; sunI: number; sunElev: number; // elevation in degrees (negative: the moon light stands in)
  night: number;
}

// Night stays readable: a sodium-orange city glow, a blue moon fill. Real darkness would be unplayable. The night
// fog is the horizon's city glow, a little darker: far streets dissolve into the skyline, not into a dark wall.
const KEYS: Key[] = [
  { at: 0, top: '#0b1024', mid: '#1b1d3a', low: '#4e3a55', fog: '#3a2f48', hemiSky: '#6d7fc0', hemiGround: '#3a2a22', hemi: 0.9, sun: '#9fb4ff', sunI: 0.55, sunElev: 50, night: 1 },
  { at: 5 * 60 + 15, top: '#0e1430', mid: '#262447', low: '#584260', fog: '#41344d', hemiSky: '#7383c2', hemiGround: '#3a2a22', hemi: 0.95, sun: '#9fb4ff', sunI: 0.55, sunElev: 40, night: 1 },
  { at: 6 * 60, top: '#48609a', mid: '#b49ab4', low: '#f3b183', fog: '#d9a98c', hemiSky: '#c9c6e6', hemiGround: '#a39686', hemi: 1.3, sun: '#ffb27a', sunI: 1.6, sunElev: 6, night: 0.35 },
  { at: 7 * 60 + 30, top: '#6e9ad6', mid: '#b7cde2', low: '#e6dccb', fog: '#d6d6cf', hemiSky: '#d6e4ff', hemiGround: '#a89a8a', hemi: 1.55, sun: '#fff0d6', sunI: 2.6, sunElev: 30, night: 0 },
  { at: 12 * 60, top: '#6f9fd8', mid: '#b4cde4', low: '#dfe4e2', fog: '#d4dbde', hemiSky: '#dceaff', hemiGround: '#ab9e8e', hemi: 1.6, sun: '#fff6e8', sunI: 2.9, sunElev: 70, night: 0 },
  { at: 16 * 60 + 30, top: '#6a94cf', mid: '#bccbdc', low: '#ead8bf', fog: '#dcd2c2', hemiSky: '#d6e2ff', hemiGround: '#a89a8a', hemi: 1.55, sun: '#ffe2b8', sunI: 2.7, sunElev: 28, night: 0 },
  // 6:30 PM: the golden dusk the game opens on, kept as it always looked.
  { at: 18 * 60 + 30, top: '#5f86c2', mid: '#b9a7c4', low: '#f2b27c', fog: '#e8b48a', hemiSky: '#bfd3ff', hemiGround: '#a39686', hemi: 1.5, sun: '#ffc28a', sunI: 2.6, sunElev: 12, night: 0.1 },
  { at: 19 * 60 + 5, top: '#28305e', mid: '#5a4f7a', low: '#c27a6a', fog: '#6e5468', hemiSky: '#8f9ad6', hemiGround: '#43332f', hemi: 1.15, sun: '#ff9a6a', sunI: 0.9, sunElev: 2, night: 0.65 },
  { at: 19 * 60 + 45, top: '#0b1024', mid: '#1b1d3a', low: '#4e3a55', fog: '#3a2f48', hemiSky: '#6d7fc0', hemiGround: '#3a2a22', hemi: 0.9, sun: '#9fb4ff', sunI: 0.55, sunElev: 50, night: 1 },
];

const ca = new THREE.Color(), cb = new THREE.Color();
function mix(a: string, b: string, t: number, out: THREE.Color) {
  return out.copy(ca.set(a)).lerp(cb.set(b), t);
}

export interface SkyState {
  top: THREE.Color; mid: THREE.Color; low: THREE.Color; fog: THREE.Color;
  hemiSky: THREE.Color; hemiGround: THREE.Color; hemi: number;
  sun: THREE.Color; sunI: number; sunElev: number; night: number;
}

/** Interpolated sky for a time of day (minutes since midnight, any day). */
export function skyAt(minute: number): SkyState {
  const m = ((minute % 1440) + 1440) % 1440;
  let i = KEYS.length - 1;
  while (i > 0 && KEYS[i].at > m) i--;
  const a = KEYS[i], b = KEYS[(i + 1) % KEYS.length];
  const span = ((b.at - a.at + 1440) % 1440) || 1440;
  const t = Math.min(1, ((m - a.at + 1440) % 1440) / span);
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    top: mix(a.top, b.top, t, new THREE.Color()), mid: mix(a.mid, b.mid, t, new THREE.Color()),
    low: mix(a.low, b.low, t, new THREE.Color()), fog: mix(a.fog, b.fog, t, new THREE.Color()),
    hemiSky: mix(a.hemiSky, b.hemiSky, t, new THREE.Color()), hemiGround: mix(a.hemiGround, b.hemiGround, t, new THREE.Color()),
    hemi: lerp(a.hemi, b.hemi), sun: mix(a.sun, b.sun, t, new THREE.Color()), sunI: lerp(a.sunI, b.sunI),
    sunElev: lerp(a.sunElev, b.sunElev), night: lerp(a.night, b.night),
  };
}

/** Materials that glow at night: their emissive intensity follows `night`. */
const glowing: { mat: THREE.MeshLambertMaterial; strength: number }[] = [];
export function glowAtNight(mat: THREE.MeshLambertMaterial, strength = 1) {
  glowing.push({ mat, strength });
  return mat;
}
/** Transparent things that only show at night (lamp light pools): opacity follows `night`. */
const fading: { mat: THREE.Material; max: number }[] = [];
export function fadeInAtNight(mat: THREE.Material, max = 1) {
  fading.push({ mat, max });
  return mat;
}
/** Call when a scene is torn down, so dead materials aren't kept alive. */
export function clearGlow() { glowing.length = 0; fading.length = 0; }

/** Owns a scene's sky texture, fog and lights, and re-tints them as the clock moves. */
export class Sky {
  readonly hemi = new THREE.HemisphereLight();
  readonly sun = new THREE.DirectionalLight();
  night = 0;
  private cv = document.createElement('canvas');
  private tex: THREE.CanvasTexture;
  private lastMinute = -999;

  constructor(private scene: THREE.Scene) {
    this.cv.width = 2; this.cv.height = 256;
    this.tex = new THREE.CanvasTexture(this.cv);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = this.tex;
    scene.fog = new THREE.Fog(0xe8b48a, 120, 340);
    scene.add(this.hemi, this.sun);
  }

  /** Cheap enough to call every frame: it only repaints when a game minute has passed. */
  update(minute: number) {
    if (Math.abs(minute - this.lastMinute) < 1) return;
    this.lastMinute = minute;
    const s = skyAt(minute);
    const g = this.cv.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, `#${s.top.getHexString()}`);
    grad.addColorStop(0.55, `#${s.mid.getHexString()}`);
    grad.addColorStop(0.85, `#${s.low.getHexString()}`);
    grad.addColorStop(1, `#${s.low.getHexString()}`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 2, 256);
    this.tex.needsUpdate = true;
    (this.scene.fog as THREE.Fog).color.copy(s.fog);
    this.hemi.color.copy(s.hemiSky);
    this.hemi.groundColor.copy(s.hemiGround);
    this.hemi.intensity = s.hemi;
    this.sun.color.copy(s.sun);
    this.sun.intensity = s.sunI;
    // Morning sun in the east (+x), afternoon and setting sun in the west (-x). At night it is the moon.
    const el = THREE.MathUtils.degToRad(Math.max(2, s.sunElev));
    const tod = ((minute % 1440) + 1440) % 1440;
    const side = tod >= 3 * 60 && tod < 12 * 60 ? 1 : -1;
    this.sun.position.set(120 * Math.cos(el) * side, 140 * Math.sin(el), 30);
    this.night = s.night;
    nightUniform.value = s.night;
    for (const { mat, strength } of glowing) mat.emissiveIntensity = s.night * strength;
    for (const { mat, max } of fading) mat.opacity = s.night * max;
  }
}
