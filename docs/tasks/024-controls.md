# 024: Controls that feel like every other phone game; no Dignity; dividers block you

Goal: owner playtest (2026-11-11): "the move control button isn't functioning normally as every other game do,
it's very stiff and not a great UX, study and fix this; have an icon for the jump button; why do we need dignity?
it will be more of a burden"; "near the college, I can walk across the divider".

Study first (write 5-10 lines in the spec's notes section on what good mobile 3D games do: floating vs fixed
stick, dead zone, analog run/walk, camera behaviour), then implement:
- **Joystick** (`src/input/input.ts`, `src/ui/style.css`): floating stick: the base appears where the thumb
  lands in the left area and follows the thumb if it drags past the rim; small dead zone (~10%) and a smooth
  response curve; analog magnitude (light push = walk, full = run), no CSS transition lag on the knob; works with
  multi-touch while the right thumb presses jump/hop. Keep the always-visible resting stick so new players see it.
- **Camera vs stick** (`src/stages/sectorv.ts` camera yaw and intent mapping): today the camera auto-turns
  toward the run direction (`yaw += d * dt * 1.8`), which also rotates what "up" means, so holding the stick
  sideways makes the player spiral and feel stiff. Make movement predictable: the character turns smoothly
  toward the input (no instant heading snap), and the camera follows gently without fighting the stick (e.g.
  only recentre behind the player when moving mostly forward, or after a short delay). Running "up" must follow the road.
  The player's turn should be smooth in `src/sim/player.ts` (heading interpolation), not snap.
- **Jump button**: an icon (inline SVG, e.g. an up chevron over a little figure), not the word; also clean
  icons for the hop/action and phone buttons if they help. Thumb-sized, safe-area aware.
- **Remove Dignity entirely**: HUD bar (`src/ui/ui.ts`, CSS), `Run.dignity`/`hurtDignity` (`src/sim/run.ts`),
  callers in `src/sim/world.ts`, `src/sim/hits.ts`, `src/stages/station.ts`, the result screen row
  (`src/stages/result.ts`), any text lines that mention it in `src/content/text.ts`, tests.
- **Dividers block walking**: medians (`medians()` in `src/sim/streetlife.ts`, laid out in
  `src/sim/streetlayout.ts`) must be solid for the player except at their gaps (junctions, U-turn gaps) — add
  them to the street collision. Also check the streamed world's medians if any. Test near College More/TIU.
Acceptance:
- [ ] e2e/unit tests: stick dead zone and magnitude; dignity gone (no HUD element, no field); a walk across a
  median at College More is blocked, a walk through a junction gap is not.
- [ ] Mac GPU screenshots at iPhone size (390x844) of the HUD with the new stick and buttons.
- [ ] Budgets unchanged; `npm run check` green.
Files you may touch: src/input/*, src/ui/*, src/stages/sectorv.ts (camera/intent code only), src/stages/result.ts,
src/stages/station.ts (dignity only), src/sim/player.ts, src/sim/run.ts, src/sim/hits.ts, src/sim/world.ts
(dignity + walkBlocked only), src/sim/streetlayout.ts, src/sim/streetlife.ts (collision only), src/content/text.ts,
src/content/tuning.ts (append only), tests/e2e/*, tests.
Out of scope: traffic (023), pedestrian/player animation (025).
