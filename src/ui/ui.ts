// DOM overlay: HUD, notification stream, trade-off cards, action buttons and hints.

import { clockText, type Run } from '../sim/run';
import { sfx } from '../audio/audio';
import { timeLeftFraction, timeLeftText, tookText } from './format';

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

// HUD. Every element has a home corner (see "Layout" in style.css):
//  top-left: mode tag, clock (with the day in free roam), deadline bar or time out, place name.
//  top-right: money and dignity. The minimap, notification stream and Ma's call have their own slots.

let hud: HTMLElement | null = null;
let hudMode: Run['mode'] | null = null;

export function showHud(show: boolean) {
  if (show && !hud) {
    hud = el('div', 'hud');
    hud.innerHTML = `
      <div class="hud-tl">
        <div class="hud-card"><em class="hud-mode"></em><div class="hud-clock"></div><div class="hud-cue"><i><b></b></i><span></span></div></div>
        <div class="hud-date">SALT LAKE SECTOR V</div>
      </div>
      <div class="hud-tr">
        <div class="hud-money"></div>
        <div class="hud-dig"><span>DIGNITY</span><i><b></b></i></div>
      </div>`;
    root.appendChild(hud);
    hudMode = null;
  } else if (!show && hud) {
    hud.remove();
    hud = null;
  }
}

export function updateHud(run: Run) {
  if (!hud) return;
  const free = run.mode === 'free';
  if (hudMode !== run.mode) {
    hudMode = run.mode;
    hud.classList.toggle('free', free);
    hud.querySelector('.hud-mode')!.textContent = free ? '🌙 FREE ROAM' : '⏱ HOME BY 10:30';
  }
  const clock = clockText(run.minute, free);
  const c = hud.querySelector<HTMLElement>('.hud-clock')!;
  if (c.textContent !== clock) {
    // Free roam: "Day 2 ·" small in front of the time; textContent stays "Day 2 · 1:14 AM".
    const dot = clock.indexOf(' · ');
    c.innerHTML = dot > 0 ? `<small>${clock.slice(0, dot + 3)}</small>${clock.slice(dot + 3)}` : clock;
  }
  const cue = hud.querySelector<HTMLElement>('.hud-cue span')!;
  const cueText = free ? `Out for ${tookText(run.elapsed)}` : timeLeftText(run.minute);
  if (cue.textContent !== cueText) cue.textContent = cueText;
  if (!free) hud.querySelector<HTMLElement>('.hud-cue b')!.style.width = `${timeLeftFraction(run.minute) * 100}%`;
  hud.querySelector<HTMLElement>('.hud-money')!.textContent = `₹${run.money}`;
  hud.querySelector<HTMLElement>('.hud-dig b')!.style.width = `${run.dignity}%`;
  hud.classList.toggle('late', !free && run.minute > 21 * 60 + 30);
}

export function setDateline(text: string) {
  const d = hud?.querySelector<HTMLElement>('.hud-date');
  if (d) d.textContent = text;
}

// Notification stream: one column for app pings, ticker headlines and Ma's call. Its slot never covers
// the clock or the minimap (see style.css). Newest on top; Ma's call is pinned above the rest.

let stream: HTMLElement | null = null;

export function streamEl(): HTMLElement {
  if (!stream || !stream.isConnected) {
    stream = el('div', 'stream');
    root.appendChild(stream);
  }
  return stream;
}

export function notify(title: string, body = '', kind: 'app' | 'metro' | 'news' | 'bad' | 'good' = 'app') {
  const s = streamEl();
  const n = el('div', `note note-${kind}`);
  const label = kind === 'news' ? 'BREAKING' : kind === 'app' ? 'Rapi-Nah' : kind === 'metro' ? '📢 Metro' : '';
  n.innerHTML = `${label ? `<em>${label}</em>` : ''}<strong>${title}</strong>${body ? `<span>${body}</span>` : ''}`;
  s.prepend(n);
  if (kind === 'news') sfx.sting();
  const notes = s.querySelectorAll('.note');
  for (let i = 3; i < notes.length; i++) notes[i].remove();
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
