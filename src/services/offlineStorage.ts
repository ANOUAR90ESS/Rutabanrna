import { PointOfInterest, OfflinePackageState } from '../types/transit';
import { BARCELONA_LANDMARKS } from '../data/landmarksData';
import { NETWORK_URL } from './network/engine';
import type { RawNetwork } from './network/types';

/** Cache Storage bucket shared with public/sw.js */
export const OFFLINE_CACHE = 'tmb-network-data';

const STORAGE_KEY_OFFLINE_STATE = 'barnatransit_offline_state';
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
    version: '-',
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
 * Downloads the official TMB network (GTFS: lines, stops, shapes and full timetable)
 * into Cache Storage so schedules and live positions keep working without connection.
 */
export async function downloadBarcelonaOfflinePack(
  onProgress: (progressPercent: number) => void
): Promise<OfflinePackageState> {
  onProgress(2);
  const res = await fetch(NETWORK_URL, { cache: 'no-cache' });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(total ? Math.min(95, Math.round((received / total) * 95)) : Math.min(95, 5 + chunks.length));
  }
  const blob = new Blob(chunks as BlobPart[], { type: 'application/json' });
  const raw = JSON.parse(await blob.text()) as RawNetwork;

  if (typeof caches !== 'undefined') {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.put(NETWORK_URL, new Response(blob, { headers: { 'Content-Type': 'application/json' } }));
  }
  localStorage.setItem(STORAGE_KEY_LANDMARKS, JSON.stringify(BARCELONA_LANDMARKS));
  onProgress(100);

  const newState: OfflinePackageState = {
    isDownloaded: true,
    downloadDate: Date.now(),
    version: `TMB GTFS ${raw.feed.start}–${raw.feed.end}`,
    sizeBytes: blob.size,
    cachedStationsCount: raw.stations.length,
    cachedLinesCount: raw.routes.length,
    cachedLandmarksCount: BARCELONA_LANDMARKS.length,
    isSimulatedOffline: false
  };

  saveOfflinePackageState(newState);
  return newState;
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
  localStorage.removeItem(STORAGE_KEY_LANDMARKS);
  if (typeof caches !== 'undefined') void caches.delete(OFFLINE_CACHE);

  const resetState: OfflinePackageState = {
    isDownloaded: false,
    version: '-',
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
