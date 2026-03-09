"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Navigation } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RouteDeviation, HistoricalRoutePoint } from "@/types/monitoring";

interface RouteDeviationPanelProps {
  /** Puntos de la ruta real */
  realPoints: HistoricalRoutePoint[];
  /** Corredor planificado (waypoints en orden) */
  plannedWaypoints?: Array<{ lat: number; lng: number; name: string }>;
  /** Tolerancia en km para considerar desvío */
  toleranceKm?: number;
  /** Callback al seleccionar un desvío */
  onDeviationSelect?: (index: number) => void;
  className?: string;
}

/**
 * Calcula distancia Haversine entre 2 puntos en km
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Detecta desvíos de ruta comparando puntos reales con un corredor planificado
 */
function detectDeviations(
  realPoints: HistoricalRoutePoint[],
  plannedWaypoints: Array<{ lat: number; lng: number; name: string }>,
  toleranceKm: number
): RouteDeviation[] {
  if (plannedWaypoints.length < 2) return [];

  const deviations: RouteDeviation[] = [];
  const step = Math.max(1, Math.floor(realPoints.length / 100));

  realPoints
    .filter((_, i) => i % step === 0)
    .forEach((point) => {
      // Find minimum distance to any segment of the planned route
      let minDist = Infinity;
      for (let j = 0; j < plannedWaypoints.length; j++) {
        const wp = plannedWaypoints[j];
        const dist = haversineKm(point.lat, point.lng, wp.lat, wp.lng);
        if (dist < minDist) minDist = dist;
      }

      if (minDist > toleranceKm) {
        deviations.push({
          index: point.index,
          point: { lat: point.lat, lng: point.lng },
          distanceFromPlannedKm: minDist,
          timestamp: point.timestamp,
          severity: minDist > toleranceKm * 2 ? "major" : "minor",
        });
      }
    });

  return deviations;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Panel de detección y visualización de desvíos de ruta
 */
export function RouteDeviationPanel({
  realPoints,
  plannedWaypoints = [],
  toleranceKm = 0.5,
  onDeviationSelect,
  className,
}: RouteDeviationPanelProps) {
  const deviations = useMemo(
    () => detectDeviations(realPoints, plannedWaypoints, toleranceKm),
    [realPoints, plannedWaypoints, toleranceKm]
  );

  const majorCount = deviations.filter((d) => d.severity === "major").length;
  const minorCount = deviations.filter((d) => d.severity === "minor").length;

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="border-b px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Desvíos de ruta</span>
          </div>
          {deviations.length > 0 && (
            <span className="text-xs text-amber-500 font-medium">
              {deviations.length} desvíos
            </span>
          )}
        </div>
      </div>

      {plannedWaypoints.length < 2 ? (
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            No hay ruta planificada para comparar
          </p>
        </div>
      ) : deviations.length === 0 ? (
        <div className="p-4 text-center">
          <Navigation className="h-8 w-8 text-emerald-500 mx-auto mb-1" />
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Sin desvíos detectados
          </p>
          <p className="text-[10px] text-muted-foreground">
            Tolerancia: {toleranceKm} km
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex gap-3 px-3 py-2 border-b text-xs">
            {majorCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {majorCount} mayores
              </span>
            )}
            {minorCount > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="h-3 w-3" />
                {minorCount} menores
              </span>
            )}
          </div>

          <ScrollArea className="max-h-[200px]">
            <div className="p-2 space-y-1">
              {deviations.slice(0, 20).map((dev, i) => (
                <button
                  key={`${dev.index}-${i}`}
                  className={cn(
                    "w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors hover:bg-muted",
                    dev.severity === "major" ? "border-l-2 border-red-500" : "border-l-2 border-amber-500"
                  )}
                  onClick={() => onDeviationSelect?.(dev.index)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {formatTime(dev.timestamp)}
                    </span>
                    <span
                      className={cn(
                        "font-mono",
                        dev.severity === "major" ? "text-red-500" : "text-amber-500"
                      )}
                    >
                      +{dev.distanceFromPlannedKm.toFixed(2)} km
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
