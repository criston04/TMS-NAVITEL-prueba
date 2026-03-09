'use client';

import { memo, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LayoutGrid,
  Rows3,
  CalendarDays,
} from 'lucide-react';
import type { CalendarDayData, ScheduledOrder, CalendarViewType } from '@/types/scheduling';
import type { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SchedulingDayCell } from './scheduling-day-cell';
import { cn } from '@/lib/utils';

interface SchedulingCalendarProps {
  /** Datos del calendario por día */
  calendarData: CalendarDayData[];
  /** Mes actual */
  currentMonth: Date;
  /** Vista actual */
  view: CalendarViewType;
  /** Día seleccionado */
  selectedDate?: Date | null;
  /** Orden siendo arrastrada */
  draggingOrder?: Order | null;
  /** Cargando */
  isLoading?: boolean;
  /** Callback cambio de mes */
  onMonthChange: (date: Date) => void;
  /** Callback cambio de vista */
  onViewChange: (view: CalendarViewType) => void;
  /** Callback selección de día */
  onDateSelect?: (date: Date) => void;
  /** Callback al soltar orden */
  onOrderDrop?: (order: Order, date: Date) => void;
  /** Callback al hacer clic en orden */
  onOrderClick?: (order: ScheduledOrder) => void;
  /** Callback para agregar orden */
  onAddOrder?: (date: Date) => void;
  /** Clase adicional */
  className?: string;
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_OF_WEEK_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const VIEW_OPTIONS: { value: CalendarViewType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'month', label: 'Mes', icon: LayoutGrid },
  { value: 'week', label: 'Semana', icon: Rows3 },
  { value: 'day', label: 'Día', icon: CalendarDays },
];

function getMonthName(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function getSkeletonCount(view: CalendarViewType): number {
  switch (view) {
    case 'day': return 1;
    case 'week': return 7;
    case 'month': return 42;
    default: return 42;
  }
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// COMPONENTE

export const SchedulingCalendar = memo(function SchedulingCalendar({
  calendarData,
  currentMonth,
  view,
  selectedDate,
  draggingOrder: _draggingOrder,
  isLoading = false,
  onMonthChange,
  onViewChange,
  onDateSelect,
  onOrderDrop,
  onOrderClick,
  onAddOrder,
  className,
}: Readonly<SchedulingCalendarProps>) {
  const today = useMemo(() => new Date(), []);

  // ----------------------------------------
  // NAVEGACIÓN
  // ----------------------------------------
  const handlePrevious = useCallback(() => {
    const newDate = new Date(currentMonth);
    if (view === 'month') {
      newDate.setMonth(currentMonth.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(currentMonth.getDate() - 7);
    } else {
      newDate.setDate(currentMonth.getDate() - 1);
    }
    onMonthChange(newDate);
  }, [currentMonth, view, onMonthChange]);

  const handleNext = useCallback(() => {
    const newDate = new Date(currentMonth);
    if (view === 'month') {
      newDate.setMonth(currentMonth.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(currentMonth.getDate() + 7);
    } else {
      newDate.setDate(currentMonth.getDate() + 1);
    }
    onMonthChange(newDate);
  }, [currentMonth, view, onMonthChange]);

  const handleToday = useCallback(() => {
    onMonthChange(new Date());
  }, [onMonthChange]);

  // ----------------------------------------
  // GENERACIÓN DE DÍAS PARA EL MES
  // ----------------------------------------
  const calendarDays = useMemo(() => {
    if (view === 'day') {
      // Vista de día único
      const dayData = calendarData.find(d => isSameDay(d.date, currentMonth));
      return dayData ? [dayData] : [];
    }

    if (view === 'week') {
      // Vista de semana
      const { start } = getWeekRange(currentMonth);
      const weekDays: CalendarDayData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const existing = calendarData.find(d => isSameDay(d.date, date));
        weekDays.push(existing || {
          date,
          orders: [],
          utilization: 0,
          isBlocked: false,
        });
      }
      return weekDays;
    }

    // Vista de mes
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    
    // Último día del mes (no necesitamos daysInMonth ya que usamos totalDays fijo)
    const _lastDay = new Date(year, month + 1, 0);
    void _lastDay; // Mantener referencia para posible uso futuro
    
    // Calcular días totales a mostrar (6 semanas)
    const totalDays = 42;
    const days: CalendarDayData[] = [];
    
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(year, month, 1 - startOffset + i);
      const existing = calendarData.find(d => isSameDay(d.date, date));
      days.push(existing || {
        date,
        orders: [],
        utilization: 0,
        isBlocked: false,
      });
    }
    
    return days;
  }, [calendarData, currentMonth, view]);

  // ----------------------------------------
  // TÍTULO DEL HEADER
  // ----------------------------------------
  const headerTitle = useMemo(() => {
    if (view === 'day') {
      return currentMonth.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    if (view === 'week') {
      const { start, end } = getWeekRange(currentMonth);
      const startStr = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      const endStr = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    return getMonthName(currentMonth);
  }, [currentMonth, view]);

  // ----------------------------------------
  // RENDER
  // ----------------------------------------
  return (
    <div className={cn('flex flex-col bg-card rounded-lg border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        {/* Navegación */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
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
            <CalendarIcon className="h-4 w-4 mr-1" />
            Hoy
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold ml-2 capitalize">
            {headerTitle}
          </h2>
        </div>

        {/* Selector de vista */}
        <Tabs
          value={view}
          onValueChange={(v) => onViewChange(v as CalendarViewType)}
        >
          <TabsList className="h-8">
            {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-7 px-3 text-xs gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Días de la semana (solo mes y semana) */}
      {view !== 'day' && (
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {(view === 'week' ? DAYS_OF_WEEK_FULL : DAYS_OF_WEEK).map((day, index) => (
            <div
              key={day}
              className={cn(
                'py-2 text-center text-sm font-medium text-muted-foreground',
                'border-r last:border-r-0',
                index === 0 && 'text-red-500/70',
                index === 6 && 'text-red-500/70'
              )}
            >
              {day}
            </div>
          ))}
        </div>
      )}

      {/* Grid del calendario */}
      <div
        className={cn(
          'flex-1 overflow-auto',
          view === 'month' && 'grid grid-cols-7 auto-rows-fr',
          view === 'week' && 'grid grid-cols-7',
          view === 'day' && 'flex'
        )}
      >
        {isLoading ? (
          // Skeletons
          new Array(getSkeletonCount(view)).fill(null).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className={cn(
                'border-r border-b bg-muted/20 animate-pulse',
                view === 'day' ? 'flex-1 min-h-100' : 'min-h-25'
              )}
            />
          ))
        ) : (
          calendarDays.map((dayData, _index) => (
            <SchedulingDayCell
              key={dayData.date.toISOString()}
              dayData={dayData}
              isToday={isSameDay(dayData.date, today)}
              isOutsideMonth={view === 'month' && dayData.date.getMonth() !== currentMonth.getMonth()}
              isSelected={selectedDate ? isSameDay(dayData.date, selectedDate) : false}
              isDragOver={false}
              onDrop={onOrderDrop}
              onClick={onDateSelect}
              onOrderClick={onOrderClick}
              onAddOrder={onAddOrder}
              compact={view === 'month'}
              className={cn(
                view === 'day' && 'flex-1 min-h-100',
                view === 'week' && 'min-h-100'
              )}
            />
          ))
        )}
      </div>
    </div>
  );
});
