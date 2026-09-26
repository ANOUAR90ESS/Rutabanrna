import React, { useEffect, useMemo, useState } from 'react';
import { X, Bell, Clock, Radio } from 'lucide-react';
import { Station, TransitLine, LiveVehicle, Language, Departure } from '../types/transit';
import { translations } from '../i18n/translations';
import type { TmbNetwork } from '../services/network/engine';
import { fetchRealtimeDepartures, mergeDepartures, realtimeEnabled } from '../services/network/realtime';

interface DeparturesBoardProps {
  station: Station | null;
  network: TmbNetwork;
  now: number;
  lines: TransitLine[];
  vehicles: LiveVehicle[];
  onClose: () => void;
  onOpen3DViewer: (vehicle: LiveVehicle) => void;
  onCreateAlertForStation: (station: Station, lineCode: string) => void;
  lang: Language;
}

const REALTIME_POLL_MS = 20000;

export const DeparturesBoard: React.FC<DeparturesBoardProps> = ({
  station,
  network,
  now,
  lines,
  vehicles,
  onClose,
  onOpen3DViewer,
  onCreateAlertForStation,
  lang
}) => {
  const t = translations[lang];
  const [live, setLive] = useState<{ at: number; deps: Departure[] } | null>(null);

  // Optional TMB iTransit predictions (only when API keys are configured)
  useEffect(() => {
    setLive(null);
    if (!station || !realtimeEnabled) return;
    const ctrl = new AbortController();
    const poll = () =>
      fetchRealtimeDepartures(station, network, ctrl.signal)
        .then((deps) => !ctrl.signal.aborted && setLive(deps ? { at: Date.now(), deps } : null))
        .catch(() => undefined);
    poll();
    const id = setInterval(poll, REALTIME_POLL_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [station, network]);

  const departures = useMemo(() => {
    if (!station) return [];
    const scheduled = network.departuresAt(station.id, now, 3);
    const liveNow = live?.deps
      .map((d) => {
        const secs = Math.max(0, (d.timeEstimateSeconds ?? 0) - Math.round((now - live.at) / 1000));
        return { ...d, timeEstimateSeconds: secs, timeEstimateMinutes: Math.floor(secs / 60) };
      })
      .filter((d) => (d.timeEstimateSeconds ?? 0) > 0 || now - live.at < 60000);
    return mergeDepartures(scheduled, liveNow ?? null).slice(0, 14);
  }, [station, network, now, live]);

  if (!station) return null;

  const isRealtime = departures.some((d) => d.isRealTime);
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  return (
    <div className="absolute top-44 left-4 z-30 w-[calc(100%-2rem)] sm:w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
      {/* Station Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {station.isBusStop ? t.busStop : t.station}
            </span>
            {station.hasAccessibleAccess && (
              <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20" title={t.wheelchairAccessible}>
                PMR
              </span>
            )}
            {station.hasElevator && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title={t.elevatorAvailable}>
                {t.elevatorAvailable}
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold text-white truncate">{station.name}</h3>

          {/* Lines Serving */}
          <div className="flex flex-wrap gap-1 mt-2">
            {station.lines.map((lCode) => {
              const matchedLine = lines.find((l) => l.code === lCode);
              return (
                <span
                  key={lCode}
                  className="px-2 py-0.5 rounded text-[11px] font-bold shadow-sm font-mono"
                  style={{ backgroundColor: matchedLine?.color || '#3b82f6', color: matchedLine?.textColor || '#fff' }}
                >
                  {lCode}
                </span>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Departures List */}
      <div className="p-3 max-h-[min(360px,calc(100vh-24rem))] overflow-y-auto space-y-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
          <span>{t.liveArrivals}</span>
          {isRealtime ? (
            <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
              <Radio className="w-3 h-3 animate-pulse" />
              {t.sourceRealtime}
            </span>
          ) : (
            <span className="text-sky-300 flex items-center gap-1 font-mono text-[10px] normal-case">
              <Clock className="w-3 h-3" />
              {t.sourceSchedule}
            </span>
          )}
        </div>

        {departures.length === 0 && <p className="text-xs text-slate-400 px-1 py-3">{t.noDepartures}</p>}

        {departures.map((dep, idx) => {
          const vehicle = vehicleById.get(dep.vehicleId) || null;
          const secs = dep.timeEstimateSeconds ?? dep.timeEstimateMinutes * 60;
          return (
            <div
              key={`${dep.vehicleId}-${idx}`}
              className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="min-w-8 h-8 px-1 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-sm"
                  style={{ backgroundColor: dep.lineColor, color: dep.lineTextColor || '#fff' }}
                >
                  {dep.lineCode}
                </span>
                <div className="min-w-0 truncate">
                  <div className="text-xs font-bold text-white truncate">→ {dep.destination}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    {dep.departureTime && (
                      <span className="font-mono">
                        {t.departsAt} {dep.departureTime}
                      </span>
                    )}
                    {dep.isLastOfDay && (
                      <span className="px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase text-[9px]">
                        {t.lastDeparture}
                      </span>
                    )}
                    {dep.isRealTime && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="font-tech text-base font-bold text-white leading-none">
                    {secs < 60 ? (
                      <span className="text-emerald-300 text-sm">{t.now}</span>
                    ) : (
                      <>
                        {dep.timeEstimateMinutes} <span className="text-[10px] font-normal text-slate-400">{t.mins}</span>
                      </>
                    )}
                  </div>
                  {dep.delayMinutes > 0 && <span className="text-[9px] text-amber-400 font-mono">+{dep.delayMinutes}m</span>}
                </div>

                {/* 3D Inspect Trigger (vehicle already running) */}
                {vehicle && (
                  <button
                    onClick={() => onOpen3DViewer(vehicle)}
                    title={t.inspect3D}
                    className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-500/30 transition-colors"
                  >
                    <span className="text-[10px] font-bold">3D</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: Quick Alert Trigger */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => onCreateAlertForStation(station, station.lines[0] || 'L1')}
          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-2"
        >
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.setAlertHere}</span>
        </button>
      </div>
    </div>
  );
};
