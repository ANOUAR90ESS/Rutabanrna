#!/usr/bin/env node
/**
 * Converts the official TMB GTFS feed into the compact JSON the app loads at runtime
 * (public/data/tmb-network.json).
 *
 *   node scripts/build-gtfs.mjs [path/to/gtfs.zip|gtfs-dir] [path/to/accessos_estacio_linia.json]
 *
 * Defaults: data/sources/tmb-gtfs.zip and data/sources/accessos_estacio_linia.json
 * Output format is documented in src/services/network/types.ts (RawNetwork).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.resolve(process.argv[2] || path.join(ROOT, 'data/sources/tmb-gtfs.zip'));
const ACCESS_SRC = path.resolve(process.argv[3] || path.join(ROOT, 'data/sources/accessos_estacio_linia.json'));
const OUT = path.join(ROOT, 'public/data/tmb-network.json');

// ---------------------------------------------------------------- helpers
function openDir(src) {
  if (fs.statSync(src).isDirectory()) return src;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtfs-'));
  execFileSync('unzip', ['-oq', src, '-d', dir]);
  return dir;
}

function parseLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function readCsv(dir, name) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const head = parseLine(lines[0]);
  return lines.slice(1).map((l) => {
    const v = parseLine(l);
    const o = {};
    head.forEach((h, i) => (o[h] = v[i] ?? ''));
    return o;
  });
}

async function streamCsv(dir, name, onRow) {
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, name)), crlfDelay: Infinity });
  let head = null;
  for await (const raw of rl) {
    if (!raw) continue;
    const line = head ? raw : raw.replace(/^﻿/, '');
    const v = line.includes('"') ? parseLine(line) : line.split(',');
    if (!head) { head = Object.fromEntries(v.map((h, i) => [h, i])); continue; }
    onRow(v, head);
  }
}

// Blank times (non-timepoint stops) become NaN and are interpolated later.
const toSec = (s) => { if (!s) return NaN; const [h, m, x] = s.split(':').map(Number); return h * 3600 + m * 60 + (x || 0); };
const E5 = (v) => Math.round(v * 1e5);

function haversine(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Douglas–Peucker on lat/lon using a local metric projection
function simplify(pts, tolM) {
  if (pts.length < 3) return pts.map((_, i) => i);
  const k = 111320 * Math.cos(pts[0][0] * Math.PI / 180);
  const xy = pts.map(([la, lo]) => [lo * k, la * 110574]);
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = xy[a], [bx, by] = xy[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    let best = -1, bd = tolM;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((xy[i][0] - ax) * dy - (xy[i][1] - ay) * dx) / L;
      if (d > bd) { bd = d; best = i; }
    }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  const idx = []; keep.forEach((v, i) => v && idx.push(i));
  return idx;
}

function ymd(d) { return d.toISOString().slice(0, 10).replace(/-/g, ''); }

// ---------------------------------------------------------------- main
const dir = openDir(SRC);
console.log('GTFS dir:', dir);

const feedInfo = readCsv(dir, 'feed_info.txt')[0] || {};
const routesCsv = readCsv(dir, 'routes.txt');
const stopsCsv = readCsv(dir, 'stops.txt');
const tripsCsv = readCsv(dir, 'trips.txt');
const calendar = readCsv(dir, 'calendar.txt');
const calendarDates = readCsv(dir, 'calendar_dates.txt');
const frequencies = readCsv(dir, 'frequencies.txt');
const pathways = readCsv(dir, 'pathways.txt');

// Routes ---------------------------------------------------------------
const kindOf = (r) => (r.route_type === '1' ? 'metro' : r.route_type === '7' ? 'funicular' : 'bus');
const routeOrder = (r) => {
  const k = kindOf(r);
  const base = k === 'metro' ? 0 : k === 'funicular' ? 1 : 2;
  const m = r.route_short_name.match(/\d+/);
  return [base, m ? +m[0] : 999, r.route_short_name];
};
routesCsv.sort((a, b) => {
  const A = routeOrder(a), B = routeOrder(b);
  return A[0] - B[0] || A[1] - B[1] || A[2].localeCompare(B[2]);
});
const routeIdx = new Map(routesCsv.map((r, i) => [r.route_id, i]));
const routes = routesCsv.map((r) => ({
  id: r.route_id,
  n: r.route_short_name,
  ln: r.route_long_name,
  c: '#' + (r.route_color || '64748B').toUpperCase(),
  tc: '#' + (r.route_text_color || 'FFFFFF').toUpperCase(),
  t: kindOf(r)
}));

// Elevators per metro station code (TMB open data "accessos_estacio_linia")
const elevators = new Map();
const accessesByCode = new Map(); // station code -> [{c, n, lat, lon, a, e}]
if (fs.existsSync(ACCESS_SRC)) {
  const acc = JSON.parse(fs.readFileSync(ACCESS_SRC, 'utf8'));
  for (const f of acc.features) {
    const p = f.properties;
    const code = String(p.CODI_ESTACIO);
    elevators.set(code, (elevators.get(code) || 0) + (p.NUM_ASCENSORS || 0));
    if (!accessesByCode.has(code)) accessesByCode.set(code, []);
    const [lon, lat] = f.geometry.coordinates;
    accessesByCode.get(code).push({
      c: String(p.CODI_ACCES),
      n: p.NOM_ACCES,
      lat: +lat.toFixed(6),
      lon: +lon.toFixed(6),
      a: p.ID_TIPUS_ACCESSIBILITAT === 1 ? 1 : 0,
      e: p.NUM_ASCENSORS || 0
    });
  }
}
const elevatorPathways = new Map();
for (const p of pathways) if (p.pathway_mode === '5') {
  for (const s of [p.from_stop_id, p.to_stop_id]) elevatorPathways.set(s, true);
}

// Stops (boarding points only) -----------------------------------------
const parentOf = new Map(stopsCsv.map((s) => [s.stop_id, s.parent_station]));
const boarding = stopsCsv.filter((s) => s.location_type === '0' || s.location_type === '');

// Trips ------------------------------------------------------------------
const trips = new Map();
for (const t of tripsCsv) {
  if (!routeIdx.has(t.route_id)) continue;
  trips.set(t.trip_id, { r: routeIdx.get(t.route_id), svc: t.service_id, h: t.trip_headsign, dir: +t.direction_id || 0, shape: t.shape_id, st: [] });
}

console.log('Reading stop_times…');
await streamCsv(dir, 'stop_times.txt', (v, h) => {
  const tr = trips.get(v[h.trip_id]);
  if (!tr) return;
  tr.st.push([+v[h.stop_sequence], v[h.stop_id], toSec(v[h.arrival_time]), toSec(v[h.departure_time])]);
});

// Shapes ----------------------------------------------------------------
console.log('Reading shapes…');
const rawShapes = new Map();
await streamCsv(dir, 'shapes.txt', (v, h) => {
  const id = v[h.shape_id];
  if (!rawShapes.has(id)) rawShapes.set(id, []);
  rawShapes.get(id).push([+v[h.shape_pt_sequence], +v[h.shape_pt_lat], +v[h.shape_pt_lon]]);
});
const shapeIdx = new Map();
const shapes = [];
function getShape(id) {
  if (shapeIdx.has(id)) return shapeIdx.get(id);
  const raw = rawShapes.get(id);
  if (!raw) return -1;
  raw.sort((a, b) => a[0] - b[0]);
  const full = raw.map((p) => [p[1], p[2]]);
  const keep = simplify(full, 3);
  const pts = keep.map((i) => full[i]);
  shapeIdx.set(id, shapes.length);
  shapes.push(pts);
  return shapes.length - 1;
}

// Stops actually served + their routes -----------------------------------
const stopRoutes = new Map();
for (const tr of trips.values()) {
  if (!tr.st.length) continue;
  tr.st.sort((a, b) => a[0] - b[0]);
  for (const s of tr.st) {
    if (!stopRoutes.has(s[1])) stopRoutes.set(s[1], new Set());
    stopRoutes.get(s[1]).add(tr.r);
  }
}
const served = boarding.filter((s) => stopRoutes.has(s.stop_id));

// Group metro platforms of different lines into one "station" (same name, < 350 m).
const stations = [];
const stopIdx = new Map();
const stops = [];
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
served.sort((a, b) => a.stop_id.localeCompare(b.stop_id, 'en', { numeric: true }));
for (const s of served) {
  const rs = [...stopRoutes.get(s.stop_id)].sort((a, b) => a - b);
  const isBus = rs.every((r) => routes[r].t === 'bus');
  const lat = +s.stop_lat, lon = +s.stop_lon;
  let g = -1;
  if (!isBus) {
    g = stations.findIndex((st) => !st.b && norm(st.n) === norm(s.stop_name) && haversine([st.lat, st.lon], [lat, lon]) < 350);
  }
  if (g < 0) {
    g = stations.length;
    stations.push({ n: s.stop_name, lat, lon, b: isBus ? 1 : 0, s: [], r: new Set() });
  }
  const code = s.stop_code || s.stop_id.split('.').pop();
  const elev = elevators.get(code) || (elevatorPathways.has(s.stop_id) ? 1 : 0);
  stopIdx.set(s.stop_id, stops.length);
  stops.push({ id: s.stop_id, c: code, g, lat, lon, w: +s.wheelchair_boarding || 0, e: elev, r: rs });
  stations[g].s.push(stops.length - 1);
  rs.forEach((r) => stations[g].r.add(r));
}
for (const st of stations) {
  const ss = st.s.map((i) => stops[i]);
  st.lat = +(ss.reduce((a, s) => a + s.lat, 0) / ss.length).toFixed(6);
  st.lon = +(ss.reduce((a, s) => a + s.lon, 0) / ss.length).toFixed(6);
  st.r = [...st.r].sort((a, b) => a - b);
}

// Frequencies → explicit trips ------------------------------------------
const freqByTrip = new Map();
for (const f of frequencies) {
  if (!freqByTrip.has(f.trip_id)) freqByTrip.set(f.trip_id, []);
  freqByTrip.get(f.trip_id).push([toSec(f.start_time), toSec(f.end_time), +f.headway_secs]);
}

// Patterns + services ------------------------------------------------------
const patterns = [];
const patIdx = new Map();
const services = new Map(); // service_id -> [[start, pattern, duration]]

// Distance (m) along the shape for each stop: projection onto shape segments, moving forward only.
// Jumping far ahead is penalised so loops / out-and-back streets pick the right passage.
function projectStops(shapeI, stopList) {
  const pts = shapes[shapeI];
  const k0 = 111320 * Math.cos(pts[0][0] * Math.PI / 180), k1 = 110574;
  const xy = pts.map(([la, lo]) => [lo * k0, la * k1]);
  const cum = [0];
  for (let i = 1; i < xy.length; i++) cum.push(cum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
  const out = [];
  let fromSeg = 0, fromDist = 0;
  for (const si of stopList) {
    const px = stops[si].lon * k0, py = stops[si].lat * k1;
    let best = { score: Infinity, seg: fromSeg, along: fromDist };
    for (let i = fromSeg; i < xy.length - 1; i++) {
      const [ax, ay] = xy[i], [bx, by] = xy[i + 1];
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      let t = ((px - ax) * dx + (py - ay) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      const along = cum[i] + t * Math.sqrt(L2);
      if (along < fromDist) continue;
      const d = Math.hypot(ax + t * dx - px, ay + t * dy - py);
      const score = d + (along - fromDist) * 0.05;
      if (score < best.score) best = { score, seg: i, along };
    }
    out.push(Math.round(best.along));
    fromSeg = best.seg;
    fromDist = best.along;
  }
  return out;
}

// Fill blank stop times, proportionally to distance between known timepoints (or stop index).
function interpolate(times, dist) {
  const known = [];
  times.forEach((t, i) => Number.isFinite(t) && known.push(i));
  if (known.length < 2) return null;
  const out = times.slice();
  for (let q = 0; q < known.length - 1; q++) {
    const a = known[q], b = known[q + 1];
    for (let i = a + 1; i < b; i++) {
      const span = dist ? dist[b] - dist[a] : 0;
      const f = span > 0 ? (dist[i] - dist[a]) / span : (i - a) / (b - a);
      out[i] = Math.round(times[a] + (times[b] - times[a]) * f);
    }
  }
  for (let i = 0; i < known[0]; i++) out[i] = times[known[0]];
  for (let i = known[known.length - 1] + 1; i < out.length; i++) out[i] = times[known[known.length - 1]];
  return out;
}

for (const [tripId, tr] of trips) {
  if (tr.st.length < 2) continue;
  const stopList = tr.st.map((s) => stopIdx.get(s[1]));
  if (stopList.some((x) => x === undefined)) continue;
  const key = tr.r + '|' + tr.h + '|' + tr.shape + '|' + stopList.join(',');
  let pi = patIdx.get(key);
  let k;
  if (pi === undefined) {
    const sh = getShape(tr.shape);
    k = sh >= 0 ? projectStops(sh, stopList) : [];
  } else k = patterns[pi].k;
  const raw = tr.st.map((s, i) => (i === 0 ? (Number.isFinite(s[3]) ? s[3] : s[2]) : Number.isFinite(s[2]) ? s[2] : s[3]));
  const times = interpolate(raw, k.length ? k : null);
  if (!times) continue;
  const t0 = times[0];
  const offs = times.map((t) => Math.max(0, t - t0));
  for (let i = 1; i < offs.length; i++) if (offs[i] < offs[i - 1]) offs[i] = offs[i - 1];
  const dur = offs[offs.length - 1];
  if (pi === undefined) {
    pi = patterns.length;
    patIdx.set(key, pi);
    patterns.push({ r: tr.r, h: tr.h, d: tr.dir, sh: getShape(tr.shape), s: stopList, o: offs, k });
  }
  if (!services.has(tr.svc)) services.set(tr.svc, []);
  const list = services.get(tr.svc);
  const fq = freqByTrip.get(tripId);
  if (fq) {
    for (const [a, b, hw] of fq) for (let t = a; t < b; t += hw) list.push([t, pi, dur]);
  } else list.push([t0, pi, dur]);
}

const serviceIds = [...services.keys()].sort();
const svcIndex = new Map(serviceIds.map((s, i) => [s, i]));
const outServices = serviceIds.map((id) => {
  const list = services.get(id).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let prev = 0;
  const t = list.map(([s]) => { const d = s - prev; prev = s; return d; });
  const p = list.map(([, pi]) => pi);
  const needD = list.some(([, pi, du]) => du !== patterns[pi].o[patterns[pi].o.length - 1]);
  const o = { id, t, p };
  if (needD) o.d = list.map(([, , du]) => du);
  return o;
});

// Dates -------------------------------------------------------------------
const dates = {};
const add = (d, s) => { if (!svcIndex.has(s)) return; (dates[d] ||= new Set()).add(svcIndex.get(s)); };
const WD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const feedStart = feedInfo.feed_start_date, feedEnd = feedInfo.feed_end_date;
for (const c of calendar) {
  const a = new Date(Date.UTC(+c.start_date.slice(0, 4), +c.start_date.slice(4, 6) - 1, +c.start_date.slice(6, 8)));
  const b = new Date(Date.UTC(+c.end_date.slice(0, 4), +c.end_date.slice(4, 6) - 1, +c.end_date.slice(6, 8)));
  for (let d = a; d <= b; d = new Date(d.getTime() + 86400000)) {
    const k = ymd(d);
    if (feedEnd && k > feedEnd) break;
    if (c[WD[d.getUTCDay()]] === '1') add(k, c.service_id);
  }
}
for (const cd of calendarDates) {
  if (cd.exception_type === '1') add(cd.date, cd.service_id);
  else if (dates[cd.date] && svcIndex.has(cd.service_id)) dates[cd.date].delete(svcIndex.get(cd.service_id));
}
const outDates = {};
Object.keys(dates).sort().forEach((k) => (outDates[k] = [...dates[k]].sort((a, b) => a - b)));

// Encode shapes (delta-encoded 1e-5 degrees) ---------------------------------
const outShapes = shapes.map((pts) => {
  const o = [];
  let pa = 0, po = 0;
  for (const [la, lo] of pts) { const a = E5(la), b = E5(lo); o.push(a - pa, b - po); pa = a; po = b; }
  return o;
});

const out = {
  v: 1,
  feed: { publisher: feedInfo.feed_publisher_name || 'TMB', version: feedInfo.feed_version || '', start: feedStart, end: feedEnd },
  generated: new Date().toISOString(),
  routes,
  stations: stations.map((s) => {
    const o = { n: s.n, lat: s.lat, lon: s.lon, b: s.b, s: s.s, r: s.r };
    // Street entrances (TMB open data): [name, lat, lon, accessible 0/1, elevators], shared ones de-duplicated
    const seen = new Map();
    for (const si of s.s) for (const a of accessesByCode.get(stops[si].c) || []) if (!seen.has(a.c)) seen.set(a.c, a);
    if (seen.size) o.ac = [...seen.values()].sort((x, y) => y.a - x.a || x.n.localeCompare(y.n)).map((a) => [a.n, a.lat, a.lon, a.a, a.e]);
    return o;
  }),
  stops: stops.map((s) => ({ id: s.id, c: s.c, g: s.g, lat: +s.lat.toFixed(6), lon: +s.lon.toFixed(6), w: s.w, e: s.e, r: s.r })),
  shapes: outShapes,
  patterns,
  services: outServices,
  dates: outDates
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const size = fs.statSync(OUT).size;
console.log(`routes=${routes.length} stations=${stations.length} stops=${stops.length} shapes=${shapes.length} patterns=${patterns.length} services=${outServices.length} dates=${Object.keys(outDates).length}`);
console.log(`Wrote ${path.relative(ROOT, OUT)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
