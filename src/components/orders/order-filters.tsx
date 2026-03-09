'use client';

import { memo, useState, useCallback } from 'react';
import {
  X,
  Search,
  ChevronDown,
  RotateCcw,
  CalendarIcon,
} from 'lucide-react';
import type { OrderFilters as OrderFiltersType, OrderStatus } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Props del componente OrderFilters
 */
interface OrderFiltersProps {
  
  filters: OrderFiltersType;
  /** Callback al cambiar filtros */
  onFiltersChange: (filters: OrderFiltersType) => void;
  /** Callback al limpiar filtros */
  onClear: () => void;
  /** Opciones de filtros */
  filterOptions: {
    customers: Array<{ id: string; name: string; code: string }>;
    carriers: Array<{ id: string; name: string }>;
    gpsOperators: Array<{ id: string; name: string }>;
    statuses: Array<{ value: string; label: string }>;
    priorities: Array<{ value: string; label: string }>;
  };
  /** Número de filtros activos */
  activeFilterCount: number;
  /** Está cargando opciones */
  isLoading?: boolean;
  /** Clase adicional */
  className?: string;
}

/**
 * Colores de estados para badges
 */
const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_transit: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  at_milestone: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delayed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// COMPONENTE

/**
 * Panel de filtros compacto para órdenes
 */
function OrderFiltersComponent({
  filters,
  onFiltersChange,
  onClear,
  filterOptions,
  activeFilterCount,
  isLoading: _isLoading = false,
  className,
}: Readonly<OrderFiltersProps>) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  /**
   * Actualiza un filtro específico
   */
  const updateFilter = useCallback(<K extends keyof OrderFiltersType>(
    key: K,
    value: OrderFiltersType[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  }, [filters, onFiltersChange]);

  /**
   * Maneja la búsqueda
   */
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  /**
   * Aplica la búsqueda
   */
  const applySearch = useCallback(() => {
    updateFilter('search', searchTerm || undefined);
  }, [searchTerm, updateFilter]);

  /**
   * Maneja Enter en búsqueda
   */
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applySearch();
    }
  }, [applySearch]);

  /**
   * Convierte status a array
   */
  const toStatusArray = useCallback((status: OrderStatus | OrderStatus[] | undefined): OrderStatus[] => {
    if (!status) return [];
    return Array.isArray(status) ? status : [status];
  }, []);

  /**
   * Toggle de estado
   */
  const toggleStatus = useCallback((status: OrderStatus) => {
    const currentStatuses = toStatusArray(filters.status);
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s: OrderStatus) => s !== status)
      : [...currentStatuses, status];

    updateFilter('status', newStatuses.length > 0 ? newStatuses : undefined);
  }, [filters.status, updateFilter, toStatusArray]);

  const currentStatusArray = toStatusArray(filters.status);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Barra de filtros en una línea */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Búsqueda */}
        <div className="relative w-full sm:flex-1 sm:min-w-[180px] sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar orden..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={applySearch}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Estado */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              Estado
              {currentStatusArray.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {currentStatusArray.length}
                </Badge>
              )}
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {filterOptions.statuses.map((status) => (
              <DropdownMenuCheckboxItem
                key={status.value}
                checked={currentStatusArray.includes(status.value as OrderStatus)}
                onCheckedChange={() => toggleStatus(status.value as OrderStatus)}
              >
                <span className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-xs',
                  STATUS_COLORS[status.value as OrderStatus]
                )}>
                  {status.label}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => updateFilter('status', undefined)}>
              Limpiar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Cliente */}
        <Select
          value={filters.customerId || 'all'}
          onValueChange={(value) => updateFilter('customerId', value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {filterOptions.customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Transportista */}
        <Select
          value={filters.carrierId || 'all'}
          onValueChange={(value) => updateFilter('carrierId', value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
            <SelectValue placeholder="Transportista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {filterOptions.carriers.map((carrier) => (
              <SelectItem key={carrier.id} value={carrier.id}>
                {carrier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Prioridad */}
        <Select
          value={typeof filters.priority === 'string' ? filters.priority : 'all'}
          onValueChange={(value) => updateFilter('priority', value === 'all' ? undefined : value as OrderFiltersType['priority'])}
        >
          <SelectTrigger className="w-full sm:w-[120px] h-9 text-sm">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {filterOptions.priorities.map((priority) => (
              <SelectItem key={priority.value} value={priority.value}>
                {priority.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tipo de servicio */}
        <Select
          value={filters.serviceType || 'all'}
          onValueChange={(value) => updateFilter('serviceType', value === 'all' ? undefined : value as OrderFiltersType['serviceType'])}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
            <SelectValue placeholder="Tipo servicio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="distribucion">Distribución</SelectItem>
            <SelectItem value="importacion">Importación</SelectItem>
            <SelectItem value="exportacion">Exportación</SelectItem>
            <SelectItem value="transporte_minero">Transporte Minero</SelectItem>
            <SelectItem value="transporte_residuos">Transporte Residuos</SelectItem>
            <SelectItem value="interprovincial">Interprovincial</SelectItem>
            <SelectItem value="mudanza">Mudanza</SelectItem>
            <SelectItem value="courier">Courier</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>

        {/* Rango de fechas */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              Fechas
              {(filters.dateFrom || filters.dateTo) && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  1
                </Badge>
              )}
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Tipo de fecha</Label>
                <Select
                  value={filters.dateType || 'scheduled'}
                  onValueChange={(value) => updateFilter('dateType', value as OrderFiltersType['dateType'])}
                >
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creation">Fecha de creación</SelectItem>
                    <SelectItem value="scheduled">Fecha programada</SelectItem>
                    <SelectItem value="execution">Fecha de ejecución</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
              {(filters.dateFrom || filters.dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      dateFrom: undefined,
                      dateTo: undefined,
                      dateType: undefined,
                    });
                  }}
                >
                  Limpiar fechas
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Limpiar filtros */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-9 gap-1.5 text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5" />
            Limpiar ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Badges de filtros activos */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {currentStatusArray.map((status: OrderStatus) => (
            <Badge
              key={status}
              variant="secondary"
              className={cn(
                'gap-1 cursor-pointer text-xs',
                STATUS_COLORS[status]
              )}
              onClick={() => toggleStatus(status)}
            >
              {filterOptions.statuses.find(s => s.value === status)?.label}
              <X className="w-3 h-3" />
            </Badge>
          ))}

          {filters.customerId && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer text-xs"
              onClick={() => updateFilter('customerId', undefined)}
            >
              {filterOptions.customers.find(c => c.id === filters.customerId)?.name}
              <X className="w-3 h-3" />
            </Badge>
          )}

          {filters.carrierId && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer text-xs"
              onClick={() => updateFilter('carrierId', undefined)}
            >
              {filterOptions.carriers.find(c => c.id === filters.carrierId)?.name}
              <X className="w-3 h-3" />
            </Badge>
          )}

          {filters.priority && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer text-xs"
              onClick={() => updateFilter('priority', undefined)}
            >
              {filterOptions.priorities.find(p => p.value === filters.priority)?.label}
              <X className="w-3 h-3" />
            </Badge>
          )}

          {filters.search && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer text-xs"
              onClick={() => {
                setSearchTerm('');
                updateFilter('search', undefined);
              }}
            >
              &ldquo;{filters.search}&rdquo;
              <X className="w-3 h-3" />
            </Badge>
          )}

          {filters.serviceType && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer text-xs"
              onClick={() => updateFilter('serviceType', undefined)}
            >
              Servicio: {filters.serviceType.replace('_', ' ')}
              <X className="w-3 h-3" />
            </Badge>
          )}

          {(filters.dateFrom || filters.dateTo) && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer text-xs"
              onClick={() => {
                onFiltersChange({
                  ...filters,
                  dateFrom: undefined,
                  dateTo: undefined,
                  dateType: undefined,
                });
              }}
            >
              {filters.dateFrom && filters.dateTo
                ? `${filters.dateFrom} → ${filters.dateTo}`
                : filters.dateFrom
                  ? `Desde ${filters.dateFrom}`
                  : `Hasta ${filters.dateTo}`}
              <X className="w-3 h-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Exportación memoizada
 */
export const OrderFilters = memo(OrderFiltersComponent);
