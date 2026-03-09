'use client';

import { memo } from 'react';
import {
  X,
  Package,
  Truck,
  User,
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Weight,
  Route,
  Hash,
} from 'lucide-react';
import type { Order, OrderPriority } from '@/types/order';
import type { ScheduledOrder, ScheduleStatus } from '@/types/scheduling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SchedulingOrderDetailProps {
  /** Orden a mostrar */
  order: Order | ScheduledOrder | null;
  /** Visible */
  isOpen: boolean;
  /** Callback al cerrar */
  onClose: () => void;
  /** Callback al abrir asignación */
  onSchedule?: (order: Order) => void;
  /** Clase adicional */
  className?: string;
}

const PRIORITY_CONFIG: Record<OrderPriority, { label: string; className: string; dotColor: string }> = {
  low: { label: 'Baja', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', dotColor: 'bg-gray-400' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dotColor: 'bg-[#34b7ff]' },
  high: { label: 'Alta', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', dotColor: 'bg-orange-500' },
  urgent: { label: 'Urgente', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dotColor: 'bg-red-500' },
};

const SCHEDULE_STATUS_CONFIG: Record<ScheduleStatus, { label: string; className: string }> = {
  unscheduled: { label: 'Sin programar', className: 'bg-gray-100 text-gray-700' },
  scheduled: { label: 'Programada', className: 'bg-blue-100 text-blue-700' },
  partial: { label: 'Incompleta', className: 'bg-yellow-100 text-yellow-700' },
  ready: { label: 'Lista', className: 'bg-green-100 text-green-700' },
  in_progress: { label: 'En curso', className: 'bg-indigo-100 text-indigo-700' },
  conflict: { label: 'Conflicto', className: 'bg-red-100 text-red-700' },
  completed: { label: 'Completada', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-500' },
};

// COMPONENTE: SECCIÓN INFO

const InfoSection = memo(function InfoSection({
  title,
  icon: Icon,
  children,
}: Readonly<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}>) {
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
});

// COMPONENTE: FILA DE DETALLE

const DetailRow = memo(function DetailRow({
  label,
  value,
  valueClassName,
}: Readonly<{
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-medium text-right', valueClassName)}>
        {value || '—'}
      </span>
    </div>
  );
});

// COMPONENTE PRINCIPAL

export const SchedulingOrderDetail = memo(function SchedulingOrderDetail({
  order,
  isOpen,
  onClose,
  onSchedule,
  className,
}: Readonly<SchedulingOrderDetailProps>) {
  if (!order || !isOpen) return null;

  const priority = order.priority || 'normal';
  const priorityConfig = PRIORITY_CONFIG[priority];
  const isScheduled = 'scheduledDate' in order && order.scheduledDate;
  const scheduleData = isScheduled ? (order as ScheduledOrder) : null;
  const scheduleStatus = scheduleData?.scheduleStatus || 'unscheduled';
  const statusConfig = SCHEDULE_STATUS_CONFIG[scheduleStatus];

  const origin = order.milestones?.find(m => m.type === 'origin');
  const destination = order.milestones?.find(m => m.type === 'destination');
  const hasConflicts = scheduleData?.conflicts && scheduleData.conflicts.length > 0;
  const isUnassigned = !order.vehicleId && !order.driverId;

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
        <div className="flex items-center gap-2 min-w-0">
          <Package className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-semibold text-sm truncate">Detalle de Orden</h3>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" 
          onClick={onClose}
          aria-label="Cerrar panel"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Contenido */}
      <ScrollArea className="h-[calc(100vh-56px-56px)]">
        <div className="p-4 pb-16 space-y-4">
          {/* Orden Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', priorityConfig.dotColor)} />
              <h2 className="text-lg font-bold">{order.orderNumber}</h2>
              {hasConflicts && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className={cn('text-[10px]', priorityConfig.className)}>
                {priorityConfig.label}
              </Badge>
              <Badge variant="secondary" className={cn('text-[10px]', statusConfig.className)}>
                {statusConfig.label}
              </Badge>
              {order.status && (
                <Badge variant="outline" className="text-[10px]">
                  {order.status}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Referencias */}
          <InfoSection title="Referencias" icon={FileText}>
            <DetailRow label="Referencia" value={
              order.reference && (
                <span className="font-mono text-[11px]">{order.reference}</span>
              )
            } />
            <DetailRow label="Ref. externa" value={
              order.externalReference && (
                <span className="font-mono text-[11px]">{order.externalReference}</span>
              )
            } />
            <DetailRow label="ID" value={
              <span className="font-mono text-[10px] text-muted-foreground">{order.id}</span>
            } />
          </InfoSection>

          <Separator />

          {/* Cliente */}
          <InfoSection title="Cliente" icon={User}>
            <DetailRow label="Nombre" value={order.customer?.name} />
            {order.customer?.code && (
              <DetailRow label="Código" value={
                <span className="font-mono">{order.customer.code}</span>
              } />
            )}
            {order.customer?.email && (
              <DetailRow label="Email" value={order.customer.email} />
            )}
          </InfoSection>

          <Separator />

          {/* Ruta */}
          <InfoSection title="Ruta" icon={Route}>
            {origin && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-green-50/50 dark:bg-green-900/10">
                <div className="h-5 w-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                  A
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">{origin.geofenceName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{origin.address}</p>
                </div>
              </div>
            )}
            {destination && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-red-50/50 dark:bg-red-900/10">
                <div className="h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                  B
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">{destination.geofenceName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{destination.address}</p>
                </div>
              </div>
            )}
          </InfoSection>

          <Separator />

          {/* Carga */}
          {order.cargo && (
            <>
              <InfoSection title="Carga" icon={Weight}>
                <DetailRow label="Descripción" value={order.cargo.description} />
                <DetailRow label="Tipo" value={order.cargo.type} />
                <DetailRow
                  label="Peso"
                  value={`${(order.cargo.weightKg / 1000).toFixed(1)} toneladas`}
                />
                {order.cargo.quantity && (
                  <DetailRow label="Cantidad" value={String(order.cargo.quantity)} />
                )}
              </InfoSection>
              <Separator />
            </>
          )}

          {/* Recursos asignados */}
          <InfoSection title="Recursos" icon={Truck}>
            {order.vehicle ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5">
                <Truck className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium">{order.vehicle.plate}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {order.vehicle.brand} {order.vehicle.model}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sin vehículo asignado</p>
            )}
          </InfoSection>

          <Separator />

          {/* Programación */}
          <InfoSection title="Programación" icon={CalendarIcon}>
            {scheduleData ? (
              <>
                <DetailRow
                  label="Fecha"
                  value={new Date(scheduleData.scheduledDate).toLocaleDateString('es-PE', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
                {scheduleData.scheduledStartTime && (
                  <DetailRow label="Hora inicio" value={scheduleData.scheduledStartTime} />
                )}
                {scheduleData.estimatedEndTime && (
                  <DetailRow label="Hora fin est." value={scheduleData.estimatedEndTime} />
                )}
                {scheduleData.estimatedDuration && (
                  <DetailRow label="Duración est." value={`${scheduleData.estimatedDuration}h`} />
                )}
                {scheduleData.scheduledByName && (
                  <DetailRow label="Programado por" value={scheduleData.scheduledByName} />
                )}
                {scheduleData.schedulingNotes && (
                  <div className="p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
                    <p className="font-medium mb-0.5">Notas:</p>
                    {scheduleData.schedulingNotes}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Orden sin fecha programada</p>
            )}
          </InfoSection>

          {/* Conflictos */}
          {hasConflicts && scheduleData?.conflicts && (
            <>
              <Separator />
              <InfoSection title="Conflictos" icon={AlertTriangle}>
                {scheduleData.conflicts.map(conflict => (
                  <div
                    key={conflict.id}
                    className={cn(
                      'p-2 rounded-md text-xs',
                      conflict.severity === 'high' && 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
                      conflict.severity === 'medium' && 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
                      conflict.severity === 'low' && 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
                    )}
                  >
                    <p className="font-medium">{conflict.message}</p>
                    {conflict.suggestedResolution && (
                      <p className="mt-0.5 opacity-80">{conflict.suggestedResolution}</p>
                    )}
                  </div>
                ))}
              </InfoSection>
            </>
          )}

          {/* Fechas del sistema */}
          <Separator />
          <InfoSection title="Información" icon={Hash}>
            {order.createdAt && (
              <DetailRow
                label="Creada"
                value={new Date(order.createdAt).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            )}
            {order.completionPercentage !== undefined && (
              <div className="space-y-1">
                <DetailRow label="Avance" value={`${order.completionPercentage}%`} />
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      order.completionPercentage < 50 && 'bg-amber-500',
                      order.completionPercentage >= 50 && order.completionPercentage < 100 && 'bg-blue-500',
                      order.completionPercentage >= 100 && 'bg-green-500',
                    )}
                    style={{ width: `${order.completionPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </InfoSection>
        </div>
      </ScrollArea>

      {/* Footer con acciones */}
      <div className="absolute bottom-0 left-0 right-0 border-t bg-card px-4 py-3">
        {isUnassigned ? (
          <Button
            className="w-full"
            onClick={() => onSchedule?.(order)}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Programar Orden
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Orden programada
          </div>
        )}
      </div>
    </div>
  );
});
