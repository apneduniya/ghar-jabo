# Ghar Jabo: Kolkata sound research

Researched 8 Nov 2026. All clips are mono 44.1 kHz MP3 at 96 kbps, loudness-normalised (about -16 LUFS), 6 s or shorter, with short fades.

- `shippable/`: freely licensed (CC0, CC BY, Public Domain Mark). Safe to ship if you add the credits listed below.
- `reference/`: YouTube and BBC clips. **Reference only, not shippable.** None of the YouTube videos has a CC licence (yt-dlp reports `license: NA`, which means the standard YouTube licence).

**The short version:** you can legally ship the street, weather and ritual sounds: horns, rain, shankh, hawkers, crows and dhaak. Nothing freely licensed exists for the sounds that make the commute specifically Kolkata: conductor shouts, Green Line announcements and the tram bell. Plan to **record** the voices and **synthesise** the bells and beeps. Instructions for both are at the end.

Timestamps in the reference rows are offsets into the source video (m:ss). I located clips from spectrograms and a local Whisper pass, not by listening, so check each one by ear before relying on it.

## Inventory

| Sound | Why it's iconic | File | Source | Licence / attribution | Ship? | Dur |
|---|---|---|---|---|---|---|
| Calcutta traffic horns (street) | The constant layered honking of central Kolkata | `shippable/traffic-horns-calcutta.mp3` (176–182 s) | https://freesound.org/s/576484/ | CC0, TRP ("India, street, traffic, horns, voices, Calcutta, 10") | yes | 6.0 s |
| Calcutta traffic horns, take 2 | Same, a different horn mix | `shippable/traffic-horns-calcutta-2.mp3` (9–15 s) | https://freesound.org/s/576484/ | CC0, TRP | yes | 6.0 s |
| Rain + traffic + horns, Calcutta | Monsoon traffic for the rain level | `shippable/rain-traffic-horns-calcutta.mp3` (30–36 s) | https://freesound.org/s/576486/ | CC0, TRP | yes | 6.0 s |
| Rain on a tin shed, Kolkata rooftop | Summer storm on tin, as asked. Recorded under a tin shed in Chittaranjan Colony, Kolkata | `shippable/rain-tin-shed-kolkata.mp3` (58–64 s, heaviest part) | https://archive.org/details/aporee_55111_63012 (radio aporee) | Public Domain Mark 1.0, Sukanta Majumdar. Credit is optional; give it anyway | yes | 6.0 s |
| Rain on a fibre roof at night, Kolkata | Steady, loopable rain bed | `shippable/rain-fiber-roof-kolkata.mp3` (20–26 s) | https://freesound.org/s/398581/ | CC0, Sagnik_Basu | yes | 6.0 s |
| Shankh (conch) | Evening sandhya shankh from every para; the dusk/news sting | `shippable/shankh-conch-dusk.mp3` (1.2–7.2 s: steady note, then the tongue-flutter, then the hold) | https://freesound.org/s/746592/ | CC0, rsn267 | yes | 6.0 s |
| Conch (alternative) | Backup conch, cleaner but less "puja" | `shippable/shankh-conch-alt.mp3` | https://commons.wikimedia.org/wiki/File:Conch_shell.ogg | CC BY 2.5, David Bolton (Wikimedia Commons) | yes (credit) | 6.0 s |
| Kolkata hawker call | A street vendor's sing-song cry | `shippable/hawker-call-kolkata.mp3` (3.5–9.5 s) | https://freesound.org/s/608765/ | CC BY 4.0, rain+ ("Kolkata hawker call") | yes (credit) | 6.0 s |
| Fish hawker ("Talapia!") | The para fish-seller's call, very North/South Kolkata | `shippable/hawker-fish-talapia.mp3` (1.5–7.5 s) | https://freesound.org/s/548482/ | CC BY 4.0, rain+ ("fish hawker in Kolkata") | yes (credit) | 6.0 s |
| House crows of Calcutta | The ever-present "kaa-kaa" over every Kolkata scene; the cheapest instant sense of place | `shippable/crows-calcutta.mp3` (3.5–9.5 s) | https://freesound.org/s/249567/ | CC0, Calcuttan | yes | 6.0 s |
| Dhaak (Durga Puja drums) | The one sound every Bengali knows; use for a Pujo-season run or the win jingle | `shippable/dhaak-durga-puja.mp3` (60–66 s) | https://freesound.org/s/592301/ | CC BY 4.0, AnneshaGhosh | yes (credit) | 6.0 s |
| Central Kolkata street ambience | Background bed: Nehru Road (Chowringhee) near the Maidan, 2002 | `shippable/street-ambience-esplanade.mp3` (60–66 s) | https://archive.org/details/aporee_55914_63889 | Public Domain Mark 1.0, Jean-François Cavro | yes | 6.0 s |
| Musical bus horn | The multi-tone "melody" air horn on private and long-distance buses. **Recorded on an Indian sleeper bus, not in Kolkata**, but it's the right kind of horn | `shippable/bus-horn-musical.mp3` (2–6 s) | https://freesound.org/s/508540/ | CC0, SoundEnsemble | yes | 4.0 s |
| Place names spoken in Bangla: Sealdah, Bidhannagar, Howrah, Dharmatala | Raw material for conductor calls. These are calm dictionary pronunciations, not shouts | `shippable/word-sealdah.mp3`, `word-bidhannagar.mp3`, `word-howrah.mp3`, `word-dharmatala.mp3` | Lingua Libre on Commons, e.g. https://commons.wikimedia.org/wiki/File:LL-Q9610_(ben)-Titodutta-শিয়ালদহ.wav | CC0, Titodutta (Lingua Libre) | yes | 1.1–1.4 s |
| "Jhalmuri" spoken | Raw material for a hawker line (calm, not sung) | `shippable/word-jhalmuri.mp3` | https://commons.wikimedia.org/wiki/File:LL-Q9610_(ben)-Titodutta-ঝালমুড়ি.wav | CC0, Titodutta | yes | 1.6 s |
| Conductor "Sealdah ×3" prototype | Proof of concept: the CC0 "Sealdah" word sped up, pitched up 6% and looped three times. It sounds like a fast robot, not a conductor; use it only until Adarsh records the real one | `shippable/conductor-sealdah-x3-proto.mp3` | derived from the CC0 file above | CC0 | yes (placeholder) | 1.9 s |
| **Kolkata tram bell** | The CTC tram's foot-gong "ting-ting-ting" | `reference/tram-bell-kolkata.mp3` | https://www.youtube.com/watch?v=JrZp245tLOI at 0:10.6–0:16.6 (irsunelo, "Tram in Kolkata. Tram driver rining Bell") | YouTube standard licence | **no, reference only** | 6.0 s |
| **Green Line announcement (Bangla)**: "Porer station Mahakaran…" | The East-West Metro voice | `reference/metro-greenline-porer-station-mahakaran.mp3` | https://www.youtube.com/watch?v=nc9RBb4MTEk at 0:04.8–0:10.8 (India Mixed Vlog) | YouTube standard licence | **no, reference only** | 6.0 s |
| **Green Line announcement (Hindi)**: "Agla station Esplanade…" | The same announcement in Hindi | `reference/metro-greenline-agla-station-esplanade-hi.mp3` | same video, 1:39.2–1:45.2 | YouTube standard licence | **no, reference only** | 6.0 s |
| **Green Line announcement (English)**: "The next station is Esplanade" | The same announcement in English, with "mind the gap between the train and platform" just before it | `reference/metro-greenline-next-station-esplanade-en.mp3` | same video, 1:51.5–1:57.5 | YouTube standard licence | **no, reference only** | 6.0 s |
| **Green Line announcement (Bangla), Esplanade** | Second Bangla take | `reference/metro-greenline-porer-station-esplanade-bn.mp3` | same video, 1:59.9–2:05.9 | YouTube standard licence | **no, reference only** | 6.0 s |
| **Metro platform-screen-door warning beep** | The steady high beep before the doors move | `reference/metro-platform-door-beep.mp3` | https://www.youtube.com/watch?v=LkEITFl-X3w at 0:00–0:06 (Khalid saifi, "kolkata metro station platform screen door (crrc)") | YouTube standard licence | **no, reference only** | 6.0 s |
| **Conductor calling** (Bangla bus banter, "ladies…", "chalo") | Conductor rhythm and pitch | `reference/conductor-calls-aste-ladies.mp3` | https://www.youtube.com/watch?v=7jXcyiTpf6Q at 1:03.5–1:09.5 (GUITAR JASUS, "KOLKATA BUS CONDUCTOR STYLE") | YouTube standard licence | **no, reference only** | 6.0 s |
| **Conductor reading out Sector V stops** (AC9 CSTC bus: "…Land office, Wipro office, TCS office…") | Our exact route and setting: a conductor rattling off Sector V stops | `reference/conductor-ac9-sector5-stops.mp3` | https://www.youtube.com/watch?v=p6wzZc1lunU at 0:45.5–0:51.5 (Soumik's Diary) | YouTube standard licence | **no, reference only** | 6.0 s |
| **Kolkata horn "symphony"** | Dense car and taxi horns, including old Ambassador-style electric horns | `reference/traffic-horn-symphony-kolkata.mp3` | https://www.youtube.com/watch?v=FihIa8mis_Y at 0:06.5–0:12.5 (fruittbatt) | YouTube standard licence | **no, reference only** | 6.0 s |
| **Street horns next to a hand-pulled rickshaw** | Short honks in narrow North Kolkata lanes | `reference/street-horns-rickshaw.mp3` | https://www.youtube.com/watch?v=Zriq8-qtxKc at 0:09.5–0:15.5 | YouTube standard licence | **no, reference only** | 6.0 s |
| **Calcutta street with rickshaw bells** | Archival (1980s–90s BBC) street with cycle-rickshaw bells and buses | `reference/bbc-calcutta-street-bells.mp3` (64–70 s) | BBC Sound Effects 07054129, "Calcutta: City street with traffic (rickshaws, buses, cars, etc.), footsteps, bells, some distinct speech" | BBC RemArc licence: personal, educational and research use only. A public game needs a paid commercial licence (via Pro Sound Effects) | **no, reference only** | 6.0 s |

### Searched for but not downloaded (references only)

- Overloaded Kolkata buses with people hanging off them (footboard visuals and engine): https://www.youtube.com/watch?v=Bw1sqXRycKY (WildFilmsIndia). No usable speech.
- Bus service in Salt Lake: https://www.youtube.com/watch?v=ARZSYiZ2hMU
- Ambassador car sound effects (horn, door, engine): https://www.youtube.com/watch?v=kYn3dElAeyQ. Useful for matching the taxi horn timbre.
- Bengal private/luxury bus musical horn: https://www.youtube.com/watch?v=KJ-iG5O3Mm8
- Sealdah to R.G. Kar bus 3C/1 (real bus banter): https://www.youtube.com/watch?v=w74W5Lm6mCw
- Local train announcement at Bidhannagar Road: https://www.youtube.com/watch?v=gJzAWzVT4Lg
- Kolkata Jadavpur station platform (Sealdah South line; PD Mark, radio aporee): https://archive.org/details/aporee_55126_63013. Shippable if we want a local-train bed.
- Howrah Bridge ambience (PD Mark, radio aporee): https://archive.org/details/aporee_55905_63880
- Freesound has more CC0 Howrah station recordings (TRP 576481–576483, AshruKumarsEye 737619) and more CC BY Kolkata hawker calls (rain+ pack 33527: 608760–608766).

## Top 10 to use first (ranked)

1. **Conductor "Sealdah-Sealdah-Sealdah!"**: *record* (script R1). This is the sound of the game. Until Adarsh records it, use `conductor-sealdah-x3-proto.mp3` as a placeholder.
2. **Green Line announcement, "Porer station Sealdah. Darja dan dike khulbe."**: *record* our own parody version (R6). The official voice is copyrighted; `reference/metro-greenline-*` shows how it should sound.
3. **Kolkata traffic horns**: `shippable/traffic-horns-calcutta.mp3` (CC0). Use it under every road scene.
4. **Tram bell "ting-ting-ting"**: *synthesise* (S1). It works as the news sting and the near-miss warning.
5. **Shankh at dusk**: `shippable/shankh-conch-dusk.mp3` (CC0). Use it for the 6:30 PM start, the "it's getting late" cue, or the receipt sting.
6. **Rain on tin**: `shippable/rain-tin-shed-kolkata.mp3` (PD Mark), with a *synthesised* puddle splash (S5) for the waterlogging level.
7. **"Pichhone egiye jaan!"**: *record* (R2). Plays when pushing into a bus or the metro crowd.
8. **Conductor slapping the bus side, then "Aste, ladies, kole bachcha!"**: *record* (R3 and R4). Signals that the bus is leaving or slowing.
9. **Musical bus horn**: `shippable/bus-horn-musical.mp3` (CC0). Use it when a bus pulls away.
10. **Hawker call**: `shippable/hawker-call-kolkata.mp3` (CC BY, credit rain+), or a recorded "Jhaal-muri!" or "Cha garam!" (R7) at the café strip.

Easy extras: `crows-calcutta.mp3` (CC0) as a background bed costs nothing and reads as Kolkata at once. Keep `dhaak-durga-puja.mp3` for a festive variant or the "Ghar pouchhe gechi!" win.

## Plan for sounds we can't ship

### Recordable by Adarsh (phone, 1–3 s each)

Record in a quiet room with the phone about 30 cm away, slightly off-axis so plosives don't pop. Do 3 takes of each and keep the best. Afterwards we can add a little bus or road bed under each and band-limit it to 300 Hz–5 kHz so it sounds outdoors and a bit "megaphone". Don't imitate the real metro announcer's voice. Write our own announcement text in our own voice so it stays parody.

| # | Line (Roman / Bangla) | Delivery | Length |
|---|---|---|---|
| R1 | "Shiyalda-Shiyalda-Shiyalda! Ultodanga, Bidhannagar, Shiyalda!" (শিয়ালদা-শিয়ালদা-শিয়ালদা! উল্টোডাঙা, বিধাননগর, শিয়ালদা!) | Very fast and nasal, almost sung. The first three run together with the stress on "-da". Pitch rises on the last "Shiyal-DAAA". Shouted from the footboard. Also record a short "Shiyalda-Shiyalda" (1 s) | 2.5 s |
| R1b | "Ultodanga! Ultodanga!" and "Bidhannagar! Bidhannagar!" separately | Same shout. The second repeat is clipped | 1.2 s each |
| R2 | "Pichhone egiye jaan! Pichhone egiye jaan, dada!" (পিছনে এগিয়ে যান!) | Irritated, half-bored, loud. Falling pitch on "jaan" | 2 s |
| R3 | Conductor slap: two quick flat-palm slaps on a steel almirah, car door or tin sheet, "dhap-dhap", about 150 ms apart. Record a slow "dhap… dhap" too | Hard, flat hand. Leave a small ring-out | 0.6 s |
| R4 | "Aste, ladies! Kole bachcha!" (আস্তে, লেডিস! কোলে বাচ্চা!) | Shouted forward to the driver, urgent. Long "Aaaa-ste". Optional "Thamo, thamo!" on its own | 1.5 s |
| R5 | "Ar ekjon! Ar ekjon! Sector Five, Ar ekjon!" (আর একজন!) | Auto-stand caller, sing-song and lazy, repeated | 2 s |
| R6 | Metro parody, in three versions. Bangla: "Porer station, Shiyalda. Darja dan dike khulbe." Hindi: "Agla station, Sealdah. Darwaze daayin taraf khulenge." English: "Next station, Sealdah. Doors will open on the right. Please mind the gap." | Calm, slow, flat "PA" voice, slightly over-enunciated. Each language as its own file. Put a 2-tone chime before it (see S3) | 3–4 s each |
| R7 | "Jhaaal-muuuri! Jhalmuri!" and "Cha garam! Cha, cha, cha!" | Sing-song hawker cry. Stretch the first vowel, then a quick repeat | 1.5 s each |
| R8 (optional) | "Dada, ektu sorun!" ("Brother, move a bit!") and "Namben? Namben?" (conductor asking who's getting off) | Polite but pushy / fast and bored | 1 s each |

### Synthesisable (WebAudio recipes)

**S1. Kolkata tram bell (foot gong "ting-ting-ting").** Measured from the reference clip: an inharmonic bell with strong partials at about **1650, 2350, 3050, 3800 and 4600 Hz** (ratios roughly 1 : 1.42 : 1.85 : 2.30 : 2.79), struck in rapid bursts.
- For each strike, add five sine oscillators at those frequencies (randomise each by ±1%). Relative gains are 1.0, 0.8, 0.5, 0.3 and 0.15.
- Envelope: 2 ms attack, then exponential decay. The lowest partial decays over about 0.6 s; each higher partial decays faster (0.45, 0.35, 0.25, 0.18 s).
- Add a 3 ms white-noise click through a bandpass at 4 kHz (Q 2) at the start of each strike.
- Pattern: 6–10 strikes about 120–140 ms apart with ±15% velocity jitter, so it sounds like "ting-ting-ting-ting". Two strikes make a short "ting-ting" sting.

**S2. Metro platform-door warning beep.** From the reference clip: a steady **~3.1 kHz** tone (slightly above 3 kHz) that pulses while the doors move.
- Sine at 3100 Hz plus 10% of 6200 Hz, highpassed at 1 kHz.
- 400 ms on and 120 ms off, about 6 cycles (3 s), with 5 ms ramps.
- End on a door thump: a 60 ms noise burst lowpassed at 300 Hz, plus a 90 Hz sine decaying over 150 ms.

**S3. Announcement chime** (to play before R6; our own design, not the official one). Two sine-with-soft-attack notes, **E5 (659 Hz) then C5 (523 Hz)**, each 350 ms with a 1.2 s exponential tail, plus a quiet octave (×2) at 20% gain.

**S4. AFC gate beep** (no Kolkata reference found; this is our own design). Token accepted: one 2.4 kHz square wave through a lowpass at 5 kHz, 90 ms, then a flap "clack" (20 ms noise burst bandpassed at 1.5 kHz). Rejected: two 900 Hz square beeps, 150 ms each with a 80 ms gap, and a red light.

**S5. Puddle splash / wading.** For a splash, take white noise through a bandpass whose centre sweeps 800 → 2500 → 600 Hz over 250 ms (Q 1.5), with a 10 ms attack and 300 ms decay. Add a 120 Hz sine "plop" that drops to 70 Hz over 80 ms. For wading, play splashes at 0.6–0.8 s intervals with random pitch (±20%) under the rain bed.

**S6. Kolkata private-bus air horn.** These are usually 2–3 trumpets fired in a quick tune ("pa-pa-pooo").
- Use two sawtooth oscillators detuned 3 cents, through a bandpass at 1.2 kHz (Q 0.8) and a waveshaper for rasp.
- Notes: **G4 (392 Hz) 120 ms, G4 120 ms, E4 (330 Hz) 450 ms**, with 15 ms attacks and the pitch sagging 20 cents at the start of each note (air pressure).
- For comparison, the CC0 `bus-horn-musical.mp3` has strong partials around 650–900 Hz with harmonics up to 5 kHz.

**S7. Yellow Ambassador taxi horn.** The classic "paa-paa" electric disc horn: nasal and a little sour.
- Two square oscillators at **~410 Hz and ~500 Hz** (an un-tuned interval), through a bandpass at 2.2 kHz (Q 1.2) and a soft-clip waveshaper.
- Two blasts of 180 ms with an 80 ms gap and 5 ms attacks. Each blast drops about 2% in pitch toward its end.
- Check against `reference/traffic-horn-symphony-kolkata.mp3` and the Ambassador video above.

## Credits block (paste into the game's credits)

```
Sounds:
"India, street, traffic, horns, voices, Calcutta, 10" and "India, rain, med-heavy, traffic, horns, Calcutta, 10" by TRP (freesound.org, CC0)
"Rain On Fiber Roof at Night" by Sagnik_Basu (freesound.org, CC0)
"Shankh Sound" by rsn267 (freesound.org, CC0)
"Crows of Calcutta" by Calcuttan (freesound.org, CC0)
"-03 SE 4CH ATMO BUS sleeper melodic funny horn" by SoundEnsemble (freesound.org, CC0)
"Kolkata hawker call" and "fish hawker in Kolkata" by rain+ (freesound.org/people/rain+/), CC BY 4.0, trimmed
"Dhaak beats from Kolkata - Durga Puja" by AnneshaGhosh (freesound.org/s/592301/), CC BY 4.0, trimmed
"Conch shell" by David Bolton (Wikimedia Commons), CC BY 2.5, trimmed
Bengali place-name recordings by Titodutta (Lingua Libre / Wikimedia Commons, CC0)
"Summer rain and storm", Kolkata, by Sukanta Majumdar (radio aporee, Public Domain)
"Calcutta - Nehru road" by Jean-François Cavro (radio aporee, Public Domain)
```

## Gaps (what we couldn't find)

- **No freely licensed recording** of a Kolkata bus conductor's shout, the Green Line or any Kolkata Metro announcement, the Kolkata tram bell, the yellow Ambassador taxi horn, the AFC gate beep, the bus-side slap, "Ar ekjon", or "Cha garam". Freesound, Wikimedia Commons, the Internet Archive (including radio aporee) and BBC Sound Effects have nothing for these.
- **Green Line door chime:** the reference video is a noisy in-train phone recording, so the chime before each announcement isn't clear enough to transcribe. S3 is our own chime, not a copy.
- **"Darja dan dike khulbe":** the Bangla door line is in the reference audio, but Whisper couldn't transcribe it reliably, so check the exact wording by ear.
- **Pixabay** blocks scripted access (Cloudflare challenge), so I couldn't search it here. It reportedly has a CC0-style clip, "Streets of Kolkata – Approaching Tram with Urban Ambience" by arunangshubanerjee. That's worth checking in a browser: it might give a shippable tram (Pixabay licence allows use in games).
- **Hoopr.ai** lists a Kolkata SFX pack (tram interior and approach). It needs an account and a paid licence, so I didn't use it.
- **YouTube auto-subtitles** were rate-limited (HTTP 429). Timestamps came from spectrograms and Whisper instead, so treat them as ±1 s.
