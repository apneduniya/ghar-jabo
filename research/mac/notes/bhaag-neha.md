# Bhaag Neha Bhaag (bhaagnehabhaag.netlify.app)

**Played:** 8 Nov 2026 as "Bablu":
- desktop version (`/desktop/`, 1280×720, recorded at 960×540): 2 sessions, about **30 runs**;
- **phone version** (`/phone/`, iPhone 13 emulation, touch taps): 1 session, 11 runs.

Best was **0.07 km and 14 coins**; most runs ended at 0.02 km. The public top-10 starts at 1.5 km and the leader has 4.00 km. I played by jump rhythm, partly blind, so treat my distances as "newcomer floor".

Media: `media/bhaag-neha-run.gif|mp4`, `bhaag-neha-caught.png`, `bhaag-neha-home.png`, `bhaag-neha-phone.png` (phone title + in-run, side by side).

## What it is
A tiny **pixel-art endless runner** with a political-satire wrapper: "Neha is running through Delhi with the police and the goons right behind her. Collect the Democracy coins." The heroine is a **photo-cut-out face of a real person on an 8-bit body**. Pursuers are a khaki cop and goons in saffron headbands. Pickups are gold "D" **Democracy coins**. There's a global "TOP DEMOCRACY COLLECTORS" leaderboard (name, coins, km). Single HTML page with hand-coded sprites (drawn as ASCII strings in the JS); Netlify-hosted; no framework.

## First 10 seconds
- The landing page is the pitch line, a YOUR NAME box, **PLAY**, and the leaderboard right there (names like "Loda", "Modi deshdrohi", "Test" ×2: unmoderated).
- Pressing PLAY goes to "BHAAG NEHA! Grab the Democracy coins. Delhi Police and the goons are right behind you. Tap or press Space to run." Then a press, and you're running.
- **You understand it in 1 second** (run right, jump). You also die in about 3 seconds the first several times.

## Core loop and controls
- An auto-runner along a Delhi night street. **Space/↑ jump** (hold to jump higher); **↓ duck** under flying bricks, or slam down mid-air. Coins float in arcs. Goons stand in the road ahead. Pursuers chase from behind and catch you if you stumble.
- On the phone: **TAP jump · HOLD higher · SWIPE ↓ duck**, and "TAP TO RUN" to restart. Big on-screen JUMP / DUCK buttons appear on desktop too.
- Death screen: "**PAKDE GAYE!** Neha ran 0.02 km and collected 0 Democracy coins. Collect Democracy coins to get on the leaderboard. Tap or press Space to run again." Restart is instant (one key).

## Difficulty and run length
- **Brutal for a newcomer**: runs of 2–13 seconds. The first obstacle comes almost immediately and the pursuers are right on your heels, so one mistimed jump is over.
- The leaderboard needs coins *and* distance; top players reach 3–4 km.
- The loop is the classic "one more go" of Chrome-dino / Flappy-style games.

## Humour
- Almost all of the joke is the **premise and the nouns**: "Democracy coins", "Save the Democracy", the cop plus saffron goons chasing a woman with a guitar-singer vibe, "PAKDE GAYE!", and a "NEW DELHI · 11:47 PM" dateline.
- No in-run jokes, toasts or voice lines. The leaderboard names are the players' own jokes.
- Language: English UI with a Hindi title and death line.

## Art, camera, colours, fonts and HUD
- **Pure pixel art**: deep purple-maroon night sky, a pixel moon, kites (patang) floating, an elevated metro on a flyover with a pixel train passing, a Qutub-like minaret, lit windows, coloured shop awnings and a grey road with lane dashes.
- The photo face on a pixel body is a deliberate collage gag.
- Side-scrolling, fixed camera.
- **HUD:** DEMOCRACY coins, DIST km and BEST km in **Press Start 2P** (orange/cream). Body text in **VT323**. The title is orange-cream-orange pixel caps.
- Phone version: a portrait layout with a big km counter top-left, a coin count top-right and a huge round photo of Neha on the title card.

## Feel: motion, juice, sound and voice
- Motion is crisp at 60 fps with snappy jumps. Holding for a higher jump feels good once you get it.
- **Juice:** small. The code has a `shake` (5 references, on getting caught or hit) and nothing else; no slow-mo, no vibration call.
- **Sound:** **one WebAudio square-wave oscillator** (`createOscillator`, `type='square'`) for blips (jump/coin/death chirps). No audio files, no music, no voice. The audio tap peaked at −21.7 dB (mean −48 dB), so it's very quiet and sparse.
- It feels like a Chrome-dino clone with a political skin: fine, but the chase never *feels* dangerous beyond the instant fail.

## End/result screen and share hooks
- An inline overlay on the game canvas: Neha's face, **PAKDE GAYE!**, the distance and coins line, and a restart hint. Scores post to the global leaderboard ("Saving your score…"; "Best on your connection: #N"; "The leaderboard is offline right now." as fallback).
- **No share card or share button.** The leaderboard is the only social hook.

## Mobile experience
- A **dedicated `/phone/` page** in portrait. Tap/hold/swipe controls are clearly labelled on the title card ("TAP JUMP · HOLD HIGHER · SWIPE ↓ DUCK"). It loads instantly and taps registered fine in iPhone 13 emulation. Runs were just as short (died about every 4 s).
- The desktop page links "On a phone? Play the phone version." It doesn't auto-detect, which is a small miss.

## What works
- **Zero-friction**: name, play, dead, retry in under 10 seconds. A tiny page that loads instantly.
- The premise lands in one line, and the collectible noun ("Democracy coins") carries the satire.
- A separate, properly designed phone layout with explicit gesture hints.
- The pixel Delhi skyline with kites and the metro flyover is charming and cheap to make.

## What's weak
- **Too hard, too soon.** There's no grace period or ramp, so most first runs end in 2–4 seconds.
- Humour is one-note: no events, no lines, nothing reacts to what you do.
- Almost no sound, no music, no feedback juice.
- Unmoderated public leaderboard names (abuse/political names visible on the landing page).
- No share artefact.

## Ideas for Ghar Jabo
1. **Name the collectible after the joke.** "Democracy coins" works because the noun *is* the satire. For us: "Patience points", "Rapi-Nah refund coupons", "Seat-er asha" (hope of a seat), "Dry socks".
2. **Ship a dedicated portrait phone layout** with gesture hints on the title card (TAP / HOLD / SWIPE). Auto-detect instead of a link.
3. **A grace ramp**: the first 10–15 s of each stage should be survivable for a first-timer. Their 3-second deaths are the anti-pattern.
4. **Moderate leaderboard names** (or allow-list emoji/initials). Visible slurs or politics on the landing page would hurt a shareable game.
5. Borrow the **instant one-key retry**, and the **"Dateline + time" flavour** in the HUD ("SALT LAKE SECTOR V · 6:42 PM").
6. A cheap pixel or low-poly skyline with **local signifiers** (for us: the Webel/Technopolis towers, the Green Line viaduct, a kite in the sky, yellow taxis) gives place identity for almost no cost.
