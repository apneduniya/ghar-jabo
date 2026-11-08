# Bhaiya, Bandra Chaloge? (Mumbai auto racer)

URL: https://www.bhaiyabandrachaloge.wtf/ · by Anjali Singh (@anjalisinggh12) · Next.js + three.js

**How this was researched (be aware):** I played one short CPU race on desktop in the headless browser, but SwiftShader ran the 3D scene at ~1 fps on the shared server. After a few reloads, the site's **Vercel Security Checkpoint started blocking the headless browser** ("Failed to verify your browser", code 21), so I couldn't finish full shifts, see the end screen live, or test the mobile layout. I didn't try to get around the checkpoint. Everything below the first 10 seconds comes from that short session plus reading the game's public JS bundle (strings, tuning and control code). Worth a 5-minute play on a real phone to confirm the feel.

Screenshots: `img/bhaiya-bandra-home.png`, `img/bhaiya-bandra-race-start.png`, `img/bhaiya-bandra-snatched.png`. No GIF/video (blocked).

## What it is
A 3-minute shift as a Mumbai auto driver. Pick up waving passengers, drop them at a green marker, and earn the most "kamai" against three CPU drivers (Raju, Pappu, Shinde Kaka) or up to 3 friends.

## First 10 seconds
- The menu is one card over a live 3D street: title, one tagline ("One shift. Mumbai traffic. Your meter, your rules."), a name field, two big buttons (Play vs CPU / Play with friends) and a 4-line "How to play" (open by default on desktop, closed on phones).
- You can start without typing a name.
- In the race, a huge green "GO!" appears, plus one live hint line: "Sawari 46 m ahead · left footpath". You understand the goal almost instantly, because the hint always tells you the next action.
- Within seconds a CPU rival steals your first passenger: **"PAPPU GOT IT — Snatched the sawari before you."** That teaches you there's competition before any text could.

## Core loop and controls
- Desktop: W/↑ accelerate, S/↓ brake then reverse, A/D steer, hold E to fiddle the meter, Space horn, M mute. A key strip sits at the bottom of the screen at all times.
- Mobile (from code): **the auto accelerates by itself**; you only get ◀ ▶ to steer, BRAKE (hold to reverse) and METER. Three buttons, no throttle. This is the key mobile simplification.
- Loop: find a passenger (hint plus minimap) → slow down to pick up → a passenger line pops ("Bhaiya, Dadar chaloge?", "Meter se, haan?", "Shortcut mat lena.") → drive to the destination while deciding how much to fiddle the meter → slow down through the drop marker.
- **The meter is the risk-reward lever:** holding METER raises the fare multiplier, but "gussa" (anger) climbs. Potholes (+10), crashes (+12/15) and cows (+18) also add gussa. At 100 the passenger walks off without paying ("Yeh loot hai, bhaiya!", "Rehne do, main train pakad lunga.", "Main RTO mein complaint karungi!").
- Missing the stop costs you: `"Arre, Andheri peeche reh gaya!" Paid ₹X.`

## Difficulty and run length
- A fixed 3:00 shift (180 s), with a 5-star rating in the HUD.
- Traffic density rises over the shift (spawn gaps shrink up to 35%).
- CPU rivals actively steal passengers, so there's always pressure and you never wait around.
- The race layout comes from a seed, so multiplayer players all see the same road.

## Humour (specific)
- **Toasts written as one-liners:** "DHADAK! Pothole. BMC sends regards." · "THE COW IS UNBOTHERED. Horns have never worked on her." · "COW WINS. She was here first." · "BUS-TED! The bus does not brake for you." · "TAXI TAKKAR! Kaali-peeli driver is shouting now." · "NAKABANDI! Police barricade." · "REVERSE: Peeche jaa rahe hain, sambhal ke."
- **The end newspaper, "The Bombay Bhonpu — BREAKING".** The headline is picked from what you actually did:
  - 3 or more walkouts: *Commuters file complaint against auto driver whose meter "ran faster than the Rajdhani"*
  - 3 or more cow hits: *Cow halts traffic for the 3rd time today; auto driver says "it came at me"*
  - 5 or more potholes: *Auto driver hits 5 potholes in one shift, civic body calls it "a smooth ride"*
  - Overcharged more than ₹150: *Local auto driver earns ₹X extra, insists meter is "imported"*
  - Won: *Auto driver tops the stand's earnings, buys cutting chai for everyone* / won vs friends: *…demands chai as prize*
  - Default: *Honest auto driver completes shift, rivals call it "bad for business"*
- The end title also depends on rank: "Raja of the road" / "Shift over" / "Bad day on the road".
- **Language:** English UI with Hinglish words (sawari, kamai, gussa) and Hindi passenger lines. Nothing needs translating; context explains everything.
- Small local detail: shop signboards ("Cold Drink", "Shree Ganesh Tailors"), yellow-black kerbs, kaali-peeli taxis, cows, "HORN OK PLEASE" on the menu.

## Art / UI style
- three.js low-poly: every vehicle, cow and building is made of boxes (no imported models). A flat colour palette with a warm dusk sky (#f0a46a) and fog, so the far city fades out cheaply.
- Chase camera behind the auto (third person); the road runs straight ahead.
- HUD made of chunky cards with a yellow border:
  - top-left: shift time and stars
  - top-centre: an LED-style meter with a "FOR HIRE" flag and km/h
  - top-right: a live "Today's kamai" leaderboard
  - right: a strip minimap
  - centre: a one-line hint
- Fonts: a bold rounded display font (Bungee-like) for titles and toasts, and a clean sans for body text.
- Big centre toasts (title plus subtitle) are where all the jokes appear.

## Feel: motion and sound
- **Motion (from code):** acceleration eases off near top speed (`v += 13·dt·(1 − v/26·0.55)`), braking is strong (34/s), and steering is smoothed (lerped at 8·dt), so the auto feels light and twitchy like a real rickshaw.
  - Hitting things doesn't end the run. It costs speed (pothole ×0.55, cow clamps you to 1.5) plus a bump/shake, so a mistake is funny rather than game-ending.
  - Rivals pushing into you nudges both vehicles sideways.
- **Sound is almost all synthesised with WebAudio:**
  - The engine is a 60 Hz sawtooth through a 420 Hz low-pass, with a 9 Hz square LFO on the gain, which gives the putt-putt rickshaw idle.
  - Crashes and potholes are short filtered-noise bursts.
  - Pickups are two-note square chimes (660 → 880 Hz).
  - **The horn is the only sample (`/horn.mp3`)**, loaded on first input. The download was blocked by the same checkpoint, so I couldn't check its length.
  - No music, no voice acting. All the "dialogue" is text.
- Pressing the horn near a cow triggers a joke toast, so the horn is a comedy button, not just noise.

## End screen and sharing hooks
- The newspaper card with headline, Earned, Rides, and "Overcharged ₹X". Buttons: "Start another shift" (or "Start next race" / "Waiting for host…" in multiplayer).
- Multiplayer rooms (MQTT-based, up to 4) have a **WhatsApp button**: `https://wa.me/?text=Race me in Bhaiya, Bandra Chaloge? Room code: XXXX <link>`. The invite link joins directly with `?room=`.
- No image export or score card in the code I saw. Sharing is the room invite, plus people screenshotting the newspaper.
- Monetisation and analytics: Google AdSense slots and gtag events (`shift_end` with earnings, rides, rank, walkouts, cow_hits).

## Mobile
Couldn't load it (checkpoint). From code: touch devices get the on-screen pad automatically, auto-accelerate, the how-to closed by default, and pixel ratio capped at 2 for performance.

## What works
- One lever (the meter) turns a local stereotype into the core decision.
- Rivals stealing passengers create pressure and teach the rules with no tutorial.
- Every mistake creates a joke, not a game-over.
- The end headline is personalised from your stats, so each run gets its own punchline.
- Mobile controls are simplified to 3 buttons (auto-throttle).

## What's weak or annoying
- No built-in shareable image; you rely on people taking screenshots.
- The 3D scene is heavy for low-end phones (WebGL2; it was unplayable on a software renderer).
- Aggressive bot protection (the Vercel checkpoint) can block some in-app browsers and link previews too. Worth checking that WhatsApp's in-app browser gets through.
- Ads on a viral toy game feel off and slow the load.

## Ideas for Ghar Jabo
1. **A headline/receipt line picked from what the player did**, like the Bhonpu. On the trip receipt, pick the funniest stat: 5+ cancellations → *"Student books 7 bikes, reaches home by bus"*; footboard → *"Footboard pro, mom not impressed"*; spent ₹0 → *"Walked from Sector V, legs file complaint"*.
2. **Toast style = TITLE + one-line punchline** for every event: "CANCELLED. Captain Bablu has 'urgent kaam'." · "KHUCHRO NEI. Conductor stares into your soul." · "DOOR BEEP. Not today."
3. **Auto-throttle thinking for mobile:** whenever there's movement (bus footboard, crossing), remove every control that isn't the decision.
4. **One live hint line that always says the next action** ("Bus 40 m · run!", "Seat free · swipe →"). This replaces a tutorial.
5. **Teach through a rival:** in the metro seat rush, the first "UNCLE GOT IT — Umbrella was faster." teaches the mechanic.
6. **Synthesise most sound** (bus engine, metro door beep, app "ting") and use real samples for 1–2 signature sounds only (the conductor's shout, the bus horn), like the single horn.mp3.
7. **A WhatsApp deep link with prefilled text** from day one, even for single player: "I reached home at 9:47 PM from Sector V. Beat me: <link>".
8. **Add the thing they lack:** a generated receipt image (canvas → PNG, Web Share API).
9. Skip ads, and keep the first load light (fast first paint on a 4G phone in a WhatsApp in-app browser).
