// Voice lines Adarsh records (task 034; the recording script is docs/VOICE.md). Each line has its words in Bangla
// script, romanised and in English, where it plays, how long the take should be, and what the player gets until
// the recording exists. A recording is `public/sounds/voice/<id>.mp3`, listed in `public/sounds/voice/index.json`;
// it is fetched after the first tap, never bundled.

import type { ClipId } from './sounds';

/** Synth sounds a line can fall back to (src/audio/audio.ts `sfx`). */
export type VoiceSfx = 'chime' | 'doorBeep' | 'ring' | 'ting';

/**
 * What plays while there is no recording:
 * - `clip`: a shipped clip from public/sounds/ (content/sounds.ts),
 * - `sfx`: a synth sound (the call site then plays `voice(id)` instead of that sfx, never both),
 * - `text`: nothing extra: the toast or notification at the call site already carries the words.
 */
export type VoiceFallback = { kind: 'clip'; clip: ClipId } | { kind: 'sfx'; sfx: VoiceSfx } | { kind: 'text' };

/** Who hears it where: the street and bus (sim/world.ts events), the metro station (stages/station.ts), the phone. */
export type VoiceSite = 'street' | 'bus' | 'rapinah' | 'station' | 'phone';

export interface VoiceLine {
  site: VoiceSite;
  /** The exact moment it plays (and the file that triggers it). */
  plays: string;
  /** Who is speaking, for the recording script. */
  who: string;
  bn: string;
  roman: string;
  en: string;
  /** Target take length in seconds (the lead trims to this, ±0.5 s). */
  secs: number;
  fallback: VoiceFallback;
  /** Duck the traffic, crow and rain beds while it plays (off for the hawkers, who are part of the street). */
  duck: boolean;
  /** Seconds after the trigger, so it doesn't land on top of a sound effect (e.g. the bus horn). */
  delay?: number;
}

export const voices = {
  // --- Bus conductor (sim/world.ts) -------------------------------------------------------------------------
  'bus-sealdah': {
    site: 'bus', plays: 'Hopping onto a bus bound for Sealdah (World.hopOn)', who: 'Conductor, on the footboard',
    bn: 'শিয়ালদা-শিয়ালদা-শিয়ালদা! উঠে পড়ুন, উঠে পড়ুন!',
    roman: 'Shiyalda-Shiyalda-Shiyalda! Uthe porun, uthe porun!',
    en: 'Sealdah, Sealdah, Sealdah! Get on, get on!',
    secs: 2.5, fallback: { kind: 'clip', clip: 'conductorSealdah' }, duck: true, delay: 0.6,
  },
  'bus-wrong-way': {
    site: 'bus', plays: 'Hopping onto a bus going back into Sector V (World.hopOn)', who: 'Conductor',
    bn: 'কলেজ মোড়! কলেজ মোড়! কলেজ মোড়!',
    roman: 'College More! College More! College More!',
    en: 'College More! (Wrong way: this bus is going back into Sector V.)',
    secs: 2, fallback: { kind: 'text' }, duck: true, delay: 0.6,
  },
  'bus-depot-warning': {
    site: 'bus', plays: 'Hopping onto a bus that will stop at its depot halfway (World.hopOn)', who: 'Conductor',
    bn: 'করুণাময়ী অবধি! করুণাময়ী অবধি যাবে!',
    roman: 'Karunamoyee obdhi! Karunamoyee obdhi jabe!',
    en: 'Only as far as Karunamoyee! This one only goes to Karunamoyee!',
    secs: 2, fallback: { kind: 'text' }, duck: true, delay: 0.6,
  },
  'bus-full': {
    site: 'bus', plays: 'Bounced off a packed footboard (World.hopOn, "JAYGA NEI!")', who: 'Conductor, irritated',
    bn: 'পিছনে এগিয়ে যান! পিছনে এগিয়ে যান, দাদা!',
    roman: 'Pichhone egiye jaan! Pichhone egiye jaan, dada!',
    en: 'Move up to the back! Move up to the back, brother! (There is no back.)',
    secs: 2, fallback: { kind: 'text' }, duck: true,
  },
  'bus-depot': {
    site: 'bus', plays: 'The bus reaches its depot and everyone is put off (World.stepHang, "DEPOT!")', who: 'Conductor',
    bn: 'আর যাবে না! সবাই নামুন! নামুন, নামুন!',
    roman: 'Ar jabe na! Sobai namun! Namun, namun!',
    en: 'Not going any further! Everyone off! Off, off!',
    secs: 2, fallback: { kind: 'text' }, duck: true,
  },
  'bus-last-stop': {
    site: 'bus', plays: 'A wrong-way bus ends its run at College More (World.stepHang)', who: 'Conductor, bored',
    bn: 'লাস্ট স্টপ! নামুন, নামুন! গাড়ি ঘুরবে!',
    roman: 'Last stop! Namun, namun! Gari ghurbe!',
    en: 'Last stop! Off, off! The bus is turning round!',
    secs: 2, fallback: { kind: 'text' }, duck: true,
  },
  'bus-arrive-sealdah': {
    site: 'bus', plays: 'Arriving at Sealdah on a bus (World.arrive, mode bus)', who: 'Conductor, triumphant',
    bn: 'শিয়ালদা! শিয়ালদা! নামুন, তাড়াতাড়ি নামুন!',
    roman: 'Shiyalda! Shiyalda! Namun, taratari namun!',
    en: 'Sealdah! Sealdah! Off you get, quickly!',
    secs: 2.5, fallback: { kind: 'clip', clip: 'wordSealdah' }, duck: true,
  },

  // --- Rapi-Nah captain (sim/world.ts) ----------------------------------------------------------------------
  'captain-arrived': {
    site: 'rapinah', plays: 'The Rapi-Nah captain pulls up (World.stepRapinah, "Captain … has arrived")',
    who: 'Bike captain, on the phone, helmet half on',
    bn: 'দাদা, কোথায় আপনি? আমি একদম গেটের সামনে দাঁড়িয়ে আছি।',
    roman: 'Dada, kothay apni? Ami ekdom gate-er samne dnariye achhi.',
    en: 'Dada, where are you? I am standing right in front of the gate. (Which gate? He will not say.)',
    secs: 3, fallback: { kind: 'text' }, duck: true,
  },
  'captain-ditch': {
    site: 'rapinah', plays: 'The captain ends the ride halfway (World.stepPillion, "RIDE ENDED")', who: 'Bike captain',
    bn: 'দাদা, এখানেই নামুন। আমি আর যাব না।',
    roman: 'Dada, ekhanei namun. Ami ar jabo na.',
    en: 'Dada, get off right here. I am not going any further.',
    secs: 2, fallback: { kind: 'text' }, duck: true,
  },

  // --- Hawkers on the café strip (audio/ambience.ts) --------------------------------------------------------
  'hawker-jhalmuri': {
    site: 'street', plays: 'Now and then near the café strip food stalls (audio/ambience.ts)', who: 'Jhalmuri seller, sing-song',
    bn: 'ঝালমুড়ি! ঝাল-ঝাল ঝালমুড়ি!',
    roman: 'Jhaaal-muri! Jhaal-jhaal jhaalmuri!',
    en: 'Jhalmuri! Spicy, spicy jhalmuri!',
    secs: 2, fallback: { kind: 'clip', clip: 'hawker' }, duck: false,
  },
  'hawker-cha': {
    site: 'street', plays: 'Now and then near the café strip food stalls (audio/ambience.ts)', who: 'Tea seller, sing-song',
    bn: 'চা গরম! চা, চা, চা! গরম চা!',
    roman: 'Cha garam! Cha, cha, cha! Garam cha!',
    en: 'Hot tea! Tea, tea, tea! Hot tea!',
    secs: 2, fallback: { kind: 'clip', clip: 'hawkerFish' }, duck: false,
  },

  // --- Phone ------------------------------------------------------------------------------------------------
  'ma-ring': {
    site: 'phone', plays: 'you answer Ma\'s call (app/main.ts momCall)',
    who: 'Ma, on speaker, half worried, half furious',
    bn: 'কী রে, কখন আসবি? ভাত ঠান্ডা হয়ে যাচ্ছে!',
    roman: 'Ki re, kokhon ashbi? Bhaat thanda hoye jachhe!',
    en: 'Hey, when are you coming? The rice is going cold!',
    secs: 2.5, fallback: { kind: 'text' }, duck: true, delay: 0.5,
  },

  // --- Green Line metro (sim/station.ts, sim/stationride.ts) ---------------------
  'metro-next-sealdah': {
    site: 'station', plays: 'On the train, the stop before Sealdah ("Agla station: Sealdah"), instead of sfx.chime',
    who: 'Our own calm metro voice (a parody: do not imitate the real announcer)',
    bn: 'পরের স্টেশন শিয়ালদা। দরজা ডান দিকে খুলবে। দয়া করে কনুই সামলে রাখুন।',
    roman: 'Porer station Shiyalda. Dorja dan dike khulbe. Doya kore konui samle rakhun.',
    en: 'Next station Sealdah. Doors will open on the right. Kindly keep your elbows to yourself.',
    secs: 4, fallback: { kind: 'sfx', sfx: 'chime' }, duck: true,
  },
  'metro-next-sealdah-en': {
    site: 'station', plays: 'Straight after metro-next-sealdah on the same leg (English half of the announcement)',
    who: 'Same metro voice, in English',
    bn: '(ইংরেজিতে) দ্য নেক্সট স্টেশন ইজ শিয়ালদা। প্লিজ মাইন্ড দ্য গ্যাপ, অ্যান্ড দ্য এলবোজ।',
    roman: '(in English) The next station is Sealdah. Please mind the gap. And the elbows.',
    en: 'The next station is Sealdah. Please mind the gap. And the elbows.',
    secs: 4, fallback: { kind: 'text' }, duck: true,
  },
  'metro-doors-closing': {
    site: 'station', plays: 'Two seconds before the doors close (the "Darja bondho hochhe!" hint), instead of sfx.doorBeep',
    who: 'Metro voice, a little firmer',
    bn: 'দরজা বন্ধ হচ্ছে। দয়া করে দরজা থেকে সরে দাঁড়ান।',
    roman: 'Dorja bondho hochhe. Doya kore dorja theke sore dnaran.',
    en: 'Doors are closing. Please stand clear of the doors.',
    secs: 3, fallback: { kind: 'sfx', sfx: 'doorBeep' }, duck: true,
  },
  'metro-sealdah-arrive': {
    site: 'station', plays: 'The train stops at Sealdah and the doors open ("SEALDAH!" notification)',
    who: 'Metro voice, calm, with a tiny pause before the last word',
    bn: 'শিয়ালদা। এটাই শেষ স্টেশন। সবাই নামুন। হ্যাঁ, আপনিও।',
    roman: 'Shiyalda. Etai shesh station. Sobai namun. Hyan, apnio.',
    en: 'Sealdah. This is the last station. Everybody off. Yes, you too.',
    secs: 4, fallback: { kind: 'sfx', sfx: 'chime' }, duck: true,
  },
} satisfies Record<string, VoiceLine>;

export type VoiceId = keyof typeof voices;

/** Mixing for voice lines. */
export const VOICE = {
  /** Playback gain before the master volume (recordings are normalised to about -16 LUFS, like the clips). */
  gain: 1,
  /** The beds' level while a line plays, and how fast they dip and come back (WebAudio time constants, s). */
  duckTo: 0.3,
  duckAttack: 0.06,
  duckRelease: 0.35,
  /** Quiet gap after a line before the next may start. */
  gap: 0.25,
  /** Where the recordings live under public/, and the list of which exist (so a missing take is never fetched). */
  dir: 'sounds/voice/',
  index: 'sounds/voice/index.json',
};
