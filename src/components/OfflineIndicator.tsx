import React, { useEffect, useState } from 'react';
import { WifiOff, HardDrive, CheckCircle2 } from 'lucide-react';
import { OfflinePackageState } from '../types/transit';

interface OfflineIndicatorProps {
  offlineState: OfflinePackageState;
  onOpenOfflineManager: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  offlineState,
  onOpenOfflineManager
}) => {
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isOffline = !isBrowserOnline || offlineState.isSimulatedOffline;

  if (!isOffline && !offlineState.isDownloaded) return null;

  return (
    <div
      onClick={onOpenOfflineManager}
      className={`fixed bottom-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xl cursor-pointer transition-all hover:scale-105 backdrop-blur-md ${
        isOffline
          ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
          : 'bg-slate-900/80 border-slate-700/60 text-emerald-400'
      }`}
    >
      {isOffline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Modo Sin Conexión · Datos en caché</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Offline Pack listo</span>
        </>
      )}
    </div>
  );
};
