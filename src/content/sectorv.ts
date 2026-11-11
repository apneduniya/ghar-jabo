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
  /**
   * OSM subway_entrance nodes 13875696026 (Gate A, service-road side) and 13875696027 (Gate B, Chavipatty Rd). OSM's
   * Gate A sits 2 u south-east of the service road's centre line, across from the real door: use `gateA` below.
   */
  gateAOsm: [-35.5, -197.8] as P,
  gateB: [-17.2, -233.6] as P,
  /** Salt Lake Sector V (Green Line terminus): ends of OSM w535333512. It spans the canal to Chavipatty Rd. */
  sectorV: { a: [-46.5, -197.5] as P, b: [12.6, -234.2] as P, n0: -5, n1: 17 },
  /** The peach bank block bridging the service road NE of the Gate A mural: s0, s1, t0 in Sector V's frame. */
  gateBlock: [-17, -10, -10.8] as [number, number, number],
  /**
   * Gate A (Street View Jan 2026, NORTH.md §3 "Gate A re-shoot"), in Sector V's frame: s along, t across (+t NW).
   * The real door is at 22.58070, 88.42865 = (-36.0, -204.3), s -22.3, t 0.2, just past the kerb of a 7-8 m service
   * road; the map's road (OSM's one-way Bypass link, 9 u = 18 m) has its NW kerb at t 0.9, so everything stands a
   * little further back; the pillar (real s -26, t -1.1) stands at the kerb.
   * `door`: s of the doorway; `stand`: t where you stand in it (the trigger); `face`, `recess`: the block's road face
   * and how deep the doorway goes; `block`: s0, s1, back t of the ground block (the canal bank); `mural`: s0, s1 of the mosaic wall
   * NE of it; `forecourt`: s0 of the paved forecourt (SW of the door); `rail`: t of the kerb railing; `pillar`: the
   * sign pillar's s, t; `autos`: first s, spacing, count and t of the auto queue at the kerb.
   */
  gateA: {
    real: [-36.0, -204.3] as P, door: -22.3, stand: 2.0, face: 3.0, recess: 1.1, doorW: 2.4,
    block: [-24.8, -19.4, 4.4] as [number, number, number], mural: [-19.4, -9] as P, forecourt: -28,
    rail: 1.0, pillar: [-26.5, 1.3] as P, autos: [-16.2, 3.1, 5, 0.25] as [number, number, number, number],
  },
  /** IT Centre (Orange Line): ends of OSM w535333500. It straddles the SW-bound carriageway of Biswa Bangla Sarani. */
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
