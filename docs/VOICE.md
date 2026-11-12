# Voice lines: recording script

Adarsh records these on their phone. Each line takes a few minutes: read it, do three takes, keep the best.
The game is already wired: until a line is recorded it plays a placeholder (a clip, a chime, or just the text on
screen), and once the file is dropped in, the recording plays instead. Nothing else in the code changes.

The words, ids and play sites live in `src/content/voice.ts`; this page is the same list, written for the person
holding the phone.

## How to record (iPhone)

1. **App:** Voice Memos. Settings → Voice Memos → Audio Quality → **Lossless**. Don't apply "Enhance Recording"
   afterwards (it gates the room sound and makes shouts pump); the lead cleans the takes.
2. **Room:** small and soft: a bedroom with curtains and a bed, or a wardrobe of clothes. No fan, no AC, no
   pressure cooker. Close the window (the real traffic will be added by the game).
3. **Phone:** about **20 cm** from your mouth (a spread hand plus a bit), mic at the bottom edge pointing at your
   chin, slightly off to one side so "p" and "b" don't pop. Keep the same distance for every take.
4. **Takes:** one memo per line. Say the line **three times** in that memo with a two-second gap between takes.
   Leave a second of silence at the start and end. Don't worry about trimming.
5. **Level:** shouts are meant to be loud, but don't clip: for the conductor lines, step back to 40 cm instead of
   holding back the voice.
6. **Name** each memo exactly as the line's id (`bus-sealdah`, `metro-doors-closing`…). Long-press the memo →
   Rename.
7. Check one take with headphones before doing the rest: if you hear the fan or a hum, move rooms.

## How to hand them over

Share the memos (select → Share → Save to Files) into one folder, e.g. `Ghar Jabo voice`, and send the folder
(AirDrop to the Mac, or Google Drive). `.m4a` is fine. The lead then, for each file:

```sh
# pick the best take by ear, note its start/end seconds, then trim, clean, level and convert:
ffmpeg -i bus-sealdah.m4a -ss 3.1 -to 5.8 \
  -af "highpass=f=90,lowpass=f=9000,afade=t=in:d=0.02,areverse,afade=t=in:d=0.08,areverse,loudnorm=I=-16:TP=-1.5:LRA=7" \
  -ac 1 -ar 44100 -b:a 96k public/sounds/voice/bus-sealdah.mp3
```

- Conductor and hawker lines may get a little outdoor colour: add `,highpass=f=300,lowpass=f=5000` for a
  footboard/megaphone feel (SOUNDS.md). Metro lines stay clean and slightly bright.
- Keep each file within the target length (±0.5 s) and under 60 KB.
- Add the id to `public/sounds/voice/index.json` (the game only fetches ids listed there, so a missing take never
  shows up as a 404). A unit test fails if the index and the files disagree.
- Add "Voice lines: Adarsh" to the README's sound credits with the first real file.

## General direction

- These are **parody** lines in our own words: don't copy the real metro announcer's voice or script, and don't
  name real brands or politicians. The jokes are about the commute (the crowd, the bus that turns back, the bike
  that never comes), never about a community.
- Natural Kolkata Bangla, as people actually say it on a bus. Mixing in English words ("last stop", "gate") is
  fine and true to life.
- Speed: conductors are fast and clipped; the metro voice is slow, flat and over-polite; Ma is Ma.

## The lines

Target length is the kept take after trimming.

### Bus conductor (shouted from the footboard)

Reference: `research/sounds/reference/conductor-calls-aste-ladies.mp3` and `conductor-ac9-sector5-stops.mp3`
for rhythm and pitch (listen, don't copy). The conductor sounds bored and urgent at once: nasal, fast, almost
sung, stress on the last syllable, pitch jumping up on the final word.

| id | Bangla | Romanised | Meaning | How to say it | Length |
|---|---|---|---|---|---|
| `bus-sealdah` | শিয়ালদা-শিয়ালদা-শিয়ালদা! উঠে পড়ুন, উঠে পড়ুন! | Shiyalda-Shiyalda-Shiyalda! Uthe porun, uthe porun! | Sealdah ×3! Get on, get on! | The sound of the game. The three "Shiyalda"s run together with the stress on "-DA", the third one stretched and rising. "Uthe porun" quick, twice, as you'd wave someone up | 2.5 s |
| `bus-wrong-way` | কলেজ মোড়! কলেজ মোড়! কলেজ মোড়! | College More! College More! College More! | College More! (going back into Sector V) | Same footboard shout, faster each time, the last one clipped. Cheerful: he doesn't care that you're going the wrong way | 2 s |
| `bus-depot-warning` | করুণাময়ী অবধি! করুণাময়ী অবধি যাবে! | Karunamoyee obdhi! Karunamoyee obdhi jabe! | Only till Karunamoyee! | Shouted, a little apologetic on "jabe" | 2 s |
| `bus-full` | পিছনে এগিয়ে যান! পিছনে এগিয়ে যান, দাদা! | Pichhone egiye jaan! Pichhone egiye jaan, dada! | Move up to the back, brother! | Irritated and half bored, loud, falling pitch on "jaan". He has said it ten thousand times today | 2 s |
| `bus-depot` | আর যাবে না! সবাই নামুন! নামুন, নামুন! | Ar jabe na! Sobai namun! Namun, namun! | Not going further! Everyone off! | Flat and final, like closing a shop. Slap the side of a steel cupboard twice before it if you like (it can stay in) | 2 s |
| `bus-last-stop` | লাস্ট স্টপ! নামুন, নামুন! গাড়ি ঘুরবে! | Last stop! Namun, namun! Gari ghurbe! | Last stop! Off! The bus turns round! | Bored, quick, "namun namun" almost one word | 2 s |
| `bus-arrive-sealdah` | শিয়ালদা! শিয়ালদা! নামুন, তাড়াতাড়ি নামুন! | Shiyalda! Shiyalda! Namun, taratari namun! | Sealdah! Off you get, quickly! | Triumphant and impatient: you made it, now get off his bus | 2.5 s |

### Rapi-Nah captain (on the phone, in traffic)

Hold the phone a bit further away and talk as if into a phone wedged in a helmet: slightly muffled, loud.

| id | Bangla | Romanised | Meaning | How to say it | Length |
|---|---|---|---|---|---|
| `captain-arrived` | দাদা, কোথায় আপনি? আমি একদম গেটের সামনে দাঁড়িয়ে আছি। | Dada, kothay apni? Ami ekdom gate-er samne dnariye achhi. | Dada, where are you? I'm right in front of the gate. | Slightly accusing, as if you're the one who's late. He's at a different gate | 3 s |
| `captain-ditch` | দাদা, এখানেই নামুন। আমি আর যাব না। | Dada, ekhanei namun. Ami ar jabo na. | Get off right here. I'm not going further. | Calm, final, no apology. Brakes first, then the line | 2 s |

### Hawkers (café strip, now and then)

Reference: `research/sounds/shippable/hawker-call-kolkata.mp3`. Sing-song, stretched first vowel, then a quick
repeat. Stand back to 40 cm and project, as if across a road.

| id | Bangla | Romanised | Meaning | How to say it | Length |
|---|---|---|---|---|---|
| `hawker-jhalmuri` | ঝালমুড়ি! ঝাল-ঝাল ঝালমুড়ি! | Jhaaal-muri! Jhaal-jhaal jhaalmuri! | Jhalmuri! Spicy jhalmuri! | Long "Jhaaal", up then down; the second half quick | 2 s |
| `hawker-cha` | চা গরম! চা, চা, চা! গরম চা! | Cha garam! Cha, cha, cha! Garam cha! | Hot tea! Tea, tea, tea! | The station tea call: "cha" as three short knocks, "garam" stretched | 2 s |

### Ma's call

| id | Bangla | Romanised | Meaning | How to say it | Length |
|---|---|---|---|---|---|
| `ma-ring` | কী রে, কখন আসবি? ভাত ঠান্ডা হয়ে যাচ্ছে! | Ki re, kokhon ashbi? Bhaat thanda hoye jachhe! | Hey, when are you coming? The rice is going cold! | Half worried, half furious, a bit fast, as if she's been holding the phone for a while. | 2.5 s |

### Green Line metro (our own announcement, not the real one)

Reference for *style only*: `research/sounds/reference/metro-greenline-*.mp3`. Calm, slow, flat "PA" voice,
over-enunciated, a tiny pause before the joke at the end so it lands deadpan. Don't imitate the real voice. The
game plays its own two-note chime before these.

| id | Bangla | Romanised | Meaning | How to say it | Length |
|---|---|---|---|---|---|
| `metro-next-sealdah` | পরের স্টেশন শিয়ালদা। দরজা ডান দিকে খুলবে। দয়া করে কনুই সামলে রাখুন। | Porer station Shiyalda. Dorja dan dike khulbe. Doya kore konui samle rakhun. | Next station Sealdah. Doors open on the right. Kindly keep your elbows to yourself. | Even, slow, each sentence ends low | 4 s |
| `metro-next-sealdah-en` | (ইংরেজিতে) দ্য নেক্সট স্টেশন ইজ শিয়ালদা। প্লিজ মাইন্ড দ্য গ্যাপ, অ্যান্ড দ্য এলবোজ। | The next station is Sealdah. Please mind the gap. And the elbows. | (English) | Same voice in English. Pause before "And the elbows", say it exactly as flat | 4 s |
| `metro-doors-closing` | দরজা বন্ধ হচ্ছে। দয়া করে দরজা থেকে সরে দাঁড়ান। | Dorja bondho hochhe. Doya kore dorja theke sore dnaran. | Doors are closing. Please stand clear of the doors. | A touch firmer and faster than the others: the doors wait for no one | 3 s |
| `metro-sealdah-arrive` | শিয়ালদা। এটাই শেষ স্টেশন। সবাই নামুন। হ্যাঁ, আপনিও। | Shiyalda. Etai shesh station. Sobai namun. Hyan, apnio. | Sealdah. Last station. Everybody off. Yes, you too. | Calm; a beat before "Hyan, apnio", said to one sleepy passenger | 4 s |

## Where each line plays

| id | Plays | Until recorded |
|---|---|---|
| `bus-sealdah` | Hopping on a bus to Sealdah, just after the horn | CC0 "Sealdah ×3" prototype clip |
| `bus-wrong-way` | Hopping on a bus going back into Sector V | the notification text |
| `bus-depot-warning` | Hopping on a bus that stops at its depot halfway | the notification text |
| `bus-full` | Bounced off a full footboard ("JAYGA NEI!") | the toast text |
| `bus-depot` | The bus reaches its depot ("DEPOT!") | the toast text |
| `bus-last-stop` | A wrong-way bus ends at College More | the toast text |
| `bus-arrive-sealdah` | Arriving at Sealdah by bus | CC0 spoken "Sealdah" |
| `captain-arrived` | The Rapi-Nah captain pulls up | the notification text |
| `captain-ditch` | The captain ends the ride halfway ("RIDE ENDED") | the toast text |
| `hawker-jhalmuri`, `hawker-cha` | Now and then on the café strip | the rain+ hawker clips (CC BY 4.0) |
| `ma-ring` | Ma's call card appears (wired by the lead, in `app/main.ts`) | the ring tone and card text |
| `metro-next-sealdah`, `metro-next-sealdah-en` | On the train, the leg before Sealdah (wired by the lead in the station stage) | the announcement chime |
| `metro-doors-closing` | Two seconds before the doors close | the door warning beep |
| `metro-sealdah-arrive` | The train stops at Sealdah | the announcement chime |

Station and phone lines: the game exposes `voice(id)` from `src/audio/voice.ts`; the lead adds the calls in the
station stage (after task 033) and in `app/main.ts`.
