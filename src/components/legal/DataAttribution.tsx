import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import type { Language } from '../../types/transit';
import type { TmbNetwork } from '../../services/network/engine';
import { fmt, ui } from '../../i18n/ui';

/**
 * Source + last-update line required by the TMB reuse licence
 * ("citar la fuente de los contenidos y la fecha de la última actualización").
 */
export const DataAttribution: React.FC<{ network: TmbNetwork; lang: Language; onOpenAbout?: () => void; className?: string }> = ({
  network,
  lang,
  onOpenAbout,
  className = ''
}) => {
  const t = ui(lang);
  const src = network.sourceInfo;
  return (
    <button onClick={onOpenAbout} className={`w-full text-left text-[10px] text-slate-500 hover:text-slate-300 flex items-start gap-1 ${className}`}>
      <Info className="w-3 h-3 shrink-0 mt-px" />
      <span>{fmt(t.attribution, src.published, src.validTo)} · {t.sourcesTab}</span>
    </button>
  );
};

/** Warns when the bundled timetable is about to expire or has expired (avoid showing wrong times as real). */
export const DataStatusBanner: React.FC<{ network: TmbNetwork; now: number; lang: Language }> = ({ network, now, lang }) => {
  const t = ui(lang);
  const st = network.dataStatus(now);
  if (!st.expired && st.daysLeft > 14) return null;
  const src = network.sourceInfo;
  return (
    <div className={`p-3 rounded-2xl border text-xs flex gap-2 ${st.expired ? 'bg-rose-500/10 border-rose-500/40 text-rose-100' : 'bg-amber-500/10 border-amber-500/30 text-amber-100'}`}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      {st.expired ? fmt(t.dataExpired, src.validTo) : fmt(t.dataExpiring, src.validTo, st.daysLeft)}
    </div>
  );
};
