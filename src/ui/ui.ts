// DOM overlay: HUD, notification stream, trade-off cards, action buttons and hints.

import { clockText, type Run } from '../sim/run';
import { sfx } from '../audio/audio';

export const root = document.getElementById('ui')!;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function clearLayer(layer: HTMLElement) { while (layer.firstChild) layer.firstChild.remove(); }

/** A per-scene layer that is removed when the scene exits. */
export function sceneLayer(): HTMLElement {
  const l = el('div', 'layer');
  root.appendChild(l);
  return l;
}

// HUD: clock, dateline, money and dignity.

let hud: HTMLElement | null = null;

export function showHud(show: boolean) {
  if (show && !hud) {
    hud = el('div', 'hud');
    hud.innerHTML = `
      <div class="hud-left"><div class="hud-clock"></div><div class="hud-date">SALT LAKE SECTOR V</div></div>
      <div class="hud-right">
        <div class="hud-money"></div>
        <div class="hud-dig"><span>DIGNITY</span><i><b></b></i></div>
      </div>`;
    root.appendChild(hud);
  } else if (!show && hud) {
    hud.remove();
    hud = null;
  }
}

export function updateHud(run: Run) {
  if (!hud) return;
  hud.querySelector<HTMLElement>('.hud-clock')!.textContent = clockText(run.minute);
  hud.querySelector<HTMLElement>('.hud-money')!.textContent = `₹${run.money}`;
  hud.querySelector<HTMLElement>('.hud-dig b')!.style.width = `${run.dignity}%`;
  hud.classList.toggle('late', run.minute > 21 * 60);
}

export function setDateline(text: string) {
  const d = hud?.querySelector<HTMLElement>('.hud-date');
  if (d) d.textContent = text;
}

// Notification stream: app pings and ticker headlines stack under the HUD.

let stream: HTMLElement | null = null;

export function notify(title: string, body = '', kind: 'app' | 'metro' | 'news' | 'bad' | 'good' = 'app') {
  if (!stream) {
    stream = el('div', 'stream');
    root.appendChild(stream);
  }
  const n = el('div', `note note-${kind}`);
  const label = kind === 'news' ? 'BREAKING' : kind === 'app' ? 'Rapi-Nah' : kind === 'metro' ? '📢 Metro' : '';
  n.innerHTML = `${label ? `<em>${label}</em>` : ''}<strong>${title}</strong>${body ? `<span>${body}</span>` : ''}`;
  stream.prepend(n);
  if (kind === 'news') sfx.sting();
  while (stream.children.length > 3) stream.lastElementChild!.remove();
  setTimeout(() => n.classList.add('out'), 3800);
  setTimeout(() => n.remove(), 4300);
}

/** Big centre punchline: "DHADAK! · Pothole. KMC sends regards." */
export function toast(title: string, line = '') {
  const t = el('div', 'toast', `<b>${title}</b>${line ? `<span>${line}</span>` : ''}`);
  root.appendChild(t);
  setTimeout(() => t.classList.add('out'), 1500);
  setTimeout(() => t.remove(), 1900);
}

export function hint(text: string) {
  let h = root.querySelector<HTMLElement>('.hint');
  if (!text) { h?.remove(); return; }
  if (!h) { h = el('div', 'hint'); root.appendChild(h); }
  h.textContent = text;
}

export function shakeUi() {
  root.classList.remove('shake');
  void root.offsetWidth;
  root.classList.add('shake');
  navigator.vibrate?.(80);
}



export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
