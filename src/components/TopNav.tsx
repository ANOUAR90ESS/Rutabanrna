import React from 'react';
import { MapPin, Globe, Bell, Compass, Train, AlertTriangle, Layers, DownloadCloud, Sliders, Landmark } from 'lucide-react';
import { Language } from '../types/transit';
import { translations } from '../i18n/translations';

interface TopNavProps {
  activeTab: 'map' | '3d' | 'landmarks' | 'lines' | 'alerts' | 'notices';
  setActiveTab: (tab: 'map' | '3d' | 'landmarks' | 'lines' | 'alerts' | 'notices') => void;
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
            setActiveTab('map');
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
        <button
          onClick={() => setActiveTab('map')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'map'
              ? 'text-white bg-slate-800/90 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Compass className="w-4 h-4 text-sky-400" />
          <span>{t.liveMap}</span>
        </button>

        <button
          onClick={() => setActiveTab('3d')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === '3d'
              ? 'text-white bg-slate-800/90 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <div className="w-4 h-4 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px]">
            3D
          </div>
          <span>{t.view3D}</span>
        </button>

        <button
          onClick={() => setActiveTab('landmarks')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'landmarks'
              ? 'text-white bg-slate-800/90 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Landmark className="w-4 h-4 text-rose-400" />
          <span>{t.landmarks}</span>
        </button>

        <button
          onClick={() => setActiveTab('lines')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'lines'
              ? 'text-white bg-slate-800/90 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span>{t.linesSchedules}</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'alerts'
              ? 'text-white bg-slate-800/90 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-400" />
          <span>{t.myAlerts}</span>
          {activeAlertsCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] flex items-center justify-center border border-emerald-500/40">
              {activeAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('notices')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'notices'
              ? 'text-white bg-slate-800/90 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="hidden xl:inline">{t.serviceNotices}</span>
          <span className="xl:hidden">Avisos</span>
        </button>
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
