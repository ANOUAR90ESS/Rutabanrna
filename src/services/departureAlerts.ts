import type { Departure } from '../types/transit';
import type { TmbNetwork } from './network/engine';
import { formatClock, madridClock } from './network/clock';

export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEK: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * "Tell me when to leave": watches the real departures of one line/direction at one station
 * within a time window and fires when it's time to walk out of the door.
 */
export interface DepartureAlert {
  id: string;
  stationId: string;
  stationName: string;
  lineCode: string;
  headsign: string;
  from: string;        // window start "HH:MM" (departure time at the station)
  to: string;          // window end "HH:MM"
  walkMinutes: number; // door → platform
  leadMinutes: number; // extra margin
  days: WeekDay[];
  enabled: boolean;
  createdAt: number;
}

export interface AlertStatus {
  alert: DepartureAlert;
  /** departure the alert is tracking (first catchable one inside the window today) */
  next?: Departure;
  /** seconds from now until the "leave now" notification */
  notifyIn?: number;
}

const KEY = 'barnatransit_departure_alerts';

export function loadAlerts(): DepartureAlert[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

export function saveAlerts(list: DepartureAlert[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

const toSecs = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 3600 + m * 60;
};

/** Weekday in Barcelona for the given instant. */
export function madridWeekDay(ms: number): WeekDay {
  const c = madridClock(ms);
  const d = new Date(Date.UTC(+c.ymd.slice(0, 4), +c.ymd.slice(4, 6) - 1, +c.ymd.slice(6, 8)));
  return WEEK[(d.getUTCDay() + 6) % 7];
}

export function evaluateAlert(net: TmbNetwork, a: DepartureAlert, ms: number): AlertStatus {
  if (!a.enabled || !a.days.includes(madridWeekDay(ms))) return { alert: a };
  const c = madridClock(ms);
  const from = toSecs(a.from), to = toSecs(a.to) < from ? toSecs(a.to) + 86400 : toSecs(a.to);
  if (c.secs > to) return { alert: a };
  const lead = (a.walkMinutes + a.leadMinutes) * 60;
  const deps = net
    .departuresAt(a.stationId, ms, 12)
    .filter((d) => d.lineCode === a.lineCode && d.destination === a.headsign);
  const next = deps.find((d) => {
    const at = c.secs + (d.timeEstimateSeconds ?? 0);
    return at >= from && at <= to && (d.timeEstimateSeconds ?? 0) >= a.walkMinutes * 60 - 30;
  });
  if (!next) return { alert: a };
  return { alert: a, next, notifyIn: (next.timeEstimateSeconds ?? 0) - lead };
}

export function describeWindow(a: DepartureAlert) {
  return `${a.from}–${a.to}`;
}

export function departureClock(ms: number, d: Departure) {
  return d.departureTime || formatClock(madridClock(ms).secs + (d.timeEstimateSeconds ?? 0));
}
