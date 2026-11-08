# Fightkaro / Sansad Showdown (fightkaro.com)

**Played:** 7 Nov 2026, desktop 1280×720, headed Chrome, GPU. Three sessions:
- an earlier partial session (menus, select screen, one intro);
- Match 1: **Mitraman (me) vs Yatra Boy (CPU)** on **Sansad** stage, Normal. Lost 0–2.
- Match 2: **Deedee (me) vs Toll Man (CPU)** on **Desi Sadak**, Normal. Won 2–0 by K.O.

I played with mashed and semi-random inputs (walk in, J/J/K strings, crouch-kick, jump-kick, the super button when SHAKTI was full), roughly how a newcomer button-mashes.

**Interrupted:** the iPhone 13 viewport session was killed mid-load because of Mac load, so **mobile wasn't tested**. Match 1's video was truncated before the fight. Match 2's video is intact but its audio tap was lost in the kill, so the GIF/MP4 clips are **silent**. The audio section comes from the 46 MP3 files the game loaded, transcribed with whisper.

Media: `media/fightkaro-fight.gif|mp4`, `fightkaro-super-e20.gif|mp4`, `fightkaro-newspaper.gif|mp4`, plus `fightkaro-select.png`, `fightkaro-fight-hud.png`, `fightkaro-newspaper-win.png`, `fightkaro-satire-notice.png`.

## What it is
A 3D Street Fighter-style 1v1 brawler starring **caricatures of Indian politicians** under pun names: Mitraman (Team Vaada), Yatra Boy (Team Yatra), Deedee (Team Dharna), Tariff Taau, Dozer Dada, Toll Man (Team Highway), Sutti Babu, Rail Raja, Boss Mbapu (unlock: "Beat Mbapu to open the portal 🔒"), and Random. The stages are Sansad, Jantar Mantar and Desi Sadak. Modes: 1P vs CPU (Easy/Normal/Hard) and "🌐 Play with a friend" (rooms). There's a Diwali special edition with a "Diwali card bhejo" share, and a "PRESS B FOR NIRMALA'S BUDGET! 📕" gag overlay that you have to SKIP.

## First 10 seconds
- A **full-page satire notice in Hindi and English** (Article 19(1)(a), "not affiliated", a complaints email) with "I UNDERSTAND · CONTINUE". That's a legal shield and a mood-killer, but it's one click.
- The title screen shows the whole cast dancing in a street with "SANSAD SHOWDOWN · THE GREAT KURSI FIGHT" and "PRESS ENTER / CLICK TO START". You get the joke instantly from the faces.
- Select screen: you tap a face for 1P, then one for CPU, pick a stage and difficulty, then FIGHT! Each character card shows its **super with a one-line joke description** (e.g. Yatra Boy: "ALOO SE SONA. Zaps the opponent into an aloo, feeds it to his machine, and out comes pure sona").
- Gotcha: non-default characters say "DOWNLOADING TOLL MAN… 0%". Pressing FIGHT before the download finishes silently did nothing, and my inputs then bounced me back to the title.
- About 15 s from load to first punch, including the notice.

## Core loop and controls
- Best of 3 rounds, a 60 s timer, health bars with round pips, and a **SHAKTI** super meter that fills from hitting and blocking. "SHAKTI READY!" appears when it's full.
- Keyboard: WASD to move, jump and crouch; back is block. **J** punch, **K** kick, plus **L** and **I** (super/special). Strings are named per character, e.g. "J, J, K", "K, K" Push-Spin, "→K Hurricane Entry". There are hit counters ("2 HITS", "5 HITS") and named combos flashed mid-screen ("NON-STOP DHARNA COMBO!", "FULL SPEED COMBO").
- **The super is a cinematic.** Toll Man's **GADDHA BLAST** cuts to a big "E20" can graphic: he opens a pothole under you, turns sugarcane into E20, pours it in and flicks a match. Deedee's **JADU HOBE** stirs a pot to a "humba humba" chant and turns the opponent into a frog. Each does 30%.
- The CPU on Normal is beatable by mashing; I won 2–0 as Deedee. As Mitraman I lost 0–2 to Yatra Boy's Yatra Sweep plus his Aloo-se-Sona super.

## Difficulty and run length
- A match takes about **2–3 minutes**: 2–3 rounds of up to 60 s, plus intros and the result. It's very approachable on Normal.
- There's a long tail in the Boss Mbapu unlock, Hard mode, and multiplayer rooms (not tested).

## Humour
- **A satirical news layer runs on top of the fight the whole time:**
  - A **"● LIVE · BREAKING BAKWAS" anchor box** at the bottom: anchor "SHOR SHARMA" vs "TROLL ARMY · TWEETY TROLLWALA", each reacting live ("Doston, josh is HIGH!", "That was a JUMLA punch, didn't even hurt!", "Rigged! We demand a re-match!").
  - A **red BREAKING ticker** with lines generated from fight events: "TOLL MAN demands JPC probe into JAB", "Fact-checkers still verifying FULL SPEED COMBO. Results by 2029.", "BREAKING: GADDHA BLAST unleashed! Pothole on Desi Sadak catches fire, repair tender floated", "Chai cup lost in crossfire. TOLL MAN blamed.", "KURSI INDEX jumps 540 points after TOLL MAN's FULL SPEED COMBO", "DEEDEE takes the round. Sweets distributed outside party office".
  - **FAKE POLL**: "MITRAMAN 73% · YATRA BOY 46% · OTHERS 10% · TOTAL 129% · Margin of error: ±100%".
- Round intros in Hinglish: "Round 1! Deedee ji is READY!", "Toll bhau warming up!". KO line: "K.O.! Is baar, knockout paar!"
- Stage props are part of the joke: cows (moo + cow-bell SFX), chai cups that break, an aloo cart ("Aloo lelo, kaande lelo" voice), a crowd waving VOTE / JAI HIND / BADLAV placards.
- Language: Hinglish headlines and taunts, English UI, Hindi satire notice. The politician voice clips are meme-quote recreations (see Sound).

## Art, camera, colours, fonts and HUD
- **3D caricature heads on stylised bodies**, rigged and animated (stance, walk, hits, knockdowns). Bright pastel low-poly streets (pink, orange, green facades, tricolour flags, auto-rickshaws, fruit carts).
- The camera is a classic side-on 2.5D fighter view with zoom for supers.
- The HUD is pure Street Fighter: portrait plus name ("DEEDEE (YOU)") on top, yellow health bars, a big centre timer, round pips, gradient SHAKTI meters at the bottom corners, and the news strip and ticker along the bottom.
- Fonts: a condensed bold italic sans for the HUD and titles (Teko/Bebas-like), and a **Times-style serif for the newspaper**.

## Feel: motion, juice, sound and voice
- **Juice is strong.** The JS has hit-stop (`hitStop`, 12 uses), camera shake (`shake`, `shakeAmt`, `shakeTime`, about 50 uses) and `timeScale` slow-mo for KOs and supers. I saw hits freeze for a beat, the screen jolt on heavy hits, and a slow-mo knockdown. I found no `navigator.vibrate` in the code.
- Knockdowns are big ragdoll-ish falls. The supers cut to full-screen props (E20 can, pot, chakra) with their own music bed.
- **Sound: 46 MP3s.**
  - Announcer (whisper-transcribed): "Fight!" (0.6 s), "Round 1" / "Round 2" (1.1 s), "Final round!" (1.2 s), "K.O." (2.5 s), "Perfect" (0.8 s), "Time up" (0.6 s), "You win!" (1.3 s), "You lose." (1.2 s).
  - **Character voice clips (6–8 s)**: `modi` (8.3 s, a Sanskrit-style shloka recitation), `rahul` (5.6 s: *"Aisi machine lagaunga, is side se aloo ghusega, us side se sona niklega"*, the famous meme line), `didi` (6.3 s), `nitin` (8.4 s), and `aloolelo` (8.6 s: "Aloo lelo, kaande lelo").
  - Super beds: `bed_chakra` 7.9 s, `bed_jadu` 6.6 s, `bed_tariff` 5.4 s, `charge_chakra` 7.0 s, `charkha` 6.3 s; `release_*` 3.4 s each (bulldozer, chakra, jadu, tariff).
  - Music: `intro` 9.6 s, `background` 10.5 s, `battle` 29.4 s loop, `jingle_win` 2.7 s / `jingle_lose` 2.9 s, `drumroll` 4.3 s.
  - SFX (0.4–1.7 s): bomb, boom, pataka (4.1 s), camera_clicks, chai_ting, cup_break, cow_bell, moo, coins, kaching, eye_zing, metal_crunch, poof, thunder, engine_loop, news_sting, ui_select, ui_confirm.
- The **news_sting** under each ticker headline and the camera-click flashes on the newspaper make the satire layer *sound* like TV news. That's a cheap, very effective trick.

## End/result screen and share hooks
- **A full newspaper front page, "BREAKING BAKWAS"**: dated today ("SATURDAY, 7 NOVEMBER 2026 · PRICE ₹5 · DIWALI SPECIAL EDITION 🪔"), a headline ("DEEDEE STORMS DELHI!" / "YATRA BOY WALKS TO VICTORY!"), a grey halftone photo of the winner ("Deedee celebrates outside the Sansad. (Cartoon, not a real photo)"), a subhead ("LANDSLIDE 2–0 · Opposition in shock"), a **quote from the loser's camp** ("'Road under construction tha, isliye haare.' — Toll Man camp"), a filler story ("Breaking: Sansad mein sirf green patakhe allowed.") and a rotated green **YOU WIN!** rubber stamp (red YOU LOSE when you lose).
- It's tilted a few degrees like a paper on a table, and slides in with camera clicks.
- Buttons: REMATCH (big orange), CHARACTER SELECT, "🪔 Diwali card bhejo" (share), "Maza aaya? ☕ Ek chai pilao" (tip).

## Mobile experience
Not tested: the phone-viewport session was killed for load before the game loaded. The title says "Press Enter / Click to start", so touch is supported at least for menus. I didn't verify on-screen fight buttons.

## What works
- **Context-generated ticker headlines**: fight events are slotted into political-news templates ("X demands JPC probe into JAB"). Endless variety from a small template set, and every hit becomes a joke.
- **The newspaper result screen** is the best end screen of the set: dated, headline, loser quote, stamp. Instantly screenshot-able.
- Supers as **mini-sketches** of each character's real-world meme (E20, aloo-se-sona, jadu).
- Strong hit feel from hit-stop, shake and slow-mo KO.
- Short matches with an instant REMATCH.

## What's weak
- The satire notice wall and the "Nirmala's Budget" overlay are friction before the fun.
- The **silent download gate** on characters: FIGHT does nothing until "DOWNLOADING… 100%".
- Humour leans on knowing Indian politics. Outside that it's a generic fighter.
- Mashing wins on Normal, so there's little depth for a casual player.

## Ideas for Ghar Jabo
1. **Live "news ticker" or "Rapi-Nah notification" stream generated from what you do.** Templates plus events: "Rapi-Nah: Captain cancelled. Reason: 'Bhai, Sector V mein jam hai'", "Bus 215 footboard capacity: 140%. Margin of error ±100%", "Auto queue moved 2 metres. Residents celebrate."
2. **Trip receipt as a newspaper or receipt hybrid** with a fake date line, headline, a quote from the "losing side" ("'Rain hoyechhe, tai deri.' — Rapi-Nah captain") and a rubber stamp (PAUNCHHE GECHHI / GHAR JAWA HOLO NA).
3. A **fake poll gag** on the result: "Ghar pouchhano chance: 73% · Rapi-Nah surge: 2.4x · Total 129%".
4. **Hit-stop plus shake plus slow-mo** on key moments: shoved off the footboard, a door slamming at Sector V station, a bike-taxi cancel notification landing. Short and punchy.
5. **One cinematic "super" per stage**: e.g. umbrella-shield through the flood, or the conductor's "Pichhone egiye jaan!" crowd-compress.
6. A **news-sting SFX** under each joke headline. Pick a Kolkata-flavoured sting (shankh, or a tram bell).
7. Avoid the friction: no download gate on the first run, and no notice wall (a one-line "parody" footer is enough for us, since we don't use real people).
