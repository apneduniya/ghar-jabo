// Gameplay features placed on the real Sector V map (positions in world units, see tools/build-map.py).

/** Waterlogged spots: the puddles near Webel More never dry. */
export const floods = [
  { x: 150, z: 278, r: 22 },
];

/** Where the bus route leaves the map towards Sealdah (its north-west end), and the edge of play. */
export const PLAY_RADIUS = 330;

type P = [number, number];
/**
 * The elevated north (research/streetview/NORTH.md; OSM ids in research/map/OSM-AUDIT.md §3-4). World units.
 * Stations are oriented boxes along their OSM platform footprints: a -> b is the long axis, and n0..n1 the extent
 * across it (negative = south-east towards the road, positive = north-west across the canal).
 */
export const north = {
  /** OSM subway_entrance nodes 13875696026 (Gate A, service-road side) and 13875696027 (Gate B, Chavipatty Rd). */
  gateA: [-35.5, -197.8] as P,
  gateB: [-17.2, -233.6] as P,
  /** Salt Lake Sector V (Green Line terminus): ends of OSM w535333512. It spans the canal to Chavipatty Rd. */
  sectorV: { a: [-46.5, -197.5] as P, b: [12.6, -234.2] as P, n0: -5, n1: 17 },
  /** IT Centre (Orange Line): ends of OSM w535333500. It straddles the SW-bound carriageway of Biswa Bangla Sarani. */
  /** The peach entrance block bridging the service road at Gate A: s0, s1, t0 in Sector V's frame (to its south face). */
  gateBlock: [-28.5, -21.5, -10.8] as [number, number, number],
  itCentre: { a: [2.45, -207.65] as P, b: [59.8, -244.4] as P, n0: -6.5, n1: 8.6 },
  stationUnderside: 5.4, // the ground level below is open
  viaductY: 10, // Green Line rail level (top of the deck)
  orangeY: 12.5, // Orange Line rail level
  flyoverH: 6.5, // deck top over Street 13 (soffit about 6-7 m)
  deckW: 7.6, // each flyover deck: 2 lanes plus parapets
  deckGap: 1.8, // daylight between the two decks
  ramp: 45, // ordinary ramp at a deck end
  rampLong: 85, // the NE-bound deck comes down to grade before the station, on a retaining wall
  landing: 25, // ...and runs at grade for its last stretch, beside Gate A
  greenPierStep: 15, // Green Line piers about 30 m apart
  orangePierStep: 16,
  canalDepth: 1.7, // water surface below grade
  canalHalf: [3.6, 4.6] as P, // half width of the channel (~15 m), clamped
  railingOffset: 2.2, // canal railings stand this far beyond the carriageway edge (the outer edge of the footpath)
};
