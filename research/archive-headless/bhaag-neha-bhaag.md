# Bhaag Neha Bhaag (Delhi protest runner)

URL: https://bhaagnehabhaag.netlify.app/ (v1.5) · by Anav and Akshay Nayar (Wizloop Studios) · a single HTML file per platform, 2D canvas, no framework

How this was researched: played the phone build (390×700 touch emulation). I played 3 runs by hand (died almost immediately each time, which is itself a finding) and 4 runs with a small bot hooked into the game loop, so I could watch long runs and record them. I also read the game source.

Screenshots: `img/bhaag-neha-bhaag-start.png` (menu), `img/bhaag-neha-bhaag-howto.png` (ready screen), `img/bhaag-neha-bhaag-play.png` (mid-run), `img/bhaag-neha-bhaag-over.png` (game over), `img/bhaag-neha-bhaag-scorecard.png` (share card). GIF: `img/bhaag-neha-bhaag-run.gif` (last 8 s of a run, including the catch).

## What it is
An endless Chrome-dino-style runner. Neha runs right through a night-time Delhi street while the police and "goons" chase her from the left edge. Jump or duck obstacles and collect "D" Democracy coins.

## First 10 seconds
- The menu shows a big circular **real photo of Neha**, a pixel-font title, a 2-line premise, a **name field that is required** ("Type a name first.") and a live top-10 leaderboard.
- The name gate is the one real piece of friction: you can't play until you type something.
- The ready screen has 3 chunky pill hints: **TAP JUMP · HOLD HIGHER · SWIPE ↓ DUCK**, then "TAP TO RUN". This is the whole tutorial, and it's enough.
- Your first tap starts the run *and* jumps. Chasers shout **"PAKDO!"** in a speech bubble within 2 seconds, so the threat is clear without reading anything.

## Core loop and controls
- Tap to jump; hold for a higher jump (lower gravity while held and rising); swipe down to duck, or to fast-fall mid-air. A jump pressed just before landing is buffered.
- Obstacles: cop, goon, barricade, tall barricade, auto-rickshaw; after 100 m, double barricades; after 150 m, a cop + goon pair; after 250 m, flying **bricks** (high ones must be ducked).
- Coins come in an arc over an obstacle (rewarding a jump) or a low line after it.
- The leaderboard ranks by coins, not distance ("Collect Democracy coins to get on the leaderboard").

## Difficulty and run length
- Speed ramps from 1.5 to 3.8 (the cap is reached around 1 km), with a fixed 60 Hz timestep.
- **Punishing at the start:** my hand-played runs ended at 0.04 km within a few seconds (blind tapping into obstacles). The Week called it "Flappy Bird difficulty".
- A strong run (the bot) lasts about 75 s and ~3 km with ~150 coins. The public top score is 400 coins / 4 km. So runs take 5–80 s, and restarting takes one tap.

## Humour
- Thin but pointed. All the satire comes from the premise and the nouns: "Democracy coins", "+1 DEMOCRACY" pops, chasers yelling "PAKDO!", the death screen **"PAKDE GAYE!"** ("Caught!").
- Hindi words in English letters, in a pixel font.
- No jokes during the run beyond the bubble. The leaderboard has become the comedy instead (players pick names like political insults, and nothing filters them).

## Art / UI style
- Hand-made pixel art. Sprites are defined as text pixel maps in the code ("YudduuY" = coin rows). Two fonts: Press Start 2P and VT323.
- Fixed side-scrolling camera. Night palette (deep purple sky, orange accents, lit windows), a Delhi skyline with a dome/minaret silhouette, a moon, **kites floating in the sky** and **an elevated metro train sliding across the background**. Cheap ambient life that makes the city feel real.
- The HUD is just distance (big, top-left), best distance, and coins (top-right).
- **Portrait layout wastes space:** the game strip sits in the lower-middle and the top third is empty sky.

## Feel: motion and sound
- Motion: tight arcade physics. The jump impulse is fixed (5.2) with variable height from holding, and swiping down mid-air drops you fast (gravity 1.6). Two-frame run cycles for the chasers, parallax background layers at different speeds, and a screen shake of 12 frames on death.
- After the catch, the chasers walk up to Neha during a ~0.5 s death beat before the over screen. The catch is *shown*, which sells the joke.
- **Sound: fully synthesised, very minimal (5 beeps):** start 520 Hz, jump 660 Hz, coin 1250 Hz, every 100 m a 880 Hz milestone, death a 140 Hz sawtooth "bzzt". No audio files, no music, no voices.
- `navigator.vibrate(120)` on death gives a phone buzz when you're caught. A cheap haptic that feels great.
- Respects reduced motion (no shake).

## End / result screen and sharing
- Game over: the photo again, "PAKDE GAYE!", "Neha ran X km and collected N Democracy coins", "NEW BEST!", then PLAY AGAIN / LEADERBOARD / MAKE SCORE CARD.
- **Score card:** a generated image card with title, "PLAYED BY <name>", the photo, "PAKDE GAYE!", distance, coins, **"#741 ON THE LEADERBOARD"**, the challenge line **"Can you outrun them?"** and the URL BHAAGNEHABHAAG.COM.
- Buttons: SHARE SCORE (the Web Share API with the image file) and SAVE IMAGE.
- Showing a leaderboard rank even for bad scores (#741) gives everyone something to post.
- A global leaderboard (Netlify function, anonymous random id in localStorage, retries on failure).

## Mobile
- Separate `/phone/` and `/desktop/` builds, chosen at the menu by pointer type or width.
- Touch is the primary input and it's very responsive.
- Small cost: everything is tiny pixel text on a big empty screen.

## What works
- A one-sentence premise everyone gets instantly, plus 3 one-word control hints.
- Restarting takes one tap; runs are seconds long, so "one more go" is strong.
- The share card is the best part: personalised, a rank for everyone, a challenge line, the URL baked into the image.
- Haptic buzz and screen shake on failure for almost no code.
- Background life (kites, a passing metro) gives a sense of place without any gameplay cost.

## What's weak or annoying
- The required name before the first play is friction.
- Brutal early difficulty: new players die in 2–3 seconds before they've learned anything. There's no gentle first 10 seconds.
- An unmoderated public leaderboard fills with abusive or political names.
- **Research note:** my bot runs were submitted as "Test" and now sit at #9/#10 on their public board. That was a mistake; I blocked the score API for my later runs. For Ghar Jabo, this shows a leaderboard needs basic anti-bot or sanity checks.
- The screen is underused in portrait. Sound is sparse and gets repetitive.

## Ideas for Ghar Jabo
1. **A score card image with a challenge line and the URL baked in**, plus Web Share (image file) and Save image. Copy the "#741 ON THE LEADERBOARD" trick even without a leaderboard: show a percentile ("Faster home than 62% of players") so everyone has a brag.
2. **No name gate.** Let people play first; ask for a name only when they make the card ("Put your name on the receipt?").
3. **A gentle first 10 seconds:** the first bus and the first crossing in run one should be nearly impossible to fail. Ramp after that.
4. **The ready screen as 3 pill hints** (e.g. "TAP BOOK · HOLD GRIP · SWIPE SEAT"). That's the whole tutorial.
5. **Show the failure, then the punchline:** the bus driving off with you on the road, or the metro doors closing in your face, held for ~0.5 s before the result screen.
6. **`navigator.vibrate` + screen shake** on fall-offs, door closes and ride cancellations; a cheap, big boost to feel.
7. **Ambient city life in the background:** a metro gliding over the viaduct above the junction, yellow taxis stuck in the jam, a chaiwala. No gameplay, all atmosphere.
8. **A speech-bubble shout as the threat cue** ("ASTE LADIES!", "SEALDAH-SEALDAH!", "AR EKJON!"). One word over a sprite reads faster than a toast.
9. If we ever add a leaderboard: a name filter, a server-side sanity check on scores, and rank by the stat that's fun to compare (home-by time).
10. Use portrait space: put the phone/app UI in the top half and the street in the bottom half, so the screen isn't empty sky.
