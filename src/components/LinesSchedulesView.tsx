import React, { useState } from 'react';
import { Layers, Train, Bus, ChevronRight, Clock, MapPin, Eye, CheckCircle2 } from 'lucide-react';
import { TransitLine, TransitType, Language, LiveVehicle } from '../types/transit';
import { translations } from '../i18n/translations';

interface LinesSchedulesViewProps {
  lines: TransitLine[];
  onSelectLineOnMap: (line: TransitLine) => void;
  onOpen3DViewerForLine: (lineCode: string) => void;
  vehicles: LiveVehicle[];
  lang: Language;
}

export const LinesSchedulesView: React.FC<LinesSchedulesViewProps> = ({
  lines,
  onSelectLineOnMap,
  onOpen3DViewerForLine,
  vehicles,
  lang
}) => {
  const t = translations[lang];
  const [selectedType, setSelectedType] = useState<TransitType | 'all'>('all');
  const [expandedLineId, setExpandedLineId] = useState<string | null>(lines[0]?.id || null);

  const tabs = [
    { id: 'all', label: t.allVehicles },
    { id: 'metro', label: t.metro },
    { id: 'train', label: t.trains },
    { id: 'bus', label: t.buses },
    { id: 'tram', label: t.trams }
  ].filter((tab) => tab.id === 'all' || lines.some((l) => l.type === tab.id));

  const filteredLines = lines.filter((l) => {
    if (selectedType === 'all') return true;
    return l.type === selectedType;
  });

  return (
    <div className="w-full h-full bg-slate-950 flex flex-col overflow-hidden">
      {/* Header and Filter */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>{t.linesSchedules}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Horarios, frecuencias y recorrido completo de la red TMB (GTFS oficial).
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedType === tab.id
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lines Accordion List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {filteredLines.map((line) => {
          const isExpanded = expandedLineId === line.id;
          const activeVehicle = vehicles.find((v) => v.lineCode === line.code);

          return (
            <div
              key={line.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-xl'
                  : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Line Header Row */}
              <div
                onClick={() => setExpandedLineId(isExpanded ? null : line.id)}
                className="p-4 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="min-w-10 h-10 px-1 rounded-xl flex items-center justify-center font-bold font-mono text-sm shadow-md shrink-0"
                    style={{ backgroundColor: line.color, color: line.textColor }}
                  >
                    {line.code}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{line.name}</h3>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{line.operator}</span>
                      <span>·</span>
                      <span className="font-mono text-slate-300">
                        {line.frequencyMinutes > 0 ? `${t.everyMin} ${line.frequencyMinutes} ${t.mins}` : '—'}
                      </span>
                      <span>·</span>
                      <span>{line.stations.length} {t.stopsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen3DViewerForLine(line.code);
                    }}
                    title={t.inspect3D}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-500/30 font-semibold text-xs transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>3D</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLineOnMap(line);
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Expanded Station Sequence & Info */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-800/60 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {line.serviceStart ? `${t.firstLast}: ${line.serviceStart} – ${line.serviceEnd}` : t.operatingHours}
                      </span>
                    </span>
                    <button
                      onClick={() => onSelectLineOnMap(line)}
                      className="text-sky-400 hover:underline font-semibold"
                    >
                      Centrar ruta en el mapa →
                    </button>
                  </div>

                  {/* Stations Rail Path */}
                  <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                    {line.stations.map((st, sIdx) => (
                      <div key={st.id} className="relative flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div
                            className="absolute -left-6 w-3 h-3 rounded-full border-2 border-slate-900 shadow"
                            style={{ backgroundColor: line.color }}
                          />
                          <span className="font-semibold text-slate-200">{st.name}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          {st.hasAccessibleAccess && <span className="text-sky-400">PMR</span>}
                          {st.hasElevator && <span>· Ascensor</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
