// Every joke line in one place. Bangla is romanised, mixed with Hindi and English the way
// Sector V actually talks, and every line should read fine without knowing Bangla.

import type { EndingId, Run } from '../sim/run';
import { rng } from '../sim/rng';

export const pick = <T>(xs: readonly T[]): T => rng.pick(xs);

/** Title screen copy. */
export const titleCopy = {
  premise: '6:30 PM, Salt Lake Sector V. <b>Get home to Sealdah.</b> Everything will go wrong.',
  timed: { name: 'BEFORE 10:30', line: 'Home by 10:30 PM · 4 min' },
  free: { name: 'FREE ROAM', line: 'No deadline. Real distances, endless city.' },
  howto: [
    ['🚌', 'Hop buses', 'Catch them moving'],
    ['📱', 'Rapi-Nah', 'It will cancel'],
    ['🚇', 'Metro', 'Wipro More'],
  ],
  diaryTitle: 'Free-roam diary',
  diaryEmpty: 'No arrivals yet. Ma is still waiting.',
  rotate: 'Turn sideways: wider street, more buses in view',
  credit: 'Real streets from OpenStreetMap',
  challenge: 'Challenge run: same evening, same traffic as your friend. Beat their time.',
};

/** Newspaper kicker line above the headline, per mode. */
export const editionLine = { timed: 'Before-10:30 edition', free: 'Free roam · Night edition' };

export const loadingTips = [
  'Karunamoyee is not a stop. It is a feeling.',
  'Rain at 6 PM is a feature, not a bug.',
  'Tip: the bus never stops. It only slows down emotionally.',
  'Sector V has 14.6 million sq ft of offices and 3 auto drivers.',
  'Pro tip: "2 min away" is a unit of hope, not time.',
];

export const familyChat = [
  { who: 'Ma', text: 'Kothay achhis? Ghore fir taratari.' },
  { who: 'Baba', text: 'Forwarded: Hot water before travel reduces traffic stress. Share to 10 groups.' },
  { who: 'Didi', text: 'Asar shomoy biryani anbi? 🙏' },
  { who: 'Ma', text: 'Rasta-e kichhu khabi na. Ghore ruti kora ache.' },
];

export const cancelReasons = [
  'Bhai, Sector V mein jam hai',
  'Captain ka khana time hai',
  'Network chhilo na',
  'Captain went to the wrong Wipro More',
  'Petrol khatam, dada',
  'Captain says Sealdah is too far, emotionally',
  'Rain aasche, captain ghore jachhe',
];

export const captainNames = ['Bablu', 'Raju', 'Pintu', 'Sonu', 'Bapi', 'Tublu', 'Chhotu'];

export const momLines = [
  'Kokhon ashbi?',
  'Bhaat thanda hoye jachhe!',
  'Phone dhorchhis na keno?',
  'Uber ta book kor na!',
  'Pashe barir chhele 7 tar modhye chole eshechhe.',
];

export const rivals = {
  dada: { name: 'Umbrella Dada', short: 'DADA' },
  didi: { name: 'IT-wali Didi', short: 'DIDI' },
};

/** Live ticker lines. {n} is replaced with a counter where it makes sense. */
export const ticker = {
  start: [
    'Sector V offices release 2 lakh people at exactly the same moment, again',
    'Weather: humid, with a 90% chance of "where is my bus"',
  ],
  jam: [
    'Bypass traffic moved 2 metres. Residents celebrate.',
    'College More signal stays red for a full IPL innings',
    'Auto queue at Wipro More now visible from space',
    'Traffic police whistle reaches new octave',
  ],
  cancel: [
    'Rapi-Nah launches "Cancel Pro": cancel rides before you even book',
    'Rapi-Nah ETA stuck at "2 min" for {n}th straight minute, scientists baffled',
    'Captain spotted eating jhalmuri 40 metres from pickup point',
  ],
  bus: [
    'Bus footboard capacity reaches 140%. Margin of error: ±100%',
    'Conductor shouts "Sealdah-Sealdah" 4,000 times, sets personal best',
    'Bus driver races another bus, both claim victory',
  ],
  metro: [
    'Green Line extended. Crowd extended further.',
    'Escalator "stand right, walk left" sign read by 1 person today',
    'Man finds empty seat, refuses to believe it',
  ],
  fall: [
    'Student exits bus "in the fastest way possible", says witness',
    'Footboard reports loss of 1 passenger, gains 3 more',
  ],
};

export function fill(s: string, n: number) { return s.replace('{n}', String(n)); }


export const greenLine = ['Sector V', 'Karunamoyee', 'Central Park', 'City Centre', 'Bengal Chemical', 'Salt Lake Stadium', 'Phoolbagan', 'Sealdah'];

// The newspaper.

export const endingTitles: Record<EndingId, string> = {
  'home-early': 'SECTOR V SURVIVOR',
  home: 'GHORE FIRLAM',
  'home-late': 'BHAAT THANDA',
  'home-next-day': 'PORER DIN',
  'rapinah-miracle': 'RAPI-NAH MIRACLE',
  'howrah-express': 'HOWRAH EXPRESS',
  'still-sector-v': 'STILL IN SECTOR V',
  'walked-home': 'PAAYE HENTE',
};

export function headline(run: Run): string {
  const s = run.stats;
  switch (run.ending) {
    case 'rapinah-miracle':
      return s.cancels > 0
        ? `Rapi-Nah captain actually arrives after ${s.cancels} cancellations; experts demand investigation`
        : 'Rapi-Nah captain arrives on first try; nation in shock';
    case 'howrah-express':
      return 'Student finds seat, falls asleep, wakes up at Howrah Maidan';
    case 'still-sector-v':
      return s.cancels >= 3
        ? `Student survives ${s.cancels} Rapi-Nah cancellations, still in Sector V at 10:30 PM`
        : 'Student declared permanent resident of Sector V';
    case 'home-next-day':
      return `Student leaves Sector V at 6:30 PM, reaches home on Day ${run.day}; Ma has filed a missing report`;
    case 'walked-home':
      return run.money < 20
        ? 'Student runs out of money, walks to Sealdah, calls it "cardio"'
        : `Student walks all the way to Sealdah with ₹${run.money} in pocket; buses "too full", says student`;
    default:
      if (s.falls >= 2) return `Student falls off bus ${s.falls} times, reaches home anyway`;
      if (s.busHops >= 3) return `Student changes ${s.busHops} buses in one evening, calls it "a system"`;
      if (s.ditched >= 1) return 'Rapi-Nah captain drops student "wherever he felt like"; student walks rest of the way';
      if (s.taxiHits >= 2) return `Student bumped by ${s.taxiHits} vehicles, insists "ami thik achhi"`;
      if (s.footboardStops >= 3) return `Commuter hangs off footboard for ${s.footboardStops} stops, calls it "cardio"`;
      if (s.cancels >= 3) return `Student survives ${s.cancels} Rapi-Nah cancellations, captain cites "jam at Webel"`;
      if (s.missedTrains >= 2) return `Student misses ${s.missedTrains} trains, catches one out of spite`;
      if (run.ending === 'home-early') return 'Student reaches home before 9 PM; neighbours suspect time travel';
      if (run.ending === 'home-late') return 'Student reaches home; bhaat now officially thanda';
      return 'Student reaches home from Sector V; family unsure how';
  }
}

export function quote(run: Run): { text: string; who: string } {
  const s = run.stats;
  if (run.ending === 'howrah-express') return { text: 'Ami toh bolechhilam ghumobi na.', who: 'Ma' };
  if (run.ending === 'home-next-day') return { text: 'Kal raatre kothay chhili?', who: 'Ma' };
  if (s.cancels >= 2) return { text: `${pick(cancelReasons)}.`, who: 'Rapi-Nah captain' };
  if (s.falls >= 1) return { text: 'Pichhone egiye jete bolechhilam. Shoneni.', who: 'Bus conductor' };
  if (s.momMissed >= 3) return { text: `${s.momMissed} baar phone korechhi. ${s.momMissed}!`, who: 'Ma' };
  if (s.taxiHits >= 1) return { text: 'Zebra crossing? Sheta abar ki?', who: 'Yellow taxi driver' };
  if (s.gaveSeat) return { text: 'Eto bhalo chhele aajkal dekha jay na.', who: 'Mashima' };
  return { text: 'Ami toh bolechhilam metro-te jao.', who: 'Ma' };
}

/** "Ei takay hoto": what the money spent could have bought. */
export function eiTakay(spent: number): string {
  if (spent <= 0) return 'You spent nothing. Economists are confused.';
  const momo = Math.floor(spent / 60);
  const chai = Math.floor(spent / 10);
  if (momo >= 1) return `₹${spent} = ${momo} plate${momo > 1 ? 's' : ''} of Sector V momo, or ${chai} bhaarer cha.`;
  return `₹${spent} = ${chai} bhaarer cha. Or 0.0001% of one flyover.`;
}

export function rankTitle(run: Run): string {
  if (run.ending === 'still-sector-v') return 'Sector V Resident';
  if (run.ending === 'howrah-express') return 'Howrah Explorer';
  if (run.ending === 'home-next-day') return 'Night Owl of Sector V';
  if (run.stats.footboardStops >= 3) return 'Footboard Pro';
  if (run.ending === 'home-early') return 'Sector V Survivor';
  return 'Daily Passenger';
}

/** University standees along the TIU railing (SOUTH survey §1: "Keynote Speaker", "Tutorial session"). */
export const standees = ['KEYNOTE SPEAKER · AI FOR CHAI', 'TUTORIAL SESSION · ROOM 404', 'ADMISSIONS OPEN 2026', 'TECH FEST · HACK THE BUS'];

/** Parody ad boards at surveyed spots: [brand, punchline, background, text colour]. */
export const streetAds = {
  island: ['JATRI SATHI-ISH', 'Fair ride. Fair price. Fair chance.', '#f2c230', '#1b1b1b'],
  st13: ['MISHTI MOBILE', 'Unlimited data, limited signal in Sector V', '#e2402c', '#ffffff'],
  shelter: ['SHUBHO DIWALI SALE', 'Everything 50% off. Except the bus fare.', '#8e2a6b', '#ffe680'],
  booth: ['IEM-ISH PUBLIC SCHOOL', 'Admission open. Seats: fewer than on the bus.', '#3b3f9a', '#ffffff'],
  kiosk: ['DRIVE SLOW', 'Your family is waiting. So is the signal.', '#1f5f9a', '#ffffff'],
} as const;

/** Signs on the elevated north (parody brands only). */
export const northSigns = {
  gantry: '← NEWTOWN  ·  WELCOME TO NABADIGANTA',
  sectorV: 'SALT LAKE SECTOR V',
  sectorVBn: 'সল্টলেক সেক্টর V · SALT LAKE SECTOR V',
  bank: 'BANDH-ON BANK',
  bankLine: 'Open every day except bandh days',
  itCentre: 'आईटी सेंटर · IT CENTRE',
  itCentreBn: 'আইটি সেন্টার',
  /** The navy name board on Gate A's pillar, in three scripts. */
  gateA: ['সল্টলেক সেক্টর V', 'सॉल्ट लेक सेक्टर V', 'SALT LAKE SECTOR V'],
  /** The yellow plate on Gate B's stone base by the ramp (gbz_h195). */
  dropOff: ['DROP OFF POINT', 'FOR DIVYANG'],
};

/** Dead ends in the timed run (side streets that don't go to Sealdah). Situations, never communities. */
export const deadEnds = [
  'GOLI SHESH. Sealdah is the other way, dada.',
  'Road closed for "work". Work started 2019.',
  'Knee-deep water. The drain is somewhere under there.',
  'Para football match in progress. Do not interrupt.',
  'Wedding pandal across the lane. You are not invited.',
  'Puja committee meeting. Lane requisitioned till Kali Puja.',
  'A cow has claimed this lane. The cow is not moving.',
  'Pipe-laying. The pipe is laid. The road is not.',
  'Private lane. Says the uncle in the vest.',
  'Carrom tournament, quarter-finals. Go round.',
  'Water-logged since Tuesday. It is not Tuesday.',
  'Lane ends in a wall. The wall has a sweet shop in it.',
] as const;

/** Arriving at the Sealdah forecourt in the streamed world. */
export const arriveLine = { title: 'SEALDAH!', line: 'The forecourt. Somewhere in there is your train home.' };

/** Banner when a newer build is served than the one this tab is running (app/update.ts). */
export const NEW_VERSION = 'Notun version esheche · tap to reload';
