'use client';

import { memo, useState, useCallback } from 'react';
import { Plus, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import type { ScheduledOrder, CalendarDayData } from '@/types/scheduling';
import type { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SchedulingOrderCard } from './scheduling-order-card';
import { cn } from '@/lib/utils';

interface SchedulingDayCellProps {
  /** Datos del día */
  dayData: CalendarDayData;
  /** Es el día actual */
  isToday?: boolean;
  /** Está fuera del mes actual */
  isOutsideMonth?: boolean;
  /** Está seleccionado */
  isSelected?: boolean;
  /** Hay un arrastre activo sobre este día */
  isDragOver?: boolean;
  /** Callback al soltar una orden */
  onDrop?: (order: Order, date: Date) => void;
  /** Callback al hacer clic en el día */
  onClick?: (date: Date) => void;
  /** Callback al hacer clic en una orden */
  onOrderClick?: (order: ScheduledOrder) => void;
  /** Callback para agregar orden manualmente */
  onAddOrder?: (date: Date) => void;
  /** Mostrar en vista compacta (semana) */
  compact?: boolean;
  /** Clase adicional */
  className?: string;
}

const MAX_VISIBLE_ORDERS = 3;

// COMPONENTE

export const SchedulingDayCell = memo(function SchedulingDayCell({
  dayData,
  isToday = false,
  isOutsideMonth = false,
  isSelected = false,
  isDragOver = false,
  onDrop,
  onClick,
  onOrderClick,
  onAddOrder,
  compact = false,
  className,
}: Readonly<SchedulingDayCellProps>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // ----------------------------------------
  // DRAG & DROP HANDLERS
  // ----------------------------------------
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  }, [isDraggingOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    try {
      const orderData = e.dataTransfer.getData('application/json');
      if (orderData) {
        const order = JSON.parse(orderData) as Order;
        onDrop?.(order, dayData.date);
      }
    } catch (error) {
      console.error('Error parsing dropped order:', error);
    }
  }, [dayData.date, onDrop]);

  // ----------------------------------------
  // CÁLCULOS
  // ----------------------------------------
  const visibleOrders = dayData.orders.slice(0, MAX_VISIBLE_ORDERS);
  const hiddenCount = Math.max(0, dayData.orders.length - MAX_VISIBLE_ORDERS);
  const hasConflicts = dayData.orders.some(o => o.hasConflict);
  const allConfirmed = dayData.orders.length > 0 && 
    dayData.orders.every(o => o.scheduleStatus === 'ready' || o.scheduleStatus === 'completed');

  // ----------------------------------------
  // RENDER
  // ----------------------------------------
  return (
    <div
      className={cn(
        'relative flex flex-col min-h-30 border-r border-b',
        'transition-all duration-200',
        isOutsideMonth && 'bg-muted/30',
        !isOutsideMonth && !dayData.isBlocked && 'bg-card',
        dayData.isBlocked && 'bg-red-50/60 dark:bg-red-950/20',
        isToday && 'ring-2 ring-primary ring-inset',
        isSelected && !dayData.isBlocked && 'bg-primary/5',
        (isDragOver || isDraggingOver) && !dayData.isBlocked && 'bg-primary/10 ring-2 ring-primary ring-dashed',
        isHovered && !isDraggingOver && !dayData.isBlocked && 'bg-muted/50',
        // Compacto
        compact && 'min-h-20',
        className
      )}
      onDragOver={dayData.isBlocked ? undefined : handleDragOver}
      onDragLeave={dayData.isBlocked ? undefined : handleDragLeave}
      onDrop={dayData.isBlocked ? undefined : handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(dayData.date)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(dayData.date); }}
      tabIndex={0}
      role="gridcell"
      aria-label={`${dayData.date.toLocaleDateString()}, ${dayData.orders.length} órdenes`}
    >
      {/* Header del día */}
      <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/20">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
              isToday && 'bg-primary text-primary-foreground',
              isOutsideMonth && 'text-muted-foreground/50'
            )}
          >
            {dayData.date.getDate()}
          </span>
          
          {/* Indicadores */}
          {hasConflicts && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Hay conflictos de asignación</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {allConfirmed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Todas las órdenes confirmadas</p>
              </TooltipContent>
            </Tooltip>
          )}

          {dayData.isBlocked && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock className="h-3.5 w-3.5 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Día bloqueado</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Contador y botón agregar */}
        <div className="flex items-center gap-1">
          {dayData.orders.length > 0 && (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-xs"
            >
              {dayData.orders.length}
            </Badge>
          )}
          
          {(isHovered || isDraggingOver) && onAddOrder && !dayData.isBlocked && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                onAddOrder(dayData.date);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Contenido del día - Órdenes */}
      <div className="flex-1 p-1 space-y-1 overflow-hidden">
        {dayData.isBlocked && dayData.orders.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-1 text-red-400 dark:text-red-500/70">
              <Lock className="h-4 w-4" />
              <span className="text-[10px] font-medium">Bloqueado</span>
            </div>
          </div>
        )}
        {visibleOrders.map(order => (
          <SchedulingOrderCard
            key={order.id}
            order={order}
            variant="calendar"
            onClick={() => onOrderClick?.(order)}
            className="cursor-pointer"
          />
        ))}
        
        {hiddenCount > 0 && (
          <button
            className={cn(
              'w-full text-xs text-center py-1 rounded',
              'bg-muted/50 text-muted-foreground',
              'hover:bg-muted transition-colors'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(dayData.date);
            }}
          >
            +{hiddenCount} más
          </button>
        )}
      </div>

      {/* Indicador de capacidad */}
      <div className="absolute bottom-0 left-0 right-0 h-1">
        <div
          className={cn(
            'h-full transition-all duration-300',
            dayData.isBlocked && 'bg-red-500/70',
            !dayData.isBlocked && dayData.utilization < 50 && 'bg-green-500/50',
            !dayData.isBlocked && dayData.utilization >= 50 && dayData.utilization < 80 && 'bg-amber-500/50',
            !dayData.isBlocked && dayData.utilization >= 80 && 'bg-red-500/50'
          )}
          style={{ width: dayData.isBlocked ? '100%' : `${Math.min(dayData.utilization, 100)}%` }}
        />
      </div>
    </div>
  );
});
