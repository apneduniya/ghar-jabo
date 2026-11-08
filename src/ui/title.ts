// Title screen over the live 3D street (the game's own scene in "attract" mode).
// Logo and a one-line premise up top, the street in the middle, two mode cards (with your bests)
// and a compact how-to at thumb height. Sound toggle in the corner; the free-roam diary opens as a sheet.

import { el, root } from './ui';
import { touchDevice } from '../input/input';
import { loadRecords, type Records } from '../app/records';
import { clockText, type PlayMode } from '../sim/run';
import { isMuted, toggleMute } from '../audio/audio';
import { titleCopy as T } from '../content/text';
import { tookText } from './format';

const HOW: Record<string, string> = { walk: '🚶 on foot', bus: '🚌 bus', metro: '🚇 metro', rapinah: '🛵 Rapi-Nah' };

export function showTitle(opts: { seed: number | null; onPlay: (mode: PlayMode) => void }): () => void {
  const rec = loadRecords();
  const t = el('div', 'title-screen');
  const howto = [['🕹️', 'Run', touchDevice ? 'Left thumb' : 'WASD'], ...T.howto];
  t.innerHTML = `
    <header class="logo">
      <h1><span>GHAR</span> <span>JABO</span></h1>
      <div class="bn">ঘর যাবো</div>
      <p>${T.premise}</p>
    </header>
    <div class="title-main">
      ${opts.seed ? `<div class="challenge">🔁 ${T.challenge}</div>` : ''}
      <div class="modes"></div>
      <section class="howto">${howto.map(([i, b, s]) => `<div><i>${i}</i><b>${b}</b><span>${s}</span></div>`).join('')}</section>
      <div class="title-foot"><span>${T.credit}</span></div>
      <div class="rotate-tip">📱↻ ${T.rotate}</div>
    </div>`;

  const play = modeCard('play-btn', '⏱', T.timed, rec.timedBest !== undefined ? clockText(rec.timedBest) : '');
  const free = modeCard('play-btn free', '🌙', T.free, rec.freeBest !== undefined ? tookText(rec.freeBest) : '');
  play.onclick = () => { close(); opts.onPlay('timed'); };
  free.onclick = () => { close(); opts.onPlay('free'); };
  t.querySelector('.modes')!.append(play, free);

  if (rec.diary.length) {
    const d = el('button', 'diary-btn', `📖 ${T.diaryTitle} <small>${rec.diary.length}</small>`);
    d.onclick = () => openDiary(t, rec);
    t.querySelector('.title-foot')!.prepend(d);
  }

  const sound = el('button', 'sound-btn');
  const paint = () => { sound.textContent = isMuted() ? '🔇' : '🔊'; sound.setAttribute('aria-label', isMuted() ? 'Sound off' : 'Sound on'); };
  sound.onclick = () => { toggleMute(); paint(); };
  addEventListener('keydown', paint); // M also mutes
  paint();
  t.prepend(sound);

  root.appendChild(t);
  const close = () => {
    removeEventListener('keydown', paint);
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  };
  return close;
}

function modeCard(cls: string, icon: string, m: { name: string; line: string }, best: string) {
  return el('button', cls, `
    <i>${icon}</i>
    <span class="mc-txt"><b>${m.name}</b><small>${m.line}</small></span>
    <span class="mc-best">${best ? `<em>BEST</em>${best}` : '<em>PLAY</em>▶'}</span>`);
}

function openDiary(t: HTMLElement, rec: Records) {
  const sheet = el('div', 'diary');
  const rows = rec.diary.map((d) => `<li><b>${d.reached}</b><span>${tookText(d.took)} · ${HOW[d.how] ?? d.how}</span><time>${d.on}</time></li>`).join('');
  sheet.innerHTML = `<div class="diary-card"><h2>📖 ${T.diaryTitle}</h2>${rows ? `<ol>${rows}</ol>` : `<p>${T.diaryEmpty}</p>`}</div>`;
  const x = el('button', 'diary-x', '✕');
  x.setAttribute('aria-label', 'Close');
  x.onclick = () => sheet.remove();
  sheet.onclick = (e) => { if (e.target === sheet) sheet.remove(); };
  sheet.firstElementChild!.prepend(x);
  t.appendChild(sheet);
}
