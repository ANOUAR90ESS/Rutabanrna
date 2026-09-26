import { TransitLine, Station, PointOfInterest, OfflinePackageState, CustomTripAlert } from '../types/transit';
import { BARCELONA_LINES, ALL_BARCELONA_STATIONS } from '../data/barcelonaData';
import { BARCELONA_LANDMARKS } from '../data/landmarksData';

const STORAGE_KEY_OFFLINE_STATE = 'barnatransit_offline_state';
const STORAGE_KEY_LINES = 'barnatransit_cached_lines';
const STORAGE_KEY_STATIONS = 'barnatransit_cached_stations';
const STORAGE_KEY_LANDMARKS = 'barnatransit_cached_landmarks';

export function getOfflinePackageState(): OfflinePackageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OFFLINE_STATE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading offline package state:', e);
  }

  return {
    isDownloaded: false,
    version: '1.2.0-bcn',
    sizeBytes: 0,
    cachedStationsCount: 0,
    cachedLinesCount: 0,
    cachedLandmarksCount: 0,
    isSimulatedOffline: false
  };
}

export function saveOfflinePackageState(state: OfflinePackageState) {
  try {
    localStorage.setItem(STORAGE_KEY_OFFLINE_STATE, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving offline package state:', e);
  }
}

/**
 * Downloads and caches all Barcelona routes, stations, schedules and landmarks
 */
export async function downloadBarcelonaOfflinePack(
  onProgress: (progressPercent: number) => void
): Promise<OfflinePackageState> {
  const steps = [15, 35, 60, 85, 100];

  for (let i = 0; i < steps.length; i++) {
    await new Promise((res) => setTimeout(res, 220));
    onProgress(steps[i]);
  }

  // Cache data into storage
  const linesJson = JSON.stringify(BARCELONA_LINES);
  const stationsJson = JSON.stringify(ALL_BARCELONA_STATIONS);
  const landmarksJson = JSON.stringify(BARCELONA_LANDMARKS);

  localStorage.setItem(STORAGE_KEY_LINES, linesJson);
  localStorage.setItem(STORAGE_KEY_STATIONS, stationsJson);
  localStorage.setItem(STORAGE_KEY_LANDMARKS, landmarksJson);

  // Approximate size calculation
  const totalBytes =
    new Blob([linesJson]).size +
    new Blob([stationsJson]).size +
    new Blob([landmarksJson]).size +
    1400000; // includes vector coordinates and geometries

  const newState: OfflinePackageState = {
    isDownloaded: true,
    downloadDate: Date.now(),
    version: '2026.09.26-BCN',
    sizeBytes: totalBytes,
    cachedStationsCount: ALL_BARCELONA_STATIONS.length,
    cachedLinesCount: BARCELONA_LINES.length,
    cachedLandmarksCount: BARCELONA_LANDMARKS.length,
    isSimulatedOffline: false
  };

  saveOfflinePackageState(newState);
  return newState;
}

/**
 * Retrieves cached lines if offline or falling back to live data
 */
export function getCachedLines(): TransitLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LINES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading cached lines:', e);
  }
  return BARCELONA_LINES;
}

/**
 * Retrieves cached stations
 */
export function getCachedStations(): Station[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATIONS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading cached stations:', e);
  }
  return ALL_BARCELONA_STATIONS;
}

/**
 * Retrieves cached landmarks
 */
export function getCachedLandmarks(): PointOfInterest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LANDMARKS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading cached landmarks:', e);
  }
  return BARCELONA_LANDMARKS;
}

/**
 * Clears offline cache
 */
export function clearOfflineCache(): OfflinePackageState {
  localStorage.removeItem(STORAGE_KEY_LINES);
  localStorage.removeItem(STORAGE_KEY_STATIONS);
  localStorage.removeItem(STORAGE_KEY_LANDMARKS);

  const resetState: OfflinePackageState = {
    isDownloaded: false,
    version: '1.2.0-bcn',
    sizeBytes: 0,
    cachedStationsCount: 0,
    cachedLinesCount: 0,
    cachedLandmarksCount: 0,
    isSimulatedOffline: false
  };

  saveOfflinePackageState(resetState);
  return resetState;
}

/**
 * Toggles offline simulation mode for testing
 */
export function toggleSimulatedOffline(isSimulated: boolean): OfflinePackageState {
  const current = getOfflinePackageState();
  const updated: OfflinePackageState = {
    ...current,
    isSimulatedOffline: isSimulated
  };
  saveOfflinePackageState(updated);
  return updated;
}
