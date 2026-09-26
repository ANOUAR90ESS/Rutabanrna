import { useEffect, useState } from 'react';
import { TmbNetwork } from '../services/network/engine';

export type NetworkStatus =
  | { state: 'loading' }
  | { state: 'ready'; network: TmbNetwork }
  | { state: 'error'; message: string };

/** Loads the TMB GTFS network once (network first, Cache Storage when offline). */
export function useTmbNetwork(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({ state: 'loading' });

  useEffect(() => {
    const ctrl = new AbortController();
    TmbNetwork.load(ctrl.signal)
      .then((network) => setStatus({ state: 'ready', network }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setStatus({ state: 'error', message: e instanceof Error ? e.message : String(e) });
      });
    return () => ctrl.abort();
  }, []);

  return status;
}

/** Current time, refreshed every `intervalMs` (pauses while the tab is hidden). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (id) clearInterval(id);
      id = undefined;
    };
    const start = () => {
      stop();
      setNow(Date.now());
      id = setInterval(() => setNow(Date.now()), intervalMs);
    };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [intervalMs]);
  return now;
}
