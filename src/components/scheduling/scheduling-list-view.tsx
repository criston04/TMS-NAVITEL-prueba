'use client';

import { memo, useMemo } from 'react';
import {
  Search,
  Truck,
  User,
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  CalendarPlus,
  Filter,
  Package,
} from 'lucide-react';
import type { Order, OrderPriority, OrderStatus } from '@/types/order';
import type { OrderStateFilter } from '@/hooks/use-scheduling';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SchedulingListViewProps {
  /** Todas las órdenes (ya filtradas por stateFilter + search) */
  orders: Order[];
  /** Todas las órdenes sin filtrar (para contar) */
  allOrders: Order[];
  /** Filtro de estado activo */
  stateFilter: OrderStateFilter;
  /** Valor de búsqueda */
  searchValue: string;
  /** Cargando */
  isLoading?: boolean;
  /** Callback al cambiar filtro de estado */
  onStateFilterChange: (filter: OrderStateFilter) => void;
  /** Callback al cambiar búsqueda */
  onSearchChange: (search: string) => void;
  /** Callback al hacer clic en programar orden */
  onScheduleOrder?: (order: Order) => void;
  /** Callback al hacer clic en una orden */
  onOrderClick?: (order: Order) => void;
  /** Clase adicional */
  className?: string;
}

// CONFIGURACIÓN DE ESTADOS

const PRIORITY_CONFIG: Record<OrderPriority, { label: string; className: string; dotColor: string }> = {
  low: { label: 'Baja', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', dotColor: 'bg-gray-400' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dotColor: 'bg-[#34b7ff]' },
  high: { label: 'Alta', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', dotColor: 'bg-orange-500' },
  urgent: { label: 'Urgente', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dotColor: 'bg-red-500' },
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  assigned: { label: 'Asignada', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_transit: { label: 'En ejecución', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  at_milestone: { label: 'En hito', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  delayed: { label: 'Retrasada', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  completed: { label: 'Completada', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  closed: { label: 'Cerrada', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

const STATE_FILTERS: { value: OrderStateFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'Todas', icon: Package },
  { value: 'in_execution', label: 'En ejecución', icon: Truck },
  { value: 'assigned', label: 'Asignadas', icon: User },
  { value: 'unassigned', label: 'Sin asignar', icon: CalendarPlus },
];

// COMPONENTE: FILA DE ORDEN

const OrderRow = memo(function OrderRow({
  order,
  onScheduleOrder,
  onOrderClick,
}: Readonly<{
  order: Order;
  onScheduleOrder?: (order: Order) => void;
  onOrderClick?: (order: Order) => void;
}>) {
  const priority = order.priority || 'normal';
  const priorityConfig = PRIORITY_CONFIG[priority];
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const destination = order.milestones?.find(m => m.type === 'destination');
  const origin = order.milestones?.find(m => m.type === 'origin');
  const isUnassigned = !order.vehicleId && !order.driverId;
  const canSchedule = isUnassigned && (order.status === 'pending' || order.status === 'draft');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOrderClick?.(order)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOrderClick?.(order); }}
      className={cn(
        'group grid grid-cols-[1fr_120px_140px_140px_100px_110px_90px] items-center gap-3 px-3 py-2.5',
        'border-b hover:bg-muted/50 transition-colors cursor-pointer',
        isUnassigned && 'bg-amber-50/30 dark:bg-amber-950/10',
      )}
    >
      {/* Orden & Referencia */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full shrink-0', priorityConfig.dotColor)} />
          <span className="font-medium text-sm truncate">{order.orderNumber}</span>
          <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 shrink-0', priorityConfig.className)}>
            {priorityConfig.label}
          </Badge>
        </div>
        {order.reference && (
          <div className="flex items-center gap-1 mt-0.5 ml-4">
            <FileText className="h-3 w-3 text-primary/50 shrink-0" />
            <span className="text-[11px] text-muted-foreground font-mono truncate">{order.reference}</span>
          </div>
        )}
      </div>

      {/* Cliente */}
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground truncate block">
          {order.customer?.name || '—'}
        </span>
      </div>

      {/* Ruta */}
      <div className="min-w-0 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">{origin?.geofenceName || '—'}</span>
        <span className="shrink-0">→</span>
        <span className="truncate">{destination?.geofenceName || '—'}</span>
      </div>

      {/* Vehículo / Conductor */}
      <div className="min-w-0">
        {order.vehicle ? (
          <div className="flex items-center gap-1 text-xs">
            <Truck className="h-3 w-3 text-primary/60 shrink-0" />
            <span className="truncate">{order.vehicle.plate}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50">Sin vehículo</span>
        )}
        {order.driver ? (
          <div className="flex items-center gap-1 text-xs mt-0.5">
            <User className="h-3 w-3 text-primary/60 shrink-0" />
            <span className="truncate">{order.driver.fullName}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50 block mt-0.5">Sin conductor</span>
        )}
      </div>

      {/* Fecha programada */}
      <div className="min-w-0 flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarIcon className="h-3 w-3 shrink-0" />
        <span className="truncate">
          {new Date(order.scheduledStartDate).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
          })}
        </span>
      </div>

      {/* Estado */}
      <div className="min-w-0">
        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', statusConfig.className)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Acciones */}
      <div className="flex justify-end">
        {canSchedule && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onScheduleOrder?.(order);
                }}
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Programar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Asignar vehículo y conductor</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
});

// COMPONENTE PRINCIPAL

export const SchedulingListView = memo(function SchedulingListView({
  orders,
  allOrders,
  stateFilter,
  searchValue,
  isLoading = false,
  onStateFilterChange,
  onSearchChange,
  onScheduleOrder,
  onOrderClick,
  className,
}: Readonly<SchedulingListViewProps>) {
  // Contadores por estado
  const counts = useMemo(() => ({
    all: allOrders.length,
    in_execution: allOrders.filter(o => o.status === 'in_transit').length,
    assigned: allOrders.filter(o => o.vehicleId || o.driverId).length,
    unassigned: allOrders.filter(o => !o.vehicleId && !o.driverId).length,
  }), [allOrders]);

  return (
    <div className={cn('flex flex-col bg-card rounded-lg border', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
        {/* Filtros por estado */}
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          {STATE_FILTERS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={stateFilter === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onStateFilterChange(value)}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <Badge
                variant={stateFilter === value ? 'secondary' : 'outline'}
                className="h-4 px-1 text-[10px] ml-0.5"
              >
                {counts[value]}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar orden, referencia, placa..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Header de tabla */}
      <div className="grid grid-cols-[1fr_120px_140px_140px_100px_110px_90px] items-center gap-3 px-3 py-2 border-b bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        <span>Orden / Referencia</span>
        <span>Cliente</span>
        <span>Ruta</span>
        <span>Recursos</span>
        <span>Fecha</span>
        <span>Estado</span>
        <span className="text-right">Acciones</span>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} className="h-14 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No se encontraron órdenes</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {searchValue ? 'Intenta con otra búsqueda' : 'No hay órdenes con este filtro'}
            </p>
          </div>
        ) : (
          orders.map(order => (
            <OrderRow
              key={order.id}
              order={order}
              onScheduleOrder={onScheduleOrder}
              onOrderClick={onOrderClick}
            />
          ))
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
        <span>{orders.length} de {allOrders.length} órdenes</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Sin asignar: {counts.unassigned}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            En ejecución: {counts.in_execution}
          </span>
        </div>
      </div>
    </div>
  );
});
