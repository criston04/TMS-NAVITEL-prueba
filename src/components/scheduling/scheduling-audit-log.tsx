'use client';

import { memo, useMemo, useState } from 'react';
import {
  History,
  Plus,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  User,
  Clock,
  X,
  Calendar,
  Filter,
  FilterX,
} from 'lucide-react';
import type { ScheduleAuditLog } from '@/types/scheduling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SchedulingAuditLogProps {
  /** Registros de auditoría */
  logs: ScheduleAuditLog[];
  /** Panel visible */
  isOpen: boolean;
  /** Cargando */
  isLoading?: boolean;
  /** Callback al cerrar */
  onClose: () => void;
  /** Clase adicional */
  className?: string;
}

const ACTION_CONFIG: Record<ScheduleAuditLog['action'], {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  dotColor: string;
}> = {
  created: {
    label: 'Creada',
    icon: Plus,
    className: 'text-green-600',
    dotColor: 'bg-green-500',
  },
  updated: {
    label: 'Actualizada',
    icon: RefreshCcw,
    className: 'text-blue-600',
    dotColor: 'bg-blue-500',
  },
  reassigned: {
    label: 'Reasignada',
    icon: ArrowRight,
    className: 'text-indigo-600',
    dotColor: 'bg-indigo-500',
  },
  unscheduled: {
    label: 'Desprogramada',
    icon: XCircle,
    className: 'text-red-600',
    dotColor: 'bg-red-500',
  },
  conflict_detected: {
    label: 'Conflicto detectado',
    icon: AlertTriangle,
    className: 'text-amber-600',
    dotColor: 'bg-amber-500',
  },
  conflict_resolved: {
    label: 'Conflicto resuelto',
    icon: CheckCircle2,
    className: 'text-green-600',
    dotColor: 'bg-green-500',
  },
};

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

// COMPONENTE: ENTRADA DE LOG

const AuditLogEntry = memo(function AuditLogEntry({
  log,
  isLast,
}: Readonly<{
  log: ScheduleAuditLog;
  isLast: boolean;
}>) {
  const config = ACTION_CONFIG[log.action];
  const Icon = config.icon;

  return (
    <div className="relative flex gap-3 pb-4">
      {/* Timeline vertical */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          'h-7 w-7 rounded-full flex items-center justify-center',
          'bg-muted border-2',
          config.className
        )}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-muted mt-1" />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', config.className)}>
            {config.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(log.performedAt)}
          </span>
        </div>

        {/* Descripción */}
        <p className="text-xs mt-1">{log.description}</p>

        {/* Cambios */}
        {log.changes && log.changes.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {log.changes.map((change, i) => (
              <div
                key={`change-${i}`}
                className="flex items-center gap-1.5 text-[10px] p-1.5 rounded bg-muted/50"
              >
                <span className="font-medium text-muted-foreground">{change.field}:</span>
                {change.oldValue && (
                  <span className="line-through text-red-500/70">{change.oldValue || '(vacío)'}</span>
                )}
                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-green-600 font-medium">{change.newValue}</span>
              </div>
            ))}
          </div>
        )}

        {/* Usuario y fecha */}
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
          <User className="h-2.5 w-2.5" />
          <span>{log.performedByName}</span>
          <span>·</span>
          <span>{formatDateTime(log.performedAt)}</span>
        </div>
      </div>
    </div>
  );
});

// COMPONENTE PRINCIPAL

export const SchedulingAuditLog = memo(function SchedulingAuditLog({
  logs,
  isOpen,
  isLoading = false,
  onClose,
  className,
}: Readonly<SchedulingAuditLogProps>) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  const filteredAndSortedLogs = useMemo(() => {
    let filtered = [...logs];
    
    // Filtrar por rango de fechas
    if (startDate) {
      const startTime = new Date(startDate).setHours(0, 0, 0, 0);
      filtered = filtered.filter(log => 
        new Date(log.performedAt).getTime() >= startTime
      );
    }
    
    if (endDate) {
      const endTime = new Date(endDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => 
        new Date(log.performedAt).getTime() <= endTime
      );
    }
    
    // Ordenar por fecha descendente
    return filtered.sort((a, b) =>
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    );
  }, [logs, startDate, endDate]);
  
  const hasActiveFilters = startDate || endDate;
  
  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed right-0 top-0 bottom-0 w-[380px] z-50',
        'bg-card border-l shadow-2xl',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Historial de Cambios</h3>
          <Badge variant="secondary" className="h-5 text-[10px]">
            {filteredAndSortedLogs.length}
            {hasActiveFilters && logs.length !== filteredAndSortedLogs.length && (
              <span className="text-muted-foreground ml-0.5">/{logs.length}</span>
            )}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Filtros de Fecha */}
      <div className="px-4 py-3 border-b bg-background space-y-2">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Filtrar por fecha</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 ml-auto text-[10px]"
              onClick={clearFilters}
            >
              <FilterX className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {/* Fecha Inicio */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex-1 justify-start text-left font-normal h-8 text-xs",
                  !startDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-1.5 h-3 w-3" />
                {startDate ? format(startDate, "dd MMM yyyy", { locale: es }) : "Desde"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>

          {/* Fecha Fin */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex-1 justify-start text-left font-normal h-8 text-xs",
                  !endDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-1.5 h-3 w-3" />
                {endDate ? format(endDate, "dd MMM yyyy", { locale: es }) : "Hasta"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                locale={es}
                disabled={(date) => 
                  startDate ? date < startDate : false
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Contenido */}
      <ScrollArea className="h-[calc(100vh-156px)]">
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`skel-${i}`} className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-full bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-10 w-10 mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? 'Sin resultados' : 'Sin registros'}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {hasActiveFilters 
                  ? 'No hay registros en el rango de fechas seleccionado'
                  : 'Los cambios en la programación aparecerán aquí'
                }
              </p>
            </div>
          ) : (
            filteredAndSortedLogs.map((log, index) => (
              <AuditLogEntry
                key={log.id}
                log={log}
                isLast={index === filteredAndSortedLogs.length - 1}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
