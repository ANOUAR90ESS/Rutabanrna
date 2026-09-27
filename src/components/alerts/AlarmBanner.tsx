import React from 'react';
import { BellRing, X } from 'lucide-react';
import type { Language } from '../../types/transit';
import type { FiredAlert } from '../../hooks/useDepartureAlerts';
import { fmt, ui } from '../../i18n/ui';

/** "Leave now" banner shown when a departure alert fires. */
export const AlarmBanner: React.FC<{ fired: FiredAlert | null; now: number; lang: Language; onDismiss: () => void }> = ({ fired, now, lang, onDismiss }) => {
  if (!fired) return null;
  const t = ui(lang);
  const left = Math.max(0, fired.secondsLeft - Math.round((now - fired.firedAt) / 1000));
  return (
    <div className="fixed z-50 inset-x-2 bottom-20 lg:bottom-6 lg:right-6 lg:left-auto lg:w-96">
      <div className="rounded-2xl p-4 bg-gradient-to-r from-emerald-600 to-teal-700 border border-emerald-300/60 shadow-2xl text-white flex gap-3">
        <BellRing className="w-6 h-6 shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="text-base font-extrabold">
            {t.alertLeave} · {fired.alert.lineCode} → {fired.alert.headsign}
          </div>
          <div className="text-sm text-emerald-50">
            {fmt(t.alertLeaveBody, fired.alert.lineCode, fired.departureTime, fired.alert.stationName, fired.alert.walkMinutes)}
          </div>
          <div className="font-tech text-2xl font-bold mt-1 tabular-nums">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </div>
        </div>
        <button onClick={onDismiss} className="self-start p-1 rounded-lg hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
