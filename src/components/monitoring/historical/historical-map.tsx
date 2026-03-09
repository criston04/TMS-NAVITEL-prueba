"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Clock, PersonStanding } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "@/styles/leaflet-custom.css";
import type { HistoricalRoute, HistoricalRoutePoint } from "@/types/monitoring";

interface HistoricalMapProps {
  /** Ruta a mostrar */
  route: HistoricalRoute;
  /** Punto actual (para reproducción) */
  currentPoint?: HistoricalRoutePoint | null;
  /** Índice del punto actual */
  currentIndex?: number;
  /** Clase adicional */
  className?: string;
}

/**
 * Formatea timestamp
 */
function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Obtiene color según velocidad
 */
function getSpeedColor(speed: number): string {
  if (speed === 0) return "#3b82f6"; // blue - detenido
  if (speed < 30) return "#22c55e"; // green - lento
  if (speed < 60) return "#eab308"; // yellow - moderado
  if (speed < 80) return "#f97316"; // orange - rápido
  return "#ef4444"; // red - muy rápido
}

/**
 * Mapa de ruta histórica con Leaflet
 */
export function HistoricalMap({
  route,
  currentPoint,
  currentIndex = 0,
  className,
}: HistoricalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progressPolylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const isInitializingRef = useRef(false);

  const startPoint = route.points[0];
  const endPoint = route.points[route.points.length - 1];
  const displayPoint = currentPoint || startPoint;

  // Coordenadas de la ruta
  const routeCoords = useMemo(() => 
    route.points.map(p => [p.lat, p.lng] as [number, number]),
    [route.points]
  );

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || isInitializingRef.current || mapRef.current) return;

    isInitializingRef.current = true;

    const initMap = async () => {
      const leafletModule = await import("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (leafletModule.default || leafletModule) as any;
      leafletRef.current = L;

      const container = mapContainerRef.current;
      if (!container) return;

      // Verificar si ya tiene mapa
      if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) {
        isInitializingRef.current = false;
        return;
      }

      // Calcular centro de la ruta
      const bounds = L.latLngBounds(routeCoords);
      const center = bounds.getCenter();

      const map = L.map(container, {
        center: [center.lat, center.lng],
        zoom: 13,
        zoomControl: true,
      });

      // Tiles CartoDB Positron
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);

      mapRef.current = map;

      // Dibujar ruta completa (gris de fondo)
      polylineRef.current = L.polyline(routeCoords, {
        color: "#94a3b8",
        weight: 4,
        opacity: 0.5,
      }).addTo(map);

      // Polyline de progreso (coloreado)
      progressPolylineRef.current = L.polyline([], {
        color: "#00c9ff",
        weight: 5,
        opacity: 0.9,
      }).addTo(map);

      // Marcador de inicio (A - verde)
      const startIcon = L.divIcon({
        html: `<div class="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg ring-2 ring-white">A</div>`,
        className: "start-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      startMarkerRef.current = L.marker([startPoint.lat, startPoint.lng], { icon: startIcon })
        .addTo(map)
        .bindPopup(`<div style="padding:4px;min-width:160px"><b>Inicio</b><br>${formatTime(startPoint.timestamp)}<br>${startPoint.speed} km/h<br><a href="https://www.google.com/maps?layer=c&cbll=${startPoint.lat},${startPoint.lng}" target="_blank" rel="noopener noreferrer" style="color:#d97706;font-size:12px">🚶 Street View</a></div>`);

      // Marcador de fin (B - rojo)
      const endIcon = L.divIcon({
        html: `<div class="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-lg ring-2 ring-white">B</div>`,
        className: "end-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      endMarkerRef.current = L.marker([endPoint.lat, endPoint.lng], { icon: endIcon })
        .addTo(map)
        .bindPopup(`<div style="padding:4px;min-width:160px"><b>Fin</b><br>${formatTime(endPoint.timestamp)}<br>${endPoint.speed} km/h<br><a href="https://www.google.com/maps?layer=c&cbll=${endPoint.lat},${endPoint.lng}" target="_blank" rel="noopener noreferrer" style="color:#d97706;font-size:12px">🚶 Street View</a></div>`);

      // Ajustar vista a la ruta
      map.fitBounds(bounds, { padding: [50, 50] });

      setIsMapReady(true);
      isInitializingRef.current = false;
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        polylineRef.current = null;
        progressPolylineRef.current = null;
        startMarkerRef.current = null;
        endMarkerRef.current = null;
        currentMarkerRef.current = null;
        setIsMapReady(false);
        isInitializingRef.current = false;
      }
    };
  }, [route.vehicleId]);

  // Actualizar polyline cuando cambia la ruta
  useEffect(() => {
    if (!isMapReady || !polylineRef.current || !mapRef.current) return;

    const L = leafletRef.current;
    if (!L) return;

    polylineRef.current.setLatLngs(routeCoords);
    
    const bounds = L.latLngBounds(routeCoords);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  }, [routeCoords, isMapReady]);

  // Actualizar marcador actual durante reproducción
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    const L = leafletRef.current;
    if (!L || !displayPoint) return;

    const map = mapRef.current;
    const speed = displayPoint.speed;
    const color = getSpeedColor(speed);

    // Crear/actualizar marcador del punto actual
    const currentIcon = L.divIcon({
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="${color}" opacity="0.3"/>
        <circle cx="20" cy="20" r="12" fill="${color}" opacity="0.5"/>
        <g transform="translate(8, 12)">
          <rect x="0" y="2" width="18" height="10" rx="2" fill="#1e293b"/>
          <rect x="12" y="3" width="5" height="8" rx="1" fill="#334155"/>
          <circle cx="4" cy="12" r="2" fill="#1e293b"/>
          <circle cx="14" cy="12" r="2" fill="#1e293b"/>
        </g>
      </svg>`,
      className: "current-point-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([displayPoint.lat, displayPoint.lng]);
      currentMarkerRef.current.setIcon(currentIcon);
    } else {
      currentMarkerRef.current = L.marker([displayPoint.lat, displayPoint.lng], { 
        icon: currentIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    }

    // Actualizar polyline de progreso
    if (progressPolylineRef.current && currentIndex > 0) {
      const progressCoords = routeCoords.slice(0, currentIndex + 1);
      progressPolylineRef.current.setLatLngs(progressCoords);
    }

    // Centrar en el punto actual si está reproduciéndose
    if (currentPoint) {
      map.panTo([displayPoint.lat, displayPoint.lng], { animate: true, duration: 0.3 });
    }
  }, [displayPoint, currentIndex, isMapReady, currentPoint, routeCoords]);

  return (
    <div className={cn("h-full w-full relative overflow-hidden", className)}>
      {/* Contenedor del mapa */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Leyenda */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Leyenda</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
              A
            </div>
            <span>Inicio: {startPoint ? formatTime(startPoint.timestamp) : "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              B
            </div>
            <span>Fin: {endPoint ? formatTime(endPoint.timestamp) : "-"}</span>
          </div>
        </div>
        {/* Escala de velocidad */}
        <div className="mt-3 pt-2 border-t">
          <p className="text-[10px] text-muted-foreground mb-1">Velocidad</p>
          <div className="flex gap-1">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[10px]">0</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[10px]">&lt;30</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-[10px]">&lt;60</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-[10px]">&lt;80</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[10px]">80+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info del vehículo */}
      <div className="absolute right-4 top-4 z-[1000] rounded-lg border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-xs text-muted-foreground">Vehículo</p>
        <p className="font-bold">{route.vehiclePlate}</p>
      </div>

      {/* Info del punto actual (durante reproducción) */}
      {displayPoint && (
        <div className="absolute right-4 top-20 z-[1000] rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-sm min-w-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-3 rounded-full animate-pulse" style={{ backgroundColor: getSpeedColor(displayPoint.speed) }} />
            <span className="text-xs font-medium">
              {currentPoint ? `Punto ${currentIndex + 1}/${route.points.length}` : "Posición inicial"}
            </span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-mono text-foreground">
              {displayPoint.lat.toFixed(6)}, {displayPoint.lng.toFixed(6)}
            </p>
            <p className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(displayPoint.timestamp)}
            </p>
            <p className="text-foreground font-semibold">{displayPoint.speed} km/h</p>
          </div>
          {/* Botón Street View */}
          <a
            href={`https://www.google.com/maps?layer=c&cbll=${displayPoint.lat},${displayPoint.lng}&cbp=,,${displayPoint.heading},,`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-100 px-2 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
          >
            <PersonStanding className="h-3.5 w-3.5" />
            Street View
          </a>
        </div>
      )}
    </div>
  );
}
