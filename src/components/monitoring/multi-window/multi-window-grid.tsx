"use client";

import { cn } from "@/lib/utils";
import { Monitor } from "lucide-react";
import { VehiclePanel } from "./vehicle-panel";
import type { VehiclePanel as VehiclePanelType, MultiWindowGridConfig, TrackedVehicle } from "@/types/monitoring";

interface MultiWindowGridProps {
  
  panels: VehiclePanelType[];
  /** Mapa de vehículos */
  vehicles: Map<string, TrackedVehicle>;
  /** Configuración del grid */
  gridConfig: MultiWindowGridConfig;
  /** Callback al remover un panel */
  onRemovePanel: (vehicleId: string) => void;
  /** Obtener historial de velocidades */
  getSpeedHistory?: (vehicleId: string) => number[];
  /** Clase adicional */
  className?: string;
}

/**
 * Calcula las clases CSS para el grid
 */
function getGridClasses(config: MultiWindowGridConfig): string {
  switch (config.layout) {
    case "2x2":
      return "grid-cols-1 sm:grid-cols-2";
    case "3x3":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    case "4x4":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    case "5x4":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5";
    case "auto":
    default:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
  }
}

/**
 * Grid responsivo de paneles de vehículos
 */
export function MultiWindowGrid({
  panels,
  vehicles,
  gridConfig,
  onRemovePanel,
  getSpeedHistory,
  className,
}: MultiWindowGridProps) {
  if (panels.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16", className)}>
        <div className="rounded-full bg-muted p-6">
          <Monitor className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">No hay vehículos seleccionados</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Agrega vehículos para monitorearlos en tiempo real
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", getGridClasses(gridConfig), className)}>
      {panels.map((panel) => {
        const vehicle = vehicles.get(panel.vehicleId);

        // Si el vehículo no está disponible, mostrar placeholder
        if (!vehicle) {
          return (
            <div
              key={panel.id}
              className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6"
            >
              <p className="text-sm text-muted-foreground">
                Vehículo no disponible
              </p>
              <p className="text-xs text-muted-foreground">
                {panel.vehiclePlate}
              </p>
            </div>
          );
        }

        return (
          <VehiclePanel
            key={panel.id}
            vehicle={vehicle}
            speedHistory={getSpeedHistory?.(panel.vehicleId)}
            onRemove={onRemovePanel}
          />
        );
      })}
    </div>
  );
}
