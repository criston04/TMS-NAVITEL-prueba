"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { 
  RetransmissionFilters as Filters, 
  GpsCompany,
  MovementStatus,
  RetransmissionStatus
} from "@/types/monitoring";

interface RetransmissionFiltersProps {
  
  filters: Filters;
  /** Callback al cambiar filtros */
  onFiltersChange: (filters: Filters) => void;
  /** Lista de empresas GPS */
  gpsCompanies: GpsCompany[];
  /** Lista de operadores/transportistas */
  companies: string[];
  /** Clase adicional */
  className?: string;
}

/**
 * Componente de filtros para la tabla de retransmisión
 */
export function RetransmissionFilters({
  filters,
  onFiltersChange,
  gpsCompanies,
  companies,
  className,
}: RetransmissionFiltersProps) {
  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.vehicleSearch) count++;
    if (filters.companyId) count++;
    if (filters.movementStatus && filters.movementStatus !== "all") count++;
    if (filters.retransmissionStatus && filters.retransmissionStatus !== "all") count++;
    if (filters.gpsCompanyId) count++;
    if (filters.hasComments !== undefined) count++;
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
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda por placa */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa..."
            value={filters.vehicleSearch || ""}
            onChange={(e) => updateFilter("vehicleSearch", e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Empresa/Operador */}
        <Select
          value={filters.companyId || "all"}
          onValueChange={(value) => updateFilter("companyId", value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las empresas</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company} value={company}>
                {company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Estado de movimiento */}
        <Select
          value={filters.movementStatus || "all"}
          onValueChange={(value) => updateFilter("movementStatus", value as MovementStatus | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Movimiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="moving">En movimiento</SelectItem>
            <SelectItem value="stopped">Detenido</SelectItem>
          </SelectContent>
        </Select>

        {/* Estado de retransmisión */}
        <Select
          value={filters.retransmissionStatus || "all"}
          onValueChange={(value) => updateFilter("retransmissionStatus", value as RetransmissionStatus | "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="online">En línea</SelectItem>
            <SelectItem value="temporary_loss">Pérdida temporal</SelectItem>
            <SelectItem value="disconnected">Sin conexión</SelectItem>
          </SelectContent>
        </Select>

        {/* Empresa GPS */}
        <Select
          value={filters.gpsCompanyId || "all"}
          onValueChange={(value) => updateFilter("gpsCompanyId", value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="GPS Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los GPS</SelectItem>
            {gpsCompanies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Con/Sin comentarios */}
        <Select
          value={filters.hasComments === undefined ? "all" : filters.hasComments ? "with" : "without"}
          onValueChange={(value) => {
            if (value === "all") updateFilter("hasComments", undefined);
            else updateFilter("hasComments", value === "with");
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Comentarios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="with">Con comentarios</SelectItem>
            <SelectItem value="without">Sin comentarios</SelectItem>
          </SelectContent>
        </Select>

        {/* Botón limpiar filtros */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Limpiar ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Indicador de filtros activos */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>{activeFiltersCount} filtro(s) activo(s)</span>
        </div>
      )}
    </div>
  );
}
