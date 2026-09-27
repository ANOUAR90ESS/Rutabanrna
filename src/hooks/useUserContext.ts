import { useCallback, useEffect, useRef, useState } from 'react';

// ------------------------------------------------------------------ geolocation
export type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ok'; lat: number; lng: number; accuracy: number; at: number }
  | { status: 'denied' }
  | { status: 'unavailable' };

const GEO_KEY = 'barnatransit_geo_allowed';

/** Device location. Starts automatically if the user allowed it before; otherwise on `request()`. */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle' });
  const watchId = useRef<number | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unavailable' });
      return;
    }
    if (watchId.current !== null) return;
    setState((s) => (s.status === 'ok' ? s : { status: 'locating' }));
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        try { localStorage.setItem(GEO_KEY, '1'); } catch { /* ignore */ }
        setState({ status: 'ok', lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: p.timestamp });
      },
      (err) => {
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        setState({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' });
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }, []);

  useEffect(() => {
    let allowed = false;
    try { allowed = localStorage.getItem(GEO_KEY) === '1'; } catch { /* ignore */ }
    if (allowed) request();
    else navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then((p) => p.state === 'granted' && request()).catch(() => undefined);
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [request]);

  return { geo: state, requestLocation: request };
}

// ------------------------------------------------------------------ favourites
export interface Favorites {
  home?: string;    // station id
  work?: string;
  starred: string[];
}

const FAV_KEY = 'barnatransit_favorites';

export function useFavorites() {
  const [fav, setFav] = useState<Favorites>(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) return { starred: [], ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { starred: [] };
  });

  useEffect(() => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(fav)); } catch { /* ignore */ }
  }, [fav]);

  const toggleStar = useCallback((id: string) => {
    setFav((f) => ({ ...f, starred: f.starred.includes(id) ? f.starred.filter((x) => x !== id) : [...f.starred, id] }));
  }, []);
  const setHome = useCallback((id: string | undefined) => setFav((f) => ({ ...f, home: id })), []);
  const setWork = useCallback((id: string | undefined) => setFav((f) => ({ ...f, work: id })), []);

  return { fav, toggleStar, setHome, setWork };
}
