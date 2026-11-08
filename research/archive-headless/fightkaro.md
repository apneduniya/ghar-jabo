# Fightkaro / Sansad Showdown (fightkaro.com)

**Status: not actually played.** The first headless load got through and returned the page text (below). Every load after that, from the server and from the server's curl, hit a **Vercel Security Checkpoint** ("Failed to verify your browser", code 21). Per the rules I stopped there and didn't try to get around it. The preview tab on Adarsh's Mac loaded the real page (title "Sansad Showdown — Political Satire Fighter", one canvas), but the tab was hidden, so it never rendered or ran timers, and screenshots timed out. Anything marked *(guide)* comes from the fan guide fightkaro.org, not from my own play.

To play it properly: open fightkaro.com on the Mac in a normal, visible browser window.

## What it is
- A 3D political satire fighting game by ShivamBuilds. You fight with lookalikes of Indian (and some foreign) politicians who have parody names. *(guide)* Six fighters: Mitraman, Yatra Boy, DeeDee, Tariff Taau, Dozer Dada, Toll Man. A boss, "MBAPU" (200 HP). Three stages: Sansad, Jantar Mantar, Desi Sadak.
- *(guide)* Modes: 1P vs CPU (Easy/Normal/Hard) and a friend room (host or join with a code). Rounds last 60 s, best of 3.

## First 10 seconds (seen directly)
- A loading screen: "Loading neta assets…".
- A full-screen **satire notice in Hindi and English**. It cites Article 19(1)(a), says the game isn't affiliated with any party or leader, has no intent to spread hatred or influence elections, contains cartoon violence ("do not imitate"), and gives a removal-request email. You have to scroll to the bottom before continuing.
- A joke interstitial: "PRESS B FOR NIRMALA'S BUDGET! 📕 BUDGET [B] · SKIP ›". So the gag starts even before the game does.
- A 🔊 toggle on the first screen.

## Core loop and controls
- *(guide)* Classic 2D-plane fighter: move, punch, kick, special, with a shared "SHAKTI" meter. Keyboard on desktop, **four on-screen buttons on phones**.

## Humour
- Every joke is in the names and powers (Tariff Taau, Toll Man, Dozer Dada) plus the arenas. It's recognisable from a thumbnail even if you don't follow politics closely.
- Hindi plus English throughout, including the legal notice.

## Art / UI, audio, end screen, mobile
- I couldn't see any of these. From press clips: chunky 3D cartoon heads on small bodies (the "big head" style) make each lookalike readable at phone size.

## What works (from what's visible)
- **The satire notice is a shield.** For a game that names (lookalikes of) real people, a clear, bilingual disclaimer with a contact email is cheap protection, and it reads as confident rather than scared.
- **The joke starts before play** (the budget interstitial), so even someone who never gets past the menu has something to screenshot.
- **Two-player rooms by code** for friend fights, plus a CPU mode so it's never empty.

## What's weak
- A long legal wall before play: you must scroll before you can continue. That's friction in the first 10 seconds.
- Bot protection (Vercel checkpoint) also blocks some real users on unusual browsers or networks.
- Real-politician satire carries legal and backlash risk; the notice exists because of it.

## Ideas for Ghar Jabo
1. **A one-line parody notice, not a wall:** "All apps, buses and captains are fictional. Rapi-Nah is not a real app (sadly the cancellations are)." The disclaimer becomes the first joke.
2. **Show a gag before the game starts.** For example, the START button is a "Book ride" button that immediately says "Finding captain…". The joke lands before the first tap.
3. **Big-head, readable characters.** The conductor, the captain and the umbrella uncle should be identifiable at 390 px wide.
4. **Don't put bot protection in front of the game page.** A shared link must open instantly for everyone.
5. Keep the safe angle: no real politicians or brands (already in DESIGN.md guardrails).

## Feel: motion and sound
- Not observable (blocked). A 🔊 toggle on the first screen suggests sound is part of the pitch. No audio files were captured.

## Screenshots
- None usable (the only capture shows the Vercel checkpoint, which wasn't kept).
