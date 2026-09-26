import React from 'react';
import { MapPin, X, CheckCircle, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { CITIES } from '../data/cities';
import { City, Language } from '../types/transit';
import { translations } from '../i18n/translations';

interface CitySwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: City;
  onSelectCity: (city: City) => void;
  lang: Language;
}

export const CitySwitcherModal: React.FC<CitySwitcherModalProps> = ({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
  lang
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{t.citySelectModalTitle}</h2>
              <p className="text-xs text-slate-400">{t.citySelectModalDesc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cities Grid */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {CITIES.map((city) => {
            const isCurrent = city.id === selectedCity.id;
            const isActive = city.status === 'active';

            return (
              <div
                key={city.id}
                onClick={() => {
                  if (isActive) {
                    onSelectCity(city);
                    onClose();
                  }
                }}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-slate-800/80 border-sky-500/80 shadow-md ring-1 ring-sky-500/50'
                    : isActive
                    ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 cursor-pointer'
                    : 'bg-slate-950/30 border-slate-900 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{city.name[lang]}</h3>
                    <span className="text-xs text-slate-500">· {city.country}</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isActive ? t.availableNow : t.comingSoon}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {city.systems.map((sys, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-medium text-slate-400"
                    >
                      {sys}
                    </span>
                  ))}
                </div>

                {isActive && isCurrent && (
                  <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-emerald-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{t.liveGpsConnected}</span>
                    </span>
                    <span className="font-mono text-[11px]">3D ACTIVADO</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
