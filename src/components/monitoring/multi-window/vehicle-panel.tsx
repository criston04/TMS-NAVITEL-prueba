"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { X, MapPin, Clock, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionStatusBadge } from "../common/connection-status-badge";
import { MovementStatusBadge } from "../common/movement-status-badge";
import { SpeedSparkline } from "./speed-sparkline";
import type { TrackedVehicle } from "@/types/monitoring";

// Dynamic import del mini mapa
const VehicleMiniMap = dynamic(
  () => import("./vehicle-mini-map").then((mod) => mod.VehicleMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[150px] w-full animate-pulse rounded-md bg-muted" />
    ),
  }
);

interface VehiclePanelProps {
  /** Vehículo a mostrar */
  vehicle: TrackedVehicle;
  /** Historial de velocidades para sparkline */
  speedHistory?: number[];
  /** Callback al remover */
  onRemove: (vehicleId: string) => void;
  /** Clase adicional */
  className?: string;
}

/**
 * Formatea timestamp para mostrar
 */
function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Formatea coordenadas
 */
function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Panel individual de vehículo para la vista multiventana
 */
export function VehiclePanel({
  vehicle,
  speedHistory,
  onRemove,
  className,
}: VehiclePanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Determine if vehicle has active alert (speed > 80 or disconnected)
  const hasAlert = vehicle.speed > 80 || vehicle.connectionStatus === "disconnected";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md min-h-[400px]",
        hasAlert && "border-red-500/50 ring-1 ring-red-500/20",
        isFullscreen && "fixed inset-4 z-[10001] shadow-2xl",
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between border-b px-3 py-2",
        hasAlert ? "bg-red-500/5" : "bg-muted/30"
      )}>
        <div className="flex items-center gap-2">
          <span className="font-bold">{vehicle.plate}</span>
          <ConnectionStatusBadge 
            status={vehicle.connectionStatus} 
            showText={false}
            size="sm"
          />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Minimizar" : "Pantalla completa"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onRemove(vehicle.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Mini mapa */}
      <VehicleMiniMap
        position={vehicle.position}
        movementStatus={vehicle.movementStatus}
        connectionStatus={vehicle.connectionStatus}
        className={isFullscreen ? "h-[400px]" : undefined}
      />

      {/* Info */}
      <div className="flex-1 space-y-2 p-3">
        {/* Estado de movimiento + Sparkline */}
        <div className="flex items-center justify-between">
          <MovementStatusBadge
            status={vehicle.movementStatus}
            speed={vehicle.position.speed}
            size="sm"
          />
          {speedHistory && speedHistory.length > 1 && (
            <SpeedSparkline speeds={speedHistory} speedLimit={80} />
          )}
        </div>

        {/* Posición */}
        <div className="flex items-start gap-1.5 text-xs">
          <MapPin className="mt-0.5 h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-muted-foreground">
            {formatCoords(vehicle.position.lat, vehicle.position.lng)}
          </span>
        </div>

        {/* Última actualización */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Actualizado: {formatTime(vehicle.lastUpdate)}</span>
        </div>

        {/* Orden activa */}
        {vehicle.activeOrderNumber && (
          <div className="rounded bg-primary/10 px-2 py-1 text-xs">
            <span className="font-medium text-primary">
              Orden: {vehicle.activeOrderNumber}
            </span>
          </div>
        )}

        {/* Referencia y tipo de servicio */}
        {(vehicle.reference || vehicle.serviceType) && (
          <div className="flex flex-wrap gap-1">
            {vehicle.reference && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                Ref: {vehicle.reference}
              </span>
            )}
            {vehicle.serviceType && (
              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
                {vehicle.serviceType}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
