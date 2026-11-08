// Title screen: the family WhatsApp group, one big button.

import type { Scene } from '../app/game';
import { game } from '../app/game';
import { sceneLayer, el, wait } from '../ui/ui';
import { familyChat, loadingTips, pick } from '../content/text';
import { unlockAudio, sfx } from '../audio/audio';

export function lobby(): Scene {
  let layer: HTMLElement;
  let alive = true;
  return {
    enter() {
      layer = sceneLayer();
      layer.classList.add('lobby');
      layer.innerHTML = `
        <div class="wa">
          <div class="wa-head"><b>Family 🏠❤️</b><span>Ma, Baba, Didi, You</span></div>
          <div class="wa-body"></div>
        </div>
        <div class="title">
          <h1>GHAR JABO</h1>
          <p>6:30 PM. Salt Lake Sector V.<br/>Get home. Everything will go wrong.</p>
        </div>`;
      const body = layer.querySelector('.wa-body')!;
      void (async () => {
        for (const m of familyChat) {
          await wait(650);
          if (!alive) return;
          const b = el('div', `wa-msg ${m.who === 'Ma' ? 'ma' : ''}`, `<i>${m.who}</i>${m.text}`);
          body.appendChild(b);
          sfx.tap();
        }
      })();
      const go = el('button', 'cholo', 'CHOLO →');
      go.onclick = () => {
        unlockAudio();
        sfx.shankh();
        game.newRun();
      };
      const tip = el('div', 'loading-tip', pick(loadingTips));
      const how = el('div', 'how', 'Phone: drag the left side to run, buttons on the right.<br/>Laptop: <kbd>WASD</kbd> run · <kbd>Space</kbd> jump · <kbd>E</kbd> hop on/off · <kbd>P</kbd> Rapi-Nah · <kbd>M</kbd> mute');
      layer.append(go, tip, how);
    },
    update() {},
    exit() { alive = false; layer.remove(); },
  };
}
