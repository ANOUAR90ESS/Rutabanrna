import React from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import { Language } from '../types/transit';
import { translations } from '../i18n/translations';
import type { NetworkStatus } from '../hooks/useTmbNetwork';

interface NetworkLoadingScreenProps {
  status: NetworkStatus;
  lang: Language;
}

export const NetworkLoadingScreen: React.FC<NetworkLoadingScreenProps> = ({ status, lang }) => {
  const t = translations[lang];
  const failed = status.state === 'error';

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
          {failed ? <WifiOff className="w-6 h-6 text-rose-400" /> : <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />}
        </div>
        <h1 className="text-lg font-extrabold tracking-tight">{failed ? t.networkError : t.loadingNetwork}</h1>
        {failed && (
          <>
            <p className="text-xs text-slate-400">{status.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-colors"
            >
              {t.retry}
            </button>
          </>
        )}
        <p className="text-[10px] text-slate-500">Fuente: TMB — datos abiertos (GTFS)</p>
      </div>
    </div>
  );
};
