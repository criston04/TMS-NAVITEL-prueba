"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Route, MapPin, Clock, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import type { TrackedOrder, TrackedMilestone } from "@/types/monitoring";

interface RouteOverlayProps {
  /** Orden con ruta planificada */
  order: TrackedOrder;
  /** Color de la ruta */
  color?: string;
  /** Mostrar hitos */
  showMilestones?: boolean;
  /** Mostrar detalles de cada hito */
  showMilestoneDetails?: boolean;
  /** Clase adicional */
  className?: string;
}

/**
 * Extrae las coordenadas de la ruta desde los hitos para dibujar en el mapa.
 * Esta función puede usarse por componentes externos para obtener la polyline.
 */
export function getRouteCoordinates(order: TrackedOrder): [number, number][] {
  if (!order.milestones || order.milestones.length === 0) return [];
  
  return order.milestones
    .sort((a, b) => a.sequence - b.sequence)
    .map((m) => [m.coordinates.lat, m.coordinates.lng] as [number, number]);
}

/**
 * Obtiene el siguiente hito pendiente
 */
function getNextMilestone(milestones: TrackedMilestone[]): TrackedMilestone | null {
  const sorted = [...milestones].sort((a, b) => a.sequence - b.sequence);
  return sorted.find((m) => m.trackingStatus === "pending" || m.trackingStatus === "in_progress") ?? null;
}

/**
 * Icono según estado del hito
 */
function MilestoneStatusIcon({ status }: { status: TrackedMilestone["trackingStatus"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "in_progress":
      return <AlertCircle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

/**
 * Panel de información de ruta planificada.
 * Muestra progreso de hitos, ETA y estado de cada punto.
 * 
 * Para dibujar la ruta en el mapa, usar getRouteCoordinates() 
 * y pasarlo al componente de mapa con Leaflet Polyline.
 */
export function RouteOverlay({
  order,
  showMilestones = true,
  showMilestoneDetails = false,
  className,
}: RouteOverlayProps) {
  const completedMilestones = order.milestones.filter((m) => m.trackingStatus === "completed").length;
  const totalMilestones = order.milestones.length;
  const progressPercent = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  const nextMilestone = useMemo(() => getNextMilestone(order.milestones), [order.milestones]);

  const sortedMilestones = useMemo(
    () => [...order.milestones].sort((a, b) => a.sequence - b.sequence),
    [order.milestones]
  );

  return (
    <div className={cn("p-3 rounded-lg border bg-card/80 backdrop-blur-sm", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Route className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Ruta: {order.orderNumber}</span>
      </div>

      {/* Siguiente destino */}
      {nextMilestone && (
        <div className="flex items-start gap-2 mb-2 p-2 rounded bg-muted/50">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{nextMilestone.name}</p>
            {nextMilestone.estimatedArrival && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                <span>
                  ETA: {new Date(nextMilestone.estimatedArrival).toLocaleTimeString("es-PE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {nextMilestone.delayMinutes !== undefined && nextMilestone.delayMinutes > 0 && (
                  <span className="text-red-500 ml-1">(+{nextMilestone.delayMinutes} min)</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra de progreso */}
      {showMilestones && (
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Hitos: {completedMilestones} / {totalMilestones}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista de hitos con detalles */}
      {showMilestoneDetails && sortedMilestones.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
          {sortedMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className={cn(
                "flex items-center gap-2 text-xs p-1.5 rounded",
                milestone.trackingStatus === "completed" && "bg-emerald-500/10",
                milestone.trackingStatus === "in_progress" && "bg-amber-500/10"
              )}
            >
              <MilestoneStatusIcon status={milestone.trackingStatus} />
              <span className="flex-1 truncate">{milestone.name}</span>
              {milestone.actualArrival && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(milestone.actualArrival).toLocaleTimeString("es-PE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
