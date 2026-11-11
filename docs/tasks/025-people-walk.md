# 025: People who walk like people (pedestrians and the player)

Goal: owner playtest (2026-11-11): "people walking doesn't look real, not even our own character; take
inspiration from other games and check how we can improve ours in the best and needed way possible."

Today (`src/render/models.ts` `person()`, `src/render/world/walkers.ts`, `src/stages/player.ts`): each person is
one rigid baked box figure that bobs up and down; limbs never move. The player turns by snapping
`rotation.y` to the velocity.

Study first (5-10 lines in a Notes section of this spec): how low-poly mobile games (e.g. Crossy Road-style,
Totally Accurate-style, GTA-mobile crowds, Townscaper/Mini Motorways people, Untitled Goose Game villagers) make
cheap people read as alive: walk cycle with leg/arm swing in opposite phase, hip sway and bob at twice the step
rate, slight forward lean when running, speed-matched stride (no foot sliding), idle breathing and look-around,
turn-in-place, varied pace and height, a run/jump/land pose for the hero, and so on. Then implement:
- **One rig, vertex-shader animated**: bake each person to one mesh with per-vertex attributes saying which part
  a vertex belongs to (torso, head, left/right upper leg, lower leg, left/right arm) and its pivot; the vertex
  shader rotates limbs by a walk phase. Pedestrians: per-instance phase, speed and stride attributes on the
  existing InstancedMeshes (draw calls stay the same as now). The player: same shader on its single mesh with
  uniforms. AGENTS.md: never one mesh per body part.
- **Better proportions and looks**: a less blocky figure (tapered limbs, shoulders, hair, shoes, a bag strap on
  the student, kurta/saree/office-shirt/school-uniform variety for Kolkata office hour), still low-poly.
- **Pedestrian behaviour** (`src/sim/crowd.ts` only if needed): varied walking speeds, stride matched to
  speed, small idle pauses (phone, chatting) where they already stand. Keep the barge/stun reaction.
- **Player**: walk at light stick push, run at full (024 gives analog magnitude via `input.mx/mz` length),
  stride from actual speed, smooth turn (024 already turns smoothly in `src/sim/player.ts`; render the sim
  heading), jump pose (tuck), landing squash, knocked-down tumble, hanging-off-bus pose if cheap.
  Note the live game moves the player via `src/sim/player.ts` + `src/stages/sectorv.ts` (playerObj); check
  what still uses `src/stages/player.ts` `Body`.
Acceptance:
- [ ] Unit test: the rig attribute layout (every vertex has a part; pivots sensible); walk phase advances with
  speed (no sliding: stride × cadence ≈ speed).
- [ ] Mac GPU screenshots/short frame sequence (390x844) of a crowd and the player mid-stride; before and after.
- [ ] Budgets: draw calls unchanged (≤ 60), ≤ 250 KB brotli, 60 fps on the Mac GPU with the full crowd.
Files you may touch: src/render/models.ts (`person`, `playerPerson` and new rig helpers only; another builder may
touch vehicle functions), src/render/world/walkers.ts, src/render/rig.ts (new), src/render/gfx.ts (append only),
src/stages/player.ts, src/stages/sectorv.ts (player model update only), src/stages/station.ts (people models
only), src/sim/crowd.ts, src/content/tuning.ts (append only), tests.
Out of scope: vehicles, controls, metro entrance (026).

## Notes (builder, study)
- Crossy Road / Mini Motorways / Townscaper people: no skeleton, just rigid blocks pivoting at hips and shoulders.
  Read comes from **opposite-phase** leg/arm swing plus a **bob at twice the step rate**; detail on the body barely matters at phone size.
- Foot sliding is what makes cheap walkers look fake (GTA-mobile crowds fix it by driving the cycle from distance
  travelled, not time). Rule used here: one cycle = one stride = 4 · leg · sin(swing), phase rate = 2π · speed / stride.
- Stride grows with speed and so does cadence (walk ≈ 2 steps/s, run ≈ 3). Runners lean in, bend elbows to ~90°
  and get a flight phase (longer stride than legs alone allow).
- The hips drop when the feet are apart; doing that in the shader keeps the planted foot on the ground for free.
- Goose Game villagers sell "alive" with idles: breathing, look-arounds, phone checks, stopping for no reason. Turning
  in place needs a foot shuffle or it reads as a statue on a turntable.
- Hero sells weight with anticipation/tuck in the air and a short landing squash (Mario-style squash & stretch); a
  tumble is just limbs flailing while the body rolls.
- Variety for free: per-instance height, pace, phase offset and a clothing tint on a handful of looks (here saree,
  salwar-dupatta, kurta-pyjama, office shirt, school uniform, tee + umbrella).
