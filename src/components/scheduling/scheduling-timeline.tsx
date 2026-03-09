'use client';

import { memo, useRef, useEffect } from 'react';
import {
  Truck,
  User,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ResourceTimeline, ScheduledOrder } from '@/types/scheduling';
import type { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SchedulingTimelineProps {
  /** Datos de timeline por recurso */
  timelines: ResourceTimeline[];
  /** Fecha actual del timeline */
  currentDate: Date;
  /** Cargando */
  isLoading?: boolean;
  /** Callback cambio de fecha */
  onDateChange: (date: Date) => void;
  /** Callback al hacer clic en un slot de tiempo */
  onTimeSlotClick?: (resourceId: string, hour: number) => void;
  /** Callback al soltar orden en un slot */
  onOrderDrop?: (order: Order, resourceId: string, hour: number) => void;
  /** Callback al hacer clic en una orden */
  onOrderClick?: (order: ScheduledOrder) => void;
  /** Clase adicional */
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_WIDTH = 80; // px por hora
const RESOURCE_HEIGHT = 64; // px por recurso
const HEADER_HEIGHT = 44;
const RESOURCE_COLUMN_WIDTH = 180;

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

const MAX_BAR_HOURS = 3; // Cap visual para barras largas

function getOrderPosition(order: ScheduledOrder): { left: number; width: number; isCapped: boolean } {
  const startDate = new Date(order.scheduledDate);
  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
  const duration = order.estimatedDuration || 2; // horas por defecto
  const cappedDuration = Math.min(duration, MAX_BAR_HOURS);
  
  return {
    left: startHour * HOUR_WIDTH,
    width: cappedDuration * HOUR_WIDTH,
    isCapped: duration > MAX_BAR_HOURS,
  };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// COMPONENTE: BARRA DE ORDEN EN TIMELINE

const TimelineOrderBar = memo(function TimelineOrderBar({
  order,
  onClick,
}: Readonly<{
  order: ScheduledOrder;
  onClick?: () => void;
}>) {
  const { left, width, isCapped } = getOrderPosition(order);

  const priorityColors = {
    urgent: 'bg-red-500 border-red-600',
    high: 'bg-orange-500 border-orange-600',
    normal: 'bg-[#34b7ff] border-[#34b7ff]',
    low: 'bg-gray-400 border-gray-500',
  };

  const duration = order.estimatedDuration || 2;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'absolute top-1.5 h-[calc(100%-12px)] rounded',
            'border-l-[3px] px-1.5 py-0.5',
            'text-white text-[10px] font-medium',
            'truncate cursor-pointer',
            'hover:brightness-110 transition-all',
            'shadow-sm hover:shadow-md',
            priorityColors[order.priority],
            order.hasConflict && 'ring-2 ring-amber-400 ring-offset-1'
          )}
          style={{
            left: `${left}px`,
            width: `${Math.max(width - 4, 32)}px`,
          }}
          onClick={onClick}
        >
          <span className="truncate">{order.orderNumber}</span>
          {isCapped && (
            <span className="ml-0.5 opacity-70">({duration}h)</span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">
            {order.customer?.name}
          </p>
          <p className="text-xs">
            {new Date(order.scheduledDate).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' — '}
            {duration}h duración
          </p>
          {isCapped && (
            <p className="text-xs text-muted-foreground italic">Vista compactada (tramo largo)</p>
          )}
          {order.hasConflict && (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Conflicto detectado
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

// COMPONENTE: FILA DE RECURSO

const ResourceRow = memo(function ResourceRow({
  timeline,
  onTimeSlotClick,
  onOrderDrop,
  onOrderClick,
}: Readonly<{
  timeline: ResourceTimeline;
  onTimeSlotClick?: (hour: number) => void;
  onOrderDrop?: (order: Order, hour: number) => void;
  onOrderClick?: (order: ScheduledOrder) => void;
}>) {
  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    try {
      const orderData = e.dataTransfer.getData('application/json');
      if (orderData) {
        const order = JSON.parse(orderData) as Order;
        onOrderDrop?.(order, hour);
      }
    } catch (error) {
      console.error('Error parsing dropped order:', error);
    }
  };

  return (
    <div
      className="flex border-b"
      style={{ height: RESOURCE_HEIGHT }}
    >
      {/* Info del recurso */}
      <div
        className="flex items-center gap-2 px-2 border-r bg-muted/30 shrink-0"
        style={{ width: RESOURCE_COLUMN_WIDTH }}
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {timeline.type === 'vehicle' ? (
              <Truck className="h-4 w-4" />
            ) : (
              getInitials(timeline.name)
            )}
          </AvatarFallback>
        </Avatar>
        
        <div className="min-w-0 flex-1">
          <p className="font-medium text-xs truncate" title={timeline.name}>
            {timeline.name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {timeline.type === 'vehicle' ? (
              <span>{timeline.assignments.length} asignaciones</span>
            ) : (
              <span>Operador</span>
            )}
          </p>
        </div>
        
        {/* Indicador de capacidad vertical */}
        <div className="w-1.5 h-8 bg-muted rounded-full overflow-hidden shrink-0">
          <div
            className={cn(
              'w-full rounded-full transition-all',
              timeline.utilization < 50 && 'bg-green-500',
              timeline.utilization >= 50 && timeline.utilization < 80 && 'bg-amber-500',
              timeline.utilization >= 80 && 'bg-red-500'
            )}
            style={{ height: `${Math.min(timeline.utilization, 100)}%` }}
          />
        </div>
      </div>

      {/* Slots de tiempo */}
      <div className="relative flex-1">
        {/* Grid de horas */}
        <div className="absolute inset-0 flex">
          {HOURS.map(hour => (
            <div
              key={hour}
              role="button"
              tabIndex={0}
              className={cn(
                'border-r border-dashed border-muted-foreground/20',
                'hover:bg-primary/5 transition-colors cursor-pointer'
              )}
              style={{ width: HOUR_WIDTH }}
              onClick={() => onTimeSlotClick?.(hour)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTimeSlotClick?.(hour); }}
              onDragOver={(e) => handleDragOver(e, hour)}
              onDrop={(e) => handleDrop(e, hour)}
            />
          ))}
        </div>

        {/* Órdenes asignadas */}
        {timeline.assignments.map(order => (
          <TimelineOrderBar
            key={order.id}
            order={order}
            onClick={() => onOrderClick?.(order)}
          />
        ))}

        {/* Indicador de hora actual */}
        {(() => {
          const now = new Date();
          const currentHour = now.getHours() + now.getMinutes() / 60;
          const left = currentHour * HOUR_WIDTH;
          return (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ left: `${left}px` }}
            />
          );
        })()}
      </div>
    </div>
  );
});

// COMPONENTE PRINCIPAL

export const SchedulingTimeline = memo(function SchedulingTimeline({
  timelines,
  currentDate,
  isLoading = false,
  onDateChange,
  onTimeSlotClick,
  onOrderDrop,
  onOrderClick,
  className,
}: Readonly<SchedulingTimelineProps>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll inicial a hora actual
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const scrollPosition = Math.max(0, (now.getHours() - 2) * HOUR_WIDTH);
      scrollContainerRef.current.scrollLeft = scrollPosition;
    }
  }, []);

  // ----------------------------------------
  // NAVEGACIÓN
  // ----------------------------------------
  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // ----------------------------------------
  // RENDER
  // ----------------------------------------
  return (
    <div className={cn('flex flex-col bg-card rounded-lg border', className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 border-b shrink-0"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousDay}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 px-3"
          >
            <Clock className="h-4 w-4 mr-1" />
            Hoy
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold ml-2 capitalize">
            {currentDate.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Truck className="h-3 w-3" />
            {timelines.filter(t => t.type === 'vehicle').length} camiones
          </Badge>
        </div>
      </div>

      {/* Timeline content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header de horas */}
        <div className="flex border-b sticky top-0 bg-card z-20">
          <div
            className="shrink-0 border-r bg-muted/30"
            style={{ width: RESOURCE_COLUMN_WIDTH }}
          />
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto scrollbar-thin"
          >
            {HOURS.map(hour => (
              <div
                key={hour}
                className={cn(
                  'shrink-0 py-1.5 text-center text-[11px] font-medium',
                  'text-muted-foreground border-r',
                  hour === new Date().getHours() && 'bg-red-500/10 text-red-600'
                )}
                style={{ width: HOUR_WIDTH }}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>
        </div>

        {/* Filas de recursos */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col">
            {isLoading ? (
              // Skeletons
              new Array(5).fill(null).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="flex border-b animate-pulse"
                  style={{ height: RESOURCE_HEIGHT }}
                >
                  <div
                    className="bg-muted/30 border-r"
                    style={{ width: RESOURCE_COLUMN_WIDTH }}
                  />
                  <div className="flex-1 bg-muted/10" />
                </div>
              ))
            ) : timelines.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <p>No hay recursos disponibles para mostrar</p>
              </div>
            ) : (
              timelines
                .filter(timeline => timeline.type === 'vehicle')
                .map(timeline => (
                <ResourceRow
                  key={timeline.resourceId}
                  timeline={timeline}
                  onTimeSlotClick={(hour) => onTimeSlotClick?.(timeline.resourceId, hour)}
                  onOrderDrop={(order, hour) => onOrderDrop?.(order, timeline.resourceId, hour)}
                  onOrderClick={onOrderClick}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
});
