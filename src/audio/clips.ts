// Recorded clips from public/sounds/. Loaded lazily after the first tap, one after another so the first
// frame and first sounds never wait. A clip that is missing or fails to decode is skipped silently.

import { clips, loadOrder, ambience, type ClipId } from '../content/sounds';
import { ctx, master, onUnlock } from './core';

const buffers = new Map<ClipId, AudioBuffer>();
/** One-shots asked for before their clip arrived: play on arrival if still fresh. */
const waiting = new Map<ClipId, number>();
const loadListeners: ((id: ClipId) => void)[] = [];
let started = false;

const now = () => performance.now() / 1000;

async function loadOne(id: ClipId) {
  if (!ctx) return;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}sounds/${clips[id].file}`);
    if (!res.ok) return;
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    buffers.set(id, buf);
    const asked = waiting.get(id);
    waiting.delete(id);
    if (asked !== undefined && now() <= asked) playClip(id);
    for (const fn of loadListeners) fn(id);
  } catch {
    // Missing file, offline, or a codec the browser can't decode: no clip, no fuss.
  }
}

function startLoading() {
  if (started) return;
  started = true;
  void (async () => { for (const id of loadOrder) await loadOne(id); })();
}

onUnlock(startLoading);

export function clipReady(id: ClipId): boolean {
  return buffers.has(id);
}

/** Call `fn` whenever a clip finishes loading. Returns an unsubscribe function. */
export function onClipLoaded(fn: (id: ClipId) => void): () => void {
  loadListeners.push(fn);
  return () => { const i = loadListeners.indexOf(fn); if (i >= 0) loadListeners.splice(i, 1); };
}

/**
 * Play a one-shot. Returns false if the clip isn't loaded (yet). With `wait`, a clip still loading plays
 * when it arrives, as long as that's within `wait` seconds.
 */
export function playClip(id: ClipId, opts: { gain?: number; wait?: number } = {}): boolean {
  const buf = buffers.get(id);
  if (!ctx || !master) return false;
  if (!buf) {
    if (opts.wait) waiting.set(id, now() + opts.wait);
    return false;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = clips[id].gain * (opts.gain ?? 1);
  src.connect(g).connect(master);
  src.start();
  return true;
}

/** A looping bed. Starts silently once its clip is loaded; `setLevel` glides the gain. */
export class Bed {
  private src: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private level = 0;
  private unsub: (() => void) | null = null;

  constructor(private id: ClipId) {}

  start() {
    this.unsub ??= onClipLoaded((loaded) => { if (loaded === this.id) this.attach(); });
    this.attach();
  }

  private attach() {
    const buf = buffers.get(this.id);
    if (!ctx || !master || !buf || this.src) return;
    this.src = ctx.createBufferSource();
    this.src.buffer = buf;
    this.src.loop = true;
    // Skip decoder padding at the ends so the loop seam stays tight.
    this.src.loopStart = Math.min(0.03, buf.duration / 4);
    this.src.loopEnd = buf.duration - Math.min(0.03, buf.duration / 4);
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.src.connect(this.gain).connect(master);
    this.src.start(0, Math.random() * buf.duration * 0.5);
    this.setLevel(this.level);
  }

  /** Target level, 0–1 (times the clip's own gain). */
  setLevel(v: number) {
    this.level = v;
    if (!ctx || !this.gain) return;
    this.gain.gain.setTargetAtTime(v * clips[this.id].gain, ctx.currentTime, ambience.smooth);
  }

  stop() {
    this.unsub?.();
    this.unsub = null;
    if (!this.src || !this.gain || !ctx) return;
    const src = this.src;
    this.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    src.stop(ctx.currentTime + 0.8);
    this.src = null;
    this.gain = null;
  }
}
