# Ghar Jabo: stack research (phone-first 3D browser game)

Researched 8 Nov 2026. Sizes marked *measured* come from bundling each package with esbuild 0.28 (minified, ESM, `gzip -9`) in a scratch folder on 8 Nov 2026, using a minimal "hello cube" entry where tree-shaking matters. Library versions are the latest on npm that day. Read them as relative sizes, not exact production numbers.

**Short answer:** keep plain three.js on `WebGLRenderer`. Don't switch engines, and don't move to WebGPURenderer yet. Add a few small things: **Vitest**, **Playwright**, **stats-gl** (dev only), a **seeded RNG** and **size-limit**. Bring in `@gltf-transform/cli` + meshopt only when you start shipping `.glb` characters or vehicles. Skip physics engines, ECS libraries, React and howler for now.

---

## 0. What comparable games actually ship

I checked the live bundles of four of them on 8 Nov 2026. All of them, including the two biggest, are plain three.js with no engine.

| Game | What's in the bundle (checked 8 Nov 2026) | Notes |
|---|---|---|
| **Benglooru** ([benglooru.com/play](https://benglooru.com/play/)) | **three.js r186** (`three.core` chunk, `__THREE__="186"`), **Rapier** physics (its perf overlay reports `rapierMs`), `BatchedMesh` (18 refs), `InstancedMesh`, `LOD`, SMAA pass, a cascaded-shadow culling module. Vite build of ~70 lazy chunks. Landing site is Astro. | Desktop-first. Quality tiers set `pixelRatio` 0.75–1.5, MSAA 0–4, shadow map 1024–2048 and crowd/traffic density, chosen by GPU string (`mali/adreno/powervr` → low; Apple GPU → medium). The site says it needs a laptop with WebGL2 ([about](https://benglooru.com/about/), [X, Oct 2026](https://x.com/benglooru_game)). A public repo describing the same game says "Three.js + Rapier 3D" ([GitHub](https://github.com/PrajwalUppoor/gta-bengalooru/tree/main/)); I couldn't confirm it's the official source. Our earlier headless test saw ~11.8M static triangles and 31,828 colliders (`research/archive-headless/benglooru.md`). |
| **Fightkaro / Sansad Showdown** ([fightkaro.com](https://fightkaro.com/)) | **three.js r186**, Vite build (`/assets/three-*.js` 175 KB gz + `main-*.js` 208 KB gz). `GLTFLoader` + **DRACOLoader** (decoder wasm bundled), `SkinnedMesh`/animation for 13 `.glb` fighters (e.g. `modi.glb` = 1.2 MB). WebRTC (`RTCPeerConnection`) friend rooms with a WhatsApp share link. Hosted on Vercel. No React, no physics library. | Caps `setPixelRatio(min(devicePixelRatio, mobile ? 1.5 : 2))`, the same choice we made. Viral in early Nov 2026 ([Deccan Herald, 3 Nov 2026](https://www.deccanherald.com/india/literally-fight-as-indian-politicians-fightkaro-a-new-political-satire-game-gaining-traction-on-social-media-4205714)). |
| **Delhi Metro Survival 3D** ([delhimetrogame.com](https://delhimetrogame.com/)) | **three.js r160** vendored. **No build step**: an import map plus ~20 ES modules, `GLTFLoader`, a PWA. Cloudflare Pages. | Its `perf.js` does **dynamic resolution**. When frames average over 34 ms it drops the pixel ratio by 0.25, and keeps the drop only if frames actually got faster. That way a phone locked to 30 fps (iOS Low Power Mode, in-app browsers) isn't pushed to low resolution for nothing. It also redraws the 3D scene only ~4×/s while a full-screen menu covers it. Worth copying. |
| **Bhaiya, Bandra Chaloge?** ([site](https://www.bhaiyabandrachaloge.wtf/)) | Next.js + three.js, box-built low-poly with no imported models (from our earlier bundle read, `research/archive-headless/bhaiya-bandra.md`). A Vercel bot checkpoint blocked a re-check today. | Synthesised audio. |
| **Baper Rasta** | three.js (earlier research). Not re-checked today. | |

The pattern is the same everywhere: three.js + Vite (or no bundler), custom game code, the DOM for UI, and a physics library only in the one game that needs real vehicle and ragdoll physics. Benglooru is also what not to copy for a 2-minute phone game: a 2-minute load and laptop only.

---

## 1. Engine and framework options

| Option | Bundle (*measured*, gz) | iPhone Safari | Tooling | Learning curve | Small team + AI agents |
|---|---|---|---|---|---|
| **Plain three.js r187** (current) | **135 KB** for a minimal WebGLRenderer scene; 192 KB for the full namespace. **Our current build is 198 KB gz in total** (733 KB min). | Good once draw calls are low. WebGL2 everywhere on iOS 15+. We've already done the hard part (1 fps → merged ~50 draw calls). | Vite, plain TS, any browser devtools. No editor. | Low for the team (already in use). | **Best fit.** It's the most-documented web 3D library, so agents write correct three.js code reliably, and every comparable game uses it. |
| **react-three-fiber 9.8** (+ React 19) | **320 KB** (three + React + R3F) | Same GPU cost as three.js, plus React's CPU and GC overhead if misused. The official docs warn against `setState` in loops and against allocating in `useFrame` ([R3F pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)). | drei helpers, r3f-perf, Leva. | Medium (React + three + the reconciler model). | Good for UI-heavy 3D sites. For an action game it's a rewrite that adds about 120–185 KB and a second mental model. Not worth it here. |
| **Babylon.js 9.35** | **343 KB** for a minimal tree-shaken scene (`@babylonjs/core`) | Solid. WebKit names it as working well on Safari 26 WebGPU ([WebKit, Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). Mature WebGL2 path. | Playground, Inspector, built-in physics plugin (Havok), GUI. 9.0 shipped March 2026 ([Wikipedia](https://en.wikipedia.org/wiki/Babylon.js)). | Medium. A big API, but batteries included. | A real engine with good docs. Switching costs a rewrite and about 2.5× the bundle for features we don't use. |
| **PlayCanvas 2.23** | **532 KB** (whole engine as one entry; it doesn't tree-shake much) | Historically strong on mobile; used for many ad and HTML5 games. | Best-in-class **cloud editor** (account needed), or engine-only via npm. 2.23.x released Oct–Nov 2026. | Medium. The editor workflow is less agent-friendly than plain code. | The editor is the selling point, and it's the part agents can't drive well. The engine-only route gives up that advantage. |
| **Phaser 4.2** | **369 KB** | Excellent for 2D. | Mature 2D tooling. | Low. | **2D only.** Phaser 4 (Apr 2026) is a WebGL rewrite with no 3D ([Wikipedia](https://en.wikipedia.org/wiki/Phaser_(game_framework))). Wrong fit unless the game goes back to 2D. |
| **Godot 4.7 web export** | Engine wasm is **~40 MB raw, ~5 MB Brotli / ~9–10 MB gzip** for an empty project ([Godot 4.3 web report](https://godotengine.org/article/progress-report-web-export-in-4-3/), [Godot issue #68647](https://github.com/godotengine/godot/issues/68647)). | Works on iOS only reliably with the **single-threaded** export since 4.3. It's slower than multithreaded, WebGL2 Compatibility renderer only, no WebGPU, no C# on the web ([Godot docs](https://docs.godotengine.org/en/latest/tutorials/export/exporting_for_web.html), [cinevva, Sep 2026](https://app.cinevva.com/guides/godot-vs-unity-web-games)). | Great editor. | Medium. | A 5–10 MB engine download before any game content kills the "tap the WhatsApp link and play in 3 seconds" loop. |
| **Unity 6 web** | Empty build reportedly uses ~109 MB RAM (~219 MB with URP) at runtime ([Unity forum, 2025](https://discussions.unity.com/t/web-build-memory-consumption-on-unity-6/1613334)). | Officially supported on iOS Safari since Unity 6 ([Unity blog](https://unity.com/blog/engine-platform/web-runtime-updates-enhance-browser-experience)). The main crash cause is the iOS memory ceiling, roughly 300–500 MB ([bugnet guide](https://bugnet.io/blog/how-to-fix-unity-webgl-build-crashing-on-safari-ios)). | Best editor and asset store. | High. | Too heavy for a 2-minute, link-shared phone game, and a closed, licensed toolchain. |

### What's new in 2026: WebGPU and three.js `WebGPURenderer`

- **WebGPU ships on iOS.** Safari 26.0 (Sept 2025) enabled WebGPU on iOS, iPadOS, macOS and visionOS ([WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)), and it's in all major browsers ([web.dev](https://web.dev/blog/webgpu-supported-major-browsers)). Phones still on iOS ≤18 only have WebGL2.
- **three.js `WebGPURenderer`** (`import ... from 'three/webgpu'`) falls back to WebGL2 automatically. But the official manual still says *"The renderer itself is still in an experimental state"*, calls `WebGLRenderer` *"the recommended choice for pure WebGL 2 applications"*, and notes that `ShaderMaterial`/`onBeforeCompile` and `EffectComposer` are not supported. You have to port to node materials/TSL ([three.js manual, dev branch, read 8 Nov 2026](https://github.com/mrdoob/three.js/blob/dev/manual/pages/webgpurenderer.html)). r187 (30 Oct 2026) put about 80% of its core changes into the WebGPU renderer ([sirocco18 analysis](https://sirocco18.jp/journal/en/threejs-r187.html), [migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide#186--187)).
- **It's slower for scenes like ours.** Maintainer tests show WebGPURenderer well behind WebGLRenderer on scenes with many separate meshes (Pixel 8a: 19 vs 57 fps; M1 Pro: 15 vs 60 fps) ([issue #30560](https://github.com/mrdoob/three.js/issues/30560), [issue #31055](https://github.com/mrdoob/three.js/issues/31055)). It's also much slower at first-frame and material initialisation ([issue #33821](https://github.com/mrdoob/three.js/issues/33821)). ICS MEDIA's r176 benchmark found WebGL could draw ~2–4× more boxes at 60 fps ([ICS MEDIA, May 2025](https://ics.media/en/entry/250501/)). It also adds ~90 KB gz (*measured*: 226 KB vs 135 KB).
- **Verdict:** WebGPU buys compute shaders and modern post-processing. Ghar Jabo needs neither, so stay on `WebGLRenderer`. Revisit only if a feature needs compute, such as GPU crowds of thousands.

---

## 2. Supporting libraries

Sizes are *measured* (gz) unless stated otherwise. Dates are each package's last npm publish.

### Physics

| Library | Size | Status | Use for us? |
|---|---|---|---|
| **None (hand-rolled)** | 0 | n/a | **Yes.** Running, hopping on a bus, hanging off it, riding pillion and pushing through a crowd are all *kinematic* moves: attach to a parent transform, follow a spline, use AABB/circle overlap on a 2D grid. Most comparable games do this. Only Benglooru, with 18 drivable vehicles and fights, uses a physics engine. |
| `@dimforge/rapier3d-compat` 0.21.0 (25 Sep 2026) | **~1.65 MB** for the `-compat` build (wasm embedded as base64); **1.17 MB** for the bare `.wasm` | Active, deterministic, fast | Only if you add real vehicle driving or ragdolls. On its own it would be about 8× our current JS bundle. If you ever add it, lazy-load it after the first frame. |
| `cannon-es` 0.20.0 (Aug 2022) | 37 KB | **Unmaintained** for 4 years | No. If you need light physics later, prefer Rapier, or keep it hand-rolled. |

### ECS

| Library | Size | Notes |
|---|---|---|
| `bitecs` 0.4.0 (Dec 2025) | 6 KB | Fastest in the Oct 2026 Ritmo benchmark; low-level, typed-array style ([ritmo PR #77](https://github.com/typeonce-dev/ritmo/pull/77)) |
| `koota` 0.6.6 (6 Nov 2026) | 12 KB | pmndrs. About 1.5–2.6× slower than bitECS, actively maintained, React-oriented |
| `miniplex` 2.0.0 (Jul 2023) | 4 KB | Easiest API; much slower iteration; no release in 3 years |

**Recommendation: no ECS.** With 40 vehicles and 50 people, a typed array of plain objects per type (`vehicles: Vehicle[]`, updated in one loop) costs nothing and is easier for agents to read. Reach for bitECS only if entity counts go into the thousands.

### State, input and audio

- **State:** keep the current `state.ts` module. If UI and game state start to tangle, `zustand/vanilla` 5.1 (0.5 KB, 6 Nov 2026) gives subscribe-able state with no React. Don't add it pre-emptively.
- **Input:** `src/input.ts` already has a floating joystick on the left half plus keys. `nipplejs` 1.0.4 (May 2026, 6.5 KB) is the standard drop-in, but there's no reason to swap. `style.css` already sets `touch-action: manipulation` and `user-select: none`. Consider `touch-action: none` plus `-webkit-touch-callout: none` on the canvas so a joystick drag can never pan or trigger the long-press callout.
- **Audio:** the current synthesised WebAudio approach matches Bhaiya Bandra (synth engine + 1 horn sample) and needs no files. `howler` 2.2.4 (10 KB) hasn't been released since **Sep 2023**. Its main iOS value, the unlock-on-first-touch, you already do in `unlockAudio()`. One iOS trap is that **Web Audio is muted by the ringer/silent switch** while `<audio>` isn't ([howler #1436](https://github.com/goldfire/howler.js/issues/1436), [unmute-ios-audio](https://github.com/feross/unmute-ios-audio)). On Safari 17+ you can set `navigator.audioSession.type = 'playback'` (feature-test first) to play through the switch. Decide whether that's desirable, since many people play in silent mode on purpose. **No howler.**

### Asset pipeline (once `.glb` models arrive)

- **glTF/GLB only.** Run `@gltf-transform/cli` 4.5.1 (Sep 2026): `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2`. Meshopt is its default ([compress-glb guide](https://compress-glb.com/blog/gltf-transform-optimize/)).
- **Meshopt over Draco** for characters and anything animated. The meshopt decoder is ~8 KB gz vs Draco's ~100 KB gz, it decodes faster, and it compresses animation ([compress-glb: Draco vs Meshopt](https://compress-glb.com/blog/draco-vs-meshopt/), [AETumi](https://aetumi.app/news/draco-vs-meshopt/)). Fightkaro ships Draco plus 1.2 MB per fighter. Meshopt plus low-poly would be lighter.
- **KTX2 (Basis)** for any real texture. It's the only format that reduces **GPU memory** on iOS. WebP and PNG decode to the same RGBA size ([three.js forum on Safari crashes](https://discourse.threejs.org/t/safari-a-problem-repeatedly-occurred/85343)). With vertex colours and canvas-drawn signboards (512 px) you mostly don't need it yet.
- **OSM data:** keep pre-baking to JSON at build time (`sectorv.json` is 123 KB raw / 34 KB gz). If it grows, quantise coordinates to Int16 or ship a binary buffer.

### Debugging

- **`stats-gl`** 4.2.3 (Jul 2026, 10 KB): FPS plus CPU and GPU ms, and works with WebGL2. Gate it behind `?debug` and a dynamic import so it never reaches players.
- **`lil-gui`** 0.21 (8 KB): tuning panels for bus speed, timing windows and so on. Also dev-only.
- **`renderer.info`** (built in): draw calls, triangles, geometries and textures. Show it in the debug overlay and assert on it in tests (section 4).
- `three-perf` 1.0.11 (Jun 2025) is fine but adds little over stats-gl + `renderer.info`. `r3f-perf` is R3F-only.

---

## 3. iPhone Safari performance practices

### Draw calls, merging, instancing and culling
- **Budget: under ~100 draw calls and under ~100k vertices on a phone** ([Utsubo 100 tips, 2026](https://www.utsubo.com/blog/threejs-best-practices-100-tips)). We're at ~50, so keep a CI check on it.
- **Static scenery:** keep merging into vertex-coloured meshes. It already does the job (see the three.js manual on [optimising lots of objects](https://github.com/mrdoob/three.js/blob/dev/manual/pages/optimize-lots-of-objects.html)). Split the merged city into **spatial chunks** (e.g. 100 m tiles) instead of one giant mesh. Then frustum culling actually removes off-screen chunks, and you can drop far chunks.
- **40 vehicles and 50 people:** these are the next risk if each is a `Group` of several boxes, because each box is a draw call. Options:
  - `InstancedMesh` per part type (bus body, wheel, person torso, head). One draw call each, updated by writing matrices. Core `InstancedMesh` is culled as a whole, not per instance ([three.js #27170](https://github.com/mrdoob/three.js/issues/27170)).
  - `BatchedMesh` when the geometries differ but share one material. It has per-object frustum culling on by default and works in WebGLRenderer ([Codrops](https://tympanus.net/codrops/2024/10/30/interactive-3d-with-three-js-batchedmesh-and-webgpurenderer/)). Benglooru leans on this heavily.
  - The simplest win first: merge each vehicle's parts into **one geometry per vehicle type** with vertex colours, and share that geometry and material across all instances.
- **LOD:** at this scale, mostly "don't draw far stuff". Use fog plus a short camera `far` (Bhaiya Bandra uses fog to fade the far city cheaply) and skip NPC updates and animation beyond ~80 m.

### Memory, textures and pixel ratio
- iOS kills the tab with no event and no error when the web content process exceeds its memory budget. After repeat kills you see *"A problem repeatedly occurred"* ([three.js forum](https://discourse.threejs.org/t/safari-a-problem-repeatedly-occurred/85343)). Shadow maps of 4096² have triggered it, so **stay at 2048 or below**, ideally 1024 ([forum](https://discourse.threejs.org/t/a-problem-repeatedly-occurred-in-safari-when-shadow-map-size-too-big/44542)).
- Canvas size counts toward that budget. The current cap of **DPR 1.5 on phones** matches Fightkaro's. Add Delhi Metro-style **dynamic resolution** (drop toward 1.0 when frames run slow) rather than a fixed value.
- `antialias: false` on phones (already done) is right. At DPR 1.5, MSAA costs more than it buys.
- **`preserveDrawingBuffer: true` (currently set in `src/gfx.ts`) costs every frame**, especially on mobile ([Mapbox GL #2766](https://github.com/mapbox/mapbox-gl-js/issues/2766); [three.js tips example](https://github.com/mrdoob/three.js/blob/dev/manual/examples/tips-preservedrawingbuffer.html)). For the share-card screenshot, set it to `false` and capture **in the same frame**: call `renderer.render()`, then `canvas.toBlob()` (or render to a `WebGLRenderTarget` and read it back). This is the cheapest perf win in the codebase.
- Dispose geometries, materials and textures when a scene changes (`.dispose()`). Canvas-text textures for signboards and bus boards are easy to leak across restarts.

### GC churn and pooling
- No `new Vector3()`, `{}` or array literals, `.clone()` or closures in per-frame code. Keep module-level scratch vectors. The same rule appears in the R3F docs ([pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)).
- **Pool vehicles and pedestrians:** recycle a bus that leaves the far end to the near end instead of creating or removing objects. Pre-allocate toasts and particles too.
- Check with a Safari Timelines recording: if the JavaScript & Events lane shows sawtooth GC spikes during play, something is allocating.

### WebGL context loss on iOS
- Backgrounding Safari (switching to WhatsApp to share is exactly that) has caused `WebGL: context lost` on iOS 16.7–17.x ([WebKit bug 261331](https://bugs.webkit.org/show_bug.cgi?id=261331), [three.js forum](https://discourse.threejs.org/t/context-lost-when-backgrounding-safari-on-ios-17-developer-beta-8/55772), [Apple forums](https://developer.apple.com/forums/thread/737042)).
- What to do: listen for `webglcontextlost` (call `preventDefault()`, pause the loop) and `webglcontextrestored`. three.js `WebGLRenderer` re-initialises its state, but canvas-made textures must be re-uploaded (`needsUpdate = true`). If restore never fires, show a "Tap to continue" overlay that rebuilds the renderer, or just reload the run (runs are 2 minutes). Test it with `renderer.forceContextLoss()` and `forceContextRestore()`.
- Also pause the loop on `visibilitychange` (hidden). It saves battery and avoids a giant `dt` on return (the 0.05 s `dt` clamp in `main.ts` already helps).

### Battery, thermals and frame-rate caps
- **iOS caps `requestAnimationFrame` at 30 fps in Low Power Mode**, and you can't detect it. WebKit calls it intended behaviour and says something similar happens when the device is *"busy, warm, or low in memory"* ([WebKit bug 215745](https://bugs.webkit.org/show_bug.cgi?id=215745), [Motion.dev](https://motion.dev/magazine/when-browsers-throttle-requestanimationframe)). So:
  - always drive the simulation with real `dt`, never frame counts (already done);
  - make adaptive quality check that a downgrade actually helped before keeping it (Delhi Metro's trial logic) so a 30 fps cap doesn't trigger a pointless drop to low resolution;
  - consider a **fixed-step simulation (e.g. 30 or 60 Hz) with rendering decoupled from it**. That also gives determinism (section 4).
- A deliberate 30 fps cap on phones is a fair option for a 2-minute game if thermals become an issue. Measure first.
- Render the 3D scene less often while a full-screen DOM card covers it (Delhi Metro redraws ~4×/s).

### Measuring on a real iPhone
1. iPhone: Settings → Apps → Safari → Advanced → **Web Inspector** on. Plug into the Mac, open Safari → Develop → *[iPhone]* → page. On iOS 17 and earlier the toggle is under Settings → Safari → Advanced. See [What's new in Web Inspector, WWDC20](https://developer.apple.com/videos/play/wwdc2020/10646/) and [WebKit features in Safari 27.0](https://webkit.org/blog/18325/webkit-features-in-safari-27-0/), which lists recent fixes to Graphics-tab recording and Timelines.
2. **Timelines** tab, recorded during a run: look at **frame time** in the Rendering Frames view (bars over 16.7 ms or 33 ms), **JavaScript & Events** (long update loops, GC), **Memory** (steady growth means leaks), and **CPU / energy impact**.
3. **Graphics** tab: lists WebGL contexts and shaders, and can **record a frame's WebGL calls** (shift-click for one frame), which is handy for counting draw calls and finding redundant state changes ([WebKit canvas debugging](https://webkit.org/blog/8452/canvas-debugging/)). Close it while measuring, because recording itself costs frames.
4. In-game, a `?debug` overlay with stats-gl, `renderer.info.render.calls`, triangles, current DPR and JS heap where available. Test on the **oldest iPhone you care about** (e.g. an iPhone 11/12-class device), in **Low Power Mode**, and after 5 minutes of play to see thermal behaviour. The Mac (Apple silicon) is not representative.

---

## 4. Testing practices

- **Vitest** 5.1 (2 Nov 2026) for pure logic: the clock and fare system (`state.ts`), route cards and "lies" (`route.ts`), traffic spawning rules, rival behaviour, receipt and headline text (`text.ts`). Keep that logic free of three.js imports so tests run in Node in milliseconds. Agents are much more reliable when they can run `npm test` after each change.
- **Deterministic simulation:** `Math.random()` is called directly in `gfx.ts`, `audio.ts` and elsewhere. Replace gameplay randomness with **one seeded PRNG** (a 10-line mulberry32 or sfc32; there's no need for the `seedrandom` package, unchanged since 2022) passed around or held in run state. Benefits:
  - a run seed in the URL (`?seed=123`) reproduces bugs and lets people share a "same run, beat my time" challenge over WhatsApp;
  - Vitest can simulate a whole 2-minute run headlessly with fixed inputs and assert outcomes;
  - cosmetic randomness (camera shake, audio noise) can stay on `Math.random`.
  - Pair it with a fixed timestep so the same seed plus inputs gives the same run.
- **Playwright** 1.65 (8 Nov 2026) for smoke and screenshot tests:
  - Launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader`, because current Chrome no longer falls back to SwiftShader silently ([RenderScreenshot](https://renderscreenshot.com/glossary/webgl-headless), [Barth Cave: e2e for web games](https://barthpaleologue.github.io/Blog/posts/webgl-webgpu-playwright-setup/)). Check you actually got WebGL2 before asserting.
  - Have the game set `window.__ready = true` (or a `data-ready` attribute) after the first real frame, and wait on that, not on `load`, to avoid blank-canvas screenshots.
  - Use a fixed seed and a `?test` mode that freezes the clock, then `toHaveScreenshot()` per scene (lobby, city, station, result card) with a tolerance. Also run the **WebKit** project with an iPhone device profile for layout and DOM checks (WebKit here isn't real iOS GPU behaviour).
  - A smoke test can script a run with keyboard input, check it reaches the result screen with no console errors, and check the share image is produced.
  - On this box, SwiftShader is slow (~1 fps for heavy scenes in our earlier research), so keep screenshot tests to a few frames.
- **Perf budgets in CI** (GitHub Actions or a local pre-push):
  - **Bundle:** `size-limit` 14.3 (Oct 2026) on `dist/assets/*.js`, e.g. a limit of **250 KB gz** for the JS (currently 198 KB) and a total first-load budget under ~1 MB.
  - **Draw calls and triangles:** in Playwright, after loading each scene with a fixed seed, read `renderer.info.render.calls` and `.triangles` (exposed on `window.__gj` in test mode) and fail above e.g. **80 calls** and **150k triangles**. This catches the "1 fps again" regression before it reaches a phone.
  - Also expose and assert texture count and memory (`renderer.info.memory`) so leaks between restarts show up.

---

## 5. Recommendation

**Keep plain three.js (r187, `WebGLRenderer`) with Vite + TypeScript and the DOM overlay.** Reasons, against our constraints:

- **Phone-first:** WebGLRenderer is still the faster and recommended path for WebGL2-class scenes, and it's what all the comparable viral Indian browser games ship, including Fightkaro (r186) and Benglooru (r186). Every engine alternative adds 2–4× the JS (Babylon 343 KB, PlayCanvas 532 KB gz) or a 5–10 MB wasm runtime (Godot, Unity).
- **Small bundle:** we're at 198 KB gz for the whole game, about the size of Fightkaro's three.js chunk alone.
- **Fast iteration with AI agents:** three.js has the deepest pool of examples, so agents produce working code with less steering. React (R3F) or an editor-centric engine (PlayCanvas, Godot, Unity) adds layers agents get wrong or can't drive.
- **Working code:** the 1 fps problem was draw calls, not the library, and it's solved. A rewrite would cost weeks and gain nothing the player sees.

**Add (3–5):**
1. **Vitest** plus a **seeded PRNG** (own 10-line mulberry32) and a fixed-step sim, for logic tests, reproducible runs and `?seed=` share challenges.
2. **Playwright** smoke and screenshot tests, with **draw-call, triangle and texture budgets** read from `renderer.info`.
3. **size-limit** for a JS bundle budget (start at 250 KB gz).
4. **stats-gl** (+ `lil-gui` if you want tuning sliders), dev-only behind `?debug`.
5. When `.glb` characters and vehicles arrive: **`@gltf-transform/cli` with meshopt (+ KTX2 for textures)**, loaded through `GLTFLoader` + `MeshoptDecoder`. Not Draco.

**Don't add:** Rapier or cannon-es (moves are kinematic; Rapier is ~1.2 MB gz), an ECS (entity counts are tiny), React/R3F, howler (unmaintained since 2023, and WebAudio synthesis already works), nipplejs (we have our own joystick), or WebGPURenderer (experimental, and slower for this workload).

**Code changes worth doing next** (not made; `src/` was not touched):
1. Remove `preserveDrawingBuffer: true` and capture the share image in the same frame as `render()`.
2. Make each vehicle and person type one shared merged geometry, or an `InstancedMesh`/`BatchedMesh` per part, so 90 moving actors don't become hundreds of draw calls. Chunk the merged static city by area so culling works.
3. Add Delhi Metro-style dynamic resolution (DPR 1.5 → 1.0) that keeps a downgrade only if it actually helped.
4. Handle `webglcontextlost`/`restored` and `visibilitychange`, since the WhatsApp share flow backgrounds Safari.
5. Pool vehicles, pedestrians and toasts; no per-frame allocations.

---

### Sources checked directly on 8 Nov 2026
- Live bundles: `fightkaro.com/assets/three-C_nfZyvc.js` and `main-WqSJPJgL.js`; `benglooru.com/play/assets/three.core-Dp-eO7LC.js`, `perf-BdZwupmj.js`, `quality-BlrdkwGU.js` and `batch-cull-Bcs3MrxA.js`; `delhimetrogame.com/src/perf.js` and `vendor/three.module.min.js`. Requests used a contact URL (`https://boogles.dev`) in the User-Agent only.
- npm registry versions and dates via `npm view`; sizes via esbuild (method at the top).
- Ghar Jabo's own `dist/` build (198 KB gz JS) and `src/` (read-only).
