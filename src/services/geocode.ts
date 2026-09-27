/**
 * Address & place search for the Barcelona area.
 * - Photon (komoot, OpenStreetMap data): autocomplete-friendly, no key.
 * - Nominatim (OpenStreetMap) as fallback.
 * - Local landmarks and recently used places work offline.
 */
import type { Language, PointOfInterest } from '../types/transit';
import { normalizeText } from './network/engine';

export interface PlaceResult {
  id: string;
  name: string;
  detail: string; // street / district / city
  lat: number;
  lng: number;
  source: 'osm' | 'landmark' | 'recent';
}

// TMB area (Barcelona + metro municipalities)
const BBOX = { minLon: 1.95, minLat: 41.25, maxLon: 2.35, maxLat: 41.52 };
const CENTER = { lat: 41.3879, lon: 2.1699 };
const PHOTON = (import.meta.env.VITE_PHOTON_URL as string | undefined) || 'https://photon.komoot.io/api/';
const NOMINATIM = (import.meta.env.VITE_NOMINATIM_URL as string | undefined) || 'https://nominatim.openstreetmap.org/search';

const inArea = (lat: number, lng: number) => lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLon && lng <= BBOX.maxLon;
const cache = new Map<string, PlaceResult[]>();

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
}

function photonToPlace(f: PhotonFeature): PlaceResult | null {
  const [lng, lat] = f.geometry?.coordinates || [];
  if (typeof lat !== 'number' || typeof lng !== 'number' || !inArea(lat, lng)) return null;
  const p = f.properties || {};
  const street = p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ''}` : '';
  const name = p.name || street || p.district || p.city || '';
  if (!name) return null;
  const detail = [p.name && street ? street : '', p.district || p.locality, p.city].filter(Boolean).join(', ');
  return { id: `osm-${p.osm_type ?? ''}${p.osm_id ?? `${lat},${lng}`}`, name, detail, lat, lng, source: 'osm' };
}

async function photon(q: string, lang: Language, signal?: AbortSignal): Promise<PlaceResult[]> {
  const url =
    `${PHOTON}?q=${encodeURIComponent(q)}&limit=8&lat=${CENTER.lat}&lon=${CENTER.lon}` +
    `&bbox=${BBOX.minLon},${BBOX.minLat},${BBOX.maxLon},${BBOX.maxLat}` +
    (['en', 'de', 'fr', 'it'].includes(lang) ? `&lang=${lang}` : '');
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features || []).map(photonToPlace).filter((x): x is PlaceResult => !!x);
}

async function nominatim(q: string, lang: Language, signal?: AbortSignal): Promise<PlaceResult[]> {
  const url =
    `${NOMINATIM}?q=${encodeURIComponent(q)}&format=jsonv2&limit=6&bounded=1&accept-language=${lang}` +
    `&viewbox=${BBOX.minLon},${BBOX.maxLat},${BBOX.maxLon},${BBOX.minLat}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const data = (await res.json()) as { place_id: number; lat: string; lon: string; name?: string; display_name: string }[];
  return data
    .map((d): PlaceResult | null => {
      const lat = +d.lat, lng = +d.lon;
      if (!inArea(lat, lng)) return null;
      const parts = d.display_name.split(', ');
      // "Passeig de Gràcia, 92, …" → name "Passeig de Gràcia, 92" for plain addresses
      const n = d.name ? 1 : /^\d/.test(parts[1] || '') ? 2 : 1;
      return { id: `nom-${d.place_id}`, name: d.name || parts.slice(0, n).join(', '), detail: parts.slice(n, n + 3).join(', '), lat, lng, source: 'osm' };
    })
    .filter((x): x is PlaceResult => !!x);
}

/** Online search (Photon, then Nominatim). Returns [] when offline or both fail. */
export async function searchPlaces(q: string, lang: Language, signal?: AbortSignal): Promise<PlaceResult[]> {
  const key = `${lang}|${normalizeText(q)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let out: PlaceResult[] = [];
  try {
    out = await photon(q, lang, signal);
  } catch (e) {
    if (signal?.aborted) throw e;
    try {
      out = await nominatim(q, lang, signal);
    } catch (e2) {
      if (signal?.aborted) throw e2;
      out = [];
    }
  }
  // de-duplicate same name at (almost) the same spot
  const seen = new Set<string>();
  out = out.filter((p) => {
    const k = `${normalizeText(p.name)}|${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  cache.set(key, out);
  return out;
}

/** Offline matches among the app's landmarks (all languages). */
export function searchLandmarks(q: string, landmarks: PointOfInterest[], lang: Language): PlaceResult[] {
  const v = normalizeText(q);
  if (v.length < 2) return [];
  return landmarks
    .filter((l) => Object.values(l.name).some((n) => normalizeText(n).includes(v)))
    .slice(0, 3)
    .map((l) => ({ id: `lm-${l.id}`, name: l.name[lang], detail: l.nearestStationName, lat: l.lat, lng: l.lng, source: 'landmark' as const }));
}

// ------------------------------------------------------------------ recent places
const RECENT_KEY = 'barnatransit_recent_places';

export function loadRecentPlaces(): PlaceResult[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

export function rememberPlace(p: PlaceResult) {
  const list = [{ ...p, source: 'recent' as const }, ...loadRecentPlaces().filter((x) => x.id !== p.id)].slice(0, 6);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
