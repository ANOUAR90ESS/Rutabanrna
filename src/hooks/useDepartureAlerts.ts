import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Language } from '../types/transit';
import type { TmbNetwork } from '../services/network/engine';
import { madridClock } from '../services/network/clock';
import { AlertStatus, DepartureAlert, departureClock, evaluateAlert, loadAlerts, saveAlerts } from '../services/departureAlerts';
import { fmt, ui } from '../i18n/ui';
import { playAlertNotificationSound } from '../utils/sound';

export interface FiredAlert {
  key: string;
  alert: DepartureAlert;
  departureTime: string;
  secondsLeft: number;
  firedAt: number;
}

/**
 * Keeps the user's departure alerts, evaluates them against the live timetable every
 * 10 s and fires "leave now" (in-app banner + sound + system notification if allowed).
 * Notifications work while the app is open (foreground or background tab).
 */
export function useDepartureAlerts(network: TmbNetwork | null, now: number, lang: Language) {
  const [alerts, setAlerts] = useState<DepartureAlert[]>(() => loadAlerts());
  const [fired, setFired] = useState<FiredAlert | null>(null);
  const firedKeys = useRef<Set<string>>(new Set());

  useEffect(() => saveAlerts(alerts), [alerts]);

  const bucket = Math.floor(now / 10000);
  const statuses: AlertStatus[] = useMemo(
    () => (network ? alerts.map((a) => evaluateAlert(network, a, bucket * 10000)) : alerts.map((alert) => ({ alert }))),
    [network, alerts, bucket]
  );

  useEffect(() => {
    const t = ui(lang);
    const ymd = madridClock(bucket * 10000).ymd;
    for (const st of statuses) {
      if (!st.next || st.notifyIn === undefined || st.notifyIn > 0) continue;
      const depTime = departureClock(bucket * 10000, st.next);
      const key = `${st.alert.id}|${ymd}|${depTime}`;
      if (firedKeys.current.has(key)) continue;
      firedKeys.current.add(key);
      const secondsLeft = st.next.timeEstimateSeconds ?? 0;
      setFired({ key, alert: st.alert, departureTime: depTime, secondsLeft, firedAt: Date.now() });
      playAlertNotificationSound();
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`${t.alertLeave} · ${st.alert.lineCode}`, {
            body: fmt(t.alertLeaveBody, `${st.alert.lineCode} → ${st.alert.headsign}`, depTime, st.alert.stationName, st.alert.walkMinutes),
            tag: key,
            icon: '/icon.svg'
          });
        }
      } catch {
        /* ignore */
      }
      break;
    }
  }, [statuses, bucket, lang]);

  const addAlert = useCallback((a: DepartureAlert) => setAlerts((l) => [a, ...l]), []);
  const removeAlert = useCallback((id: string) => setAlerts((l) => l.filter((a) => a.id !== id)), []);
  const toggleAlert = useCallback((id: string) => setAlerts((l) => l.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))), []);

  return { alerts, statuses, fired, dismissFired: () => setFired(null), addAlert, removeAlert, toggleAlert };
}
