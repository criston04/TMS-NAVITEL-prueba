"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { VehiclePosition, MovementStatus, RetransmissionStatus } from "@/types/monitoring";

interface VehicleMiniMapProps {
  /** Posición del vehículo */
  position: VehiclePosition;
  /** ID del vehículo */
  vehicleId?: string;
  
  movementStatus?: MovementStatus;
  /** Estado de conexión */
  connectionStatus?: RetransmissionStatus;
  /** Clase adicional */
  className?: string;
}

/**
 * Obtiene el color según el estado
 */
function getStatusColor(movementStatus: MovementStatus, connectionStatus: RetransmissionStatus): string {
  if (connectionStatus === "disconnected") return "#ef4444"; // red
  if (connectionStatus === "temporary_loss") return "#f59e0b"; // amber
  if (movementStatus === "moving") return "#10b981"; // emerald
  return "#3b82f6"; // blue
}

/**
 * Mini mapa con Leaflet para panel de vehículo
 */
export function VehicleMiniMap({
  position,
  movementStatus = "stopped",
  connectionStatus = "online",
  className,
}: VehicleMiniMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const statusColor = getStatusColor(movementStatus, connectionStatus);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initMap = async () => {
      const leafletModule = await import("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (leafletModule.default || leafletModule) as any;

      // Verificar que el contenedor no tenga ya un mapa
      if (mapContainerRef.current && (mapContainerRef.current as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) {
        return;
      }

      const map = L.map(mapContainerRef.current!, {
        center: [position.lat, position.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      
      // Invalidar tamaño después de que el contenedor se estabilice
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
      
      setIsMapReady(true);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Observar cambios de tamaño del contenedor
  useEffect(() => {
    if (!mapContainerRef.current || !mapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        // Pequeño delay para asegurar que el contenedor ya tiene el nuevo tamaño
        setTimeout(() => {
          mapRef.current.invalidateSize();
        }, 50);
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isMapReady]);

  // Actualizar marcador y posición
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const updateMarker = async () => {
      const leafletModule = await import("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (leafletModule.default || leafletModule) as any;
      const map = mapRef.current;

      // Crear icono SVG del camión
      const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="${statusColor}" opacity="0.2"/>
        <g transform="translate(6, 10)">
          <rect x="0" y="2" width="18" height="10" rx="2" fill="#1e293b"/>
          <rect x="12" y="3" width="5" height="8" rx="1" fill="#334155"/>
          <circle cx="4" cy="12" r="2.5" fill="#1e293b"/>
          <circle cx="14" cy="12" r="2.5" fill="#1e293b"/>
        </g>
        <circle cx="30" cy="8" r="5" fill="${statusColor}" stroke="white" stroke-width="1.5"/>
      </svg>`;

      const icon = L.divIcon({
        html: iconSvg,
        className: "vehicle-mini-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([position.lat, position.lng]);
        markerRef.current.setIcon(icon);
      } else {
        markerRef.current = L.marker([position.lat, position.lng], { icon }).addTo(map);
      }

      // Auto-seguimiento: siempre centrar el mapa en el vehículo con animación suave
      map.flyTo([position.lat, position.lng], map.getZoom(), {
        animate: true,
        duration: 1.0,
      });
    };

    updateMarker();
  }, [position.lat, position.lng, statusColor, isMapReady]);

  // Fallback si el mapa no carga
  const statusColorClass = connectionStatus === "online"
    ? movementStatus === "moving" ? "text-emerald-500" : "text-blue-500"
    : connectionStatus === "temporary_loss"
    ? "text-amber-500"
    : "text-red-500";

  return (
    <div className={cn(
      "relative h-[150px] w-full overflow-hidden rounded-md bg-muted/50",
      className
    )}>
      {/* Contenedor del mapa */}
      <div ref={mapContainerRef} className="absolute inset-0" />
      
      {/* Overlay con info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pointer-events-none">
        <div className="flex items-center justify-between text-white text-xs">
          <span className="font-mono">
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </span>
          <span className="flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", 
              connectionStatus === "online" && movementStatus === "moving" && "bg-emerald-400",
              connectionStatus === "online" && movementStatus !== "moving" && "bg-blue-400",
              connectionStatus === "temporary_loss" && "bg-amber-400",
              connectionStatus === "disconnected" && "bg-red-400"
            )} />
            {position.speed} km/h
          </span>
        </div>
      </div>

      {/* Fallback si no hay mapa */}
      {!isMapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <MapPin className={cn("h-8 w-8", statusColorClass)} />
          <div className="text-center text-xs text-muted-foreground">
            <p className="font-mono">
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </p>
            <p>{position.speed} km/h</p>
          </div>
        </div>
      )}
    </div>
  );
}

