"use client";

import { cn } from "@/lib/utils";
import { Check, Clock, MapPin, CircleDot } from "lucide-react";
import type { TrackedMilestone } from "@/types/monitoring";

interface MilestoneListProps {
  
  milestones: TrackedMilestone[];
  /** Índice del hito actual */
  currentIndex: number;
  /** Compacto (sin detalles) */
  compact?: boolean;
  /** Clase adicional */
  className?: string;
}

/**
 * Formatea hora para mostrar
 */
function formatTime(timestamp: string | undefined): string {
  if (!timestamp) return "--:--";
  return new Date(timestamp).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Obtiene configuración visual según el estado
 */
function getStatusConfig(status: TrackedMilestone["trackingStatus"]) {
  switch (status) {
    case "completed":
      return {
        icon: Check,
        bgColor: "bg-emerald-500",
        textColor: "text-emerald-600 dark:text-emerald-400",
        lineColor: "bg-emerald-500",
      };
    case "in_progress":
      return {
        icon: CircleDot,
        bgColor: "bg-blue-500 animate-pulse",
        textColor: "text-blue-600 dark:text-blue-400",
        lineColor: "bg-blue-500",
      };
    case "pending":
    default:
      return {
        icon: Clock,
        bgColor: "bg-muted",
        textColor: "text-muted-foreground",
        lineColor: "bg-muted",
      };
  }
}

/**
 * Lista de hitos con timeline vertical
 */
export function MilestoneList({
  milestones,
  currentIndex,
  compact = false,
  className,
}: MilestoneListProps) {
  if (milestones.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No hay hitos asignados
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {milestones.map((milestone, index) => {
        const config = getStatusConfig(milestone.trackingStatus);
        const Icon = config.icon;
        const isLast = index === milestones.length - 1;
        const isCurrent = index === currentIndex;

        return (
          <div key={milestone.id} className="relative flex gap-3">
            {/* Línea vertical */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[11px] top-6 w-0.5 h-full -translate-x-1/2",
                  index < currentIndex ? "bg-emerald-500" : "bg-muted"
                )}
              />
            )}

            {/* Icono */}
            <div
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                config.bgColor
              )}
            >
              <Icon className="h-3.5 w-3.5 text-white" />
            </div>

            {/* Contenido */}
            <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent && "text-primary"
                  )}
                >
                  {milestone.name}
                </span>
                {milestone.type === "origin" && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Origen
                  </span>
                )}
                {milestone.type === "destination" && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Destino
                  </span>
                )}
              </div>

              {!compact && (
                <>
                  {/* Dirección */}
                  {milestone.address && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {milestone.address}
                    </p>
                  )}

                  {/* Tiempos */}
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      Est: {formatTime(milestone.estimatedArrival)}
                    </span>
                    {milestone.actualArrival && (
                      <span className={config.textColor}>
                        Real: {formatTime(milestone.actualArrival)}
                      </span>
                    )}
                    {milestone.delayMinutes !== undefined && milestone.delayMinutes !== 0 && (
                      <span
                        className={cn(
                          "font-medium",
                          milestone.delayMinutes > 0
                            ? "text-amber-600"
                            : "text-emerald-600"
                        )}
                      >
                        {milestone.delayMinutes > 0 ? "+" : ""}
                        {milestone.delayMinutes} min
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
