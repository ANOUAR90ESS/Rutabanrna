import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TopNav } from './components/TopNav';
import { TransitMap } from './components/TransitMap';
import { ThreeTrainViewer } from './components/ThreeTrainViewer';
import { LineSelector } from './components/LineSelector';
import { DeparturesBoard } from './components/DeparturesBoard';
import { TripAlertsModal } from './components/TripAlertsModal';
import { LiveAlertsBanner } from './components/LiveAlertsBanner';
import { CitySwitcherModal } from './components/CitySwitcherModal';
import { LinesSchedulesView } from './components/LinesSchedulesView';
import { AlertsManagerView } from './components/AlertsManagerView';
import { ServiceNoticesView } from './components/ServiceNoticesView';
import { LandmarkDetailsModal } from './components/LandmarkDetailsModal';
import { LandmarksExplorerView } from './components/LandmarksExplorerView';
import { OfflineManagerModal } from './components/OfflineManagerModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';

import { BARCELONA_LANDMARKS } from './data/landmarksData';
import { useNow, useTmbNetwork } from './hooks/useTmbNetwork';
import { NetworkLoadingScreen } from './components/NetworkLoadingScreen';
import { CITIES } from './data/cities';
import {
  TransitType,
  TransitLine,
  LiveVehicle,
  Station,
  CustomTripAlert,
  Language,
  City,
  PointOfInterest,
  NotificationPreferences,
  OfflinePackageState
} from './types/transit';
import { playAlertNotificationSound } from './utils/sound';
import { getOfflinePackageState, getCachedLandmarks } from './services/offlineStorage';

export default function App() {
  // Official TMB network (GTFS) + live clock
  const networkStatus = useTmbNetwork();
  const network = networkStatus.state === 'ready' ? networkStatus.network : null;
  const now = useNow(1000);
  // Navigation & Localization
  const [activeTab, setActiveTab] = useState<'map' | '3d' | 'landmarks' | 'lines' | 'alerts' | 'notices'>('map');
  const [lang, setLang] = useState<Language>('es');
  const [selectedCity, setSelectedCity] = useState<City>(CITIES[0]);
  const [isCityModalOpen, setIsCityModalOpen] = useState<boolean>(false);

  // Filters & Search
  const [selectedType, setSelectedType] = useState<TransitType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLineCode, setActiveLineCode] = useState<string | null>(null);

  // Selection states
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<LiveVehicle | null>(null);
  const [viewer3DVehicle, setViewer3DVehicle] = useState<LiveVehicle | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<PointOfInterest | null>(null);
  const [showLandmarksOnMap, setShowLandmarksOnMap] = useState<boolean>(true);

  // Offline Package Management
  const [offlineState, setOfflineState] = useState<OfflinePackageState>(() => getOfflinePackageState());
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Notification Preferences
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(() => {
    try {
      const stored = localStorage.getItem('barnatransit_notif_prefs');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return {
      enableArrivalAlerts: true,
      enableDelayAlerts: true,
      delayThresholdMinutes: 2,
      enableDisruptions: true,
      enableSound: true,
      enablePushNotifications: false,
      subscribedLineCodes: ['L1', 'L3', 'L5', 'H12'],
      timeFilterEnabled: false,
      activeStartTime: '07:00',
      activeEndTime: '22:00'
    };
  });
  const [isNotifSettingsOpen, setIsNotifSettingsOpen] = useState<boolean>(false);

  // Real TMB lines & stations from the GTFS feed (cached for offline use by the service worker)
  const linesData = useMemo<TransitLine[]>(() => network?.lines ?? [], [network]);
  const stationsData = useMemo<Station[]>(() => network?.stations ?? [], [network]);

  const landmarksData = useMemo(() => {
    if (offlineState.isDownloaded || !isBrowserOnline || offlineState.isSimulatedOffline) {
      return getCachedLandmarks();
    }
    return BARCELONA_LANDMARKS;
  }, [offlineState.isDownloaded, isBrowserOnline, offlineState.isSimulatedOffline]);

  // Test incidents injected from the notification settings (lineCode -> delay minutes)
  const [testIncidents, setTestIncidents] = useState<Record<string, number>>({});

  // Live vehicles: positions computed every second from the official timetable
  const vehicles = useMemo<LiveVehicle[]>(() => {
    if (!network) return [];
    const list = network.vehiclesAt(now);
    if (!Object.keys(testIncidents).length) return list;
    return list.map((v) =>
      testIncidents[v.lineCode] ? { ...v, delayMinutes: testIncidents[v.lineCode], isDelayed: true } : v
    );
  }, [network, now, testIncidents]);

  // Service notices derived from the timetable (refreshed once a minute)
  const minuteBucket = Math.floor(now / 60000);
  const serviceNotices = useMemo(
    () => (network ? network.scheduleNotices(minuteBucket * 60000) : []),
    [network, minuteBucket]
  );

  // User Custom Trip Alerts (persisted in localStorage)
  const [alerts, setAlerts] = useState<CustomTripAlert[]>(() => {
    try {
      const stored = localStorage.getItem('barnatransit_alerts');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [
      {
        id: 'alert-default-01',
        title: 'Metro L1 hacia Fondo',
        lineCode: 'L1',
        type: 'metro',
        originStationId: '1.126',
        originStationName: 'Catalunya',
        destinationStationId: '1.140',
        destinationStationName: 'Fondo',
        targetTime: '08:45',
        notifyMinutesBefore: 10,
        notifyOnDelay: true,
        enabled: true,
        soundEnabled: true,
        repeatDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        createdAt: Date.now()
      },
      {
        id: 'alert-default-02',
        title: 'Metro L3 a Zona Universitària',
        lineCode: 'L3',
        type: 'metro',
        originStationId: '1.319',
        originStationName: 'Sants Estació',
        destinationStationId: '1.314',
        destinationStationName: 'Zona Universitària',
        targetTime: '18:15',
        notifyMinutesBefore: 5,
        notifyOnDelay: true,
        enabled: true,
        soundEnabled: true,
        repeatDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        createdAt: Date.now() - 3600000
      }
    ];
  });

  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [activeTripAlarm, setActiveTripAlarm] = useState<CustomTripAlert | null>(null);

  // Online / Offline browser event tracking
  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persist alerts & notification preferences
  useEffect(() => {
    try {
      localStorage.setItem('barnatransit_alerts', JSON.stringify(alerts));
    } catch {
      // ignore
    }
  }, [alerts]);

  useEffect(() => {
    try {
      localStorage.setItem('barnatransit_notif_prefs', JSON.stringify(notificationPreferences));
    } catch {
      // ignore
    }
  }, [notificationPreferences]);

  // Adjust document direction for Arabic
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Periodic Check for Custom User Alerts & Notification Preferences Filter
  useEffect(() => {
    const alertChecker = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      // Check time window filter
      if (notificationPreferences.timeFilterEnabled) {
        if (
          currentTimeStr < notificationPreferences.activeStartTime ||
          currentTimeStr > notificationPreferences.activeEndTime
        ) {
          return;
        }
      }

      // Check if any active alert matches
      alerts.forEach((alert) => {
        if (!alert.enabled) return;

        // Line filter check
        if (
          notificationPreferences.subscribedLineCodes.length > 0 &&
          !notificationPreferences.subscribedLineCodes.includes(alert.lineCode)
        ) {
          return;
        }

        if (alert.targetTime === currentTimeStr && !activeTripAlarm) {
          setActiveTripAlarm(alert);
          if (alert.soundEnabled && notificationPreferences.enableSound) {
            playAlertNotificationSound();
          }
        }
      });
    }, 8000);

    return () => clearInterval(alertChecker);
  }, [alerts, activeTripAlarm, notificationPreferences]);

  // Trigger simulated delay incident for testing
  const handleTriggerTestIncident = (lineCode: string, delayMinutes: number) => {
    setTestIncidents((prev) => ({ ...prev, [lineCode]: delayMinutes }));

    const testAlert: CustomTripAlert = {
      id: `incident-alert-${Date.now()}`,
      title: `Incidencia en ${lineCode}: Retraso estimado de ${delayMinutes} min`,
      lineCode,
      type: linesData.find((l) => l.code === lineCode)?.type ?? 'metro',
      originStationId: '',
      originStationName: linesData.find((l) => l.code === lineCode)?.origin ?? '',
      destinationStationId: '',
      destinationStationName: linesData.find((l) => l.code === lineCode)?.destination ?? 'Dirección Línea',
      targetTime: 'Ahora',
      notifyMinutesBefore: 0,
      notifyOnDelay: true,
      enabled: true,
      soundEnabled: notificationPreferences.enableSound,
      repeatDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      createdAt: Date.now()
    };

    setActiveTripAlarm(testAlert);
    if (notificationPreferences.enableSound) {
      playAlertNotificationSound();
    }
  };

  // Alert Handlers
  const handleSaveAlert = (newAlert: CustomTripAlert) => {
    setAlerts((prev) => [newAlert, ...prev]);
  };

  const handleDeleteAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleToggleAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, enabled: !a.enabled } : a))
    );
  };

  // Open 3D viewer for a specific vehicle or line
  const handleOpen3DViewer = (veh: LiveVehicle) => {
    setViewer3DVehicle(veh);
    setActiveTab('3d');
  };

  const handleOpen3DViewerForLine = (lineCode: string) => {
    const veh = vehicles.find((v) => v.lineCode === lineCode) || vehicles[0] || null;
    setViewer3DVehicle(veh);
    setActiveTab('3d');
  };

  // Pre-fill alert modal for a station
  const handleCreateAlertForStation = (station: Station, lineCode: string) => {
    setSelectedStation(null);
    setIsAlertModalOpen(true);
  };

  // Filter lines based on active Line Code
  const displayLines = useMemo(() => {
    if (!activeLineCode) return linesData;
    return linesData.filter((l) => l.code === activeLineCode);
  }, [activeLineCode, linesData]);

  const isOffline = !isBrowserOnline || offlineState.isSimulatedOffline;

  if (!network) {
    return <NetworkLoadingScreen status={networkStatus} lang={lang} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Universal Top Navigation */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        currentCityName={selectedCity.name[lang]}
        onOpenCityModal={() => setIsCityModalOpen(true)}
        onOpenNewAlert={() => setIsAlertModalOpen(true)}
        onOpenNotificationSettings={() => setIsNotifSettingsOpen(true)}
        onOpenOfflineManager={() => setIsOfflineModalOpen(true)}
        activeAlertsCount={alerts.filter((a) => a.enabled).length}
        isOffline={isOffline}
        isOfflineDownloaded={offlineState.isDownloaded}
      />

      {/* Main View Area */}
      <main className="relative flex-1 w-full h-[calc(100vh-4rem)] overflow-hidden">
        {/* TAB 1: INTERACTIVE LIVE MAP */}
        {activeTab === 'map' && (
          <div className="relative w-full h-full">
            {/* Search & Line/Type Filters */}
            <LineSelector
              selectedType={selectedType}
              onSelectType={setSelectedType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalVehicles={vehicles.length}
              lines={linesData}
              activeLineCode={activeLineCode}
              onSelectLineCode={setActiveLineCode}
              lang={lang}
            />

            {/* Leaflet Map Canvas with Landmarks & Offline Handling */}
            <TransitMap
              lines={displayLines}
              stations={stationsData}
              vehicles={vehicles}
              landmarks={landmarksData}
              showLandmarks={showLandmarksOnMap}
              onToggleLandmarks={() => setShowLandmarksOnMap(!showLandmarksOnMap)}
              selectedType={selectedType}
              searchQuery={searchQuery}
              selectedStation={selectedStation}
              selectedVehicle={selectedVehicle}
              onSelectStation={(st) => setSelectedStation(st)}
              onSelectVehicle={(veh) => setSelectedVehicle(veh)}
              onSelectLandmark={(landmark) => setSelectedLandmark(landmark)}
              onOpen3DViewer={handleOpen3DViewer}
              isOffline={isOffline}
              lang={lang}
            />

            {/* Station Departures Board (when a station is clicked) */}
            <DeparturesBoard
              station={selectedStation}
              network={network}
              now={now}
              lines={linesData}
              vehicles={vehicles}
              onClose={() => setSelectedStation(null)}
              onOpen3DViewer={handleOpen3DViewer}
              onCreateAlertForStation={handleCreateAlertForStation}
              lang={lang}
            />

            {/* Live Service Notice Ticker */}
            <LiveAlertsBanner
              notices={serviceNotices}
              activeTripAlarm={activeTripAlarm}
              onDismissAlarm={() => setActiveTripAlarm(null)}
              onOpen3DViewerForLine={handleOpen3DViewerForLine}
              lang={lang}
            />

            {/* Offline Status Pill (bottom-left) */}
            <OfflineIndicator
              offlineState={offlineState}
              onOpenOfflineManager={() => setIsOfflineModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 2: FULL-SCREEN 3D TRAIN & METRO VIEWER */}
        {activeTab === '3d' && (
          <div className="w-full h-full">
            <ThreeTrainViewer
              vehicle={(viewer3DVehicle && vehicles.find((v) => v.id === viewer3DVehicle.id)) || viewer3DVehicle || vehicles[0]}
              onClose={() => setActiveTab('map')}
              lang={lang}
            />
          </div>
        )}

        {/* TAB 3: BARCELONA TOURIST ATTRACTIONS & LANDMARKS */}
        {activeTab === 'landmarks' && (
          <LandmarksExplorerView
            onSelectLandmark={(lm) => setSelectedLandmark(lm)}
            onLocateOnMap={(lat, lng) => {
              setActiveTab('map');
              setSelectedStation({
                id: 'st-temp-loc',
                name: 'Ubicación seleccionada',
                lat,
                lng,
                lines: []
              });
            }}
            lines={linesData}
            lang={lang}
          />
        )}

        {/* TAB 4: LINES & TIMETABLES BROWSER */}
        {activeTab === 'lines' && (
          <LinesSchedulesView
            lines={linesData}
            onSelectLineOnMap={(line) => {
              setActiveLineCode(line.code);
              setActiveTab('map');
            }}
            onOpen3DViewerForLine={handleOpen3DViewerForLine}
            vehicles={vehicles}
            lang={lang}
          />
        )}

        {/* TAB 5: MY ALERTS COMMUTE MANAGER */}
        {activeTab === 'alerts' && (
          <AlertsManagerView
            alerts={alerts}
            onOpenCreateModal={() => setIsAlertModalOpen(true)}
            onToggleAlert={handleToggleAlert}
            onDeleteAlert={handleDeleteAlert}
            lines={linesData}
            lang={lang}
          />
        )}

        {/* TAB 6: SERVICE NOTICES & DISRUPTIONS */}
        {activeTab === 'notices' && (
          <ServiceNoticesView notices={serviceNotices} lang={lang} />
        )}
      </main>

      {/* Modal: Tourist Landmark Detailed Inspector */}
      <LandmarkDetailsModal
        landmark={selectedLandmark}
        onClose={() => setSelectedLandmark(null)}
        onViewStation={(stId) => {
          // Landmarks keep legacy ids; fall back to the nearest real TMB metro station.
          const st =
            stationsData.find((s) => s.id === stId) ||
            (selectedLandmark ? network.nearestStation(selectedLandmark.lat, selectedLandmark.lng, { metroOnly: true }) : null);
          if (st) {
            setSelectedStation(st);
            setActiveTab('map');
          }
        }}
        onCenterOnMap={(lat, lng) => {
          setActiveTab('map');
          setSelectedStation({
            id: 'st-temp-poi',
            name: selectedLandmark?.name[lang] || 'Punto de Interés',
            lat,
            lng,
            lines: selectedLandmark?.connectedLines || []
          });
        }}
        lines={linesData}
        lang={lang}
      />

      {/* Modal: Offline Data Package Manager */}
      <OfflineManagerModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        offlineState={offlineState}
        onStateChange={(updated) => setOfflineState(updated)}
        lang={lang}
      />

      {/* Modal: Notification Customization & Preferences */}
      <NotificationSettingsModal
        isOpen={isNotifSettingsOpen}
        onClose={() => setIsNotifSettingsOpen(false)}
        preferences={notificationPreferences}
        onSavePreferences={(updated) => setNotificationPreferences(updated)}
        onTriggerTestIncident={handleTriggerTestIncident}
        lines={linesData}
        lang={lang}
      />

      {/* Modal: Create or Manage Custom Trip Alerts */}
      <TripAlertsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        alerts={alerts}
        onSaveAlert={handleSaveAlert}
        onDeleteAlert={handleDeleteAlert}
        onToggleAlert={handleToggleAlert}
        lines={linesData}
        stations={stationsData}
        lang={lang}
      />

      {/* Modal: City Switcher (Barcelona -> Madrid / Valencia / Sevilla) */}
      <CitySwitcherModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={(city) => setSelectedCity(city)}
        lang={lang}
      />
    </div>
  );
}
