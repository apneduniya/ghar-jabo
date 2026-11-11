# 027: Fixed move stick, swipe-to-look camera

Goal: owner playtest (2026-11-12) of 024: "why is the circle of the move controller moving? Check how characters
actually move in games and how the camera moves. The camera should move by swinging/swiping in the right half of
the screen, not via the move command; the move stick's circle should not move: the dot should, but only inside
the circle. Research online or check other games."

Do (research first; write 5-10 lines in a Notes section here: e.g. PUBG/BGMI, Free Fire, Genshin, Fortnite mobile,
GTA SA mobile: fixed vs floating stick, look-drag sensitivity and its scaling by screen size, pitch limits,
inertia, auto-recentre or not, how movement is relative to the camera):
- **Move stick** (`src/input/stick.ts`, `src/input/input.ts`, CSS): the base never moves. A thumb landing anywhere
  in the left zone drives the knob from the fixed base centre; the knob is clamped to the rim. Keep the dead
  zone, the analog curve (walk/run) and multi-touch.
- **Look** (new, `src/input/look.ts` or in input.ts): a drag on the right half (outside buttons) turns the
  camera: yaw from horizontal drag, pitch from vertical drag within limits, sensitivity in degrees per screen
  fraction (so phones and tablets feel the same), light smoothing, no inertia fling unless the study says
  otherwise. Desktop: mouse drag on the canvas, plus Q/E or arrow keys if cheap.
- **Camera** (`src/stages/sectorv.ts` camera code; `src/sim/player.ts` StickFrame from 024): the camera no longer
  auto-turns from the move stick; it only turns when the player looks. Movement is relative to the camera's yaw
  at the moment (the latched StickFrame is no longer needed: remove it if it only served the auto-follow).
  Keep: following the vehicle's heading while riding a bus/bike (the player can still look around; it eases back
  after a few seconds without a look drag), staying under flyover decks/stations, the road nudge if it still
  helps (owner didn't complain about it).
- Tests: unit (look drag → yaw/pitch, clamps, sensitivity independent of screen width; stick base fixed, knob
  clamped) and e2e (two thumbs: left moves, right looks, jump button still works; right-half drag on a button
  does not look).
- Mac GPU screenshots at 390x844 portrait and 844x390 landscape.
Files you may touch: src/input/*, src/ui/style.css, src/ui/ui.ts (hints only), src/stages/sectorv.ts (camera and
intent code only), src/sim/player.ts (StickFrame/turning only), src/content/tuning.ts (CONTROLS block),
src/content/text.ts (control hints), tests/e2e/controls.spec.ts, tests.
Out of scope: traffic, world, trees.
