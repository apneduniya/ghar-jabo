// One control state for keyboard and touch: a move vector, a look turn, jump, action and phone.
// On phones the lower-left of the screen is a fixed thumb stick and a drag on the right half turns the camera.

import { CONTROLS } from '../content/tuning';
import { clampKnob, stickVector } from './stick';
import { lookDelta } from './look';

export const input = {
  /** Move vector, x = along the road towards Sealdah (screen up), z = across the road (screen right). */
  mx: 0,
  mz: 0,
  jump: false,
  action: false,
  phone: false,
  /** Any tap this frame (used by simple tap prompts). */
  tap: false,
  /** Look turn gathered since the last frame (radians; yaw + = right, pitch + = up), from drags. */
  lookYaw: 0,
  lookPitch: 0,
  /** Keyboard look, held: -1 (J, turn left), 0, 1 (L, turn right). */
  turn: 0,
};

const keys = new Set<string>();

addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  keys.add(k);
  if (k === ' ') { input.jump = true; e.preventDefault(); }
  if (k === 'e' || k === 'enter') input.action = true;
  if (k === 'p') input.phone = true;
  input.tap = true;
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function keyVector() {
  let x = 0, z = 0;
  if (keys.has('w') || keys.has('arrowup')) x += 1;
  if (keys.has('s') || keys.has('arrowdown')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) z += 1;
  if (keys.has('a') || keys.has('arrowleft')) z -= 1;
  return { x, z, turn: (keys.has('l') ? 1 : 0) - (keys.has('j') ? 1 : 0) };
}

// Joystick (task 027): a fixed stick, always on screen bottom-left on touch devices. The base never moves: a
// thumb landing anywhere in the lower-left area drives the knob from the base centre, and the knob stays
// inside the rim. Analog: a light push walks, the rim runs (input/stick.ts).
// Look: a drag that starts on the right half (not on a button) turns the camera (input/look.ts); on a laptop,
// a mouse drag anywhere on the scene does. Each finger is its own pointer, so one thumb steers while the
// other looks or jumps. Laptops get a key legend instead of the stick.
const stick = { id: -1, x: 0, z: 0 };
const look = { id: -1, x: 0, y: 0 };
let stickEl: HTMLElement | null = null;
let knobEl: HTMLElement | null = null;
let keysEl: HTMLElement | null = null;
let tipEl: HTMLElement | null = null;
/** Whether the player has looked around yet this session (the right-half cue goes once they have). */
let looked = false;
let stickEnabled = false;
export const touchDevice = matchMedia('(pointer: coarse)').matches;

export function enableStick(on: boolean) {
  stickEnabled = on;
  stick.id = look.id = -1; stick.x = stick.z = 0;
  stickEl?.remove(); stickEl = null; keysEl?.remove(); keysEl = null; tipEl?.remove(); tipEl = null;
  if (!on) return;
  const ui = document.getElementById('ui')!;
  if (touchDevice) {
    stickEl = document.createElement('div');
    stickEl.className = 'stick';
    stickEl.innerHTML = '<span class="ar u"></span><span class="ar d"></span><span class="ar l"></span><span class="ar r"></span><em>MOVE</em>';
    knobEl = document.createElement('i');
    stickEl.appendChild(knobEl);
    ui.appendChild(stickEl);
    if (!looked) {
      tipEl = document.createElement('div');
      tipEl.className = 'look-tip';
      tipEl.textContent = '‹ DRAG HERE TO LOOK ›';
      ui.appendChild(tipEl);
    }
  } else {
    keysEl = document.createElement('div');
    keysEl.className = 'keys';
    keysEl.innerHTML = '<span><kbd>WASD</kbd> run</span><span><kbd>J L</kbd> or drag: look</span><span><kbd>Space</kbd> jump</span><span><kbd>E</kbd> hop</span><span><kbd>P</kbd> Rapi-Nah</span><span><kbd>M</kbd> mute</span>';
    ui.appendChild(keysEl);
  }
}

function isUiTarget(t: EventTarget | null) {
  return t instanceof HTMLElement && !!t.closest('button, .phone, .card-wrap, .paper, .call, .minimap, .title-screen');
}

const rimPx = () => (stickEl?.offsetWidth || 124) * CONTROLS.rim; // the stick's size comes from style.css

addEventListener('pointerdown', (e) => {
  input.tap = true;
  if (!stickEnabled || isUiTarget(e.target)) return;
  const mouse = e.pointerType === 'mouse';
  // Touch: the left part of the screen below the clock and notifications steers; the right half looks.
  const inStick = e.clientX < innerWidth * CONTROLS.stickZone[0] && e.clientY > innerHeight * CONTROLS.stickZone[1];
  if (!mouse && stickEl && stick.id === -1 && inStick) {
    stick.id = e.pointerId;
    stickEl.classList.add('active');
    move(e.clientX, e.clientY);
    return;
  }
  if (look.id === -1 && (mouse || e.clientX >= innerWidth * CONTROLS.lookZone)) {
    look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY;
  }
});

function move(cx: number, cy: number) {
  if (!stickEl) return;
  // The base is fixed: offsetLeft/Top give its centre (#ui covers the viewport).
  const rim = rimPx();
  const dx = cx - (stickEl.offsetLeft + stickEl.offsetWidth / 2), dy = cy - (stickEl.offsetTop + stickEl.offsetHeight / 2);
  const [kx, ky] = clampKnob(dx, dy, rim);
  if (knobEl) knobEl.style.transform = `translate(${kx}px, ${ky}px)`;
  const v = stickVector(dx, dy, rim);
  stick.x = v.fwd; // screen up = forward
  stick.z = v.right;
}

addEventListener('pointermove', (e) => {
  if (e.pointerId === stick.id) move(e.clientX, e.clientY);
  else if (e.pointerId === look.id) {
    // A mouse let go outside the window never sends pointerup: stop looking at the next plain move.
    if (e.pointerType === 'mouse' && !e.buttons) { look.id = -1; return; }
    const [dy, dp] = lookDelta(e.clientX - look.x, e.clientY - look.y, innerWidth, innerHeight);
    input.lookYaw += dy; input.lookPitch += dp;
    look.x = e.clientX; look.y = e.clientY;
    if (!looked && (dy || dp)) { looked = true; tipEl?.classList.add('gone'); }
  }
});

const release = (e: PointerEvent) => {
  if (e.pointerId === look.id) look.id = -1;
  if (e.pointerId !== stick.id) return;
  stick.id = -1;
  stick.x = stick.z = 0;
  if (knobEl) knobEl.style.transform = ''; // springs back to the centre (style.css)
  stickEl?.classList.remove('active');
};
addEventListener('pointerup', release);
addEventListener('pointercancel', release);

/** Call once per frame before the scene update. */
export function readInput() {
  const k = keyVector();
  let x = k.x + stick.x;
  let z = k.z + stick.z;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  input.mx = x;
  input.mz = z;
  input.turn = k.turn;
}

/** Call at the end of each frame: clears one-shot presses and the look turn already applied. */
export function endFrame() {
  input.jump = input.action = input.phone = input.tap = false;
  input.lookYaw = input.lookPitch = 0;
}

/** On-screen button that fires a one-shot input. */
export function pressButton(btn: HTMLElement, key: 'jump' | 'action' | 'phone') {
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); input[key] = true; });
}
