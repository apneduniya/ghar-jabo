import { describe, expect, it, vi } from 'vitest';
import { voices, VOICE, type VoiceId } from '../content/voice';
import { clips } from '../content/sounds';
import { sfx } from './audio';
import { fetchVoice, recordedIds, VoiceChannel } from './voiceload';

// No Node types in this browser project: load fs untyped (tests run in Node).
const fsModule = 'node:fs';
const fs = (await import(fsModule)) as { readFileSync(p: string, enc: 'utf8'): string; readdirSync(p: string): string[] };

const ids = Object.keys(voices) as VoiceId[];
const bangla = /[ঀ-৿]/;

describe('voice manifest', () => {
  it('every line has its words in Bangla script, romanised and in English, a length and a play site', () => {
    for (const id of ids) {
      const v = voices[id];
      expect(v.bn, id).toMatch(bangla);
      expect(v.roman.length, id).toBeGreaterThan(5);
      expect(v.roman, id).not.toMatch(bangla);
      expect(v.en.length, id).toBeGreaterThan(5);
      expect(v.plays.length, id).toBeGreaterThan(10);
      expect(v.who.length, id).toBeGreaterThan(2);
      expect(v.secs, id).toBeGreaterThan(0.5);
      expect(v.secs, id).toBeLessThanOrEqual(5);
      expect(id, 'ids are file names').toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
  it('every fallback is a shipped clip, a synth sound or the on-screen text', () => {
    for (const id of ids) {
      const f = voices[id].fallback;
      if (f.kind === 'clip') expect(clips[f.clip], id).toBeDefined();
      else if (f.kind === 'sfx') expect(typeof sfx[f.sfx], id).toBe('function');
      else expect(f.kind, id).toBe('text');
    }
  });
  it('street, bus and Rapi-Nah lines are wired to their play sites; station and phone lines are listed for the lead', () => {
    const src = fs.readFileSync('src/sim/world.ts', 'utf8') + fs.readFileSync('src/audio/ambience.ts', 'utf8');
    for (const id of ids) {
      if (['bus', 'street', 'rapinah'].includes(voices[id].site)) expect(src, id).toContain(`'${id}'`);
    }
    expect(ids.filter((id) => voices[id].site === 'station').length).toBeGreaterThanOrEqual(3);
  });
  it('the recordings index lists exactly the voice files present, and only known ids', () => {
    const files = fs.readdirSync('public/sounds/voice').filter((f) => f.endsWith('.mp3')).map((f) => f.replace(/\.mp3$/, ''));
    const index = JSON.parse(fs.readFileSync(`public/${VOICE.index}`, 'utf8')) as string[];
    expect([...index].sort()).toEqual([...files].sort());
    for (const id of index) expect(ids).toContain(id);
  });
  it('the recording script covers every line', () => {
    const doc = fs.readFileSync('docs/VOICE.md', 'utf8');
    for (const id of ids) expect(doc, id).toContain(`\`${id}\``);
  });
});

const res = (status: number, body: unknown = null) => ({
  ok: status >= 200 && status < 300,
  arrayBuffer: async () => new ArrayBuffer(8),
  json: async () => body,
});

describe('voice loader', () => {
  it('treats a 404 as no recording: no throw, nothing logged', async () => {
    const err = vi.spyOn(console, 'error');
    const warn = vi.spyOn(console, 'warn');
    expect(await fetchVoice('/', 'bus-sealdah', async () => res(404))).toBeNull();
    expect(await recordedIds('/', async () => res(404))).toEqual([]);
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
  it('treats a network error or a broken index as no recordings', async () => {
    expect(await fetchVoice('/', 'bus-sealdah', async () => { throw new TypeError('offline'); })).toBeNull();
    expect(await recordedIds('/', async () => res(200, { not: 'a list' }))).toEqual([]);
    expect(await recordedIds('/', async () => { throw new TypeError('offline'); })).toEqual([]);
  });
  it('fetches from public/sounds/voice/<id>.mp3 and keeps only known ids from the index', async () => {
    const urls: string[] = [];
    const get = async (u: string) => { urls.push(u); return res(200, ['bus-sealdah', 'not-a-line', 7]); };
    expect(await recordedIds('/gj/', get)).toEqual(['bus-sealdah']);
    expect(await fetchVoice('/gj/', 'bus-sealdah', get)).toBeInstanceOf(ArrayBuffer);
    expect(urls).toEqual(['/gj/sounds/voice/index.json', '/gj/sounds/voice/bus-sealdah.mp3']);
  });
});

describe('one voice at a time', () => {
  it('a line asked for mid-line waits for it, then plays', () => {
    const c = new VoiceChannel(2.5);
    expect(c.ask('bus-sealdah', 0)).toBe(true);
    c.started(0, 2);
    expect(c.ask('bus-depot', 1)).toBe(false);
    expect(c.next(1.5)).toBeNull();
    expect(c.next(2 + VOICE.gap)).toBe('bus-depot');
    expect(c.next(3)).toBeNull();
  });
  it('a newer waiting line replaces an older one; a stale one is dropped', () => {
    const c = new VoiceChannel(2.5);
    c.started(0, 2);
    c.ask('bus-full', 0.5);
    c.ask('bus-depot', 1);
    expect(c.next(2.3)).toBe('bus-depot');
    c.started(10, 2);
    c.ask('bus-full', 10.5);
    expect(c.next(13.5)).toBeNull(); // waited longer than 2.5 s: dropped
  });
  it('hawkers never wait (they are part of the street, not a line)', () => {
    const c = new VoiceChannel(2.5);
    c.started(0, 1);
    expect(c.ask('hawker-cha', 0.5)).toBe(false);
    expect(c.next(2)).toBeNull();
    expect(c.freeIn(0.5)).toBeCloseTo(0.5 + VOICE.gap);
  });
});
