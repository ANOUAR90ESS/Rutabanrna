import React, { useState } from 'react';
import { AlertTriangle, Bell, Clock, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { ServiceNotice, CustomTripAlert, Language, LiveVehicle } from '../types/transit';
import { translations } from '../i18n/translations';

interface LiveAlertsBannerProps {
  notices: ServiceNotice[];
  activeTripAlarm: CustomTripAlert | null;
  onDismissAlarm: () => void;
  onOpen3DViewerForLine?: (lineCode: string) => void;
  lang: Language;
}

export const LiveAlertsBanner: React.FC<LiveAlertsBannerProps> = ({
  notices,
  activeTripAlarm,
  onDismissAlarm,
  onOpen3DViewerForLine,
  lang
}) => {
  const t = translations[lang];
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <>
      {/* 1. Real-time Trip Alarm Banner (Fires when target commute time or proximity is reached) */}
      {activeTripAlarm && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 border-2 border-emerald-400 p-4 rounded-2xl shadow-2xl text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-white animate-spin" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    {t.liveAlertTriggered}
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-200">
                    {activeTripAlarm.targetTime}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-0.5">{activeTripAlarm.title}</h4>
                <p className="text-xs text-emerald-100">{t.trainApproaching}</p>

                <div className="flex items-center gap-2 mt-3">
                  {onOpen3DViewerForLine && (
                    <button
                      onClick={() => onOpen3DViewerForLine(activeTripAlarm.lineCode)}
                      className="px-3 py-1.5 rounded-lg bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-sm"
                    >
                      {t.inspect3D}
                    </button>
                  )}
                  <button
                    onClick={onDismissAlarm}
                    className="px-3 py-1.5 rounded-lg bg-emerald-800/60 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </div>

              <button
                onClick={onDismissAlarm}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top-right Subtle Service Notice ticker */}
      {notices.length > 0 && (
        <div className="absolute top-4 right-4 z-20 hidden lg:block">
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2.5 max-w-sm">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs min-w-0">
              <div className="font-bold text-slate-200 truncate">{notices[0].title[lang]}</div>
              <div className="text-[11px] text-slate-400 truncate">{notices[0].description[lang]}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
