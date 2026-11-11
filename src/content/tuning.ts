// Every gameplay number in one place. Units: world units (1 unit = 2 m on the real map), seconds.

export const T = {
  step: 1 / 60, // fixed simulation step

  player: {
    runSpeed: 6.5,
    accelGround: 12,
    accelAir: 3,
    jumpSpeed: 7,
    gravity: 20,
    radius: 0.35,
    knockdownSecs: 1.3,
    floodSlow: 0.45,
  },

  traffic: {
    window: 140, // vehicles exist within this distance of the player
    baseCount: 18,
    jamExtra: 16, // more vehicles at peak jam
    laneOffset: 0.28, // fraction of road width from the centre line to a lane (keep left)
    pierClear: 1.65, // half a bus plus a margin, beside a pier in the middle of the road
    medianPier: 1.6, // a pier this close to a road's centre line stands in its median: lanes move out around it
    openRoad: 1.3, // speed factor beyond the Sector V square
    followGap: 1.6,
    spawnEvery: [0.25, 0.6] as [number, number],
    /** Share of each kind when spawning (buses come from their route, not from here). */
    mix: { taxi: 0.3, car: 0.32, auto: 0.18, toto: 0.06, bike: 0.14 },
    speed: { taxi: [10, 13], car: [11, 14], auto: [7, 9], toto: [4.5, 6], bike: [12, 15], bus: [11, 14] } as Record<string, [number, number]>,
    jamSlow: { taxi: 0.85, car: 0.85, auto: 0.7, toto: 0.5, bike: 0.45, bus: 0.28 } as Record<string, number>,
    hitSpeed: 3.5, // faster than this knocks you down
  },

  bus: {
    every: 9, // seconds between buses entering the route, each direction
    stopSlow: 2.5, // speed near a stop (they never fully stop)
    stopRadius: 9,
    maxHopSpeed: 11,
    crowdedBounce: 0.5, // chance a full bus throws you off
    depotChance: 0.4,
    sway: [0.8, 0.35] as [number, number],
    unstable: 1.5,
    control: 3.2,
    damping: 0.96,
    bumpEvery: [2.5, 4.5] as [number, number],
    bumpKick: 1.6,
    honkFor: 1.5, // seconds a slow vehicle hurries along after a bus honks behind it
    maxPerDir: 4, // buses per direction within the traffic window
    minStopGap: 70, // beyond Sector V the bus slows for one real stop per this many units of route
  },

  rapinah: {
    baseFare: 49,
    rebookAdd: 12,
    surgeAtPeak: 0.8,
    findSecs: [1.8, 3.2] as [number, number],
    plans: { come: 0.55, pass: 0.25, wrong: 0.2 },
    spawnAhead: 95,
    waitSecs: 9,
    ditchChance: 0.35,
  },

  metro: { fare: 20 },

  /** Free roam: game minutes per real second (the streamed world is true scale, so it runs on its own rate). */
  // Free roam is true scale (a bus to Sealdah takes ~8 real minutes): 1 game minute every 5 real seconds keeps
  // a trip to about an evening instead of a whole night.
  clock: { free: 0.2 },
};

/** One storey in world units (see tools/map/geo.py FLOOR_U). Taller than a person (1.75), on halved footprints. */
export const FLOOR_U = 2.4;
/** Ground-floor shop height: a little taller than an upper floor. */
export const SHOP_U = 3.0;

/** Streamed-world rendering (render/world/chunks.ts, task 020). */
export const CHUNK_VIEW = {
  /** Meshing time per frame, ms: chunks are built a slice at a time, nearest first. */
  budgetMs: 4,
  /** Adaptive draw distance: shrink when a frame passes `high` draw calls, grow back under `low` (budget 60). */
  adapt: { high: 50, low: 42, down: 0.06, up: 0.003, min: 0.55 },
  /** Fog far (units) inside Sector V and per area beyond it; chunks past the fog are hidden. */
  fogFar: { sectorv: 340, saltlake: 290, old: 230, generic: 260 },
  /** Fog near as a share of fog far. */
  fogNear: 0.36,
  /** Over this many units outside the Sector V square, the fog has fully become the area's. */
  fogBlend: 200,
  /** Hide the whole Sector V map beyond this distance from its origin. */
  hideSectorV: 600,
};

/** Streamed traffic beside structures (sim/gen/lanes.ts, task 022). */
export const LANE_ROOM = {
  /** Half a bus: the lane test's clearance. */
  busHalf: 1.25,
  /** Lanes may move out round a structure until a bus hangs this far past the carriageway edge (the kerb strip). */
  overKerb: 0.4,
};

/** Thumb stick, turning and the follow camera (task 024). */
export const CONTROLS = {
  /** Share of the rim radius that reads as no input. */
  deadZone: 0.1,
  /** Response past the dead zone: out = t^curve (1 = linear; above 1 = finer control near the centre). */
  curve: 1.5,
  /** The knob's travel as a share of the stick's size; drag past it and the base follows the thumb. */
  rim: 0.4,
  /** Where a thumb may start the stick: left of this share of the width, below this share of the height. */
  stickZone: [0.55, 0.3] as [number, number],
  /** Divider collision: median pieces every this many units (finer than the drawn ones, so no holes at bends). */
  medianStep: 1.5,
  /** How fast the character turns to face where it's going (1/s, exponential). */
  turnRate: 14,
  /**
   * While the thumb holds still, the stick keeps the camera frame it had when the thumb went down, so the
   * camera can swing round behind you without changing where you run. When the thumb turns, that frame
   * catches up with the camera by this many radians per radian turned (sim/player.ts StickFrame).
   */
  reframe: 1,
  /** Camera recentring behind the run direction (1/s) at full strength. */
  camFollow: 1.6,
  /** Forwardness (cos of the stick angle from screen-up): no recentring at or below `[0]` (running back at the
   * camera), full strength from `[1]`, a straight ramp between. */
  camForward: [-0.3, 0.5] as [number, number],
  /** Seconds a direction must be held before the camera starts to recentre. */
  camDelay: 0.35,
  /** Running within this angle (radians) of a road's direction runs exactly along it, and the camera lines up. */
  roadSnap: 0.35,
  /** Only roads this close (units from their carriageway edge) guide you. */
  roadNear: 6,
};
