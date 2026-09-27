import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, Home, Briefcase, Navigation, Box, ArrowRight, MoreVertical, MapPin, History, Landmark, Loader2, TrainFront } from 'lucide-react';
import type { Language, Station, TransitLine } from '../../types/transit';
import type { TmbNetwork } from '../../services/network/engine';
import { distanceMetres, normalizeText, walkSeconds } from '../../services/network/engine';
import { fmt, ui } from '../../i18n/ui';
import type { Favorites } from '../../hooks/useUserContext';
import { loadRecentPlaces, PlaceResult, rememberPlace, searchLandmarks, searchPlaces } from '../../services/geocode';
import { BARCELONA_LANDMARKS } from '../../data/landmarksData';

export const LineBadge: React.FC<{ code: string; line?: TransitLine; size?: 'sm' | 'md' }> = ({ code, line, size = 'sm' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-md font-bold font-mono shadow-sm shrink-0 ${
      size === 'md' ? 'min-w-8 h-8 px-1.5 text-xs' : 'min-w-6 h-5 px-1 text-[10px]'
    }`}
    style={{ backgroundColor: line?.color || '#475569', color: line?.textColor || '#fff' }}
  >
    {code}
  </span>
);

export function waitLabel(secs: number, lang: Language): string {
  const t = ui(lang);
  if (secs < 60) return t.now;
  return `${Math.floor(secs / 60)} ${t.min}`;
}

/** Search box over stations and stops (metro first) and, optionally, addresses & places. */
export const StationSearch: React.FC<{
  network: TmbNetwork;
  lang: Language;
  placeholder?: string;
  onPick: (s: Station) => void;
  /** When set, addresses/places (OpenStreetMap), landmarks and recent places are offered too. */
  onPickPlace?: (p: PlaceResult) => void;
  autoFocus?: boolean;
  metroOnly?: boolean;
}> = ({ network, lang, placeholder, onPick, onPickPlace, autoFocus, metroOnly }) => {
  const t = ui(lang);
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const index = useMemo(
    () => network.stations.filter((s) => !metroOnly || !s.isBusStop).map((s) => ({ s, n: normalizeText(s.name) })),
    [network, metroOnly]
  );
  const hits = useMemo(() => {
    const v = normalizeText(q);
    if (v.length < 2) return [];
    return index
      .filter((x) => x.n.includes(v))
      .sort((a, b) => Number(!!a.s.isBusStop) - Number(!!b.s.isBusStop) || Number(!a.n.startsWith(v)) - Number(!b.n.startsWith(v)))
      .slice(0, onPickPlace ? 5 : 8)
      .map((x) => x.s);
  }, [q, index, onPickPlace]);

  // Online place search (debounced, cancelled on new input)
  useEffect(() => {
    if (!onPickPlace) return;
    const v = q.trim();
    if (v.length < 3) {
      setPlaces([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const id = setTimeout(() => {
      searchPlaces(v, lang, ctrl.signal)
        .then((r) => !ctrl.signal.aborted && setPlaces(r))
        .catch(() => undefined)
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 400);
    return () => {
      ctrl.abort();
      clearTimeout(id);
    };
  }, [q, lang, onPickPlace]);

  const localPlaces = useMemo(() => (onPickPlace ? searchLandmarks(q, BARCELONA_LANDMARKS, lang) : []), [q, lang, onPickPlace]);
  const recents = useMemo(() => (onPickPlace && focused && q.length < 2 ? loadRecentPlaces() : []), [onPickPlace, focused, q]);
  const placeList = [
    ...localPlaces,
    // skip OSM hits that are the same spot as a landmark we already show
    ...places.filter((p) => !localPlaces.some((l) => distanceMetres([l.lat, l.lng], [p.lat, p.lng]) < 250))
  ].slice(0, 6);

  const pickPlace = (p: PlaceResult) => {
    rememberPlace(p);
    onPickPlace?.(p);
    setQ('');
    setFocused(false);
  };

  const open = q.length >= 2 || recents.length > 0;

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder || (onPickPlace ? t.searchPlace : t.searchStation)}
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-sky-500 text-sm text-white placeholder-slate-500 outline-none"
        />
        {loading && <Loader2 className="w-4 h-4 text-slate-500 absolute right-3 animate-spin" />}
      </div>
      {open && (focused || q.length >= 2) && (
        <div className="absolute z-40 mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
          {recents.length > 0 && <SectionLabel icon={<History className="w-3 h-3" />} text={t.recentPlaces} />}
          {recents.map((p) => (
            <PlaceRow key={p.id} p={p} onClick={() => pickPlace(p)} />
          ))}
          {q.length >= 2 && hits.length > 0 && onPickPlace && <SectionLabel icon={<TrainFront className="w-3 h-3" />} text={t.stationsLabel} />}
          {hits.map((s) => (
            <button
              key={s.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(s);
                setQ('');
                setFocused(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between gap-2"
            >
              <span className="text-sm text-white truncate">{s.name}</span>
              <span className="flex gap-1 shrink-0">
                {s.lines.slice(0, 5).map((l) => (
                  <LineBadge key={l} code={l} line={network.lines[network.lineIndexByCode.get(l) ?? -1]} />
                ))}
              </span>
            </button>
          ))}
          {q.length >= 2 && placeList.length > 0 && <SectionLabel icon={<MapPin className="w-3 h-3" />} text={t.placesLabel} />}
          {q.length >= 2 && placeList.map((p) => <PlaceRow key={p.id} p={p} onClick={() => pickPlace(p)} />)}
          {q.length >= 2 && !loading && hits.length === 0 && placeList.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400">{onPickPlace && typeof navigator !== 'undefined' && !navigator.onLine ? t.placesOffline : t.noResults}</div>
          )}
        </div>
      )}
    </div>
  );
};

const SectionLabel: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
    {icon}
    {text}
  </div>
);

const PlaceRow: React.FC<{ p: PlaceResult; onClick: () => void }> = ({ p, onClick }) => (
  <button onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-start gap-2">
    {p.source === 'landmark' ? (
      <Landmark className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
    ) : p.source === 'recent' ? (
      <History className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
    ) : (
      <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
    )}
    <span className="min-w-0">
      <span className="block text-sm text-white truncate">{p.name}</span>
      {p.detail && <span className="block text-[11px] text-slate-400 truncate">{p.detail}</span>}
    </span>
  </button>
);

/** Station card with live grouped departures: the core building block of the "Now" screen. */
export const StationCard: React.FC<{
  station: Station;
  network: TmbNetwork;
  now: number;
  lang: Language;
  metres?: number;
  fav: Favorites;
  onToggleStar: (id: string) => void;
  onSetHome: (id: string) => void;
  onSetWork: (id: string) => void;
  onOpenMap: (s: Station) => void;
  onRouteFrom: (s: Station) => void;
  onRouteTo: (s: Station) => void;
  onOpen3D?: (s: Station) => void;
  label?: React.ReactNode;
  maxGroups?: number;
}> = ({ station, network, now, lang, metres, fav, onToggleStar, onSetHome, onSetWork, onOpenMap, onRouteFrom, onRouteTo, onOpen3D, label, maxGroups = 4 }) => {
  const t = ui(lang);
  const [menu, setMenu] = useState(false);
  const groups = useMemo(() => network.departureGroups(station.id, now, 3), [network, station.id, now]);
  const starred = fav.starred.includes(station.id);

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-visible">
      <div className="px-3.5 pt-3 pb-2 flex items-start justify-between gap-2">
        <button onClick={() => onOpenMap(station)} className="min-w-0 text-left">
          {label && <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">{label}</div>}
          <div className="text-sm font-extrabold text-white truncate">{station.name}</div>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {station.lines.slice(0, 8).map((l) => (
              <LineBadge key={l} code={l} line={network.lines[network.lineIndexByCode.get(l) ?? -1]} />
            ))}
            {metres !== undefined && (
              <span className="text-[11px] text-slate-400 ml-1">· {fmt(t.walkMin, Math.max(1, Math.round(walkSeconds(metres) / 60)))}</span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0 relative">
          <button
            onClick={() => onToggleStar(station.id)}
            title={starred ? t.unstar : t.star}
            className={`p-1.5 rounded-lg ${starred ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Star className="w-4 h-4" fill={starred ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => setMenu(!menu)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <MoreVertical className="w-4 h-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-8 z-30 w-52 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 text-sm" onMouseLeave={() => setMenu(false)}>
              {[
                { icon: <Home className="w-4 h-4" />, label: t.setHome, on: () => onSetHome(station.id), active: fav.home === station.id },
                { icon: <Briefcase className="w-4 h-4" />, label: t.setWork, on: () => onSetWork(station.id), active: fav.work === station.id },
                { icon: <Navigation className="w-4 h-4" />, label: t.routeFrom, on: () => onRouteFrom(station) },
                { icon: <ArrowRight className="w-4 h-4" />, label: t.routeTo, on: () => onRouteTo(station) },
                ...(onOpen3D && !station.isBusStop ? [{ icon: <Box className="w-4 h-4" />, label: t.view3d, on: () => onOpen3D(station) }] : [])
              ].map((it) => (
                <button
                  key={it.label}
                  onClick={() => {
                    it.on();
                    setMenu(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-800 ${'active' in it && it.active ? 'text-amber-300' : 'text-slate-200'}`}
                >
                  {it.icon}
                  {it.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-2 pb-2 space-y-1">
        {groups.length === 0 && <div className="px-2 py-2 text-xs text-slate-500">{t.noService}</div>}
        {groups.slice(0, maxGroups).map((g) => {
          const first = g[0];
          const line = network.lines[network.lineIndexByCode.get(first.lineCode) ?? -1];
          return (
            <div key={`${first.lineCode}|${first.destination}`} className="px-2 py-1.5 rounded-xl bg-slate-950/60 flex items-center gap-2">
              <LineBadge code={first.lineCode} line={line} />
              <span className="flex-1 min-w-0 text-xs text-slate-200 truncate">→ {first.destination}</span>
              {g.some((d) => d.isLastOfDay) && (
                <span className="text-[9px] font-bold uppercase px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {lang === 'en' ? 'last' : lang === 'ar' ? 'الأخير' : lang === 'ca' ? 'últim' : 'último'}
                </span>
              )}
              <span className="font-tech text-sm font-bold text-white tabular-nums" title={first.type === 'bus' && !first.isRealTime ? t.approxTime : undefined}>
                {first.type === 'bus' && !first.isRealTime ? '≈ ' : ''}
                {waitLabel(first.timeEstimateSeconds ?? 0, lang)}
              </span>
              <span className="text-[11px] text-slate-500 tabular-nums w-16 text-right truncate">
                {g
                  .slice(1, 3)
                  .map((d) => Math.floor((d.timeEstimateSeconds ?? 0) / 60))
                  .join(', ')}
                {g.length > 1 ? ` ${t.min}` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
