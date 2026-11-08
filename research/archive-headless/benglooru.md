# Benglooru (benglooru.com)

**Status: loaded fully, but not playable here.** In headless Chromium with SwiftShader, the first load took **~7.3 minutes** (boot log: "total 436527 ms": city 97 s, shader warmup 256 s). The city is about 11.8M static triangles, 8,960 trees and 31,828 colliders. After that, a single frame took longer than 30 s, so screenshots and gameplay timed out. I reached the title menu (as DOM text) and pressed Quick Play, but couldn't see or play missions. Judgements about play below come from the in-game text, voice captions, audio files and the site. It needs a real GPU. Playing it on Adarsh's Mac would be the honest test.

## What it is
- A free, open-world, laptop-browser game set in a stylised Koramangala, Bengaluru. You play **Arjun**, new in the city with one bag, an old scooter and a PG that wants ten months' deposit. You do delivery jobs (parody app **OotaGo**), 8 story missions plus 4 side stories, then free roam.
- 18 drivable vehicles (auto, BMTC-style bus, water tanker, ambulance…), a wanted meter called **"the Scene"** (Whistle → Challan → Nakabandi → Breaking News → Full Scene), and fights with street objects ("a chappal, a tender coconut, a plastic chair. No guns.").
- Real map data (OpenStreetMap), squeezed to fit; **live Koramangala weather** via Open-Meteo ("Koramangala now: 23°, cloudy. Same sky in the game."). Music and voices are **AI-generated**; every shop and brand is a parody (OotaGo, KaasuPay, Nimma Savari, Kempu FM, Namma Net 4G). Chapter 1 launched on Kannada Rajyotsava.

## First 10 seconds
- The landing page is a cinematic one-pager: in-game trailer ("Eighty-nine seconds of Bengaluru… Sound on"), a big **Play free [ENTER]** button, and "Free · No download · No sign-up".
- Then the **first load is long** (they say ~2 min on a real laptop). They turn the wait into content: loading tips that are jokes ("Finding parking near 80 Feet Road…", "Auto driver says 'one and a half'. Haggling…", "Amma has forwarded you something. It can wait. It cannot wait.", "Every apartment has a Tower C. No Tower C has a working lift.").
- The **title menu is a fake WhatsApp family group** on a phone ("Namma Net 4G", 17:59): Amma: "Reached Koramangala? Call me once." / a forwarded "Drinking hot water at 4 pm reduces traffic stress." / Appa: "Don't take a loan from anybody." / you: "Reached Amma. PG is ok. Rasam is good." This sets the premise and the tone without a cutscene.

## Core loop and controls
- GTA-style: WASD + mouse, F to get in/out, H horn, R radio, T vehicle job, E interact, M map, P phone, O photo mode, **B = clip the last 15 seconds to share**, U = get unstuck. Fighting: J/K/L. There's a full controls table; it's a "real game" control scheme. **Laptop only:** on a phone it says "Made for laptops, for now… Send to my laptop / Copy link / Play anyway (most phones can't load it yet)."
- Session length: long-form (missions, saves in the browser), the opposite of a 2-minute burst.

## Humour (specific)
- **Traffic as identity:** "Silk Board is not a junction. It is a lifestyle." (loading tip); "Wait for the bus (it is not coming)" (bus stop prompt); "It will rain at four. Bengaluru is punctual only about rain."; locked areas: "Whitefield: Still stuck at Marathahalli", "Electronic City: ETA two hours. Via Silk Board", "HSR Layout: In a stand-up meeting. Back in five."
- **The meter gag, done in voice:** "My meter doesn't run fast. My meter runs… enthusiastically."; "One and a half over the meter, saar. No extra for Hindi, discount for Kannada!"; "Meter? Sakkath! Let's go." / "Wow, a meter. I'll tell my grandchildren about you."
- **Outsiders are written in on purpose.** Rohan, a PG-mate from Delhi: "I don't know Kannada, but… you teach me Kannada, I'll teach you Excel." Random pedestrians shout in Hindi ("Yaar, Silk Board pe meri poori jawaani nikal gayi"), Tamil ("even in Chennai there isn't this much traffic!") and Telugu. A passenger asks "Bhaiya, Whitefield chaloge? Swalpa adjust karo na!". Non-Kannadigas see themselves in the city.
- **Every line in Kanglish ships with an English caption** (412 caption pairs in `captions-*.js`), so the local language is flavour, never a barrier.
- Cheats are local words: MALEBANTHU ("the rain has come") makes it rain, SILKBOARD makes a traffic jam crawl across the screen, POLICEBEDA clears your wanted level, KASU = +₹50,000 ("not real, sorry"). The cheats even work **on the marketing website**.
- **Mom as a recurring voice:** "Did you reach? First eat something. Don't trust the auto drivers. Call Appa, he is worried."

## Art / UI style
- Realistic-ish stylised 3D (three.js, SMAA post-processing, OSM-built city, gulmohar trees, impostor crowds), much heavier than the low-poly box games. The landing page is dark with a warm amber accent, a chunky hand-lettered "NAMMA BENGLOORU" logo and condensed bold headlines.
- In-game HUD (from DOM text): **WALLET ₹** and **DAARI** (path/health? 100), a phone clock, and a phone overlay for menus.

## Audio (inventory from the network: 347 files)
- `street/` 234: voice lines. Arjun's efforts/hurt/falls; auto-hail lines; constable/cop; vendors (13: "Tender coconut! Elaneeru!", "Soppu, soppu!"); street shouts (13); outsider shouts (delhi ×9, tamil ×4, telugu ×4, whitefield ×4); a conductor whistle; tanker; flood/splashed; witnesses; "pairs-*" (two-line exchanges). Clips are 1–7 s. Radio idents ("ident-silkboard", "ident-kempu", 6–10 s) are fake radio station jingles.
- `sfx/` 62 (crashes, doors, body falls, bottles…), `amb/` 33 (crows, koel, myna, parakeets, dog barks/growls/howls, a pressure-cooker whistle, drips, passing scooters), `loop/` 17 engine loops per vehicle with hi/lo variants, `music/score/title.webm` (90 s title theme).
- The sound design *is* the city: crows, cooker whistles and dogs do as much as the visuals.

## End / sharing hooks
- **B clips your last 15 seconds as a video "ready for the family group"**; O is photo mode. Sharing is built into the controls, not left to the player.
- "Send it to a friend", "Vote for the full version" and "Which area should we build next? Vote for it" turn players into a community and give the dev reasons to post updates.
- Locked map areas with jokes are teasers for future chapters.

## Mobile
- Not supported. It shows a polite "Made for laptops" screen with **Send to my laptop / Copy link**, a good fallback that still captures the click.

## What works
- Turning every wait or loading screen into jokes; mom's WhatsApp as the menu; English captions on every local line; outsider characters; live weather; launching on a cultural date; shareable clips; parody brands everywhere.

## What's weak
- Huge download and GPU demands: laptop only, a long first load, and it's unplayable on weak hardware (here, 7 min to boot). Most of India's casual sharing happens on phones, so this caps virality.
- A full GTA control scheme is a lot to learn for a meme game.

## Ideas for Ghar Jabo
1. **Mom's WhatsApp as UI.** Use a family-chat overlay for the start screen and mid-run pressure ("Kokhon ashbi?", a forwarded "Drinking warm water reduces traffic stress", Baba: "Don't pay extra to bike-wala."). It's already in our design as mom calls, so make it a chat.
2. **English captions on every Bangla or Hindi line.** This is the cleanest answer to "can non-Bengalis enjoy it?".
3. **Write outsiders in:** a hostel-mate from Patna or Hyderabad who learns Bangla mid-run ("Dada, ekta... ek ticket?"), Hindi and Odia shouts at the bus stop.
4. **Loading tips as jokes** ("Finding a captain who accepts… 12%", "Sector V drains are under construction since 2017"). Our load should be ~1–2 s, but tips can also run in the app's "Finding captain…" screen.
5. **Locked destinations as teasers:** "Howrah: Still on the bridge", "New Town: Ride cancelled", "Garia: ETA 2 hours via Bypass".
6. **Parody brands** (we have Rapi-Nah); add a fake payment app ("KhuchroPay failed") and a radio jingle.
7. **Cheat codes as a shareable easter egg:** BRISHTI (rain/boat mode), JABONA (every captain cancels), KHUCHRO (+₹10).
8. **Live Kolkata weather** (Open-Meteo, free, no key), matching our rain-day plan.
9. **A 15-second clip button** (MediaRecorder on the canvas) next to the receipt. A footboard fail is perfect clip material.
10. **Stay phone-first and light.** Benglooru's biggest limit is weight; our edge is opening instantly on any phone from WhatsApp.
11. **Sound list to copy:** crows, a pressure cooker, the conductor's whistle and shout, the bus door slap, the metro door beep, a phuchka vendor call, dog barks. Short 1–3 s clips with variants.

## Feel: motion and sound
- Motion couldn't be judged (no frames rendered at a usable rate; >30 s per frame on SwiftShader). Per the trailer and site: a cinematic, slow-paced open world.
- Sound: an extensive, sample-based (not synthesised) mix: 234 voice lines with variants, vehicle engine loops with pitch layers, Indian city ambience, and a 90 s title score. Samples are in `/tmp/gj-research/audio/benglooru/` (voice: delhi-1…9 at 2–6.5 s; radio idents at 4.5–10 s; street shouts at 1.5–2.8 s; title.webm at 90.5 s).
- No GIF: no in-game frames could be recorded.

## Screenshots
- `img/benglooru-1-landing.png`: landing hero (logo, Play free, "Free · No download · No sign-up").
- `img/benglooru-2-loading-tips.png`: "Silk Board is not a junction. It is a lifestyle." loading tip (mobile view of the site).
- `img/benglooru-3-mobile.png`: the "Made for laptops, for now" phone screen with Send to my laptop / Copy link.
