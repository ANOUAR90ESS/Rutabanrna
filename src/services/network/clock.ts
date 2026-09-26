/** Barcelona wall-clock helpers. GTFS times are local (Europe/Madrid) regardless of the device timezone. */

export interface MadridClock {
  ymd: string;   // service date YYYYMMDD
  prev: string;  // previous date (its trips can run past midnight)
  secs: number;  // seconds since local midnight
  ms: number;
}

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

const pad = (n: number) => String(n).padStart(2, '0');

let cachedOffset = 0;
let cachedAt = -Infinity;

export function ymdShift(ymd: string, days: number): string {
  const d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)) + days * 86400000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

export function madridClock(ms: number = Date.now()): MadridClock {
  // Recompute the UTC offset at most once a minute (handles DST changes).
  if (Math.abs(ms - cachedAt) > 60000) {
    const p: Record<string, string> = {};
    fmt.formatToParts(new Date(ms)).forEach((x) => (p[x.type] = x.value));
    cachedOffset =
      Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
    cachedAt = ms;
  }
  const d = new Date(ms + cachedOffset);
  const ymd = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  const secs = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds() + d.getUTCMilliseconds() / 1000;
  return { ymd, prev: ymdShift(ymd, -1), secs, ms };
}

/** Seconds after midnight → "HH:MM" (wraps past 24h). */
export function formatClock(sec: number): string {
  const s = ((Math.round(sec) % 86400) + 86400) % 86400;
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}`;
}

export function formatYmd(ymd: string): string {
  return `${ymd.slice(6, 8)}/${ymd.slice(4, 6)}/${ymd.slice(0, 4)}`;
}
