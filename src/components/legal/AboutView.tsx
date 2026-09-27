import React from 'react';
import { Database, ShieldCheck, Calculator, Lock } from 'lucide-react';
import type { Language } from '../../types/transit';
import type { TmbNetwork } from '../../services/network/engine';
import { realtimeEnabled } from '../../services/network/realtime';
import { fmt, ui } from '../../i18n/ui';

/** Sources, what is TMB data vs. computed by the app, disclaimer and privacy (TMB reuse licence). */
export const AboutView: React.FC<{ network: TmbNetwork; lang: Language }> = ({ network, lang }) => {
  const t = ui(lang);
  const src = network.sourceInfo;
  const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="text-sm text-slate-300 space-y-1.5">{children}</div>
    </section>
  );
  return (
    <div className="w-full h-full overflow-y-auto bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 space-y-3">
        <h2 className="text-lg font-extrabold text-white">{t.sourcesTab}</h2>
        <p className="text-sm text-slate-300">{t.aboutIntro}</p>
        <Section icon={<Database className="w-4 h-4 text-sky-400" />} title={t.aboutSources}>
          <p>{fmt(t.srcGtfs, src.published, src.validFrom, src.validTo)}</p>
          <p>{fmt(t.srcAccess, src.accessesDate)}</p>
          <p>{realtimeEnabled ? t.srcRealtime : t.srcRealtimeOff}</p>
          <p>{t.srcMap}</p>
          <p>{t.srcGeo}</p>
          <p>
            <a className="text-sky-400 underline" href="https://developer.tmb.cat" target="_blank" rel="noopener noreferrer">
              developer.tmb.cat
            </a>{' '}
            ·{' '}
            <a className="text-sky-400 underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              openstreetmap.org/copyright
            </a>
          </p>
        </Section>
        <Section icon={<Calculator className="w-4 h-4 text-amber-400" />} title={t.aboutHow}>
          <ul className="list-disc ps-5 space-y-1">
            {t.howList.split('|').map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Section>
        <Section icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />} title="TMB">
          <p>{t.aboutWarranty}</p>
        </Section>
        <Section icon={<Lock className="w-4 h-4 text-slate-300" />} title="Privacy">
          <p>{t.aboutPrivacy}</p>
        </Section>
      </div>
    </div>
  );
};
