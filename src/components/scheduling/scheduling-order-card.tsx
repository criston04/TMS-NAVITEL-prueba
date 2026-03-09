'use client';

import { memo } from 'react';
import {
  MapPin,
  Clock,
  AlertTriangle,
  GripVertical,
  Truck,
  FileText,
} from 'lucide-react';
import type { Order, OrderPriority } from '@/types/order';
import type { ScheduledOrder, ScheduleStatus } from '@/types/scheduling';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SchedulingOrderCardProps {
  /** Orden (pendiente o programada) */
  order: Order;
  /** Datos de programación si ya está programada */
  schedule?: ScheduledOrder;
  /** Variante de visualización */
  variant?: 'sidebar' | 'calendar' | 'timeline';
  /** Si está siendo arrastrada */
  isDragging?: boolean;
  /** Si es arrastrable */
  draggable?: boolean;
  /** Callback al iniciar arrastre */
  onDragStart?: (order: Order) => void;
  /** Callback al terminar arrastre */
  onDragEnd?: () => void;
  /** Callback al hacer clic */
  onClick?: (order: Order) => void;
  /** Clase adicional */
  className?: string;
}

const PRIORITY_CONFIG: Record<OrderPriority, {
  label: string;
  className: string;
  dotColor: string;
}> = {
  low: {
    label: 'Baja',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    dotColor: 'bg-gray-400',
  },
  normal: {
    label: 'Normal',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    dotColor: 'bg-[#34b7ff]',
  },
  high: {
    label: 'Alta',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    dotColor: 'bg-orange-500',
  },
  urgent: {
    label: 'Urgente',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dotColor: 'bg-red-500',
  },
};

const STATUS_CONFIG: Record<ScheduleStatus, {
  label: string;
  className: string;
}> = {
  unscheduled: {
    label: 'Sin programar',
    className: 'bg-gray-100 text-gray-700',
  },
  scheduled: {
    label: 'Programada',
    className: 'bg-blue-100 text-blue-700',
  },
  partial: {
    label: 'Incompleta',
    className: 'bg-yellow-100 text-yellow-700',
  },
  ready: {
    label: 'Lista',
    className: 'bg-green-100 text-green-700',
  },
  in_progress: {
    label: 'En curso',
    className: 'bg-indigo-100 text-indigo-700',
  },
  conflict: {
    label: 'Conflicto',
    className: 'bg-red-100 text-red-700',
  },
  completed: {
    label: 'Completada',
    className: 'bg-emerald-100 text-emerald-700',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-gray-100 text-gray-500',
  },
};

// COMPONENTE

export const SchedulingOrderCard = memo(function SchedulingOrderCard({
  order,
  schedule,
  variant = 'sidebar',
  isDragging = false,
  draggable = true,
  onDragStart,
  onDragEnd,
  onClick,
  className,
}: Readonly<SchedulingOrderCardProps>) {
  const priority = order.priority || 'normal';
  const priorityConfig = PRIORITY_CONFIG[priority];
  const scheduleStatus: ScheduleStatus = schedule?.scheduleStatus || 'unscheduled';
  const statusConfig = STATUS_CONFIG[scheduleStatus];

  const hasConflict = schedule?.conflicts && schedule.conflicts.length > 0;
  const destination = order.milestones?.find(m => m.type === 'destination');

  // ----------------------------------------
  // HANDLERS
  // ----------------------------------------
  const handleDragStart = (e: React.DragEvent) => {
    // Establecer tanto el ID como el JSON completo de la orden
    e.dataTransfer.setData('orderId', order.id);
    e.dataTransfer.setData('application/json', JSON.stringify(order));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(order);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  const handleClick = () => {
    onClick?.(order);
  };

  // ----------------------------------------
  // VARIANTE: SIDEBAR (Panel izquierdo)
  // ----------------------------------------
  if (variant === 'sidebar') {
    return (
      <div
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        className={cn(
          'group relative flex items-start gap-2 rounded-lg border bg-card p-3',
          'cursor-grab transition-all duration-200',
          'hover:border-primary/50 hover:shadow-md',
          isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
          hasConflict && 'border-red-300 bg-red-50/50 dark:bg-red-900/10',
          className
        )}
      >
        {/* Grip para arrastrar */}
        <div className="shrink-0 pt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'h-2 w-2 rounded-full shrink-0',
                priorityConfig.dotColor
              )}
            />
            <span className="font-medium text-sm truncate">
              {order.orderNumber}
            </span>
            {hasConflict && (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
          </div>

          {/* Cliente */}
          <p className="text-xs text-muted-foreground truncate mb-1">
            {order.customer?.name || 'Sin cliente'}
          </p>

          {/* Referencia */}
          {order.reference && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <FileText className="h-3 w-3 shrink-0 text-primary/60" />
              <span className="truncate font-mono text-[11px]">{order.reference}</span>
            </div>
          )}

          {/* Destino */}
          {destination && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{destination.geofenceName}</span>
            </div>
          )}

          {/* Footer con badges */}
          <div className="flex items-center gap-1.5 mt-2">
            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', priorityConfig.className)}>
              {priorityConfig.label}
            </Badge>
            {order.cargo && (
              <span className="text-[10px] text-muted-foreground">
                {(order.cargo.weightKg / 1000).toFixed(1)}t
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // VARIANTE: CALENDAR (Dentro de celda de día)
  // ----------------------------------------
  if (variant === 'calendar') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        className={cn(
          'group flex items-center gap-1.5 rounded px-2 py-1 text-xs',
          'cursor-pointer transition-colors',
          statusConfig.className,
          hasConflict && 'ring-1 ring-red-400',
          className
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', priorityConfig.dotColor)} />
        <span className="truncate font-medium">{order.orderNumber}</span>
        {schedule?.vehicle && (
          <Truck className="h-3 w-3 shrink-0 opacity-60" />
        )}
        {hasConflict && (
          <AlertTriangle className="h-3 w-3 shrink-0 text-red-600" />
        )}
      </div>
    );
  }

  // ----------------------------------------
  // VARIANTE: TIMELINE (Vista por horas)
  // ----------------------------------------
  if (variant === 'timeline') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        className={cn(
          'flex flex-col rounded-md px-2 py-1.5 text-xs h-full',
          'cursor-pointer transition-colors overflow-hidden',
          statusConfig.className,
          hasConflict && 'ring-1 ring-red-400',
          className
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold truncate">{order.orderNumber}</span>
          {hasConflict && <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />}
        </div>
        <span className="truncate text-[10px] opacity-80">
          {order.customer?.name}
        </span>
        {schedule && (
          <div className="flex items-center gap-2 mt-auto pt-1 text-[10px] opacity-70">
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {schedule.scheduledStartTime}
            </span>
            {schedule.vehicle && (
              <span className="flex items-center gap-0.5">
                <Truck className="h-2.5 w-2.5" />
                {schedule.vehicle.plate}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
});
