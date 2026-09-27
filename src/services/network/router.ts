/**
 * Journey planner: Connection Scan Algorithm over the day's timetable (ported from the
 * "Último tren" prototype). Nodes are GTFS stops (platforms); footpaths are in-station
 * interchanges (GTFS transfers/pathways) plus walks of up to 400 m between stops.
 */
import type { TmbNetwork } from './engine';
import { distanceMetres, walkSeconds } from './engine';
import { madridClock, ymdShift } from './clock';

export interface Seed {
  s: number; // stop index
  w: number; // walking seconds to/from that stop
}

export type Leg =
  | { kind: 'walk'; from: number | null; to: number | null; seconds: number; start: number; end: number }
  | {
      kind: 'ride';
      route: number;
      headsign: string;
      from: number;
      to: number;
      dep: number;
      arr: number;
      stops: number;
      pattern: number;
      k0: number; // index of boarding stop in the pattern
      k1: number; // index of alighting stop in the pattern
    };

export interface Journey {
  ymd: string;       // service date the times refer to (seconds after its midnight)
  dep: number;       // leave origin
  arr: number;       // reach destination
  legs: Leg[];
  transfers: number;
}

export interface RouteOptions {
  stepFree: boolean;
  buses: boolean;
  /** Extra margin (s) required for each change; biases towards fewer transfers. */
  penalty?: number;
}

/** Ranking: arrival time plus 4 minutes per transfer and a small weight for walking. */
export function journeyScore(j: Journey): number {
  const walk = j.legs.reduce((a, l) => a + (l.kind === 'walk' ? l.seconds : 0), 0);
  return j.arr + j.transfers * 240 + walk * 0.3;
}

interface Connections {
  n: number;
  nTrips: number;
  tripPat: Int32Array;
  dep: Int32Array;
  arr: Int32Array;
  fr: Uint16Array;
  to: Uint16Array;
  trip: Int32Array;
  rt: Uint8Array;
  ck: Uint8Array; // stop position (in pattern) of the departure
}

const WALK_RADIUS = 400;

const lowerBound = (a: Int32Array, x: number) => {
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; }
  return lo;
};
const upperBound = (a: Int32Array, x: number) => {
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= x) lo = m + 1; else hi = m; }
  return lo;
};

export class Router {
  private readonly net: TmbNetwork;
  private readonly nStops: number;
  /** footpaths[s] = [[neighbour, seconds], ...] */
  private readonly foot: [number, number][][];
  private readonly cache = new Map<string, Connections>();

  constructor(net: TmbNetwork) {
    this.net = net;
    const stops = net.raw.stops;
    this.nStops = stops.length;

    // Walking links between nearby stops (spatial grid ~400 m cells)
    const foot = new Map<number, Map<number, number>>();
    const add = (a: number, b: number, secs: number) => {
      if (!foot.has(a)) foot.set(a, new Map());
      const m = foot.get(a)!;
      m.set(b, Math.min(m.get(b) ?? Infinity, secs));
    };
    const cell = 0.004;
    const grid = new Map<string, number[]>();
    stops.forEach((s, i) => {
      const k = `${Math.floor(s.lat / cell)},${Math.floor(s.lon / cell)}`;
      (grid.get(k) || grid.set(k, []).get(k)!).push(i);
    });
    stops.forEach((s, i) => {
      const gx = Math.floor(s.lat / cell), gy = Math.floor(s.lon / cell);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        for (const j of grid.get(`${gx + a},${gy + b}`) || []) {
          if (j === i) continue;
          const d = distanceMetres([s.lat, s.lon], [stops[j].lat, stops[j].lon]);
          if (d <= WALK_RADIUS) add(i, j, walkSeconds(d) + 60);
        }
      }
    });
    // Official in-station interchange times override the estimate
    for (const [a, b, secs] of net.raw.x || []) {
      if (!foot.has(a)) foot.set(a, new Map());
      foot.get(a)!.set(b, secs);
    }
    this.foot = stops.map((_, i) => [...(foot.get(i) || new Map())]);
  }

  // ------------------------------------------------------------------ helpers
  private isBus(stop: number) {
    return this.net.raw.stations[this.net.raw.stops[stop].g].b === 1;
  }

  private canUse(stop: number, route: number, o: RouteOptions) {
    if (!o.stepFree) return true;
    if (this.net.routes[route].t === 'bus') return true; // TMB buses are low-floor with ramps
    return this.net.raw.stops[stop].w !== 2;
  }

  private changeTime(stop: number, o: RouteOptions) {
    return (this.isBus(stop) ? 60 : o.stepFree ? 420 : 180) + (o.penalty ?? 0);
  }

  private routeOn(route: number, o: RouteOptions) {
    return o.buses || this.net.routes[route].t !== 'bus';
  }

  /** All elementary connections (stop → next stop) of trips running on service date `ymd`. */
  connections(ymd: string): Connections {
    const hit = this.cache.get(ymd);
    if (hit) return hit;
    const runs: { i: number; off: number }[] = [];
    (this.net.raw.dates[ymd] || []).forEach((i) => runs.push({ i, off: 0 }));
    (this.net.raw.dates[ymdShift(ymd, -1)] || []).forEach((i) => runs.push({ i, off: 86400 }));

    let total = 0, trips = 0;
    for (const { i } of runs) {
      const svc = this.net.services[i];
      for (const pi of svc.p) { total += this.net.patterns[pi].s.length - 1; trips++; }
    }
    const dep = new Int32Array(total), arr = new Int32Array(total), fr = new Uint16Array(total), to = new Uint16Array(total);
    const trip = new Int32Array(total), rt = new Uint8Array(total), ck = new Uint8Array(total), tripPat = new Int32Array(trips);
    let c = 0, tid = 0;
    for (const { i, off } of runs) {
      const svc = this.net.services[i];
      for (let j = 0; j < svc.p.length; j++) {
        const p = this.net.patterns[svc.p[j]];
        const scale = svc.d && p.dur > 0 ? svc.d[j] / p.dur : 1;
        const base = svc.start[j] - off;
        tripPat[tid] = svc.p[j];
        for (let k = 0; k < p.s.length - 1; k++) {
          dep[c] = base + Math.round(p.o[k] * scale);
          arr[c] = Math.max(dep[c], base + Math.round(p.o[k + 1] * scale));
          fr[c] = p.s[k];
          to[c] = p.s[k + 1];
          trip[c] = tid;
          rt[c] = p.r;
          ck[c] = Math.min(k, 255);
          c++;
        }
        tid++;
      }
    }
    const ord = new Uint32Array(total);
    for (let x = 0; x < total; x++) ord[x] = x;
    ord.sort((a, b) => dep[a] - dep[b] || arr[a] - arr[b] || ck[a] - ck[b]);
    const C: Connections = {
      n: total, nTrips: trips, tripPat,
      dep: new Int32Array(total), arr: new Int32Array(total), fr: new Uint16Array(total), to: new Uint16Array(total),
      trip: new Int32Array(total), rt: new Uint8Array(total), ck: new Uint8Array(total)
    };
    for (let x = 0; x < total; x++) {
      const o = ord[x];
      C.dep[x] = dep[o]; C.arr[x] = arr[o]; C.fr[x] = fr[o]; C.to[x] = to[o]; C.trip[x] = trip[o]; C.rt[x] = rt[o]; C.ck[x] = ck[o];
    }
    if (this.cache.size >= 2) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(ymd, C);
    return C;
  }

  /** Stops reachable on foot from a coordinate (used for "my location"). */
  seedsNear(lat: number, lng: number, radius = 700): Seed[] {
    const stops = this.net.raw.stops;
    const out: Seed[] = [];
    let best = -1, bd = Infinity;
    stops.forEach((s, i) => {
      const d = distanceMetres([lat, lng], [s.lat, s.lon]);
      if (d <= radius) out.push({ s: i, w: walkSeconds(d) });
      if (d < bd) { bd = d; best = i; }
    });
    if (!out.length && best >= 0) out.push({ s: best, w: walkSeconds(bd) });
    return out;
  }

  /** All platforms of a station (optionally plus stops within walking distance). */
  seedsForStation(stationIndex: number, withWalk = true): Seed[] {
    const m = new Map<number, number>();
    for (const s of this.net.raw.stations[stationIndex].s) {
      m.set(s, 0);
      if (withWalk) for (const [n, w] of this.foot[s]) if (!m.has(n) || m.get(n)! > w) m.set(n, w);
    }
    // platforms of the station itself are always 0
    for (const s of this.net.raw.stations[stationIndex].s) m.set(s, 0);
    return [...m].map(([s, w]) => ({ s, w }));
  }

  // ------------------------------------------------------------------ earliest arrival
  earliest(ymd: string, seeds: Seed[], t0: number, targets: Seed[], o: RouteOptions): Journey | null {
    const C = this.connections(ymd);
    const N = this.nStops;
    const S = new Float64Array(N).fill(Infinity);
    const slack = new Float64Array(N);
    const J: ({ k: 'start'; w: number } | { k: 'walk'; f: number; w: number } | { k: 'ride'; e: number; x: number } | undefined)[] = new Array(N);
    for (const { s, w } of seeds) if (t0 + w < S[s]) { S[s] = t0 + w; J[s] = { k: 'start', w }; }
    const tw = new Map(targets.map((x) => [x.s, x.w]));
    let best = Infinity, bestS = -1;
    tw.forEach((w, s) => { if (S[s] + w < best) { best = S[s] + w; bestS = s; } });
    // walking from start directly into nearby stops
    for (const { s, w } of seeds) for (const [nb, ww] of this.foot[s]) {
      const v = t0 + w + ww;
      if (v < S[nb]) { S[nb] = v; J[nb] = { k: 'walk', f: s, w: ww }; }
    }

    const Tr = new Int32Array(C.nTrips).fill(-1);
    for (let i = lowerBound(C.dep, t0); i < C.n; i++) {
      const d = C.dep[i];
      if (d >= best) break;
      const r = C.rt[i];
      if (!this.routeOn(r, o)) continue;
      const tr = C.trip[i];
      if (Tr[tr] < 0) {
        const f = C.fr[i];
        if (S[f] + slack[f] <= d && this.canUse(f, r, o)) Tr[tr] = i;
        else continue;
      }
      const to = C.to[i], a = C.arr[i];
      if (a < S[to] && this.canUse(to, r, o)) {
        S[to] = a;
        slack[to] = this.changeTime(to, o);
        J[to] = { k: 'ride', e: Tr[tr], x: i };
        if (tw.has(to) && a + tw.get(to)! < best) { best = a + tw.get(to)!; bestS = to; }
        for (const [nb, w] of this.foot[to]) {
          if (a + w < S[nb]) {
            S[nb] = a + w; slack[nb] = o.penalty ?? 0; J[nb] = { k: 'walk', f: to, w };
            if (tw.has(nb) && a + w + tw.get(nb)! < best) { best = a + w + tw.get(nb)!; bestS = nb; }
          }
        }
      }
    }
    if (bestS < 0 || !Number.isFinite(best)) return null;

    // Reconstruct backwards
    const raw: Leg[] = [];
    const endW = tw.get(bestS)!;
    if (endW > 0) raw.push({ kind: 'walk', from: bestS, to: null, seconds: endW, start: best - endW, end: best });
    let s = bestS, guard = 0;
    while (J[s] && guard++ < 80) {
      const j = J[s]!;
      if (j.k === 'start') {
        if (j.w > 0) raw.push({ kind: 'walk', from: null, to: s, seconds: j.w, start: S[s] - j.w, end: S[s] });
        break;
      }
      if (j.k === 'walk') { raw.push({ kind: 'walk', from: j.f, to: s, seconds: j.w, start: S[s] - j.w, end: S[s] }); s = j.f; continue; }
      raw.push(this.rideLeg(C, j.e, j.x));
      s = C.fr[j.e];
    }
    raw.reverse();
    return this.finish(ymd, raw, t0);
  }

  // ------------------------------------------------------------------ latest departure
  latest(ymd: string, origins: Seed[], dests: Seed[], deadline: number, tmin: number, o: RouteOptions): Journey | null {
    const C = this.connections(ymd);
    const N = this.nStops;
    const L = new Float64Array(N).fill(-Infinity);
    const fin = new Uint8Array(N);
    const K: ({ k: 'end'; w: number } | { k: 'walk'; t: number; w: number } | { k: 'ride'; e: number; x: number } | undefined)[] = new Array(N);
    for (const { s, w } of dests) { const v = deadline - w; if (v > L[s]) { L[s] = v; K[s] = { k: 'end', w }; fin[s] = 1; } }
    const ow = new Map(origins.map((x) => [x.s, x.w]));
    let best = -Infinity, bestS = -1;
    ow.forEach((w, s) => { if (fin[s] && L[s] - w > best) { best = L[s] - w; bestS = s; } });

    const TL = new Int32Array(C.nTrips).fill(-1);
    for (let i = upperBound(C.dep, deadline) - 1; i >= 0; i--) {
      const d = C.dep[i];
      if (d < tmin || d <= best) break;
      const r = C.rt[i];
      if (!this.routeOn(r, o)) continue;
      const tr = C.trip[i];
      if (TL[tr] < 0) {
        const to = C.to[i];
        const sl = fin[to] ? 0 : K[to]?.k === 'walk' ? o.penalty ?? 0 : this.changeTime(to, o);
        if (C.arr[i] <= L[to] - sl && this.canUse(to, r, o)) TL[tr] = i;
        else continue;
      }
      const f = C.fr[i];
      if (d > L[f] && this.canUse(f, r, o)) {
        L[f] = d; K[f] = { k: 'ride', e: i, x: TL[tr] }; fin[f] = 0;
        if (ow.has(f) && d - ow.get(f)! > best) { best = d - ow.get(f)!; bestS = f; }
        for (const [nb, w] of this.foot[f]) {
          if (d - w > L[nb]) {
            L[nb] = d - w; K[nb] = { k: 'walk', t: f, w }; fin[nb] = 0;
            if (ow.has(nb) && d - w - ow.get(nb)! > best) { best = d - w - ow.get(nb)!; bestS = nb; }
          }
        }
      }
    }
    if (bestS < 0) return null;

    const legs: Leg[] = [];
    const startW = ow.get(bestS)!;
    if (startW > 0) legs.push({ kind: 'walk', from: null, to: bestS, seconds: startW, start: best, end: best + startW });
    let s = bestS, guard = 0;
    while (K[s] && guard++ < 80) {
      const k = K[s]!;
      if (k.k === 'end') {
        if (k.w > 0) legs.push({ kind: 'walk', from: s, to: null, seconds: k.w, start: L[s], end: L[s] + k.w });
        break;
      }
      if (k.k === 'walk') { legs.push({ kind: 'walk', from: s, to: k.t, seconds: k.w, start: L[s], end: L[s] + k.w }); s = k.t; continue; }
      const lg = this.rideLeg(C, k.e, k.x);
      legs.push(lg);
      s = lg.to;
    }
    return this.finish(ymd, legs, best);
  }

  private rideLeg(C: Connections, e: number, x: number): Extract<Leg, { kind: 'ride' }> {
    const pi = C.tripPat[C.trip[e]];
    const p = this.net.patterns[pi];
    return {
      kind: 'ride', route: C.rt[e], headsign: p.h, from: C.fr[e], to: C.to[x], dep: C.dep[e], arr: C.arr[x],
      stops: C.ck[x] - C.ck[e] + 1, pattern: pi, k0: C.ck[e], k1: C.ck[x] + 1
    };
  }

  /** Re-time walking legs around rides (leave as late as possible, arrive right after). */
  private finish(ymd: string, legs: Leg[], fallbackDep: number): Journey | null {
    const rides = legs.filter((l): l is Extract<Leg, { kind: 'ride' }> => l.kind === 'ride');
    // merge consecutive walks
    const merged: Leg[] = [];
    for (const l of legs) {
      const prev = merged[merged.length - 1];
      if (l.kind === 'walk' && prev?.kind === 'walk') {
        merged[merged.length - 1] = { ...prev, to: l.to, seconds: prev.seconds + l.seconds, end: prev.end + l.seconds };
      } else merged.push(l);
    }
    if (!rides.length) {
      const w = merged.reduce((a, l) => a + (l.kind === 'walk' ? l.seconds : 0), 0);
      return w ? { ymd, dep: fallbackDep, arr: fallbackDep + w, legs: merged, transfers: 0 } : null;
    }
    // walk before first ride ends exactly at boarding; after each ride starts at alighting
    let t = rides[0].dep;
    const firstIdx = merged.indexOf(rides[0]);
    for (let i = firstIdx - 1; i >= 0; i--) {
      const l = merged[i];
      if (l.kind === 'walk') { merged[i] = { ...l, end: t, start: t - l.seconds }; t -= l.seconds; }
    }
    const dep = t;
    t = rides[0].arr;
    for (let i = firstIdx + 1; i < merged.length; i++) {
      const l = merged[i];
      if (l.kind === 'ride') { t = l.arr; continue; }
      merged[i] = { ...l, start: t, end: t + l.seconds };
      t += l.seconds;
    }
    return { ymd, dep, arr: t, legs: merged, transfers: rides.length - 1 };
  }

  // ------------------------------------------------------------------ high level
  /** Best of a plain and a transfer-averse search (both are real, feasible journeys). */
  private bestEarliest(ymd: string, origins: Seed[], t0: number, dests: Seed[], o: RouteOptions): Journey | null {
    const a = this.earliest(ymd, origins, t0, dests, { ...o, penalty: 0 });
    const b = this.earliest(ymd, origins, t0, dests, { ...o, penalty: 300 });
    if (!a || !b) return a || b;
    return journeyScore(b) <= journeyScore(a) ? b : a;
  }

  /** Up to `count` successive options leaving after `ms`. */
  plan(origins: Seed[], dests: Seed[], ms: number, o: RouteOptions, count = 3): Journey[] {
    const c = madridClock(ms);
    const out: Journey[] = [];
    let t0 = Math.floor(c.secs);
    for (let i = 0; i < count + 2 && out.length < count; i++) {
      const j = this.bestEarliest(c.ymd, origins, t0, dests, o);
      if (!j) break;
      if (!out.some((x) => x.dep === j.dep && x.arr === j.arr)) out.push(j);
      const firstRide = j.legs.find((l) => l.kind === 'ride') as Extract<Leg, { kind: 'ride' }> | undefined;
      if (!firstRide) break;
      const walkBefore = j.legs.slice(0, j.legs.indexOf(firstRide)).reduce((a, l) => a + (l.kind === 'walk' ? l.seconds : 0), 0);
      t0 = firstRide.dep - walkBefore + 60;
    }
    return out;
  }

  /** Latest-departure options that still arrive by `deadlineSecs` on service date `ymd`. */
  planArriveBy(origins: Seed[], dests: Seed[], ymd: string, deadlineSecs: number, tmin: number, o: RouteOptions, count = 2): Journey[] {
    const out: Journey[] = [];
    let deadline = deadlineSecs;
    for (let i = 0; i < count; i++) {
      const j = this.latest(ymd, origins, dests, deadline, tmin, o);
      if (!j) break;
      out.push(j);
      deadline = j.arr - 60;
    }
    return out;
  }
}

// ------------------------------------------------------------------ geometry for the map
export interface JourneySegment {
  color: string;
  dashed: boolean;
  points: [number, number][];
}

/** Polylines for a journey: ride legs follow the real route shape, walks are straight lines. */
export function journeyGeometry(net: TmbNetwork, j: Journey, origin?: [number, number], dest?: [number, number]): JourneySegment[] {
  const stopPos = (s: number): [number, number] => [net.raw.stops[s].lat, net.raw.stops[s].lon];
  const out: JourneySegment[] = [];
  j.legs.forEach((l) => {
    if (l.kind === 'walk') {
      const a = l.from !== null ? stopPos(l.from) : origin;
      const b = l.to !== null ? stopPos(l.to) : dest;
      if (a && b) out.push({ color: '#e2e8f0', dashed: true, points: [a, b] });
      return;
    }
    const p = net.patterns[l.pattern];
    const color = net.routes[l.route].c;
    if (p.sh < 0 || p.k.length !== p.s.length) {
      out.push({ color, dashed: false, points: p.s.slice(l.k0, l.k1).map(stopPos) });
      return;
    }
    const sh = net.shapes[p.sh];
    const d0 = p.k[l.k0], d1 = p.k[Math.min(l.k1 - 1, p.k.length - 1)];
    const pts: [number, number][] = [stopPos(l.from)];
    sh.cum.forEach((c, i) => { if (c > d0 && c < d1) pts.push(sh.pts[i]); });
    pts.push(stopPos(l.to));
    out.push({ color, dashed: false, points: pts });
  });
  return out;
}
