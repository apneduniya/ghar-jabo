// One control state for keyboard and touch: a move vector, jump, action and phone.
// On phones the lower-left of the screen is a floating joystick.

import { CONTROLS } from '../content/tuning';
import { clampBase, followBase, stickVector } from './stick';

export const input = {
  /** Move vector, x = along the road towards Sealdah (screen up), z = across the road (screen right). */
  mx: 0,
  mz: 0,
  jump: false,
  action: false,
  phone: false,
  /** Any tap this frame (used by simple tap prompts). */
  tap: false,
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
  return { x, z };
}

// Joystick: a resting stick is always on screen (bottom-left) on touch devices, so nobody has to guess it
// exists. It floats: a thumb landing anywhere in the lower-left area brings the base to the thumb, and
// dragging past the rim pulls the base along. Analog: a light push walks, the rim runs (input/stick.ts).
// Each finger is its own pointer, so the right thumb can jump or hop while the left one steers.
// Laptops get a key legend instead.
const stick = { id: -1, bx: 0, by: 0, hx: 0, hy: 0, x: 0, z: 0 };
let stickEl: HTMLElement | null = null;
let knobEl: HTMLElement | null = null;
let keysEl: HTMLElement | null = null;
let stickEnabled = false;
export const touchDevice = matchMedia('(pointer: coarse)').matches;

export function enableStick(on: boolean) {
  stickEnabled = on;
  stick.id = -1; stick.x = stick.z = 0;
  stickEl?.remove(); stickEl = null; keysEl?.remove(); keysEl = null;
  if (!on) return;
  const ui = document.getElementById('ui')!;
  if (touchDevice) {
    stickEl = document.createElement('div');
    stickEl.className = 'stick';
    stickEl.innerHTML = '<span class="ar u"></span><span class="ar d"></span><span class="ar l"></span><span class="ar r"></span><em>MOVE</em>';
    knobEl = document.createElement('i');
    stickEl.appendChild(knobEl);
    ui.appendChild(stickEl);
  } else {
    keysEl = document.createElement('div');
    keysEl.className = 'keys';
    keysEl.innerHTML = '<span><kbd>WASD</kbd> run</span><span><kbd>Space</kbd> jump</span><span><kbd>E</kbd> hop</span><span><kbd>P</kbd> Rapi-Nah</span><span><kbd>M</kbd> mute</span>';
    ui.appendChild(keysEl);
  }
}

function isUiTarget(t: EventTarget | null) {
  return t instanceof HTMLElement && !!t.closest('button, .phone, .card-wrap, .paper, .call, .minimap, .title-screen');
}

const rimPx = () => (stickEl?.offsetWidth || 124) * CONTROLS.rim; // the stick's size comes from style.css

addEventListener('pointerdown', (e) => {
  input.tap = true;
  if (!stickEnabled || !stickEl || stick.id !== -1 || isUiTarget(e.target)) return;
  // The left part of the screen, below the clock and the notifications.
  if (e.clientX > innerWidth * CONTROLS.stickZone[0] || e.clientY < innerHeight * CONTROLS.stickZone[1]) return;
  // The resting centre (offsetLeft/Top ignore transforms; #ui covers the viewport).
  stick.hx = stickEl.offsetLeft + stickEl.offsetWidth / 2;
  stick.hy = stickEl.offsetTop + stickEl.offsetHeight / 2;
  [stick.bx, stick.by] = clampBase(e.clientX, e.clientY, stickEl.offsetWidth / 2, innerWidth, innerHeight);
  stick.id = e.pointerId;
  stickEl.classList.add('active');
  move(e.clientX, e.clientY);
});

function move(cx: number, cy: number) {
  const rim = rimPx();
  [stick.bx, stick.by] = followBase(stick.bx, stick.by, cx, cy, rim);
  const dx = cx - stick.bx, dy = cy - stick.by;
  // No transitions while held: base and knob sit exactly where the thumb says.
  if (stickEl) stickEl.style.transform = `translate(${stick.bx - stick.hx}px, ${stick.by - stick.hy}px)`;
  if (knobEl) knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  const v = stickVector(dx, dy, rim);
  stick.x = v.fwd; // screen up = forward
  stick.z = v.right;
}

addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) move(e.clientX, e.clientY); });

const release = (e: PointerEvent) => {
  if (e.pointerId !== stick.id) return;
  stick.id = -1;
  stick.x = stick.z = 0;
  if (knobEl) knobEl.style.transform = '';
  if (stickEl) { stickEl.style.transform = ''; stickEl.classList.remove('active'); } // glides home (style.css)
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
}

/** Call at the end of each frame: clears one-shot presses. */
export function endFrame() {
  input.jump = input.action = input.phone = input.tap = false;
}

/** On-screen button that fires a one-shot input. */
export function pressButton(btn: HTMLElement, key: 'jump' | 'action' | 'phone') {
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); input[key] = true; });
}
