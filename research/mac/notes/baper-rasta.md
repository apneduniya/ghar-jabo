# Baper Rasta / বাপের রাস্তা (baperrasta.com)

**Played:** 8 Nov 2026, desktop 1280×720 (recorded at 960×540), headed Chrome, GPU, official site only. 3 runs:
- **Run 1** (about 20 s): bumped around Farmgate, flattened by a bus.
- **Run 2** (about 12 s): smashed a tea stall for ৳500, chased and caught by the mob.
- **Run 3**: cut short when the driver hit its 30-minute session cap.

I drove with a simple script: hold accelerate, random steering, occasional drift, horn and sound-bomb. That's close to how a newcomer plays it ("smash things"). **Mobile viewport not tested** (time-boxed out). Clips have game audio (WebAudio tap). Voice clips were transcribed with whisper-small, which is poor at Bangla, so voice descriptions lean on the clips' file names (well-known BD meme audio).

Media: `media/baper-rasta-drive.gif|mp4`, `baper-rasta-bus-hit.gif|mp4`, `baper-rasta-newspaper-mob.png`, `baper-rasta-newspaper-bus.png`, `baper-rasta-home.png`, `baper-rasta-hud.png`.

## What it is
A Dhaka **chaos-driving satire**, entirely in Bangla. You drive a battery auto-rickshaw. The home screen frames it as a "Tesla" you hand your kid: **"রাস্তা কি আপনার বাপের? আপনার সন্তানকে টেসলা দিন: নো লাইসেন্স, নো ব্রেক।"** ("Is the road your father's? Give your child a Tesla: no licence, no brakes.") The score is **জাতীয় ক্ষতি**, national damage in ৳. Made by Omar Faruqe Riyad. There's a public "মোস্ট ওয়ান্টেড" (most wanted) leaderboard.

Rules from the home card:
- 💥 Crash into cars, bikes and shops: the more you break, the more national damage.
- 🚌 Touch a bus or truck and it's over. A red light underneath means stay away.
- 🏃 The public will chase you; if they catch you it's a beating (ধোলাই), so escape first.
- ⚡ Charge low? Stop at the **yellow mark**, where the line comes straight off the mains (power theft).
- ৳ **"সানডে মানডে ক্লোজ"**: at the **pink mark** give **মামা** (the cop) tea-money and the case is closed.

## First 10 seconds
- The home page is a dark card over a live 3D street flythrough: big Bangla title, the Tesla pitch, a yellow **রাস্তায় নামেন** ("hit the road") button, a 5-row icon rules list and a full control list. One click starts.
- In game you're **immediately on a Dhaka road** under a flyover, with a HUD pill for charge (100% ⚡) and a pointer "চার্জ ৩০ মি ডানে" (charge 30 m to the right). A news ticker starts at once.
- The first crash happens within seconds. Time to first control: about 2 s after the click.

## Core loop and controls
- Drive, smash things to raise জাতীয় ক্ষতি, avoid buses and trucks, outrun the mob, manage charge (drift drains it faster), bribe at pink marks, steal power at yellow marks.
- A run ends when a bus or truck hits you, the mob catches you, or (presumably) the charge runs out. Runs are **short: 10–30 s for a newbie**.
- Controls: **W/↑** drive, **S/↓** brake, **A/D** steer, **Shift/Space** "টান দেন" (boost/drift: "faster, uses more charge"), **H** horn, **B শব্দবোমা** (sound bomb: plays a loud meme clip), **M** mute, **C** camera (near/far), mouse-drag to look, **P/Esc** pause.
- A thoughtful note on keyboard ghosting: "some keyboards can't hold ↑ + ← + Space; use right Shift instead".

## Difficulty and run length
- Very short, punishing runs. Buses are everywhere and one touch is instant death. That's the joke ("মায়ের দোয়া বাসের সাথে কাজ করে না": "Mother's blessing doesn't work against a bus", playing on the "মায়ের দোয়া" slogan painted on Dhaka buses).
- Depth comes from chasing a higher damage record ("নতুন রেকর্ড! ৳৫০০") and climbing the most-wanted list ("মোস্ট ওয়ান্টেড তালিকায় উঠতে আরও ৳১৬,৪৫,৩০০ ক্ষতি লাগবে": you need ৳16,45,300 more damage to make the list).

## Humour
- **In-run floating lines:** "চা শেষ!" (tea's finished!, smashing a tea stall, +৳৫০০), "পাবলিক পিছে! ৩ জন!" (public behind you! 3 people!), "গরীব মানুষ, ছাইড়া দেন!" (I'm a poor man, let me go!, when caught), "ছাদে উঠে গেলাম! ভাড়াও লাগলো না" (I'm on the roof! didn't even pay fare), "কাগজ ঠিক আছে। যান।" (papers are fine, go: the cop).
- **News ticker** ("সর্বশেষ / খবর / ব্রেকিং") mixing in-run events with real-world Dhaka satire:
  - "রাজধানীর সড়কে নামল আরেকটি অটোরিকশা, বাকিটা ইতিহাস" (another auto hits the capital's roads; the rest is history)
  - "ম্যানহোলের ঢাকনা চুরি ঠেকাতে ঢাকনায় নাম লেখার সিদ্ধান্ত" (decision to write names on manhole covers to stop theft)
  - "বেকার স্নাতক ৯ লাখ, আরও পাঁচ নতুন বিশ্ববিদ্যালয়ের অনুমোদন" (9 lakh unemployed graduates; five more universities approved)
  - "কারওয়ান বাজারে ফুটপাতে উঠে পড়ল অটো, পথচারীরা নামলেন সড়কে" (auto climbs the footpath at Karwan Bazar; pedestrians step onto the road)
  - "ফার্মগেটে অটো ঘিরে ধরল উত্তেজিত জনতা…" (an agitated crowd surrounds an auto at Farmgate)
- **The newspaper end screen**: see below. It is the comedic centrepiece.
- Real Dhaka places (Farmgate, Karwan Bazar, Dhaka North), bus slogans, power theft, cop bribes ("মামা", "চা-পানি"), the "সানডে মানডে ক্লোজ" meme phrase, and "previous regime" blame politics.
- Language: **pure colloquial Dhaka Bangla** (ছাইড়া, লাগতেছে, দেখি নাই), with English loanwords in Bangla script (টেসলা, লাইসেন্স, ব্রেক). No English UI at all.

## Art, camera, colours, fonts and HUD
- **Dense low-poly Dhaka**: a metro-rail flyover overhead, tangled overhead wires, brick footpaths, yellow-black kerbs, colourful shop signboards in Bangla, rickshaws, CNGs, buses, green bins, roadside stalls, bunting. It's the most "place-specific" street of the six games.
- **Camera:** third-person chase behind the auto. C toggles near/far, mouse-drag looks around.
- **HUD:** a minimal top-left damage counter (জাতীয় ক্ষতি ৳), a charge % pill, a charge-direction pointer ("চার্জ ২০ মি সামনে"), a news ticker along the bottom, and big floating Bangla shout text mid-screen (e.g. "মায়ের দোয়া / বাসের সাথে কাজ করে না" in huge outlined letters).
- Fonts: bold Bangla display face (Hind Siliguri / Noto Serif Bengali–like) for the masthead, a clean Bangla sans for UI. The newspaper uses a cream paper texture with a red section label.

## Feel: motion, juice, sound and voice
- **Motion:** light, slidey arcade handling. Crashes send props flying, and a bus impact flattens you. There are cartoon impact bursts ("ধপাস!") on the photo.
- **Juice:** big shout text, impact SFX, a meme-voice reaction on almost every event. Camera shake on crashes was visible in the recording.
- **Sound: 40+ short MP3s, almost all meme voice clips** (1–5 s):
  - reactions: `omagoo`, `ki-pagolami` (what madness), `rag-korla` (are you angry), `khoma` (forgive), `ostad-maf` (ustad, forgive), `griberaa` ("গরিবেরা বাঁচবে কেমনে?"-type line), `disturb-koiren-na` ("disturb করবেন না, দেখতেছি"), `kaj-thik-hoyni` (job not done right), `no-need-explanation`, `please`, `sir-shanto`, `masud` ("ভালো আছো মাসুদ?"-type meme), `koi-jan`, `jan-bolchi`, `hate-khurto`, `amar-lungi`, `arektu-bame` (a bit more to the left), `aro-taka` (more money), `bar-bar`, `good-news`, `laugh`, `man-ahahaugh`, `run-away`, and **`khela-hobe`** (the "খেলা হবে" political meme);
  - mob: `mob-shout-1..3` (1.5–4 s);
  - SFX: `punch`, `dishum`, `cartoon-impact`, `crash-meme`, `brake`, `breaker-whee`(-2) for speed breakers, `horn-meme`;
  - hawkers: `hawker` 4.8 s, `hawker-2` 5.2 s;
  - **sound bombs**: `sound-bomb-1` (16.6 s), `-2` (4.4 s), `-3` (4.6 s), played on B.
- No real music bed during driving that I noticed; the soundscape is horns plus meme voices plus impacts. It's loud, chaotic and very *Dhaka-Facebook*.

## End/result screen and share hooks
**"দৈনিক যানজট"** (Daily Traffic Jam), a full front page:
- A masthead with **side ears**: "গ্যাস আসে-যায়" (gas comes and goes) and "সিলিন্ডার দাম জানি না" (don't know the cylinder price). Date line "রবিবার, ৮ নভেম্বর ২০২৬ · সংখ্যা ২" (issue = run number), tagline "জ্যামে আটকে থাকা মানুষের কণ্ঠস্বর" (the voice of people stuck in traffic), "মূল্য: ১০ টাকা".
- **Lead headline generated from the run**:
  - Run 1: "অটো নামল, কিছুই ভাঙল না, পাঠকেরা হতাশ" (auto hit the road, broke nothing, readers disappointed).
  - Run 2: "ধাওয়া দিয়ে অটো ধরল জনতা, চার্জার পর্যন্ত খুলে নিল" (mob chased down the auto, even took the charger).
- **A screenshot from the actual run** as the front-page photo, with a comic "ধপাস!" burst and a red **জাতীয় ক্ষতি ৳৫০০** stamp. The caption reads "ঘটনাস্থলের ছবি তুলেছেন একজন পথচারী, যিনি সাহায্য না করে ভিডিও করছিলেন" (photo by a passer-by who filmed instead of helping).
- **"এই টাকায় হতো" clipping** (what this money could have paid for): "ঢাকা উত্তরের মশা মারার ৭.৬ সেকেন্ডের বাজেট" (7.6 seconds of Dhaka North's mosquito-control budget; FY26-27 allocation ৳207 crore).
- **Quote from a victim**: "বাকির খাতাটাও ভাঙছে। এলাকাবাসী খুশি।" ("My unpaid-tab ledger got smashed too. Locals are happy." from the tea stall), or "এত ভদ্র অটো জীবনে দেখি নাই। সন্দেহ লাগতেছে।" ("Never seen such a polite auto. Suspicious." from a cop) on a zero-damage run.
- **Body copy**: "নিজস্ব প্রতিবেদক, ফার্মগেট: … বাসচালক জানান, তিনি কিছু টের পাননি, কারণ তখন তিনি পাশের বাসের সাথে রেস দিচ্ছিলেন। মন্ত্রণালয় জানায়, অটোটি আগের আমলে রাস্তায় নেমেছিল, তাই দায়ও আগের আমলের। … কমিটির প্রধান অটোর প্রযুক্তি বুঝতে চীন সফরে গেছেন। ফেরার তারিখ এখনো ঠিক হয়নি।" (The bus driver noticed nothing because he was racing the next bus; the ministry says the auto came out under the previous regime, so the blame is theirs too; a committee head went to China to understand auto tech, return date unknown.) Also: "পুলিশ আসে সব শেষ হওয়ার পর, এবং জানতে চায়, 'কী হইছে এখানে?'" and "এক কর্মকর্তা ঘটনার পেছনে 'গভীর ষড়যন্ত্র' দেখছেন".
- Footer: "সম্পাদক: ওমর ফারুক রিয়াদ" (editor = the developer).
- Buttons: **আবার চালান** (drive again, big yellow), হোম, **শেয়ার** (share), a "নতুন রেকর্ড!" note, a most-wanted gap line and subscribe.

## Mobile experience
Not tested. The keyboard ghosting note and the mouse-look suggest desktop-first. Touch support is unverified.

## What works
- **The best end screen of all six.** A personalised newspaper with **your own crash photo**, a run-generated headline, a "what this money could have bought" civic jab, a victim quote and a satirical news body. It turns a 15-second failure into a shareable artefact. **This is the model for Ghar Jabo's trip receipt.**
- **Hyper-local language and references** (Dhaka Bangla, bus slogans, মামা, চা-পানি, power theft, "আগের আমল"). It feels written *by* locals *for* locals.
- Short runs and instant restart make the "one more try" loop strong.
- Meme voice clips on every event give constant audio payoff for cheap.
- Bus = instant death is a running joke that teaches itself.

## What's weak
- Runs can be *too* short (12–20 s), so you see the newspaper more than the road.
- Mob and bus spawning feels random. Little sense of skill early on.
- Text-heavy end screen in dense Bangla; it's great if you read Bangla, opaque otherwise.
- Constant meme audio could tire quickly.

## Ideas for Ghar Jabo
1. **Steal the newspaper-with-your-photo end screen** for the trip receipt. Capture a canvas frame at the worst moment (bike-taxi cancel, footboard hang, flood splash) and drop it on a **"Sector V Samachar" / "দৈনিক জ্যাম" front page**. Add a burst label ("ধপাস!", "CANCEL!") and a stamp (মোট দেরি ৪৭ মিনিট).
2. **"এই টাকায় হতো" box**: "your Rapi-Nah surge could have bought 3 plates of Sector V momo / 0.002% of the Webel flyover budget".
3. **A victim or witness quote from the run**: "'Ami toh bolechhilam auto-te jao.' — Ma", or "'Ride cancel korini, network chhilo na.' — Rapi-Nah captain".
4. **A ticker with hyper-local Kolkata satire** next to run events: "Sector V e jol: residents rename it Sector Venice", "Green Line extended, crowd extended further", "Bike-taxi app launches 'Cancel Pro' feature".
5. **Meme-style voice reactions** (Kolkata Bangla: "Ki korchhen dada!", "Pichhone egiye jaan!", "Bhai, ektu chepe daran", "Khela hobe" for the bus scramble). One clip per event, 1–3 s each.
6. Their "bus = death" joke maps to our **bus footboard**: falling off is the fail, with a "মায়ের দোয়া"-style slogan gag (Kolkata buses carry "Maa Tara", "Joy Baba Loknath" and the like).
7. Make the first run last longer than theirs: a 2-minute target with checkpoints, so players see the city before the receipt.
