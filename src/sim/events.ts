// What the sim tells the presentation layers: they turn these into toasts, sounds, camera shake and stage changes.

export type Sfx = 'ting' | 'cancel' | 'coin' | 'tap' | 'bad' | 'horn' | 'bump' | 'crash' | 'doorBeep' | 'chime' | 'sting' | 'ring' | 'whoosh' | 'win';

export type GameEvent =
  | { type: 'toast'; title: string; line: string }
  | { type: 'notify'; title: string; body: string; tone: 'app' | 'metro' | 'news' | 'bad' | 'good' }
  | { type: 'sfx'; name: Sfx }
  | { type: 'shake'; amp: number; secs: number }
  | { type: 'hitstop'; secs: number }
  | { type: 'slowmo'; scale: number; secs: number }
  | { type: 'photo'; drama: number; burst: string }
  | { type: 'stage'; to: 'station' | 'ride'; mode?: 'bus' | 'rapinah' }
  | { type: 'end'; ending: 'still-sector-v' };

export class Events {
  list: GameEvent[] = [];
  push(e: GameEvent) { this.list.push(e); }
  toast(title: string, line = '') { this.push({ type: 'toast', title, line }); }
  notify(title: string, body = '', tone: 'app' | 'metro' | 'news' | 'bad' | 'good' = 'app') { this.push({ type: 'notify', title, body, tone }); }
  sfx(name: Sfx) { this.push({ type: 'sfx', name }); }
  drain(): GameEvent[] { const l = this.list; this.list = []; return l; }
}
