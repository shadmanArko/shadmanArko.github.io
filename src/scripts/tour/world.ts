/**
 * Career tour geometry (logical pixels). Left to right is time: Dhaka, a calm flight over a
 * sea of clouds, then Berlin. Only companies and schools stand on the map.
 *
 * Shared by Tour.astro (build time, to place the station buttons) and the client engine.
 */
export const WORLD_W = 2240;
export const WORLD_H = 200;

export const HORIZON_Y = 124; // where the distant skyline sits
export const BASE_Y = 146; // building base / back of the walkway
export const FEET_Y = 155; // the walker's feet
export const LANE_Y = 166; // lower lane (rickshaw in Dhaka, bicycle in Berlin)
export const RIVER_Y = 177; // river top

/** The flight: Arko boards at TAKEOFF_X and steps off at LAND_X. */
export const TAKEOFF_X = 1172;
export const LAND_X = 1528;
/** Ground ends / starts here (the cloud sea lies between). */
export const DHAKA_END = 1252;
export const BERLIN_START = 1448;
/** Flying is quicker than walking: one flown pixel "costs" this much walk time. */
export const FLIGHT_COST = 0.3;

export interface Stop {
  x: number;
  lm: string; // landmark painter key
  w: number; // hit box (logical px), centred on x, standing on BASE_Y
  h: number;
  sign: string; // short visual label for the name sign
}

/** Keyed by profile.stations[].id. Order on the road follows the career order. */
export const STOPS: Record<string, Stop> = {
  brac: { x: 300, lm: 'campus', w: 72, h: 70, sign: 'BRAC University' },
  cvis: { x: 430, lm: 'lab', w: 50, h: 57, sign: 'CVIS Lab' },
  kovair: { x: 555, lm: 'office', w: 46, h: 53, sign: 'Kovair' },
  dreamerz: { x: 680, lm: 'dreamerz', w: 56, h: 64, sign: 'Dreamerz Lab' },
  army: { x: 815, lm: 'army', w: 80, h: 56, sign: 'Bangladesh Army' },
  bs23: { x: 950, lm: 'tower', w: 56, h: 84, sign: 'Brain Station 23' },
  redthorn: { x: 1085, lm: 'castle', w: 66, h: 60, sign: 'Red Thorn' },
  kolibri: { x: 1620, lm: 'kolibri', w: 60, h: 71, sign: 'Kolibri Games' },
  badwifi: { x: 1750, lm: 'badwifi', w: 58, h: 72, sign: 'Bad Wifi' },
  neuefische: { x: 1880, lm: 'school', w: 56, h: 60, sign: 'neue fische' },
  dhakakacchi: { x: 2015, lm: 'kitchen', w: 76, h: 64, sign: 'Dhaka Kacchi' },
};

/** City name boards (visual labels only). */
export const CITY_SIGNS = [
  { x: 210, text: 'Dhaka' },
  { x: 1560, text: 'Berlin' },
];
export const AIRPORT_SIGNS = [
  { x: 1160, text: 'DAC' },
  { x: 1508, text: 'BER' },
];

export type Costume = 'pack' | 'none' | 'beanie' | 'chef';
/** Backpack for the student years, a beanie in Berlin, the chef's toque at the kitchen. */
export function costumeAt(x: number): Costume {
  if (x < 492) return 'pack';
  if (x < TAKEOFF_X + 1) return 'none';
  if (x < 1948) return 'beanie';
  return 'chef';
}

/** Walk "cost" along the road (flight pixels are cheaper), and its inverse. */
export function costAt(x: number): number {
  if (x <= TAKEOFF_X) return x;
  if (x <= LAND_X) return TAKEOFF_X + (x - TAKEOFF_X) * FLIGHT_COST;
  return TAKEOFF_X + (LAND_X - TAKEOFF_X) * FLIGHT_COST + (x - LAND_X);
}
export function xAtCost(c: number): number {
  const c1 = TAKEOFF_X;
  const c2 = TAKEOFF_X + (LAND_X - TAKEOFF_X) * FLIGHT_COST;
  if (c <= c1) return c;
  if (c <= c2) return TAKEOFF_X + (c - c1) / FLIGHT_COST;
  return LAND_X + (c - c2);
}

/** Plane altitude above the runway for a flight fraction f in [0, 1]. */
export function altitude(f: number): number {
  const ss = (a: number, b: number, v: number) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  return 72 * ss(0.06, 0.34, f) * (1 - ss(0.66, 0.94, f));
}
