import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, LocateFixed, Home, Briefcase, Star, Footprints, Accessibility, Bus, Loader2, Map as MapIcon, Bell, X, Plane, Clock } from 'lucide-react';
import type { Language, Place } from '../../types/transit';
import type { TmbNetwork } from '../../services/network/engine';
import { Router, Journey, Leg, Seed } from '../../services/network/router';
import { formatClock, madridClock, ymdShift } from '../../services/network/clock';
import { fmt, ui } from '../../i18n/ui';
import type { Favorites, GeoState } from '../../hooks/useUserContext';
import { LineBadge, StationSearch } from '../now/shared';

export type TimeMode = 'now' | 'depart' | 'arrive';

export interface TripRequest {
  from?: Place | null;
  to?: Place | null;
  mode?: TimeMode;
  time?: string;   // "HH:MM"
  day?: 0 | 1;     // today / tomorrow
  airport?: boolean;
  nonce: number;
}

interface TripPlannerProps {
  network: TmbNetwork;
  router: Router;
  now: number;
  lang: Language;
  geo: GeoState;
  onRequestLocation: () => void;
  fav: Favorites;
  request: TripRequest | null;
  onShowOnMap: (j: Journey, from: Place, to: Place) => void;
  onRemindMe?: (j: Journey, from: Place, to: Place) => void;
  /** Extra panel (airport helper) rendered above results. */
  airportPanel?: (apply: (r: Omit<TripRequest, 'nonce'>) => void) => React.ReactNode;
}

const secsToHHMM = (s: number) => formatClock(s);

export const TripPlanner: React.FC<TripPlannerProps> = ({ network, router, now, lang, geo, onRequestLocation, fav, request, onShowOnMap, onRemindMe, airportPanel }) => {
  const t = ui(lang);
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [mode, setMode] = useState<TimeMode>('now');
  const [time, setTime] = useState(() => formatClock(madridClock().secs + 1800));
  const [day, setDay] = useState<0 | 1>(0);
  const [stepFree, setStepFree] = useState(() => localStorage.getItem('barnatransit_stepfree') === '1');
  const [buses, setBuses] = useState(true);
  const [results, setResults] = useState<Journey[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(0);
  const [showAirport, setShowAirport] = useState(false);

  // Apply requests coming from other screens ("Go home", "Route from here", airport…)
  const apply = (r: Omit<TripRequest, 'nonce'>) => {
    if (r.from !== undefined) setFrom(r.from);
    if (r.to !== undefined) setTo(r.to);
    if (r.mode) setMode(r.mode);
    if (r.time) setTime(r.time);
    if (r.day !== undefined) setDay(r.day);
  };
  useEffect(() => {
    if (!request) return;
    apply(request);
    setShowAirport(!!request.airport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce]);

  // Default origin: my location when known
  useEffect(() => {
    if (!from && geo.status === 'ok') setFrom({ kind: 'location', lat: geo.lat, lng: geo.lng, name: t.myLocation });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status]);

  useEffect(() => {
    try { localStorage.setItem('barnatransit_stepfree', stepFree ? '1' : '0'); } catch { /* ignore */ }
  }, [stepFree]);

  const seedsOf = (p: Place): Seed[] => {
    if (p.kind === 'location') {
      const lat = p.name === t.myLocation && geo.status === 'ok' ? geo.lat : p.lat;
      const lng = p.name === t.myLocation && geo.status === 'ok' ? geo.lng : p.lng;
      return router.seedsNear(lat, lng);
    }
    const i = network.stationById.get(p.stationId);
    return i === undefined ? [] : router.seedsForStation(i);
  };

  // Plan whenever inputs change (in a timeout so the UI can show the spinner first)
  const minute = Math.floor(now / 60000);
  useEffect(() => {
    if (!from || !to) { setResults(null); return; }
    setBusy(true);
    const id = setTimeout(() => {
      const o = { stepFree, buses };
      const A = seedsOf(from), B = seedsOf(to);
      let js: Journey[] = [];
      if (mode === 'arrive') {
        const c = madridClock(now);
        const ymd = day ? ymdShift(c.ymd, 1) : c.ymd;
        const [hh, mm] = time.split(':').map(Number);
        let deadline = hh * 3600 + mm * 60;
        if (deadline < 4 * 3600 && day === 0 && c.secs > 12 * 3600) deadline += 86400; // e.g. 00:30 tonight
        const tmin = day === 0 ? c.secs : 0;
        js = router.planArriveBy(A, B, ymd, deadline, Math.max(tmin, deadline - 5 * 3600), o, 2);
      } else {
        let ms = now;
        if (mode === 'depart') {
          const c = madridClock(now);
          const [hh, mm] = time.split(':').map(Number);
          ms = now + ((day * 86400 + hh * 3600 + mm * 60 - c.secs) * 1000);
        }
        js = router.plan(A, B, ms, o, 3);
      }
      setResults(js);
      setOpen(0);
      setBusy(false);
    }, 20);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, mode, time, day, stepFree, buses, mode === 'now' ? minute : 0]);

  const stationName = (stop: number) => network.raw.stations[network.raw.stops[stop].g].n;
  const clock = madridClock(now);
  const relSecs = (j: Journey, s: number) => (j.ymd === clock.ymd ? s : s + 86400) - clock.secs;

  const quick: { icon: React.ReactNode; label: string; place: Place }[] = useMemo(() => {
    const out: { icon: React.ReactNode; label: string; place: Place }[] = [];
    if (geo.status === 'ok') out.push({ icon: <LocateFixed className="w-3.5 h-3.5" />, label: t.myLocation, place: { kind: 'location', lat: geo.lat, lng: geo.lng, name: t.myLocation } });
    const add = (id: string | undefined, icon: React.ReactNode, label?: string) => {
      const s = id ? network.getStation(id) : undefined;
      if (s) out.push({ icon, label: label || s.name, place: { kind: 'station', stationId: s.id, name: s.name } });
    };
    add(fav.home, <Home className="w-3.5 h-3.5" />, t.home);
    add(fav.work, <Briefcase className="w-3.5 h-3.5" />, t.work);
    fav.starred.slice(0, 4).forEach((id) => add(id, <Star className="w-3.5 h-3.5" />));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status === 'ok', fav, network, lang]);

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 space-y-3">
        {/* From / To */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 space-y-2 relative">
          <PlaceField label={t.from} value={from} onClear={() => setFrom(null)} onPick={setFrom} network={network} lang={lang} quick={quick} onLocate={geo.status !== 'ok' ? onRequestLocation : undefined} />
          <button
            onClick={() => { setFrom(to); setTo(from); }}
            title={t.swap}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
          <PlaceField label={t.to} value={to} onClear={() => setTo(null)} onPick={setTo} network={network} lang={lang} quick={quick} />
        </div>

        {/* Time & options */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs font-semibold">
            {([['now', t.leaveNow], ['depart', t.departAt], ['arrive', t.arriveBy]] as [TimeMode, string][]).map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)} className={`px-2.5 py-1.5 rounded-lg ${mode === m ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>
                {l}
              </button>
            ))}
          </div>
          {mode !== 'now' && (
            <>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white" />
              <select value={day} onChange={(e) => setDay(Number(e.target.value) as 0 | 1)} className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white">
                <option value={0}>{t.today}</option>
                <option value={1}>{t.tomorrow}</option>
              </select>
            </>
          )}
          <Toggle on={stepFree} onClick={() => setStepFree(!stepFree)} icon={<Accessibility className="w-3.5 h-3.5" />} label={t.stepFree} />
          <Toggle on={buses} onClick={() => setBuses(!buses)} icon={<Bus className="w-3.5 h-3.5" />} label={t.busesToo} />
          {airportPanel && <Toggle on={showAirport} onClick={() => setShowAirport(!showAirport)} icon={<Plane className="w-3.5 h-3.5" />} label={t.airport} />}
        </div>

        {showAirport && airportPanel?.(apply)}

        {/* Results */}
        {(!from || !to) && <p className="text-xs text-slate-400 px-1">{t.pickBoth}</p>}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <Loader2 className="w-4 h-4 animate-spin" /> …
          </div>
        )}
        {!busy && from && to && results && results.length === 0 && (
          <p className="text-sm text-slate-300 p-3 rounded-xl bg-slate-900 border border-slate-800">{t.noRoute}</p>
        )}
        {!busy &&
          results?.map((j, i) => {
            const rides = j.legs.filter((l): l is Extract<Leg, { kind: 'ride' }> => l.kind === 'ride');
            const leaveIn = relSecs(j, j.dep);
            const isOpen = open === i;
            return (
              <div key={`${j.dep}-${j.arr}-${i}`} className={`rounded-2xl border ${isOpen ? 'bg-slate-900 border-slate-600' : 'bg-slate-900/70 border-slate-800'}`}>
                <button onClick={() => setOpen(isOpen ? -1 : i)} className="w-full text-left p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-tech text-lg font-bold text-white tabular-nums">
                      {secsToHHMM(j.dep)} <span className="text-slate-500">→</span> {secsToHHMM(j.arr)}
                    </div>
                    <div className="text-xs text-slate-300 text-right">
                      <div className="font-bold">{fmt(t.duration, Math.round((j.arr - j.dep) / 60))}</div>
                      <div className="text-slate-500">{j.transfers === 0 ? t.direct : j.transfers === 1 ? t.change1 : fmt(t.changes, j.transfers)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {rides.map((r, k) => (
                      <React.Fragment key={k}>
                        {k > 0 && <span className="text-slate-600 text-xs">›</span>}
                        <LineBadge code={network.routes[r.route].n} line={network.lines[r.route]} />
                      </React.Fragment>
                    ))}
                    <span className={`ml-auto text-xs font-semibold ${leaveIn < 300 ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {leaveIn <= 30 ? t.alertLeave : leaveIn < 3600 ? fmt(t.leaveIn, `${Math.round(leaveIn / 60)} ${t.min}`) : fmt(t.leaveAt, `${j.ymd !== clock.ymd || j.dep >= 86400 + 4 * 3600 ? `${t.tomorrow} ` : ''}${secsToHHMM(j.dep)}`)}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 space-y-1.5">
                    <ol className="relative border-s border-slate-700 ms-2 space-y-2">
                      {j.legs.map((l, k) =>
                        l.kind === 'walk' ? (
                          <li key={k} className="ms-4 text-xs text-slate-400 flex items-center gap-1.5">
                            <Footprints className="w-3.5 h-3.5" />
                            {l.from !== null && l.to !== null && network.raw.stops[l.from].g === network.raw.stops[l.to].g
                              ? fmt(t.transfer, Math.max(1, Math.round(l.seconds / 60)))
                              : l.to !== null
                              ? fmt(t.walkTo, Math.max(1, Math.round(l.seconds / 60)), stationName(l.to))
                              : fmt(t.walkFinal, Math.max(1, Math.round(l.seconds / 60)))}
                          </li>
                        ) : (
                          <li key={k} className="ms-4">
                            <span className="absolute -start-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-slate-900" style={{ backgroundColor: network.routes[l.route].c }} />
                            <div className="flex items-center gap-2 text-sm text-white">
                              <LineBadge code={network.routes[l.route].n} line={network.lines[l.route]} />
                              <span className="font-semibold truncate">{t.towards} {l.headsign}</span>
                            </div>
                            <div className="text-xs text-slate-300 mt-0.5 tabular-nums">
                              <b>{secsToHHMM(l.dep)}</b> {stationName(l.from)}
                            </div>
                            <div className="text-[11px] text-slate-500">{fmt(t.ride, l.stops)}</div>
                            <div className="text-xs text-slate-300 tabular-nums">
                              <b>{secsToHHMM(l.arr)}</b> {stationName(l.to)}
                            </div>
                          </li>
                        )
                      )}
                    </ol>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => onShowOnMap(j, from!, to!)} className="flex-1 py-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                        <MapIcon className="w-3.5 h-3.5" /> {t.tabMap}
                      </button>
                      {onRemindMe && (
                        <button onClick={() => onRemindMe(j, from!, to!)} className="flex-1 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                          <Bell className="w-3.5 h-3.5" /> {t.alertSaveTrip}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        {!busy && results && results.length > 0 && (
          <p className="text-[10px] text-slate-500 px-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {ui(lang).walk}: 1,25 m/s · GTFS TMB
          </p>
        )}
      </div>
    </div>
  );
};

const Toggle: React.FC<{ on: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ on, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 border ${
      on ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
    }`}
  >
    {icon}
    {label}
  </button>
);

const PlaceField: React.FC<{
  label: string;
  value: Place | null;
  onPick: (p: Place) => void;
  onClear: () => void;
  network: TmbNetwork;
  lang: Language;
  quick: { icon: React.ReactNode; label: string; place: Place }[];
  onLocate?: () => void;
}> = ({ label, value, onPick, onClear, network, lang, quick, onLocate }) => {
  const t = ui(lang);
  if (value) {
    return (
      <div className="flex items-center gap-2 pr-12">
        <span className="text-[10px] uppercase font-bold text-slate-500 w-14 shrink-0">{label}</span>
        <div className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white flex items-center justify-between gap-2">
          <span className="truncate">{value.kind === 'location' && value.name === t.myLocation ? `📍 ${value.name}` : value.name}</span>
          <button onClick={onClear} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 pr-12">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase font-bold text-slate-500 w-14 shrink-0">{label}</span>
        <div className="flex-1">
          <StationSearch network={network} lang={lang} onPick={(s) => onPick({ kind: 'station', stationId: s.id, name: s.name })} />
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap ps-16">
        {onLocate && (
          <button onClick={onLocate} className="px-2 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-200 flex items-center gap-1">
            <LocateFixed className="w-3.5 h-3.5" /> {t.myLocation}
          </button>
        )}
        {quick.map((q) => (
          <button key={q.label} onClick={() => onPick(q.place)} className="px-2 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-200 flex items-center gap-1 max-w-[10rem]">
            {q.icon}
            <span className="truncate">{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
