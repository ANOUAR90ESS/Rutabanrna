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

import {
  BARCELONA_LINES,
  INITIAL_VEHICLES,
  SERVICE_NOTICES,
  ALL_BARCELONA_STATIONS
} from './data/barcelonaData';
import { BARCELONA_LANDMARKS } from './data/landmarksData';
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
import {
  getOfflinePackageState,
  getCachedLines,
  getCachedStations,
  getCachedLandmarks
} from './services/offlineStorage';

export default function App() {
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
      subscribedLineCodes: ['L1', 'L3', 'R1', 'R2 Nord', 'H12'],
      timeFilterEnabled: false,
      activeStartTime: '07:00',
      activeEndTime: '22:00'
    };
  });
  const [isNotifSettingsOpen, setIsNotifSettingsOpen] = useState<boolean>(false);

  // Data (switches automatically to cached data when offline pack is used)
  const linesData = useMemo(() => {
    if (offlineState.isDownloaded || !isBrowserOnline || offlineState.isSimulatedOffline) {
      return getCachedLines();
    }
    return BARCELONA_LINES;
  }, [offlineState.isDownloaded, isBrowserOnline, offlineState.isSimulatedOffline]);

  const stationsData = useMemo(() => {
    if (offlineState.isDownloaded || !isBrowserOnline || offlineState.isSimulatedOffline) {
      return getCachedStations();
    }
    return ALL_BARCELONA_STATIONS;
  }, [offlineState.isDownloaded, isBrowserOnline, offlineState.isSimulatedOffline]);

  const landmarksData = useMemo(() => {
    if (offlineState.isDownloaded || !isBrowserOnline || offlineState.isSimulatedOffline) {
      return getCachedLandmarks();
    }
    return BARCELONA_LANDMARKS;
  }, [offlineState.isDownloaded, isBrowserOnline, offlineState.isSimulatedOffline]);

  // Live vehicles state
  const [vehicles, setVehicles] = useState<LiveVehicle[]>(INITIAL_VEHICLES);

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
        title: 'Tren R1 hacia Mataró',
        lineCode: 'R1',
        type: 'train',
        originStationId: 'st-catalunya',
        originStationName: 'Plaça de Catalunya',
        destinationStationId: 'st-mataro',
        destinationStationName: 'Mataró Estació',
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
        title: 'Metro L3 a Universitària',
        lineCode: 'L3',
        type: 'metro',
        originStationId: 'st-sants-estacio',
        originStationName: 'Sants Estació',
        destinationStationId: 'st-zona-univ',
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

  // Live Vehicle Movement Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles((prevVehicles) =>
        prevVehicles.map((veh) => {
          const line = linesData.find((l) => l.code === veh.lineCode);
          if (!line || line.pathCoordinates.length < 2) return veh;

          // Advance vehicle progress
          let newProgress = veh.progressAlongRoute + 0.0035;
          let newDirection = veh.direction;

          if (newProgress >= 1) {
            newProgress = 0.99;
            newDirection = 'inbound';
          } else if (newProgress <= 0) {
            newProgress = 0.01;
            newDirection = 'outbound';
          }

          // Interpolate GPS lat/lng along path
          const coords = line.pathCoordinates;
          const totalPoints = coords.length;
          const segmentIndex = Math.min(
            totalPoints - 2,
            Math.max(0, Math.floor(newProgress * (totalPoints - 1)))
          );
          const segmentFraction = (newProgress * (totalPoints - 1)) - segmentIndex;

          const p1 = coords[segmentIndex];
          const p2 = coords[segmentIndex + 1];

          const newLat = p1[0] + (p2[0] - p1[0]) * segmentFraction;
          const newLng = p1[1] + (p2[1] - p1[1]) * segmentFraction;

          // Next station lookup
          const nextSt = line.stations[Math.min(line.stations.length - 1, segmentIndex + 1)];

          return {
            ...veh,
            lat: newLat,
            lng: newLng,
            progressAlongRoute: newProgress,
            direction: newDirection,
            nextStationId: nextSt ? nextSt.id : veh.nextStationId,
            nextStationName: nextSt ? nextSt.name : veh.nextStationName,
            etaMinutes: Math.max(1, Math.round((1 - segmentFraction) * 4))
          };
        })
      );
    }, 1200);

    return () => clearInterval(interval);
  }, [linesData]);

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
    setVehicles((prev) =>
      prev.map((v) =>
        v.lineCode === lineCode
          ? { ...v, delayMinutes, isDelayed: true }
          : v
      )
    );

    const testAlert: CustomTripAlert = {
      id: `incident-alert-${Date.now()}`,
      title: `Incidencia en ${lineCode}: Retraso estimado de ${delayMinutes} min`,
      lineCode,
      type: lineCode.startsWith('L') ? 'metro' : lineCode.startsWith('H') || lineCode.startsWith('V') ? 'bus' : 'train',
      originStationId: 'st-catalunya',
      originStationName: 'Plaça de Catalunya',
      destinationStationId: 'st-mataro',
      destinationStationName: 'Dirección Línea',
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
    const veh = vehicles.find((v) => v.lineCode === lineCode) || vehicles[0];
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
              lines={linesData}
              vehicles={vehicles}
              onClose={() => setSelectedStation(null)}
              onOpen3DViewer={handleOpen3DViewer}
              onCreateAlertForStation={handleCreateAlertForStation}
              lang={lang}
            />

            {/* Live Service Notice Ticker */}
            <LiveAlertsBanner
              notices={SERVICE_NOTICES}
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
              vehicle={viewer3DVehicle || vehicles[0]}
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
          <ServiceNoticesView notices={SERVICE_NOTICES} lang={lang} />
        )}
      </main>

      {/* Modal: Tourist Landmark Detailed Inspector */}
      <LandmarkDetailsModal
        landmark={selectedLandmark}
        onClose={() => setSelectedLandmark(null)}
        onViewStation={(stId) => {
          const st = stationsData.find((s) => s.id === stId);
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
