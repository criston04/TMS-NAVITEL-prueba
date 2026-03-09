"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  UserCircle,
  Truck,
  Check,
  X,
  Link,
  Unlink,
  AlertCircle,
} from "lucide-react";
import { Driver, Vehicle } from "@/types/models";

type AssignmentMode = "driver-to-vehicle" | "vehicle-to-driver";

interface DriverVehicleAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modo de asignación */
  mode: AssignmentMode;
  /** Conductor seleccionado (si mode es driver-to-vehicle) */
  driver?: Driver | null;
  /** Vehículo seleccionado (si mode es vehicle-to-driver) */
  vehicle?: Vehicle | null;
  /** Lista de vehículos disponibles */
  vehicles?: Vehicle[];
  /** Lista de conductores disponibles */
  drivers?: Driver[];
  /** Callback cuando se realiza una asignación */
  onAssign: (driverId: string, vehicleId: string) => Promise<void>;
  /** Callback cuando se remueve una asignación */
  onUnassign: (driverId: string, vehicleId: string) => Promise<void>;
  /** Si está cargando datos */
  isLoading?: boolean;
}

export function DriverVehicleAssignmentModal({
  open,
  onOpenChange,
  mode,
  driver,
  vehicle,
  vehicles = [],
  drivers = [],
  onAssign,
  onUnassign,
  isLoading = false,
}: DriverVehicleAssignmentModalProps) {
  const [search, setSearch] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reset al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedId(null);
    }
  }, [open]);

  // Filtrar items según búsqueda
  const filteredItems = mode === "driver-to-vehicle"
    ? vehicles.filter(v => 
        v.plate.toLowerCase().includes(search.toLowerCase()) ||
        `${v.specs?.brand} ${v.specs?.model}`.toLowerCase().includes(search.toLowerCase())
      )
    : drivers.filter(d =>
        `${d.firstName} ${d.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        d.documentNumber.includes(search)
      );

  // Verificar si ya tiene asignación
  const currentAssignment = mode === "driver-to-vehicle"
    ? driver?.assignedVehicleId
    : vehicle?.currentDriverId;

  const handleAssign = useCallback(async (targetId: string) => {
    setIsProcessing(true);
    try {
      const driverId = mode === "driver-to-vehicle" ? driver!.id : targetId;
      const vehicleId = mode === "driver-to-vehicle" ? targetId : vehicle!.id;
      await onAssign(driverId, vehicleId);
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  }, [mode, driver, vehicle, onAssign, onOpenChange]);

  const handleUnassign = useCallback(async () => {
    if (!currentAssignment) return;
    setIsProcessing(true);
    try {
      const driverId = mode === "driver-to-vehicle" ? driver!.id : currentAssignment;
      const vehicleId = mode === "driver-to-vehicle" ? currentAssignment : vehicle!.id;
      await onUnassign(driverId, vehicleId);
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  }, [mode, driver, vehicle, currentAssignment, onUnassign, onOpenChange]);

  const title = mode === "driver-to-vehicle"
    ? `Asignar Vehículo a ${driver?.firstName} ${driver?.lastName}`
    : `Asignar Conductor a ${vehicle?.plate}`;

  const description = mode === "driver-to-vehicle"
    ? "Selecciona un vehículo para asignar a este conductor"
    : "Selecciona un conductor para asignar a este vehículo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Asignación actual */}
        {currentAssignment && (
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {mode === "driver-to-vehicle" 
                    ? `Vehículo asignado: ${vehicles.find(v => v.id === currentAssignment)?.plate || currentAssignment}`
                    : `Conductor asignado: ${drivers.find(d => d.id === currentAssignment)?.firstName || currentAssignment}`
                  }
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUnassign}
                disabled={isProcessing}
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
              >
                <Unlink className="h-4 w-4 mr-1" />
                Desasignar
              </Button>
            </div>
          </div>
        )}

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={mode === "driver-to-vehicle" ? "Buscar vehículo..." : "Buscar conductor..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista de items */}
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No se encontraron resultados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mode === "driver-to-vehicle" ? (
                // Lista de vehículos
                (filteredItems as Vehicle[]).map((v) => {
                    const isAssigned = v.currentDriverId !== undefined && v.currentDriverId !== null;
                  const isCurrentAssignment = currentAssignment === v.id;
                  const isAvailable = v.isEnabled && !isAssigned;

                  return (
                    <div
                      key={v.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border cursor-pointer
                        transition-colors
                        ${selectedId === v.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}
                        ${!isAvailable && !isCurrentAssignment ? "opacity-50" : ""}
                      `}
                      onClick={() => isAvailable && setSelectedId(v.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{v.plate}</p>
                          <p className="text-sm text-muted-foreground">
                            {v.specs?.brand} {v.specs?.model}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrentAssignment && (
                          <Badge variant="default">Actual</Badge>
                        )}
                        {isAssigned && !isCurrentAssignment && (
                          <Badge variant="secondary">Asignado</Badge>
                        )}
                        {!v.isEnabled && (
                          <Badge variant="destructive">Bloqueado</Badge>
                        )}
                        {selectedId === v.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Lista de conductores
                (filteredItems as Driver[]).map((d) => {
                  const isAssigned = d.assignedVehicleId !== undefined && d.assignedVehicleId !== null;
                  const isCurrentAssignment = currentAssignment === d.id;
                  const isAvailable = d.isEnabled && d.availability === "available" && !isAssigned;

                  return (
                    <div
                      key={d.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border cursor-pointer
                        transition-colors
                        ${selectedId === d.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}
                        ${!isAvailable && !isCurrentAssignment ? "opacity-50" : ""}
                      `}
                      onClick={() => isAvailable && setSelectedId(d.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{d.firstName} {d.lastName}</p>
                          <p className="text-sm text-muted-foreground">{d.documentNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrentAssignment && (
                          <Badge variant="default">Actual</Badge>
                        )}
                        {isAssigned && !isCurrentAssignment && (
                          <Badge variant="secondary">Asignado</Badge>
                        )}
                        {d.availability !== "available" && (
                          <Badge variant="outline">{d.availability}</Badge>
                        )}
                        {!d.isEnabled && (
                          <Badge variant="destructive">Bloqueado</Badge>
                        )}
                        {selectedId === d.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={() => selectedId && handleAssign(selectedId)}
            disabled={!selectedId || isProcessing}
          >
            <Link className="h-4 w-4 mr-2" />
            {isProcessing ? "Asignando..." : "Asignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
