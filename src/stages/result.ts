// The ending: a "Sector V Samachar" front page built from the run, shareable as an image.

import type { Scene } from '../app/game';
import { game } from '../app/game';
import { sceneLayer, el, showHud } from '../ui/ui';
import { clockText, END_MIN, START_MONEY, type Run } from '../sim/run';
import { editionLine, eiTakay, endingTitles, headline, quote, rankTitle } from '../content/text';
import { tookText } from '../ui/format';
import { sfx } from '../audio/audio';
import { isHomeEnding } from '../audio/mix';

const SITE = 'gharjabo.boogles.dev';

export function result(): Scene {
  const run = game.run;
  let layer: HTMLElement;
  return {
    enter() {
      run.clockRunning = false;
      showHud(false);
      document.querySelectorAll('.call, .stream').forEach((n) => n.remove());
      const title = endingTitles[run.ending ?? 'home'];
      // No dramatic moment captured? Use the last frame on screen.
      const photo = run.photo ?? { dataUrl: '', drama: 0, burst: 'EXCLUSIVE' };
      const q = quote(run);
      const pollLine = poll(run);
      const paper = buildPaper(run, title, photo.dataUrl, photo.burst, q, pollLine);
      layer = sceneLayer();
      layer.classList.add('result');
      layer.appendChild(paper);
      // Buttons sit in a bar pinned to the bottom (portrait) or a rail on the right (landscape): always reachable.
      const btns = el('div', 'result-btns');
      const share = el('button', 'cholo', 'Share 📤');
      const save = el('button', 'ghost', 'Save 💾');
      const again = el('button', 'ghost again', 'Abar cholo ↺');
      share.onclick = () => void shareImage(run, title, photo.dataUrl, photo.burst, q, true);
      save.onclick = () => void shareImage(run, title, photo.dataUrl, photo.burst, q, false);
      again.onclick = () => { sfx.tap(); game.newRun(); };
      btns.append(share, save, again);
      layer.appendChild(btns);
      setTimeout(() => sfx.sting(), 300);
      if (isHomeEnding(run.ending)) setTimeout(() => sfx.dhaak(), 900);
    },
    update() {},
    exit() { layer.remove(); },
  };
}

function today() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** The big line under the headline: where and when you got, and how long it took. */
function arrival(run: Run): [string, string] {
  const free = run.mode === 'free';
  if (run.ending === 'still-sector-v') return [`Still in Sector V at ${clockText(free ? run.minute : END_MIN, free)}`, 'Never reached'];
  if (run.ending === 'howrah-express') return ['Reached Howrah 😴', `Out for ${tookText(run.elapsed)}`];
  return [`Reached ${clockText(run.minute, free)}`, `Took ${tookText(run.elapsed)}`];
}

function stats(run: Run): [string, string][] {
  const s = run.stats;
  return [
    ['Rides cancelled', String(s.cancels)],
    ['Money left', `₹${run.money}`],
    ['Footboard stops', String(s.footboardStops)],
    ['Seat found', s.gaveSeat ? 'Gave it to Mashima' : s.seatFound ? 'Yes (!)' : 'No'],
    ['Ma\'s missed calls', String(s.momMissed)],
  ];
}

function poll(run: Run) {
  const chance = run.ending === 'still-sector-v' ? 3 : Math.round(40 + Math.random() * 50);
  const surge = (1 + run.jam * 0.8).toFixed(1);
  const total = chance + Math.round(30 + Math.random() * 40);
  return `Ghar pouchhano chance ${chance}% · Rapi-Nah surge ${surge}x · Total ${total}% · Margin of error ±100%`;
}

type Quote = { text: string; who: string };

function buildPaper(run: Run, title: string, photo: string, burst: string, q: Quote, pollLine: string): HTMLElement {
  const p = el('article', 'paper');
  const arr = arrival(run);
  p.innerHTML = `
    <header>
      <div class="ear">Jol ashe-jay.<br/>Bus thame na.</div>
      <h2>SECTOR V SAMACHAR</h2>
      <div class="ear">Rapi-Nah kobe ashbe<br/>jani na.</div>
    </header>
    <div class="dateline">${today()} · Price ₹5 · <b>${editionLine[run.mode]}</b> · The voice of people stuck at College More</div>
    <div class="pcol">
    <h3>${headline(run)}</h3>
    <figure ${photo ? '' : 'hidden'}>
      <img src="${photo}" alt="" />
      <span class="burst">${burst}</span>
      <span class="stamp">${title}</span>
      <figcaption>Photo by a passer-by who filmed instead of helping.</figcaption>
    </figure>
    </div>
    <div class="pcol">
    <div class="band"><em>${run.mode === 'free' ? '🌙 FREE ROAM' : '⏱ BEFORE 10:30'}</em><b>${arr[0]}</b><span>${arr[1]}</span></div>
    <div class="cols">
      <blockquote>“${q.text}”<cite>${q.who}</cite></blockquote>
      <div class="box"><b>EI TAKAY HOTO</b>${eiTakay(START_MONEY - run.money)}</div>
    </div>
    <div class="poll">${pollLine}</div>
    <dl class="stats">${stats(run).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <footer><b>${rankTitle(run)}</b> · Tumi parbe? Same evening, same traffic: <b>${SITE}/?seed=${run.seed}</b></footer>
    </div>`;
  return p;
}

/** Draw the front page onto a 1080×1350 canvas and share or save it as a PNG. */
async function shareImage(run: Run, title: string, photo: string, burst: string, q: Quote, share: boolean) {
  sfx.tap();
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#f4ecd8';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#1b1b1b';
  g.textAlign = 'center';
  g.font = 'bold 84px Georgia, serif';
  g.fillText('SECTOR V SAMACHAR', W / 2, 110);
  g.font = '26px Georgia, serif';
  g.fillText(`${today()} · Price ₹5 · ${editionLine[run.mode]}`, W / 2, 155);
  g.fillRect(60, 175, W - 120, 4);

  g.textAlign = 'left';
  g.font = 'bold 54px Georgia, serif';
  const lines = wrap(g, headline(run), W - 120);
  lines.forEach((l, i) => g.fillText(l, 60, 250 + i * 62));
  let y = 250 + lines.length * 62;

  const img = new Image();
  img.src = photo || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  await img.decode().catch(() => undefined);
  const ph = Math.round((W - 120) * (img.height / img.width));
  const photoH = Math.min(ph, 520);
  g.drawImage(img, 0, 0, img.width, img.width * (photoH / (W - 120)), 60, y, W - 120, photoH);
  // Comic burst label on the photo.
  g.save();
  g.translate(150, y + 60);
  g.rotate(-0.12);
  g.font = 'bold 56px system-ui, sans-serif';
  g.fillStyle = '#ffd400';
  g.fillRect(-20, -50, g.measureText(burst).width + 60, 80);
  g.fillStyle = '#d0021b';
  g.fillText(burst, 10, 10);
  g.restore();
  y += photoH + 30;

  // Rubber stamp.
  g.save();
  g.translate(W - 230, y - 100);
  g.rotate(-0.2);
  g.strokeStyle = '#c0392b';
  g.lineWidth = 6;
  g.font = 'bold 40px system-ui, sans-serif';
  const sw = g.measureText(title).width + 40;
  g.strokeRect(-sw / 2, -40, sw, 70);
  g.fillStyle = '#c0392b';
  g.textAlign = 'center';
  g.fillText(title, 0, 10);
  g.restore();

  g.fillStyle = '#1b1b1b';
  g.font = 'italic 34px Georgia, serif';
  wrap(g, `“${q.text}” — ${q.who}`, W - 120).forEach((l, i) => g.fillText(l, 60, y + 40 + i * 42));
  y += 120;
  const [reached, tookLine] = arrival(run);
  g.font = 'bold 34px system-ui, sans-serif';
  g.fillText(`${run.mode === 'free' ? '🌙' : '⏱'} ${reached} · ${tookLine}`, 60, y);
  y += 56;
  const st = stats(run);
  g.font = '28px system-ui, sans-serif';
  st.forEach(([k, v], i) => {
    const cx = 60 + (i % 2) * ((W - 120) / 2);
    const cy = y + Math.floor(i / 2) * 46;
    g.fillStyle = '#6b5d4a';
    g.fillText(k, cx, cy);
    g.fillStyle = '#1b1b1b';
    g.font = 'bold 28px system-ui, sans-serif';
    g.fillText(v, cx + 260, cy);
    g.font = '28px system-ui, sans-serif';
  });
  g.fillStyle = '#1b1b1b';
  g.fillRect(0, H - 90, W, 90);
  g.fillStyle = '#ffd400';
  g.font = 'bold 36px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(`Tumi parbe? · ${SITE}/?seed=${run.seed}`, W / 2, H - 32);

  const blob: Blob = await new Promise((r) => cv.toBlob((b) => r(b!), 'image/png'));
  const file = new File([blob], 'ghar-jabo.png', { type: 'image/png' });
  if (share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: `${headline(run)} · Tumi parbe? Same evening, same traffic: https://${SITE}/?seed=${run.seed}` });
      return;
    } catch { /* cancelled: fall through to download */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ghar-jabo.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function wrap(g: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > width && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
