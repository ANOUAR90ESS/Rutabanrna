/**
 * Compact TMB network produced by scripts/build-gtfs.mjs from the official GTFS feed.
 * Times are seconds after local midnight (Europe/Madrid) of the service day; they can exceed 86400.
 */
export interface RawRoute {
  id: string;         // GTFS route_id
  n: string;          // short name: L1, H12, V15…
  ln: string;         // long name: "Hospital de Bellvitge - Fondo"
  c: string;          // colour "#RRGGBB"
  tc: string;         // text colour
  t: 'metro' | 'funicular' | 'bus';
}

export interface RawStation {
  n: string;
  lat: number;
  lon: number;
  b: 0 | 1;           // 1 = bus stop
  s: number[];        // indices into stops (platforms of this station)
  r: number[];        // routes serving the station
  ac?: [string, number, number, 0 | 1, number][]; // entrances: name, lat, lon, accessible, elevators
}

export interface RawStop {
  id: string;         // GTFS stop_id
  c: string;          // stop_code (TMB station / bus stop code, used by iTransit)
  g: number;          // station index
  lat: number;
  lon: number;
  w: 0 | 1 | 2;       // GTFS wheelchair_boarding
  e: number;          // number of elevators
  r: number[];
}

export interface RawPattern {
  r: number;          // route index
  h: string;          // headsign
  d: number;          // GTFS direction_id
  sh: number;         // shape index (-1 if missing)
  s: number[];        // stop indices
  o: number[];        // departure offset from trip start for each stop (s)
  k: number[];        // distance along the shape (metres) for each stop
}

export interface RawService {
  id: string;
  t: number[];        // delta-encoded trip start times (sorted)
  p: number[];        // pattern for each trip
  d?: number[];       // trip durations when they differ from the pattern
}

export interface RawNetwork {
  v: number;
  feed: { publisher: string; version: string; start: string; end: string };
  sources?: { gtfsPublished: string; accessesDate: string };
  generated: string;
  routes: RawRoute[];
  stations: RawStation[];
  stops: RawStop[];
  shapes: number[][]; // delta-encoded [lat, lon] × 1e5
  patterns: RawPattern[];
  services: RawService[];
  dates: Record<string, number[]>; // YYYYMMDD -> service indices
  x?: [number, number, number][];  // interchanges between platforms: fromStop, toStop, seconds
}
