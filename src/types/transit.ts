export type TransitType = 'metro' | 'train' | 'bus' | 'tram';

export type Language = 'es' | 'en' | 'ar' | 'ca';

export interface StationAccess {
  name: string;
  lat: number;
  lng: number;
  accessible: boolean;
  elevators: number;
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  zone?: string;
  hasAccessibleAccess?: boolean;
  hasElevator?: boolean;
  hasBicycleParking?: boolean;
  isBusStop?: boolean;
  stopCodes?: string[]; // TMB stop / station codes (used by the iTransit real-time API)
  accesses?: StationAccess[]; // street entrances (TMB open data)
}

export interface TransitLine {
  id: string;
  code: string; // e.g. "L1", "R1", "H12", "T4"
  name: string;
  type: TransitType;
  color: string;
  textColor: string;
  operator: 'TMB' | 'Rodalies' | 'FGC' | 'TRAM';
  origin: string;
  destination: string;
  stations: Station[];
  frequencyMinutes: number;
  pathCoordinates: [number, number][];
  returnPathCoordinates?: [number, number][];
  serviceStart?: string; // first departure today "HH:MM"
  serviceEnd?: string;   // last departure today "HH:MM"
}

export type Occupancy = 'low' | 'medium' | 'high' | 'unknown';

export type DataSource = 'schedule' | 'realtime';

export interface LiveVehicle {
  id: string;
  lineId: string;
  lineCode: string;
  type: TransitType;
  color: string;
  destination: string;
  lat: number;
  lng: number;
  speedKmH: number;
  bearing: number;
  nextStationId: string;
  nextStationName: string;
  etaMinutes: number;
  occupancy: Occupancy;
  delayMinutes: number; // 0 = on time, >0 = delayed
  isDelayed: boolean;
  model: 'civia_train' | 'metro_9000' | 'bus_articulated' | 'tram_citadis';
  progressAlongRoute: number; // 0 to 1
  direction: 'outbound' | 'inbound';
  source?: DataSource;
}

export interface Departure {
  vehicleId: string;
  lineCode: string;
  lineColor: string;
  type: TransitType;
  destination: string;
  timeEstimateMinutes: number;
  isRealTime: boolean;
  delayMinutes: number;
  platform?: string;
  occupancy: Occupancy;
  lineTextColor?: string;
  timeEstimateSeconds?: number;
  departureTime?: string; // "HH:MM" local time
  isLastOfDay?: boolean;
  source?: DataSource;
}

export interface CustomTripAlert {
  id: string;
  title: string;
  lineCode: string;
  type: TransitType;
  originStationId: string;
  originStationName: string;
  destinationStationId: string;
  destinationStationName: string;
  targetTime: string; // e.g. "08:30"
  notifyMinutesBefore: number; // e.g. 5, 10, 15
  notifyOnDelay: boolean;
  enabled: boolean;
  soundEnabled: boolean;
  repeatDays: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  createdAt: number;
}

export interface ServiceNotice {
  id: string;
  lineCode: string;
  type: 'info' | 'delay' | 'works' | 'strike';
  title: Record<Language, string>;
  description: Record<Language, string>;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface PointOfInterest {
  id: string;
  name: Record<Language, string>;
  category: 'monument' | 'museum' | 'park' | 'beach' | 'culture' | 'viewpoint';
  lat: number;
  lng: number;
  description: Record<Language, string>;
  tips: Record<Language, string>;
  nearestStationId: string;
  nearestStationName: string;
  walkingMinutes: number;
  connectedLines: string[];
  imageCategory: string; // e.g., 'cathedral', 'park', 'gaudi', 'beach', 'stadium'
}

export interface NotificationPreferences {
  enableArrivalAlerts: boolean;
  enableDelayAlerts: boolean;
  delayThresholdMinutes: number; // e.g. 2, 5, 10
  enableDisruptions: boolean;
  enableSound: boolean;
  enablePushNotifications: boolean;
  subscribedLineCodes: string[]; // e.g. ['L1', 'R1']
  timeFilterEnabled: boolean;
  activeStartTime: string; // e.g. '07:00'
  activeEndTime: string;   // e.g. '21:00'
}

export interface OfflinePackageState {
  isDownloaded: boolean;
  downloadDate?: number;
  version: string;
  sizeBytes: number;
  cachedStationsCount: number;
  cachedLinesCount: number;
  cachedLandmarksCount: number;
  isSimulatedOffline: boolean;
}

export interface City {
  id: string;
  name: Record<Language, string>;
  country: string;
  center: [number, number];
  zoom: number;
  status: 'active' | 'preview' | 'coming_soon';
  systems: string[];
}


/** A trip-planner endpoint: a station/stop or a raw coordinate (e.g. the user's location). */
export type Place =
  | { kind: 'station'; stationId: string; name: string }
  | { kind: 'location'; lat: number; lng: number; name: string };

export type AppTab = 'now' | 'trip' | 'map' | 'lines' | '3d' | 'landmarks' | 'alerts' | 'notices';
