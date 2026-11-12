# 033: The metro station stage on sim/ (backlog 011)

Goal: the Sector V metro stage (`src/stages/station.ts`, 348 lines of legacy glue: rules, physics, crowd, train,
camera and UI in one file) moves onto the same base as the street: rules in `src/sim/` (pure, seeded, tested),
drawing in `src/render/`, the stage a thin loop. Players should notice only that it plays better and matches the
street: the same fixed stick + swipe-to-look controls (tasks 024/027), the same walking people (rig, task 025), the
same seeded randomness (`sim/rng.ts`, `?seed=`).

Do:
- `src/sim/station.ts` (+ split files if needed, ≤ 400 lines each): phases (gate → escalator → platform → doors →
  ride → arrive or miss Sealdah), the ticket gate that works, keep-left on the escalator, the platform crowd you
  shove through (reuse `sim/crowd.ts` ideas), the train's timing (arrive, doors open, warning, close, leave), the
  ride's stops along the Green Line (`content/text.ts` greenLine) and getting off at Sealdah, fares (`T.metro`),
  outcomes reported as events like the street's `World` (events.ts). No three.js, no DOM, no Math.random.
- Player on foot uses `sim/player.ts` (Player.stepFoot, smooth turning, analog walk/run) instead of `stages/player.ts`
  `Body`; retire `Body` if nothing else needs it.
- Rendering in `src/render/` (station model, train, crowd via the walker instancing, signs) reads sim state only.
- Camera: same feel as the street (swipe-to-look on the right half, fixed stick), clamped inside the station box.
- Keep every joke line and the gameplay beats players know (BRAKES!, armpit/door-glass/umbrella lines, metro
  closed hours and "not enough money" handled by the street already).
- Tests: unit tests for each phase (gate, doors timing, boarding window, missing Sealdah, arriving), seeded replay
  (same seed → same outcome), and the existing e2e "station stage renders within budget" plus a new e2e that
  boards a train and arrives.
Acceptance: `npm run check` green, draw calls ≤ 60 (now about 11), Mac GPU screenshots at 390x844 of the gate,
platform and ride, before and after.
Files you may touch: src/stages/station.ts, src/stages/player.ts, new src/sim/station*.ts, new
src/render/world/metro*.ts or src/render/station*.ts, src/sim/events.ts (append), src/content/tuning.ts (append),
src/content/text.ts (append only), src/render/world/walkers.ts (only if needed for reuse), tests, tests/e2e/smoke.spec.ts
(station test only), tests/e2e/station.spec.ts (new).
Out of scope: audio/voice (034), the street stage (sectorv.ts).
