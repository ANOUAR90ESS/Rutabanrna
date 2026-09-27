import React from 'react';
import { AlertTriangle, Info, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { ServiceNotice, Language } from '../types/transit';
import { translations } from '../i18n/translations';
import { ui } from '../i18n/ui';

interface ServiceNoticesViewProps {
  notices: ServiceNotice[];
  lang: Language;
}

export const ServiceNoticesView: React.FC<ServiceNoticesViewProps> = ({ notices, lang }) => {
  const t = translations[lang];

  return (
    <div className="w-full h-full bg-slate-950 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>{t.serviceNotices}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Información oficial de TMB, Rodalies de Catalunya y FGC sobre el estado de las vías y retrasos.
          </p>
        </div>

        {/* Overall Network Health Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{t.networkStatus}</div>
              <div className="text-xs text-emerald-300">Servicio regular en el 96% de la red metropolitana</div>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            NORMAL
          </span>
        </div>

        {/* Notices List */}
        <div className="space-y-3">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      notice.severity === 'medium'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}
                  >
                    {notice.severity === 'medium' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold font-mono text-xs text-white">
                        {notice.lineCode}
                      </span>
                      <h4 className="text-sm font-bold text-white">{notice.title[lang]}</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{notice.description[lang]}</p>
                    <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{notice.timestamp === 'GTFS' ? ui(lang).derivedNotice : notice.timestamp}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                    notice.severity === 'medium'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}
                >
                  {notice.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
