"use client";

import { cn } from "@/lib/utils";
import { Clock, Gauge, Navigation, Square, MapPin } from "lucide-react";
import type { HistoricalRoutePoint } from "@/types/monitoring";

interface RoutePointTooltipProps {
  /** Punto de la ruta */
  point: HistoricalRoutePoint;
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
 * Formatea duración de parada
 */
function formatStopDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seg`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Tooltip con información detallada de un punto de ruta
 */
export function RoutePointTooltip({
  point,
  className,
}: RoutePointTooltipProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-popover p-3 shadow-lg",
        className
      )}
    >
      {/* Hora */}
      <div className="mb-2 flex items-center gap-2 border-b pb-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{formatTime(point.timestamp)}</span>
        {point.isStopped && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Detenido
          </span>
        )}
      </div>

      {/* Info del punto */}
      <div className="space-y-1.5 text-sm">
        {/* Velocidad */}
        <div className="flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            <span className="font-medium">{point.speed}</span> km/h
          </span>
        </div>

        {/* Dirección */}
        <div className="flex items-center gap-2">
          <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            <span className="font-medium">{point.heading}</span>°
          </span>
        </div>

        {/* Coordenadas */}
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-xs">
            {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
          </span>
        </div>

        {/* Distancia recorrida */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs">
            Recorrido: {point.distanceFromStart.toFixed(2)} km
          </span>
        </div>

        {/* Duración de parada */}
        {point.isStopped && point.stopDuration && (
          <div className="mt-2 flex items-center gap-2 rounded bg-amber-50 px-2 py-1 dark:bg-amber-900/20">
            <Square className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs text-amber-700 dark:text-amber-400">
              Parada: {formatStopDuration(point.stopDuration)}
            </span>
          </div>
        )}

        {/* Evento especial */}
        {point.event && (
          <div className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            {point.event.description}
          </div>
        )}
      </div>

      {/* Índice del punto */}
      <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
        Punto #{point.index + 1}
      </div>
    </div>
  );
}
