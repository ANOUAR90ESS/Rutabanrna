import React from 'react';
import { MapPin, Globe, Bell, Compass, Train, AlertTriangle, Layers, DownloadCloud, Sliders, Landmark, Clock, Route, Box, MoreHorizontal } from 'lucide-react';
import { AppTab, Language } from '../types/transit';
import { translations } from '../i18n/translations';
import { ui } from '../i18n/ui';

export function navItems(lang: Language, alertsCount = 0) {
  const t = translations[lang];
  const u = ui(lang);
  return [
    { id: 'now' as AppTab, label: u.tabNow, icon: <Clock className="w-4 h-4 text-amber-400" />, primary: true },
    { id: 'trip' as AppTab, label: u.tabTrip, icon: <Route className="w-4 h-4 text-emerald-400" />, primary: true },
    { id: 'map' as AppTab, label: u.tabMap, icon: <Compass className="w-4 h-4 text-sky-400" />, primary: true },
    { id: 'lines' as AppTab, label: u.tabLines, icon: <Layers className="w-4 h-4 text-amber-400" />, primary: true },
    { id: '3d' as AppTab, label: u.view3d, icon: <Box className="w-4 h-4 text-rose-400" /> },
    { id: 'alerts' as AppTab, label: t.myAlerts, icon: <Bell className="w-4 h-4 text-emerald-400" />, badge: alertsCount },
    { id: 'notices' as AppTab, label: t.serviceNotices, icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
    { id: 'landmarks' as AppTab, label: t.landmarks, icon: <Landmark className="w-4 h-4 text-rose-400" /> }
  ];
}

/** Mobile bottom tab bar (the top nav links are hidden below `lg`). */
export const BottomNav: React.FC<{ activeTab: AppTab; setActiveTab: (t: AppTab) => void; lang: Language; alertsCount: number }> = ({
  activeTab,
  setActiveTab,
  lang,
  alertsCount
}) => {
  const [more, setMore] = React.useState(false);
  const items = navItems(lang, alertsCount);
  const primary = items.filter((i) => i.primary);
  const secondary = items.filter((i) => !i.primary);
  const inSecondary = secondary.some((i) => i.id === activeTab);
  return (
    <>
      {more && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMore(false)}>
          <div className="absolute bottom-16 right-2 left-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 grid grid-cols-2 gap-1" onClick={(e) => e.stopPropagation()}>
            {secondary.map((i) => (
              <button
                key={i.id}
                onClick={() => {
                  setActiveTab(i.id);
                  setMore(false);
                }}
                className={`px-3 py-3 rounded-xl flex items-center gap-2 text-sm ${activeTab === i.id ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
              >
                {i.icon}
                <span className="truncate">{i.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {primary.map((i) => (
          <button
            key={i.id}
            onClick={() => setActiveTab(i.id)}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${activeTab === i.id ? 'text-white' : 'text-slate-500'}`}
          >
            {i.icon}
            {i.label}
          </button>
        ))}
        <button
          onClick={() => setMore(!more)}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${inSecondary || more ? 'text-white' : 'text-slate-500'}`}
        >
          <MoreHorizontal className="w-4 h-4" />
          {ui(lang).tabMore}
        </button>
      </nav>
    </>
  );
};

interface TopNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  currentCityName: string;
  onOpenCityModal: () => void;
  onOpenNewAlert: () => void;
  onOpenNotificationSettings: () => void;
  onOpenOfflineManager: () => void;
  activeAlertsCount: number;
  isOffline: boolean;
  isOfflineDownloaded: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  lang,
  setLang,
  currentCityName,
  onOpenCityModal,
  onOpenNewAlert,
  onOpenNotificationSettings,
  onOpenOfflineManager,
  activeAlertsCount,
  isOffline,
  isOfflineDownloaded
}) => {
  const t = translations[lang];

  return (
    <header className="h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 flex items-center justify-between z-30 shrink-0">
      {/* Zone 1: Single text element Brand Zone */}
      <div className="flex items-center gap-3">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('now');
          }}
          className="text-lg lg:text-xl font-extrabold tracking-tight text-white flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 via-amber-500 to-sky-400 p-[1px] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Train className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <span className="font-tech tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            {t.appTitle}
          </span>
        </a>

        {/* City Switcher Trigger */}
        <button
          onClick={onOpenCityModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
        >
          <MapPin className="w-3 h-3 text-rose-400" />
          <span className="max-w-[80px] truncate">{currentCityName}</span>
          <span className="text-[10px] text-emerald-400 ml-0.5 font-mono">LIVE</span>
        </button>
      </div>

      {/* Zone 2: 4-6 Clean Text Nav Links with Active Indicator */}
      <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
        {navItems(lang, activeAlertsCount).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === item.id
                ? 'text-white bg-slate-800/90 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge ? (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] flex items-center justify-center border border-emerald-500/40">
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Zone 3: Primary Actions (Offline Manager, Settings, Language, New Alert) */}
      <div className="flex items-center gap-2">
        {/* Offline Pack Button */}
        <button
          onClick={onOpenOfflineManager}
          title={isOfflineDownloaded ? 'Datos Offline Descargados' : 'Descargar Datos Offline'}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm ${
            isOffline
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              : isOfflineDownloaded
              ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-emerald-400'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <DownloadCloud className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Offline</span>
          {isOfflineDownloaded && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
        </button>

        {/* Notification Settings Button */}
        <button
          onClick={onOpenNotificationSettings}
          title={t.customizeAlerts}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Language Selector Dropdown */}
        <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Language)}
            className="bg-transparent text-xs font-semibold text-slate-200 pr-2 py-1 outline-none cursor-pointer"
          >
            <option value="es" className="bg-slate-900 text-white">Español (ES)</option>
            <option value="en" className="bg-slate-900 text-white">English (EN)</option>
            <option value="ca" className="bg-slate-900 text-white">Català (CA)</option>
            <option value="ar" className="bg-slate-900 text-white">العربية (AR)</option>
          </select>
        </div>

        {/* Create Trip Alert Action Button */}
        <button
          onClick={onOpenNewAlert}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.createAlert}</span>
          <span className="sm:hidden">+</span>
        </button>
      </div>
    </header>
  );
};
