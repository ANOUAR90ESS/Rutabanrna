import type { Departure, Language, LiveVehicle, ServiceNotice, Station, TransitLine, TransitType } from '../../types/transit';
import type { RawNetwork, RawPattern, RawRoute } from './types';
import { formatClock, madridClock, MadridClock, ymdShift } from './clock';

export const NETWORK_URL = '/data/tmb-network.json';

interface Shape {
  pts: [number, number][]; // [lat, lng]
  cum: number[];           // cumulative metres
}

interface Pattern extends RawPattern {
  dur: number;
  pos: Map<number, number>; // stop index -> first position in the pattern
}

interface Service {
  id: string;
  start: number[];
  p: number[];
  d?: number[];
  routes: Set<number>;
}

interface Run {
  svc: Service;
  svcIndex: number;
  ymd: string;
  off: number; // 0 for today's services, 86400 for yesterday's (after-midnight trips)
}

export interface ActiveTrip {
  pattern: Pattern;
  patternIndex: number;
  dt: number;      // seconds since the trip left its first stop (in pattern time)
  scale: number;   // real duration / pattern duration
  id: string;
}

const upper = (a: ArrayLike<number>, x: number) => {
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= x) lo = m + 1; else hi = m; }
  return lo;
};

const R_EARTH = 6371000;
function metres(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(s));
}

function bearing(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180;
  const y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r);
  const x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

const transitType = (r: RawRoute): TransitType => (r.t === 'bus' ? 'bus' : 'metro');

/** A gap longer than this between two departures ends the "night" (used for “last train”). */
const NIGHT_GAP = 40 * 60;

export class TmbNetwork {
  readonly raw: RawNetwork;
  readonly routes: RawRoute[];
  readonly patterns: Pattern[];
  readonly services: Service[];
  readonly shapes: Shape[];
  readonly maxDuration: number;
  readonly stations: Station[];
  readonly stationById = new Map<string, number>();
  readonly lines: TransitLine[];
  readonly lineIndexByCode = new Map<string, number>();
  /** patterns (index) that serve each stop */
  private readonly stopPatterns: number[][];

  constructor(raw: RawNetwork) {
    this.raw = raw;
    this.routes = raw.routes;

    this.shapes = raw.shapes.map((enc) => {
      const pts: [number, number][] = [];
      let la = 0, lo = 0;
      for (let i = 0; i < enc.length; i += 2) {
        la += enc[i]; lo += enc[i + 1];
        pts.push([la / 1e5, lo / 1e5]);
      }
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + metres(pts[i - 1], pts[i]));
      return { pts, cum };
    });

    let maxDur = 0;
    this.patterns = raw.patterns.map((p) => {
      const pos = new Map<number, number>();
      p.s.forEach((s, i) => { if (!pos.has(s)) pos.set(s, i); });
      const dur = p.o[p.o.length - 1];
      maxDur = Math.max(maxDur, dur);
      return { ...p, dur, pos };
    });

    this.services = raw.services.map((s) => {
      let x = 0;
      const start = s.t.map((v) => (x += v));
      s.d?.forEach((d) => (maxDur = Math.max(maxDur, d)));
      return { id: s.id, start, p: s.p, d: s.d, routes: new Set(s.p.map((i) => this.patterns[i].r)) };
    });
    this.maxDuration = maxDur;

    this.stopPatterns = raw.stops.map(() => []);
    this.patterns.forEach((p, pi) => p.pos.forEach((_, s) => this.stopPatterns[s].push(pi)));

    // ------------------------------------------------------------ stations
    this.stations = raw.stations.map((st) => {
      const stops = st.s.map((i) => raw.stops[i]);
      const id = stops[0].id;
      return {
        id,
        name: st.n,
        lat: st.lat,
        lng: st.lon,
        lines: st.r.map((r) => raw.routes[r].n),
        hasAccessibleAccess: stops.every((s) => s.w === 1),
        hasElevator: st.ac ? st.ac.some((a) => a[4] > 0) : stops.some((s) => s.e > 0),
        isBusStop: st.b === 1,
        stopCodes: stops.map((s) => s.c),
        accesses: st.ac?.map(([name, lat, lng, a, e]) => ({ name, lat, lng, accessible: a === 1, elevators: e }))
      };
    });
    this.stations.forEach((s, i) => this.stationById.set(s.id, i));

    // ------------------------------------------------------------ lines
    const today = madridClock().ymd;
    this.lines = raw.routes.map((r, ri) => {
      const pats = this.patterns.map((p, i) => ({ p, i })).filter(({ p }) => p.r === ri);
      const longest = (d: number) =>
        pats.filter(({ p }) => p.d === d).sort((a, b) => b.p.s.length - a.p.s.length)[0];
      const main = longest(0) || longest(1) || pats[0];
      const back = main && main.p.d === 0 ? longest(1) : undefined;
      const stations: Station[] = [];
      main?.p.s.forEach((s) => {
        const st = this.stations[raw.stops[s].g];
        if (stations[stations.length - 1]?.id !== st.id) stations.push(st);
      });
      const path = (p?: Pattern) => (p && p.sh >= 0 ? this.shapes[p.sh].pts.map(([a, b]) => [a, b] as [number, number]) : []);
      const stats = this.dayStats(ri, today);
      const [origin, destination] = r.ln.includes(' - ')
        ? r.ln.split(' - ')
        : r.ln.includes(' / ') ? r.ln.split(' / ') : [stations[0]?.name ?? '', stations[stations.length - 1]?.name ?? ''];
      return {
        id: `tmb-${r.id}`,
        code: r.n,
        name: r.ln,
        type: transitType(r),
        color: r.c,
        textColor: r.tc,
        operator: 'TMB' as const,
        origin: origin.trim(),
        destination: destination.trim(),
        stations,
        frequencyMinutes: stats.headway,
        pathCoordinates: path(main?.p),
        returnPathCoordinates: back ? path(back.p) : undefined,
        serviceStart: stats.first,
        serviceEnd: stats.last
      };
    });
    this.lines.forEach((l, i) => this.lineIndexByCode.set(l.code, i));
  }

  static async load(signal?: AbortSignal): Promise<TmbNetwork> {
    let res: Response | undefined;
    try {
      res = await fetch(NETWORK_URL, { signal, cache: 'no-cache' });
    } catch {
      res = undefined;
    }
    if (!res || !res.ok) {
      // Offline: fall back to a copy saved by the offline manager / service worker.
      const cached = typeof caches !== 'undefined' ? await caches.match(NETWORK_URL) : undefined;
      if (!cached) throw new Error('No se pudo cargar la red de TMB');
      res = cached;
    }
    return new TmbNetwork((await res.json()) as RawNetwork);
  }

  get feedValidity() {
    return { start: this.raw.feed.start, end: this.raw.feed.end, version: this.raw.feed.version };
  }

  hasServiceData(ymd: string): boolean {
    return !!this.raw.dates[ymd];
  }

  // ------------------------------------------------------------------ schedule core
  runsFor(c: MadridClock): Run[] {
    const runs: Run[] = [];
    (this.raw.dates[c.ymd] || []).forEach((i) => runs.push({ svc: this.services[i], svcIndex: i, ymd: c.ymd, off: 0 }));
    (this.raw.dates[c.prev] || []).forEach((i) => runs.push({ svc: this.services[i], svcIndex: i, ymd: c.prev, off: 86400 }));
    return runs;
  }

  /** Trips that are running at clock `c`. */
  activeTrips(c: MadridClock, filter?: (routeIndex: number) => boolean): ActiveTrip[] {
    const out: ActiveTrip[] = [];
    for (const { svc, svcIndex, ymd, off } of this.runsFor(c)) {
      if (filter && ![...svc.routes].some(filter)) continue;
      const t = c.secs + off;
      const s = svc.start;
      for (let j = upper(s, t) - 1; j >= 0 && s[j] >= t - this.maxDuration; j--) {
        const pi = svc.p[j];
        const p = this.patterns[pi];
        if (filter && !filter(p.r)) continue;
        const realDur = svc.d ? svc.d[j] : p.dur;
        const dt = t - s[j];
        if (dt > realDur) continue;
        const scale = svc.d && p.dur > 0 ? realDur / p.dur : 1;
        out.push({ pattern: p, patternIndex: pi, dt: scale > 0 ? dt / scale : dt, scale, id: `${ymd}-${svcIndex}-${j}` });
      }
    }
    return out;
  }

  private positionOf(p: Pattern, dt: number) {
    const o = p.o;
    let i = upper(o, dt) - 1;
    if (i < 0) i = 0;
    if (i >= o.length - 1) i = o.length - 2;
    const a = o[i], b = o[i + 1];
    const dwell = Math.min(20, (b - a) / 3);
    const arr = Math.max(a + 1, b - dwell);
    const f = Math.min(1, Math.max(0, (dt - a) / (arr - a)));
    const moving = dt < arr;

    const fromSt = this.raw.stops[p.s[i]];
    const toSt = this.raw.stops[p.s[i + 1]];
    let lat: number, lng: number, brg: number, segMetres: number;
    if (p.sh >= 0 && p.k.length === p.s.length) {
      const sh = this.shapes[p.sh];
      const da = p.k[i];
      const db = Math.max(da, p.k[i + 1]);
      segMetres = db - da;
      const d = da + (db - da) * f;
      let lo = upper(sh.cum, d) - 1;
      if (lo < 0) lo = 0;
      if (lo >= sh.pts.length - 1) lo = sh.pts.length - 2;
      const A = sh.pts[lo], B = sh.pts[lo + 1];
      const seg = sh.cum[lo + 1] - sh.cum[lo] || 1;
      const g = Math.min(1, Math.max(0, (d - sh.cum[lo]) / seg));
      lat = A[0] + (B[0] - A[0]) * g;
      lng = A[1] + (B[1] - A[1]) * g;
      brg = bearing(A, B);
    } else {
      const A: [number, number] = [fromSt.lat, fromSt.lon], B: [number, number] = [toSt.lat, toSt.lon];
      lat = A[0] + (B[0] - A[0]) * f;
      lng = A[1] + (B[1] - A[1]) * f;
      brg = bearing(A, B);
      segMetres = metres(A, B);
    }
    const speed = moving ? (segMetres / Math.max(1, arr - a)) * 3.6 : 0;
    return { lat, lng, bearing: brg, speedKmH: Math.round(speed), nextIdx: i + 1, arrAtNext: arr };
  }

  /** Every vehicle in service right now, positioned along its real route shape. */
  vehiclesAt(ms: number, opts: { includeBuses?: boolean } = {}): LiveVehicle[] {
    const c = madridClock(ms);
    const includeBuses = opts.includeBuses ?? true;
    const trips = this.activeTrips(c, includeBuses ? undefined : (r) => this.routes[r].t !== 'bus');
    return trips.map(({ pattern: p, dt, scale, id }) => {
      const route = this.routes[p.r];
      const pos = this.positionOf(p, dt);
      const next = this.stations[this.raw.stops[p.s[pos.nextIdx]].g];
      const type = transitType(route);
      return {
        id,
        lineId: `tmb-${route.id}`,
        lineCode: route.n,
        type,
        color: route.c,
        destination: p.h,
        lat: pos.lat,
        lng: pos.lng,
        speedKmH: pos.speedKmH,
        bearing: Math.round(pos.bearing),
        nextStationId: next.id,
        nextStationName: next.name,
        etaMinutes: Math.max(0, Math.round(((pos.arrAtNext - dt) * scale) / 60)),
        occupancy: 'unknown',
        delayMinutes: 0,
        isDelayed: false,
        model: type === 'bus' ? 'bus_articulated' : 'metro_9000',
        progressAlongRoute: p.dur > 0 ? Math.min(1, dt / p.dur) : 0,
        direction: p.d === 0 ? 'outbound' : 'inbound',
        source: 'schedule'
      } satisfies LiveVehicle;
    });
  }

  /** Scheduled departures from a station (all its platforms), grouped per line + direction. */
  departuresAt(stationId: string, ms: number, perDirection = 3): Departure[] {
    const si = this.stationById.get(stationId);
    if (si === undefined) return [];
    const c = madridClock(ms);
    const stopSet = this.raw.stations[si].s;
    const relevant = new Map<number, number[]>(); // pattern -> positions (excluding final stop)
    for (const s of stopSet) {
      for (const pi of this.stopPatterns[s]) {
        const p = this.patterns[pi];
        const k = p.pos.get(s)!;
        if (k >= p.s.length - 1) continue; // terminating here: nothing departs
        relevant.set(pi, [k]);
      }
    }
    if (!relevant.size) return [];
    const routesHere = new Set([...relevant.keys()].map((pi) => this.patterns[pi].r));
    const groups = new Map<string, { r: number; h: string; times: { t: number; id: string }[] }>();
    for (const { svc, svcIndex, ymd, off } of this.runsFor(c)) {
      if (![...svc.routes].some((r) => routesHere.has(r))) continue;
      for (let j = 0; j < svc.start.length; j++) {
        const pi = svc.p[j];
        const ks = relevant.get(pi);
        if (!ks) continue;
        const p = this.patterns[pi];
        const scale = svc.d && p.dur > 0 ? svc.d[j] / p.dur : 1;
        const at = svc.start[j] + p.o[ks[0]] * scale - off;
        if (at < c.secs - 20) continue;
        const key = `${p.r}|${p.h}`;
        let g = groups.get(key);
        if (!g) groups.set(key, (g = { r: p.r, h: p.h, times: [] }));
        g.times.push({ t: at, id: `${ymd}-${svcIndex}-${j}` });
      }
    }
    const out: Departure[] = [];
    groups.forEach((g) => {
      g.times.sort((a, b) => a.t - b.t);
      const last = lastOfNight(g.times.map((x) => x.t));
      const route = this.routes[g.r];
      g.times.slice(0, perDirection).forEach((x) => {
        const wait = Math.max(0, x.t - c.secs);
        if (wait > 3 * 3600) return;
        out.push({
          vehicleId: x.id,
          lineCode: route.n,
          lineColor: route.c,
          lineTextColor: route.tc,
          type: transitType(route),
          destination: g.h,
          timeEstimateMinutes: Math.floor(wait / 60),
          timeEstimateSeconds: Math.round(wait),
          departureTime: formatClock(x.t),
          isLastOfDay: x.t === last,
          isRealTime: false,
          delayMinutes: 0,
          occupancy: 'unknown',
          source: 'schedule'
        });
      });
    });
    return out.sort((a, b) => (a.timeEstimateSeconds ?? 0) - (b.timeEstimateSeconds ?? 0));
  }

  /** First/last departure and typical daytime headway for a route on a date. */
  dayStats(routeIndex: number, ymd: string): { first?: string; last?: string; headway: number } {
    const starts: number[] = [];
    for (const i of this.raw.dates[ymd] || []) {
      const svc = this.services[i];
      if (!svc.routes.has(routeIndex)) continue;
      svc.p.forEach((pi, j) => {
        const p = this.patterns[pi];
        if (p.r === routeIndex && p.d === 0) starts.push(svc.start[j]);
      });
    }
    if (!starts.length) return { headway: 0 };
    starts.sort((a, b) => a - b);
    const day = starts.filter((t) => t >= 8 * 3600 && t <= 20 * 3600);
    const gaps: number[] = [];
    for (let i = 1; i < day.length; i++) if (day[i] > day[i - 1]) gaps.push(day[i] - day[i - 1]);
    gaps.sort((a, b) => a - b);
    const med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
    return {
      first: formatClock(starts[0]),
      last: formatClock(lastOfNight(starts)),
      headway: med ? Math.round((med / 60) * 10) / 10 : 0
    };
  }

  /** Status notices derived from the timetable (service ended / last trains soon). */
  scheduleNotices(ms: number): ServiceNotice[] {
    const c = madridClock(ms);
    const notices: ServiceNotice[] = [];
    this.routes.forEach((r, ri) => {
      if (r.t === 'bus') return;
      const times: number[] = [];
      for (const { svc, off } of this.runsFor(c)) {
        if (!svc.routes.has(ri)) continue;
        svc.p.forEach((pi, j) => { if (this.patterns[pi].r === ri) times.push(svc.start[j] - off); });
      }
      const future = times.filter((t) => t >= c.secs).sort((a, b) => a - b);
      const running = this.activeTrips(c, (x) => x === ri).length > 0;
      if (!future.length || future[0] - c.secs > 60 * 60) {
        if (running) return;
        const next = future[0] !== undefined ? formatClock(future[0]) : null;
        notices.push(makeNotice(`closed-${r.n}`, r.n, 'works', 'medium', noticeText.closed(r.n, next)));
        return;
      }
      const last = lastOfNight(future);
      const left = last - c.secs;
      if (left <= 45 * 60) {
        notices.push(makeNotice(`last-${r.n}`, r.n, 'info', left <= 15 * 60 ? 'high' : 'low', noticeText.last(r.n, formatClock(last))));
      }
    });
    return notices;
  }

  nearestStation(lat: number, lng: number, opts: { metroOnly?: boolean } = {}): Station | null {
    let best: Station | null = null, bd = Infinity;
    for (const s of this.stations) {
      if (opts.metroOnly && s.isBusStop) continue;
      const d = metres([lat, lng], [s.lat, s.lng]);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  nextServiceDate(ymd: string): string | null {
    for (let i = 0; i < 7; i++) { const d = ymdShift(ymd, i); if (this.raw.dates[d]) return d; }
    return null;
  }
}

export function lastOfNight(times: number[]): number {
  for (let i = 0; i < times.length - 1; i++) if (times[i + 1] - times[i] > NIGHT_GAP) return times[i];
  return times[times.length - 1];
}

// -------------------------------------------------------------------- notice texts
type L10n = Record<Language, string>;

function makeNotice(id: string, lineCode: string, type: ServiceNotice['type'], severity: ServiceNotice['severity'], txt: { title: L10n; description: L10n }): ServiceNotice {
  return { id, lineCode, type, severity, title: txt.title, description: txt.description, timestamp: 'GTFS' };
}

const noticeText = {
  closed: (line: string, next: string | null) => ({
    title: {
      es: `${line}: sin servicio ahora`,
      en: `${line}: not running now`,
      ca: `${line}: sense servei ara`,
      ar: `${line}: لا توجد خدمة الآن`
    },
    description: next
      ? {
          es: `Según el horario oficial de TMB, el próximo servicio sale a las ${next}.`,
          en: `According to the official TMB timetable, the next service leaves at ${next}.`,
          ca: `Segons l'horari oficial de TMB, el proper servei surt a les ${next}.`,
          ar: `حسب الجدول الرسمي لـ TMB، أول رحلة قادمة تنطلق الساعة ${next}.`
        }
      : {
          es: 'No hay más servicios programados hoy.',
          en: 'No more services scheduled today.',
          ca: 'No hi ha més serveis programats avui.',
          ar: 'لا توجد رحلات أخرى مجدولة اليوم.'
        }
  }),
  last: (line: string, at: string) => ({
    title: {
      es: `${line}: últimos trenes de la noche`,
      en: `${line}: last trains tonight`,
      ca: `${line}: últims trens de la nit`,
      ar: `${line}: آخر قطارات الليلة`
    },
    description: {
      es: `La última salida desde cabecera es a las ${at}.`,
      en: `The last departure from the terminus is at ${at}.`,
      ca: `L'última sortida des de capçalera és a les ${at}.`,
      ar: `آخر انطلاق من المحطة الأولى الساعة ${at}.`
    }
  })
};
