import React, { useState } from 'react';
import { Landmark, MapPin, Footprints, Compass, Navigation, Search, Sparkles, Eye } from 'lucide-react';
import { PointOfInterest, TransitLine, Language } from '../types/transit';
import { BARCELONA_LANDMARKS } from '../data/landmarksData';
import { translations } from '../i18n/translations';

interface LandmarksExplorerViewProps {
  onSelectLandmark: (landmark: PointOfInterest) => void;
  onLocateOnMap: (lat: number, lng: number) => void;
  lines: TransitLine[];
  lang: Language;
}

export const LandmarksExplorerView: React.FC<LandmarksExplorerViewProps> = ({
  onSelectLandmark,
  onLocateOnMap,
  lines,
  lang
}) => {
  const t = translations[lang];
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'monument', label: 'Monumentos' },
    { id: 'park', label: 'Parques' },
    { id: 'culture', label: 'Cultura y Barrios' },
    { id: 'beach', label: 'Playas' },
    { id: 'viewpoint', label: 'Miradores' }
  ];

  const filteredLandmarks = BARCELONA_LANDMARKS.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesName = item.name[lang].toLowerCase().includes(q);
      const matchesStation = item.nearestStationName.toLowerCase().includes(q);
      return matchesName || matchesStation;
    }
    return true;
  });

  return (
    <div className="w-full h-full bg-slate-950 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-rose-400" />
              <span>Lugares de Interés y Monumentos de Barcelona</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Explora las principales atracciones turísticas y descubre qué líneas de metro, tren y autobús te llevan directo.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar monumento o atracción..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-rose-500 text-xs text-white outline-none transition-colors"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Landmarks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLandmarks.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectLandmark(item)}
              className="group p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-0.5 shadow-lg flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                    <Footprints className="w-3 h-3" />
                    <span>{item.walkingMinutes} min</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors mb-2">
                  {item.name[lang]}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                  {item.description[lang]}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500">Parada cercana:</div>
                  <div className="text-xs font-semibold text-slate-300 truncate max-w-[140px]">
                    {item.nearestStationName}
                  </div>
                </div>

                {/* Line badges */}
                <div className="flex items-center gap-1">
                  {item.connectedLines.slice(0, 3).map((code) => {
                    const line = lines.find((l) => l.code === code);
                    return (
                      <span
                        key={code}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono text-white shadow-sm"
                        style={{ backgroundColor: line?.color || '#3b82f6' }}
                      >
                        {code}
                      </span>
                    );
                  })}
                  {item.connectedLines.length > 3 && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      +{item.connectedLines.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
