import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ServiceNotice, Language } from '../types/transit';

interface LiveAlertsBannerProps {
  notices: ServiceNotice[];
  lang: Language;
}

/** Top-right ticker on the map with the most relevant timetable notice (desktop). */
export const LiveAlertsBanner: React.FC<LiveAlertsBannerProps> = ({ notices, lang }) => {
  const top = [...notices].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : b.severity === 'high' ? 1 : 0))[0];
  if (!top) return null;
  return (
    <div className="absolute top-4 right-4 z-20 hidden lg:block">
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2.5 max-w-sm">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="text-xs min-w-0">
          <div className="font-bold text-slate-200 truncate">{top.title[lang]}</div>
          <div className="text-[11px] text-slate-400 truncate">{top.description[lang]}</div>
        </div>
      </div>
    </div>
  );
};
