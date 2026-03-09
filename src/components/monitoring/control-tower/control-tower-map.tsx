"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";
import "@/styles/leaflet-custom.css";
import type { TrackedVehicle } from "@/types/monitoring";

/** Colores para las rutas de diferentes vehículos */
const ROUTE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

interface ControlTowerMapProps {
  vehicles: TrackedVehicle[];
  selectedVehicleId?: string | null;
  onVehicleSelect?: (vehicle: TrackedVehicle | null) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  /** Rutas de todos los vehículos activos (Map<vehicleId, coordinates>) */
  allVehicleRoutes?: Map<string, [number, number][]>;
  className?: string;
}

/**
 * Obtiene el color del indicador según el estado del vehículo
 */
function getStatusColor(vehicle: TrackedVehicle): string {
  if (vehicle.connectionStatus === "disconnected") return "#ef4444"; // red
  if (vehicle.connectionStatus === "temporary_loss") return "#f59e0b"; // amber
  if (vehicle.movementStatus === "moving") return "#10b981"; // emerald (en movimiento)
  return "#3b82f6"; // blue (detenido pero conectado)
}

/**
 * Crea un icono SVG de camión estilo minimalista
 */
function createVehicleIconSvg(
  vehicle: TrackedVehicle,
  isSelected: boolean
): { svg: string; size: number } {
  const size = isSelected ? 52 : 40;
  const statusColor = getStatusColor(vehicle);

  // Camión seleccionado con círculo de fondo cyan
  const svg = isSelected 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="24" fill="${statusColor}" opacity="0.25"/>
        <circle cx="26" cy="26" r="18" fill="${statusColor}" opacity="0.15"/>
        <g transform="translate(14, 16)">
          <rect x="0" y="2" width="24" height="14" rx="2" fill="#1e293b"/>
          <rect x="16" y="4" width="7" height="10" rx="1.5" fill="#334155"/>
          <circle cx="6" cy="16" r="3" fill="#1e293b"/>
          <circle cx="18" cy="16" r="3" fill="#1e293b"/>
          <circle cx="6" cy="16" r="1.5" fill="#94a3b8"/>
          <circle cx="18" cy="16" r="1.5" fill="#94a3b8"/>
        </g>
        <!-- Indicador de estado -->
        <circle cx="42" cy="10" r="6" fill="${statusColor}" stroke="white" stroke-width="2"/>
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
        <g transform="translate(8, 10)">
          <rect x="0" y="2" width="24" height="14" rx="2" fill="#1e293b"/>
          <rect x="16" y="4" width="7" height="10" rx="1.5" fill="#334155"/>
          <circle cx="6" cy="16" r="3" fill="#1e293b"/>
          <circle cx="18" cy="16" r="3" fill="#1e293b"/>
          <circle cx="6" cy="16" r="1.5" fill="#94a3b8"/>
          <circle cx="18" cy="16" r="1.5" fill="#94a3b8"/>
        </g>
        <!-- Indicador de estado -->
        <circle cx="34" cy="8" r="5" fill="${statusColor}" stroke="white" stroke-width="1.5"/>
      </svg>`;

  return { svg, size };
}

export function ControlTowerMap({
  vehicles,
  selectedVehicleId,
  onVehicleSelect,
  initialCenter = [-12.0464, -77.0428], // Lima, Peru
  initialZoom = 12,
  allVehicleRoutes,
  className,
}: ControlTowerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRoutesLayerRef = useRef<Map<string, any>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  const stats = useMemo(() => {
    // Primero por conexión (prioridad)
    const offline = vehicles.filter((v) => v.connectionStatus === "disconnected").length;
    const tempLoss = vehicles.filter((v) => v.connectionStatus === "temporary_loss").length;
    // Los que están online se dividen en moving/stopped
    const onlineVehicles = vehicles.filter((v) => v.connectionStatus === "online");
    const moving = onlineVehicles.filter((v) => v.movementStatus === "moving").length;
    const stopped = onlineVehicles.filter((v) => v.movementStatus !== "moving").length;
    return { moving, stopped, tempLoss, offline };
  }, [vehicles]);

  // Callback para click en marcador
  const handleMarkerClick = useCallback(
    (vehicle: TrackedVehicle) => {
      onVehicleSelect?.(vehicle);
    },
    [onVehicleSelect]
  );

  // Refs para valores iniciales (evitar re-inicialización)
  const initialCenterRef = useRef(initialCenter);
  const initialZoomRef = useRef(initialZoom);
  const isInitializingRef = useRef(false);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || isInitializingRef.current) return;

    const container = mapContainerRef.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      const checkDimensions = setInterval(() => {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          clearInterval(checkDimensions);
          setIsMapReady(true);
        }
      }, 50);
      return () => clearInterval(checkDimensions);
    }
    setIsMapReady(true);
  }, []);

  // Crear mapa cuando está listo
  useEffect(() => {
    if (!isMapReady || !mapContainerRef.current || mapRef.current || isInitializingRef.current) return;

    isInitializingRef.current = true;

    const initMap = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L = (await import("leaflet")) as any;
        leafletRef.current = L;

        // Verificar que el contenedor no tenga ya un mapa
        const container = mapContainerRef.current;
        if (!container || (container as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
          isInitializingRef.current = false;
          return;
        }

        const map = L.map(container, {
          center: initialCenterRef.current,
          zoom: initialZoomRef.current,
          zoomControl: false,
          preferCanvas: true,
        });

        // Usar CartoDB Positron para estilo gris minimalista
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
          updateWhenZooming: false,
          updateWhenIdle: true,
        }).addTo(map);

        // Agregar controles de zoom en la esquina derecha
        L.control.zoom({
          position: 'topright'
        }).addTo(map);

        // Click en el mapa (fuera de marcadores) deselecciona el vehículo
        map.on('click', () => {
          if (onVehicleSelect) {
            onVehicleSelect(null);
          }
        });

        mapRef.current = map;
        setIsMapInitialized(true);
      } catch (error) {
        console.error("Error initializing map:", error);
        isInitializingRef.current = false;
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current.clear();
        leafletRef.current = null;
        isInitializingRef.current = false;
        setIsMapInitialized(false);
      }
    };
  }, [isMapReady]);

  // Actualizar marcadores cuando el mapa esté inicializado
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !isMapInitialized) return;

    const currentMarkerIds = new Set(vehicles.map((v) => v.id));
    const existingMarkerIds = new Set(markersRef.current.keys());

    // Eliminar marcadores que ya no existen
    existingMarkerIds.forEach((id) => {
      if (!currentMarkerIds.has(id)) {
        const marker = markersRef.current.get(id);
        if (marker) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }
    });

    // Agregar o actualizar marcadores
    vehicles.forEach((vehicle) => {
      const isSelected = vehicle.id === selectedVehicleId;
      const { svg, size } = createVehicleIconSvg(vehicle, isSelected);

      const icon = L.divIcon({
        html: svg,
        className: "vehicle-marker-icon",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });

      const position: [number, number] = [vehicle.position.lat, vehicle.position.lng];

      let marker = markersRef.current.get(vehicle.id);

      if (marker) {
        marker.setLatLng(position);
        marker.setIcon(icon);
      } else {
        marker = L.marker(position, { icon })
          .addTo(map)
          .on("click", (e: any) => {
            L.DomEvent.stopPropagation(e);
            handleMarkerClick(vehicle);
          });

        markersRef.current.set(vehicle.id, marker);
      }

      // Popup con info del vehículo
      const popupContent = `
        <div style="padding: 8px; min-width: 150px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${vehicle.plate}</div>
          <div style="font-size: 12px; color: #666;">
            <div>Velocidad: ${vehicle.position.speed} km/h</div>
            ${vehicle.driverName ? `<div>Conductor: ${vehicle.driverName}</div>` : ""}
            ${vehicle.activeOrderNumber ? `<div>Orden: ${vehicle.activeOrderNumber}</div>` : ""}
          </div>
        </div>
      `;
      marker.bindPopup(popupContent);
    });

    // Si hay un vehículo seleccionado, centrar en él
    if (selectedVehicleId) {
      const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (selectedVehicle) {
        map.setView(
          [selectedVehicle.position.lat, selectedVehicle.position.lng],
          Math.max(map.getZoom(), 14),
          { animate: true }
        );
      }
    }
  }, [vehicles, selectedVehicleId, handleMarkerClick, isMapInitialized]);

  // Auto-fit bounds cuando hay vehículos
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || vehicles.length === 0 || !isMapInitialized) return;

    // Solo hacer fit bounds si no hay vehículo seleccionado y hay más de 1
    if (!selectedVehicleId && vehicles.length > 1) {
      const bounds = L.latLngBounds(
        vehicles.map((v): [number, number] => [v.position.lat, v.position.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [vehicles.length, selectedVehicleId, isMapInitialized]);

  // Dibujar rutas de todos los vehículos activos
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !isMapInitialized) return;

    // Limpiar rutas anteriores
    allRoutesLayerRef.current.forEach((layer) => layer.remove());
    allRoutesLayerRef.current.clear();

    // Si no hay rutas, salir
    if (!allVehicleRoutes || allVehicleRoutes.size === 0) return;

    // Dibujar solo la ruta del vehículo seleccionado
    if (selectedVehicleId) {
      const coordinates = allVehicleRoutes.get(selectedVehicleId);
      if (coordinates && coordinates.length >= 2) {
        const polyline = L.polyline(coordinates, {
          color: "#06b6d4",
          weight: 5,
          opacity: 0.9,
          dashArray: "12, 6",
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        polyline.bringToFront();
        allRoutesLayerRef.current.set(selectedVehicleId, polyline);
      }
    }
  }, [allVehicleRoutes, selectedVehicleId, isMapInitialized]);

  return (
    <div className={cn("h-full w-full relative overflow-hidden", className)}>
      {/* Contenedor del mapa */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Contador de vehículos */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] rounded-full border bg-background/90 px-4 py-1.5 shadow-lg backdrop-blur-sm">
        <span className="text-xs font-semibold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          {vehicles.length} unidades monitoreadas
        </span>
      </div>

      {/* Leyenda */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-sm min-w-[180px]">
        <p className="mb-3 text-xs font-semibold text-foreground">Estado de Vehículos</p>
        <div className="space-y-2.5 text-xs">
          {/* En movimiento */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="2" width="20" height="12" rx="2" fill="#1e293b"/>
                <rect x="14" y="4" width="6" height="8" rx="1" fill="#334155"/>
                <circle cx="5" cy="14" r="2.5" fill="#1e293b"/>
                <circle cx="5" cy="14" r="1" fill="#94a3b8"/>
                <circle cx="16" cy="14" r="2.5" fill="#1e293b"/>
                <circle cx="16" cy="14" r="1" fill="#94a3b8"/>
              </svg>
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="flex flex-1 items-center justify-between">
              <span className="font-medium text-foreground">En movimiento</span>
              <span className="font-semibold text-emerald-600">{stats.moving}</span>
            </div>
          </div>

          {/* Detenido */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="2" width="20" height="12" rx="2" fill="#1e293b"/>
                <rect x="14" y="4" width="6" height="8" rx="1" fill="#334155"/>
                <circle cx="5" cy="14" r="2.5" fill="#1e293b"/>
                <circle cx="5" cy="14" r="1" fill="#94a3b8"/>
                <circle cx="16" cy="14" r="2.5" fill="#1e293b"/>
                <circle cx="16" cy="14" r="1" fill="#94a3b8"/>
              </svg>
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            </div>
            <div className="flex flex-1 items-center justify-between">
              <span className="font-medium text-foreground">Detenido</span>
              <span className="font-semibold text-blue-600">{stats.stopped}</span>
            </div>
          </div>

          {/* Pérdida temporal */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="2" width="20" height="12" rx="2" fill="#1e293b"/>
                <rect x="14" y="4" width="6" height="8" rx="1" fill="#334155"/>
                <circle cx="5" cy="14" r="2.5" fill="#1e293b"/>
                <circle cx="5" cy="14" r="1" fill="#94a3b8"/>
                <circle cx="16" cy="14" r="2.5" fill="#1e293b"/>
                <circle cx="16" cy="14" r="1" fill="#94a3b8"/>
              </svg>
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />
            </div>
            <div className="flex flex-1 items-center justify-between">
              <span className="font-medium text-foreground">Pérdida temporal</span>
              <span className="font-semibold text-amber-600">{stats.tempLoss}</span>
            </div>
          </div>

          {/* Sin conexión */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="2" width="20" height="12" rx="2" fill="#1e293b"/>
                <rect x="14" y="4" width="6" height="8" rx="1" fill="#334155"/>
                <circle cx="5" cy="14" r="2.5" fill="#1e293b"/>
                <circle cx="5" cy="14" r="1" fill="#94a3b8"/>
                <circle cx="16" cy="14" r="2.5" fill="#1e293b"/>
                <circle cx="16" cy="14" r="1" fill="#94a3b8"/>
              </svg>
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
            </div>
            <div className="flex flex-1 items-center justify-between">
              <span className="font-medium text-foreground">Sin conexión</span>
              <span className="font-semibold text-red-600">{stats.offline}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 border-t pt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Total</span>
          <span className="text-sm font-bold text-foreground">{vehicles.length}</span>
        </div>
      </div>
    </div>
  );
}
