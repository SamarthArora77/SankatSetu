import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { EmergencyIncident, ReliefShelter, Responder } from '../../types';
import { MapFilters, MapFilterType } from './MapFilters';
import { AlertCircle, Users, CheckCircle, Home, Radio, Compass } from 'lucide-react';

interface DisasterMapProps {
  emergencies: EmergencyIncident[];
  shelters: ReliefShelter[];
  responders: Responder[];
  onSelectEmergency: (incident: EmergencyIncident) => void;
  onOpenSOS: () => void;
  filter: MapFilterType;
  onFilterChange: (filter: MapFilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const DisasterMap: React.FC<DisasterMapProps> = ({
  emergencies,
  shelters,
  responders,
  onSelectEmergency,
  onOpenSOS,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent double initialization

    // Center on Delhi Yamuna flood zone [28.6300, 77.2600]
    const map = L.map(mapContainerRef.current, {
      center: [28.6350, 77.2650],
      zoom: 13,
      zoomControl: false,
    });

    // Clean modern OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | ReliefSync Ops',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Marker Layer Group
    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update Markers whenever data or filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const lowerQuery = searchQuery.toLowerCase().trim();

    // 1. Render Emergencies
    if (filter === 'ALL' || filter === 'CRITICAL_ONLY') {
      const filteredEmergencies = emergencies.filter(e => {
        if (filter === 'CRITICAL_ONLY' && e.urgency !== 'CRITICAL') return false;
        if (lowerQuery) {
          const matchTitle = e.title.toLowerCase().includes(lowerQuery);
          const matchAddress = e.location.address?.toLowerCase().includes(lowerQuery);
          return matchTitle || matchAddress;
        }
        return true;
      });

      filteredEmergencies.forEach(incident => {
        const isCritical = incident.urgency === 'CRITICAL';
        const isHigh = incident.urgency === 'HIGH';
        const isResolved = incident.status === 'RESOLVED';

        const pinColor = isResolved 
          ? '#10B981' 
          : isCritical 
          ? '#DC2626' 
          : isHigh 
          ? '#EA580C' 
          : '#D97706';

        const iconHtml = `
          <div style="position: relative; width: 36px; height: 36px; cursor: pointer;">
            ${isCritical && !isResolved ? `
              <div style="
                position: absolute;
                inset: -6px;
                border-radius: 9999px;
                background-color: rgba(220, 38, 38, 0.35);
                animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
            ` : ''}
            <div style="
              position: relative;
              width: 36px;
              height: 36px;
              border-radius: 9999px;
              background-color: ${pinColor};
              border: 2px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 800;
              font-size: 13px;
            ">
              ${isResolved ? '✓' : isCritical ? '!' : '⚠'}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-emergency-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18],
        });

        const marker = L.marker([incident.location.lat, incident.location.lng], { icon: customIcon });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-3.5 space-y-2 text-slate-800 text-xs min-w-[240px]';
        popupContent.innerHTML = `
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <span class="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${isCritical ? 'bg-red-100 text-red-900' : 'bg-slate-100 text-slate-800'}">
              #${incident.ticketNumber}
            </span>
            <span class="font-bold text-[10px] uppercase px-2 py-0.5 rounded ${
              isResolved ? 'bg-emerald-100 text-emerald-800' : isCritical ? 'bg-red-600 text-white' : 'bg-warm-100 text-warm-900'
            }">
              ${incident.urgency}
            </span>
          </div>
          <div>
            <h4 class="font-bold text-slate-900 text-xs leading-tight">${incident.title}</h4>
            <p class="text-[11px] text-slate-600 mt-1 line-clamp-2">${incident.description}</p>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>📍 ${incident.location.address || 'GPS Point'}</span>
            <span class="font-bold text-slate-700">👥 ${incident.peopleCount} trapped</span>
          </div>
          ${incident.assignedResponderName ? `
            <div class="p-1.5 rounded bg-forest-50 border border-forest-200 text-forest-900 text-[10px] font-semibold">
              Assigned: ${incident.assignedResponderName}
            </div>
          ` : ''}
          <button id="btn-inspect-${incident.id}" class="w-full mt-2 py-1.5 px-2 rounded bg-forest-900 hover:bg-forest-800 text-white font-bold text-[11px] transition-colors">
            Inspect & Track Mission →
          </button>
        `;

        popupContent.querySelector(`#btn-inspect-${incident.id}`)?.addEventListener('click', () => {
          onSelectEmergency(incident);
        });

        marker.bindPopup(popupContent);
        layer.addLayer(marker);
      });
    }

    // 2. Render Relief Shelters
    if (filter === 'ALL' || filter === 'SHELTERS_ONLY') {
      const filteredShelters = shelters.filter(s => {
        if (lowerQuery) {
          return s.name.toLowerCase().includes(lowerQuery) || s.location.address?.toLowerCase().includes(lowerQuery);
        }
        return true;
      });

      filteredShelters.forEach(shelter => {
        const isFull = shelter.currentOccupancy >= shelter.capacity;
        const iconHtml = `
          <div style="
            position: relative;
            width: 34px;
            height: 34px;
            border-radius: 8px;
            background-color: #1b4332;
            border: 2px solid white;
            box-shadow: 0 4px 8px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #BBF7D0;
            font-size: 16px;
          ">
            ⛺
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-shelter-marker',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -17],
        });

        const marker = L.marker([shelter.location.lat, shelter.location.lng], { icon: customIcon });

        const occupancyPct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);

        marker.bindPopup(`
          <div class="p-3.5 space-y-2 text-slate-800 text-xs min-w-[240px]">
            <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span class="font-bold text-forest-900 text-xs flex items-center gap-1">
                ⛺ Relief Shelter
              </span>
              <span class="font-bold text-[10px] px-1.5 py-0.5 rounded ${isFull ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}">
                ${isFull ? 'FULL' : 'OPEN'}
              </span>
            </div>
            <div>
              <h4 class="font-bold text-slate-900 text-xs">${shelter.name}</h4>
              <p class="text-[11px] text-slate-500">${shelter.location.address}</p>
            </div>
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-600">Capacity (${shelter.currentOccupancy} / ${shelter.capacity})</span>
                <span class="font-bold font-mono ${occupancyPct > 90 ? 'text-red-600' : 'text-slate-800'}">${occupancyPct}%</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div class="h-full rounded-full ${occupancyPct > 90 ? 'bg-red-500' : 'bg-forest-600'}" style="width: ${occupancyPct}%"></div>
              </div>
            </div>
            <div class="pt-1.5 border-t border-slate-100 text-[10px] text-slate-600 space-y-0.5">
              <p>📞 Coordinator: <strong>${shelter.contactPerson}</strong> (${shelter.contactPhone})</p>
              <div class="flex items-center gap-2 pt-1">
                ${shelter.hasMedicalPost ? '<span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">🩺 Medical Post</span>' : ''}
                ${shelter.hasDrinkingWater ? '<span class="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 font-semibold">💧 Clean Water</span>' : ''}
              </div>
            </div>
          </div>
        `);

        layer.addLayer(marker);
      });
    }

    // 3. Render Responders
    if (filter === 'ALL' || filter === 'RESPONDERS_ONLY') {
      responders.forEach(resp => {
        const iconHtml = `
          <div style="position: relative; width: 32px; height: 32px;">
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 9999px;
              background-color: #1D4ED8;
              border: 2px solid white;
              box-shadow: 0 4px 8px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 14px;
            ">
              ${resp.vehicleType === 'RESCUE_BOAT' ? '🚤' : resp.vehicleType === 'AMBULANCE' ? '🚑' : '🚒'}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-responder-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        const marker = L.marker([resp.location.lat, resp.location.lng], { icon: customIcon });

        marker.bindPopup(`
          <div class="p-3 space-y-1.5 text-xs text-slate-800 min-w-[210px]">
            <div class="flex items-center justify-between border-b border-slate-100 pb-1">
              <span class="font-bold text-blue-900">${resp.vehicleType.replace('_', ' ')}</span>
              <span class="font-bold text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                ${resp.status}
              </span>
            </div>
            <h4 class="font-bold text-slate-900">${resp.name}</h4>
            <p class="text-[11px] text-slate-500">${resp.team}</p>
            <div class="text-[10px] text-slate-600 pt-1">
              📞 ${resp.phone}
            </div>
            <div class="text-[10px] text-slate-500 font-mono">
              Equipped: ${resp.equipment.slice(0, 2).join(', ')}
            </div>
          </div>
        `);

        layer.addLayer(marker);
      });
    }
  }, [emergencies, shelters, responders, filter, searchQuery, onSelectEmergency]);

  // Compute live situation metrics
  const activeEmergenciesCount = emergencies.filter(e => e.status !== 'RESOLVED').length;
  const criticalCount = emergencies.filter(e => e.urgency === 'CRITICAL' && e.status !== 'RESOLVED').length;
  const totalTrapped = emergencies.filter(e => e.status !== 'RESOLVED').reduce((acc, curr) => acc + curr.peopleCount, 0);
  const totalShelterBeds = shelters.reduce((acc, s) => acc + s.capacity, 0);
  const occupiedShelterBeds = shelters.reduce((acc, s) => acc + s.currentOccupancy, 0);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden">
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-[500] max-w-4xl mx-auto pointer-events-none">
        <div className="pointer-events-auto">
          <MapFilters
            activeFilter={filter}
            onFilterChange={onFilterChange}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            counts={{
              emergencies: emergencies.length,
              critical: criticalCount,
              shelters: shelters.length,
              responders: responders.length
            }}
          />
        </div>
      </div>

      {/* Floating Tactical Metrics Strip (Bottom Left) */}
      <div className="absolute bottom-6 left-4 z-[500] pointer-events-none hidden md:block">
        <div className="pointer-events-auto bg-forest-950/90 text-white backdrop-blur-md border border-forest-800 rounded-lg shadow-xl p-3 flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <div>
              <span className="text-[10px] text-forest-300 block uppercase font-sans">Active SOS</span>
              <span className="font-bold text-sm text-red-400">{activeEmergenciesCount} ({criticalCount} Critical)</span>
            </div>
          </div>

          <div className="w-px h-8 bg-forest-800" />

          <div>
            <span className="text-[10px] text-forest-300 block uppercase font-sans">Est. Trapped</span>
            <span className="font-bold text-sm text-warm-400">{totalTrapped} Citizens</span>
          </div>

          <div className="w-px h-8 bg-forest-800" />

          <div>
            <span className="text-[10px] text-forest-300 block uppercase font-sans">Shelter Space</span>
            <span className="font-bold text-sm text-emerald-400">{totalShelterBeds - occupiedShelterBeds} / {totalShelterBeds} Beds</span>
          </div>
        </div>
      </div>

      {/* Quick Map Legend (Bottom Right, above zoom) */}
      <div className="absolute bottom-20 right-4 z-[500] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-2.5 shadow-md text-[11px] font-medium space-y-1.5 hidden sm:block">
        <div className="flex items-center gap-2 text-slate-700">
          <span className="w-3 h-3 rounded-full bg-red-600 border border-white shadow-sm inline-block" />
          <span>Critical Emergency</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <span className="w-3 h-3 rounded-full bg-warm-600 border border-white shadow-sm inline-block" />
          <span>High Urgency SOS</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <span className="w-3 h-3 rounded bg-forest-800 text-[9px] text-white flex items-center justify-center font-bold">⛺</span>
          <span>Relief Shelter</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <span className="w-3 h-3 rounded-full bg-blue-600 text-[8px] text-white flex items-center justify-center">🚤</span>
          <span>Active Rescue Unit</span>
        </div>
      </div>
    </div>
  );
};
