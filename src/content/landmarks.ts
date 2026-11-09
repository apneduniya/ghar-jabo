// Landmarks and linear structures of the streamed world (task 020): sizes, heights and sign text.
// Horizontal sizes are in game units at 0.5 u per real metre; heights are near 1 u per metre (one storey = FLOOR_U),
// the same mix as the Sector V map. Real station names are places, not brands; shops, banks and ads are parodies.

/** The real Sector V map covers |x|, |z| <= this (game units); streamed structures never draw inside it. */
export const SECTOR_V_HALF = 360;

export const LM = {
  /** Green Line rail level on the viaduct (matches north.viaductY in content/sectorv.ts). */
  viaductY: 10,
  viaductW: 7.5,
  /** Pier spacing along the viaduct (about 28 m of real span), measured along the warped line. */
  pierStep: 14,
  /** The ramp where the line comes down from the viaduct to grade, then the walled cut into the portal. */
  rampLen: 90,
  cutLen: 40,
  /** Elevated station box: length along the line, width across, concourse and roof levels. */
  station: { len: 70, w: 12, concourse: 5.6, platform: 10, roof: 15.5 },
  /** Flyover deck level and the run-up from a free end (no other flyover way joins there). */
  flyoverY: { ultadanga: 8, sealdah: 6.5, other: 7 },
  flyoverRamp: 55,
  flyoverPierStep: 16,
  /** Rail bridge clearance over a road. */
  railClearance: 5.4,
};

export const LM_TEXT = {
  sealdahNorth: 'SEALDAH (NORTH)',
  sealdahNorthBn: 'শিয়ালদহ (উত্তর)',
  sealdahNorthHi: 'सियालदह (उत्तर)',
  sealdahMain: 'Sealdah Main · শিয়ালদহ মেইন',
  sealdahMetro: 'METRO · SEALDAH',
  welcome: 'Welcome to Sealdah',
  hoardings: [
    'BAAZAR-E-KOLKATA · Now at Sealdah, 3rd floor (lift broken)',
    'SENCHO GOLD · Jewellery for every bonus',
    'DIAMOND-ISH SAREES · Sale ends never',
    'LUXOR-NOT INNERWEAR · Feel the Rush Hour',
    'ROOP-KATHA FAIRNESS-FREE CREAM · Just moisture',
    'BHALO BANK · Your money, our queue',
  ],
  footbridge: 'Ph: 033 2335 0067 · HOARDINGS ON RENT · Call 98309 00000',
  hotel: 'BOTHRA-ISH GUEST HOUSE · AC / NON-AC',
  kolkata: 'I ♥ KOLKATA',
  ward: 'WARD NO. 34',
  police: 'KOLKATA TRAFFIC POLICE',
  stadium: 'VYBK',
  stadiumBn: 'যুবভারতী ক্রীড়াঙ্গন',
  terminus: 'KARUNAMOYEE BUS TERMINUS',
  mall: 'CITY CENTRE MALL-ISH',
  market: 'KOLEY-ISH WHOLESALE MARKET',
  hospital: 'GOVT. MEDICAL COLLEGE & HOSPITAL',
  metro: 'METRO',
  festival: 'SHUBHO UTSAV · Para Club 54th Year',
  roadSafety: 'SAFE DRIVE SAVE LIFE',
};
