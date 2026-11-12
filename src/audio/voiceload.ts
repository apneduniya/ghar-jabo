// The DOM-free half of voice playback (task 034), so it can be unit tested: which recordings exist, fetching one
// (a 404 or a network error is a quiet "no recording"), and the one-voice-at-a-time channel.

import { voices, VOICE, type VoiceId } from '../content/voice';

type Get = (url: string) => Promise<{ ok: boolean; arrayBuffer(): Promise<ArrayBuffer>; json(): Promise<unknown> }>;

/** The ids listed in the recordings index that the manifest knows. A missing or broken index means none. */
export async function recordedIds(base: string, get: Get): Promise<VoiceId[]> {
  try {
    const res = await get(`${base}${VOICE.index}`);
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? list.filter((id): id is VoiceId => typeof id === 'string' && id in voices) : [];
  } catch {
    return [];
  }
}

/** One recording's bytes, or null when it isn't there (404, offline): never throws, never logs. */
export async function fetchVoice(base: string, id: VoiceId, get: Get): Promise<ArrayBuffer | null> {
  try {
    const res = await get(`${base}${VOICE.dir}${id}.mp3`);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/**
 * Never two voice lines at once. A line asked for while another plays waits for it (one slot: a newer line
 * replaces an older waiting one) if it can start within `maxWait` seconds; otherwise it is dropped. Lines that
 * belong to the street (hawkers) never wait. Times are in seconds on any clock that only moves forward.
 */
export class VoiceChannel {
  private busyUntil = -Infinity;
  private waiting: { id: VoiceId; until: number } | null = null;

  constructor(private maxWait = 2.5) {}

  /** May `id` start at `now`? If not, it may be parked as the waiting line. */
  ask(id: VoiceId, now: number): boolean {
    if (now >= this.busyUntil) return true;
    if (voices[id].duck && this.busyUntil - now <= this.maxWait) this.waiting = { id, until: now + this.maxWait };
    return false;
  }

  /** A line started at `now` and lasts `secs`. */
  started(now: number, secs: number) {
    this.busyUntil = now + secs + VOICE.gap;
  }

  /** The waiting line, once the channel is free (and the wait hasn't run out). */
  next(now: number): VoiceId | null {
    if (!this.waiting || now < this.busyUntil) return null;
    const w = this.waiting;
    this.waiting = null;
    return now <= w.until ? w.id : null;
  }

  /** Seconds until the channel is free (0 when it is). */
  freeIn(now: number) { return Math.max(0, this.busyUntil - now); }
}
