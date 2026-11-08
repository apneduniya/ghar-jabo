// Sound effects. Most are synthesised in WebAudio; a few play recorded clips (src/audio/clips.ts) and fall
// back to synth if the clip hasn't loaded.

import { ctx, master } from './core';
import { playClip } from './clips';

export { unlockAudio, toggleMute, isMuted } from './core';

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.3, when = 0, slideTo?: number) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, gain = 0.3, filterFreq = 800, when = 0, type: BiquadFilterType = 'lowpass', q = 1) {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start(ctx.currentTime + when);
}

/** Exponentially decaying sine partial with a 2 ms attack (bells). */
function partial(freq: number, gain: number, decay: number, when: number) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
  g.gain.setTargetAtTime(0.0001, t + 0.002, decay / 4);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + decay + 0.1);
}

// Kolkata tram foot-gong (SOUNDS.md S1): five inharmonic partials, a click, struck in quick bursts.
const BELL = [[1650, 1, 0.6], [2350, 0.8, 0.45], [3050, 0.5, 0.35], [3800, 0.3, 0.25], [4600, 0.15, 0.18]];
function tramBell(strikes: number, gap = 0.13, gain = 0.09) {
  for (let i = 0; i < strikes; i++) {
    const when = i * gap * (1 + (Math.random() - 0.5) * 0.1);
    const vel = gain * (1 + (Math.random() - 0.5) * 0.3);
    for (const [f, g, d] of BELL) partial(f * (1 + (Math.random() - 0.5) * 0.02), vel * g, d, when);
    noise(0.003, vel * 2, 4000, when, 'bandpass', 2);
  }
}

// Metro platform-door warning (S2): a pulsing ~3.1 kHz beep, then the door thump.
function doorWarning(cycles: number) {
  for (let i = 0; i < cycles; i++) {
    tone(3100, 0.4, 'sine', 0.05, i * 0.52);
    tone(6200, 0.4, 'sine', 0.005, i * 0.52);
  }
  const end = cycles * 0.52;
  noise(0.06, 0.35, 300, end);
  tone(90, 0.15, 'sine', 0.25, end);
}

// Announcement chime (S3, our own): E5 then C5 with long soft tails and a quiet octave.
function announceChime(when = 0) {
  for (const [f, at] of [[659, 0], [523, 0.35]]) {
    tone(f, 1.2, 'sine', 0.18, when + at);
    tone(f * 2, 1.0, 'sine', 0.035, when + at);
  }
}

/** Synth fallback for the bus horn (S6): "pa-pa-pooo" from two detuned saws. */
function synthBusHorn() {
  for (const [f, at, d] of [[392, 0, 0.12], [392, 0.15, 0.12], [330, 0.3, 0.45]]) {
    tone(f, d, 'sawtooth', 0.06, at);
    tone(f * 1.0017, d, 'sawtooth', 0.05, at);
  }
}

export const sfx = {
  ting: () => { tone(1320, 0.12, 'sine', 0.25); tone(1760, 0.18, 'sine', 0.2, 0.08); },
  cancel: () => { tone(520, 0.18, 'square', 0.12); tone(390, 0.3, 'square', 0.12, 0.15); },
  coin: () => { tone(988, 0.08, 'square', 0.1); tone(1319, 0.15, 'square', 0.1, 0.07); },
  tap: () => tone(660, 0.05, 'triangle', 0.15),
  bad: () => tone(160, 0.25, 'sawtooth', 0.15, 0, 90),
  /** Musical bus horn when you hop on: the recorded clip, or the synth if it isn't loaded. */
  horn: () => { if (!playClip('busHorn')) synthBusHorn(); },
  bump: () => noise(0.18, 0.5, 300),
  crash: () => { noise(0.4, 0.6, 1200); tone(120, 0.3, 'sawtooth', 0.2, 0, 60); },
  doorBeep: () => doorWarning(4),
  chime: () => announceChime(),
  /** Metro doors: the announcement chime, then the warning beep and thump. */
  metroDoor: () => { announceChime(); setTimeout(() => doorWarning(4), 1300); },
  /** News sting under each joke headline: the Kolkata tram bell, "ting-ting". */
  sting: () => tramBell(2),
  /** A longer tram bell, "ting-ting-ting-ting". */
  tram: () => tramBell(7),
  /** Shankh when the run starts (it plays on the unlocking tap, so wait briefly for the clip). */
  shankh: () => { playClip('shankh', { wait: 2.5 }); },
  /** Dhaak when you get home; synth fanfare if the clip isn't there. */
  dhaak: () => { if (!playClip('dhaak')) sfx.win(); },
  ring: () => { for (let i = 0; i < 2; i++) { tone(880, 0.09, 'sine', 0.15, i * 0.2); tone(1100, 0.09, 'sine', 0.15, i * 0.2 + 0.1); } },
  whoosh: () => noise(0.35, 0.25, 2500),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, i * 0.11)),
};

/** A continuous engine drone: a sawtooth wobbled by a low LFO, pitched by speed. */
export class Engine {
  private osc: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  constructor(private base: number, private wobble: number) {}

  start() {
    if (!ctx || !master || this.osc) return;
    this.osc = ctx.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = this.base;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0.05;
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'square';
    this.lfo.frequency.value = this.wobble;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.03;
    this.lfo.connect(lfoGain).connect(this.gain.gain);
    this.osc.connect(lp).connect(this.gain).connect(master);
    this.osc.start();
    this.lfo.start();
  }

  setSpeed(s: number) {
    if (this.osc) this.osc.frequency.value = this.base * (1 + s * 0.8);
  }

  stop() {
    this.osc?.stop();
    this.lfo?.stop();
    this.osc = this.lfo = null;
    this.gain = null;
  }
}
