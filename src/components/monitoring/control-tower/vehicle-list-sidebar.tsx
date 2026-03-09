"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Truck, Navigation, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TrackedVehicle } from "@/types/monitoring";

interface VehicleListSidebarProps {
  /** Lista de vehículos */
  vehicles: TrackedVehicle[];
  /** ID del vehículo seleccionado */
  selectedVehicleId?: string;
  /** Callback al seleccionar un vehículo */
  onVehicleSelect: (vehicle: TrackedVehicle) => void;
  /** Clase adicional */
  className?: string;
}

/**
 * Obtiene el color según el estado del vehículo
 */
function getStatusColor(vehicle: TrackedVehicle): string {
  if (vehicle.connectionStatus === "disconnected") return "bg-red-500";
  if (vehicle.connectionStatus === "temporary_loss") return "bg-amber-500";
  if (vehicle.movementStatus === "moving") return "bg-emerald-500";
  return "bg-blue-500";
}

/**
 * Obtiene el texto del estado
 */
function getStatusText(vehicle: TrackedVehicle): string {
  if (vehicle.connectionStatus === "disconnected") return "Sin conexión";
  if (vehicle.connectionStatus === "temporary_loss") return "Pérdida temporal";
  if (vehicle.movementStatus === "moving") return `${vehicle.position.speed} km/h`;
  // Detenido: mostrar duración si disponible
  if (vehicle.stoppedSince) {
    const diff = Date.now() - new Date(vehicle.stoppedSince).getTime();
    const totalMinutes = Math.floor(diff / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `Detenido ${hours}h ${minutes}m`;
    return `Detenido ${minutes}m`;
  }
  return "Detenido";
}

/**
 * Lista de vehículos para el sidebar
 */
export function VehicleListSidebar({
  vehicles,
  selectedVehicleId,
  onVehicleSelect,
  className,
}: VehicleListSidebarProps) {
  // Ordenar vehículos: seleccionado primero, luego por estado
  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      // Seleccionado primero
      if (a.id === selectedVehicleId) return -1;
      if (b.id === selectedVehicleId) return 1;
      
      // Luego por estado de conexión (online primero)
      const statusOrder = { online: 0, temporary_loss: 1, disconnected: 2 };
      const aOrder = statusOrder[a.connectionStatus] ?? 3;
      const bOrder = statusOrder[b.connectionStatus] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Finalmente por placa
      return a.plate.localeCompare(b.plate);
    });
  }, [vehicles, selectedVehicleId]);

  if (vehicles.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 text-center", className)}>
        <Truck className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          No hay vehículos que mostrar
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Vehículos ({vehicles.length})
        </span>
      </div>

      {/* Lista con scroll */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedVehicles.map((vehicle) => {
            const isSelected = vehicle.id === selectedVehicleId;
            const statusColor = getStatusColor(vehicle);
            const statusText = getStatusText(vehicle);

            return (
              <button
                key={vehicle.id}
                onClick={() => onVehicleSelect(vehicle)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-all duration-200",
                  "hover:bg-accent/80 active:scale-[0.98]",
                  isSelected && "bg-primary/10 ring-1 ring-primary/30"
                )}
              >
                {/* Indicador de estado */}
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background", statusColor)} />
                </div>

                {/* Info del vehículo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{vehicle.plate}</span>
                    {vehicle.movementStatus === "moving" && (
                      <Navigation className="h-3 w-3 text-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn(
                      "inline-flex items-center gap-1",
                      vehicle.connectionStatus === "disconnected" && "text-red-500",
                      vehicle.connectionStatus === "temporary_loss" && "text-amber-500",
                      vehicle.connectionStatus === "online" && vehicle.movementStatus === "moving" && "text-emerald-500"
                    )}>
                      {statusText}
                    </span>
                    {vehicle.driverName && (
                      <>
                        <span>•</span>
                        <span className="truncate">{vehicle.driverName}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Botón de ubicar */}
                <div className="shrink-0">
                  <MapPin className={cn(
                    "h-4 w-4 transition-colors",
                    isSelected ? "text-primary" : "text-muted-foreground/50"
                  )} />
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
