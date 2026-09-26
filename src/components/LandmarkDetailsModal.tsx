import React from 'react';
import { X, MapPin, Footprints, Clock, Sparkles, Navigation, Train, Bus, Info } from 'lucide-react';
import { PointOfInterest, Station, TransitLine, Language } from '../types/transit';
import { translations } from '../i18n/translations';

interface LandmarkDetailsModalProps {
  landmark: PointOfInterest | null;
  onClose: () => void;
  onViewStation: (stationId: string) => void;
  onCenterOnMap: (lat: number, lng: number) => void;
  lines: TransitLine[];
  lang: Language;
}

export const LandmarkDetailsModal: React.FC<LandmarkDetailsModalProps> = ({
  landmark,
  onClose,
  onViewStation,
  onCenterOnMap,
  lines,
  lang
}) => {
  const t = translations[lang];

  if (!landmark) return null;

  // Category gradients
  const categoryGradients: Record<string, string> = {
    monument: 'from-amber-500/20 via-orange-500/10 to-slate-900 border-amber-500/40 text-amber-300',
    museum: 'from-purple-500/20 via-pink-500/10 to-slate-900 border-purple-500/40 text-purple-300',
    park: 'from-emerald-500/20 via-teal-500/10 to-slate-900 border-emerald-500/40 text-emerald-300',
    beach: 'from-cyan-500/20 via-blue-500/10 to-slate-900 border-cyan-500/40 text-cyan-300',
    culture: 'from-rose-500/20 via-red-500/10 to-slate-900 border-rose-500/40 text-rose-300',
    viewpoint: 'from-indigo-500/20 via-sky-500/10 to-slate-900 border-indigo-500/40 text-indigo-300'
  };

  const gradientClass = categoryGradients[landmark.category] || categoryGradients.monument;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Banner with visual styling */}
        <div className={`p-6 bg-gradient-to-br ${gradientClass} border-b relative flex items-start justify-between`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md">
                {landmark.category}
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1 font-mono">
                <MapPin className="w-3 h-3 text-rose-400" />
                <span>Barcelona</span>
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">
              {landmark.name[lang]}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción</h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              {landmark.description[lang]}
            </p>
          </div>

          {/* Transit Access & Nearest Station */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Navigation className="w-4 h-4 text-sky-400" />
                <span>Cómo llegar en transporte público</span>
              </div>
              <span className="flex items-center gap-1 text-xs text-amber-400 font-mono">
                <Footprints className="w-3.5 h-3.5" />
                <span>{landmark.walkingMinutes} min a pie</span>
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-xs text-slate-400">Estación más cercana:</div>
                <div className="text-sm font-bold text-white">{landmark.nearestStationName}</div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onViewStation(landmark.nearestStationId);
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors"
              >
                Ver llegadas
              </button>
            </div>

            {/* Connected Line Badges */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-400 mb-1.5">Líneas con conexión directa:</div>
              <div className="flex flex-wrap gap-1.5">
                {landmark.connectedLines.map((lCode) => {
                  const line = lines.find((l) => l.code === lCode);
                  return (
                    <span
                      key={lCode}
                      className="px-2 py-0.5 rounded text-xs font-bold font-mono text-white shadow-sm"
                      style={{ backgroundColor: line?.color || '#3b82f6' }}
                    >
                      {lCode}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tips & Recommendations */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Consejos para el visitante</span>
            </div>
            <p className="text-amber-100/90 leading-relaxed">
              {landmark.tips[lang]}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onCenterOnMap(landmark.lat, landmark.lng);
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>Ver en el Mapa</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-bold text-slate-950 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
