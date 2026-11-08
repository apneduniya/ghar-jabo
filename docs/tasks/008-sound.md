# 008: Kolkata sound

Goal: the game should *sound* like Sector V at 6:30 PM. Use the licensed clips we already have, keep the
synthesised effects, and add a synthesised tram bell and metro door chime.

Acceptance:
- [ ] `src/audio/clips.ts`: loads clips lazily (after the first tap unlocks audio), plays one-shots and looping beds
      with per-clip gain; missing or failed clips are skipped silently. Never blocks the first frame.
- [ ] Copy only the clips we use from `research/sounds/shippable/` into `public/sounds/` (keep each ≤ 120 KB;
      re-encode mono 64–96 kbps with ffmpeg if needed). Credits stay in README (add any new ones).
- [ ] Ambient beds on the real map: traffic horns (louder as the jam grows: `run.jam`), crows; rain bed near the
      Webel More flood (`src/content/sectorv.ts` floods); a hawker call occasionally on the café strip.
- [ ] One-shots: musical bus horn when you hop on a bus (sim event `sfx: 'horn'` → play the clip, fall back to synth),
      shankh when a run starts (the lobby CHOLO), dhaak on reaching home (win).
- [ ] Synth (in `src/audio/audio.ts`, WebAudio, no files): Kolkata tram bell "ting-ting" for the news sting, and a
      metro door chime + beep (recipes in `research/sounds/SOUNDS.md`).
- [ ] Mute (M key) mutes clips too. Audio pauses when the tab is hidden.
- [ ] Tests: unit test for the pure parts (e.g. jam → horn bed gain mapping, clip manifest has credits/licences);
      `npm run check` green; bundle stays under the size limit (clips are static assets, not in the JS bundle).

Files you may touch: `src/audio/**`, `public/sounds/**`, `README.md` (credits), `src/stages/sectorv.ts`
(only to call into audio: ambience update per frame and the start/stop of beds), `src/stages/lobby.ts`
(shankh on CHOLO), `src/stages/result.ts` (dhaak on win endings), `src/content/sounds.ts` (new: manifest).

Out of scope: recording voices (Adarsh will record conductor lines later), changing game rules in `src/sim/`.
