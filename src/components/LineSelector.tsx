import React from 'react';
import { Search, Train, Bus, Compass, Radio } from 'lucide-react';
import { TransitType, TransitLine, Language } from '../types/transit';
import { translations } from '../i18n/translations';

interface LineSelectorProps {
  selectedType: TransitType | 'all';
  onSelectType: (type: TransitType | 'all') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalVehicles: number;
  lines: TransitLine[];
  activeLineCode: string | null;
  onSelectLineCode: (code: string | null) => void;
  lang: Language;
}

export const LineSelector: React.FC<LineSelectorProps> = ({
  selectedType,
  onSelectType,
  searchQuery,
  onSearchChange,
  totalVehicles,
  lines,
  activeLineCode,
  onSelectLineCode,
  lang
}) => {
  const t = translations[lang];

  const allTypes: { id: TransitType | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t.allVehicles, icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'metro', label: t.metro, icon: <div className="w-2 h-2 rounded-full bg-red-500" /> },
    { id: 'train', label: t.trains, icon: <Train className="w-3.5 h-3.5" /> },
    { id: 'bus', label: t.buses, icon: <Bus className="w-3.5 h-3.5" /> },
    { id: 'tram', label: t.trams, icon: <div className="w-2 h-2 rounded-full bg-emerald-500" /> }
  ];

  // Only offer the transport modes that exist in the loaded network
  const types = allTypes.filter((type) => type.id === 'all' || lines.some((l) => l.type === type.id));

  const filteredLines = lines.filter((line) => {
    if (selectedType !== 'all' && line.type !== selectedType) return false;
    return true;
  });

  return (
    <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[480px] z-20 flex flex-col gap-2 pointer-events-none">
      {/* Top Search & Live Counter */}
      <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-xs text-white placeholder-slate-500 outline-none transition-colors"
          />
        </div>

        {/* Live indicator badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 shrink-0">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>{totalVehicles}</span>
          <span className="text-slate-400 hidden sm:inline">{t.liveVehiclesOnMap}</span>
        </div>
      </div>

      {/* Transit Mode Filters */}
      <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-800/80 rounded-xl p-1 shadow-lg flex items-center gap-1 overflow-x-auto">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              onSelectType(type.id);
              onSelectLineCode(null);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              selectedType === type.id
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
            }`}
          >
            {type.icon}
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {/* Quick Line Code Pills */}
      <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        {filteredLines.map((line) => {
          const isSelected = activeLineCode === line.code;
          return (
            <button
              key={line.id}
              onClick={() => onSelectLineCode(isSelected ? null : line.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 shadow-sm whitespace-nowrap ${
                isSelected
                  ? 'ring-2 ring-white scale-105'
                  : 'opacity-85 hover:opacity-100'
              }`}
              style={{ backgroundColor: line.color, color: line.textColor }}
            >
              <span>{line.code}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
