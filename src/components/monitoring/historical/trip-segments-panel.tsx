"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { 
  ArrowRight, 
  Clock, 
  MapPin, 
  Route, 
  Gauge, 
  CirclePause 
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoricalRoutePoint, TripSegment } from "@/types/monitoring";

interface TripSegmentsPanelProps {
  /** Puntos de la ruta */
  points: HistoricalRoutePoint[];
  /** Callback al seleccionar un segmento (navegar al punto) */
  onSegmentSelect?: (segment: TripSegment) => void;
  /** Clase adicional */
  className?: string;
}

/**
 * Formatea duración en segundos a texto legible
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(secs).padStart(2, "0")}s`;
  }
  return `${secs}s`;
}

/**
 * Formatea hora
 */
function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Genera segmentos de viaje a partir de puntos de ruta
 */
function generateTripSegments(points: HistoricalRoutePoint[]): TripSegment[] {
  if (points.length < 2) return [];

  const segments: TripSegment[] = [];
  let segmentIndex = 0;
  let segmentStart = 0;
  let currentType: "moving" | "stopped" = points[0].isStopped ? "stopped" : "moving";
  let moveCounter = 0;
  let stopCounter = 0;

  for (let i = 1; i <= points.length; i++) {
    const point = i < points.length ? points[i] : null;
    const isNewType = point === null || (point.isStopped ? "stopped" : "moving") !== currentType;

    if (isNewType) {
      // Cerrar segmento actual
      const startPoint = points[segmentStart];
      const endPoint = points[i - 1];
      const startTime = new Date(startPoint.timestamp).getTime();
      const endTime = new Date(endPoint.timestamp).getTime();
      const durationSeconds = (endTime - startTime) / 1000;

      // Calcular stats del segmento
      const segmentPoints = points.slice(segmentStart, i);
      const movingPoints = segmentPoints.filter(p => !p.isStopped);
      const speeds = movingPoints.map(p => p.speed);
      const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
      const distanceKm = endPoint.distanceFromStart - startPoint.distanceFromStart;

      let label: string;
      if (currentType === "moving") {
        moveCounter++;
        label = `Tramo ${moveCounter}`;
      } else {
        stopCounter++;
        label = `Parada ${stopCounter}`;
      }

      segments.push({
        index: segmentIndex,
        type: currentType,
        startPointIndex: segmentStart,
        endPointIndex: i - 1,
        startCoords: { lat: startPoint.lat, lng: startPoint.lng },
        endCoords: { lat: endPoint.lat, lng: endPoint.lng },
        durationSeconds: Math.max(durationSeconds, 0),
        distanceKm: Math.max(distanceKm, 0),
        avgSpeedKmh: Math.round(avgSpeed),
        maxSpeedKmh: Math.round(maxSpeed),
        startTime: startPoint.timestamp,
        endTime: endPoint.timestamp,
        label,
      });

      segmentIndex++;
      segmentStart = i;
      if (point) {
        currentType = point.isStopped ? "stopped" : "moving";
      }
    }
  }

  return segments;
}

/**
 * Panel que muestra los segmentos de viaje (tramos y paradas)
 * con duración, distancia y tiempo
 */
export function TripSegmentsPanel({
  points,
  onSegmentSelect,
  className,
}: TripSegmentsPanelProps) {
  const segments = useMemo(() => generateTripSegments(points), [points]);

  const totalMoving = segments.filter(s => s.type === "moving");
  const totalStopped = segments.filter(s => s.type === "stopped");

  if (segments.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Route className="h-4 w-4" />
          Segmentación de Viaje
        </h3>
        <span className="text-xs text-muted-foreground">
          {totalMoving.length} tramos • {totalStopped.length} paradas
        </span>
      </div>

      {/* Lista de segmentos */}
      <ScrollArea className="max-h-[320px]">
        <div className="space-y-1.5 pr-2">
          {segments.map((segment) => (
            <button
              key={segment.index}
              type="button"
              className={cn(
                "w-full rounded-lg border p-2.5 text-left transition-all duration-200",
                "hover:bg-accent/50 hover:shadow-sm active:scale-[0.99]",
                segment.type === "moving" 
                  ? "border-emerald-200 dark:border-emerald-800/40" 
                  : "border-amber-200 dark:border-amber-800/40"
              )}
              onClick={() => onSegmentSelect?.(segment)}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {/* Icono tipo */}
                {segment.type === "moving" ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <CirclePause className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                )}
                
                {/* Etiqueta */}
                <span className={cn(
                  "text-xs font-semibold",
                  segment.type === "moving" 
                    ? "text-emerald-700 dark:text-emerald-400" 
                    : "text-amber-700 dark:text-amber-400"
                )}>
                  {segment.label}
                </span>

                {/* Hora */}
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                  {formatTime(segment.startTime)}
                  {segment.startTime !== segment.endTime && ` → ${formatTime(segment.endTime)}`}
                </span>
              </div>

              {/* Stats del segmento */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                {/* Duración */}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(segment.durationSeconds)}
                </span>

                {/* Distancia (solo tramos en movimiento) */}
                {segment.type === "moving" && segment.distanceKm > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {segment.distanceKm.toFixed(2)} km
                  </span>
                )}

                {/* Velocidad promedio (solo movimiento) */}
                {segment.type === "moving" && (
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    Prom: {segment.avgSpeedKmh} km/h
                    {segment.maxSpeedKmh > 0 && ` • Máx: ${segment.maxSpeedKmh} km/h`}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
