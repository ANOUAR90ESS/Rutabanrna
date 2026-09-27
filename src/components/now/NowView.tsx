import React, { useMemo, useState } from 'react';
import { LocateFixed, Home, Briefcase, Plane, Loader2, AlertTriangle, X, Pencil } from 'lucide-react';
import type { Language, ServiceNotice, Station } from '../../types/transit';
import type { TmbNetwork } from '../../services/network/engine';
import { formatClock, madridClock } from '../../services/network/clock';
import { ui } from '../../i18n/ui';
import type { Favorites, GeoState } from '../../hooks/useUserContext';
import { StationCard, StationSearch } from './shared';
import type { PlaceResult } from '../../services/geocode';

const POPULAR = ['Catalunya', 'Passeig de Gràcia', 'Sants Estació', 'Espanya', 'Diagonal'];

interface NowViewProps {
  network: TmbNetwork;
  now: number;
  lang: Language;
  geo: GeoState;
  onRequestLocation: () => void;
  fav: Favorites;
  onToggleStar: (id: string) => void;
  onSetHome: (id: string) => void;
  onSetWork: (id: string) => void;
  notices: ServiceNotice[];
  onOpenMap: (s: Station) => void;
  onRouteFrom: (s: Station) => void;
  onRouteTo: (s: Station) => void;
  onRouteToPlace: (p: PlaceResult) => void;
  /** Plan a trip home/work (station id given when it was just chosen) */
  onGoHome: (id?: string) => void;
  onGoWork: (id?: string) => void;
  onAirport: () => void;
  onOpen3D: (s: Station) => void;
  onOpenNotices: () => void;
  /** Slot rendered under the quick actions (e.g. "Last train home"). */
  children?: React.ReactNode;
  /** Header banner (data status) and footer (source attribution). */
  banner?: React.ReactNode;
  footer?: React.ReactNode;
}

export const NowView: React.FC<NowViewProps> = (props) => {
  const { network, now, lang, geo, onRequestLocation, fav, notices } = props;
  const t = ui(lang);
  const [picking, setPicking] = useState<'home' | 'work' | null>(null);
  const clock = formatClock(madridClock(now).secs);

  // Recompute nearby stations only when the position changes noticeably.
  const posKey = geo.status === 'ok' ? `${geo.lat.toFixed(4)},${geo.lng.toFixed(4)}` : '';
  const nearby = useMemo(() => {
    if (geo.status !== 'ok') return null;
    const metro = network.nearbyStations(geo.lat, geo.lng, { radius: 1200, bus: false, limit: 3 });
    const bus = network.nearbyStations(geo.lat, geo.lng, { radius: 350, bus: true, limit: 4 });
    return { metro, bus };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, posKey]);
  const far = nearby && nearby.metro.length === 0 && nearby.bus.length === 0;

  const home = fav.home ? network.getStation(fav.home) : undefined;
  const work = fav.work ? network.getStation(fav.work) : undefined;
  const starred = fav.starred
    .filter((id) => id !== fav.home && id !== fav.work)
    .map((id) => network.getStation(id))
    .filter((s): s is Station => !!s);
  const popular = useMemo(
    () => POPULAR.map((n) => network.stations.find((s) => !s.isBusStop && s.name === n)).filter((s): s is Station => !!s),
    [network]
  );

  const cardProps = {
    network,
    now,
    lang,
    fav,
    onToggleStar: props.onToggleStar,
    onSetHome: props.onSetHome,
    onSetWork: props.onSetWork,
    onOpenMap: props.onOpenMap,
    onRouteFrom: props.onRouteFrom,
    onRouteTo: props.onRouteTo,
    onOpen3D: props.onOpen3D
  };
  const important = notices.filter((n) => n.severity !== 'low');

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 space-y-4">
        {props.banner}

        {/* Clock + search */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Barcelona · TMB</div>
            <div className="font-tech text-3xl font-bold text-white tabular-nums">{clock}</div>
          </div>
          <button
            onClick={onRequestLocation}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
              geo.status === 'ok' ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' : 'bg-slate-900 text-slate-200 border-slate-700'
            }`}
          >
            {geo.status === 'locating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            {geo.status === 'locating' ? t.locating : t.locateMe}
          </button>
        </div>

        <StationSearch network={network} lang={lang} onPick={props.onOpenMap} onPickPlace={props.onRouteToPlace} />

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <QuickAction
            icon={<Home className="w-4 h-4" />}
            label={t.goHome}
            sub={home?.name}
            onClick={() => (home ? props.onGoHome() : setPicking('home'))}
            onEdit={home ? () => setPicking('home') : undefined}
          />
          <QuickAction
            icon={<Briefcase className="w-4 h-4" />}
            label={t.goWork}
            sub={work?.name}
            onClick={() => (work ? props.onGoWork() : setPicking('work'))}
            onEdit={work ? () => setPicking('work') : undefined}
          />
          <QuickAction icon={<Plane className="w-4 h-4" />} label={t.airport} onClick={props.onAirport} />
        </div>
        {picking && (
          <div className="rounded-2xl bg-slate-900 border border-amber-500/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{picking === 'home' ? t.pickHome : t.pickWork}</span>
              <button onClick={() => setPicking(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <StationSearch
              network={network}
              lang={lang}
              autoFocus
              onPick={(s) => {
                const which = picking;
                setPicking(null);
                if (which === 'home') {
                  props.onSetHome(s.id);
                  props.onGoHome(s.id);
                } else {
                  props.onSetWork(s.id);
                  props.onGoWork(s.id);
                }
              }}
            />
            {nearby && nearby.metro.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {nearby.metro.map(({ station }) => (
                  <button
                    key={station.id}
                    onClick={() => {
                      const which = picking;
                      setPicking(null);
                      if (which === 'home') {
                        props.onSetHome(station.id);
                        props.onGoHome(station.id);
                      } else {
                        props.onSetWork(station.id);
                        props.onGoWork(station.id);
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-200"
                  >
                    {station.name}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400">{t.pickHint}</p>
          </div>
        )}
        {!home && !picking && <p className="text-xs text-slate-400 -mt-2">{t.setHomeHint}</p>}

        {props.children}

        {important.length > 0 && (
          <button onClick={props.onOpenNotices} className="w-full text-left p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-100 space-y-0.5">
              {important.slice(0, 3).map((n) => (
                <div key={n.id}>{n.title[lang]}</div>
              ))}
            </div>
          </button>
        )}

        {/* Near me */}
        {geo.status === 'denied' && <Hint text={t.locationDenied} />}
        {geo.status === 'unavailable' && <Hint text={t.locationUnavailable} />}
        {far && <Hint text={t.locationFar} />}
        {nearby && !far && (
          <Section title={t.nearYou}>
            {nearby.metro.map(({ station, metres }) => (
              <StationCard key={station.id} station={station} metres={metres} {...cardProps} />
            ))}
            {nearby.bus.map(({ station, metres }) => (
              <StationCard key={station.id} station={station} metres={metres} maxGroups={5} {...cardProps} />
            ))}
          </Section>
        )}

        {/* Favourites */}
        {(home || work || starred.length > 0) && (
          <Section title={t.favorites}>
            {home && <StationCard station={home} label={`⌂ ${t.home}`} {...cardProps} />}
            {work && <StationCard station={work} label={t.work} {...cardProps} />}
            {starred.map((s) => (
              <StationCard key={s.id} station={s} {...cardProps} />
            ))}
          </Section>
        )}

        {/* Fallback when we know nothing about the user yet */}
        {!nearby && !home && !work && starred.length === 0 && (
          <Section title={t.popular}>
            {popular.map((s) => (
              <StationCard key={s.id} station={s} {...cardProps} />
            ))}
          </Section>
        )}
        {props.footer}
      </div>
    </div>
  );
};

const QuickAction: React.FC<{ icon: React.ReactNode; label: string; sub?: string; onClick: () => void; onEdit?: () => void }> = ({
  icon,
  label,
  sub,
  onClick,
  onEdit
}) => (
  <div className="relative">
    <button
      onClick={onClick}
      className="w-full py-3 px-1 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 text-xs font-semibold text-slate-100 flex flex-col items-center gap-0.5"
    >
      <span className="text-amber-400">{icon}</span>
      {label}
      {sub && <span className="text-[10px] font-normal text-slate-400 truncate max-w-full">{sub}</span>}
    </button>
    {onEdit && (
      <button onClick={onEdit} className="absolute top-1 right-1 p-1 rounded-lg text-slate-500 hover:text-white" aria-label="edit">
        <Pencil className="w-3 h-3" />
      </button>
    )}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">{title}</h2>
    {children}
  </section>
);

const Hint: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs text-slate-400 p-3 rounded-xl bg-slate-900/60 border border-slate-800">{text}</p>
);
