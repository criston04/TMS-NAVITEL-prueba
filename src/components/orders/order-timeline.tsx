'use client';

import { memo, useMemo } from 'react';
import {
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Truck,
  Package,
  ArrowDown,
} from 'lucide-react';
import type { Order, OrderMilestone, MilestoneStatus } from '@/types/order';
import { cn } from '@/lib/utils';

/**
 * Props del componente OrderTimeline
 */
interface OrderTimelineProps {
  /** Orden con hitos */
  order: Order;
  /** Variante de visualización */
  variant?: 'vertical' | 'horizontal';
  /** Muestra tiempos detallados */
  showTimes?: boolean;
  /** Permite interacción */
  interactive?: boolean;
  /** Callback al hacer click en un hito */
  onMilestoneClick?: (milestone: OrderMilestone) => void;
  /** Clase adicional */
  className?: string;
}

/**
 * Props del item de timeline
 */
interface TimelineItemProps {
  /** Hito a mostrar */
  milestone: OrderMilestone;
  /** Es el último hito */
  isLast: boolean;
  /** Muestra tiempos */
  showTimes: boolean;
  /** Es interactivo */
  interactive: boolean;
  /** Callback al click */
  onClick?: (milestone: OrderMilestone) => void;
}

/**
 * Configuración de estados de hitos
 */
const MILESTONE_STATUS_CONFIG: Readonly<Record<MilestoneStatus, {
  icon: typeof Circle;
  className: string;
  lineClass: string;
  label: string;
}>> = {
  pending: {
    icon: Circle,
    className: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    lineClass: 'bg-gray-200 dark:bg-gray-700',
    label: 'Pendiente',
  },
  approaching: {
    icon: Truck,
    className: 'bg-[#34b7ff] text-white',
    lineClass: 'bg-[#34b7ff]/30 dark:bg-[#34b7ff]/20',
    label: 'Aproximándose',
  },
  in_progress: {
    icon: Truck,
    className: 'bg-[#34b7ff] text-white animate-pulse',
    lineClass: 'bg-blue-200 dark:bg-blue-900',
    label: 'En camino',
  },
  arrived: {
    icon: MapPin,
    className: 'bg-purple-500 text-white',
    lineClass: 'bg-purple-200 dark:bg-purple-900',
    label: 'Llegó',
  },
  completed: {
    icon: CheckCircle2,
    className: 'bg-green-500 text-white',
    lineClass: 'bg-green-500',
    label: 'Completado',
  },
  skipped: {
    icon: Circle,
    className: 'bg-gray-300 text-gray-500 line-through',
    lineClass: 'bg-gray-300 dark:bg-gray-600',
    label: 'Omitido',
  },
  delayed: {
    icon: AlertTriangle,
    className: 'bg-orange-500 text-white',
    lineClass: 'bg-orange-300 dark:bg-orange-800',
    label: 'Retrasado',
  },
};

/**
 * Configuración de tipos de hitos
 */
const MILESTONE_TYPE_ICONS: Record<OrderMilestone['type'], typeof Package> = {
  origin: Package,
  waypoint: MapPin,
  destination: MapPin,
};

/**
 * Formatea una hora
 * @param date - Fecha a formatear
 * @returns Hora formateada
 */
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Formatea fecha completa
 * @param date - Fecha a formatear
 * @returns Fecha formateada
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Calcula retraso en minutos
 * @param planned - Fecha planeada
 * @param actual - Fecha real
 * @returns Minutos de diferencia (positivo = tarde)
 */
function calculateDelay(planned: Date, actual: Date): number {
  return Math.round((new Date(actual).getTime() - new Date(planned).getTime()) / (1000 * 60));
}

// COMPONENTE TIMELINE ITEM

/**
 * Item individual del timeline
 */
function TimelineItem({
  milestone,
  isLast,
  showTimes,
  interactive,
  onClick,
}: Readonly<TimelineItemProps>) {
  const statusConfig = MILESTONE_STATUS_CONFIG[milestone.status];
  const TypeIcon = MILESTONE_TYPE_ICONS[milestone.type];
  const StatusIcon = statusConfig.icon;

  // Calcular retraso si aplica
  const delay = useMemo(() => {
    if (milestone.actualEntry && milestone.estimatedArrival) {
      return calculateDelay(new Date(milestone.estimatedArrival), new Date(milestone.actualEntry));
    }
    return null;
  }, [milestone.actualEntry, milestone.estimatedArrival]);

  const isDelayed = delay !== null && delay > 15; // Más de 15 minutos tarde

  return (
    <div
      className={cn(
        'flex gap-4',
        interactive && 'cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2',
      )}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={() => onClick?.(milestone)}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(milestone); } : undefined}
    >
      {/* Indicador y línea */}
      <div className="flex flex-col items-center">
        {/* Icono de estado */}
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center z-10',
            statusConfig.className,
          )}
        >
          <StatusIcon className="w-5 h-5" />
        </div>

        {/* Línea conectora */}
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 min-h-10',
              statusConfig.lineClass,
            )}
          />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 pb-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <TypeIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{milestone.geofenceName}</span>
              {milestone.sequence && (
                <span className="text-xs text-muted-foreground">
                  #{milestone.sequence}
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {milestone.address}
            </div>
          </div>

          {/* Badge de estado */}
          <div className="flex items-center gap-1.5">
            {milestone.isManual && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                Manual
              </span>
            )}
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                statusConfig.className,
              )}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Tiempos */}
        {showTimes && (
          <div className="mt-2 space-y-1 text-sm">
            {/* Tiempo planeado */}
            {milestone.estimatedArrival && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Planeado: {formatDateTime(new Date(milestone.estimatedArrival))}</span>
              </div>
            )}

            {/* Tiempo real de llegada */}
            {milestone.actualEntry && (
              <div className={cn(
                'flex items-center gap-2',
                isDelayed ? 'text-orange-500' : 'text-green-500',
              )}>
                <CheckCircle2 className="w-3 h-3" />
                <span>Llegada: {formatDateTime(new Date(milestone.actualEntry))}</span>
                {delay !== null && delay !== 0 && (
                  <span className={cn(
                    'text-xs px-1 rounded',
                    isDelayed 
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' 
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30',
                  )}>
                    {delay > 0 ? `+${delay}min` : `${delay}min`}
                  </span>
                )}
              </div>
            )}

            {/* Tiempo de salida */}
            {milestone.actualExit && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ArrowDown className="w-3 h-3 -rotate-90" />
                <span>Salida: {formatTime(new Date(milestone.actualExit))}</span>
              </div>
            )}
          </div>
        )}

        {/* Info de registro manual */}
        {milestone.isManual && milestone.manualEntryData && (
          <div className="mt-2 text-xs border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/20 p-2 space-y-0.5">
            <div className="flex items-center gap-1 font-medium text-orange-700 dark:text-orange-400">
              <span className="w-3 h-3 inline-block">✍️</span>
              Registro manual
            </div>
            <p className="text-muted-foreground">
              Por: <span className="font-medium">{milestone.manualEntryData.registeredBy}</span>
            </p>
            {milestone.manualEntryData.observation && (
              <p className="text-muted-foreground italic">
                &ldquo;{milestone.manualEntryData.observation}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Notas */}
        {milestone.notes && (
          <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
            {milestone.notes}
          </div>
        )}
      </div>
    </div>
  );
}

// COMPONENTE PRINCIPAL

/**
 * Línea de tiempo de hitos de una orden
 * @param props - Props del componente
 * @returns Componente de timeline
 */
function OrderTimelineComponent({
  order,
  variant = 'vertical',
  showTimes = true,
  interactive = false,
  onMilestoneClick,
  className,
}: Readonly<OrderTimelineProps>) {
  const { milestones } = order;

  // Ordenar hitos por secuencia
  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => a.sequence - b.sequence);
  }, [milestones]);

  // Calcular progreso
  const progress = useMemo(() => {
    const completed = milestones.filter(
      m => m.status === 'completed' || m.status === 'skipped'
    ).length;
    return Math.round((completed / milestones.length) * 100);
  }, [milestones]);

  if (variant === 'horizontal') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Barra de progreso */}
        <div className="relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="absolute right-0 -top-6 text-xs text-muted-foreground">
            {progress}%
          </span>
        </div>

        {/* Hitos horizontales */}
        <div className="flex items-start justify-between overflow-x-auto pb-2">
          {sortedMilestones.map((milestone) => {
            const statusConfig = MILESTONE_STATUS_CONFIG[milestone.status];
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={milestone.id}
                className={cn(
                  'flex flex-col items-center min-w-25 px-2',
                  interactive && 'cursor-pointer hover:opacity-80',
                )}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                onClick={() => onMilestoneClick?.(milestone)}
                onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onMilestoneClick?.(milestone); } : undefined}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    statusConfig.className,
                  )}
                >
                  <StatusIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium mt-2 text-center line-clamp-2">
                  {milestone.geofenceName}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-20">
                  {milestone.address.split(',')[0]}
                </span>
                {showTimes && milestone.estimatedArrival && (
                  <span className="text-xs text-muted-foreground">
                    {formatTime(new Date(milestone.estimatedArrival))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-0', className)}>
      {sortedMilestones.map((milestone, idx) => (
        <TimelineItem
          key={milestone.id}
          milestone={milestone}
          isLast={idx === sortedMilestones.length - 1}
          showTimes={showTimes}
          interactive={interactive}
          onClick={onMilestoneClick}
        />
      ))}
    </div>
  );
}

/**
 * Exportación memoizada
 */
export const OrderTimeline = memo(OrderTimelineComponent);
