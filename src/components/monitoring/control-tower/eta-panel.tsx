"use client";

import { cn } from "@/lib/utils";
import { Navigation, Clock, MapPin, AlertTriangle, TrendingUp } from "lucide-react";
import type { DynamicETA } from "@/types/monitoring";

interface ETAPanelProps {
  eta: DynamicETA | null;
  className?: string;
}

/**
 * Panel de ETA dinámico para un vehículo
 */
export function ETAPanel({ eta, className }: ETAPanelProps) {
  if (!eta) return null;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2",
        eta.isDelayed
          ? "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10"
          : "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/10",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Navigation className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">ETA dinámico</span>
        </div>
        {eta.isDelayed && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            +{eta.delayMinutes} min
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {eta.milestoneName}
          </span>
          <span className="font-mono font-semibold">{eta.distanceRemainingKm.toFixed(1)} km</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            Llegada estimada
          </span>
          <span className="font-semibold">{formatTime(eta.estimatedArrival)}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Vel. promedio
          </span>
          <span className="font-mono">{eta.avgSpeedKmh.toFixed(0)} km/h</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-right">
        Recalculado: {formatTime(eta.recalculatedAt)}
      </p>
    </div>
  );
}
