# Ghar Jabo: playtest of six Indian/Bangla city-satire browser games

Played on Adarsh's Mac (headed Chrome for Testing, GPU), 7–8 Nov 2026. Per-game notes are in `notes/`; GIFs, MP4 clips (with game audio unless noted) and screenshots are in `media/`. Coverage was uneven because of the Mac-load incidents and the timebox; each note says exactly what was played and what was read from code.

## At a glance

| | Delhi Metro Survival 3D | Bhaiya, Bandra Chaloge? | Fightkaro / Sansad Showdown | Baper Rasta | Bhaag Neha Bhaag | Benglooru |
|---|---|---|---|---|---|---|
| City | Delhi | Mumbai | Delhi (politics) | Dhaka | Delhi | Bengaluru |
| Genre | 3D commute sim, chain of metro steps + choice cards | Arcade auto-driving vs 3 CPU rivals | 3D 1v1 fighter | Chaos driving, damage score | 2D pixel endless runner | GTA-style open world |
| Run length | ~3 min chapter (fast clock) | ~2–2.5 min shift | ~2–3 min match | 10–30 s (newbie) | 2–13 s (newbie) | Open-ended (missions) |
| Time to first control | ~15 s | ~3 s | ~15 s (satire wall) | ~2 s | ~1 s | ~2.5 min first load |
| Language | Hinglish (Roman) + Devanagari signs | English + Bambaiya lines | Hinglish headlines | Pure Dhaka Bangla | English + Hindi title | Kanglish (Kannada + English) |
| Voice | ~150 MP3s: station announcements + TTS crowd barks | None (synth engine + 1 horn) | Announcer + meme politician clips | 40+ BD meme voice clips | None (1 square-wave blip) | 498 files: full cast, radio, ambience |
| Juice | UI toasts, no shake | Toasts only | **Hit-stop, shake, slow-mo KO** | Shout text, impacts, meme audio | Small shake | Discovery toasts, clip system |
| End screen | Headline card + **share card image** | Newspaper cutting, no share | **Full newspaper front page** + stamp | **Newspaper with your crash photo** + share | Inline "PAKDE GAYE!" | None (open world), 15-s clip key |
| Phone | Built phone-first (not tested by me) | Not tested | Not tested (killed) | Not tested | **Dedicated /phone/ page, tested** | Not supported |

## What each one is best at
- **Delhi Metro:** turns every real metro step (frisk, token, gate, escalator, platform, doors, seat) into a one-objective beat with a trade-off event card. The **model for our metro stage**.
- **Bhaiya Bandra:** the fastest start and the cleanest **satire-as-mechanic** (Hold E to fiddle the meter vs a passenger gussa bar). Named CPU rivals make it competitive.
- **Fightkaro:** the best **feel** (hit-stop, shake, slow-mo), plus a **live satirical ticker generated from game events** and a newspaper result.
- **Baper Rasta:** the best **end screen**: a dated front page with *your* crash screenshot, a run-generated headline, a victim quote and a "this money could have bought…" civic jab.
- **Bhaag Neha Bhaag:** zero friction and a proper **portrait phone layout**. Shows how far a one-line premise and a satirical collectible noun ("Democracy coins") can carry.
- **Benglooru:** the deepest **sense of place**: parody local apps (Ten Minute, Kasu Pay, Daari Maps), a family-WhatsApp title screen, joke loading tips, and a huge city soundscape.

## Top 15 takeaways for Ghar Jabo (ranked)

1. **Make the trip receipt a "newspaper with your photo".** Capture a canvas frame at the worst moment (Rapi-Nah cancel, footboard hang, flood splash). Drop it on a dated front page: run-generated headline, a burst label ("CANCEL!", "ধপাস!"), a stamp (মোট দেরি ৪৭ মিনিট), a quote from the "other side" ("'Network chhilo na.' — Rapi-Nah captain") and a share button that exports an image. *(Baper Rasta, Fightkaro, Bhaiya Bandra, Delhi Metro share card.)*
2. **Headlines and ticker lines generated from stats and events**, not fixed text: "Student survives 4 Rapi-Nah cancellations, captain blames 'jam at Webel'", "Commuter hangs off 215 footboard for 3 stops, calls it cardio". Use templates plus counters. *(Bhaiya Bandra headlines, Fightkaro ticker, Baper Rasta paper.)*
3. **Build the metro stage as discrete beats, not free navigation.** Sector V station → bag/frisk → token or card → gate → escalator (stand right) → platform (yellow line) → door marks → coach → seat → exit. One objective pill each. 3D free-walking got me lost and failed the clock twice in Delhi Metro. *(Delhi Metro.)*
4. **Every choice is a trade-off, and the joke is the consequence line.** Time vs money vs dignity cards ("₹100 ka note do" → change given in coins in front of the whole queue). Use the same pattern for Rapi-Nah surge, the auto queue and bus boarding. *(Delhi Metro.)*
5. **Satire as a single-button mechanic with a visible risk bar.** Rapi-Nah: "Hold to accept surge" or "Tip captain to not cancel" while a cancel-risk bar fills. Bus: "Squeeze in" vs "Wait for the next one". Show the bar and pay off with a punchline. *(Bhaiya Bandra meter + gussa, Delhi Metro packed train.)*
6. **Named rival commuters** with a live mini-leaderboard who snatch your bike-taxi, auto or seat ("Pappu got it"). Instant pressure and stakes in a 2-minute run. *(Bhaiya Bandra.)*
7. **The phone is the UI: parody local apps.** Rapi-Nah, a maps app with a red Sector V, a 10-minute-delivery ad, a UPI parody. And a **family WhatsApp group as the lobby** (Ma: "Kothay achhis?", Baba's forward). *(Benglooru.)*
8. **Fail states are named endings that are funnier than winning**, and they go straight onto the share image ("Samaypur Badli Express", "Interview Cancel", "Pakde gaye"). Ours: "Howrah Express", "Swimming to Karunamoyee", "Refund in 7 working days". *(Delhi Metro, Bhaag Neha.)*
9. **Hyper-local language and references beat generic jokes.** Write in Kolkata Bangla/Hinglish the way Sector V commuters actually talk (conductor chants, "Dada ektu sorun", Webel, Karunamoyee, College More). Baper Rasta's pure Dhaka Bangla and Benglooru's Kanglish feel authored by locals. *(Baper Rasta, Benglooru.)*
10. **Juice where it matters**: hit-stop plus a small shake on being shoved off the footboard, the door slamming, a cancel notification landing; a slow-mo beat on a fail. Delhi Metro and Bhaiya Bandra feel weightless without it. *(Fightkaro.)*
11. **Cheap, characterful audio.** Record per-stop Green Line announcements in short and full variants (Bangla + English + Hindi). Use 1–3 s meme-style voice reactions per event, a synthesised vehicle loop per stage (Bhaiya Bandra's 60 Hz sawtooth "putt-putt"), and a news-sting under joke headlines. *(Delhi Metro, Baper Rasta, Bhaiya Bandra, Fightkaro.)*
12. **Phone-first means a real portrait layout**, gesture hints on the title card (TAP / HOLD / SWIPE), auto-detection, and a **< 5 MB first stage**. Benglooru's 2-min load and laptop-only stance, and Delhi Metro's landscape preference, are the anti-patterns for a 2-minute phone game. *(Bhaag Neha, Benglooru.)*
13. **A grace ramp in the first 15 seconds.** Bhaag Neha and Baper Rasta kill newcomers in 2–20 s, and Bhaiya Bandra pickups left me at ₹0 twice. Make the first stage survivable and generous (wide pickup window, slow first bus).
14. **Funny waiting surfaces**: loading tips, locked-area blurbs and a dateline in the HUD ("SALT LAKE SECTOR V · 6:42 PM"). Turn every wait into a joke. Fake radio ads between stages are high laughs per byte. *(Benglooru, Bhaag Neha.)*
15. **Keep the first visit to one button.** No satire wall, login nag or 10-tile lobby before the first trip. Guest by default; push missions, shop and login after the first receipt. Moderate public leaderboard names (Bhaag Neha's landing page shows abusive names). *(Fightkaro, Delhi Metro, Bhaag Neha.)*

## Specific Kolkata hooks this suggests
- **Bus stage:** a "Squeeze in / Next bus" packed-door choice; the conductor "Pichhone egiye jaan!" crowd-compress as a cinematic "super"; footboard balance with hit-stop on bumps; a bus-slogan gag ("Maa Tara" style, like Baper Rasta's "মায়ের দোয়া বাসের সাথে কাজ করে না").
- **Rapi-Nah:** surge accept-or-wait risk bar, captain-cancel toast lines, a "Refund in 7 working days" ending, and a "this surge could have bought 3 plates of momo" box on the receipt.
- **Metro (Green Line):** door-mark boarding, one empty seat plus a rival with a 2-s head start (the aunty "ghutne mein byatha" twist), short/full announcements, and the escalator "stand right, walk left" sign.
- **Flood:** "JOL JOMECHHE · Sector V is now Sector Venice" hazard toasts, splash SFX, umbrella-shield.

## Caveats
- Mobile was tested only for Bhaag Neha Bhaag (phone page). Delhi Metro and Benglooru mobile notes come from their code and FAQ.
- I didn't board a train in Delhi Metro (navigation plus fast clock). Boarding, seat-war and crowd behaviour come from its JS, which is clearly commented.
- Benglooru: only the first ~70 s of Mission 1. Fightkaro: 2 full matches, but the clips are silent (audio tap lost when the session was killed).
- Whisper-small was weak on Bangla; Baper Rasta voice lines are described from file names plus approximate transcription.
- I played with simple input scripts (keyboard/touch rhythms) rather than skilled human play, so scores are a newcomer floor.
