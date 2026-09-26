import React from 'react';
import { Clock, X, Train, Users, Accessibility, Bell, ExternalLink, ChevronRight } from 'lucide-react';
import { Station, TransitLine, LiveVehicle, Language } from '../types/transit';
import { translations } from '../i18n/translations';

interface DeparturesBoardProps {
  station: Station | null;
  lines: TransitLine[];
  vehicles: LiveVehicle[];
  onClose: () => void;
  onOpen3DViewer: (vehicle: LiveVehicle) => void;
  onCreateAlertForStation: (station: Station, lineCode: string) => void;
  lang: Language;
}

export const DeparturesBoard: React.FC<DeparturesBoardProps> = ({
  station,
  lines,
  vehicles,
  onClose,
  onOpen3DViewer,
  onCreateAlertForStation,
  lang
}) => {
  const t = translations[lang];

  if (!station) return null;

  // Find lines serving this station
  const servingLines = lines.filter((line) =>
    line.stations.some((st) => st.id === station.id)
  );

  // Generate real-time departures based on line vehicles and frequencies
  const departures = servingLines.flatMap((line) => {
    // Check if there is an active vehicle headed towards this station
    const activeVehicles = vehicles.filter((v) => v.lineCode === line.code);

    return [
      {
        lineCode: line.code,
        lineColor: line.color,
        type: line.type,
        destination: line.destination,
        etaMinutes: activeVehicles[0]?.etaMinutes || Math.floor(Math.random() * 3) + 1,
        platform: line.type === 'train' ? 'Vía 1' : undefined,
        occupancy: activeVehicles[0]?.occupancy || 'medium',
        isDelayed: activeVehicles[0]?.isDelayed || false,
        delayMinutes: activeVehicles[0]?.delayMinutes || 0,
        vehicle: activeVehicles[0] || null
      },
      {
        lineCode: line.code,
        lineColor: line.color,
        type: line.type,
        destination: line.origin,
        etaMinutes: (activeVehicles[1]?.etaMinutes || 5) + line.frequencyMinutes,
        platform: line.type === 'train' ? 'Vía 2' : undefined,
        occupancy: 'low',
        isDelayed: false,
        delayMinutes: 0,
        vehicle: activeVehicles[1] || null
      }
    ];
  }).sort((a, b) => a.etaMinutes - b.etaMinutes);

  return (
    <div className="absolute top-20 left-4 z-20 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
      {/* Station Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estación</span>
            {station.hasAccessibleAccess && (
              <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20" title={t.wheelchairAccessible}>
                PMR
              </span>
            )}
            {station.hasElevator && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title={t.elevatorAvailable}>
                Ascensor
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold text-white">{station.name}</h3>

          {/* Lines Serving */}
          <div className="flex flex-wrap gap-1 mt-2">
            {station.lines.map((lCode) => {
              const matchedLine = lines.find((l) => l.code === lCode);
              return (
                <span
                  key={lCode}
                  className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-sm font-mono"
                  style={{ backgroundColor: matchedLine?.color || '#3b82f6' }}
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
      <div className="p-3 max-h-[360px] overflow-y-auto space-y-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
          <span>{t.liveArrivals}</span>
          <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            EN DIRECTO
          </span>
        </div>

        {departures.map((dep, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 font-mono shadow-sm"
                style={{ backgroundColor: dep.lineColor }}
              >
                {dep.lineCode}
              </span>
              <div className="min-w-0 truncate">
                <div className="text-xs font-bold text-white truncate">{dep.destination}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                  {dep.platform && <span>{dep.platform}</span>}
                  <span className="flex items-center gap-1 text-slate-400">
                    <Users className="w-2.5 h-2.5" />
                    <span>{dep.occupancy === 'low' ? t.occupancyLow : dep.occupancy === 'medium' ? t.occupancyMed : t.occupancyHigh}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="font-tech text-base font-bold text-white leading-none">
                  {dep.etaMinutes} <span className="text-[10px] font-normal text-slate-400">{t.mins}</span>
                </div>
                {dep.isDelayed && (
                  <span className="text-[9px] text-amber-400 font-mono">+{dep.delayMinutes}m</span>
                )}
              </div>

              {/* 3D Inspect Trigger */}
              {dep.vehicle && (
                <button
                  onClick={() => onOpen3DViewer(dep.vehicle!)}
                  title={t.inspect3D}
                  className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-500/30 transition-colors"
                >
                  <span className="text-[10px] font-bold">3D</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: Quick Alert Trigger */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => onCreateAlertForStation(station, station.lines[0] || 'L1')}
          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-2"
        >
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>Configurar aviso para esta estación</span>
        </button>
      </div>
    </div>
  );
};
