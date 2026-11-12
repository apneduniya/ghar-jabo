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
  /**
   * Adaptive draw distance: shrink when a frame passes `high` draw calls, grow back under `low` (budget 60). At
   * night it stops at `minNight` (a short night view is a flat wall of fog: AUDIT.md issue 1) unless a frame passes
   * `hard`, close to the budget; then it may go on down to `min`, as by day.
   */
  adapt: { high: 50, hard: 56, low: 42, down: 0.06, up: 0.003, min: 0.55, minNight: 0.8 },
  /** Fog far (units) inside Sector V and per area beyond it; chunks past the fog are hidden. */
  fogFar: { sectorv: 340, saltlake: 340, old: 320, generic: 330 },
  /** Fog near as a share of fog far: the haze starts half way out. */
  fogNear: 0.55,
  /** Over this many units outside the Sector V square, the fog has fully become the area's. */
  fogBlend: 200,
  /** Hide the whole Sector V map once the player is this far outside its square (a plain ground stands in). */
  hideSectorV: 150,
};

/** Streamed traffic beside structures (sim/gen/lanes.ts, task 022). */
export const LANE_ROOM = {
  /** Half a bus: the lane test's clearance. */
  busHalf: 1.25,
  /** Lanes may move out round a structure until a bus hangs this far past the carriageway edge (the kerb strip). */
  overKerb: 0.4,
};

/** How vehicles hold their lane and turn (sim/traffic.ts, task 023). */
export const DRIVE = {
  /** Half the window a vehicle's path is averaged over: corners and lane changes become curves this long. */
  round: 3,
  /** Buses: their whole route is pre-smoothed with `round`; this rounds what's left of each 1 u step. */
  busRound: 1,
  /** How far ahead (units) a driver looks for the next bend, and the speed it takes a right-angle bend at. */
  bendLook: 7,
  bendSpeed: 4.5,
  /** Bikes ride this share of the road width left of the centre line (cars 0.28): they filter past on the kerb side. */
  bikeLane: 0.4,
  /** Bikes and cars side by side may overlap this much before they count as in each other's way. */
  squeeze: 0.12,
  /** A bus line route may stray this far from the drawn bus line before it costs more. */
  busTol: 6,
  /** Following: look this many seconds of travel past followGap; stop this far behind; close up this fast per unit of gap. */
  lookSecs: 0.6,
  stopGap: 0.8,
  closeRate: 1.5,
  /** How hard drivers brake (per second, against 2.5 to speed up). */
  brakeRate: 6,
};

/** Thumb stick, turning and the follow camera (task 024). */
export const CONTROLS = {
  /** Share of the rim radius that reads as no input. */
  deadZone: 0.1,
  /** Response past the dead zone: out = t^curve (1 = linear; above 1 = finer control near the centre). */
  curve: 1.5,
  /** The knob's travel as a share of the stick's size; the base never moves, the knob stops at this rim. */
  rim: 0.4,
  /** Where a thumb may start the stick: left of this share of the width, below this share of the height. */
  stickZone: [0.55, 0.3] as [number, number],
  /** Divider collision: median pieces every this many units (finer than the drawn ones, so no holes at bends). */
  medianStep: 1.5,
  /** How fast the character turns to face where it's going (1/s, exponential). */
  turnRate: 14,
  /** Look (task 027, input/look.ts): a drag that starts right of this share of the width turns the camera. */
  lookZone: 0.5,
  /** Degrees turned for a drag the length of the screen's short side (so phones and tablets, portrait and
   * landscape, turn alike for the same share of the screen). Sideways is yaw, up/down is pitch (slower). */
  lookYaw: 200,
  lookPitch: 110,
  /** Look smoothing time constant (s): the camera catches up with the thumb over a few frames, no fling. */
  lookSmooth: 0.05,
  /** Pitch limits (radians): below 0 looks down from higher up, above 0 looks up from lower down. */
  pitchRange: [-0.55, 0.45] as [number, number],
  /** Keyboard look (J/L) speed, radians/s. */
  keyTurn: 2.2,
  /** Riding: seconds after the last look drag before the camera eases back behind the vehicle, and how fast (1/s). */
  rideLookHold: 3,
  rideFollow: 2.5,
  /** The camera orbits a point this high over the player; looking up lifts its gaze by this much per radian. */
  camPivot: 1.6,
  camLift: 14,
  /** Running within this angle (radians) of a road's direction runs exactly along it. */
  roadSnap: 0.35,
  /** Only roads this close (units from their carriageway edge) guide you. */
  roadNear: 6,
};

/** How people walk and run (task 025, render/rig.ts gait()). Angles in radians, speeds in units/s. */
export const GAIT = {
  /** Thigh swing either side of straight: base + perSpeed × speed, capped at maxSwing. */
  swingBase: 0.22,
  swingPerSpeed: 0.13,
  maxSwing: 0.75,
  /** Below this speed the swing fades out (standing still means standing). */
  fadeBelow: 0.4,
  /** A walk up to walkMax, a full run from runFrom: the run leans in, bends the elbows and adds flight. */
  walkMax: 2.6,
  runFrom: 4.5,
  /** Extra stride from both feet leaving the ground at a full run (share of the walking stride). */
  flight: 0.9,
  /** Forward lean walking and at a full run. */
  lean: [0.04, 0.22] as [number, number],
  /** Leg swing (radians) from which elbows start to bend like a runner's. */
  elbowFrom: 0.5,
  /** Turning on the spot: shuffle speed per radian/s of turning. */
  turnShuffle: 0.5,
  /** Landing squash: how long (s) and how deep (0..1). */
  landSecs: 0.22,
  landSquash: 0.6,
};

/** Pedestrian pace and pauses (task 025, sim/crowd.ts). */
export const CROWD = {
  /** Walking speeds, units/s (a figure is 1.77 units tall, so these read as 1.1 to 1.9 m/s for a person). */
  speed: [1.1, 1.9] as [number, number],
  /** Some in a hurry. */
  hurryShare: 0.12,
  hurrySpeed: [2.2, 2.8] as [number, number],
  /** Seconds walked between pauses, and how long a pause lasts. */
  walkFor: [7, 22] as [number, number],
  pauseFor: [2, 6] as [number, number],
  /** How fast a walker gets up to speed or stops (1/s). */
  accel: 3,
};
