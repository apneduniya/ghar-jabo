// The long ride to Sealdah after leaving the real Sector V map (Karunamoyee onwards), compressed. x runs along the road towards home, z across it.
// Kolkata drives on the left: eastbound (towards home) is the -z half, and the player's footpath is -z.

export const ROAD_HALF = 6;
/** The footpath on the player's side (the left of the road, heading home). */
export const FOOT_NEAR: [number, number] = [-10.5, -6];
export const LANES_EAST = [-1.5, -4.5]; // [inner, kerb]
export const LANES_WEST = [1.5, 4.5];

export const HOME_X = 880;
/** Central Park metro, on the way: you can still bail out of the ride into the Green Line here. */
export const METRO_IN_X = 140;
export const METRO_OUT_X = 828;

export const stops = [
  { x: 10, name: 'Karunamoyee' },
  { x: 140, name: 'Central Park' },
  { x: 270, name: 'City Centre' },
  { x: 400, name: 'Bengal Chemical' },
  { x: 520, name: 'Salt Lake Stadium' },
  { x: 660, name: 'Phoolbagan' },
  { x: 840, name: 'Sealdah' },
];

/** Waterlogged stretches: the puddles near Webel More never dry. */
export const floods: [number, number][] = [[40, 85], [470, 500]];

export function placeName(x: number) {
  let name = stops[0].name;
  for (const s of stops) if (x >= s.x - 40) name = s.name;
  return name;
}

export function inFlood(x: number) { return floods.some(([a, b]) => x >= a && x <= b); }
