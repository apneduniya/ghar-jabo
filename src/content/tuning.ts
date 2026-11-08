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
    followGap: 1.6,
    spawnEvery: [0.25, 0.6] as [number, number],
    /** Share of each kind when spawning (buses come from their route, not from here). */
    mix: { taxi: 0.3, car: 0.32, auto: 0.18, toto: 0.06, bike: 0.14 },
    speed: { taxi: [10, 13], car: [11, 14], auto: [7, 9], toto: [4.5, 6], bike: [12, 15], bus: [11, 14] } as Record<string, [number, number]>,
    jamSlow: { taxi: 0.85, car: 0.85, auto: 0.7, toto: 0.5, bike: 0.45, bus: 0.4 } as Record<string, number>,
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
};
