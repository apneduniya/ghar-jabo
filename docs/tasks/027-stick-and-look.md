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

## Notes (builder, 2026-11-12)
- Every reference game splits the screen: left thumb moves (virtual stick), right thumb swipes the camera
  (Genshin, GTA SA mobile, PUBG/BGMI, Free Fire); buttons sit on the right and a swipe that starts on a button
  doesn't look. Genshin: "swipe: camera rotation, virtual joystick: movement", walk/run by how far you push.
- Fixed vs floating: PUBG's layouts 1-2 bring the stick to wherever you touch the left half; layout 3 keeps it
  fixed, and guides for 4-finger players recommend the fixed one (thumb stays anchored, muscle memory). Free
  Fire's stick is a fixed HUD element you place and size in Custom HUD. Unity guides name three modes (fixed,
  dynamic = appears under the thumb then stays, floating = follows past the rim) and recommend fixed for action
  games. Owner asked for fixed: the base stays put; the knob follows the thumb and stops at the rim.
- Movement is relative to the camera's current yaw; the camera does not chase the run direction on foot (the
  owner's complaint). Genshin's only auto-camera options are opt-in (Y-axis reset on slopes, combat camera, boat
  correction): vehicles are the case where auto-follow is normal, so riding still eases behind the bus/bike
  after 3 s without a look drag.
- Sensitivity: games expose separate horizontal/vertical sliders, vertical usually lower. Open-source web
  games that fixed "too slow on phone" scaled by screen size (ONOSENDAI: 360° per full-width drag; others ~0.25°/px
  on touch, several times the mouse rate). We use degrees per screen *short side* (200° yaw, 110° pitch), so
  portrait, landscape and tablets turn alike for the same share of the screen: a quarter-width swipe ≈ 50°.
- Pitch clamped (our chase camera: -0.55..+0.45 rad around the default tilt); light 50 ms exponential smoothing,
  no inertia/fling (none of the references fling the camera after the thumb lifts).
- Sources: Unity Discussions "why are joystick controls so terrible on mobile", Terraria mobile touch-controls
  write-up (Medium), scriptsforunity.com touch input best practices, gamingonphone.com PUBG joystick guide,
  answeroverflow PUBG joystick thread, Genshin fandom wiki Settings/Controls, Android Authority GTA SA review,
  GitHub PRs arkin0x/ONOSENDAI#454, hexenwail#444, stlim0727/flight3d#206.
