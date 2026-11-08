import { renderer, resize, capturePhoto, canvas, maxPixelRatio } from '../render/gfx';
import { Quality } from '../render/quality';
import { game } from './game';
import { endFrame, readInput } from '../input/input';
import { root, el, updateHud, notify } from '../ui/ui';
import { sfx, toggleMute } from '../audio/audio';
import { momLines, pick } from '../content/text';
import { rand } from '../render/gfx';
import { city } from '../stages/city';
import { sectorv } from '../stages/sectorv';
import { station } from '../stages/station';
import { result } from '../stages/result';

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
const quality = new Quality(renderer, maxPixelRatio);
let contextLost = false;

// iOS can drop the WebGL context when you switch apps (say, to share on WhatsApp). Pause until it's back.
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); contextLost = true; });
canvas.addEventListener('webglcontextrestored', () => { contextLost = false; last = performance.now(); });
// Don't let the clock jump while the tab was hidden.
document.addEventListener('visibilitychange', () => { last = performance.now(); });

function frame(now: number) {
  requestAnimationFrame(frame);
  if (contextLost || document.hidden) { last = now; return; }
  const frameMs = now - last;
  let dt = Math.min(0.05, frameMs / 1000);
  last = now;
  quality.frame(frameMs);
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
  // Capture straight after rendering, while the frame is still in the drawing buffer.
  if (run.photoRequest && cur?.scene) {
    run.photo = { dataUrl: capturePhoto(), drama: run.photoRequest.drama, burst: run.photoRequest.burst };
    run.photoRequest = null;
  }
  if (game.resultPending) { game.resultPending = false; game.go('result'); }
  updateHud(run);
  endFrame();
}

addEventListener('resize', () => {
  const cam = game.current?.camera;
  if (cam) resize(cam, ...((cam.userData.fovs as [number, number]) ?? [cam.fov, cam.fov]));
});

// Exposed for automated playtests.
(window as unknown as { gj: typeof game; gjr: typeof renderer }).gj = game;
(window as unknown as { gjr: typeof renderer }).gjr = renderer;

// Boot straight into the real map, with the title screen floating over it.
game.attract = true;
game.newRun();
requestAnimationFrame(frame);
