// Sector V at 6:30 PM: traffic horns that swell with the jam, crows overhead, rain near the flooded
// Webel More junction, and a hawker calling now and then on the café strip.

import { ambience as A } from '../content/sounds';
import { Bed, playClip } from './clips';
import { hawkerGap, hornBedGain, inSpot, rainBedGain, type Spot } from './mix';

export class Ambience {
  private traffic = new Bed('traffic');
  private crows = new Bed('crows');
  private rain = new Bed('rain');
  private hawkerIn = hawkerGap(Math.random()) / 2;
  private flip = false;

  constructor(private floods: readonly Spot[]) {}

  start() {
    this.traffic.start();
    this.crows.start();
    this.rain.start();
    this.crows.setLevel(A.crows);
  }

  update(dt: number, jam: number, x: number, z: number) {
    this.traffic.setLevel(hornBedGain(jam));
    this.rain.setLevel(rainBedGain(this.floods, x, z));
    if (!inSpot(A.cafe, x, z)) return;
    this.hawkerIn -= dt;
    if (this.hawkerIn > 0) return;
    this.hawkerIn = hawkerGap(Math.random());
    this.flip = !this.flip;
    playClip(this.flip ? 'hawker' : 'hawkerFish');
  }

  stop() {
    this.traffic.stop();
    this.crows.stop();
    this.rain.stop();
  }
}
