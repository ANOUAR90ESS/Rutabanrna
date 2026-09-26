import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TransitLine, LiveVehicle, Station, TransitType, Language, PointOfInterest } from '../types/transit';
import { translations } from '../i18n/translations';

interface TransitMapProps {
  lines: TransitLine[];
  vehicles: LiveVehicle[];
  landmarks: PointOfInterest[];
  showLandmarks: boolean;
  onToggleLandmarks: () => void;
  selectedType: TransitType | 'all';
  searchQuery: string;
  selectedStation: Station | null;
  selectedVehicle: LiveVehicle | null;
  onSelectStation: (station: Station) => void;
  onSelectVehicle: (vehicle: LiveVehicle) => void;
  onSelectLandmark: (landmark: PointOfInterest) => void;
  onOpen3DViewer: (vehicle: LiveVehicle) => void;
  isOffline: boolean;
  lang: Language;
}

export const TransitMap: React.FC<TransitMapProps> = ({
  lines,
  vehicles,
  landmarks,
  showLandmarks,
  onToggleLandmarks,
  selectedType,
  searchQuery,
  selectedStation,
  selectedVehicle,
  onSelectStation,
  onSelectVehicle,
  onSelectLandmark,
  onOpen3DViewer,
  isOffline,
  lang
}) => {
  const t = translations[lang];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup | null>(null);
  const landmarksLayerRef = useRef<L.LayerGroup | null>(null);
  const vehiclesLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center Barcelona: 41.3879, 2.16992
    const map = L.map(mapContainerRef.current, {
      center: [41.3879, 2.16992],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });
    mapInstanceRef.current = map;

    // Reposition zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // CartoDB Dark Matter tiles
    const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      errorTileUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23090d16"/><path d="M0 0h256v256H0z" fill="none" stroke="%231e293b" stroke-width="0.5"/></svg>'
    }).addTo(map);
    tileLayerRef.current = tiles;

    // Layer groups
    polylinesLayerRef.current = L.layerGroup().addTo(map);
    stationsLayerRef.current = L.layerGroup().addTo(map);
    landmarksLayerRef.current = L.layerGroup().addTo(map);
    vehiclesLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Line Polylines & Station Markers when lines or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !polylinesLayerRef.current || !stationsLayerRef.current) return;

    polylinesLayerRef.current.clearLayers();
    stationsLayerRef.current.clearLayers();

    const filteredLines = lines.filter((line) => {
      if (selectedType !== 'all' && line.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLine = line.code.toLowerCase().includes(q) || line.name.toLowerCase().includes(q);
        const matchesStation = line.stations.some((st) => st.name.toLowerCase().includes(q));
        return matchesLine || matchesStation;
      }
      return true;
    });

    // Draw route polylines
    filteredLines.forEach((line) => {
      // Glow underlay for neon track effect
      const glowPolyline = L.polyline(line.pathCoordinates, {
        color: line.color,
        weight: line.type === 'train' ? 8 : 6,
        opacity: 0.28,
        lineCap: 'round',
        lineJoin: 'round'
      });
      polylinesLayerRef.current?.addLayer(glowPolyline);

      // Sharp central line
      const mainPolyline = L.polyline(line.pathCoordinates, {
        color: line.color,
        weight: line.type === 'train' ? 4 : 3,
        opacity: 0.95,
        dashArray: line.type === 'bus' ? '6, 6' : undefined,
        lineCap: 'round',
        lineJoin: 'round'
      });
      polylinesLayerRef.current?.addLayer(mainPolyline);
    });

    // Collect and render unique stations
    const stationsMap = new Map<string, Station>();
    filteredLines.forEach((line) => {
      line.stations.forEach((st) => {
        if (!stationsMap.has(st.id)) {
          stationsMap.set(st.id, st);
        }
      });
    });

    stationsMap.forEach((station) => {
      const isSelected = selectedStation?.id === station.id;

      // Custom SVG station badge icon
      const iconHtml = `
        <div class="relative group cursor-pointer transition-transform duration-200 hover:scale-125">
          <div class="w-4 h-4 rounded-full bg-slate-900 border-2 ${
            isSelected ? 'border-amber-400 ring-4 ring-amber-400/40' : 'border-white'
          } shadow-md flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-slate-300'}"></div>
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'station-div-icon',
        html: iconHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([station.lat, station.lng], { icon: markerIcon });

      marker.on('click', () => {
        onSelectStation(station);
      });

      marker.bindTooltip(`
        <div class="font-sans px-1 py-0.5">
          <div class="font-bold text-xs text-white">${station.name}</div>
          <div class="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            ${station.lines.map((l) => `<span class="px-1 py-0.2 rounded bg-slate-800 font-mono text-[9px] text-slate-300">${l}</span>`).join('')}
          </div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -8],
        className: 'bg-slate-900 border border-slate-700/80 text-white rounded-lg shadow-xl'
      });

      stationsLayerRef.current?.addLayer(marker);
    });
  }, [lines, selectedType, searchQuery, selectedStation]);

  // Update Landmarks Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !landmarksLayerRef.current) return;

    landmarksLayerRef.current.clearLayers();

    if (!showLandmarks) return;

    landmarks.forEach((item) => {
      const landmarkHtml = `
        <div class="relative group cursor-pointer transition-transform duration-300 hover:scale-115">
          <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-white">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'landmark-div-icon',
        html: landmarkHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([item.lat, item.lng], { icon: markerIcon });

      marker.on('click', () => {
        onSelectLandmark(item);
      });

      marker.bindTooltip(`
        <div class="font-sans px-1 py-0.5">
          <div class="font-bold text-xs text-rose-300">${item.name[lang]}</div>
          <div class="text-[10px] text-slate-300 mt-0.5">Parada: ${item.nearestStationName} (${item.walkingMinutes} min a pie)</div>
          <div class="text-[9px] text-emerald-400 mt-0.5 font-bold">Haz clic para ver detalles y transporte →</div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -12],
        className: 'bg-slate-900 border border-slate-700/80 text-white rounded-lg shadow-xl'
      });

      landmarksLayerRef.current?.addLayer(marker);
    });
  }, [landmarks, showLandmarks, lang, onSelectLandmark]);

  // Update Moving Live Vehicles
  useEffect(() => {
    if (!mapInstanceRef.current || !vehiclesLayerRef.current) return;

    vehiclesLayerRef.current.clearLayers();

    const filteredVehicles = vehicles.filter((v) => {
      if (selectedType !== 'all' && v.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          v.lineCode.toLowerCase().includes(q) ||
          v.destination.toLowerCase().includes(q) ||
          v.nextStationName.toLowerCase().includes(q)
        );
      }
      return true;
    });

    filteredVehicles.forEach((vehicle) => {
      const vehicleHtml = `
        <div class="relative cursor-pointer transition-transform duration-300 hover:scale-110">
          <!-- Radar pulse ring for live movement -->
          <div class="absolute -inset-2 rounded-full opacity-60 animate-radar" style="background-color: ${vehicle.color}"></div>

          <!-- Vehicle body container -->
          <div class="relative flex items-center justify-center px-1.5 py-0.5 rounded-md shadow-xl text-white font-bold font-mono text-[11px] border border-white/40" style="background-color: ${vehicle.color}">
            <span>${vehicle.lineCode}</span>
            <div class="ml-1 w-1.5 h-1.5 rounded-full ${vehicle.isDelayed ? 'bg-amber-300' : 'bg-emerald-300'}"></div>
          </div>
        </div>
      `;

      const vehicleIcon = L.divIcon({
        className: 'vehicle-div-icon',
        html: vehicleHtml,
        iconSize: [36, 22],
        iconAnchor: [18, 11]
      });

      const marker = L.marker([vehicle.lat, vehicle.lng], { icon: vehicleIcon });

      marker.on('click', () => {
        onSelectVehicle(vehicle);
      });

      // Rich popup with 3D button
      const popupContent = document.createElement('div');
      popupContent.className = 'p-3 w-64 text-left';
      popupContent.innerHTML = `
        <div class="flex items-center justify-between pb-2 border-b border-slate-700/60">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-xs font-bold text-white" style="background-color: ${vehicle.color}">${vehicle.lineCode}</span>
            <span class="text-xs font-bold text-white capitalize">${vehicle.type}</span>
          </div>
          <span class="text-[10px] px-1.5 py-0.5 rounded font-mono ${vehicle.isDelayed ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}">
            ${vehicle.isDelayed ? `+${vehicle.delayMinutes}m retard` : 'En hora'}
          </span>
        </div>

        <div class="py-2 space-y-1 text-xs">
          <div class="text-slate-400">Destino: <strong class="text-slate-200">${vehicle.destination}</strong></div>
          <div class="text-slate-400">Próxima parada: <strong class="text-slate-200">${vehicle.nextStationName}</strong></div>
          <div class="flex items-center justify-between pt-1">
            <span class="text-slate-400 font-mono">Velocidad: <strong class="text-white">${vehicle.speedKmH} km/h</strong></span>
            <span class="text-slate-400 font-mono">ETA: <strong class="text-white">${vehicle.etaMinutes} min</strong></span>
          </div>
        </div>

        <button id="btn-view-3d-${vehicle.id}" class="w-full mt-2 py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          <span>${t.inspect3D}</span>
        </button>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280 });

      marker.on('popupopen', () => {
        const btn3d = document.getElementById(`btn-view-3d-${vehicle.id}`);
        if (btn3d) {
          btn3d.onclick = () => {
            onOpen3DViewer(vehicle);
          };
        }
      });

      vehiclesLayerRef.current?.addLayer(marker);
    });
  }, [vehicles, selectedType, searchQuery, selectedVehicle, t.inspect3D]);

  // Pan to selected station or vehicle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (selectedStation) {
      mapInstanceRef.current.flyTo([selectedStation.lat, selectedStation.lng], 15, {
        duration: 1.2
      });
    } else if (selectedVehicle) {
      mapInstanceRef.current.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, {
        duration: 1.2
      });
    }
  }, [selectedStation, selectedVehicle]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls (Landmarks toggle & Layer info) */}
      <div className="absolute bottom-6 right-4 z-20 flex flex-col items-end gap-2">
        <button
          onClick={onToggleLandmarks}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xl flex items-center gap-1.5 backdrop-blur-md border ${
            showLandmarks
              ? 'bg-rose-500/90 text-white border-rose-400 shadow-rose-500/20'
              : 'bg-slate-900/85 text-slate-300 border-slate-700/80 hover:bg-slate-800'
          }`}
        >
          <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>{showLandmarks ? 'Ocultar Monumentos' : 'Ver Monumentos'}</span>
        </button>
      </div>
    </div>
  );
};

