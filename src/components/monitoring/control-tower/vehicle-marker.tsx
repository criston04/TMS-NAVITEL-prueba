"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Navigation, Square } from "lucide-react";
import type { TrackedVehicle } from "@/types/monitoring";

interface VehicleMarkerProps {
  /** Vehículo a mostrar */
  vehicle: TrackedVehicle;
  /** Si está seleccionado */
  isSelected?: boolean;
  /** Callback al hacer clic */
  onClick?: (vehicle: TrackedVehicle) => void;
  /** Clase adicional */
  className?: string;
}

/**
 * Obtiene el color según el estado de conexión
 */
function getMarkerColor(vehicle: TrackedVehicle): string {
  switch (vehicle.connectionStatus) {
    case "online":
      return vehicle.movementStatus === "moving" 
        ? "bg-emerald-500 border-emerald-600" 
        : "bg-blue-500 border-blue-600";
    case "temporary_loss":
      return "bg-amber-500 border-amber-600";
    case "disconnected":
      return "bg-red-500 border-red-600";
  }
}

/**
 * Componente de marcador de vehículo (para uso fuera de Leaflet)
 * En el mapa real se usaría DivIcon de Leaflet
 */
export function VehicleMarker({
  vehicle,
  isSelected = false,
  onClick,
  className,
}: VehicleMarkerProps) {
  const markerColor = useMemo(() => getMarkerColor(vehicle), [vehicle]);
  
  const rotation = vehicle.position.heading;
  const isMoving = vehicle.movementStatus === "moving";

  return (
    <button
      onClick={() => onClick?.(vehicle)}
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 p-1.5 shadow-lg transition-all",
        markerColor,
        isSelected && "ring-2 ring-white ring-offset-2",
        isMoving && "animate-pulse",
        className
      )}
      title={`${vehicle.plate} - ${vehicle.connectionStatus}`}
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {isMoving ? (
        <Navigation className="h-4 w-4 text-white" />
      ) : (
        <Square className="h-3 w-3 text-white" />
      )}
      
      {/* Etiqueta de placa */}
      <span 
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-background px-1.5 py-0.5 text-xs font-medium shadow"
        style={{
          transform: `translateX(-50%) rotate(-${rotation}deg)`,
        }}
      >
        {vehicle.plate}
      </span>
    </button>
  );
}

/**
 * Genera el HTML para usar como DivIcon en Leaflet
 */
export function getVehicleMarkerHTML(vehicle: TrackedVehicle, isSelected: boolean = false): string {
  const colorClass = vehicle.connectionStatus === "online"
    ? vehicle.movementStatus === "moving" ? "bg-emerald-500" : "bg-blue-500"
    : vehicle.connectionStatus === "temporary_loss"
    ? "bg-amber-500"
    : "bg-red-500";

  const selectedClass = isSelected ? "ring-2 ring-white ring-offset-2" : "";
  const animateClass = vehicle.movementStatus === "moving" ? "animate-pulse" : "";

  return `
    <div class="relative">
      <div 
        class="flex items-center justify-center rounded-full border-2 border-white p-1.5 shadow-lg ${colorClass} ${selectedClass} ${animateClass}"
        style="transform: rotate(${vehicle.position.heading}deg)"
      >
        <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${vehicle.movementStatus === "moving" 
            ? '<path d="M3 11l19-9-9 19-2-8-8-2z"/>' 
            : '<rect x="3" y="3" width="18" height="18" rx="2"/>'}
        </svg>
      </div>
      <span 
        class="absolute -bottom-5 left-1/2 whitespace-nowrap rounded bg-white px-1 py-0.5 text-[10px] font-medium shadow"
        style="transform: translateX(-50%) rotate(-${vehicle.position.heading}deg)"
      >
        ${vehicle.plate}
      </span>
    </div>
  `;
}
