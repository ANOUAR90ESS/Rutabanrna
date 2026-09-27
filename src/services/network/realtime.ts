import type { Departure, Station } from '../../types/transit';
import type { TmbNetwork } from './engine';
import { formatClock, madridClock } from './clock';

/**
 * Optional live predictions from the TMB iTransit API (https://developer.tmb.cat).
 *
 * Recommended: VITE_TMB_PROXY_URL=/api/tmb → calls go through server/index.mjs, which adds
 * the keys server-side (the TMB licence is bound to the registered app; keys shipped in
 * client JavaScript can be copied by anyone).
 * Development only: VITE_TMB_APP_ID / VITE_TMB_APP_KEY call TMB directly from the browser.
 * Without either, the app keeps using the official GTFS timetable.
 */
const PROXY = (import.meta.env.VITE_TMB_PROXY_URL as string | undefined)?.replace(/\/$/, '');
const APP_ID = import.meta.env.VITE_TMB_APP_ID as string | undefined;
const APP_KEY = import.meta.env.VITE_TMB_APP_KEY as string | undefined;
const API = PROXY || (import.meta.env.VITE_TMB_API_BASE as string | undefined) || 'https://api.tmb.cat/v1';

export const realtimeEnabled = Boolean(PROXY || (APP_ID && APP_KEY));

interface Prediction {
  line: string;
  destination: string;
  arrivalMs: number;
}

/** Walks any iTransit payload and collects every `temps_arribada` with its line/destination context. */
function collect(node: unknown, ctx: { line?: string; dest?: string }, out: Prediction[], nowMs: number) {
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, ctx, out, nowMs));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const o = node as Record<string, unknown>;
  const next = {
    line: (o.nom_linia as string) || (o.codi_linia !== undefined && !ctx.line ? String(o.codi_linia) : undefined) || ctx.line,
    dest: (o.desti_trajecte as string) || (o.desti as string) || ctx.dest
  };
  const t = o.temps_arribada;
  if (typeof t === 'number' && next.line) {
    // Epoch milliseconds (iTransit) – tolerate epoch seconds or "seconds from now" too.
    const arrivalMs = t > 1e12 ? t : t > 1e9 ? t * 1000 : nowMs + t * 1000;
    out.push({ line: next.line, destination: next.dest || '', arrivalMs });
  }
  Object.values(o).forEach((v) => {
    if (v && typeof v === 'object') collect(v, next, out, nowMs);
  });
}

function normaliseLine(raw: string, net: TmbNetwork): string {
  if (net.lineIndexByCode.has(raw)) return raw;
  const n = raw.replace(/^0+/, '');
  if (net.lineIndexByCode.has('L' + n)) return 'L' + n;
  return raw;
}

export async function fetchRealtimeDepartures(station: Station, net: TmbNetwork, signal?: AbortSignal): Promise<Departure[] | null> {
  if (!realtimeEnabled || !station.stopCodes?.length) return null;
  const auth = PROXY ? '' : `app_id=${encodeURIComponent(APP_ID!)}&app_key=${encodeURIComponent(APP_KEY!)}`;
  const urls = station.isBusStop
    ? station.stopCodes.map((c) => `${API}/itransit/bus/parades/${encodeURIComponent(c)}${auth ? `?${auth}` : ''}`)
    : [`${API}/itransit/metro/estacions?estacions=${station.stopCodes.map(encodeURIComponent).join(',')}${auth ? `&${auth}` : ''}`];

  const now = Date.now();
  const preds: Prediction[] = [];
  const results = await Promise.allSettled(urls.map((u) => fetch(u, { signal }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))));
  let anyOk = false;
  results.forEach((r) => {
    if (r.status === 'fulfilled') { anyOk = true; collect(r.value, {}, preds, now); }
  });
  if (!anyOk) return null;

  const secsNow = madridClock(now).secs;
  return preds
    .filter((p) => p.arrivalMs >= now - 30000)
    .map((p) => {
      const code = normaliseLine(p.line, net);
      const line = net.lines[net.lineIndexByCode.get(code) ?? -1];
      const wait = Math.max(0, Math.round((p.arrivalMs - now) / 1000));
      return {
        vehicleId: `rt-${code}-${p.arrivalMs}`,
        lineCode: code,
        lineColor: line?.color || '#64748B',
        lineTextColor: line?.textColor,
        type: line?.type || (station.isBusStop ? 'bus' : 'metro'),
        destination: p.destination,
        timeEstimateMinutes: Math.floor(wait / 60),
        timeEstimateSeconds: wait,
        departureTime: formatClock(secsNow + wait),
        isRealTime: true,
        delayMinutes: 0,
        occupancy: 'unknown',
        source: 'realtime'
      } satisfies Departure;
    })
    .sort((a, b) => a.timeEstimateSeconds! - b.timeEstimateSeconds!);
}

/** Real-time predictions replace the timetable for the lines they cover; other lines keep scheduled times. */
export function mergeDepartures(scheduled: Departure[], live: Departure[] | null): Departure[] {
  if (!live || !live.length) return scheduled;
  const liveLines = new Set(live.map((d) => d.lineCode));
  return [...live, ...scheduled.filter((s) => !liveLines.has(s.lineCode))].sort(
    (a, b) => (a.timeEstimateSeconds ?? 0) - (b.timeEstimateSeconds ?? 0)
  );
}
