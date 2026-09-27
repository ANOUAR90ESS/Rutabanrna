import { useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { AppTab, Language } from '../types/transit';
import type { TmbNetwork } from '../services/network/engine';
import type { DepartureAlert } from '../services/departureAlerts';
import { isNative } from './platform';
import { syncNativeAlerts } from './nativeAlerts';

/**
 * Android integration: dark status bar, hardware back button (back to "Now", then exit)
 * and native "leave now" notifications re-planned on start, on alert changes and on resume.
 */
export function useNativeShell(opts: {
  network: TmbNetwork | null;
  alerts: DepartureAlert[];
  lang: Language;
  activeTab: AppTab;
  setActiveTab: (t: AppTab) => void;
  onBack?: () => boolean; // return true when handled (e.g. closing a panel)
}) {
  const { network, alerts, lang, activeTab, setActiveTab, onBack } = opts;
  const tabRef = useRef(activeTab);
  const backRef = useRef(onBack);
  tabRef.current = activeTab;
  backRef.current = onBack;
  const [resumeTick, setResumeTick] = useState(0);

  useEffect(() => {
    if (!isNative) return;
    StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
    StatusBar.setBackgroundColor({ color: '#020617' }).catch(() => undefined);
    const back = CapApp.addListener('backButton', () => {
      if (backRef.current?.()) return;
      if (tabRef.current !== 'now') setActiveTab('now');
      else CapApp.exitApp();
    });
    const resume = CapApp.addListener('resume', () => setResumeTick((x) => x + 1));
    return () => {
      back.then((h) => h.remove());
      resume.then((h) => h.remove());
    };
  }, [setActiveTab]);

  // (Re)schedule native notifications
  useEffect(() => {
    if (!isNative || !network) return;
    const id = setTimeout(() => void syncNativeAlerts(network, alerts, lang), 500);
    return () => clearTimeout(id);
  }, [network, alerts, lang, resumeTick]);

  return { resync: () => setResumeTick((x) => x + 1) };
}
