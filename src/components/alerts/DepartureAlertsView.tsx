import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Plus, Trash2, X, Footprints } from 'lucide-react';
import type { Language, Station } from '../../types/transit';
import type { TmbNetwork } from '../../services/network/engine';
import { AlertStatus, DepartureAlert, WEEK, WeekDay, departureClock } from '../../services/departureAlerts';
import { fmt, ui } from '../../i18n/ui';
import { LineBadge, StationSearch } from '../now/shared';

export type AlertDraft = Partial<Omit<DepartureAlert, 'id' | 'createdAt' | 'enabled'>> & { nonce: number };

const DAY_LABEL: Record<Language, Record<WeekDay, string>> = {
  es: { mon: 'L', tue: 'M', wed: 'X', thu: 'J', fri: 'V', sat: 'S', sun: 'D' },
  ca: { mon: 'Dl', tue: 'Dt', wed: 'Dc', thu: 'Dj', fri: 'Dv', sat: 'Ds', sun: 'Dg' },
  en: { mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S' },
  ar: { mon: 'ن', tue: 'ث', wed: 'ر', thu: 'خ', fri: 'ج', sat: 'س', sun: 'ح' }
};

export const DepartureAlertsView: React.FC<{
  network: TmbNetwork;
  now: number;
  lang: Language;
  statuses: AlertStatus[];
  draft: AlertDraft | null;
  onAdd: (a: DepartureAlert) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}> = ({ network, now, lang, statuses, draft, onAdd, onRemove, onToggle }) => {
  const t = ui(lang);
  const [creating, setCreating] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );

  useEffect(() => {
    if (draft) setCreating(true);
  }, [draft?.nonce]);

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" /> {t.alertSaveTrip}
          </h2>
          {!creating && (
            <button onClick={() => setCreating(true)} className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {perm === 'default' && (
          <button
            onClick={() => Notification.requestPermission().then(setPerm)}
            className="w-full p-3 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 text-sm font-semibold flex items-center gap-2"
          >
            <BellRing className="w-4 h-4" /> {t.enableNotifications}
          </button>
        )}

        {creating && (
          <AlertForm
            key={draft?.nonce ?? 'new'}
            network={network}
            now={now}
            lang={lang}
            draft={draft}
            onCancel={() => setCreating(false)}
            onSave={(a) => {
              onAdd(a);
              setCreating(false);
            }}
          />
        )}

        {statuses.length === 0 && !creating && (
          <p className="text-sm text-slate-400 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">{t.alertsEmpty}</p>
        )}

        {statuses.map(({ alert: a, next, notifyIn }) => {
          const line = network.lines[network.lineIndexByCode.get(a.lineCode) ?? -1];
          return (
            <div key={a.id} className={`rounded-2xl border p-3 ${a.enabled ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-950 border-slate-800 opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <LineBadge code={a.lineCode} line={line} />
                    <span className="text-sm font-bold text-white truncate">→ {a.headsign}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {a.stationName} · {a.from}–{a.to} · <Footprints className="inline w-3 h-3" /> {a.walkMinutes} {t.min}
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {WEEK.map((d) => (
                      <span key={d} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${a.days.includes(d) ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-800 text-slate-600'}`}>
                        {DAY_LABEL[lang][d]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onToggle(a.id)} className={`w-10 h-6 rounded-full p-0.5 transition-colors ${a.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${a.enabled ? 'translate-x-4' : ''}`} />
                  </button>
                  <button onClick={() => onRemove(a.id)} className="p-1.5 text-slate-500 hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {a.enabled && (
                <div className="mt-2 text-xs font-semibold">
                  {next && notifyIn !== undefined ? (
                    <span className={notifyIn <= 0 ? 'text-amber-300' : 'text-emerald-300'}>
                      {notifyIn <= 0 ? t.alertLeave : fmt(t.alertNext, `${Math.ceil(notifyIn / 60)} ${t.min}`)} · {a.lineCode} {departureClock(now, next)}
                    </span>
                  ) : (
                    <span className="text-slate-500">{t.alertNone}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AlertForm: React.FC<{
  network: TmbNetwork;
  now: number;
  lang: Language;
  draft: AlertDraft | null;
  onSave: (a: DepartureAlert) => void;
  onCancel: () => void;
}> = ({ network, lang, draft, onSave, onCancel }) => {
  const t = ui(lang);
  const [station, setStation] = useState<Station | undefined>(() => (draft?.stationId ? network.getStation(draft.stationId) : undefined));
  const dirs = useMemo(() => (station ? network.directionsAt(station.id) : []), [network, station]);
  const [dir, setDir] = useState(draft?.lineCode && draft?.headsign ? `${draft.lineCode}|${draft.headsign}` : '');
  const [from, setFrom] = useState(draft?.from ?? '08:00');
  const [to, setTo] = useState(draft?.to ?? '09:00');
  const [walk, setWalk] = useState(draft?.walkMinutes ?? 5);
  const [lead, setLead] = useState(draft?.leadMinutes ?? 1);
  const [days, setDays] = useState<WeekDay[]>(draft?.days ?? ['mon', 'tue', 'wed', 'thu', 'fri']);

  useEffect(() => {
    if (dirs.length && !dirs.some((d) => `${d.lineCode}|${d.headsign}` === dir)) setDir(`${dirs[0].lineCode}|${dirs[0].headsign}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirs]);

  const save = () => {
    if (!station || !dir) return;
    const [lineCode, headsign] = dir.split('|');
    onSave({
      id: `da-${Date.now()}`,
      stationId: station.id,
      stationName: station.name,
      lineCode,
      headsign,
      from,
      to,
      walkMinutes: walk,
      leadMinutes: lead,
      days,
      enabled: true,
      createdAt: Date.now()
    });
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">{t.alertSaveTrip}</span>
        <button onClick={onCancel} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      {station ? (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white">
          {station.name}
          <button onClick={() => setStation(undefined)} className="text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <StationSearch network={network} lang={lang} onPick={setStation} autoFocus />
      )}
      {station && (
        <label className="block text-xs text-slate-400 space-y-1">
          {t.alertDirection}
          <select value={dir} onChange={(e) => setDir(e.target.value)} className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white">
            {dirs.map((d) => (
              <option key={`${d.lineCode}|${d.headsign}`} value={`${d.lineCode}|${d.headsign}`}>
                {d.lineCode} → {d.headsign}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-wrap items-end gap-3 text-xs text-slate-400">
        <label className="space-y-1">
          <div>{t.alertWindow}</div>
          <div className="flex items-center gap-1">
            <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white" />
            –
            <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className="px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white" />
          </div>
        </label>
        <label className="space-y-1">
          <div>{t.alertWalk}</div>
          <input type="number" min={0} max={60} value={walk} onChange={(e) => setWalk(Math.max(0, Number(e.target.value)))} className="w-20 px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white" />
        </label>
        <label className="space-y-1">
          <div>{t.alertMargin}</div>
          <input type="number" min={0} max={30} value={lead} onChange={(e) => setLead(Math.max(0, Number(e.target.value)))} className="w-16 px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white" />
        </label>
      </div>
      <div className="flex gap-1">
        {WEEK.map((d) => (
          <button
            key={d}
            onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}
            className={`w-8 h-8 rounded-lg text-xs font-bold ${days.includes(d) ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}
          >
            {DAY_LABEL[lang][d]}
          </button>
        ))}
      </div>
      <button onClick={save} disabled={!station || !dir || !days.length} className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-sm font-bold">
        {t.save}
      </button>
    </div>
  );
};
