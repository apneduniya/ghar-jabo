// Title screen over the live 3D street (the game's own scene in "attract" mode).
// One big play button, the premise in a line, and a four-icon how-to-play. No menus.

import { el, root } from './ui';
import { touchDevice } from '../input/input';
import { loadRecords } from '../app/records';
import { clockText, type PlayMode } from '../sim/run';

const took = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`);

export function showTitle(opts: { seed: number | null; onPlay: (mode: PlayMode) => void }): () => void {
  const rec = loadRecords();
  const t = el('div', 'title-screen');
  t.innerHTML = `
    <header class="logo">
      <h1>GHAR<br/>JABO</h1>
      <div class="bn">ঘর যাবো</div>
      <p>6:30 PM, Salt Lake Sector V.<br/><b>Get home to Sealdah.</b> Everything will go wrong.</p>
    </header>
    ${opts.seed ? `<div class="challenge">🔁 Challenge run: same evening, same traffic as your friend's. Beat their time.</div>` : ''}
    <section class="howto">
      <div><i>🕹️</i><b>Run</b><span>${touchDevice ? 'Left thumb' : 'WASD'}</span></div>
      <div><i>🚌</i><b>Hop buses</b><span>Catch them moving</span></div>
      <div><i>📱</i><b>Rapi-Nah</b><span>It will cancel</span></div>
      <div><i>🚇</i><b>Metro</b><span>Wipro More</span></div>
    </section>`;
  const modes = el('div', 'modes');
  const play = el('button', 'play-btn', `<b>⏱ BEFORE 10:30</b><small>Beat the clock${rec.timedBest ? ` · best ${clockText(rec.timedBest)}` : ' · 4 min'}</small>`);
  const free = el('button', 'play-btn free', `<b>🌙 FREE ROAM</b><small>No deadline. Nights pass${rec.freeBest !== undefined ? ` · best ${took(rec.freeBest)}` : ''}</small>`);
  play.onclick = () => { close(); opts.onPlay('timed'); };
  free.onclick = () => { close(); opts.onPlay('free'); };
  modes.append(play, free);
  const foot = el('div', 'title-foot', '🔊 Sound on · Real streets from OpenStreetMap');
  // A soft tip, never a block: WhatsApp opens links in portrait, and iPhones can't be forced to rotate.
  const rotate = el('div', 'rotate-tip', '📱↻ Best sideways: wider street, more buses in view');
  t.append(rotate, modes, foot);
  root.appendChild(t);
  const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
  return close;
}
