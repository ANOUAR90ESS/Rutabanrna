import React, { useState } from 'react';
import { DownloadCloud, CheckCircle2, Wifi, WifiOff, Trash2, X, HardDrive, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { OfflinePackageState, Language } from '../types/transit';
import { downloadBarcelonaOfflinePack, clearOfflineCache, toggleSimulatedOffline } from '../services/offlineStorage';
import { translations } from '../i18n/translations';

interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  offlineState: OfflinePackageState;
  onStateChange: (state: OfflinePackageState) => void;
  lang: Language;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  isOpen,
  onClose,
  offlineState,
  onStateChange,
  lang
}) => {
  const t = translations[lang];
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(10);

    try {
      const newState = await downloadBarcelonaOfflinePack((pct) => {
        setDownloadProgress(pct);
      });
      onStateChange(newState);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleClearCache = () => {
    const cleared = clearOfflineCache();
    onStateChange(cleared);
  };

  const handleToggleSimulation = () => {
    const updated = toggleSimulatedOffline(!offlineState.isSimulatedOffline);
    onStateChange(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Modo Sin Conexión (Offline Pack)</h2>
              <p className="text-xs text-slate-400">Descarga la red de Barcelona para usar la app sin internet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Status Box */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            offlineState.isDownloaded
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                offlineState.isDownloaded ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {offlineState.isDownloaded ? <CheckCircle2 className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {offlineState.isDownloaded ? 'Paquete Barcelona Descargado' : 'Paquete No Descargado'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {offlineState.isDownloaded
                    ? `Versión ${offlineState.version} · ${(offlineState.sizeBytes / 1024 / 1024).toFixed(1)} MB`
                    : 'Aproximadamente 4.5 MB'}
                </div>
              </div>
            </div>

            {offlineState.isDownloaded && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVO
              </span>
            )}
          </div>

          {/* Download Progress Bar */}
          {isDownloading && downloadProgress !== null && (
            <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                <span>Descargando rutas, horarios y mapa vectorial...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Cached Assets Breakdown */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Contenido del Paquete</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Líneas y Rutas:</span>
                <span className="font-mono font-bold text-white">
                  {offlineState.isDownloaded ? `${offlineState.cachedLinesCount} líneas TMB` : 'Metro + Bus TMB'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Estaciones y paradas:</span>
                <span className="font-mono font-bold text-white">
                  {offlineState.isDownloaded ? offlineState.cachedStationsCount : '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Lugares de Interés:</span>
                <span className="font-mono font-bold text-white">{offlineState.cachedLandmarksCount || '—'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Horarios:</span>
                <span className="font-mono font-bold text-emerald-400">GTFS oficial completo</span>
              </div>
            </div>
          </div>

          {/* Test Offline Mode Simulation Toggle */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {offlineState.isSimulatedOffline ? (
                <WifiOff className="w-4 h-4 text-amber-400" />
              ) : (
                <Wifi className="w-4 h-4 text-emerald-400" />
              )}
              <div>
                <div className="text-xs font-bold text-white">Simular Modo Sin Conexión</div>
                <div className="text-[11px] text-slate-400">
                  {offlineState.isSimulatedOffline
                    ? 'La app está funcionando en modo sin conexión simulado'
                    : 'Prueba cómo funciona la app sin internet'}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleSimulation}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                offlineState.isSimulatedOffline ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  offlineState.isSimulatedOffline ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          {offlineState.isDownloaded ? (
            <button
              onClick={handleClearCache}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar datos offline</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              {t.close}
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>{offlineState.isDownloaded ? 'Actualizar Paquete' : 'Descargar Datos'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
