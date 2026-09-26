import React, { useState } from 'react';
import { Bell, Clock, Trash2, X, Plus, Volume2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { CustomTripAlert, TransitLine, Station, Language } from '../types/transit';
import { translations } from '../i18n/translations';
import { playAlertNotificationSound } from '../utils/sound';

interface TripAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: CustomTripAlert[];
  onSaveAlert: (alert: CustomTripAlert) => void;
  onDeleteAlert: (alertId: string) => void;
  onToggleAlert: (alertId: string) => void;
  lines: TransitLine[];
  stations: Station[];
  lang: Language;
}

export const TripAlertsModal: React.FC<TripAlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onSaveAlert,
  onDeleteAlert,
  onToggleAlert,
  lines,
  stations,
  lang
}) => {
  const t = translations[lang];

  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(alerts.length === 0);
  const [selectedLineCode, setSelectedLineCode] = useState<string>(lines[0]?.code || 'L1');
  const [title, setTitle] = useState<string>('');
  const [originId, setOriginId] = useState<string>(stations[0]?.id || '');
  const [destinationId, setDestinationId] = useState<string>(stations[1]?.id || '');
  const [targetTime, setTargetTime] = useState<string>('08:30');
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState<number>(10);
  const [notifyOnDelay, setNotifyOnDelay] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [repeatDays, setRepeatDays] = useState<('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]>([
    'mon', 'tue', 'wed', 'thu', 'fri'
  ]);
  const [justSavedNotification, setJustSavedNotification] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentLine = lines.find((l) => l.code === selectedLineCode) || lines[0];
  const lineStations = currentLine?.stations || stations;

  const handleToggleDay = (day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun') => {
    if (repeatDays.includes(day)) {
      setRepeatDays(repeatDays.filter((d) => d !== day));
    } else {
      setRepeatDays([...repeatDays, day]);
    }
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const originStation = stations.find((s) => s.id === originId) || stations[0];
    const destStation = stations.find((s) => s.id === destinationId) || stations[1];

    const newAlert: CustomTripAlert = {
      id: `alert-${Date.now()}`,
      title: title.trim() || `${currentLine.code}: ${originStation.name} → ${destStation.name}`,
      lineCode: currentLine.code,
      type: currentLine.type,
      originStationId: originStation.id,
      originStationName: originStation.name,
      destinationStationId: destStation.id,
      destinationStationName: destStation.name,
      targetTime,
      notifyMinutesBefore,
      notifyOnDelay,
      enabled: true,
      soundEnabled,
      repeatDays,
      createdAt: Date.now()
    };

    onSaveAlert(newAlert);
    if (soundEnabled) playAlertNotificationSound();

    setJustSavedNotification(true);
    setTimeout(() => {
      setJustSavedNotification(false);
      setIsCreatingNew(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{t.myAlerts}</h2>
              <p className="text-xs text-slate-400">{t.createYourFirstAlert}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs / Switcher */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setIsCreatingNew(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isCreatingNew
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t.myAlerts} ({alerts.length})</span>
            </button>
            <button
              onClick={() => setIsCreatingNew(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isCreatingNew
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createAlert}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => playAlertNotificationSound()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 transition-colors flex items-center gap-1.5 border border-slate-800"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{t.testSound}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {isCreatingNew ? (
            /* Form to Create New Trip Alert */
            <form onSubmit={handleCreateAlert} className="space-y-4">
              {justSavedNotification && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Alerta guardada con éxito!</span>
                </div>
              )}

              {/* Title & Line Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.alertTitle}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.alertTitlePlaceholder}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Línea
                  </label>
                  <select
                    value={selectedLineCode}
                    onChange={(e) => setSelectedLineCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none cursor-pointer"
                  >
                    {lines.map((line) => (
                      <option key={line.id} value={line.code}>
                        {line.code} · {line.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stations (Origin & Destination) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.originStation}
                  </label>
                  <select
                    value={originId}
                    onChange={(e) => setOriginId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none cursor-pointer"
                  >
                    {lineStations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.destinationStation}
                  </label>
                  <select
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none cursor-pointer"
                  >
                    {lineStations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time & Advance Notification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.targetDepartureTime}</span>
                  </label>
                  <input
                    type="time"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.advanceNotice}
                  </label>
                  <select
                    value={notifyMinutesBefore}
                    onChange={(e) => setNotifyMinutesBefore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-xs outline-none cursor-pointer"
                  >
                    <option value={0}>{t.atDeparture}</option>
                    <option value={5}>5 {t.minutesBefore}</option>
                    <option value={10}>10 {t.minutesBefore}</option>
                    <option value={15}>15 {t.minutesBefore}</option>
                    <option value={20}>20 {t.minutesBefore}</option>
                  </select>
                </div>
              </div>

              {/* Days of Week Repeat */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  {t.repeatOn}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'mon', label: t.daysMon },
                    { key: 'tue', label: t.daysTue },
                    { key: 'wed', label: t.daysWed },
                    { key: 'thu', label: t.daysThu },
                    { key: 'fri', label: t.daysFri },
                    { key: 'sat', label: t.daysSat },
                    { key: 'sun', label: t.daysSun }
                  ].map((day) => {
                    const isSelected = repeatDays.includes(day.key as any);
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => handleToggleDay(day.key as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checkboxes: Delays & Sound */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnDelay}
                    onChange={(e) => setNotifyOnDelay(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 accent-emerald-500 focus:ring-0"
                  />
                  <span>{t.notifyOnDelays}</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 accent-emerald-500 focus:ring-0"
                  />
                  <span>{t.soundAlert}</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 transition-all shadow-md shadow-emerald-500/20"
                >
                  {t.saveAlert}
                </button>
              </div>
            </form>
          ) : (
            /* Active Alerts List */
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{t.noAlertsYet}</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">{t.createYourFirstAlert}</p>
                  <button
                    onClick={() => setIsCreatingNew(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-all shadow-md"
                  >
                    + {t.createAlert}
                  </button>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border transition-all ${
                      alert.enabled
                        ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold font-mono text-xs border border-sky-500/30">
                            {alert.lineCode}
                          </span>
                          <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <span>{alert.originStationName}</span>
                          <span>→</span>
                          <span>{alert.destinationStationName}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
                          <span className="flex items-center gap-1 font-mono text-amber-300">
                            <Clock className="w-3 h-3" />
                            <span>{alert.targetTime}</span>
                          </span>
                          <span>·</span>
                          <span>Aviso {alert.notifyMinutesBefore}m antes</span>
                          <span>·</span>
                          <span className="uppercase text-[10px] tracking-wider text-slate-400">
                            {alert.repeatDays.join(', ')}
                          </span>
                        </div>
                      </div>

                      {/* Toggle & Delete */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleAlert(alert.id)}
                          className={`w-10 h-6 rounded-full transition-colors p-0.5 ${
                            alert.enabled ? 'bg-emerald-500' : 'bg-slate-800'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white transition-transform ${
                              alert.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => onDeleteAlert(alert.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
