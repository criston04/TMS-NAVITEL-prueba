"use client";

import { useState } from "react";
import { Vehicle } from "@/types/fleet";
import { VehicleCard } from "./vehicle-card";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Props para el componente VehicleList
 * @interface VehicleListProps
 */
interface VehicleListProps {
  /** Lista de vehículos a mostrar */
  readonly vehicles: Vehicle[];
  /** Vehículo actualmente seleccionado */
  readonly selectedVehicle: Vehicle | null;
  /** Callback cuando se selecciona un vehículo */
  readonly onSelectVehicle: (vehicle: Vehicle) => void;
}

export function VehicleList({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
}: VehicleListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    vehicles[0]?.id || null
  );

  const handleToggleExpand = (vehicleId: string) => {
    setExpandedId((prev) => (prev === vehicleId ? null : vehicleId));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Fleet</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {vehicles.length} vehículos activos
        </p>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={selectedVehicle?.id === vehicle.id}
              isExpanded={expandedId === vehicle.id}
              onSelect={() => onSelectVehicle(vehicle)}
              onToggleExpand={() => handleToggleExpand(vehicle.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
