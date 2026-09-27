import React, { useMemo } from 'react';
import { Moon, ChevronRight } from 'lucide-react';
import type { Language } from '../../types/transit';
import type { TmbNetwork } from '../../services/network/engine';
import { distanceMetres } from '../../services/network/engine';
import type { Journey, Leg, Router } from '../../services/network/router';
import { formatClock, madridClock, ymdShift } from '../../services/network/clock';
import { fmt, ui } from '../../i18n/ui';
import type { GeoState } from '../../hooks/useUserContext';
import { LineBadge } from './shared';

const END_OF_NIGHT = 4.5 * 3600; // 04:30 — the service day switches after this

/**
 * "Last train home": latest departure from the user's position that still reaches Home tonight
 * (the prototype's core feature), plus the first service tomorrow when it's too late.
 */
export const LastTrainCard: React.FC<{
  network: TmbNetwork;
  router: Router;
  now: number;
  lang: Language;
  geo: GeoState;
  homeId?: string;
  onOpen: () => void;
}> = ({ network, router, now, lang, geo, homeId, onOpen }) => {
  const t = ui(lang);
  const home = homeId ? network.getStation(homeId) : undefined;
  const minute = Math.floor(now / 60000);
  const posKey = geo.status === 'ok' ? `${geo.lat.toFixed(3)},${geo.lng.toFixed(3)}` : '';

  const res = useMemo(() => {
    if (!home || geo.status !== 'ok') return null;
    if (distanceMetres([geo.lat, geo.lng], [home.lat, home.lng]) < 600) return null; // already home
    const c = madridClock(minute * 60000);
    const hi = network.stationById.get(home.id)!;
    const origins = router.seedsNear(geo.lat, geo.lng);
    const dests = router.seedsForStation(hi);
    const deadline = c.secs < END_OF_NIGHT ? END_OF_NIGHT : 86400 + END_OF_NIGHT;
    const o = { stepFree: false, buses: true };
    const last = router.latest(c.ymd, origins, dests, deadline, c.secs, o);
    let morning: Journey | null = null;
    if (!last) {
      const ymd = deadline > 86400 ? ymdShift(c.ymd, 1) : c.ymd;
      morning = router.earliest(ymd, origins, END_OF_NIGHT, dests, o);
    }
    // Continuous service (e.g. Saturday night): trains keep reaching home right after the cut-off
    // (no night gap between the "last" journey and the next one)
    let after = last ? router.earliest(c.ymd, origins, last.dep + 60, dests, o) : null;
    if (last && !after && last.dep >= 86400 - 3600) {
      // trips after the cut-off belong to the next service day
      after = router.earliest(ymdShift(c.ymd, 1), origins, Math.max(0, last.dep + 60 - 86400), dests, o);
      if (after) after = { ...after, dep: after.dep + 86400 };
    }
    const continuous = !!last && !!after && after.dep - last.dep < 40 * 60;
    return { last, morning, deadline, secs: c.secs, continuous };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, router, home?.id, posKey, minute]);

  if (!home) return null;
  if (geo.status !== 'ok') return null;
  if (!res) return null;

  const { last, morning, deadline, secs, continuous } = res;
  const rides = (last?.legs ?? []).filter((l): l is Extract<Leg, { kind: 'ride' }> => l.kind === 'ride');
  const left = last ? last.dep - secs : 0;
  const allNight = last && (continuous || last.dep >= deadline - 1800);
  const urgent = last && left < 20 * 60;
  const hm = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min` : `${Math.max(0, Math.floor(s / 60))} min`);

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left rounded-2xl p-3.5 border flex items-start gap-3 ${
        !last ? 'bg-rose-500/10 border-rose-500/30' : urgent ? 'bg-amber-500/10 border-amber-500/40' : 'bg-indigo-500/10 border-indigo-500/30'
      }`}
    >
      <Moon className={`w-5 h-5 shrink-0 mt-0.5 ${!last ? 'text-rose-300' : urgent ? 'text-amber-300' : 'text-indigo-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
          {t.lastTrainHome} · ⌂ {home.name}
        </div>
        {last && allNight && <div className="text-sm font-semibold text-white mt-0.5">{t.allNight}</div>}
        {last && !allNight && (
          <>
            <div className="text-lg font-extrabold text-white mt-0.5">{fmt(t.lastLeave, formatClock(last.dep))}</div>
            <div className={`text-xs font-semibold ${urgent ? 'text-amber-300' : 'text-indigo-200'}`}>{fmt(t.lastLeft, hm(left))}</div>
          </>
        )}
        {last && !allNight && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {rides.map((r, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-slate-500 text-xs">›</span>}
                <LineBadge code={network.routes[r.route].n} line={network.lines[r.route]} />
              </React.Fragment>
            ))}
            {rides[0] && (
              <span className="text-[11px] text-slate-400 truncate">
                {fmt(t.lastTrainFrom, network.raw.stations[network.raw.stops[rides[0].from].g].n)} · {formatClock(rides[0].dep)}
              </span>
            )}
          </div>
        )}
        {!last && <div className="text-sm text-rose-100 mt-0.5">{fmt(t.lastGone, morning ? formatClock(morning.dep) : '—')}</div>}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
    </button>
  );
};
