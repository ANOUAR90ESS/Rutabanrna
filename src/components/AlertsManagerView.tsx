import React from 'react';
import { Bell, Plus, Clock, Trash2, Volume2, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { CustomTripAlert, TransitLine, Language } from '../types/transit';
import { translations } from '../i18n/translations';
import { playAlertNotificationSound } from '../utils/sound';

interface AlertsManagerViewProps {
  alerts: CustomTripAlert[];
  onOpenCreateModal: () => void;
  onToggleAlert: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
  lines: TransitLine[];
  lang: Language;
}

export const AlertsManagerView: React.FC<AlertsManagerViewProps> = ({
  alerts,
  onOpenCreateModal,
  onToggleAlert,
  onDeleteAlert,
  lines,
  lang
}) => {
  const t = translations[lang];

  return (
    <div className="w-full h-full bg-slate-950 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-400" />
              <span>{t.myAlerts}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configura alertas automáticas para que tu teléfono u ordenador te avise antes de que salga tu tren, metro o bus.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => playAlertNotificationSound()}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>{t.testSound}</span>
            </button>

            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createAlert}</span>
            </button>
          </div>
        </div>

        {/* Alerts Grid */}
        {alerts.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-slate-800 rounded-3xl bg-slate-900/40">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">{t.noAlertsYet}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              {t.createYourFirstAlert}
            </p>
            <button
              onClick={onOpenCreateModal}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all shadow-lg shadow-emerald-500/20"
            >
              + {t.createAlert}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => {
              const matchedLine = lines.find((l) => l.code === alert.lineCode);

              return (
                <div
                  key={alert.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    alert.enabled
                      ? 'bg-slate-900/90 border-slate-700/80 shadow-xl'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono text-sm text-white shadow-sm shrink-0"
                        style={{ backgroundColor: matchedLine?.color || '#0087CD' }}
                      >
                        {alert.lineCode}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight mb-1">{alert.title}</h4>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <span className="text-slate-300 font-medium">{alert.originStationName}</span>
                          <span>→</span>
                          <span className="text-slate-300 font-medium">{alert.destinationStationName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle active switch */}
                    <button
                      onClick={() => onToggleAlert(alert.id)}
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                        alert.enabled ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          alert.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Details pill row */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono font-bold text-amber-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{alert.targetTime}</span>
                      </span>
                      <span>·</span>
                      <span>{alert.notifyMinutesBefore}m {t.minutesBefore}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title={t.deleteAlert}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Recurrence tags */}
                  <div className="mt-2.5 flex items-center gap-1">
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                      const active = alert.repeatDays.includes(day as any);
                      return (
                        <span
                          key={day}
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            active
                              ? 'bg-slate-800 text-slate-200 font-bold border border-slate-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {day.toUpperCase()}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
