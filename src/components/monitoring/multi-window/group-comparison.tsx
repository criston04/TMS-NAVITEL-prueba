"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TrackedVehicle } from "@/types/monitoring";

interface GroupComparisonProps {
  /** Vehículos seleccionados en multiventana */
  vehicles: TrackedVehicle[];
  className?: string;
}

interface VehicleComparisonRow {
  id: string;
  plate: string;
  speed: number;
  status: string;
  isConnected: boolean;
  hasAlert: boolean;
}

/**
 * Vista de comparación de grupo para paneles multiventana
 * Muestra una tabla compacta comparando métricas de todos los vehículos
 */
export function GroupComparison({ vehicles, className }: GroupComparisonProps) {
  const rows: VehicleComparisonRow[] = useMemo(
    () =>
      vehicles.map((v) => ({
        id: v.id,
        plate: v.plate,
        speed: v.speed,
        status: v.movementStatus,
        isConnected: v.connectionStatus === "online",
        hasAlert: v.speed > 80 || v.connectionStatus !== "online",
      })),
    [vehicles]
  );

  const avgSpeed = rows.length > 0 ? rows.reduce((s, r) => s + r.speed, 0) / rows.length : 0;
  const movingCount = rows.filter((r) => r.status === "moving").length;
  const alertCount = rows.filter((r) => r.hasAlert).length;

  const statusColor = (status: string) => {
    switch (status) {
      case "moving":
        return "bg-emerald-500";
      case "stopped":
        return "bg-amber-500";
      case "idle":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "moving":
        return "Movimiento";
      case "stopped":
        return "Detenido";
      case "idle":
        return "Ralentí";
      default:
        return status;
    }
  };

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="border-b px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Comparación de grupo</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {vehicles.length} vehículos
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2 border-b text-center">
        <div>
          <p className="text-lg font-bold">{avgSpeed.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">Vel. prom. km/h</p>
        </div>
        <div>
          <p className="text-lg font-bold text-emerald-500">{movingCount}</p>
          <p className="text-[10px] text-muted-foreground">En movimiento</p>
        </div>
        <div>
          <p className="text-lg font-bold text-red-500">{alertCount}</p>
          <p className="text-[10px] text-muted-foreground">Con alertas</p>
        </div>
      </div>

      {/* Vehicle rows */}
      <div className="divide-y max-h-[240px] overflow-y-auto">
        {rows
          .sort((a, b) => b.speed - a.speed) // Fastest first
          .map((row) => (
            <div
              key={row.id}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs",
                row.hasAlert && "bg-red-500/5"
              )}
            >
              {/* Status dot */}
              <div className={cn("h-2 w-2 rounded-full flex-shrink-0", statusColor(row.status))} />

              {/* Plate */}
              <span className="font-mono font-medium w-20 truncate">{row.plate}</span>

              {/* Speed bar */}
              <div className="flex-1 flex items-center gap-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      row.speed > 80 ? "bg-red-500" : row.speed > 0 ? "bg-blue-500" : "bg-gray-300"
                    )}
                    style={{
                      width: `${Math.min(100, (row.speed / Math.max(avgSpeed * 2, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-10 text-right font-mono">{row.speed} km/h</span>
              </div>

              {/* Connection */}
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full flex-shrink-0",
                  row.isConnected ? "bg-emerald-500" : "bg-red-500"
                )}
              />

              {/* Status label */}
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                {statusLabel(row.status)}
              </Badge>
            </div>
          ))}
      </div>
    </div>
  );
}
