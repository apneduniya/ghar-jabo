// All sound is synthesised in WebAudio: no files to download.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function unlockAudio() {
  if (ctx) { void ctx.resume(); return; }
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
}

export function toggleMute(): boolean {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

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

function noise(dur: number, gain = 0.3, filterFreq = 800) {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start();
}

export const sfx = {
  ting: () => { tone(1320, 0.12, 'sine', 0.25); tone(1760, 0.18, 'sine', 0.2, 0.08); },
  cancel: () => { tone(520, 0.18, 'square', 0.12); tone(390, 0.3, 'square', 0.12, 0.15); },
  coin: () => { tone(988, 0.08, 'square', 0.1); tone(1319, 0.15, 'square', 0.1, 0.07); },
  tap: () => tone(660, 0.05, 'triangle', 0.15),
  bad: () => tone(160, 0.25, 'sawtooth', 0.15, 0, 90),
  horn: () => { tone(415, 0.35, 'square', 0.08); tone(523, 0.35, 'square', 0.06); },
  bump: () => noise(0.18, 0.5, 300),
  crash: () => { noise(0.4, 0.6, 1200); tone(120, 0.3, 'sawtooth', 0.2, 0, 60); },
  doorBeep: () => { for (let i = 0; i < 4; i++) tone(1046, 0.12, 'square', 0.08, i * 0.25); },
  chime: () => { tone(659, 0.4, 'sine', 0.2); tone(523, 0.6, 'sine', 0.2, 0.35); },
  /** News sting under each joke headline: a tram-bell-ish ding-ding. */
  sting: () => { tone(1568, 0.5, 'triangle', 0.15); tone(1568, 0.6, 'triangle', 0.12, 0.18); },
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
