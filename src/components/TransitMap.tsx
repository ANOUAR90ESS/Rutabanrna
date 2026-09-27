import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { TransitLine, LiveVehicle, Station, TransitType, Language, PointOfInterest } from '../types/transit';
import { translations } from '../i18n/translations';
import type { JourneySegment } from '../services/network/router';
import { ui } from '../i18n/ui';

interface TransitMapProps {
  /** Source + update date shown in the map attribution (TMB licence). */
  dataAttribution?: string;
  lines: TransitLine[];
  stations: Station[];
  journey?: JourneySegment[] | null;
  onClearJourney?: () => void;
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

const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Bus vehicles/stops are only drawn when zoomed in, filtered to buses, or one line is selected. */
const BUS_DETAIL_ZOOM = 15;

export const TransitMap: React.FC<TransitMapProps> = ({
  dataAttribution,
  lines,
  stations,
  journey,
  onClearJourney,
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
  const journeyLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkersRef = useRef(new Map<string, { marker: L.Marker; key: string }>());
  const vehicleDataRef = useRef(new Map<string, LiveVehicle>());
  const [view, setView] = useState<{ zoom: number; bounds: L.LatLngBounds | null }>({ zoom: 13, bounds: null });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center Barcelona: 41.3879, 2.16992
    const map = L.map(mapContainerRef.current, {
      center: [41.3879, 2.16992],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true
    });
    const syncView = () => setView({ zoom: map.getZoom(), bounds: map.getBounds().pad(0.2) });
    map.on('moveend zoomend', syncView);
    syncView();
    mapInstanceRef.current = map;

    // Reposition zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // CartoDB Dark Matter tiles
    map.attributionControl.setPrefix(false);
    const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      subdomains: 'abcd',
      errorTileUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23090d16"/><path d="M0 0h256v256H0z" fill="none" stroke="%231e293b" stroke-width="0.5"/></svg>'
    }).addTo(map);
    tileLayerRef.current = tiles;

    // Layer groups
    polylinesLayerRef.current = L.layerGroup().addTo(map);
    stationsLayerRef.current = L.layerGroup().addTo(map);
    landmarksLayerRef.current = L.layerGroup().addTo(map);
    journeyLayerRef.current = L.layerGroup().addTo(map);
    vehiclesLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      vehicleMarkersRef.current.clear();
    };
  }, []);

  // Update Line Polylines & Station Markers when lines or filters change
  const singleLine = lines.length === 1;
  const busDetail = selectedType === 'bus' || singleLine || view.zoom >= BUS_DETAIL_ZOOM;
  useEffect(() => {
    if (!mapInstanceRef.current || !polylinesLayerRef.current || !stationsLayerRef.current) return;

    polylinesLayerRef.current.clearLayers();
    stationsLayerRef.current.clearLayers();

    const q = searchQuery.trim().toLowerCase();
    const filteredLines = lines.filter((line) => {
      if (selectedType !== 'all' && line.type !== selectedType) return false;
      if (q) {
        const matchesLine = line.code.toLowerCase().includes(q) || line.name.toLowerCase().includes(q);
        const matchesStation = line.stations.some((st) => st.name.toLowerCase().includes(q));
        return matchesLine || matchesStation;
      }
      return true;
    });
    const lineCodes = new Set(filteredLines.map((l) => l.code));
    const emphasiseBus = selectedType === 'bus' || singleLine;

    // Draw route polylines (metro on top of buses)
    [...filteredLines]
      .sort((a, b) => (a.type === 'bus' ? 0 : 1) - (b.type === 'bus' ? 0 : 1))
      .forEach((line) => {
        const paths = [line.pathCoordinates, line.returnPathCoordinates].filter(
          (p): p is [number, number][] => !!p && p.length > 1
        );
        paths.forEach((path) => {
          if (line.type === 'bus') {
            polylinesLayerRef.current?.addLayer(
              L.polyline(path, {
                color: line.color,
                weight: emphasiseBus ? 3 : 2,
                opacity: emphasiseBus ? 0.85 : 0.22,
                lineCap: 'round',
                lineJoin: 'round',
                interactive: false
              })
            );
            return;
          }
          // Glow underlay for neon track effect + sharp central line
          polylinesLayerRef.current?.addLayer(
            L.polyline(path, { color: line.color, weight: 8, opacity: 0.28, lineCap: 'round', lineJoin: 'round', interactive: false })
          );
          polylinesLayerRef.current?.addLayer(
            L.polyline(path, { color: line.color, weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round', interactive: false })
          );
        });
      });

    const tooltipHtml = (station: Station) => `
        <div class="font-sans px-1 py-0.5">
          <div class="font-bold text-xs text-white">${esc(station.name)}</div>
          <div class="text-[10px] text-slate-400 flex flex-wrap items-center gap-1 mt-0.5">
            ${station.lines.slice(0, 12).map((l) => `<span class="px-1 py-0.2 rounded bg-slate-800 font-mono text-[9px] text-slate-300">${esc(l)}</span>`).join('')}
          </div>
        </div>
      `;
    const tooltipOpts: L.TooltipOptions = {
      direction: 'top',
      offset: [0, -8],
      className: 'bg-slate-900 border border-slate-700/80 text-white rounded-lg shadow-xl'
    };

    stations.forEach((station) => {
      if (!station.lines.some((l) => lineCodes.has(l))) return;
      if (q && !station.name.toLowerCase().includes(q) && !station.lines.some((l) => l.toLowerCase().includes(q))) return;
      const isSelected = selectedStation?.id === station.id;

      if (station.isBusStop) {
        if (!busDetail && !isSelected) return;
        if (!singleLine && selectedType !== 'bus' && view.bounds && !view.bounds.contains([station.lat, station.lng])) return;
        const dot = L.circleMarker([station.lat, station.lng], {
          radius: isSelected ? 7 : 4,
          color: isSelected ? '#fbbf24' : '#e2e8f0',
          weight: isSelected ? 3 : 1.5,
          fillColor: '#0f172a',
          fillOpacity: 1
        });
        dot.on('click', () => onSelectStation(station));
        dot.bindTooltip(tooltipHtml(station), tooltipOpts);
        stationsLayerRef.current?.addLayer(dot);
        return;
      }

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

      const marker = L.marker([station.lat, station.lng], { icon: markerIcon, zIndexOffset: 500 });
      marker.on('click', () => onSelectStation(station));
      marker.bindTooltip(tooltipHtml(station), tooltipOpts);
      stationsLayerRef.current?.addLayer(marker);
    });

    // Street entrances of the selected station (blue = step-free, grey = stairs only)
    selectedStation?.accesses?.forEach((acc) => {
      const dot = L.circleMarker([acc.lat, acc.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: acc.accessible ? '#0ea5e9' : '#64748b',
        fillOpacity: 1
      });
      dot.bindTooltip(
        `<div class="font-sans px-1 py-0.5"><div class="font-bold text-xs text-white">${esc(acc.name)}</div>` +
          `<div class="text-[10px] ${acc.accessible ? 'text-sky-300' : 'text-slate-400'}">${esc(
            acc.accessible ? t.accessibleEntrance : t.notAccessibleEntrance
          )}${acc.elevators ? ` · ${acc.elevators} ${esc(t.elevatorShort)}` : ''}</div></div>`,
        tooltipOpts
      );
      stationsLayerRef.current?.addLayer(dot);
    });
  }, [lines, stations, selectedType, searchQuery, selectedStation, busDetail, singleLine, view, t]);

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

  // Update Moving Live Vehicles (markers are reused and only moved each tick)
  useEffect(() => {
    const layer = vehiclesLayerRef.current;
    if (!mapInstanceRef.current || !layer) return;

    const q = searchQuery.trim().toLowerCase();
    const lineCodes = new Set(lines.map((l) => l.code));
    const visible = vehicles.filter((v) => {
      if (!lineCodes.has(v.lineCode)) return false;
      if (selectedType !== 'all' && v.type !== selectedType) return false;
      if (q) {
        return (
          v.lineCode.toLowerCase().includes(q) ||
          v.destination.toLowerCase().includes(q) ||
          v.nextStationName.toLowerCase().includes(q)
        );
      }
      if (v.type === 'bus' && !busDetail) return false;
      if (v.type === 'bus' && !singleLine && selectedType !== 'bus' && view.bounds && !view.bounds.contains([v.lat, v.lng])) return false;
      return true;
    });

    const markers = vehicleMarkersRef.current;
    const data = vehicleDataRef.current;
    data.clear();
    const seen = new Set<string>();

    visible.forEach((vehicle) => {
      seen.add(vehicle.id);
      data.set(vehicle.id, vehicle);
      const isBus = vehicle.type === 'bus';
      const key = `${vehicle.lineCode}|${vehicle.isDelayed}`;
      const existing = markers.get(vehicle.id);
      if (existing) {
        existing.marker.setLatLng([vehicle.lat, vehicle.lng]);
        if (existing.key === key) return;
        layer.removeLayer(existing.marker);
      }

      const vehicleHtml = isBus
        ? `<div class="relative cursor-pointer flex items-center justify-center px-1 rounded shadow-lg text-white font-bold font-mono text-[9px] border border-white/50" style="background-color:${vehicle.color}">${esc(vehicle.lineCode)}</div>`
        : `
        <div class="relative cursor-pointer transition-transform duration-300 hover:scale-110">
          <div class="absolute -inset-2 rounded-full opacity-60 animate-radar" style="background-color: ${vehicle.color}"></div>
          <div class="relative flex items-center justify-center px-1.5 py-0.5 rounded-md shadow-xl text-white font-bold font-mono text-[11px] border border-white/40" style="background-color: ${vehicle.color}">
            <span>${esc(vehicle.lineCode)}</span>
            <div class="ml-1 w-1.5 h-1.5 rounded-full ${vehicle.isDelayed ? 'bg-amber-300' : 'bg-emerald-300'}"></div>
          </div>
        </div>
      `;

      const vehicleIcon = L.divIcon({
        className: 'vehicle-div-icon',
        html: vehicleHtml,
        iconSize: isBus ? [30, 14] : [36, 22],
        iconAnchor: isBus ? [15, 7] : [18, 11]
      });

      const marker = L.marker([vehicle.lat, vehicle.lng], { icon: vehicleIcon, zIndexOffset: isBus ? 800 : 1000 });
      const id = vehicle.id;
      marker.on('click', () => {
        const v = vehicleDataRef.current.get(id);
        if (v) onSelectVehicle(v);
      });

      // Rich popup with 3D button (content built from the latest data when opened)
      marker.bindPopup(() => {
        const v = vehicleDataRef.current.get(id) || vehicle;
        const popupContent = document.createElement('div');
        popupContent.className = 'p-3 w-64 text-left';
        popupContent.innerHTML = `
        <div class="flex items-center justify-between pb-2 border-b border-slate-700/60">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-xs font-bold text-white" style="background-color: ${v.color}">${esc(v.lineCode)}</span>
            <span class="text-xs font-bold text-white capitalize">${v.type}</span>
          </div>
          <span class="text-[10px] px-1.5 py-0.5 rounded font-mono ${v.isDelayed ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'}">
            ${v.isDelayed ? `+${v.delayMinutes}m` : '≈'}
          </span>
        </div>

        <div class="py-2 space-y-1 text-xs">
          <div class="text-[10px] text-amber-300/90">${esc(ui(lang).estimatedPos)}</div>
          <div class="text-slate-400">${esc(t.destination)}: <strong class="text-slate-200">${esc(v.destination)}</strong></div>
          <div class="text-slate-400">${esc(t.nextStop)}: <strong class="text-slate-200">${esc(v.nextStationName)}</strong></div>
          <div class="flex items-center justify-between pt-1">
            <span class="text-slate-400 font-mono">${esc(t.speed)}: <strong class="text-white">${v.speedKmH} km/h</strong></span>
            <span class="text-slate-400 font-mono">ETA: <strong class="text-white">${v.etaMinutes < 1 ? '&lt;1' : v.etaMinutes} min</strong></span>
          </div>
        </div>
      `;
        const btn = document.createElement('button');
        btn.className = 'w-full mt-2 py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md';
        btn.innerHTML = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg><span>${esc(t.inspect3D)}</span>`;
        btn.onclick = () => onOpen3DViewer(vehicleDataRef.current.get(id) || v);
        popupContent.appendChild(btn);
        return popupContent;
      }, { maxWidth: 280 });

      layer.addLayer(marker);
      markers.set(vehicle.id, { marker, key });
    });

    markers.forEach((entry, id) => {
      if (!seen.has(id)) {
        layer.removeLayer(entry.marker);
        markers.delete(id);
      }
    });
  }, [vehicles, lines, selectedType, searchQuery, busDetail, singleLine, view, t]);

  // TMB data source in the attribution control
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !dataAttribution) return;
    map.attributionControl.addAttribution(dataAttribution);
    return () => {
      map.attributionControl.removeAttribution(dataAttribution);
    };
  }, [dataAttribution]);

  // Planned journey overlay
  useEffect(() => {
    const map = mapInstanceRef.current, layer = journeyLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!journey || !journey.length) return;
    const all: [number, number][] = [];
    journey.forEach((seg) => {
      all.push(...seg.points);
      if (!seg.dashed) layer.addLayer(L.polyline(seg.points, { color: '#ffffff', weight: 11, opacity: 0.9, interactive: false }));
      layer.addLayer(
        L.polyline(seg.points, { color: seg.color, weight: seg.dashed ? 4 : 7, opacity: 1, dashArray: seg.dashed ? '2 8' : undefined, interactive: false })
      );
      [seg.points[0], seg.points[seg.points.length - 1]].forEach((p) =>
        layer.addLayer(L.circleMarker(p, { radius: 5, color: '#0f172a', weight: 2, fillColor: '#ffffff', fillOpacity: 1, interactive: false }))
      );
    });
    map.fitBounds(L.latLngBounds(all).pad(0.15), { maxZoom: 16 });
  }, [journey]);

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

      {journey && journey.length > 0 && onClearJourney && (
        <button
          onClick={onClearJourney}
          className="absolute top-44 right-4 z-20 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-semibold text-white shadow-xl"
        >
          ✕ {translations[lang].close ?? 'Cerrar'}
        </button>
      )}

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

