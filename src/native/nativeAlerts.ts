/**
 * Android: turn departure alerts into scheduled native notifications, so "leave now"
 * fires even when the app is closed. Notifications are computed from the bundled
 * timetable for the next DAYS days and re-synced whenever the app opens or alerts change.
 */
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Language } from '../types/transit';
import type { TmbNetwork } from '../services/network/engine';
import { madridClock } from '../services/network/clock';
import { DepartureAlert, madridWeekDay } from '../services/departureAlerts';
import { fmt, ui } from '../i18n/ui';
import { isNative } from './platform';

const DAYS = 7;
const CHANNEL = 'departures';
let channelReady = false;

const toSecs = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 3600 + m * 60;
};

function idFor(alertId: string, day: number): number {
  let h = 0;
  for (const ch of alertId) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h % 100000) * 10 + day; // stable, fits in a Java int
}

export interface PlannedNotification {
  id: number;
  at: number; // epoch ms
  title: string;
  body: string;
}

/** Pure planning step (testable on the web): one notification per alert and day. */
export function planNotifications(net: TmbNetwork, alerts: DepartureAlert[], nowMs: number, lang: Language): PlannedNotification[] {
  const t = ui(lang);
  const c = madridClock(nowMs);
  const out: PlannedNotification[] = [];
  for (const a of alerts) {
    if (!a.enabled) continue;
    const lead = (a.walkMinutes + a.leadMinutes) * 60;
    const from = toSecs(a.from);
    let to = toSecs(a.to);
    if (to < from) to += 86400;
    for (let d = 0; d < DAYS; d++) {
      // instant (epoch ms) of "window start − walk − margin" on Barcelona day d
      const queryMs = nowMs + (d * 86400 + from - lead - c.secs) * 1000;
      if (!a.days.includes(madridWeekDay(nowMs + (d * 86400 + from - c.secs) * 1000))) continue;
      const base = Math.max(queryMs, nowMs);
      const dep = net
        .departuresAt(a.stationId, base, 12)
        .filter((x) => x.lineCode === a.lineCode && x.destination === a.headsign)
        .find((x) => {
          const depMs = base + (x.timeEstimateSeconds ?? 0) * 1000;
          const depSecsFromDayStart = (depMs - nowMs) / 1000 + c.secs - d * 86400;
          return depSecsFromDayStart >= from && depSecsFromDayStart <= to && depMs - lead * 1000 > nowMs + 30000;
        });
      if (!dep) continue;
      const depMs = base + (dep.timeEstimateSeconds ?? 0) * 1000;
      out.push({
        id: idFor(a.id, d),
        at: depMs - lead * 1000,
        title: `${t.alertLeave} · ${a.lineCode} → ${a.headsign}`,
        body: fmt(t.alertLeaveBody, a.lineCode, dep.departureTime ?? '', a.stationName, a.walkMinutes)
      });
    }
  }
  return out.sort((x, y) => x.at - y.at);
}

/** Replace all scheduled departure notifications with a fresh plan (Android only). */
export async function syncNativeAlerts(net: TmbNetwork, alerts: DepartureAlert[], lang: Language): Promise<number> {
  if (!isNative) return 0;
  try {
    if (!channelReady) {
      await LocalNotifications.createChannel({ id: CHANNEL, name: 'Sal ahora', importance: 5, visibility: 1, vibration: true });
      channelReady = true;
    }
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    if (!alerts.some((a) => a.enabled)) return 0;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return 0;
    const plan = planNotifications(net, alerts, Date.now(), lang);
    if (plan.length) {
      await LocalNotifications.schedule({
        notifications: plan.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          channelId: CHANNEL,
          schedule: { at: new Date(p.at), allowWhileIdle: true }
        }))
      });
    }
    return plan.length;
  } catch (e) {
    console.warn('native alerts', e);
    return 0;
  }
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!isNative) return false;
  const r = await LocalNotifications.requestPermissions();
  return r.display === 'granted';
}

export async function nativeNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNative) return 'denied';
  const r = await LocalNotifications.checkPermissions();
  return r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'prompt';
}
