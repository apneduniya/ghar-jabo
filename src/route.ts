// The compressed road to Sealdah. x runs along the road towards home, z across it.
// Kolkata drives on the left: eastbound (towards home) is the -z half, and the player's footpath is -z.

export const ROAD_HALF = 6;
/** The footpath on the player's side (the left of the road, heading home). */
export const FOOT_NEAR: [number, number] = [-10.5, -6];
export const LANES_EAST = [-1.5, -4.5]; // [inner, kerb]
export const LANES_WEST = [1.5, 4.5];

export const HOME_X = 880;
export const METRO_IN_X = 120;
export const METRO_OUT_X = 828;

export const stops = [
  { x: 10, name: 'PWH More' },
  { x: 120, name: 'Wipro More' },
  { x: 260, name: 'Karunamoyee' },
  { x: 400, name: 'Bidhannagar' },
  { x: 540, name: 'Ultadanga' },
  { x: 690, name: 'Maniktala' },
  { x: 840, name: 'Sealdah' },
];

/** Waterlogged stretches: the puddles near Webel More never dry. */
export const floods: [number, number][] = [[40, 85], [470, 500]];

export function placeName(x: number) {
  let name = stops[0].name;
  for (const s of stops) if (x >= s.x - 40) name = s.name;
  return x < 0 ? 'College Gate' : name;
}

export function inFlood(x: number) { return floods.some(([a, b]) => x >= a && x <= b); }
