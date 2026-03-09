'use client';

import { memo, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  User,
  Lock,
  Calendar as CalendarIcon,
} from 'lucide-react';
import type { GanttResourceRow } from '@/types/scheduling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SchedulingGanttProps {
  /** Datos del Gantt */
  ganttData: GanttResourceRow[];
  /** Fecha de inicio del rango */
  startDate: Date;
  /** Número de días a mostrar */
  days?: number;
  /** Cargando */
  isLoading?: boolean;
  /** Callback al navegar */
  onDateRangeChange: (startDate: Date) => void;
  /** Callback al hacer clic en una celda */
  onCellClick?: (resourceId: string, date: Date) => void;
  /** Clase adicional */
  className?: string;
}

const RESOURCE_COL_WIDTH = 180;
const DAY_COL_WIDTH = 120;

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// COMPONENTE: CELDA DE DÍA

const GanttDayCell = memo(function GanttDayCell({
  utilization,
  isBlocked,
  isToday,
  isWeekend,
  orderCount,
  onClick,
}: Readonly<{
  utilization: number;
  isBlocked: boolean;
  isToday: boolean;
  isWeekend: boolean;
  orderCount: number;
  onClick?: () => void;
}>) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className={cn(
        'relative flex items-center justify-center h-full border-r',
        'cursor-pointer transition-colors',
        'hover:bg-muted/30',
        isWeekend && 'bg-muted/20',
        isToday && 'ring-2 ring-primary ring-inset',
        isBlocked && 'bg-red-50/50 dark:bg-red-900/10 cursor-not-allowed',
      )}
      style={{ width: DAY_COL_WIDTH }}
    >
      {isBlocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Lock className="h-4 w-4 text-red-400" />
          </TooltipTrigger>
          <TooltipContent>Día bloqueado</TooltipContent>
        </Tooltip>
      ) : utilization > 0 ? (
        <div className="flex flex-col items-center gap-1">
          {/* Barra de utilización */}
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                utilization < 50 && 'bg-green-500',
                utilization >= 50 && utilization < 80 && 'bg-amber-500',
                utilization >= 80 && 'bg-red-500',
              )}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{utilization}%</span>
          {orderCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
              {orderCount} ord.
            </Badge>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground/40">—</span>
      )}
    </div>
  );
});

// COMPONENTE: FILA DE RECURSO

const GanttResourceRowComponent = memo(function GanttResourceRowComponent({
  row,
  today,
  onCellClick,
}: Readonly<{
  row: GanttResourceRow;
  today: Date;
  onCellClick?: (resourceId: string, date: Date) => void;
}>) {
  return (
    <div className="flex border-b" style={{ height: 56 }}>
      {/* Info del recurso */}
      <div
        className="flex items-center gap-2 px-2 border-r bg-muted/30 shrink-0"
        style={{ width: RESOURCE_COL_WIDTH }}
      >
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
            {row.type === 'vehicle' ? (
              <Truck className="h-3.5 w-3.5" />
            ) : (
              getInitials(row.name)
            )}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-xs truncate">{row.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {row.type === 'vehicle' ? 'Vehículo' : 'Conductor'}
          </p>
        </div>
      </div>

      {/* Celdas por día */}
      <div className="flex overflow-hidden">
        {row.dailyAssignments.map((day, i) => {
          const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
          return (
            <GanttDayCell
              key={`${row.resourceId}-d${i}`}
              utilization={day.utilization}
              isBlocked={day.isBlocked}
              isToday={isSameDay(day.date, today)}
              isWeekend={isWeekend}
              orderCount={day.orders.length}
              onClick={() => onCellClick?.(row.resourceId, day.date)}
            />
          );
        })}
      </div>
    </div>
  );
});

// COMPONENTE PRINCIPAL

export const SchedulingGantt = memo(function SchedulingGantt({
  ganttData,
  startDate,
  days = 7,
  isLoading = false,
  onDateRangeChange,
  onCellClick,
  className,
}: Readonly<SchedulingGanttProps>) {
  const today = useMemo(() => new Date(), []);

  // Generar array de fechas
  const dateHeaders = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [startDate, days]);

  // Rango formateado
  const rangeLabel = useMemo(() => {
    const end = new Date(startDate);
    end.setDate(startDate.getDate() + days - 1);
    const startStr = startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const endStr = end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }, [startDate, days]);

  // Separar vehículos
  const vehicleRows = useMemo(() => ganttData.filter(r => r.type === 'vehicle'), [ganttData]);

  // Navegación
  const handlePrevWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() - days);
    onDateRangeChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + days);
    onDateRangeChange(newDate);
  };

  const handleToday = () => {
    const monday = new Date();
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    onDateRangeChange(monday);
  };

  return (
    <div className={cn('flex flex-col bg-card rounded-lg border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8 px-3">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2 capitalize">{rangeLabel}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-xs">
            <Truck className="h-3 w-3" />
            {vehicleRows.length} camiones
          </Badge>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header de días */}
        <div className="flex border-b sticky top-0 bg-card z-20">
          <div
            className="shrink-0 border-r bg-muted/30 flex items-center px-3"
            style={{ width: RESOURCE_COL_WIDTH }}
          >
            <span className="text-xs font-medium text-muted-foreground">Recurso</span>
          </div>
          <div className="flex overflow-x-auto">
            {dateHeaders.map((date, i) => {
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isCurrentDay = isSameDay(date, today);
              return (
                <div
                  key={`header-${i}`}
                  className={cn(
                    'shrink-0 py-2 text-center text-xs font-medium border-r',
                    isWeekend && 'text-red-500/70 bg-muted/20',
                    isCurrentDay && 'bg-primary/10 text-primary font-bold',
                  )}
                  style={{ width: DAY_COL_WIDTH }}
                >
                  {formatDayHeader(date)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Filas */}
        <ScrollArea className="flex-1 min-h-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`skel-${i}`} className="h-14 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : ganttData.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              No hay recursos disponibles
            </div>
          ) : (
            <>
              {/* Vehículos */}
              {vehicleRows.length > 0 && (
                <>
                  <div className="px-3 py-1.5 bg-muted/50 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Camiones
                  </div>
                  {vehicleRows.map(row => (
                    <GanttResourceRowComponent
                      key={row.resourceId}
                      row={row}
                      today={today}
                      onCellClick={onCellClick}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollArea>
      </div>

      {/* Footer leyenda */}
      <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> {'<'}50%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> 50-80%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> {'>'}80%
        </span>
        <span className="flex items-center gap-1">
          <Lock className="h-2.5 w-2.5 text-red-400" /> Bloqueado
        </span>
      </div>
    </div>
  );
});
