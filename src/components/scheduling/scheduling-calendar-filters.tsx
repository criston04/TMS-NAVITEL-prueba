'use client';

import { memo } from 'react';
import {
  Filter,
  Truck,
  Calendar as CalendarIcon,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { CalendarFilters, ScheduleStatus } from '@/types/scheduling';
import type { MockVehicle } from '@/mocks/scheduling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface SchedulingCalendarFiltersProps {
  /** Filtros actuales */
  filters: CalendarFilters;
  /** Vehículos disponibles */
  vehicles: MockVehicle[];
  /** Callback al cambiar filtros */
  onFiltersChange: (filters: CalendarFilters) => void;
  /** Clase adicional */
  className?: string;
}

const STATUS_OPTIONS: { value: ScheduleStatus; label: string }[] = [
  { value: 'unscheduled', label: 'Sin programar' },
  { value: 'scheduled', label: 'Programada' },
];

// COMPONENTE PRINCIPAL

export const SchedulingCalendarFilters = memo(function SchedulingCalendarFilters({
  filters,
  vehicles,
  onFiltersChange,
  className,
}: Readonly<SchedulingCalendarFiltersProps>) {
  const activeFilterCount = [
    filters.vehicleId,
    filters.dateFrom,
    filters.dateTo,
    filters.onlyWithConflicts,
    filters.statuses && filters.statuses.length > 0,
  ].filter(Boolean).length;

  const handleClearAll = () => {
    onFiltersChange({});
  };

  const handleVehicleChange = (value: string) => {
    onFiltersChange({
      ...filters,
      vehicleId: value === '__all__' ? undefined : value,
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      dateFrom: e.target.value || undefined,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      dateTo: e.target.value || undefined,
    });
  };

  const handleStatusToggle = (status: ScheduleStatus) => {
    const current = filters.statuses || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFiltersChange({
      ...filters,
      statuses: updated.length > 0 ? updated : undefined,
    });
  };

  const handleConflictsToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      onlyWithConflicts: checked || undefined,
    });
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 border-b bg-muted/20',
        'overflow-x-auto scrollbar-none',
        className
      )}
    >
      {/* Icono */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Filtros</span>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {activeFilterCount}
          </Badge>
        )}
      </div>

      {/* Vehículo (Camión) */}
      <Select
        value={filters.vehicleId || '__all__'}
        onValueChange={handleVehicleChange}
      >
        <SelectTrigger className="h-7 w-[160px] text-xs shrink-0">
          <Truck className="h-3 w-3 mr-1 text-muted-foreground" />
          <SelectValue placeholder="Camión" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__" className="text-xs">Todos</SelectItem>
          {vehicles.map(v => (
            <SelectItem key={v.id} value={v.id} className="text-xs">
              {v.plateNumber}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Fecha desde */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
        <Input
          type="date"
          value={filters.dateFrom || ''}
          onChange={handleDateFromChange}
          className="h-7 w-[140px] text-xs"
          placeholder="Desde"
        />
      </div>

      {/* Fecha hasta */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-muted-foreground">hasta</span>
        <Input
          type="date"
          value={filters.dateTo || ''}
          onChange={handleDateToChange}
          className="h-7 w-[140px] text-xs"
          placeholder="Hasta"
        />
      </div>

      {/* Estado: Asignada/Sin asignar */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant={filters.vehicleId && filters.vehicleId !== '__all__' ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => {
            // Toggle entre mostrar solo asignados o todos
            if (filters.vehicleId && filters.vehicleId !== '__all__') {
              handleVehicleChange('__all__');
            }
          }}
        >
          Asignada
        </Button>
        <Button
          variant={!filters.vehicleId || filters.vehicleId === '__all__' ? 'outline' : 'default'}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => handleVehicleChange('__all__')}
        >
          Sin asignar
        </Button>
      </div>

      {/* Estado: Programada/Sin programar */}
      <div className="flex items-center gap-1 shrink-0">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <Button
            key={value}
            variant={filters.statuses?.includes(value) ? 'default' : 'outline'}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => handleStatusToggle(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Solo conflictos */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <Switch
          checked={filters.onlyWithConflicts || false}
          onCheckedChange={handleConflictsToggle}
          className="h-4 w-7"
        />
        <label className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-pointer">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          Solo conflictos
        </label>
      </div>

      {/* Limpiar */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] shrink-0"
          onClick={handleClearAll}
        >
          <X className="h-3 w-3 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
});
