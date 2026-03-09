"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ArrowUpDown,
  Building2,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { CustomerFilters, CustomerType, CustomerCategory } from "@/types/models";
import { EntityStatus } from "@/types/common";
import { cn } from "@/lib/utils";
import { useCustomerCategories } from "@/contexts/customer-categories-context";

interface CustomerFiltersProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  onClearFilters: () => void;
  cities?: string[];
  activeFilterCount?: number;
  className?: string;
}

const STATUS_OPTIONS: { value: EntityStatus | "all"; label: string; icon?: typeof CheckCircle }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Activos", icon: CheckCircle },
  { value: "inactive", label: "Inactivos", icon: XCircle },
];

const TYPE_OPTIONS: { value: CustomerType | "all"; label: string; icon?: typeof Building2 }[] = [
  { value: "all", label: "Todos los tipos" },
  { value: "empresa", label: "Empresas", icon: Building2 },
  { value: "persona", label: "Personas", icon: User },
];

// CATEGORY_OPTIONS ahora viene del hook useCustomerCategories()

const SORT_OPTIONS: { value: CustomerFilters["sortBy"]; label: string }[] = [
  { value: "name", label: "Nombre" },
  { value: "createdAt", label: "Fecha de registro" },
  { value: "code", label: "Código" },
];

export function CustomerFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
  cities = [],
  className,
}: CustomerFiltersProps) {
  const { filterOptions: CATEGORY_OPTIONS } = useCustomerCategories();
  const updateFilter = <K extends keyof CustomerFilters>(key: K, value: CustomerFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFiltersCount = [
    filters.status && filters.status !== "all",
    filters.type && filters.type !== "all",
    filters.category && filters.category !== "all",
    filters.city,
  ].filter(Boolean).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Barra principal de búsqueda y filtros rápidos */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RUC, email..."
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => updateFilter("search", "")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtro de estado rápido */}
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => updateFilter("status", value as EntityStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon && (
                    <option.icon className={cn(
                      "h-4 w-4",
                      option.value === "active" && "text-green-500",
                      option.value === "inactive" && "text-red-500"
                    )} />
                  )}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botón de filtros avanzados */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80" 
            align="end" 
            side="bottom" 
            sideOffset={8}
            collisionPadding={16}
          >
            <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              <h4 className="font-medium">Filtros Avanzados</h4>
              
              <div className="space-y-3">
                {/* Tipo de cliente */}
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Tipo de Cliente</label>
                  <Select
                    value={filters.type || "all"}
                    onValueChange={(value) => updateFilter("type", value as CustomerType | "all")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {option.icon && <option.icon className="h-4 w-4" />}
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoría */}
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Categoría</label>
                  <Select
                    value={filters.category || "all"}
                    onValueChange={(value) => updateFilter("category", value as CustomerCategory | "all")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {option.color && (
                              <div className={cn("h-2 w-2 rounded-full", option.color)} />
                            )}
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ciudad */}
                {cities.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Ciudad</label>
                    <Select
                      value={filters.city || "all"}
                      onValueChange={(value) => updateFilter("city", value === "all" ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las ciudades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las ciudades</SelectItem>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                {/* Ordenamiento */}
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Ordenar por</label>
                  <div className="flex gap-2">
                    <Select
                      value={filters.sortBy || "name"}
                      onValueChange={(value) => updateFilter("sortBy", value as CustomerFilters["sortBy"])}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value!}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateFilter(
                        "sortOrder", 
                        filters.sortOrder === "asc" ? "desc" : "asc"
                      )}
                    >
                      <ArrowUpDown className={cn(
                        "h-4 w-4 transition-transform",
                        filters.sortOrder === "desc" && "rotate-180"
                      )} />
                    </Button>
                  </div>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <>
                  <Separator />
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={onClearFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar filtros
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Chips de filtros activos */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status && filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Estado: {filters.status === "active" ? "Activo" : "Inactivo"}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter("status", "all")}
              />
            </Badge>
          )}
          {filters.type && filters.type !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Tipo: {filters.type === "empresa" ? "Empresa" : "Persona"}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter("type", "all")}
              />
            </Badge>
          )}
          {filters.category && filters.category !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Categoría: {CATEGORY_OPTIONS.find(c => c.value === filters.category)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter("category", "all")}
              />
            </Badge>
          )}
          {filters.city && (
            <Badge variant="secondary" className="gap-1">
              Ciudad: {filters.city}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter("city", undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
