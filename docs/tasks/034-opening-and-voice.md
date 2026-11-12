# 034: A wider opening shot; voice lines ready for Adarsh's recordings (backlog 012, 014)

## A. Opening shot (012)
Today the run opens with the camera tight against the TIU wall. Open instead on a wider establishing shot of the TIU
gate and the Street No. 2 junction (the stalls opposite, the arched gateway, the traffic, the evening sky), then
glide down behind the student within ~2.5 s, or at once when the player touches the stick, swipes or presses a
key. Must work with the swipe-to-look camera (task 027) and in portrait and landscape. Skipped when coming back
from the station stage. Test: e2e that the first frame's camera is high/wide and that a touch ends the intro.

## B. Voice lines (014)
Adarsh will record lines on their phone. Make the game ready so dropping files in is all it takes:
- `src/content/voice.ts`: a manifest of voice lines: id, where it plays (bus conductor at hop-on/arrival/wrong
  bus, Green Line station announcement parody before Sealdah and at doors, Ma's call ring line, hawkers…), the
  exact words in Bengali (Bangla script + romanised) and English meaning, target length, and the fallback when
  no recording exists (today's synth/chime or an existing shippable clip: `conductor-sealdah-x3-proto.mp3`,
  `word-*.mp3` in research/sounds/shippable/, checking SOUNDS.md licences first).
- Audio: load `public/sounds/voice/<id>.mp3` lazily if present (missing file = silent fallback, no console error),
  play through the existing mixer with ducking of the traffic bed, never two voice lines at once.
- Wire the street and bus call sites (hop on, wrong bus "College More! College More!", depot, arrival at Sealdah,
  Rapi-Nah captain). Station call sites: expose `voice(id)` and list the station ids in the manifest; task 033
  (another builder) owns station.ts, so leave those call sites to the lead after both merge.
- `docs/VOICE.md`: a recording script for Adarsh: each line, how to say it (tone, speed, a reference: e.g. a
  conductor shouting stop names three times fast), take length, how to record on an iPhone (Voice Memos, quiet
  room, 20 cm from the mouth, one file per line, name = id), and how to hand them over (drop in a folder; the
  lead trims, normalises and converts them with ffmpeg). Keep jokes about situations, not communities; no real
  politicians or brands.
- Credits: recorded lines credited to Adarsh in the README's sound credits once real files exist.
Tests: unit test that every manifest id has words, a fallback and a play site; the loader treats a 404 as silent.
Acceptance: `npm run check` green, bundle ≤ 250 KB (voice files are fetched, not bundled), Mac GPU screenshots of the
opening shot (portrait and landscape).
Files you may touch: src/stages/sectorv.ts (opening camera only), src/audio/*, src/content/voice.ts (new),
src/content/sounds.ts, src/sim/world.ts (event emits only), src/sim/events.ts (append), docs/VOICE.md (new),
README.md (credits section), public/sounds/ (fallback clips only, with licences), tests, tests/e2e/ (new spec).
Out of scope: station.ts (033).
