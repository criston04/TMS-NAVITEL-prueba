'use client';

import { memo, useMemo } from 'react';
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Clock,
  Package,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  ArrowRight,
} from 'lucide-react';
import type { Order } from '@/types/order';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * Props del componente OrderCard
 */
interface OrderCardProps {
  /** Orden a mostrar */
  order: Order;
  /** Si está seleccionada */
  isSelected?: boolean;
  /** Callback al seleccionar */
  onSelect?: (id: string) => void;
  /** Callback al hacer click */
  onClick?: (order: Order) => void;
  /** Variante de visualización */
  variant?: 'default' | 'compact';
  /** Muestra checkbox de selección */
  showCheckbox?: boolean;
  /** Clase adicional */
  className?: string;
}

/**
 * Configuración de badges por estado
 */
const STATUS_CONFIG: Record<Order['status'], { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: typeof Truck;
  className: string;
}> = {
  draft: { 
    label: 'Borrador', 
    variant: 'secondary', 
    icon: Package,
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  pending: { 
    label: 'Pendiente', 
    variant: 'outline', 
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  assigned: { 
    label: 'Asignada', 
    variant: 'default', 
    icon: User,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  in_transit: { 
    label: 'En tránsito', 
    variant: 'default', 
    icon: Truck,
    className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  at_milestone: { 
    label: 'En hito', 
    variant: 'default', 
    icon: MapPin,
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  delayed: { 
    label: 'Retrasada', 
    variant: 'destructive', 
    icon: AlertTriangle,
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  completed: { 
    label: 'Completada', 
    variant: 'default', 
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  closed: { 
    label: 'Cerrada', 
    variant: 'secondary', 
    icon: CheckCircle,
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  cancelled: { 
    label: 'Cancelada', 
    variant: 'destructive', 
    icon: XCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

/**
 * Configuración de prioridades
 */
const PRIORITY_CONFIG: Record<Order['priority'], { 
  label: string; 
  className: string;
}> = {
  low: { label: 'Baja', className: 'text-gray-500' },
  normal: { label: 'Normal', className: 'text-[#34b7ff]' },
  high: { label: 'Alta', className: 'text-orange-500' },
  urgent: { label: 'Urgente', className: 'text-red-500 font-semibold' },
};

/**
 * Formatea una fecha de forma legible
 * @param date - Fecha a formatear
 * @returns Fecha formateada
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Calcula tiempo restante o transcurrido
 * @param targetDate - Fecha objetivo
 * @returns String con tiempo
 */
function getTimeRemaining(targetDate: Date): { text: string; isOverdue: boolean } {
  const now = new Date();
  const target = new Date(targetDate);
  const diffMs = target.getTime() - now.getTime();
  const diffHours = Math.abs(Math.round(diffMs / (1000 * 60 * 60)));
  const diffDays = Math.abs(Math.round(diffMs / (1000 * 60 * 60 * 24)));

  if (diffMs < 0) {
    if (diffDays >= 1) {
      return { text: `${diffDays}d tarde`, isOverdue: true };
    }
    return { text: `${diffHours}h tarde`, isOverdue: true };
  }

  if (diffDays >= 1) {
    return { text: `${diffDays}d restantes`, isOverdue: false };
  }
  return { text: `${diffHours}h restantes`, isOverdue: false };
}

// COMPONENTE

/**
 * Tarjeta de orden para visualización en lista
 * @param props - Props del componente
 * @returns Componente de tarjeta de orden
 */
function OrderCardComponent({
  order,
  isSelected = false,
  onSelect,
  onClick,
  variant = 'default',
  showCheckbox = true,
  className,
}: Readonly<OrderCardProps>) {
  const statusConfig = STATUS_CONFIG[order.status];
  const priorityConfig = PRIORITY_CONFIG[order.priority];
  const StatusIcon = statusConfig.icon;

  // Calcular tiempo de entrega
  const deliveryTime = useMemo(() => {
    const lastMilestone = order.milestones.at(-1);
    if (lastMilestone?.estimatedArrival) {
      return getTimeRemaining(new Date(lastMilestone.estimatedArrival));
    }
    return null;
  }, [order.milestones]);

  // Origen y destino
  const origin = order.milestones[0];
  const destination = order.milestones.at(-1);

  /**
   * Maneja el click en el checkbox
   */
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(order.id);
  };

  /**
   * Maneja el click en la tarjeta
   */
  const handleCardClick = () => {
    onClick?.(order);
  };

  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'transition-all duration-200 cursor-pointer hover:shadow-md',
          isSelected && 'ring-2 ring-primary',
          className
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {showCheckbox && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleCheckboxClick}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCheckboxClick(e as unknown as React.MouseEvent); }}
              >
                <Checkbox checked={isSelected} />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium truncate">
                  {order.orderNumber}
                </span>
                <Badge className={cn('text-xs', statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate mt-1">
                {order.customer?.name ?? 'Sin cliente'}
              </div>
            </div>

            {deliveryTime && (
              <span className={cn(
                'text-xs whitespace-nowrap',
                deliveryTime.isOverdue ? 'text-red-500' : 'text-muted-foreground'
              )}>
                {deliveryTime.text}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-pointer hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {showCheckbox && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleCheckboxClick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCheckboxClick(e as unknown as React.MouseEvent); }}
              className="mt-1"
            >
              <Checkbox checked={isSelected} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-sm font-semibold">
                {order.orderNumber}
              </span>
              <Badge className={cn('text-xs', statusConfig.className)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate">{order.customer?.name ?? 'Sin cliente'}</span>
              {order.customer?.code && (
                <span className="text-xs text-muted-foreground">
                  ({order.customer.code})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ruta */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <MapPin className="w-4 h-4 text-green-500 shrink-0" />
            <span className="truncate">{origin?.geofenceName}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
            <span className="truncate">{destination?.geofenceName}</span>
          </div>
        </div>

        {/* Info adicional */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span>{order.cargo.type}</span>
            {Boolean(order.cargo.weightKg) && (
              <span className="text-muted-foreground">
                ({order.cargo.weightKg.toLocaleString()} kg)
              </span>
            )}
          </div>

          <div className={cn('flex items-center gap-1', priorityConfig.className)}>
            <AlertTriangle className="w-3 h-3" />
            <span>{priorityConfig.label}</span>
          </div>

          {order.vehicle && (
            <div className="flex items-center gap-1">
              <Truck className="w-3 h-3" />
              <span>{order.vehicle.plate}</span>
            </div>
          )}

          {order.driver && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{order.driver.fullName}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(new Date(order.createdAt))}</span>
          </div>

          {deliveryTime && (
            <div className={cn(
              'flex items-center gap-1',
              deliveryTime.isOverdue ? 'text-red-500' : 'text-muted-foreground'
            )}>
              <Timer className="w-3 h-3" />
              <span>{deliveryTime.text}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Exportación memoizada para optimizar renders
 */
export const OrderCard = memo(OrderCardComponent);

/**
 * Re-exporta el config de estados para uso externo
 */
export { STATUS_CONFIG, PRIORITY_CONFIG };
