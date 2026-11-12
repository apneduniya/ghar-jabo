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
    // Speed factor beyond the Sector V square. Timed: 1.4 keeps the run winnable now that divided roads keep their
    // true spacing (029 made the squeezed bus line 2% longer). Free roam is true scale and has no deadline: 1.3.
    openRoad: 1.4,
    openRoadFree: 1.3,
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

/** The Sector V metro stage (task 033, sim/station.ts). The station runs along +x: concourse, ticket gates,
 * escalator, then the platform with the track on its -z side. Units as above, seconds. */
export const STATION = {
  /** Walls: the walkable box (on the platform, the edge at edgeZ replaces zMin). Start spot. */
  xMin: -1.5, xMax: 97, zMin: -5.6, zMax: 6.2,
  start: [1, 0.3] as [number, number],
  /** Ticket gates across the concourse: lane i is centred at gateZ0 + i × gateGap and open gateHalf each side. */
  gateX: 12, gateLanes: 6, gateZ0: -4.7, gateGap: 2, gateHalf: 0.55, gateDepth: 0.4,
  /** Share of gates that work (at least one always does). */
  gateWorks: 0.65,
  /** Seconds between "red gate" toasts while you keep walking into one. */
  gateNag: 3,
  /** Escalator: x range, its rails (z), the keep-left split (people stand on the +z side), how fast it carries you. */
  esc: [22, 34] as [number, number],
  escZ: [-1.7, 2.7] as [number, number],
  escSplit: 0.5,
  escSpeed: 3,
  /** Platform x range, the edge (the track is beyond it, -z), and the door centres along the stopped train. */
  plat: [36, 96] as [number, number],
  edgeZ: -3.6,
  doors: [44, 52, 60, 68, 76, 84],
  /** You board within doorReach of a door along x and doorEdge of the edge. */
  doorReach: 1.1,
  doorEdge: 0.9,
  /** Train: cars; it stops with car 0 centred at stopX, comes in from enterX and is gone past goneX. */
  cars: 6, carLen: 8.8, stopX: 39.6, enterX: -80, goneX: 140,
  /** Arrival speed: distance left × arriveK, between arriveMin and arriveMax units/s. Leaving speed. */
  arriveK: 1.5, arriveMin: 0.5, arriveMax: 30, leaveSpeed: 18,
  /** Seconds: first train after you reach the platform, the next after one leaves, doors open, warning before. */
  firstTrain: 4, nextTrain: 6, doorsOpen: 6, doorWarn: 2,
  /** The news ticker line this long after reaching the platform. */
  tickerAfter: 2,
  crowd: {
    /** Platform people: base + perCrowd × run.crowd. Some queue at the gates; standers every escGap on the right. */
    base: 18, perCrowd: 26, gateQueue: 6, escGap: 1.4,
    /** Bodies touch within reach; you move them push × overlap, they move you pushBack[0] + crowd × pushBack[1]. */
    reach: 0.75, push: 0.4, pushBack: [0.3, 0.4] as [number, number],
    /** While shoving: a bump this often (s), and a toast with this chance. */
    shoveEvery: 0.6, shoveToast: 0.25,
    /** Share of the platform that rushes the doors, how fast, and how fast the rest drift back to their spot. */
    boardShare: 0.6, rushSpeed: 4, homeDrift: 0.3,
  },
  ride: {
    /** Seconds between stations; Sealdah's doors stay open exitSecs. */
    legSecs: 2, exitSecs: 2.4,
    /** Chance of a seat: below seatCrowd, else. */
    seatCrowd: 0.7, seat: [0.7, 0.25] as [number, number],
    /** Drowsiness per second: base + (minutes past lateFrom) / lateDiv; each tap takes off `wake`. */
    drowsyBase: 0.12, lateFrom: 20 * 60, lateDiv: 500, wake: 0.2,
    /** Standing: a HOLD ON tap at most this many seconds before the brakes keeps you upright. */
    holdWindow: 0.6,
    /** The train's speed past the camera (which rides beside it on the platform), and where it wraps: back by
     * five cars, so the train looks continuous and the camera never leaves the platform. */
    speed: 30, wrapX: 66, wrapTo: 22,
    /** Seconds before the stage changes: arriving, falling asleep, missing Sealdah. */
    arriveDelay: 1, asleepDelay: 1.8, missDelay: 1.6,
  },
  /** Camera (stage): orbit distance back and height (portrait, landscape), kept inside this box. */
  cam: { back: [7.5, 6.5] as [number, number], high: [5.2, 4.4] as [number, number], x: [-1, 96.5] as [number, number], z: [-5.2, 7] as [number, number], yMax: 6.2 },
};
