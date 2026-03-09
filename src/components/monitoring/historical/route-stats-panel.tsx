"use client";

import { cn } from "@/lib/utils";
import { 
  Route, 
  Gauge, 
  Timer, 
  Square,
  MapPin,
  Activity
} from "lucide-react";
import { formatDuration } from "../common/duration-display";
import type { HistoricalRouteStats } from "@/types/monitoring";

interface RouteStatsPanelProps {
  /** Estadísticas de la ruta */
  stats: HistoricalRouteStats;
  /** Clase adicional */
  className?: string;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  subValue?: string;
}

function StatItem({ icon, label, value, subValue }: StatItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <div className="rounded-md bg-primary/10 p-2 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Panel con estadísticas de la ruta histórica
 */
export function RouteStatsPanel({
  stats,
  className,
}: RouteStatsPanelProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="font-semibold">Estadísticas del recorrido</h3>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Distancia total */}
        <StatItem
          icon={<Route className="h-4 w-4" />}
          label="Distancia total"
          value={`${stats.totalDistanceKm.toFixed(2)} km`}
        />

        {/* Velocidad máxima */}
        <StatItem
          icon={<Gauge className="h-4 w-4" />}
          label="Velocidad máxima"
          value={`${stats.maxSpeedKmh} km/h`}
          subValue={`Promedio: ${stats.avgSpeedKmh} km/h`}
        />

        {/* Tiempo en movimiento */}
        <StatItem
          icon={<Timer className="h-4 w-4" />}
          label="Tiempo en movimiento"
          value={formatDuration(stats.movingTimeSeconds, "compact")}
        />

        {/* Tiempo detenido */}
        <StatItem
          icon={<Square className="h-4 w-4" />}
          label="Tiempo detenido"
          value={formatDuration(stats.stoppedTimeSeconds, "compact")}
          subValue={`${stats.totalStops} parada(s)`}
        />

        {/* Total de puntos */}
        <StatItem
          icon={<MapPin className="h-4 w-4" />}
          label="Puntos GPS"
          value={stats.totalPoints.toLocaleString()}
        />

        {/* Tiempo total */}
        <StatItem
          icon={<Activity className="h-4 w-4" />}
          label="Duración total"
          value={formatDuration(stats.totalTimeSeconds, "compact")}
        />
      </div>

      {/* Resumen visual */}
      <div className="rounded-lg bg-muted/50 p-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Distribución del tiempo</span>
          <span className="font-medium">
            {formatDuration(stats.totalTimeSeconds, "compact")}
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div
            className="bg-emerald-500 transition-all"
            style={{
              width: `${(stats.movingTimeSeconds / stats.totalTimeSeconds) * 100}%`,
            }}
            title={`En movimiento: ${formatDuration(stats.movingTimeSeconds, "compact")}`}
          />
          <div
            className="bg-amber-500 transition-all"
            style={{
              width: `${(stats.stoppedTimeSeconds / stats.totalTimeSeconds) * 100}%`,
            }}
            title={`Detenido: ${formatDuration(stats.stoppedTimeSeconds, "compact")}`}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>En movimiento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Detenido</span>
          </div>
        </div>
      </div>
    </div>
  );
}
