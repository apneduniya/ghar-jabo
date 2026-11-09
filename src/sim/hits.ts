// Walking into traffic: a fast vehicle knocks you down (and costs time and dignity); a slow one nudges you aside.

import { T } from '../content/tuning';
import type { World } from './world';

export function collideTraffic(w: World) {
  const p = w.player;
  for (const v of w.traffic.vehicles) {
    const c = Math.cos(v.heading), s = Math.sin(v.heading);
    const dx = p.x - v.x, dz = p.z - v.z;
    const along = dx * c + dz * s, across = -dx * s + dz * c;
    if (Math.abs(along) > v.len / 2 + 0.3 || Math.abs(across) > v.width / 2 + 0.35) continue;
    if (v.speed > T.traffic.hitSpeed && v.id !== w.captainId) {
      w.run.stats.taxiHits++;
      w.run.hurtDignity(6);
      w.run.addMinutes(2);
      const name = v.kind === 'taxi' ? 'TAXI TAKKAR!' : v.kind === 'bus' ? 'BUS-E DHAKKA!' : v.kind === 'auto' ? 'AUTO-R DHAKKA!' : 'DHAKKA!';
      w.events.sfx('crash');
      w.events.push({ type: 'shake', amp: 0.6, secs: 0.35 });
      w.events.push({ type: 'hitstop', secs: 0.12 });
      w.events.push({ type: 'photo', drama: 3, burst: name });
      w.events.toast(name, v.kind === 'taxi' ? 'Yellow taxi did not see you. Or did not care.' : 'Zebra crossing? Sheta abar ki?');
      const side = Math.sign(across) || 1;
      p.knockDown(c * 0.6 - s * side, s * 0.6 + c * side, 6);
    } else {
      // Slow or stopped: you just get nudged aside.
      const side = Math.sign(across) || 1;
      p.x += -s * side * 0.08;
      p.z += c * side * 0.08;
    }
    return;
  }
}
