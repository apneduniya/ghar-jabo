// One control state for keyboard and touch: a move vector, jump, action and phone.
// On phones the left half of the screen is a floating joystick.

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

// Floating joystick: put a thumb down anywhere on the left half, drag to move.
const stick = { id: -1, ox: 0, oy: 0, x: 0, z: 0 };
let stickEl: HTMLElement | null = null;
let knobEl: HTMLElement | null = null;
let stickEnabled = false;

export function enableStick(on: boolean) {
  stickEnabled = on;
  if (!on) { stick.id = -1; stick.x = stick.z = 0; stickEl?.remove(); stickEl = null; }
}

function isUiTarget(t: EventTarget | null) {
  return t instanceof HTMLElement && !!t.closest('button, .phone, .card-wrap, .paper, .call');
}

addEventListener('pointerdown', (e) => {
  input.tap = true;
  if (!stickEnabled || stick.id !== -1 || isUiTarget(e.target)) return;
  if (e.clientX > innerWidth * 0.55) return;
  stick.id = e.pointerId;
  stick.ox = e.clientX;
  stick.oy = e.clientY;
  stickEl = document.createElement('div');
  stickEl.className = 'stick';
  stickEl.style.left = `${e.clientX}px`;
  stickEl.style.top = `${e.clientY}px`;
  knobEl = document.createElement('i');
  stickEl.appendChild(knobEl);
  document.getElementById('ui')!.appendChild(stickEl);
});

addEventListener('pointermove', (e) => {
  if (e.pointerId !== stick.id) return;
  const dx = e.clientX - stick.ox;
  const dy = e.clientY - stick.oy;
  const r = 55;
  const len = Math.min(r, Math.hypot(dx, dy));
  const a = Math.atan2(dy, dx);
  const kx = Math.cos(a) * len, ky = Math.sin(a) * len;
  if (knobEl) knobEl.style.transform = `translate(${kx}px, ${ky}px)`;
  stick.x = -ky / r; // screen up = forward along the road
  stick.z = kx / r;
});

const release = (e: PointerEvent) => {
  if (e.pointerId !== stick.id) return;
  stick.id = -1;
  stick.x = stick.z = 0;
  stickEl?.remove();
  stickEl = null;
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
