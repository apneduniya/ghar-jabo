// Voice lines (task 034): Adarsh's recordings from public/sounds/voice/, loaded after the first tap, played one
// at a time through the master with the ambience beds ducked underneath. Until a line is recorded, its fallback
// from content/voice.ts plays instead (a shipped clip, a synth sound, or nothing beyond the on-screen text).

import { voices, VOICE, type VoiceId, type VoiceLine } from '../content/voice';
import { beds, ctx, master, onUnlock } from './core';
import { clipSecs, playClip } from './clips';
import { sfx } from './audio';
import { fetchVoice, recordedIds, VoiceChannel } from './voiceload';

const recorded = new Map<VoiceId, AudioBuffer>();
const channel = new VoiceChannel();
let wake: ReturnType<typeof setTimeout> | undefined;

const base = () => import.meta.env.BASE_URL;
const get = (url: string) => fetch(url);

onUnlock(() => {
  // After the clips have had a head start: voice files are the last thing a first tap needs.
  setTimeout(() => void (async () => {
    for (const id of await recordedIds(base(), get)) {
      const bytes = await fetchVoice(base(), id, get);
      if (!bytes || !ctx) continue;
      try { recorded.set(id, await ctx.decodeAudioData(bytes)); } catch { /* undecodable take: keep the fallback */ }
    }
  })(), 1500);
});

/** Whether Adarsh's recording of `id` is loaded (otherwise `voice(id)` plays the fallback). */
export const hasRecording = (id: VoiceId) => recorded.has(id);

/** Dip the beds for `secs` from `at` (AudioContext time), then bring them back. */
function duck(at: number, secs: number) {
  if (!beds) return;
  beds.gain.setTargetAtTime(VOICE.duckTo, at, VOICE.duckAttack);
  beds.gain.setTargetAtTime(1, at + secs, VOICE.duckRelease);
}

/**
 * Play voice line `id`: the recording if there is one, else its fallback. Never two lines at once (a line asked
 * for mid-line waits briefly or is dropped; see VoiceChannel). Synth fallbacks are effects, not voices: they
 * always play. Returns true if something was played or scheduled.
 */
export function voice(id: VoiceId): boolean {
  const line: VoiceLine = voices[id];
  const fb = line.fallback;
  const buf = recorded.get(id);
  if (!buf && fb.kind === 'sfx') { sfx[fb.sfx](); return true; }
  if (!buf && fb.kind === 'text') return false;
  if (!ctx || !master) return false;
  const now = ctx.currentTime;
  if (!channel.ask(id, now)) { schedule(); return false; }
  const delay = line.delay ?? 0;
  let secs: number;
  if (buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = VOICE.gain;
    src.connect(g).connect(master);
    src.start(now + delay);
    secs = buf.duration;
  } else if (fb.kind === 'clip' && playClip(fb.clip, { when: delay })) {
    secs = clipSecs(fb.clip);
  } else return false;
  if (line.duck) duck(now + delay, secs);
  channel.started(now, delay + secs);
  schedule();
  return true;
}

/** Wake when the channel frees up, to play a line that was waiting for it. */
function schedule() {
  if (!ctx) return;
  clearTimeout(wake);
  wake = setTimeout(() => {
    if (!ctx) return;
    const id = channel.next(ctx.currentTime);
    if (id) voice(id);
  }, channel.freeIn(ctx.currentTime) * 1000 + 20);
}
