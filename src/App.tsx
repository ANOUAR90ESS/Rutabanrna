import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { TopNav, BottomNav } from './components/TopNav';
import { NowView } from './components/now/NowView';
import { TripPlanner, TripRequest } from './components/trip/TripPlanner';
import { AirportPanel } from './components/trip/AirportPanel';
import { LastTrainCard } from './components/now/LastTrainCard';
import { useFavorites, useGeolocation } from './hooks/useUserContext';
import { Router, Journey, journeyGeometry, JourneySegment } from './services/network/router';
import { TransitMap } from './components/TransitMap';
// three.js is heavy: the 3D station view is loaded on demand
const Station3DView = lazy(() => import('./components/station3d/Station3DView').then((m) => ({ default: m.Station3DView })));
import { LineSelector } from './components/LineSelector';
import { DeparturesBoard } from './components/DeparturesBoard';
import { LiveAlertsBanner } from './components/LiveAlertsBanner';
import { LinesSchedulesView } from './components/LinesSchedulesView';
import { ServiceNoticesView } from './components/ServiceNoticesView';
import { LandmarkDetailsModal } from './components/LandmarkDetailsModal';
import { LandmarksExplorerView } from './components/LandmarksExplorerView';
import { OfflineManagerModal } from './components/OfflineManagerModal';
import { OfflineIndicator } from './components/OfflineIndicator';

import { BARCELONA_LANDMARKS } from './data/landmarksData';
import { useNow, useTmbNetwork } from './hooks/useTmbNetwork';
import { NetworkLoadingScreen } from './components/NetworkLoadingScreen';
import {
  TransitType,
  TransitLine,
  LiveVehicle,
  Station,
  Language,
  PointOfInterest,
  OfflinePackageState,
  AppTab,
  Place
} from './types/transit';
import { useDepartureAlerts } from './hooks/useDepartureAlerts';
import { DepartureAlertsView, AlertDraft } from './components/alerts/DepartureAlertsView';
import { AlarmBanner } from './components/alerts/AlarmBanner';
import { madridWeekDay, WeekDay } from './services/departureAlerts';
import { formatClock } from './services/network/clock';
import { getOfflinePackageState, getCachedLandmarks } from './services/offlineStorage';

export default function App() {
  // Official TMB network (GTFS) + live clock
  const networkStatus = useTmbNetwork();
  const network = networkStatus.state === 'ready' ? networkStatus.network : null;
  const now = useNow(1000);
  // Navigation & Localization
  const [activeTab, setActiveTab] = useState<AppTab>('now');
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('barnatransit_lang') as Language | null;
      if (saved && ['es', 'en', 'ca', 'ar'].includes(saved)) return saved;
    } catch {
      // ignore
    }
    const nav = (typeof navigator !== 'undefined' ? navigator.language : 'es').slice(0, 2);
    return (['es', 'en', 'ca', 'ar'].includes(nav) ? nav : 'es') as Language;
  });

  // User context: location, favourites, planner
  const { geo, requestLocation } = useGeolocation();
  const { fav, toggleStar, setHome, setWork } = useFavorites();
  const router = useMemo(() => (network ? new Router(network) : null), [network]);
  const [tripRequest, setTripRequest] = useState<TripRequest | null>(null);
  const [mapJourney, setMapJourney] = useState<{ segments: JourneySegment[]; lineCodes: string[] } | null>(null);

  // Filters & Search
  const [selectedType, setSelectedType] = useState<TransitType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLineCode, setActiveLineCode] = useState<string | null>(null);

  // Selection states
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<LiveVehicle | null>(null);
  const [station3D, setStation3D] = useState<Station | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<PointOfInterest | null>(null);
  const [showLandmarksOnMap, setShowLandmarksOnMap] = useState<boolean>(true);

  // Offline Package Management
  const [offlineState, setOfflineState] = useState<OfflinePackageState>(() => getOfflinePackageState());
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Real TMB lines & stations from the GTFS feed (cached for offline use by the service worker)
  const linesData = useMemo<TransitLine[]>(() => network?.lines ?? [], [network]);
  const stationsData = useMemo<Station[]>(() => network?.stations ?? [], [network]);

  const landmarksData = useMemo(() => {
    if (offlineState.isDownloaded || !isBrowserOnline || offlineState.isSimulatedOffline) {
      return getCachedLandmarks();
    }
    return BARCELONA_LANDMARKS;
  }, [offlineState.isDownloaded, isBrowserOnline, offlineState.isSimulatedOffline]);

  // Live vehicles: positions computed every second from the official timetable
  const vehicles = useMemo<LiveVehicle[]>(() => {
    if (!network) return [];
    return network.vehiclesAt(now);
  }, [network, now]);

  // Service notices derived from the timetable (refreshed once a minute)
  const minuteBucket = Math.floor(now / 60000);
  const serviceNotices = useMemo(
    () => (network ? network.scheduleNotices(minuteBucket * 60000) : []),
    [network, minuteBucket]
  );

  // "Leave now" alerts tied to real departures
  const departureAlerts = useDepartureAlerts(network, now, lang);
  const [alertDraft, setAlertDraft] = useState<AlertDraft | null>(null);
  const openAlertDraft = (d: Omit<AlertDraft, 'nonce'>) => {
    setAlertDraft({ ...d, nonce: Date.now() });
    setActiveTab('alerts');
  };
  const enabledAlerts = departureAlerts.alerts.filter((a) => a.enabled).length;

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

  // Adjust document direction for Arabic
  useEffect(() => {
    try {
      localStorage.setItem('barnatransit_lang', lang);
    } catch {
      // ignore
    }
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // 3D station view: open the station a vehicle is heading to, or a line's first station
  const open3DStation = (s: Station | null | undefined) => {
    setStation3D(s && !s.isBusStop ? s : null);
    setActiveTab('3d');
  };
  const handleOpen3DViewer = (veh: LiveVehicle) => open3DStation(network?.getStation(veh.nextStationId));
  const handleOpen3DViewerForLine = (lineCode: string) => open3DStation(linesData.find((l) => l.code === lineCode)?.stations[0]);

  // Pre-fill an alert for a station
  const handleCreateAlertForStation = (station: Station) => {
    setSelectedStation(null);
    openAlertDraft({ stationId: station.id });
  };

  // "Remind me to leave" from a planned journey: watch its first ride
  const handleRemindJourney = (j: Journey) => {
    if (!network) return;
    const first = j.legs.find((l) => l.kind === 'ride');
    if (!first || first.kind !== 'ride') return;
    const walkBefore = j.legs.slice(0, j.legs.indexOf(first)).reduce((a, l) => a + (l.kind === 'walk' ? l.seconds : 0), 0);
    const day = madridWeekDay(now);
    const weekdays: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
    openAlertDraft({
      stationId: network.stationList(first.from).id,
      lineCode: network.routes[first.route].n,
      headsign: first.headsign,
      from: formatClock(first.dep - 10 * 60),
      to: formatClock(first.dep + 15 * 60),
      walkMinutes: Math.max(1, Math.ceil(walkBefore / 60)),
      leadMinutes: 1,
      days: weekdays.includes(day) ? weekdays : [day]
    });
  };

  // ------------------------------------------------------------ navigation helpers
  const stationPlace = (s: Station): Place => ({ kind: 'station', stationId: s.id, name: s.name });
  const openStationOnMap = useCallback((s: Station) => {
    setMapJourney(null);
    setActiveLineCode(null);
    setSelectedStation(s);
    setActiveTab('map');
  }, []);
  const planTrip = (r: Omit<TripRequest, 'nonce'>) => {
    setTripRequest({ ...r, nonce: Date.now() });
    setActiveTab('trip');
  };
  const goToFavorite = (id?: string) => {
    const s = id && network ? network.getStation(id) : undefined;
    if (s) planTrip({ to: stationPlace(s), mode: 'now' });
  };
  const handleShowJourney = (j: Journey, from: Place, to: Place) => {
    if (!network) return;
    const pt = (p: Place): [number, number] | undefined =>
      p.kind === 'location' ? [p.lat, p.lng] : (() => { const s = network.getStation(p.stationId); return s ? [s.lat, s.lng] : undefined; })();
    setSelectedStation(null);
    setActiveLineCode(null);
    setMapJourney({
      segments: journeyGeometry(network, j, pt(from), pt(to)),
      lineCodes: j.legs.flatMap((l) => (l.kind === 'ride' ? [network.routes[l.route].n] : []))
    });
    setActiveTab('map');
  };

  // Filter lines based on active Line Code
  const displayLines = useMemo(() => {
    if (mapJourney) return linesData.filter((l) => mapJourney.lineCodes.includes(l.code));
    if (!activeLineCode) return linesData;
    return linesData.filter((l) => l.code === activeLineCode);
  }, [activeLineCode, linesData, mapJourney]);

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
        onOpenNewAlert={() => openAlertDraft({})}
        onOpenOfflineManager={() => setIsOfflineModalOpen(true)}
        activeAlertsCount={enabledAlerts}
        isOffline={isOffline}
        isOfflineDownloaded={offlineState.isDownloaded}
      />

      {/* Main View Area */}
      <main className="relative flex-1 w-full h-[calc(100vh-4rem)] overflow-hidden pb-16 lg:pb-0">
        {/* TAB: NOW (home) */}
        {activeTab === 'now' && (
          <NowView
            network={network}
            now={now}
            lang={lang}
            geo={geo}
            onRequestLocation={requestLocation}
            fav={fav}
            onToggleStar={toggleStar}
            onSetHome={setHome}
            onSetWork={setWork}
            notices={serviceNotices}
            onOpenMap={openStationOnMap}
            onRouteFrom={(s) => planTrip({ from: stationPlace(s), to: null })}
            onRouteTo={(s) => planTrip({ to: stationPlace(s) })}
            onRouteToPlace={(p) => planTrip({ to: { kind: 'location', lat: p.lat, lng: p.lng, name: p.name } })}
            onGoHome={() => goToFavorite(fav.home)}
            onGoWork={() => goToFavorite(fav.work)}
            onAirport={() => planTrip({ airport: true })}
            onOpen3D={open3DStation}
            onOpenNotices={() => setActiveTab('notices')}
          >
            {router && (
              <LastTrainCard
                network={network}
                router={router}
                now={now}
                lang={lang}
                geo={geo}
                homeId={fav.home}
                onOpen={() => goToFavorite(fav.home)}
              />
            )}
          </NowView>
        )}

        {/* TAB: TRIP PLANNER */}
        {activeTab === 'trip' && router && (
          <TripPlanner
            network={network}
            router={router}
            now={now}
            lang={lang}
            geo={geo}
            onRequestLocation={requestLocation}
            fav={fav}
            request={tripRequest}
            onShowOnMap={handleShowJourney}
            onRemindMe={handleRemindJourney}
            airportPanel={(apply) => <AirportPanel network={network} lang={lang} homeId={fav.home} apply={apply} />}
          />
        )}

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
              journey={mapJourney?.segments ?? null}
              onClearJourney={() => setMapJourney(null)}
              vehicles={vehicles}
              landmarks={landmarksData}
              showLandmarks={showLandmarksOnMap && !mapJourney}
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
              onCreateAlertForStation={handleCreateAlertForStation}
              onOpen3DStation={open3DStation}
              lang={lang}
            />

            {/* Live Service Notice Ticker */}
            <LiveAlertsBanner
              notices={serviceNotices}
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
          <Suspense fallback={<div className="w-full h-full bg-slate-950" />}>
            <Station3DView network={network} station={station3D} vehicles={vehicles} now={now} lang={lang} onPickStation={(s) => setStation3D(s)} />
          </Suspense>
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
          <DepartureAlertsView
            network={network}
            now={now}
            lang={lang}
            statuses={departureAlerts.statuses}
            draft={alertDraft}
            onAdd={departureAlerts.addAlert}
            onRemove={departureAlerts.removeAlert}
            onToggle={departureAlerts.toggleAlert}
          />
        )}

        {/* TAB 6: SERVICE NOTICES & DISRUPTIONS */}
        {activeTab === 'notices' && (
          <ServiceNoticesView notices={serviceNotices} lang={lang} />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} alertsCount={enabledAlerts} />
      <AlarmBanner fired={departureAlerts.fired} now={now} lang={lang} onDismiss={departureAlerts.dismissFired} />

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






    </div>
  );
}
