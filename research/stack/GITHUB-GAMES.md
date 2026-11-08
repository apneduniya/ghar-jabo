# How open-source browser games are structured, and what Ghar Jabo should copy

Research date: 8 Nov 2026. Star counts, licences and last-commit dates come from the GitHub API on that day. Every repo listed under "Catalogue" was shallow-cloned and read: folder layout, loop, input, assets, tests, CI. Nothing was starred, forked or commented on.

## TL;DR

- **Most popular three.js games have no tests at all.** Of the 20 game repos I read, 5 have automated tests, and those 5 are recent (2026) projects, most of them built partly by AI agents. The famous ones (Bruno Simon's portfolios, HexGL, Sketchbook, pmndrs racing-game) have none. Their structure is still worth copying. Their testing isn't.
- **Copy the structure from Bruno Simon's folio-2025.** It's plain three.js with one class per system, a single `Game` that owns everything, a documented tick order, a quality level for mobile, and a data folder.
- **Copy the discipline from Claude-of-Tanks and server-survival.** These are the two repos that show AI agents building a three.js game at scale. Both keep the simulation pure and runnable in Node, use a fixed 60 Hz step and seeded randomness, have hundreds of headless tests, and run screenshots on a real GPU. Claude-of-Tanks also shows what happens when the process grows unchecked: an AGENTS.md of more than 200 lines, a `main.ts` of more than 4,000 lines and 146 npm scripts.
- **Copy the verification harness from threejs-game-skills and three.js itself.** That means a Playwright test that the canvas isn't blank, a bot that plays the game through seeded test hooks, and deterministic screenshots with a frozen clock and fixed `Math.random`.
- **Copy the pooling from the Crossy Road clone.** It pre-allocates rows and reuses them as a ring buffer, and its collision is a plain integer grid, which is exactly our crossing mini-game.
- **No ECS for us.** Only one repo in the set (NotBlox, a multiplayer sandbox) uses a real ECS. For a 2-minute single-player game, "pure sim modules + render views that read them" carries most of the benefit with far less ceremony.

---

## 1. Catalogue

### 1.1 Summary table

| # | Repo | ★ | Last commit | Licence | Engine / physics / UI / build | Tests | CI / lint |
|---|---|---|---|---|---|---|---|
| 1 | [brunosimon/folio-2025](https://github.com/brunosimon/folio-2025) | 2,021 | 2026-11-04 | MIT | three.js (WebGPU build, TSL), Rapier, DOM UI, Vite, JS | none | none |
| 2 | [brunosimon/folio-2019](https://github.com/brunosimon/folio-2019) | 4,747 | 2024-05-06 | MIT | three.js, cannon, DOM, Vite, JS | none | none |
| 3 | [swift502/Sketchbook](https://github.com/swift502/Sketchbook) (archived) | 1,753 | 2024-10-10 | MIT | three.js, cannon, DOM, webpack, **TS** | none | Travis (build only), tslint |
| 4 | [pmndrs/racing-game](https://github.com/pmndrs/racing-game) | 2,224 | 2023-02-23 | MIT | react-three-fiber, @react-three/cannon, zustand, Vite, TS | none | GH Actions: prettier, eslint, build; husky + lint-staged |
| 5 | [BKcore/HexGL](https://github.com/BKcore/HexGL) | 1,753 | 2021-03-22 | MIT | three.js (old), no physics engine, CoffeeScript/JS | none | none |
| 6 | [EvanBacon/Expo-Crossy-Road](https://github.com/EvanBacon/Expo-Crossy-Road) | 1,165 | 2026-03-26 | MIT | three.js via expo-three, React Native Web, tween.js, TS | none | `expo lint` |
| 7 | [Kevin-Liu-01/Claude-of-Tanks](https://github.com/Kevin-Liu-01/Claude-of-Tanks) | 531 | 2026-11-06 | MIT | plain three.js, custom sim + Rust/WASM kernels, DOM UI, Vite, **TS** | **~1,800 `*.selftest.mjs`** (Node), browser probes | oxlint; deliberately no CI deploy; AGENTS.md + CLAUDE.md |
| 8 | [pshenok/server-survival](https://github.com/pshenok/server-survival) | 6,482 | 2026-11-04 | MIT | three.js (CDN global), no bundler, JS | **81 Vitest files** (Node + happy-dom) | GH Actions: eslint + vitest |
| 9 | [iErcann/NotBlox](https://github.com/iErcann/NotBlox) | 186 | 2026-06-07 | MIT | three.js front (Next.js), Rapier on server, **ECS**, pnpm monorepo, TS | none | GH Actions: lint, typecheck, Docker smoke |
| 10 | [StarKnightt/jungle-trail](https://github.com/StarKnightt/jungle-trail) | 307 | 2026-11-03 | MIT | plain three.js, no assets, no build, JS | none, but Playwright **screenshot tools** | none |
| 11 | [akarlsten/cuberun](https://github.com/akarlsten/cuberun) | 347 | 2023-10-12 | MIT | react-three-fiber, drei, zustand, CRA | none | none |
| 12 | [pmndrs/ecctrl](https://github.com/pmndrs/ecctrl) | 814 | 2026-09-06 | MIT | R3F + Rapier character controller library, TS | none | `typecheck` script |
| 13 | [phaserjs/template-vite-ts](https://github.com/phaserjs/template-vite-ts) | 197 | 2026-04-21 | MIT | Phaser 3, Vite, TS | none | none |
| 14 | [digitsensitive/phaser3-typescript](https://github.com/digitsensitive/phaser3-typescript) | 1,032 | 2026-05-28 | MIT | Phaser 3, 15 small games, TS | none | prettier |
| 15 | [jelster/space-truckers](https://github.com/jelster/space-truckers) | 60 | 2023-08-26 | BSD-3 | Babylon.js (book companion), webpack, JS | none | deploy only |
| — | [mrdoob/three.js](https://github.com/mrdoob/three.js) (reference, not a game) | 117,864 | 2026-11-08 | MIT | — | unit + **e2e screenshot diff** | — |
| — | [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) (agent kit) | 2,737 | 2026-09-28 | MIT | Vite + TS + three scaffold | Playwright visual + bot templates | AGENTS.md |
| — | [Hack23/blacktrigram](https://github.com/Hack23/blacktrigram) (process example, low stars) | 10 | 2026-11-06 | Apache-2.0 | R3F + Rapier, Vite, TS | 458 Vitest + Cypress e2e | 17 workflows incl. Lighthouse, screenshot capture, dependency-cruiser |

Checked and dropped:
- **Krunker**: closed source.
- **Veloren**: a native Rust client, not a browser game.
- **PlayCanvas**: games live in the hosted editor, not in GitHub repos; the top repos are the engine and tools.
- **mozilla/BrowserQuest**: archived, 2D multiplayer, old.
- **LBALab/lba2remake**: three.js and a good reimplementation, but no tests and 1.3 GB of assets.
- **Priler/dino3d**: noted only for its `low.html` + `config-low.js` quality split.
- **ggez**: a three.js "vibe coding" framework at 235★, interesting for its renderer-neutral `runtime-format` package, but it's a framework rather than a game.

### 1.2 Per-repo notes

#### 1. folio-2025 (Bruno Simon): the structural model
- **Layout:** `sources/Game/` holds about 60 one-class-per-file systems (`Physics/`, `Inputs/`, `World/`, `World/Areas/`, `Materials/`, `Passes/`, `Cycles/`), plus `sources/data/` with plain JS data (`projects.js`, `achievements.js`, `countries.js`) and `static/` for assets.
- **Game object:** `Game.js` is a singleton that creates every system in a fixed order. Each system reaches the others through `Game.getInstance()`.
- **Loop:** `Ticker.js` clamps delta to 1/30 s and fires `tick` through an `Events` class whose listeners carry an **order number**. The README documents the order: 0 time/inputs → 1 player pre-physics → 2 vehicle pre-physics → 3 physics → 4 objects → 5–6 post-physics → 7 view → 8 intro. This is the cheapest way to make update order explicit without an ECS.
- **Physics:** Rapier is loaded lazily (`import('@dimforge/rapier3d')`) while the intro plays. It is stepped with the *variable* scaled delta (`world.timestep = ticker.deltaScaled`), so it is not deterministic.
- **Assets:** `ResourcesLoader.load([[name, path, type, postProcess]])` loads a small first batch for the intro and the rest in the background. A `VITE_COMPRESSED` switch selects `-compressed.glb` and KTX textures, built by `scripts/compress.js` with gltf-transform and sharp.
- **Mobile:** `Quality.js` sets level 1 on a UA match and emits `change` so systems can downgrade. Touch input comes from `Inputs/Nipple.js` (a virtual joystick). Debug UI is Tweakpane behind `#debug`.
- **Tests, CI, lint:** none.
- **Copy:** one system per file, the documented tick order, the quality event, the two-batch loader, data files separate from systems.

#### 2. folio-2019: the same model, 2019 edition
- **Layout:** `src/javascript/{Application, Camera, Resources}.js`, with `World/` (`Car.js`, `Physics.js`, `Areas.js`, `Zones.js`, `Sections/`), `Materials/`, `Passes/` and shaders in `src/shaders/<effect>/`.
- **Physics:** cannon world plus a separate visual car that follows the physics body.
- **Mobile:** `images/mobile/` holds the touch-control art.
- **Copy:** splitting the physics body from its visual (the car is two objects).

#### 3. Sketchbook: the best TS vehicle sandbox (archived)
- **Layout:** `src/ts/{core, world, vehicles, characters, physics, enums, interfaces}`. Vehicles are `Car`, `Helicopter`, `Airplane`, with `Wheel`, `VehicleSeat` and `VehicleDoor`.
- **Character state machine:** one class per state in `characters/character_states/`, about 20 of them (`Idle`, `Walk`, `Sprint`, `JumpRunning`…).
- **Loop:** `world.physicsWorld.step(physicsFrameTime = 1/60, timeStep)` uses cannon's built-in fixed step with interpolation, and timeScale is lerped for slow motion.
- **Data-driven levels:** the level is a Blender glTF. Objects carry `userData.data = 'physics' | 'path' | 'scenario'` and `userData.type = 'box' | 'trimesh'`, so colliders, AI paths and spawn scenarios are authored in Blender and read at load time.
- **Copy:** state-per-file for the player body, scenarios defined in map data, slow motion via a time-scale target.

#### 4. pmndrs/racing-game: R3F plus a central store
- **Layout:** `src/{models/vehicle, models/track, controls, effects, ui}`, plus `store.ts` (zustand) and `data.ts`.
- **Tuning in one place:** every tuning number lives in `store.ts` as typed `as const` objects (`vehicleConfig`, `wheelInfo`, `dpr = 1.5`). A Leva panel (`ui/Editor.ts`) edits them live.
- **Mobile:** `<Canvas dpr={[1, dpr]}>` caps the pixel ratio.
- **CI:** prettier, eslint and build on PRs; husky + lint-staged on commit. No tests.
- **Copy:** all tuning in one typed file with a live editor, and the DPR cap.

#### 5. HexGL: old, still clever about data
- **Layout:** `bkcore/hexgl/` holds the game (`Gameplay.js`, `ShipControls.js`, `HUD.js`, `RaceData.js`, `tracks/Cityscape.js`). `bkcore/threejs/` holds engine glue (`RenderManager`, `Loader`, `Particles`).
- **Collision and height as images:** `collision.png` and `height.png` are read by a pixel "analyser", with `collisionPixelRatio = 2048/6000`. The track mesh carries no physics.
- **Quality tiers:** two asset folders (`textures/` and `textures.full/`) with LOW/MID/HIGH/VERY HIGH settings.
- **Copy:** a raster road/walkable mask baked from OSM is a cheap, testable alternative to mesh colliders for our map.

#### 6. Expo-Crossy-Road: closest gameplay match to our crossing moment
- **Layout:** `src/Row/{Grass, Road, Water, RailRoad}.ts`, `src/Node/{Car, Log, Train, Tree...}.ts`, `CrossyGame.ts` (scene, camera, map), `GameEngine.ts`, `GameSettings.ts` (constants), plus `screens/` and `components/` for React UI.
- **Pooling:** `CrossyGameMap` pre-allocates `maxRows = 20` of each row type at start and recycles them as a ring buffer (`count` wraps to 0). Nothing is allocated during play.
- **Collision:** a plain object keyed by integer row/column (`floorMap[z]`, `obstacleMap[x]`). No physics engine.
- **Randomness:** `Math.random()` everywhere, so runs can't be replayed.
- **Copy:** row/vehicle pools, grid collision for hop-based moments, constants in a settings file.

#### 7. Claude-of-Tanks: the reference for an agent-built three.js game, and a warning
- **Layout:** `src/{sim, engine, world, vehicles, game, ui, audio, fx, mp, dev}`. Every folder has a `SKILL.md` saying what it owns, and `AGENTS.md` indexes them.
- **Invariants in AGENTS.md:**
  - `SIM_DT = 1/60`; rendering may run at a variable rate.
  - Simulation randomness is seeded and injected; no `Math.random()` or wall-clock time in authoritative logic.
  - Sim and network modules stay Node-runnable and free of DOM and WebGL.
  - No per-frame allocation in hot loops.
  - Every game-mode rule lives in one table (`src/sim/matchRuleset.ts`). "Never add a mode literal elsewhere."
  - "One datum, one owner": every HUD value has one registered owner module.
- **Tests:** about 1,800 `*.selftest.mjs` files using `node:assert`, colocated with the code (`src/sim/ammunition.ts` sits next to `ammunition.selftest.mjs`). Heavy suites (balance, pacing, bots) are manual and named by `npm run test:recommend` based on the diff. Even the device-quality policy (`engine/adaptiveQualityPolicy.ts`) is a pure function with a selftest.
- **Verification matrix in `docs/DEVELOPMENT.md`:** maps a change area to its minimum checks, e.g. renderer → tests + build + cold-load perf probe. It also states: "a screenshot does not replace a simulation invariant."
- **Multi-agent procedure:**
  - Codex and Claude share `main`. Each task gets an isolated worktree from fresh `origin/main`, with the starting commit recorded.
  - Before pushing: integrate main, diff overlapping files, re-run typecheck and tests on the merged commit, then run a preflight script that rejects stale or dirty candidates.
  - Browser captures take a **capture lock** so parallel agents don't fight over the GPU.
- **Warning signs:** `main.ts` is over 4,000 lines; `docs/` has dozens of dated incident notes; 146 npm scripts. The rules are good. The volume is what you get when nobody prunes.
- **Copy:** the invariants list, colocated pure tests, the verification matrix, worktree-per-task, the capture lock.

#### 8. server-survival: a popular three.js game that retrofitted tests
- **Tests:** 81 Vitest files. Pure data tests run in the Node environment (`tests/levels.test.mjs`, `config.test.mjs`); sim tests run in happy-dom (`tests/sim/*.test.mjs`).
- **The three.js stub:** logic was tangled with the THREE global, so they wrote `tests/helpers/three-stub.mjs` with real `Vector3` maths and inert rendering classes. That stub is the cost of not separating the sim early.
- **Beatability tests:** `achievements-proofs.test.mjs` plays the *real* level path frame by frame in `animate()` order and proves every achievement is winnable. "If a balance change breaks one of these runs, the def must be re-proven or cut."
- **Tests on claims:** `readme-claims.test.mjs` checks README numbers against the code, and `locales.test.mjs` checks translation parity.
- **CI:** lint + test on every PR.
- **Copy:** beatability tests (our "every run can get home" guarantee), tests that check text and data tables, a single `npm run check`.

#### 9. NotBlox: the one real ECS
- **Layout:** a pnpm monorepo with `shared/{component, entity, system, network}`, `back/src/ecs/{component, entity, system/physics…}` and `front/game/ecs/system/*`. Systems are one file each (`VehicleSystem`, `SyncPositionSystem`…).
- **Server loop:** fixed timestep with an accumulator and catch-up ticks. Game modes are scripts in `back/src/scripts/` (`footballScript.ts`, `parkourScript.ts`).
- **Perf notes:** `PERFORMANCE.md` covers draw calls via `renderer.info.render.calls` and a shadow-cost ladder.
- **CI:** lint, typecheck and a Docker smoke test. No unit tests.
- **Takeaway:** ECS pays off here because entities are networked and generic. We have neither.

#### 10. jungle-trail: an agent-built game verified by screenshots
- **Brief:** `PROMPT.md` keeps the original prompt plus "how it actually went". Each system (terrain, vegetation, lighting, water…) was built in turn and judged by a **separate critic agent that only saw screenshots, never code**.
- **Capture tooling:** `tools/shoot.mjs` drives Playwright to a fixed list of viewpoints through `window.__game` hooks (`setSun`, tier, FOV), so "shots from two different builds can be put side by side." Separate tools cover mobile, perf, collision sequences and motion reels.
- **Copy:** named, deterministic camera stops, and the blind visual critic.

#### 11. cuberun: R3F runner
- **Layout:** `components/` (Ship, Cubes, Walls, Effects), `state/` (zustand), `constants/`.
- **Rendering:** obstacles are one `<instancedMesh>` of `CUBE_AMOUNT` and are repositioned rather than created. Mobile is detected with `react-device-detect`.
- **Copy:** instancing plus repositioning for repeated props (autos, hawker stalls, pedestrians).

#### 12. ecctrl (pmndrs): a library, not a game
- **What it shows:** clean input separation (`ecctrl/input` exports `Joystick` and `VirtualButton` as DOM controls wired to stores, replaceable by your own UI) and timing in its own module (`src/time`).
- **Copy:** input as a separate module that produces an intent struct, with on-screen touch controls as plain DOM.

#### 13–14. Phaser templates and examples (2D structure ideas)
- **template-vite-ts:** `src/game/scenes/{Boot, Preloader, MainMenu, Game, GameOver}.ts`, with `main.ts` building one config that lists the scenes. Boot → Preloader → Menu → Game → GameOver is the canonical flow.
- **digitsensitive/phaser3-typescript:** each game has `config.ts`, `scenes/`, `objects/`, `interfaces/`, `helpers/`, and `assets/pack.json` (a **declarative asset manifest**) with `assets/maps/` holding Tiled JSON.
- **Phaser itself** now ships `skills/` (about 28 agent skill folders, one per subsystem) in the main repo. Engine vendors are writing for agents now.
- **Copy:** an explicit boot/preload stage, an asset manifest file, maps as JSON.

#### 15. Space Truckers (Babylon.js)
- **Layout:** `appstates.js` (a state machine), `inputActionMaps.js` (actions mapped to keys and touch), `randomGenerator.js`, `spaceTruckerDatabase.js`, plus `driving/` and `guis/`. It's the companion code to a Babylon book. No tests.
- **Copy:** input action maps (`MOVE`, `ACTION`, `PHONE`) defined as data.

#### Reference: three.js's own e2e test
- **Script:** [`test/e2e/puppeteer.js`](https://github.com/mrdoob/three.js/blob/dev/test/e2e/puppeteer.js) screenshots every example and compares it to a stored image. A pixel counts as different past a 0.1 threshold, and a page fails if more than 0.1% of pixels differ.
- **Determinism:** [`deterministic-injection.js`](https://github.com/mrdoob/three.js/blob/dev/test/e2e/deterministic-injection.js) replaces `Math.random` with a seeded sine hash, freezes `performance.now`/`Date.now` at 0, and makes `requestAnimationFrame` fire once on a signal.
- **Copy:** the injection trick, so screenshots are stable even before our own RNG plumbing is perfect.

#### Reference: threejs-game-skills (2.7k★ agent kit)
- **Scaffold:** `src/{core/Loop.ts, core/Renderer.ts, core/InputController.ts, game/Game.ts, systems/*, entities/*, utils/random.ts}`.
- **Tests:** `tests/visual.spec.ts` checks the canvas isn't blank by sampling pixel variance and colour buckets after the game reports more than 10 frames. `bot-playtest.template.ts` drives real input and reports frames advanced, distance travelled, score progression and "softlock windows".
- **Hooks contract:** `window.__THREE_GAME_DIAGNOSTICS__` (frame, score, state, player position) and `window.__THREE_GAME_TEST_HOOKS__` (`seed()`, `setState()`).
- **Headless caveats** (from `playtest-bot.md`):
  - Playwright's default headless shell renders on SwiftShader (CPU), so its FPS means nothing.
  - Run WebGL suites with `workers: 1`.
  - "Headless FPS on a real GPU is a desktop signal, not a phone."
- **Coordination rule:** "normally at most two workers with separate file ownership."

---

## 2. Recurring patterns

### 2.1 Architecture
| Pattern | Who | Fit for Ghar Jabo |
|---|---|---|
| One class per system + a central Game/World owner + ordered tick | folio-2019/2025, Sketchbook, HexGL, Space Truckers, threejs-game-skills scaffold | **Yes.** This is what we already half have. |
| Phaser-style scene list (Boot → Preload → Menu → Game → Over) | Phaser templates, digitsensitive, Crossy (screens) | **Yes**, for our stages: lobby → junction → bus/metro/city → result. |
| React + store (zustand) driving R3F components | racing-game, cuberun, ecctrl | No. Adds React for no gain in a 2-minute game, and we're plain three.js. |
| Real ECS (components + systems + entity manager) | NotBlox only | No. It's for networked, generic entities. |
| Pure simulation core + render "drivers" | Claude-of-Tanks, partially server-survival (retrofitted), ggez (`runtime-format` vs `three-runtime`) | **Yes. This is the main thing to adopt.** |

### 2.2 Loops and timing
- **Variable delta, clamped:** folio-2025 (1/30 cap), Crossy, cuberun, and Ghar Jabo today (`Math.min(0.05, dt)`). Simple, but runs can't be reproduced.
- **Fixed step with an accumulator:** Claude-of-Tanks (`SIM_DT = 1/60`), NotBlox server, Sketchbook (cannon `step(1/60, dt)`), three.js `games_fps.html` (5 substeps per frame), and the threejs-game-skills reference (`accumulator += Math.min(dt, 0.1)`).
- **Explicit update order:** folio-2025 numbers its tick phases in the README. Without that, order lives in whoever registered first.
- **Slow motion and hit-stop** are applied to the sim delta: Sketchbook's timeScale lerp, and Ghar Jabo already does this.

### 2.3 Assets and pooling
- **Batched loaders with a manifest:** folio-2025 (`[name, path, type, postProcess]`, an intro batch first), Phaser `pack.json`, HexGL track definitions listing every texture.
- **Compression switch:** folio-2025 swaps in `-compressed.glb` + KTX2 through an env flag, built by gltf-transform.
- **Two quality asset sets:** HexGL (`textures` vs `textures.full`), dino3d (`low.html`).
- **Pools:** Crossy (ring buffer of pre-built rows), cuberun (instanced mesh, reposition), and Claude-of-Tanks (pooled FX, "no per-frame allocation in hot loops").
- **Procedural geometry over GLBs:** jungle-trail (zero assets), Claude-of-Tanks (procedural tanks). Ghar Jabo is already procedural; keep it that way.

### 2.4 Data-driven design
- **Tuning tables in one file:** racing-game `store.ts`, Crossy `GameSettings.ts`, Claude-of-Tanks `matchRuleset.ts` ("never add a mode literal elsewhere").
- **Levels in data:** Sketchbook (glTF `userData`), Phaser (Tiled JSON), HexGL (PNG masks), NotBlox (mode scripts), folio-2025 (`sources/data/*.js`).
- **Text as data, with tests:** server-survival (locale parity tests, README claim tests).

### 2.5 Testing: what actually exists
Of the 20 game repos read, **15 have zero automated tests**. The five that do:

| Repo | Unit / sim | Gameplay proofs | Browser / e2e | Screenshots | Perf |
|---|---|---|---|---|---|
| Claude-of-Tanks | ~1,800 Node selftests, colocated | balance/pacing/bot suites (manual) | probe scripts via `agent-browser` | deterministic capture tools + lock | cold-load and transition gates |
| server-survival | 81 Vitest (Node + happy-dom) | beatability proofs per achievement | none | none | none |
| blacktrigram | 458 Vitest + benchmarks | AI integration tests | Cypress screens | Playwright + Xvfb in CI | Lighthouse workflow |
| three.js (library) | unit | — | Puppeteer | pixel diff vs stored PNGs | benchmarks |
| ggez (framework) | 29 tests on format/build packages | — | — | — | — |

Plus jungle-trail (screenshot tooling, no assertions) and the threejs-game-skills scaffold (templates for a blank-canvas check, a bot and visual regression).

What the evidence says works:
1. **Headless sim tests** are the only tests that exist at scale, and they only exist where the sim imports no three.js or DOM (or where someone paid for a stub later).
2. **Beatability and progression proofs:** a scripted run through the real update order, asserting it reaches a win or fail state.
3. **A browser smoke test:** loads, no console errors, canvas not blank, frames advance.
4. **Screenshots** are review evidence, not pass/fail truth. Strict pixel diffs exist only in three.js, which freezes time and randomness first.

Linting and formatting: racing-game (eslint + prettier + husky), digitsensitive (prettier), Claude-of-Tanks (oxlint), server-survival (eslint flat config), blacktrigram (eslint + dependency-cruiser for import boundaries). None use Biome.

### 2.6 Mobile performance tactics seen
- Cap DPR (racing-game `dpr={[1, 1.5]}`).
- Have a quality level with a change event (folio-2025 `Quality.js`, HexGL presets, dino3d low build, Claude-of-Tanks adaptive quality as a tested pure policy).
- Merge or instance static geometry (cuberun; Ghar Jabo's own iPhone fix merged scenery to beat 1 fps).
- Know the shadow cost ladder (NotBlox `PERFORMANCE.md`): no shadows → baked → one directional.
- Lazy-load the heavy parts (folio-2025 loads Rapier during the intro).
- Treat headless FPS as meaningless. Real GPU or real phone only (threejs-game-skills, Claude-of-Tanks: "do not compare FPS without recording viewport, DPR, tier…").

---

## 3. Proposed structure and principles for Ghar Jabo

### 3.1 Where we are now
Today's `src/` is about 2,400 lines across flat modules plus `scenes/`.
- `state.ts` (Run) is already pure, which is good.
- `scenes/city.ts` has 523 lines and mixes sim, three.js, DOM and audio.
- `rand` lives in `gfx.ts`, so gameplay randomness depends on the rendering module and isn't seeded.
- Mom calls close via `setTimeout(4500)`, which is wall-clock time, so slow motion, pause and tests don't apply to them.
- `window.gj` already exposes the game for playtests. That's a good start, so formalise it.

### 3.2 Target layout

```
ghar-jabo/
  AGENTS.md                 # ≤150 lines: invariants, commands, done-gate, map of folders
  CLAUDE.md                 # one line: @AGENTS.md
  docs/
    ARCHITECTURE.md         # layers, tick order, data flow (one page)
    DECISIONS.md            # dated one-liners: "2026-11-08: no ECS, because…"
    specs/0007-bus-footboard.md   # one file per task (template in §4.1)
  src/
    main.ts                 # boot only: create app, start loop (<50 lines)

    sim/                    # PURE. No three, no DOM, no audio, no Date/performance, no Math.random
      rng.ts                #   seeded RNG (mulberry32); the only source of randomness
      clock.ts              #   game minutes, CLOCK_RATE, hit-stop/timeScale applied here
      run.ts                #   Run: money, dignity, stats, ending (today's state.ts)
      events.ts             #   typed event union + queue: {type:'captain-cancelled', reason} …
      intent.ts             #   Intent type {move:{x,z}, tap, hold, phone}, what sim reads from input
      body.ts               #   player kinematics (today's player.ts minus the mesh)
      traffic.ts            #   vehicles as plain data {id, kind, lane, x, speed}; pooled arrays
      collide.ts            #   building grid / road mask queries (today's world/collide.ts)
      stages/               #   one state machine per stage, each with step(state, intent, dt, rng)
        junction.ts  rapinah.ts  bus.ts  metro.ts  crossing.ts  city.ts
      endings.ts            #   arrive()/fail() rules → EndingId (pure function of Run)
      game.ts               #   top-level step(): routes to current stage, emits events
      *.test.ts             #   colocated Vitest, Node environment

    content/                # PURE DATA. Imported by sim and ui; imports nothing but types
      tuning.ts             #   every gameplay number, typed `as const`, grouped by stage
      text/                 #   jokes, cancel reasons, ticker + headline templates (today's text.ts)
        ticker.ts  headlines.ts  mom.ts  captains.ts
      maps/sectorv.json     #   generated by tools/build-map.py from OSM, never hand-edited
      maps/schema.ts        #   types + validator for map JSON
      *.test.ts             #   data shape tests: ids unique, templates fill, map validates

    render/                 # three.js ONLY. Reads sim state, never writes it
      renderer.ts           #   WebGLRenderer, DPR cap, resize
      quality.ts            #   tier from a pure policy in sim-free code; emits change
      palette.ts            #   colours (today's C)
      build/                #   procedural mesh builders: people.ts vehicles.ts buildings.ts signs.ts
      pools.ts              #   instanced meshes keyed by vehicle kind; acquire/release
      views/                #   one view per stage: sync(state) maps sim → Object3Ds, camera rig
        junctionView.ts  busView.ts  metroView.ts  cityView.ts
      photo.ts              #   capturePhoto for the newspaper

    ui/                     # DOM only: HUD, phone cards, toasts, mom call banner, result paper
      hud.ts  phone.ts  toasts.ts  momCall.ts  result.ts  dom.ts
    audio/                  # Web Audio: sfx.ts engine.ts; reacts to sim events
    input/                  # devices → Intent: keyboard.ts touch.ts (floating stick) index.ts
    app/                    # the only layer that knows all others
      loop.ts               #   fixed-step accumulator; render once per RAF
      stages.ts             #   wires sim/stages/x + render/views/x + ui/x per stage
      hooks.ts              #   window.__gj: seed, setStage, setMinute, diagnostics, freeze
  tests/
    e2e/smoke.spec.ts       # Playwright: boots, canvas not blank, seeded bot reaches result screen
    e2e/shots.spec.ts       # named deterministic moments × viewports (run on the Mac)
  tools/
    build-map.py            # OSM → content/maps/*.json
    perf-budget.mjs         # bundle size + scene stats budget
    shoot.mjs               # wrapper: ssh mac, run shots.spec, pull PNGs back
```

### 3.3 Coding principles

**Layers and imports** (enforced by eslint `no-restricted-imports` plus a `tsconfig.sim.json` with `lib: ["ES2022"]` and no DOM, so a stray `document` fails typecheck):

| Layer | May import | Must not import |
|---|---|---|
| `content/` | types from `sim/` | everything else |
| `sim/` | `content/`, other `sim/` | `three`, `render/`, `ui/`, `audio/`, `input/`, `app/`, DOM globals, `Math.random`, `Date`, `performance`, `setTimeout` |
| `render/`, `ui/`, `audio/` | `sim/` (read-only types and state), `content/`, `three` (render only) | each other; writing to sim state |
| `input/` | `sim/intent.ts` | everything else |
| `app/` | everything | — |

**Rules for agents** (each one traceable to a repo above):
1. **The sim is a pure function of (state, intent, dt, rng).** If it can't run in `vitest --environment node`, it's in the wrong folder. (Claude-of-Tanks; server-survival's stub shows the cost of skipping this.)
2. **Fixed step:** `SIM_DT = 1/60`, accumulator capped at 0.25 s (at most 15 steps), render once per frame. Hit-stop and slow motion scale the sim delta, never the render. (Claude-of-Tanks, Sketchbook, threejs-game-skills.)
3. **One RNG, seeded per run, passed in.** A run is replayable from `(seed, intent log)`. That's what makes bot tests and screenshots stable. (Claude-of-Tanks; three.js injection as a fallback.)
4. **Sim talks outward through events.** UI, audio, ticker and photo capture subscribe to `captain-cancelled`, `fell-off-footboard`, `mom-called`… They never poke sim fields. (folio-2025 `Events`, NotBlox event queue.)
5. **No timers outside the sim clock.** Mom-call timeouts, cancel delays and grace windows are sim-time countdowns.
6. **Every number lives in `content/tuning.ts`.** No magic numbers in `sim/stages/*`. In dev builds a tiny debug panel (lil-gui behind `?debug`) edits them live. (racing-game, Crossy, Claude-of-Tanks `matchRuleset`.)
7. **Every string a player reads lives in `content/text/`**, as templates with named slots filled from Run stats. Tests check every template fills and none goes over its length limit. (server-survival locale tests.)
8. **Maps are generated JSON with a schema.** `tools/build-map.py` is the only writer, and `maps/schema.ts` validates at test time and in dev at load time. A raster walkable mask is fine (HexGL).
9. **Render views are disposable.** `views/x.ts` exports `create(scene)`, `sync(state, alpha)` and `dispose()`. No allocation in `sync`; repeated things come from `render/pools.ts` (Crossy ring buffers, cuberun instancing).
10. **Mobile is the default target.** DPR capped at 2 (1.5 on low tier), no real-time shadows on low tier, merged static scenery. Budgets live in `tools/perf-budget.mjs` and fail the gate.
11. **One datum, one owner.** Each HUD value (clock, ₹, dignity) is rendered by exactly one `ui/` module. (Claude-of-Tanks.)

**Naming and size:**
- Files are `lowerCamel.ts` (current style), one main export named after the file. Tests are `x.test.ts` next to `x.ts`.
- Types and classes use `PascalCase`; event types are `kebab-case` string literals; tuning keys use `camelCase` grouped by stage (`tuning.bus.footboardGripSec`).
- File limit: **300 lines soft, 400 hard** (the gate warns at 300 and fails at 400; `city.ts` at 523 would be split). Function limit about 60 lines. These come from where the reviewed repos went wrong (a 4,000-line `main.ts`, a 676-line `Player.js`), not from a style guide.
- Every file starts with a 1–2 line header comment saying what it owns. Ghar Jabo already does this.
- No default exports, no barrel `index.ts` files except `input/`, no `utils.ts` dumping grounds.

**Tick order** (documented in ARCHITECTURE.md, after folio-2025):
1. input → Intent
2. sim fixed steps (stage step → traffic → collisions → clock → endings), emitting events
3. app drains events → ui/audio/ticker
4. render views `sync(state, alpha)` → camera → `renderer.render`
5. ui HUD update

---

## 4. Agent workflow

Real examples this draws on:
- Claude-of-Tanks [AGENTS.md](https://github.com/Kevin-Liu-01/Claude-of-Tanks/blob/main/AGENTS.md) and [docs/DEVELOPMENT.md](https://github.com/Kevin-Liu-01/Claude-of-Tanks/blob/main/docs/DEVELOPMENT.md): invariants, verification matrix, worktree publishing, capture lock.
- threejs-game-skills [AGENTS.md](https://github.com/majidmanzarpour/threejs-game-skills/blob/main/AGENTS.md): evidence manifest, at most two workers with separate file ownership.
- jungle-trail [PROMPT.md](https://github.com/StarKnightt/jungle-trail/blob/main/PROMPT.md): one system at a time, plus a blind screenshot critic.
- blacktrigram [copilot-instructions.md](https://github.com/Hack23/blacktrigram/blob/main/.github/copilot-instructions.md): an IF/THEN rule list and checks before committing.
- pmndrs/racing-game [CONTRIBUTING.md](https://github.com/pmndrs/racing-game/blob/main/CONTRIBUTING.md): classic human flow.
- Phaser's in-repo [`skills/`](https://github.com/phaserjs/phaser/tree/master/skills): engine docs written for agents.

### 4.1 How tasks are specified
One spec per task in `docs/specs/NNNN-slug.md`, written by Adarsh or the lead agent before implementation starts:

```markdown
# 0007 Bus footboard hang
Player-visible goal: one sentence a playtester would notice.
Stage(s): bus
Acceptance (each becomes a test or a named shot):
- [sim] Holding grip for ≥ tuning.bus.footboardGripSec keeps player on; releasing early → 'fell-off-footboard' event.
- [sim] With seed 42 and the scripted "hold" intent, run reaches Sealdah before 21:30.
- [text] New ticker templates fill with stats and stay ≤ 70 chars.
- [shot] bus-footboard-hang @ 390×844: player visibly outside rear door.
Tuning: new keys + starting values (in content/tuning.ts).
Owns files: src/sim/stages/bus.ts, src/render/views/busView.ts, src/content/text/ticker.ts
Must not touch: other stages, app/loop.ts, AGENTS.md
Out of scope: …
```

Writing the acceptance as `[sim]` / `[text]` / `[shot]` lines makes test-first easy. The agent writes the failing sim tests first, then the code.

### 4.2 The done-gate: what an agent runs before saying "done"
A single `npm run check` (server-survival's pattern), which runs:

1. `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.sim.json`. The second has no DOM lib, so a DOM call in `sim/` fails.
2. `eslint .`, including import-boundary rules and a `max-lines` rule (warn 300, error 400).
3. `vitest run`: all `sim/` and `content/` tests in Node. Target under 10 s, so agents run it every time.
4. `vite build`.
5. `node tools/perf-budget.mjs`:
   - JS bundle gzip ≤ 250 KB (three.js tree-shaken is about 150 KB gz).
   - For each stage, build the scene headless in Node (three.js scene graphs build without WebGL) and count meshes, unique materials, triangles and lights against per-stage budgets, e.g. ≤ 60 draw-call candidates and ≤ 150k triangles. These are proxies, but they catch the "1 fps on iPhone" class of regression before anyone opens a browser.
6. `npx playwright test tests/e2e/smoke.spec.ts` (headless Chromium is fine on the VPS here, because it's functional only):
   - boots with `?seed=42&fast=1`;
   - no console or page errors;
   - canvas isn't blank (pixel-variance sample from threejs-game-skills);
   - `__gj.diagnostics().frame` advances;
   - a scripted bot plays through to the result screen and every ending can be reached via `__gj.setStage/setMinute`.

Agent rules: if any step is red, the task isn't done. Report the failing output; never weaken a test or a budget to pass. Changing a budget needs a line in `DECISIONS.md` and Adarsh's OK.

A short verification matrix in AGENTS.md (after Claude-of-Tanks) says what's needed beyond `check`:

| Change touches | Also needed |
|---|---|
| `sim/` only | nothing more (the gate covers it) |
| `content/text` | read the 5 sample generated lines in the test output |
| `render/` or `ui/` | Mac shots for affected stages (§4.3) |
| tuning or difficulty | `npm run test:balance`: 200 seeded bot runs, report % home, median arrival time, per-ending counts vs baseline |
| anything before a release | real-phone check by Adarsh (iPhone + a mid-range Android) |

### 4.3 Verifying visual and gameplay changes on a real GPU
The VPS has no GPU. Headless Chromium uses SwiftShader, so FPS and lighting there aren't evidence. Use the Mac (`ssh mac`, Apple-silicon GPU, headed Chrome for Testing, as the playtest research already did).

- **`tools/shoot.mjs <branch>`** does the following:
  1. rsyncs the built `dist/` to the Mac;
  2. serves it;
  3. runs `tests/e2e/shots.spec.ts` headed with `workers: 1`;
  4. pulls `shots/<branch>/*.png` and a `report.json` back.
- **Named moments, not free play:** each shot is `__gj.seed(42); __gj.setStage('bus'); __gj.setMinute(19*60+40); __gj.freeze()` followed by a capture. Viewports are 390×844 at DPR 3 (iPhone) and 412×915 (Android), plus one desktop. This is the jungle-trail stops idea, made deterministic by our seeded sim. Add the three.js `deterministic-injection.js` trick for anything still on `Math.random`.
- **Diff, then judge:** compare against `shots/baseline/` with pixelmatch (three.js thresholds: 0.1 per pixel, 0.1% of pixels) to flag *which* shots changed. Then a **separate reviewer agent that sees only the PNGs and the spec's `[shot]` lines** says pass or fail for each (the jungle-trail critic). A human looks at anything flagged. Pixel diffs don't fail the build on their own.
- **Perf on the Mac:** the same script records `renderer.info.render.calls`, triangles and the median and p95 frame time over a 10 s scripted run per stage. Report it with viewport, DPR and tier, or it means nothing. The real budget is on a phone: before a release, Adarsh opens the preview on his phone. If the Mac can drive a USB-connected phone, that can be added later.
- **One GPU job at a time:** shoot runs take a lock (`flock /tmp/gj-shots.lock` on the Mac) so two agents don't contend for the GPU and skew frame times (Claude-of-Tanks' capture lock). Check `uptime` on the Mac before starting, per the server rules.

### 4.4 Keeping agents from conflicting
- **One spec = one branch = one worktree:** `git worktree add ../gj-wt/0007-bus-footboard -b feat/0007-bus-footboard`. Agents never edit the main checkout or another agent's worktree. (Claude-of-Tanks.)
- **Ownership in the spec:** "Owns files" and "Must not touch" lines. Run at most 2–3 agents in parallel, each on a different stage folder; the stage-per-folder layout in §3.2 makes this possible. (threejs-game-skills: at most two workers with separate file ownership.)
- **Shared hot files get a single owner:** `content/tuning.ts`, `sim/events.ts`, `app/stages.ts` and `AGENTS.md`. Agents *append* new keys or events in their own group. Restructuring these files is a separate task done by the lead or integrator.
- **Integration:**
  1. Rebase on fresh `main`.
  2. Re-run `npm run check` on the rebased commit; an earlier green run doesn't count, per Claude-of-Tanks.
  3. Re-run shots for touched stages.
  4. Fast-forward merge.
  5. Delete the worktree.
- **No force-push to main.** Squash commits are fine.
- **Keep the instructions short.** AGENTS.md has a ceiling of about 150 lines and holds rules, not history. Incident notes go in `DECISIONS.md` as one line each. If AGENTS.md needs a paragraph to explain an exception, the code probably needs a fix instead. (This is the Claude-of-Tanks lesson.)
- **Per-folder notes only when needed:** a 10-line `README.md` in `sim/` or `render/` when a folder's rules differ. Avoid a `SKILL.md` in every folder until the project is much bigger.

### 4.5 Suggested migration order (for the restructure task)
Each step is one spec.
1. Add the gate without moving files: Vitest, eslint, `tsconfig.sim.json`, Playwright smoke, `perf-budget.mjs`, `npm run check`.
2. `sim/rng.ts` + `sim/clock.ts`; route all gameplay `rand` through them; replace `setTimeout` mom-call logic with sim time.
3. Move `state.ts` → `sim/run.ts` and the ending rules out of `game.ts` → `sim/endings.ts`, with tests.
4. Fixed-step `app/loop.ts`; `input/` produces an `Intent`.
5. Split one stage end to end (the junction, the smallest) into sim stage, render view and UI. It becomes the template for the others.
6. Split `city.ts` the same way; then bus, metro and station.
7. `content/text` and `content/tuning`, with shape tests.
8. Mac shot harness + baseline.

---

## 5. Links
- three.js examples: [games_fps.html](https://github.com/mrdoob/three.js/blob/dev/examples/games_fps.html) (substeps, Octree + Capsule collision), `physics_rapier_vehicle_controller.html`, `physics_rapier_character_controller.html`
- three.js e2e: [test/e2e](https://github.com/mrdoob/three.js/tree/dev/test/e2e)
- folio-2025 tick order: [readme.md](https://github.com/brunosimon/folio-2025/blob/main/readme.md#game-loop); [Ticker.js](https://github.com/brunosimon/folio-2025/blob/main/sources/Game/Ticker.js); [Quality.js](https://github.com/brunosimon/folio-2025/blob/main/sources/Game/Quality.js)
- Crossy pools: [CrossyGame.ts](https://github.com/EvanBacon/Expo-Crossy-Road/blob/master/src/CrossyGame.ts)
- server-survival tests: [tests/](https://github.com/pshenok/server-survival/tree/main/tests), [three-stub.mjs](https://github.com/pshenok/server-survival/blob/main/tests/helpers/three-stub.mjs)
- HexGL collision maps: [tracks/Cityscape.js](https://github.com/BKcore/HexGL/blob/master/bkcore/hexgl/tracks/Cityscape.js)
- Sketchbook glTF-driven world: [World.ts](https://github.com/swift502/Sketchbook/blob/master/src/ts/world/World.ts)
- NotBlox perf notes: [PERFORMANCE.md](https://github.com/iErcann/NotBlox/blob/main/PERFORMANCE.md)
- jungle-trail shot tool: [tools/shoot.mjs](https://github.com/StarKnightt/jungle-trail/blob/main/tools/shoot.mjs)
- threejs-game-skills QA: [playtest-bot.md](https://github.com/majidmanzarpour/threejs-game-skills/blob/main/skills/threejs-qa-release/references/playtest-bot.md), scaffold [`assets/threejs-vite-game`](https://github.com/majidmanzarpour/threejs-game-skills/tree/main/skills/threejs-gameplay-systems/assets/threejs-vite-game)
- Phaser canonical scene flow: [template-vite-ts/src/game](https://github.com/phaserjs/template-vite-ts/tree/main/src/game)
