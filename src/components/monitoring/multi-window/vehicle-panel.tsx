"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { X, MapPin, Clock, Maximize2, Minimize2, SatelliteDish } from "lucide-react";
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
 * Formatea timestamp para mostrar. Si es invalido (vehiculo sin reporte GPS)
 * devuelve null para que el componente sepa que debe mostrar el estado "sin señal".
 */
function formatTime(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Formatea coordenadas. Devuelve null si son invalidas (0,0 o no-finitas)
 * que es la señal tipica de vehiculo sin GPS activo.
 */
function formatCoords(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // 0,0 es el "null island" — ningun vehiculo real opera ahi, asi que lo tratamos como sin señal
  if (lat === 0 && lng === 0) return null;
  return `${(lat as number).toFixed(5)}, ${(lng as number).toFixed(5)}`;
}

/**
 * Detecta si el vehiculo realmente no tiene señal GPS activa.
 * Criterios: coords invalidas/0,0 + timestamp invalido/vacio.
 */
function hasNoGpsSignal(vehicle: TrackedVehicle): boolean {
  const coords = formatCoords(vehicle.position?.lat, vehicle.position?.lng);
  const time = formatTime(vehicle.lastUpdate);
  return coords === null && time === null;
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

  // Detecta si el vehiculo no tiene senal GPS (no hay dispositivo o nunca ha reportado)
  const noGps = hasNoGpsSignal(vehicle);
  const coordsStr = formatCoords(vehicle.position?.lat, vehicle.position?.lng);
  const timeStr = formatTime(vehicle.lastUpdate);

  // Determine if vehicle has active alert (speed > 80 or disconnected)
  // Si no tiene GPS no mostramos borde rojo de alerta porque no es "algo esta mal en la ruta",
  // es "no hay data que monitorear" — estado distinto, UX distinto.
  const hasAlert = !noGps && (vehicle.speed > 80 || vehicle.connectionStatus === "disconnected");

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

      {/* Mini mapa — solo si hay GPS. Si no, placeholder visual amigable */}
      {noGps ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 bg-muted/40 px-4 text-center",
            isFullscreen ? "h-[400px]" : "h-[150px]"
          )}
        >
          <SatelliteDish className="h-8 w-8 text-muted-foreground/60" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-muted-foreground">Sin señal GPS</p>
            <p className="text-[10px] text-muted-foreground/80">
              Este vehículo no tiene dispositivo GPS activo<br />
              o aún no ha reportado su posición
            </p>
          </div>
        </div>
      ) : (
        <VehicleMiniMap
          position={vehicle.position}
          movementStatus={vehicle.movementStatus}
          connectionStatus={vehicle.connectionStatus}
          className={isFullscreen ? "h-[400px]" : undefined}
        />
      )}

      {/* Info */}
      <div className="flex-1 space-y-2 p-3">
        {/* Estado de movimiento + Sparkline (solo si hay GPS) */}
        {!noGps && (
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
        )}

        {/* Posición */}
        <div className="flex items-start gap-1.5 text-xs">
          <MapPin className="mt-0.5 h-3 w-3 text-muted-foreground" />
          {coordsStr ? (
            <span className="font-mono text-muted-foreground">{coordsStr}</span>
          ) : (
            <span className="italic text-muted-foreground/70">Sin posición</span>
          )}
        </div>

        {/* Última actualización */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeStr ? (
            <span>Actualizado: {timeStr}</span>
          ) : (
            <span className="italic text-muted-foreground/70">Nunca ha reportado</span>
          )}
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
