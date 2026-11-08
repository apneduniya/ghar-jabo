// Adaptive resolution: drop the pixel ratio when frames run long, raise it again when there's headroom.
// iOS Low Power Mode caps the frame rate at 30 fps without telling us; a steady ~33 ms frame is treated
// as that cap, not as a slow device, so we don't blur the game for no gain.

import type * as THREE from 'three';

export class Quality {
  private samples: number[] = [];
  private goodFor = 0;
  ratio: number;

  constructor(private renderer: THREE.WebGLRenderer, private max: number, private min = 1) {
    this.ratio = max;
    renderer.setPixelRatio(max);
  }

  frame(ms: number) {
    this.samples.push(ms);
    if (this.samples.length < 90) return;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const sd = Math.sqrt(this.samples.reduce((a, b) => a + (b - avg) ** 2, 0) / this.samples.length);
    this.samples = [];
    const cappedAt30 = Math.abs(avg - 33.3) < 2 && sd < 3;
    if (avg > 22 && !cappedAt30 && this.ratio > this.min) {
      this.set(this.ratio - 0.25);
      this.goodFor = 0;
    } else if (avg < 14) {
      this.goodFor++;
      if (this.goodFor >= 4 && this.ratio < this.max) { this.set(this.ratio + 0.25); this.goodFor = 0; }
    } else this.goodFor = 0;
  }

  private set(r: number) {
    this.ratio = Math.max(this.min, Math.min(this.max, r));
    this.renderer.setPixelRatio(this.ratio);
  }
}
