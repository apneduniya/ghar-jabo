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

// Joystick: always on screen (bottom-left) on touch devices, so nobody has to guess it exists.
// A thumb anywhere on the left half drives it; the knob moves from the fixed base. Laptops get a key legend.
const stick = { id: -1, ox: 0, oy: 0, x: 0, z: 0 };
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
    stickEl.innerHTML = '<span class="ar u">▲</span><span class="ar d">▼</span><span class="ar l">◀</span><span class="ar r">▶</span><em>MOVE</em>';
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

addEventListener('pointerdown', (e) => {
  input.tap = true;
  if (!stickEnabled || !stickEl || stick.id !== -1 || isUiTarget(e.target)) return;
  if (e.clientX > innerWidth * 0.55) return;
  const r = stickEl.getBoundingClientRect();
  stick.id = e.pointerId;
  stick.ox = r.left + r.width / 2;
  stick.oy = r.top + r.height / 2;
  stickEl.classList.add('active');
  move(e.clientX, e.clientY);
});

function move(cx: number, cy: number) {
  const dx = cx - stick.ox, dy = cy - stick.oy;
  const r = (stickEl?.offsetWidth || 128) * 0.4; // the stick's size comes from the layout (style.css)
  const len = Math.min(r, Math.hypot(dx, dy));
  const a = Math.atan2(dy, dx);
  const kx = Math.cos(a) * len, ky = Math.sin(a) * len;
  if (knobEl) knobEl.style.transform = `translate(${kx}px, ${ky}px)`;
  stick.x = -ky / r; // screen up = forward
  stick.z = kx / r;
}

addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) move(e.clientX, e.clientY); });

const release = (e: PointerEvent) => {
  if (e.pointerId !== stick.id) return;
  stick.id = -1;
  stick.x = stick.z = 0;
  if (knobEl) knobEl.style.transform = '';
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
}

/** Call at the end of each frame: clears one-shot presses. */
export function endFrame() {
  input.jump = input.action = input.phone = input.tap = false;
}

/** On-screen button that fires a one-shot input. */
export function pressButton(btn: HTMLElement, key: 'jump' | 'action' | 'phone') {
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); input[key] = true; });
}
