# Ghar Jabo: design plan (v1, single player)

> It's 6:30 PM in Sector V. Get home. Everything will go wrong.

## Pillars

1. **Universal rules, local flavour.** Anyone in India must be able to play and enjoy a full run without knowing Sector V. Local detail (place names, Bangla lines, landmarks) is a bonus for insiders, never something you need to know.
2. **The 5-second test.** A first-time player understands what to do on every screen within 5 seconds, with no tutorial text longer than one line.
3. **Short burst.** A run takes 90–120 seconds. Restarting takes one tap, and every run plays a little differently.
4. **One mechanic per moment.** Tap, hold or swipe; never two at once.
5. **Built for the screenshot.** Every run ends on a shareable trip receipt.

## Player

- **A student** leaving college at 6:30 PM with **₹150 pocket money**. The budget makes surge pricing hurt: "pay ₹149, or eat tonight?"
- **Mom calls** ("Kokhon ashbi?" / "Kab aayega?") get more frequent as it gets late. This is the visible pressure.
- An office-worker re-skin (laptop bag, more money, the manager pings instead of mom) comes later.

## Map: one junction, three choices

The real place is compressed into a single screen: the three-way junction at the college gate (modelled on the TIU gate by the PwC office, called "College Gate" and "PWH Tower" in the game).

```
             🚇 METRO (up the road, under the viaduct)
                        ▲
   College Gate ──[ JUNCTION + 🚌 BUS STOP ]── café strip
     (you start)      PWH Tower
                     📱 the app is on your phone
```

- **Everything you need is on one screen:** the bus stop is at the junction itself, the metro is one short walk (one road crossing) up the road, and the bike app is on your phone.
- **The choice works like a maps app.** When you start, the phone shows three route cards, a UI everyone already knows:
  - 🛵 Rapi-Nah · ₹49 · 15 min
  - 🚌 Bus · ₹10 · 40 min
  - 🚇 Metro · ₹15 · 30 min

  The estimates are lies, and they get worse as the clock runs. That's the joke, and it teaches the strategy without words.
- Real names (Wipro More, Sector V metro, the café strip) show up as small signboards for insiders.

## Traffic jam (the strategy, shown not told)

- The jam visibly builds with the clock. Early on, roads are fast and crossing is dangerous; later it's gridlock, so crossing is easy but the bus and the bike crawl, while the metro gets packed.
- **Crossing to the metro** is one short Crossy Road-style moment (tap to step). It's instantly familiar and matches the art style.
- If a mode fails you're back at the junction, the clock has moved, and the cards have changed. Deciding when to give up is the strategy.

## The run

- About 2 minutes of real time. The in-game clock runs 6:30 PM → 10:30 PM.
- v1 has one destination: Sealdah.
- **First run is guided by the joke, not a tutorial:** you tap START and the phone opens Rapi-Nah (what everyone does first). It gets cancelled. Then the bus and metro cards light up. By then the player has learned the whole loop.
- **Random each run:** which captain cancels, how full the bus is, which door is crowded, surprise events (the bus breaks down, "Captain has arrived" at the wrong place, mom calls at the worst time). This keeps restarts fresh.
- **Score:** what time you got home and how much money you have left.
- **Grace ramp:** the first 15 seconds of every stage are forgiving (wide timing windows, a slow first bus). In the genre's games, newcomers die in 2–20 s and quit.
- **Named rivals:** two or three recurring commuters ("Dada with the umbrella", "IT-wali didi") snatch your bike, bus spot or seat ("DIDI GOT IT"). A tiny live board shows who's home first. That gives instant pressure with no tutorial.
- **Live notification and ticker stream** generated from what happens: "Rapi-Nah: Captain cancelled. Reason: 'Bhai, Sector V mein jam hai'", "Bus footboard capacity: 140%. Margin of error ±100%". Templates plus event counters, with a short news-sting sound under each.
- **Named fail endings** that are funnier than getting home, and go straight onto the receipt: "Howrah Express" (fell asleep on the bus), "Swimming to Karunamoyee" (rain day), "Refund in 7 working days" (Rapi-Nah).

## Modes

### 1. Rapi-Nah (fake bike-taxi app), the core joke
Phone UI only (no 3D).
- Book → "Finding captain…" → "Captain Bablu is 2 min away" (it stays 2 min while the clock ticks) → **CANCELLED**.
- Re-book and the fare climbs: ₹49 → ₹89 → ₹149 🔥 High demand.
- Sometimes the captain calls: "Kitna doge?" / "Cancel kar do please". You pick one of two replies.
- Rarely a ride is accepted: a 5-second ride clip and a jackpot sound.
- Each round you choose: re-book, pay more, or give up.
- **One-button greed mechanic with a visible bar:** "Hold to accept surge" shortens the wait while the wallet bar drains; "Tip captain ₹10" lowers a visible cancel-risk bar. The punchline lands when the bar wins.

### 2. Bus: two moments
- **Board:** the bus never fully stops. One well-timed tap to jump on while the conductor yells "Sealdah-Sealdah!".
- **Packed door:** "Ghuso" (squeeze in: dignity drops, and the conductor's "Pichhone egiye jaan!" crowd-compress plays like a fighting-game super) or "Next bus" (+2 min on the clock).
- **Footboard:** hold to grip and use ◀ ▶ (or tilt) to stay on through turns. If you fall off, you're back at the junction. Hit-stop plus a small shake on every bump, slow motion on the fall.
- The fare is a 1-second gag ("Khuchro nei?").

### 3. Metro: beats on rails, never free walking
Delhi Metro Survival shows the full ritual works as a chain of tiny beats, and also that free 3D walking gets players lost. So ours moves the player along fixed lanes, with one objective pill per beat:
- **Entrance → frisk → token/card → gate → escalator → platform**, about 3 seconds each. Each beat can throw one trade-off card (time vs money vs dignity), where the joke is the consequence: "₹500 note? Counter dada gave your change in coins in front of the whole queue."
- **Door marks:** people wait beside each door; the middle stays free for people getting off; everyone rushes when the doors open. Packed train: "Ghuso ya agli train?" (dignity vs +2 min).
- **Seat rush:** exactly one seat frees up, and a rival has a visible 2-second head start. Twist: give it to the aunty with bad knees for +dignity.
- **Ride:** sway, a short "Agla station…" announcement at each stop and the full version only at yours (Bangla, Hindi, English), so it never drones.

### Later modes
- **Auto stand** (v1.1): a queue with line-cutters; the driver waits until it's full.
- **Rain day** (v1.1): live Kolkata weather plus random chance. The junction floods, and the app offers "Rapi-Nah BOAT ₹999" with a rowing mini-stage.

## End screen: "Sector V Samachar" front page
The playtest's strongest finding (Baper Rasta, Fightkaro, Bhaiya Bandra): the result should be a **dated newspaper front page built from your run**, exported as a share image:
- **Your own worst moment as the photo:** a canvas frame captured at the cancel, the footboard hang or the flood splash, with a burst label ("CANCEL!", "ধপাস!") and a stamp ("MOT DERI 47 MIN").
- **Headline generated from stats:** "Student survives 4 Rapi-Nah cancellations, captain cites 'jam at Webel'".
- **A quote from the other side:** "'Network chhilo na.' — Rapi-Nah captain", or "'Ami toh bolechhilam metro-te jao.' — Ma".
- **"Ei takay hoto" box:** "Your surge could have bought 3 plates of Sector V momo".
- A fake poll: "Ghar pouchhano chance 73% · Surge 2.4x · Total 129%".
- The receipt stats below:

```
GHAR JABO · Trip summary
College Gate → Sealdah
Left 6:30 PM · Reached 9:47 PM
Rides cancelled      7
Money left          ₹3
Footboard time     4 stops
Seat found         No (stood whole way)
Mom calls missed    5
"Kal theke WFH... wait, I'm a student."
```
Buttons: Share (Web Share with the image file), Save image, Play again (one tap). Footer: "Tumi parbe?" plus the URL. A rank title changes with the result (Sector V Survivor / Footboard Pro / Still in Sector V).

## Look and feel (match the genre)
- **three.js**, low-poly box-style models, flat or toon colours and a chunky HUD, like Bhaiya Bandra Chaloge and Baper Rasta. The Crossy Road crossing fits the same style.
- Fixed camera everywhere (three-quarter view for the junction and platform, side view for the bus). The player never steers a camera.
- Controls: big on-screen buttons on mobile; on desktop, arrow keys or WASD plus Space. Every moment shows a one-line hint the first time only.
- Kolkata palette: blue-and-white buses, the green metro, yellow taxis in the jam, orange streetlights at dusk.
- Audio carries the comedy: horns, the conductor's shout, the door beep, the app's "ting". M mutes.
  - Vehicle sounds synthesised in code (the Mumbai game makes its auto putt-putt from a 60 Hz sawtooth), so they cost almost nothing.
  - 1–3 s voice reactions per event ("Dada ektu sorun", "Pichhone egiye jaan!", "Khela hobe" for the bus scramble).
  - A few signature recordings: the Green Line announcement, the tram bell or conch as the news-sting, rain on tin.
- **The phone is the UI:** Rapi-Nah, a "Rasta" maps parody with Sector V in red, a 10-minute-delivery ad ("we deliver faster than your bus"), a UPI parody.
- **Lobby is a family WhatsApp group** (Ma: "Kothay achhis? Ghore fir.", a Baba forward, Didi asking for biryani) with one big CHOLO button. No login, satire wall or tile grid before the first run.
- **Loading tips are jokes:** "Karunamoyee is not a stop, it's a feeling", "Rain at 6 PM is a feature".
- **Collectibles named after the joke** ("Democracy coins" style): "Seat-er asha", "Dry socks", "Refund coupons".
- **Portrait phone layout first**, with TAP / HOLD / SWIPE hints on the title card, and a **first stage under 5 MB** (Benglooru's 2-minute load and laptop-only stance are the anti-pattern).
- Lines mix Hindi, Bangla and English, and every line is understandable from context.

## Scope

**v1 (ship this):** junction with route cards and the jam, Rapi-Nah, bus, metro, receipt, share.
**v1.1:** rain day plus live weather, auto stand.
**Later:** more destinations, office-worker skin, multiplayer race ("first one home"), daily challenge.

**Cut from v1 on purpose:** walking around, open world, story, accounts, leaderboard backend.

## Guardrails
- Parody names only (Rapi-Nah, never Rapido, Uber or Ola); no real company logos.
- Joke about situations, never communities.
- No real politicians.
- No personal data collected; analytics must be anonymous, if added at all.
- If a public leaderboard is ever added, filter names (Bhaag Neha Bhaag's board shows abuse on its home page).

## Research
Playtest notes for six games in the genre, with GIFs, clips and screenshots: `research/mac/SUMMARY.md` and `research/mac/notes/`.
