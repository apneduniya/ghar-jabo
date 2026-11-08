# Benglooru / Namma Bengalooru (benglooru.com)

**Played:** 8 Nov 2026, desktop 1280×720 (recorded at 960×540), headed Chrome, GPU. Three self-contained sessions:
1. Landing page.
2. `/play/` load test (got to 91% in about 2 min).
3. Full load (**134 s first load**), title screen, then **about 70 s of Chapter 1's opening**: woke at Shobha Aunty's PG area, "Get on the scooter", hailed an auto, walked and jumped walls toward the PG with Daari Maps.

I only played the *very start* of the first mission, not "the opening missions". Every fresh browser context re-downloads the city (about 2+ min), and I had to keep one driver per call under the Mac-load rules. **Phone:** the game says it doesn't support phones ("Not yet… tap Send to my laptop"), and I didn't run a phone viewport. Clips have game audio (WebAudio tap). I transcribed some of the 498 voice/SFX files with whisper (English-mode; the Kannada parts are approximate).

Media: `media/benglooru-scooter-stop.gif|mp4`, `benglooru-auto-hail.gif|mp4`, `benglooru-title-phone.png`, `benglooru-gameplay.png`, `benglooru-landing.png`.

## What it is
A **GTA-style open-world Bengaluru** in the browser: Chapter 1 is Koramangala, laid out from OpenStreetMap and "squeezed to fit a game". You're **Arjun**, "new in Koramangala with one bag, an old scooter and a PG that wants ten months' deposit". There are 12 missions (8 story, 4 side stories, "from a wrong biryani order to a meter fight at the auto stand"), delivery jobs with a **"Rain surge! +25%"**, free roam (santhe, filter coffee, street dogs, gully cricket, a ₹199 T-shirt cart), **18 drivable vehicles** (scooters, autos, water tanker, BMTC bus, taxis, ambulance, fire engine: "Horn included. Horn compulsory."), and odd jobs (T in ambulance/fire/police/taxi). The wanted meter is called **"Scene"**: Whistle → Challan → Nakabandi → Breaking News → Full Scene. Fights use street objects (chappal, tender coconut, plastic chair; "No guns"). There's a B key for "Clip the last 15 seconds" and photo mode. Concept build v0.9.

## First 10 seconds
- **Landing page** (marketing site): "Bengaluru, now playable in your browser", a 1:29 in-game trailer, an "area unlock" map with jokes for locked areas ("Indiranagar: Still looking for parking", "HSR Layout: In a stand-up meeting. Back in five.", "Whitefield: Still stuck at Marathahalli", "Electronic City: ETA two hours. Via Silk Board.", "Malleshwaram: On its second filter coffee"), "Vote for the full version", and **page cheat codes** (MALEBANTHU = rain on the page, SILKBOARD = a traffic jam crawls across the page, HAARUHAARU = moon gravity, KASU = "+₹50,000 (not real, sorry)", POLICEBEDA = wanted level cleared, DOSA = dosas).
- **Loading takes 2+ minutes** on first visit. It's filled with rotating tips that are jokes: "Silk Board is not a junction. It is a lifestyle.", "Swalpa adjust maadi. It is the official city motto.", "Auto anna says 'meter mele ondu-vare'. Counter with 'meter only, anna'.", "Ten months of deposit is normal here. Do not panic.", "Rain at 5 pm is a feature, not a bug.", "Amma has forwarded you something. It can wait. It cannot wait.", "Every apartment has a Tower C. No Tower C has a working lift."
- **Title screen**: a "NAMMA BENGLOORU" logo over a 3D skyline, with **a phone showing the "Family (Official)" WhatsApp group**: Amma "Reached Koramangala? Call me once.", Amma (Forwarded many times) "Drinking hot water at 4 pm reduces traffic stress.", Appa "Don't take a loan from anybody.", you "Reached Amma. PG is ok. Rasam is good." Then PLAY.
- In game, an intro dialogue (Hold Space to skip) sets objective 1. Real time to first control: **about 2.5 minutes** on first visit, a few seconds after that.

## Core loop and controls
- GTA loop: phone (P) with the **"Daari" maps app** gives route lines; objectives in the top-left ("Get on the scooter", "Get to Shobha Aunty's PG · 820 m"); walk, hail or get in vehicles; deliveries between missions; Scene meter; fights.
- Controls: WASD, mouse look, Shift sprint (wheelie/stoppie on bikes), Space jump/handbrake, F get in/out, E talk/buy/sit, H horn, M map, P phone, J/K/L punch/block/dodge, T odd job, R radio, O photo, B clip, Esc pause. Controller is fully supported. Context hints pop up ("F Get on", "E Hail the auto", "Space Jump · climb low walls and gates").
- Vehicles have pun names on the HUD: **SWALPA 110**, **RAJA THUMPER 350**, **CHOTU HATCH**.

## Difficulty and run length
- It's an open world, so there are no runs. Missions look like 3–10 minutes each from the scale (800 m trips). There's a **DAARI health/stamina** bar (100 → 96 → 90 after bumps).
- The first mission is a gentle tutorial with hand-holding hints.

## Humour
- Dense, warm, observational Bengaluru humour in **every text surface**: loading tips, the locked-area map, cheat codes, the family WhatsApp group, the PG sign ("Ten months deposit. No guests after nine."), and NPC lines ("Do you know Kannada? A little? Super, that is enough to win anywhere.", "What is this, guru?").
- **In-game radio ads** (R to change station; files `ad-*`, `rj-*`, `ident-*`):
  - **"Ten Minute"** (quick-commerce parody): *"Forgot milk? Forgot curd? Forgot your own name? Ten Minute delivers in ten minutes. Our rider's knees are delivered separately. Ten Minute. Why plan when you can panic?"*
  - **"Kasu Pay"** (UPI parody): *"Pay for tea, pay for the auto, pay for your friend who forgot his wallet again. Kasu Pay, tap, pay, done!"*
  - a xerox-shop ad, RJ "All News", a "Kempu" station (Whitefield/Kannada/cricket segments), and idents for Silk Board, Kempu, Gully and Hale.
- Auto driver on hailing: "Pay one and a half on the meter." (plus "…extra 50"-type lines). Constable: "Licence, RC togond banni" (bring your licence and RC).
- Language: **Kanglish**. Voices mix Kannada and English; English subtitles by default, with an option for original Kanglish lines. Kannada script on signage and UI ("ಮುಷ್ಟಿ" under FISTS, "ಕೋರಮಂ…" on the bus).

## Art, camera, colours, fonts and HUD
- **The most polished visuals of the six**: semi-realistic PBR, golden-hour light under a gulmohar/rain-tree canopy, a BMTC-style bus with Kannada destination board, a lit Koramangala mall, a real-ish OSM street grid, and a dusty footpath with yellow-black kerbs.
- **Camera:** third-person behind Arjun, mouse-orbit; a chase camera on vehicles.
- **HUD (GTA-like):**
  - objective top-left in white with the place name highlighted in yellow;
  - **WALLET ₹** top-right with F1 Keys / Esc Menu;
  - a rounded-square **minimap phone widget** bottom-left (DAARI) with route line and distance;
  - a green health bar with a number;
  - a 3D waypoint arrow with "820 m" in the world;
  - locality label ("KORAMANGALA 6TH BLOCK") and current vehicle name;
  - weapon pill "FISTS ಮುಷ್ಟಿ · Tab Weapons".
- Fonts: chunky cartoon logotype (yellow/white with a red pin) for the title, Big Shoulders Display for marketing, a clean UI sans.

## Feel: motion, juice, sound and voice
- **Motion:** smooth third-person walking and sprinting with a wall-climb jump; vehicles have engine pitch. Load on this Mac peaked around 4 (of 8 cores) during play, which is fine.
- **Juice:** "Discovered · Shobha Aunty's PG" place-discovery toasts, a **B = clip last 15 s** share-clip system, photo mode, mission stings (`sting-passed`, `sting-failed`, `sting-cheat`). I didn't get to fights, so I couldn't judge hit feel.
- **Sound: by far the richest. 498 files loaded:**
  - **Character voice:** `arjun-*` (13 dialogue lines up to 15.5 s, plus effort/hurt/fall/land/busted/wasted barks), `amma`, `appa`, `shobha-aunty` ×7, `nimsha`, `nikhil`, `rohan`, `bus-conductor` ("Koramangala, flyover…!"), `constable` ×6, `cop` ×8, `goon` ×13 and `goonhurt`, `driver` ×7, `autohail` ×6, `street-shout` ×13, `vendor`, `darshini` ×4, `coffee`, `brunch`, `fan` ×6, `gawk` ×6, `near-*` and `ouch-*` (male/female), plus **`tamil` ×4 and `delhi` ×9 accents** for migrant characters.
  - **Radio:** `radio` ×10, `rj-all-news` ×6, `rj-kempu-*`, `ident-*` ×14, and 3 ads of 12–13.5 s.
  - **Ambience:** `amb-city-day` 24 s, `amb-birds-morning` 20 s, koel, myna, crow, parakeet, a dog set (bark/yelp/growl/whimper/howl/pack), `lakecough` (!), inverter-beep, pressure cooker, drip, thunder, flood, splash/splashed, firecracker.
  - **Vehicles:** per-type engine loops (auto, scooter a/b/c, bike, car, SUV, truck, bus, each with a `-hi` variant), horns per type (bike/car/SUV/bus/truck, plus `honkback` ×3), skid, gear, door, conductor whistles ×4, crashes (metal/glass/heavy).
  - **Footsteps** per surface (tile/metal/grass/asphalt ×3 each).
- The city *sounds* like Bengaluru: koels, pressure cookers, inverter beeps, honk-backs, conductor whistles.

## End/result screen and share hooks
- Open world, so there's no run-end screen in what I played. The share hooks are **B: clip the last 15 seconds and share it** (pitched on the loading screen), photo mode, "Send it to a friend" and "Send to my laptop" on the site, and the area-vote page.

## Mobile experience
- **Not supported**: "Does it work on my phone? Not yet. It needs a laptop or desktop with a keyboard." Phones get "Send to my laptop" (it emails or keeps the link for you). That's a deliberate trade-off for fidelity.

## What works
- **World-building through every text surface**: loading tips, the locked-area map, the WhatsApp title screen, the radio ads. Even waiting is funny.
- **Brand parodies of local apps** (Ten Minute, Kasu Pay, Daari Maps) are the sharpest satire in the set. Directly relevant to our "Rapi-Nah".
- **Sound design depth**: city ambience, per-surface footsteps, per-vehicle engines and horns, accent-specific voices. The best "place" feel of the six.
- Named vehicles (Swalpa 110, Raja Thumper 350) and the "Scene" wanted levels are cheap jokes with high charm.
- The 15-second clip button is a built-in share engine.

## What's weak
- **2+ minute first load** and laptop-only. Fatal for a phone-first 2-minute game; fine for their ambition.
- Open-world scale means slow early pacing: walk 800 m to the PG before anything happens.
- The game itself didn't show any shareable result artefact.

## Ideas for Ghar Jabo
1. **Parody apps as the UI layer**: the phone *is* the HUD. "Rapi-Nah" (bike-taxi: surge ×2.4, "Captain is 2 min away" → "Captain cancelled"), a **"Daari"-style map** (our "Rasta" app showing a red Sector V), a quick-commerce ad ("10-Minute: we deliver faster than your bus"), a UPI parody ("Taka Pay").
2. **The family WhatsApp group as the title or lobby screen**: Ma: "Kothay achhis? Ghore fir.", Baba forward: "Rain water in Sector V cures stress", Didi: "Biryani anbi?". It frames the stakes (getting home) in one glance.
3. **Loading tips as jokes**: "Sector V e bus dhorte hole age 30 bochhor er obhyesh lagbe", "Karunamoyee is not a stop, it's a feeling", "Rain at 6 pm is a feature".
4. **Named vehicles and stops with puns** on the HUD (e.g. "Bus 215: Footboard Express", "Auto: Line-er Raja").
5. **A "Scene"-like escalation meter**, renamed for us: "Jhamela" (Hulla → Jhograa → Live on news → Full Jhamela).
6. **Ambient sound list to copy for Kolkata**: conductor's "Bidhannagar-Ultadanga-Howrah!" chant, tram bell, shankh at sunset, rain on tin, dog pack, pressure-cooker whistles, honk-backs, "Dada, ektu sorun".
7. **Fake radio ads** between stages (10–15 s, voiced) give big laughs per byte.
8. **Avoid their load time.** Ship a <5 MB first stage; stream the rest.
