// Sound clips shipped in public/sounds/ (copied or re-cut from research/sounds/shippable/, see SOUNDS.md),
// with their gains, licences and credits, plus the ambience tuning for the Sector V map.

export type Licence = 'CC0' | 'CC BY 4.0' | 'PD Mark 1.0';

export interface Clip {
  file: string;
  /** Playback gain before the master volume. */
  gain: number;
  /** Looping bed (re-cut with a crossfade so the seam is inaudible) or a one-shot. */
  loop: boolean;
  licence: Licence;
  credit: string;
  source: string;
}

export const clips = {
  traffic: {
    file: 'traffic-horns-loop.mp3', gain: 1, loop: true, licence: 'CC0',
    credit: '"India, street, traffic, horns, voices, Calcutta, 10" by TRP', source: 'https://freesound.org/s/576484/',
  },
  crows: {
    file: 'crows-loop.mp3', gain: 0.35, loop: true, licence: 'CC0',
    credit: '"Crows of Calcutta" by Calcuttan', source: 'https://freesound.org/s/249567/',
  },
  rain: {
    file: 'rain-roof-loop.mp3', gain: 0.9, loop: true, licence: 'CC0',
    credit: '"Rain On Fiber Roof at Night" by Sagnik_Basu', source: 'https://freesound.org/s/398581/',
  },
  busHorn: {
    file: 'bus-horn-musical.mp3', gain: 0.7, loop: false, licence: 'CC0',
    credit: '"-03 SE 4CH ATMO BUS sleeper melodic funny horn" by SoundEnsemble', source: 'https://freesound.org/s/508540/',
  },
  shankh: {
    file: 'shankh-conch-dusk.mp3', gain: 0.8, loop: false, licence: 'CC0',
    credit: '"Shankh Sound" by rsn267', source: 'https://freesound.org/s/746592/',
  },
  dhaak: {
    file: 'dhaak-durga-puja.mp3', gain: 0.9, loop: false, licence: 'CC BY 4.0',
    credit: '"Dhaak beats from Kolkata - Durga Puja" by AnneshaGhosh, trimmed', source: 'https://freesound.org/s/592301/',
  },
  hawker: {
    file: 'hawker-call-kolkata.mp3', gain: 0.6, loop: false, licence: 'CC BY 4.0',
    credit: '"Kolkata hawker call" by rain+, trimmed', source: 'https://freesound.org/s/608765/',
  },
  hawkerFish: {
    file: 'hawker-fish-talapia.mp3', gain: 0.6, loop: false, licence: 'CC BY 4.0',
    credit: '"fish hawker in Kolkata" by rain+, trimmed', source: 'https://freesound.org/s/548482/',
  },
  // Placeholders for voice lines until Adarsh's recordings exist (content/voice.ts fallbacks).
  conductorSealdah: {
    file: 'conductor-sealdah-x3-proto.mp3', gain: 0.8, loop: false, licence: 'CC0',
    credit: '"Sealdah" spoken in Bangla by Titodutta, sped up and looped three times',
    source: 'https://commons.wikimedia.org/wiki/File:LL-Q9610_(ben)-Titodutta-%E0%A6%B6%E0%A6%BF%E0%A6%AF%E0%A6%BC%E0%A6%BE%E0%A6%B2%E0%A6%A6%E0%A6%B9.wav',
  },
  wordSealdah: {
    file: 'word-sealdah.mp3', gain: 0.8, loop: false, licence: 'CC0',
    credit: '"Sealdah" spoken in Bangla by Titodutta',
    source: 'https://commons.wikimedia.org/wiki/File:LL-Q9610_(ben)-Titodutta-%E0%A6%B6%E0%A6%BF%E0%A6%AF%E0%A6%BC%E0%A6%BE%E0%A6%B2%E0%A6%A6%E0%A6%B9.wav',
  },
} satisfies Record<string, Clip>;

export type ClipId = keyof typeof clips;

/** Load order after the first tap: the shankh plays on that very tap, then the beds, then the rest (voice placeholders last). */
export const loadOrder: ClipId[] = ['shankh', 'traffic', 'crows', 'busHorn', 'rain', 'hawker', 'hawkerFish', 'dhaak', 'conductorSealdah', 'wordSealdah'];

export const ambience = {
  /** Traffic horn bed gain at jam 0 and jam 1 (see Run.jam). */
  hornMin: 0.12,
  hornMax: 0.6,
  /** Crow bed gain: constant, faint. */
  crows: 0.5,
  /** Rain is full inside a flood's radius and fades out over this many world units beyond it. */
  rainFade: 45,
  rainMax: 0.7,
  /** The café strip (food stalls by the burger joint, map POI `burger`): hawkers call here now and then. */
  cafe: { x: 68.9, z: 44.2, r: 55 },
  hawkerGapMin: 14,
  hawkerGapMax: 30,
  /** Seconds for bed gain changes to settle (WebAudio setTargetAtTime constant). */
  smooth: 0.6,
};
