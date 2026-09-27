import React, { useState } from 'react';
import { Plane } from 'lucide-react';
import type { Language, Place } from '../../types/transit';
import type { TmbNetwork } from '../../services/network/engine';
import { formatClock } from '../../services/network/clock';
import { ui } from '../../i18n/ui';
import type { TripRequest } from './TripPlanner';

/**
 * Airport helper: "my flight leaves at 10:40 from T1" → plan arriving 2 h before;
 * "I land at 22:15 at T2" → plan from the terminal ~40 min after landing.
 */
export const AirportPanel: React.FC<{
  network: TmbNetwork;
  lang: Language;
  homeId?: string;
  apply: (r: Omit<TripRequest, 'nonce'>) => void;
}> = ({ network, lang, homeId, apply }) => {
  const t = ui(lang);
  const [dir, setDir] = useState<'to' | 'from'>('to');
  const [term, setTerm] = useState<'T1' | 'T2'>('T1');
  const [time, setTime] = useState('');
  const [day, setDay] = useState<0 | 1>(0);
  const [buffer, setBuffer] = useState(120);

  const terminal = network.stations.find((s) => !s.isBusStop && s.name === `Aeroport ${term}`);
  const home = homeId ? network.getStation(homeId) : undefined;

  const go = () => {
    if (!terminal || !time) return;
    const [hh, mm] = time.split(':').map(Number);
    const base = hh * 3600 + mm * 60;
    const place: Place = { kind: 'station', stationId: terminal.id, name: terminal.name };
    if (dir === 'to') {
      let target = base - buffer * 60;
      let d = day;
      if (target < 0) { target += 86400; d = 0; }
      apply({ to: place, mode: 'arrive', time: formatClock(target), day: d });
    } else {
      const exit = base + 40 * 60; // baggage + walk to the metro
      apply({
        from: place,
        to: home ? { kind: 'station', stationId: home.id, name: home.name } : undefined,
        mode: 'depart',
        time: formatClock(exit),
        day: exit >= 86400 ? 1 : day
      });
    }
  };

  const seg = <T extends string | number>(opts: [T, string][], val: T, set: (v: T) => void) => (
    <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-xs font-semibold">
      {opts.map(([v, l]) => (
        <button key={String(v)} onClick={() => set(v)} className={`px-2.5 py-1.5 rounded-lg ${val === v ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="rounded-2xl bg-sky-500/10 border border-sky-500/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold text-sky-200">
        <Plane className="w-4 h-4" /> {t.airport}
      </div>
      <div className="flex flex-wrap gap-2">
        {seg<'to' | 'from'>([['to', t.toAirport], ['from', t.fromAirport]], dir, setDir)}
        {seg<'T1' | 'T2'>([['T1', 'T1'], ['T2', 'T2']], term, setTerm)}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <label className="flex items-center gap-1.5">
          {dir === 'to' ? t.flightTime : t.landingTime}
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white" />
        </label>
        <select value={day} onChange={(e) => setDay(Number(e.target.value) as 0 | 1)} className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white">
          <option value={0}>{t.today}</option>
          <option value={1}>{t.tomorrow}</option>
        </select>
        {dir === 'to' &&
          seg<number>(
            [
              [90, '1h30'],
              [120, '2h'],
              [180, '3h']
            ],
            buffer,
            setBuffer
          )}
      </div>
      <button onClick={go} disabled={!time} className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white text-sm font-semibold">
        {t.search}
      </button>
    </div>
  );
};
