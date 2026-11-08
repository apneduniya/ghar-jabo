import { renderer, resize, capturePhoto } from './gfx';
import { game } from './game';
import { endFrame, readInput } from './input';
import { root, el, updateHud, notify } from './ui';
import { sfx, toggleMute } from './audio';
import { momLines, pick } from './text';
import { rand } from './gfx';
import { lobby } from './scenes/lobby';
import { city } from './scenes/city';
import { sectorv } from './scenes/sectorv';
import { station } from './scenes/station';
import { result } from './scenes/result';

game.register('lobby', lobby);
game.register('city', city);
game.register('sectorv', sectorv);
game.register('station', station);
game.register('result', result);

addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') toggleMute();
});

// Ma calls more often as it gets late. The banner doesn't block play.
let callOpen = false;

function momCall() {
  const run = game.run;
  callOpen = true;
  sfx.ring();
  const b = el('div', 'call');
  b.innerHTML = `<div class="call-who"><i>📞</i><div><b>Ma calling…</b><span>${pick(momLines)}</span></div></div>`;
  const yes = el('button', 'call-yes', 'Answer');
  const no = el('button', 'call-no', 'Cut');
  const close = (answered: boolean) => {
    if (!callOpen) return;
    callOpen = false;
    b.remove();
    if (answered) {
      run.stats.momAnswered++;
      run.addMinutes(3);
      notify('Call with Ma: 3 min', '"Haan Ma, ashchhi. Haan. Haan. Rakhchhi."', 'good');
    } else {
      run.stats.momMissed++;
      if (run.stats.momMissed >= 2) notify(`${run.stats.momMissed} missed calls from Ma`, 'This will be discussed at home.', 'bad');
    }
  };
  yes.onclick = () => close(true);
  no.onclick = () => close(false);
  b.append(yes, no);
  root.appendChild(b);
  setTimeout(() => close(false), 4500);
  const gap = run.minute > 21 * 60 ? rand(12, 18) : rand(22, 32);
  run.nextCall = run.minute + gap;
}

let last = performance.now();

function frame(now: number) {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const run = game.run;
  const cur = game.current;

  if (game.hitStop > 0) { game.hitStop -= dt; dt = 0; }
  dt *= game.timeScale;

  readInput();
  run.tick(dt);
  cur?.update(dt);

  if (run.clockRunning && !run.ending && !callOpen && run.minute >= run.nextCall) momCall();
  if (run.clockRunning && !run.ending && run.timeUp) game.fail('still-sector-v');

  if (cur?.scene && cur.camera) renderer.render(cur.scene, cur.camera);
  if (run.photoRequest && cur?.scene) {
    run.photo = { dataUrl: capturePhoto(), drama: run.photoRequest.drama, burst: run.photoRequest.burst };
    run.photoRequest = null;
  }
  updateHud(run);
  endFrame();
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  const cam = game.current?.camera;
  if (cam) resize(cam, ...((cam.userData.fovs as [number, number]) ?? [cam.fov, cam.fov]));
});

// Exposed for automated playtests.
(window as unknown as { gj: typeof game; gjr: typeof renderer }).gj = game;
(window as unknown as { gjr: typeof renderer }).gjr = renderer;

game.go('lobby');
requestAnimationFrame(frame);
