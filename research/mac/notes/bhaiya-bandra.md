# Bhaiya, Bandra Chaloge? (bhaiyabandrachaloge.wtf)

**Played:** 7–8 Nov 2026, desktop 1280×720 (recorded at 960×540), headed Chrome, GPU. Played vs CPU under the name "Bablu":
- an earlier partial session;
- **3 shifts**, 2 of them to the end-of-shift newspaper.

I drove with real keyboard input from a simple script: steer to the kerb near a waiting sawari, slow down, fiddle the meter a little. My results were bad (₹0 both completed shifts, 1 pickup that walked off), which itself says something about how unforgiving pickups are. **Mobile viewport not tested** (time-boxed out after the load incidents). Clips have game audio (WebAudio tap).

Media: `media/bhaiya-bandra-pickup-bus.gif|mp4`, `bhaiya-bandra-traffic.gif|mp4`, `bhaiya-bandra-hud.png`, `bhaiya-bandra-end-newspaper.png`, `bhaiya-bandra-menu.png`.

## What it is
A one-shift Mumbai **auto-rickshaw driving game**: "One shift. Mumbai traffic. Your meter, your rules." You race 3 CPU autos (**Pappu, Raju, Shinde Kaka**) or friends (rooms of up to 4 drivers) to earn the most "kamai" before the shift clock runs out. Made by Anjali Singh. Low-poly three.js, Next.js app.

## First 10 seconds
- A single card over a blurred 3D street: big yellow title, the one-line pitch, a **YOUR NAME** box ("e.g. Rahul"), **PLAY VS CPU** / **PLAY WITH FRIENDS**, and an expanded **How to play** with 4 rows (W/↑, A D, Hold E, Slow). No login, no tutorial level.
- One click and you're driving. The HUD hint immediately says "Sawari 46 m ahead · right footpath".
- Within **3 seconds** a CPU snatches your first fare: "PAPPU GOT IT · Snatched the sawari before you." You learn the competitive pressure instantly.
- Time to first control: about 3 s after clicking Play.

## Core loop and controls
- **Find**, then **slow down to pick up**, then **drive to the drop**, then **slow through the green marker**. Repeat until the shift timer ends.
- If you're too fast you get "TOO FAST! Slow down to pick up the sawari." If you're late, a CPU takes the fare ("TOO LATE · Someone else got in first.", "RAJU GOT IT").
- **Meter fiddling (Hold E):** the meter runs fast ("Meter tez chal raha hai!") for a bigger fare, but a **Passenger gussa** bar fills. If it maxes out they walk off without paying: "PASSENGER WALKED OFF · 'Rehne do, main train pakad lunga.' No fare." The passenger's lines are "{dest}. Shortcut mat lena." and "{dest}. Meter se, haan?". A paid drop says "Thank you bhaiya." or, if you overcharged, "Yeh loot hai, bhaiya! ...but they paid."
- Hazards on a straight road: cows, potholes, buses, kaali-peeli taxis and police barricades. Each gets a **toast gag** and slows or stops you.
- Controls: **W/↑** accelerate, **S/↓** brake (hold to reverse: "REVERSE · Peeche jaa rahe hain, sambhal ke."), **A/D** steer, **E** hold to fiddle meter, **Space** horn, **M** mute. A key legend is permanently at the bottom.

## Difficulty and run length
- The **shift is "3:00"** on the clock, and in practice about 2–2.5 real minutes. That's perfect for one "run".
- Pickups are *hard*. You have to be slow, on the right side and close, and the CPUs are aggressive. Crashes (bus, pothole) during a ride stack gussa or knock the fare away. CPU earnings per shift in my games: ₹56–₹142.
- There's no stars, levels or progression beyond beating the CPUs; the 5 stars under the clock seem to be a rating.

## Humour
- **Hazard toasts** (big yellow caps title, one-line punchline):
  - "DHADAK! · Pothole. BMC sends regards."
  - "THE COW IS UNBOTHERED · Horns have never worked on her."
  - "COW WINS. · She was here first."
  - "NAKABANDI! · Police barricade."
  - "BUS-TED! · The bus does not brake for you."
  - "TAXI TAKKAR!" (kaali-peeli crash): "Kaali-peeli driver is shouting now."
  - "REVERSE · Peeche jaa rahe hain, sambhal ke."
- **Passenger lines:** "Bandra. Shortcut mat lena.", "Powai. Meter se, haan?", "Rehne do, main train pakad lunga.", "Yeh loot hai, bhaiya!", "Thank you bhaiya."
- **Street signage gags:** VADA PAV CENTRE, HORN OK PLEASE, MUMBAI MERI JAAN, JUHU BEACH 2 KM, SHREE GANESH TAILORS, IRANI CAFE · SINCE 1952, CUTTING CHAI ₹12.
- **End-of-shift headlines are stat-driven templates** in "The Bombay Bhonpu":
  - 0 rides: *"Honest auto driver completes shift, rivals call it 'bad for business'"* (what I got).
  - ≥3 walkouts: "Commuters file complaint against auto driver whose meter …"
  - ≥3 cows: "Cow halts traffic for the Nth time today; auto driver says …"
  - ≥5 potholes: "Auto driver hits N potholes in one shift, civic body calls it 'a smooth ride'".
  - Overcharge >₹150: "Local auto driver earns ₹X extra, insists meter is 'imported'".
  - Winning: "Auto driver tops the stand…" / "Auto driver beats N friends…".
- Language: mostly English UI with Hindi/Bambaiya passenger lines. Light, observational and affectionate.

## Art, camera, colours, fonts and HUD
- Low-poly Mumbai street: pastel chawl/apartment blocks (peach, mint, lilac), round low-poly trees, yellow-black kerbs, a sunset-orange haze, white lane marks. The auto is a chunky yellow-and-green box. Cows are white blocks.
- **Camera:** chase cam slightly above and behind the auto, with a mild FOV and speed feel. The world blurs at the edges on the menu.
- **HUD:**
  - top-left: SHIFT LEFT clock and 5 stars, plus an EXIT pill;
  - **top-centre: a physical-looking meter box** with a red "FOR HIRE"/"HIRED" flag, a red LED fare "₹44.00" and km/h;
  - under it, the hint or destination text ("Drop at Powai · 681 m · right side") with a **gussa bar**;
  - top-right: a **TODAY'S KAMAI live leaderboard** ("2. You ₹0");
  - right edge: a vertical **minimap strip** of the road with sawaris and rivals;
  - bottom: the key legend.
- Fonts: a chunky pixel-ish display face (Bungee-like) for titles and toasts; Rubik/Inter-style body. Palette: auto-yellow #F5C518 on near-black, cream newspaper.

## Feel: motion, juice, sound and voice
- **Motion:** smooth, arcade handling with fast acceleration and a light drift. Steering into the kerb or barricade just pins you there; I got stuck against a barricade at 4 km/h for a minute (a weak point). Crashes stop you dead, with a toast; there's little physical reaction.
- **Juice:** mostly toasts. I found no `shake` or `vibrate` in the JS and saw no screen shake, slow-mo or hit-stop.
- **Sound** is minimal and clever:
  - **The engine is synthesised in WebAudio**: a 60 Hz sawtooth through a 420 Hz low-pass, amplitude-modulated by a 9 Hz square wave. That gives the auto's *putt-putt-putt* idle, with pitch and gain following speed.
  - Short beeps and chimes are synth oscillators (sine/square tones).
  - The **only audio file is `horn.mp3`** (1.4 s), a real auto horn on Space.
  - No voice and no music.
- It feels like an arcade driver; the comedy comes from the text, not the audio.

## End/result screen and share hooks
- A dark card with a yellow-black hazard-stripe top: a big title ("BAD DAY ON THE ROAD"), a **newspaper cutting** ("THE BOMBAY BHONPU · BREAKING" plus the stat-driven headline), 3 stat tiles (EARNED / RIDES / OVERCHARGED), the final leaderboard with you highlighted in yellow, and **START ANOTHER SHIFT**. Footer: "Made by Anjali Singh · follow @anjalisinggh12 for updates".
- **No share button or share card.** It's screenshot-only.

## Mobile experience
Not tested. Controls are listed as keyboard-only on the How to play card. The site may add touch controls on phones, but I couldn't verify.

## What works
- **The fastest start of the six games.** Name, Play, driving, and a rival steals your fare in 3 seconds.
- A **visible live leaderboard against named rivals** (Pappu, Raju, Shinde Kaka) makes a solo game feel social and competitive.
- **The meter-fiddle greed mechanic**: a single button with a visible risk bar and a funny punishment line. It's a perfect satire-as-mechanic.
- **Stat-driven headlines** at the end mean every shift's newspaper is about *what you did*.
- Hazard toasts are short and specific to Mumbai (BMC, kaali-peeli, nakabandi).
- The synth engine sound is tiny and characterful.

## What's weak
- **Pickups are fiddly:** you need precise slowdowns and side positioning, and CPUs snatch fares while you learn. A newcomer may earn ₹0, which I did, twice.
- You can pin yourself against kerbs and barricades; recovery is clumsy.
- Thin juice: no shake or impact. Collisions feel like walls.
- No share card or share text, so the great headline has nowhere to go except a screenshot.
- One straight road, so variety comes only from hazards.

## Ideas for Ghar Jabo
1. **Named rival commuters with a live mini-leaderboard** ("Dada with the umbrella", "IT-wali didi", "Rapi-Nah captain") who snatch *your* bike-taxi, bus seat or auto in the queue. Instant pressure and a reason to rush.
2. **Rapi-Nah as a greed or risk mechanic** like the meter: e.g. "Hold to accept surge" makes the ETA shorter but the wallet bar drains, and "Tip captain to not cancel" raises the cancel-risk bar. Show the bar and the punchline.
3. **Stat-driven receipt headlines**: "Student waits 4 Rapi-Nah cancellations, captain cites 'jam at Webel'", "Commuter hangs off 215 footboard for 3 stops, calls it 'cardio'", "Sector V floods again; student swims to Karunamoyee".
4. **Hazard toasts as Kolkata one-liners**: "JOL JOMECHHE · Sector V has become Venice", "HOLD ON · Conductor: 'Pichhone egiye jaan!'", "THE COW IS UNBOTHERED", plus a stray-dog equivalent.
5. **A synthesised vehicle sound per stage** (bike-taxi buzz, bus diesel rattle, metro hum) instead of big audio files. Tiny and characterful.
6. Fix their weakness: **a generous pickup window** and an auto-centring nudge on phones, so new players don't score zero.
7. **Add the share card they lack**, putting the headline on an image.
