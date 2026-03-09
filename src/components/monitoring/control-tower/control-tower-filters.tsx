"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ControlTowerFilters as Filters, RetransmissionStatus } from "@/types/monitoring";

interface ControlTowerFiltersProps {
  
  filters: Filters;
  /** Callback al cambiar filtros */
  onFiltersChange: (filters: Filters) => void;
  /** Lista de transportistas/operadores */
  carriers: string[];
  /** Clase adicional */
  className?: string;
}

/**
 * Panel de filtros para Torre de Control
 */
export function ControlTowerFilters({
  filters,
  onFiltersChange,
  carriers,
  className,
}: ControlTowerFiltersProps) {
  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.unitSearch) count++;
    if (filters.carrierId) count++;
    if (filters.orderNumber) count++;
    if (filters.reference) count++;
    if (filters.customerId) count++;
    if (filters.activeOrdersOnly) count++;
    if (filters.connectionStatus && filters.connectionStatus !== "all") count++;
    return count;
  }, [filters]);

  /**
   * Actualiza un filtro específico
   */
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  /**
   * Limpia todos los filtros
   */
  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Búsqueda de unidad */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por placa o N° económico..."
          value={filters.unitSearch || ""}
          onChange={(e) => updateFilter("unitSearch", e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Búsqueda de orden */}
      <div>
        <Label className="text-xs text-muted-foreground">Número de orden</Label>
        <Input
          placeholder="ORD-2024-00001"
          value={filters.orderNumber || ""}
          onChange={(e) => updateFilter("orderNumber", e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Búsqueda por referencia */}
      <div>
        <Label className="text-xs text-muted-foreground">Referencia (Booking / Guía / Viaje)</Label>
        <Input
          placeholder="BK-2024-000001, GU-..., VJ-..."
          value={filters.reference || ""}
          onChange={(e) => updateFilter("reference", e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Transportista */}
      <div>
        <Label className="text-xs text-muted-foreground">Transportista</Label>
        <Select
          value={filters.carrierId || "all"}
          onValueChange={(value) => updateFilter("carrierId", value === "all" ? undefined : value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los transportistas</SelectItem>
            {carriers.map((carrier) => (
              <SelectItem key={carrier} value={carrier}>
                {carrier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estado de conexión */}
      <div>
        <Label className="text-xs text-muted-foreground">Estado de conexión</Label>
        <Select
          value={filters.connectionStatus || "all"}
          onValueChange={(value) => updateFilter("connectionStatus", value as RetransmissionStatus | "all")}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="online">En línea</SelectItem>
            <SelectItem value="temporary_loss">Pérdida temporal</SelectItem>
            <SelectItem value="disconnected">Sin conexión</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Toggle órdenes activas */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label className="text-sm">Solo con órdenes activas</Label>
          <p className="text-xs text-muted-foreground">
            Mostrar solo vehículos con órdenes en curso
          </p>
        </div>
        <Switch
          checked={filters.activeOrdersOnly || false}
          onCheckedChange={(checked) => updateFilter("activeOrdersOnly", checked)}
        />
      </div>

      {/* Indicador de filtros y botón limpiar */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between border-t pt-4">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            {activeFiltersCount} filtro(s) activo(s)
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        </div>
      )}
    </div>
  );
}
