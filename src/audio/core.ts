// The one AudioContext and master gain. Created on the first tap (browsers block audio before a gesture).
// Mute zeroes the master, so synth and clips both go quiet. A hidden tab suspends the context.

const MASTER = 0.5;

export let ctx: AudioContext | null = null;
export let master: GainNode | null = null;
/** The ambience beds (traffic, crows, rain) go through this, so a voice line can duck them (audio/voice.ts). */
export let beds: GainNode | null = null;
let muted = false;
const unlockHooks: (() => void)[] = [];

/** Run `fn` once audio is unlocked (immediately if it already is). */
export function onUnlock(fn: () => void) {
  if (ctx) fn(); else unlockHooks.push(fn);
}

export function unlockAudio() {
  if (ctx) { if (!document.hidden) void ctx.resume(); return; }
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER;
  master.connect(ctx.destination);
  beds = ctx.createGain();
  beds.connect(master);
  for (const fn of unlockHooks.splice(0)) fn();
}

export const isMuted = () => muted;

export function toggleMute(): boolean {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : MASTER;
  return muted;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend(); else void ctx.resume();
  });
}
