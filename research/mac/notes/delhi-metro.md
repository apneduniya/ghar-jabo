# Delhi Metro Survival 3D (delhimetrogame.com)

**Played:** 4 desktop sessions on 7 Nov 2026 (headed Chrome for Testing, 1280×720, GPU, about 50 min in total). Story Chapter 1 "Pehla Din" twice to a fail ending. I got through the Hauz Khas entrance, security, token counter, AFC gate and escalator to the platform as the train arrived. I never boarded: both runs ran out of time or energy first. I read the boarding, ride, seat-war and crowd logic in the game's shipped JS (`main.js`, comments are very clear) and describe it from there, marked **(code)**. I did **not** test the phone viewport (time-boxed out); mobile notes come from `input.js`, `orient.js` and `perf.js`.

Media: `media/delhi-metro-*.gif|mp4|png`. Clips have game audio, captured from the page's WebAudio/HTML audio, not system audio.

## What it is
A fan-made, free, no-download three.js game about surviving a Delhi Metro trip as **Bunty** ("Naam: Bunty. Shehar: naya. Sapna: naukri."). There are several modes on one lobby carousel:
- **Story: Bunty ki Kahani.** Hand-made chapters, each with a deadline and a destination gate ("9:15 tak Rajiv Chowk ke Gate 7 se bahar niklo").
- **Din ki Naukri.** A shift of phone gigs (parcels, seat gig). Locked at start.
- **Kahin bhi jao.** Open world: "9 lines · 243 stations · utro, ghoomo". You can get off anywhere, walk the street, eat, take a rickshaw.
- **Baddie Bachao.** Side mission with influencer Aanya. Her "Followers" meter, slow-mo walk, reel battle.
- **Loco Pilot.** Drive the train yourself: notch lever P4..B7, ATP speed limits, a stop mark, and a chai glass that spills if you jerk.

On top of that sits a meta layer called "Inaam": coins, a 7-day login calendar, 3 daily missions, badges and an outfit shop (cosmetic only). There's also a PWA install prompt, Google cloud save (guest is the default) and a live Diwali event with diyas, rangoli and a "Shubh Deepavali" jingle.

## First 10 seconds
- A loading screen with one big yellow button: "▶ Tap karke shuru karo" and "🔊 Awaaz on rakho, announcements aate hain". The tap is needed to unlock audio on iPhone.
- A login nag ("Login karo toh progress kabhi nahi khoyegi") with "▶ Guest ban ke khelo" under it. One extra tap, but guest is clearly allowed.
- The lobby is busy: about 10 tiles (SAVE, HELP, MISSIONS, NAUKRI, MAP, RECORD, INAAM, SHOP, FOLLOW +30), a Diwali popup and a big **CHALO!**
- CHALO opens a three-card chapter intro over a live 3D platform. Then you're **in the street outside Hauz Khas** with HUD, objective pill and compass already up, and a pen-seller and a chanda-collector talking at you within 3 seconds.
- Time to first control: about 15 s from the loading screen. You know what to do immediately ("Station ke andar jao ▲"). You don't learn what ENERGY and DIGNITY do until you lose them.

## Core loop and controls
The **trip is a chain of real metro steps**, each a small level with one objective pill:
1. Street (vendors, beggars, a kinnar dance meme, touts). "Station ke andar jao".
2. **Bag on the X-ray belt**, then the **gents/ladies arch**: "Line mein lago, metal detector se niklo". Walk into the ladies line and the guard says "Bhaiya, ye ladies line hai". Cut the queue and get "Oye! Line mein aao!" plus bhasad (wanted stars). Then "Apna bag uthao".
3. **Token counter**: an event card with 3 choices (see Humour). Each costs time, money or dignity.
4. **AFC gate**: "Gate pe token tap karo", E to tap. Running at a closed gate *vaults it GTA-style*, which saves time and costs stars (code).
5. **Escalator**: "Stand on the right · Walk on the left" painted huge on the wall. NPCs stand on the right and ride it (code).
6. **Platform**: "Peeli line ke peeche raho. Train aa rahi hai." Cross the yellow line before the doors open and you get a voiced warning, -3 dignity and +0.8 bhasad (code).
7. **Train arrives (code).** It takes 7 s to ease in on a cubic curve, chimes, doors open over 1 s, then *"trainRush"*: NPCs who were waiting in twos and threes at the door marks walk in. The middle of each door is left free for people getting off. Doors stay open 22 s, then "Darwaze band ho rahe hain" plus a voice, then the train pulls out. Miss it and you get "Train chhoot gayi! Agli train 2 min mein." and the clock jumps +2 min.
8. **Packed train (code; Ch5 / "Monday rush").** Dummy passengers are pressed against every door. Walking in bounces you back with a bubble and "Train full! Ghuso (💪, bhasad) ya agli train ka wait karo." *Squeeze in* costs -6 dignity and +1.2 bhasad: "Ghus gaye! Kisi ka bag, kisi ki kohni, sab tumpe. 😵". Waiting costs +2 min per packed train.
9. **Ride (code).** A fresh coach scene. About 75% of seats are taken and **exactly one seat is left empty**, with a "🪑 Seat lo" prompt that opens an event card. Standing NPCs hold poles. Optional chaos: "📱 Reel full volume", "🧘 Floor pe baitho". Each stop runs leaving, moving, braking and dwell phases. The tunnel and platform swap visibility. The LED reads "Next: X · अगला स्टेशन: Y". Full Hindi+English announcements play only at boarding, interchanges and your stop; other stops get a short "Agla station X" "so the coach isn't one long announcement". The coach sways while moving.
10. **Seat war (Day gig / story).** At a stop a seated NPC gets up, the toast says a seat is free, and the nearest standing **rival** gets 2.2 s before claiming it. You can claim it for the aunty ("Beta, ghutne mein dard hai... 😣"), who says "Jeete raho beta! 🙏": +respect, +6 dignity. If the rival wins he says "Arre yaar!".
11. Get off at your stop ("Utro! X aa gaya. Baayi taraf ka darwaza"). Miss it and you get a missed-stop ending. Then the exit gate, the right facade gate (wrong gate means a walk round), and **e-rickshaw/auto touts** crowding round you in an arc, each with voiced lines.

**Controls (desktop):** WASD to move, Shift to run, arrows or Q to turn camera, E/Space/Enter for the context Action, mouse drag to look. **Touch:** a floating joystick under the left thumb, camera drag on the right, RUN toggle and Action button. The HUD shows a big context label ("🪙 Token lo", "🎒 Bag uthao").

**Steering aids:** a big yellow **target beam** on the floor where you must go, plus a compass arrow next to the objective pill. On desktop it was still easy to get lost near the escalator, where the camera faced back toward the gates.

## Difficulty and run length
- Chapter 1 gives about 37 in-game minutes (8:38 to 9:15) plus a grace period. The clock runs at roughly **1 game-minute per 4 real seconds**, so a chapter is about 3 minutes of real play. Event-card choices jump the clock 2–3 min each.
- **Run** (Shift) drains ENERGY fast. My first run sprinted everywhere and hit **Energy 0** before reaching the platform, which ends the chapter: **"Samaypur Badli Express. Neend lag gayi. Aankh khuli toh Samaypur Badli tha."** My second run walked, made it to the platform at 9:18, and then got **"Interview Cancel. HR ka call aaya: 'Aap rehne do.'"**
- Hard for a first-timer, mostly from navigation and the bag/queue steps, not from reflexes. Failing is funny, so it doesn't sting.

## Humour (specific)
- **Event cards with three choices** where the punchline is the outcome text:
  - Guard: "Bag mein kya hai? Tiffin? Khol ke dikhao." The options are "Khol ke dikha do", "'Sir kuch nahi hai'" and "Bahas karo". Choosing "Bahas karo" gives "3 min bahas. Peeche line ne taaliyan bajayi." (−3 min, Dignity −12).
  - Token counter: "Rajiv Chowk? ₹32. Chhutta do, ₹500 nahi chalega." The options are "Exact ₹30 do", "₹100 ka note do" and "Line mein khade socho". ₹100 gives "Bhaiya ne poori line ke saamne baaki paise sikkon mein diye." (Dignity −4). Exact gives "Perfect. Bhaiya ne pehli baar kisi ko smile di."
  - Street chanda: refusing gives "😂 Ulta usi se paise maang liye! Respect +3".
- **Ambient barks**, voiced and bubbled as you brush past: "Itni jaldi hai toh helicopter le lo", "Andha hai kya?", "Dhakka mat do!", "Aaj bhi itni bheed!", "Uncle ji bag hatao na", "Mummy ka 5th call aa gaya", "Mera card nahi chal raha yaar", "Kal bhi late tha, aaj bhi", "Chai peeni hai yaar". Guard lines: "Haath upar karo", "Jeb mein kya hai? Chalo."
- **Fail endings as headlines**: "Samaypur Badli Express", "Interview Cancel".
- Set pieces in code: a kinnar dance meme ("Main tere vaaste naachi re") where Bunty dances back and asks *her* for money; passenger fights; reel-makers; a phone thief who snatches and runs at the next stop with a CISF chase (wanted stars = "bhasad"); and Mummy-Papa following you in Ch4 with a "mood" meter.
- Language is Hinglish in Roman script for all UI and jokes, Devanagari only on signage (पुरुष, महिला, प्लेटफॉर्म), and English on the "Stand on the right · Walk on the left" wall.

## Art, camera, colours, fonts, HUD
- **Semi-realistic low-poly.** Rigged .glb people with Idle/Walk/Run, tint-masked so a few models make a varied crowd. Stations are boxes plus canvas-texture signs in DMRC style (blue boards, Hindi over English, amber LED). Seven real station "kinds" per line. Day look is toon/golden hour; night is neon monsoon with rain and a wet street (follows the phone clock).
- Diwali dressing: marigold garlands, string lights, a rangoli on the platform, diyas (walk over them for "+5 🪙 Diya jala! 🪔").
- **Camera:** third-person over the shoulder, auto-follows on touch. It gets confused at the escalator well and can face backwards.
- **HUD:** a big clock top-left with the deadline under it; ENERGY (green) and DIGNITY (blue) bars; ₹ money; token status ("No token" / "Token ✓"); 3 bhasad stars top-right; a yellow objective pill with a down-pointing beam; a navy announcement strip ("📢 Train aa rahi hai! Peeli line ke peeche rahein."). The context Action button and RUN toggle sit bottom-right, the joystick bottom-left.
- Fonts: a rounded heavy display face (Baloo-like) for titles and buttons, plus a clean sans for body. Cream cards with a red top bar.

## Feel: motion, juice, sound, voice
- **Motion:** smooth on this Mac (dynamic resolution guard in `perf.js`). Walk and run blend, the escalator actually carries you, and the train eases in with a cubic slow-down. The coach sways while moving (code). The arch light flashes red then green as you pass, with a beep.
- **Juice:** mostly UI-level. Toasts with coin pops ("+5 🪙"), a stamp on the star meter when bhasad crosses a whole star, a "freeze" for 1.6 s with arms up during the frisk. I saw **no screen shake or slow-mo** in normal play; Aanya's mission has a slow-mo walk (code).
- **Sound** is heavily voiced, all pre-recorded MP3:
  - **Announcements per station**, in 3 variants each: `next_<station>` (7–12.5 s, Hindi + English "Agla station … darwaze baayi taraf khulenge"), `this_<station>` (2.5–4 s) and `short_<station>` (1.7–2.7 s). Plus `arriving` (12 s), `yellow_line` (4.4 s), `doors_closing` (4.8 s) and `train_missed` (4.7 s).
  - **About 70 crowd barks** `c_<hash>_<voice>.mp3` (1.2–3.2 s) in voices `m1`, `m2` and `f2`, generated by a TTS tool from the same text as the bubbles. Only one plays at a time and they're quieter with distance. In the coach only short barks are voiced.
  - Set pieces: `naach_kinnar.mp3` (19.5 s; the dance is choreographed to the clip timestamps) and `ganna_own.mp3` (8.9 s, the developer's own recorded sugarcane-seller call).
  - Event music: `dw_loop.mp3` (20 s Diwali loop) and `dw_shubh.mp3` (15.6 s jingle).
  - UI SFX are **synthesised WebAudio tones** in `audio.js` (`tone(freq, dur, type)`): beeps, chimes, a whistle, star, pop, tapOk/tapBad.
- Overall it sounds like a real metro, because the announcements carry it. The crowd barks are TTS and a bit flat, but short enough not to grate.

## End / result screen and share hooks
- A **cream card over the dimmed scene**: chapter label, **funny headline** and one-line story, a 2×2 stat grid (TIME / RESPECT / ENERGY / DIGNITY), rank progress ("⭐ Naya Banda · Respect 4 (Daily Passenger 25 pe)"), coins earned and wallet. Then an Instagram follow box ("Maza aaya? Follow karo @vashisth.code +30 🪙"), **Phir try karo** (primary), **📸 Share card**, **Share text copy karo** and **Menu**.
- **Share card** (see `media/delhi-metro-sharecard.png`): a portrait image with the game logo, the dev's IG handle, a Diwali-themed purple background with fireworks, a big coral headline, the one-liner, a 4-stat strip, and a yellow footer with Bunty's face: **"Tum kar paoge?"** plus the URL. Buttons: Share karo (native share), ⬇️ Save, Text copy. The hint reads "Phone pe: photo pe long-press karke bhi save kar sakte ho."
- **Retention hooks:** 7-day login calendar, daily missions, outfit shop and a "stamp collection" of stations visited.

## Mobile experience (from code; not played on a phone viewport)
- Built phone-first: joystick under the thumb, camera drag, a RUN toggle that auto-switches off when you stop, and a context action button.
- Landscape is preferred. On Android Chrome a play tap goes fullscreen and locks landscape; on iPhone a "Phone ghumao, landscape mein khelo" hint appears and portrait still works.
- Dynamic resolution keeps frames short; people far from the camera are culled; each leg frees its GPU textures. Story characters (about 2.6 MB) load in the background so the first load stays light.
- PWA "Game install karo!" popup, and an iOS silent-switch workaround for audio.

## What works
- **Every real metro step is a tiny level with one clear objective pill.** That makes a mundane commute into a sequence of beats, which is exactly what Ghar Jabo's metro stage needs.
- Choices are **cost trade-offs (time vs money vs dignity)**, not right/wrong. The funny line is the *consequence*.
- Fail states are **named endings** that are funnier than winning, and they go straight onto a share card.
- Real audio identity: station announcements in Hindi+English make it feel *Delhi*. Short variants stop it from droning.
- Crowd rules feel real: wait at the door marks, leave the middle free, rush in when doors open; stand right, walk left on the escalator; one empty seat and a rival with a 2.2 s head start.

## What's weak
- **Navigation in 3D is the main friction.** Even with beam and compass I got stuck at security and the escalator, and the camera faced backwards. A first-timer with a fast clock will fail by getting lost, not by making choices.
- Running drains energy with no warning, so the first instinct (sprint) gets punished silently.
- The lobby is cluttered (10+ tiles, login nag, IG follow, event popup) before the first CHALO.
- Juice is UI-only, with no shake or impact. Pushing through crowds feels weightless.
- Chapters are long for a "quick commute joke". It isn't a 2-minute run.

## Ideas for Ghar Jabo
1. **Model the Green Line stage as discrete beats** (Sector V entrance → frisk/bag → token or card → gate → escalator → platform → doors → coach → seat → exit), each with one objective pill and one funny event card. **Don't make the player navigate a 3D station freely.** Use rails or short lanes so 2 minutes isn't wasted on getting lost.
2. Steal **door-mark boarding**: people wait beside each door, rush in when doors open, and the packed-train state ("Ghuso ya agli ka wait karo") is a binary dignity-vs-time choice. That's perfect for the Green Line at 6:30 pm.
3. **One empty seat plus a rival with a visible 2 s countdown** is a great 10-second mini-game. Add the aunty "ghutne mein dard" moral twist.
4. **Short vs full announcements**, recorded per station for the handful of Green Line stops (Sector V → Karunamoyee → Central Park → City Centre → Bengal Chemical → Salt Lake Stadium → Phoolbagan → Sealdah, Bangla + English + Hindi).
5. **Named fail endings → share card**, e.g. "Howrah Express: ghumiye porlam, chokh khule dekhi Howrah", or "Rapi-Nah Refund: ride cancelled, refund 7 working days". Use their card layout: headline, one-liner, 4 stats, "Tumi parbe?" footer and URL.
6. Make **sprint visibly cost something** (a sweat icon, a panting SFX) so the energy fail is earned.
7. Add the juice they lack: camera nudge when shoved, a small shake on the door squeeze, a squash on the seat grab.
8. Keep the lobby to **one button** for the first visit; push missions, shop and login after the first trip receipt.
