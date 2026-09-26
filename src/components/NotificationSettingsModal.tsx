import React, { useState } from 'react';
import { Bell, Sliders, Clock, AlertTriangle, Volume2, ShieldCheck, X, CheckCircle2, Radio } from 'lucide-react';
import { NotificationPreferences, TransitLine, Language } from '../types/transit';
import { translations } from '../i18n/translations';
import { playAlertNotificationSound } from '../utils/sound';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NotificationPreferences;
  onSavePreferences: (prefs: NotificationPreferences) => void;
  onTriggerTestIncident: (lineCode: string, delayMinutes: number) => void;
  lines: TransitLine[];
  lang: Language;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  onTriggerTestIncident,
  lines,
  lang
}) => {
  const t = translations[lang];

  const [prefs, setPrefs] = useState<NotificationPreferences>(preferences);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleToggleLine = (code: string) => {
    if (prefs.subscribedLineCodes.includes(code)) {
      setPrefs({
        ...prefs,
        subscribedLineCodes: prefs.subscribedLineCodes.filter((c) => c !== code)
      });
    } else {
      setPrefs({
        ...prefs,
        subscribedLineCodes: [...prefs.subscribedLineCodes, code]
      });
    }
  };

  const handleSelectAllLines = () => {
    setPrefs({
      ...prefs,
      subscribedLineCodes: lines.map((l) => l.code)
    });
  };

  const handleDeselectAllLines = () => {
    setPrefs({
      ...prefs,
      subscribedLineCodes: []
    });
  };

  const handleSave = () => {
    onSavePreferences(prefs);
    if (prefs.enableSound) playAlertNotificationSound();
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Personalizar Alertas y Notificaciones</h2>
              <p className="text-xs text-slate-400">Configura avisos de retrasos, incidencias y franjas horarias</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {justSaved && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Preferencias de notificación guardadas</span>
            </div>
          )}

          {/* Alert Type Toggles */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipos de Notificaciones</h4>

            {/* Arrival alerts */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white">Alertas de Llegada y Salida</div>
                  <div className="text-[11px] text-slate-400">Avisos con antelación antes de la llegada de tu vehículo</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefs({ ...prefs, enableArrivalAlerts: !prefs.enableArrivalAlerts })}
                className={`w-10 h-6 rounded-full transition-colors p-0.5 ${
                  prefs.enableArrivalAlerts ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  prefs.enableArrivalAlerts ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Real-time Delays Alert */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Avisos de Retraso en Tiempo Real</div>
                    <div className="text-[11px] text-slate-400">Notificar demoras imprevistas en la circulación</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefs({ ...prefs, enableDelayAlerts: !prefs.enableDelayAlerts })}
                  className={`w-10 h-6 rounded-full transition-colors p-0.5 ${
                    prefs.enableDelayAlerts ? 'bg-amber-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    prefs.enableDelayAlerts ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {prefs.enableDelayAlerts && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Umbral mínimo de retraso:</span>
                  <select
                    value={prefs.delayThresholdMinutes}
                    onChange={(e) => setPrefs({ ...prefs, delayThresholdMinutes: Number(e.target.value) })}
                    className="bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-white font-mono text-xs outline-none"
                  >
                    <option value={2}>Retrasos &gt; 2 minutos</option>
                    <option value={5}>Retrasos &gt; 5 minutos</option>
                    <option value={10}>Retrasos &gt; 10 minutos</option>
                  </select>
                </div>
              )}
            </div>

            {/* Disruptions & Maintenance */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radio className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="text-xs font-bold text-white">Incidencias Graves y Obras</div>
                  <div className="text-[11px] text-slate-400">Cortes de vía, huelgas y mantenimiento programado</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefs({ ...prefs, enableDisruptions: !prefs.enableDisruptions })}
                className={`w-10 h-6 rounded-full transition-colors p-0.5 ${
                  prefs.enableDisruptions ? 'bg-rose-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  prefs.enableDisruptions ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Sound chimes */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-xs font-bold text-white">Sonido de Campana de Tren</div>
                  <div className="text-[11px] text-slate-400">Reproducir aviso acústico al activarse una alerta</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefs({ ...prefs, enableSound: !prefs.enableSound })}
                className={`w-10 h-6 rounded-full transition-colors p-0.5 ${
                  prefs.enableSound ? 'bg-sky-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  prefs.enableSound ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Subscribed Lines Customization */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Líneas Suscritas ({prefs.subscribedLineCodes.length}/{lines.length})
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllLines}
                  className="text-sky-400 hover:underline"
                >
                  Todas
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={handleDeselectAllLines}
                  className="text-slate-400 hover:underline"
                >
                  Ninguna
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {lines.map((line) => {
                const isSubscribed = prefs.subscribedLineCodes.includes(line.code);
                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => handleToggleLine(line.code)}
                    className={`p-2 rounded-xl border text-xs font-bold font-mono transition-all flex items-center justify-between ${
                      isSubscribed
                        ? 'border-white text-white shadow-md'
                        : 'border-slate-800 bg-slate-950/60 text-slate-500 opacity-60'
                    }`}
                    style={{ backgroundColor: isSubscribed ? line.color : undefined }}
                  >
                    <span>{line.code}</span>
                    <span className="text-[10px] font-normal">{isSubscribed ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Window (Commute Hours) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white">Franja Horaria de Notificación</div>
                  <div className="text-[11px] text-slate-400">Limitar avisos a tus horas de desplazamiento</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefs({ ...prefs, timeFilterEnabled: !prefs.timeFilterEnabled })}
                className={`w-10 h-6 rounded-full transition-colors p-0.5 ${
                  prefs.timeFilterEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  prefs.timeFilterEnabled ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {prefs.timeFilterEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={prefs.activeStartTime}
                    onChange={(e) => setPrefs({ ...prefs, activeStartTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Hora Fin</label>
                  <input
                    type="time"
                    value={prefs.activeEndTime}
                    onChange={(e) => setPrefs({ ...prefs, activeEndTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Delay Alert Trigger */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-amber-300">Simulación de Prueba</div>
              <div className="text-[11px] text-amber-200/80">Dispara una alerta de retraso simulada en R1 (+5 min)</div>
            </div>
            <button
              type="button"
              onClick={() => onTriggerTestIncident('R1', 5)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Simular Retraso
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
