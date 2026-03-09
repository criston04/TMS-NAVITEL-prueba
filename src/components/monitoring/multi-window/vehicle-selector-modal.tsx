"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ConnectionStatusBadge } from "../common/connection-status-badge";
import type { TrackedVehicle } from "@/types/monitoring";

interface VehicleSelectorModalProps {
  /** Si el modal está abierto */
  isOpen: boolean;
  /** Callback al cerrar */
  onClose: () => void;
  /** Callback al seleccionar */
  onSelect: (vehicles: Array<{ vehicleId: string; vehiclePlate: string }>) => void;
  /** Lista de vehículos disponibles */
  availableVehicles: TrackedVehicle[];
  /** IDs de vehículos a excluir (ya seleccionados) */
  excludeIds: string[];
  /** Máximo de vehículos que se pueden agregar */
  maxToAdd: number;
}

/**
 * Modal para seleccionar múltiples vehículos
 */
export function VehicleSelectorModal({
  isOpen,
  onClose,
  onSelect,
  availableVehicles,
  excludeIds,
  maxToAdd,
}: VehicleSelectorModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset al cerrar usando key en Dialog o reseteando en el open handler
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    } else {
      // Reset state cuando se abre
      setSearch("");
      setSelectedIds(new Set());
    }
  };

  // Filtrar vehículos disponibles
  const filteredVehicles = useMemo(() => {
    return availableVehicles
      .filter((v) => !excludeIds.includes(v.id))
      .filter((v) => {
        if (!search.trim()) return true;
        const searchLower = search.toLowerCase();
        return (
          v.plate.toLowerCase().includes(searchLower) ||
          v.economicNumber?.toLowerCase().includes(searchLower) ||
          v.driverName?.toLowerCase().includes(searchLower)
        );
      });
  }, [availableVehicles, excludeIds, search]);

  // Verificar si se puede seleccionar más
  const canSelectMore = selectedIds.size < maxToAdd;

  /**
   * Toggle selección de un vehículo
   */
  const toggleVehicle = (vehicleId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else if (canSelectMore || prev.has(vehicleId)) {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  /**
   * Seleccionar todos los filtrados
   */
  const selectAll = () => {
    const toAdd = filteredVehicles.slice(0, maxToAdd).map((v) => v.id);
    setSelectedIds(new Set(toAdd));
  };

  /**
   * Deseleccionar todos
   */
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  /**
   * Confirmar selección
   */
  const handleConfirm = () => {
    const vehicles = availableVehicles
      .filter((v) => selectedIds.has(v.id))
      .map((v) => ({ vehicleId: v.id, vehiclePlate: v.plate }));
    onSelect(vehicles);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar vehículos</DialogTitle>
          <DialogDescription>
            Selecciona los vehículos que deseas monitorear. 
            Puedes agregar hasta {maxToAdd} vehículo(s) más.
          </DialogDescription>
        </DialogHeader>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, N° económico o conductor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Acciones masivas */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selectedIds.size} de {maxToAdd} seleccionados
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              disabled={filteredVehicles.length === 0}
            >
              Seleccionar todos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              disabled={selectedIds.size === 0}
            >
              Deseleccionar
            </Button>
          </div>
        </div>

        {/* Lista de vehículos */}
        <ScrollArea className="h-[300px] rounded-md border">
          {filteredVehicles.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
              <p>No hay vehículos disponibles</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredVehicles.map((vehicle) => {
                const isSelected = selectedIds.has(vehicle.id);
                const isDisabled = !isSelected && !canSelectMore;

                return (
                  <div
                    key={vehicle.id}
                    role="button"
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={() => !isDisabled && toggleVehicle(vehicle.id)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !isDisabled) {
                        e.preventDefault();
                        toggleVehicle(vehicle.id);
                      }
                    }}
                    aria-disabled={isDisabled}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors cursor-pointer",
                      isSelected && "bg-primary/10",
                      !isDisabled && "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isDisabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="pointer-events-none"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{vehicle.plate}</span>
                        <ConnectionStatusBadge
                          status={vehicle.connectionStatus}
                          showText={false}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {vehicle.economicNumber && (
                          <span>{vehicle.economicNumber}</span>
                        )}
                        {vehicle.driverName && (
                          <>
                            <span>•</span>
                            <span>{vehicle.driverName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
          >
            Agregar ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
