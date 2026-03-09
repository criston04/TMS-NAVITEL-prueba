"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { MapPin, Clock } from "lucide-react";
import type { HistoricalRoutePoint } from "@/types/monitoring";

interface StopsHeatMapProps {
  points: HistoricalRoutePoint[];
  /** Velocidad mínima (km/h) para considerar parada */
  stopSpeedThreshold?: number;
  /** Tiempo mínimo (segundos) de permanencia para considerar parada */
  minStopDurationSec?: number;
  className?: string;
}

interface DetectedStop {
  lat: number;
  lng: number;
  startTime: string;
  endTime: string;
  durationMin: number;
  pointCount: number;
}

/**
 * Detecta paradas (zonas con velocidad ~0 prolongada)
 */
function detectStops(
  points: HistoricalRoutePoint[],
  speedThreshold: number,
  minDurationSec: number
): DetectedStop[] {
  if (points.length < 2) return [];

  const stops: DetectedStop[] = [];
  let stopStart: number | null = null;

  for (let i = 0; i < points.length; i++) {
    const speed = points[i].speed ?? 0;
    const isStopped = speed <= speedThreshold;

    if (isStopped && stopStart === null) {
      stopStart = i;
    } else if (!isStopped && stopStart !== null) {
      const startPt = points[stopStart];
      const endPt = points[i - 1];
      const durationMs =
        new Date(endPt.timestamp).getTime() - new Date(startPt.timestamp).getTime();
      const durationSec = durationMs / 1000;

      if (durationSec >= minDurationSec) {
        // Average location of stop
        const stopPoints = points.slice(stopStart, i);
        const avgLat = stopPoints.reduce((s, p) => s + p.lat, 0) / stopPoints.length;
        const avgLng = stopPoints.reduce((s, p) => s + p.lng, 0) / stopPoints.length;

        stops.push({
          lat: avgLat,
          lng: avgLng,
          startTime: startPt.timestamp,
          endTime: endPt.timestamp,
          durationMin: Math.round(durationSec / 60),
          pointCount: stopPoints.length,
        });
      }
      stopStart = null;
    }
  }

  // Check if still stopped at end
  if (stopStart !== null) {
    const startPt = points[stopStart];
    const endPt = points[points.length - 1];
    const durationMs =
      new Date(endPt.timestamp).getTime() - new Date(startPt.timestamp).getTime();
    const durationSec = durationMs / 1000;

    if (durationSec >= minDurationSec) {
      const stopPoints = points.slice(stopStart);
      const avgLat = stopPoints.reduce((s, p) => s + p.lat, 0) / stopPoints.length;
      const avgLng = stopPoints.reduce((s, p) => s + p.lng, 0) / stopPoints.length;

      stops.push({
        lat: avgLat,
        lng: avgLng,
        startTime: startPt.timestamp,
        endTime: endPt.timestamp,
        durationMin: Math.round(durationSec / 60),
        pointCount: stopPoints.length,
      });
    }
  }

  return stops;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Intensidad visual del punto según duración (para mapa de calor simplificado)
 */
function stopIntensity(durationMin: number): string {
  if (durationMin >= 60) return "bg-red-500/80";
  if (durationMin >= 30) return "bg-orange-500/70";
  if (durationMin >= 10) return "bg-amber-500/60";
  return "bg-yellow-500/50";
}

/**
 * Componente que muestra un mapa de calor simplificado de las paradas
 * (como lista visual con indicadores de intensidad)
 */
export function StopsHeatMap({
  points,
  stopSpeedThreshold = 3,
  minStopDurationSec = 120,
  className,
}: StopsHeatMapProps) {
  const stops = useMemo(
    () => detectStops(points, stopSpeedThreshold, minStopDurationSec),
    [points, stopSpeedThreshold, minStopDurationSec]
  );

  const totalStopMin = stops.reduce((s, st) => s + st.durationMin, 0);

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="border-b px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Paradas detectadas</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {stops.length} paradas • {totalStopMin} min total
          </span>
        </div>
      </div>

      {stops.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            No se detectaron paradas significativas
          </p>
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {stops.map((stop, i) => (
            <div
              key={`stop-${i}`}
              className="flex items-center gap-3 rounded px-2.5 py-2 hover:bg-muted/50 transition-colors"
            >
              {/* Heat indicator */}
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    stopIntensity(stop.durationMin)
                  )}
                >
                  <span className="text-[10px] font-bold text-white">
                    {stop.durationMin}m
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">
                    {formatTime(stop.startTime)} - {formatTime(stop.endTime)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
                </p>
              </div>

              {/* Duration bar */}
              <div className="flex-shrink-0 w-16">
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      stop.durationMin >= 60
                        ? "bg-red-500"
                        : stop.durationMin >= 30
                        ? "bg-orange-500"
                        : "bg-amber-500"
                    )}
                    style={{
                      width: `${Math.min(100, (stop.durationMin / Math.max(...stops.map((s) => s.durationMin))) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
