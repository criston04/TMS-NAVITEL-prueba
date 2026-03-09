'use client';

import { memo, useMemo } from 'react';
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { OrderStatus } from '@/types/order';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Animated SVG icons with framer-motion
import {
  AnimatedPackageIcon,
  AnimatedTruckIcon,
  AnimatedCheckIcon,
  AnimatedWarningIcon,
} from './animated-kpi-icons';

/**
 * Props del componente OrderStatsCards
 */
interface OrderStatsCardsProps {
  /** Contadores por estado */
  statusCounts: Record<OrderStatus, number>;
  /** Callback al hacer click en un estado */
  onStatusClick?: (status: OrderStatus) => void;
  /** Estado activo/seleccionado */
  activeStatus?: OrderStatus;
  /** Clase adicional */
  className?: string;
}

// COMPONENTE PRINCIPAL

/**
 * Configuración de cards por estado
 */
const STATUS_CARD_CONFIG: Record<OrderStatus, {
  title: string;
  icon: typeof Package;
  iconClassName: string;
  bgClassName: string;
}> = {
  draft: {
    title: 'Borradores',
    icon: FileText,
    iconClassName: 'text-gray-500',
    bgClassName: 'bg-gray-100 dark:bg-gray-800',
  },
  pending: {
    title: 'Pendientes',
    icon: Clock,
    iconClassName: 'text-yellow-500',
    bgClassName: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  assigned: {
    title: 'Asignadas',
    icon: Package,
    iconClassName: 'text-[#34b7ff]',
    bgClassName: 'bg-[#34b7ff]/10 dark:bg-[#34b7ff]/20',
  },
  in_transit: {
    title: 'En tránsito',
    icon: Truck,
    iconClassName: 'text-indigo-500',
    bgClassName: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  at_milestone: {
    title: 'En hito',
    icon: Package,
    iconClassName: 'text-purple-500',
    bgClassName: 'bg-purple-50 dark:bg-purple-900/20',
  },
  delayed: {
    title: 'Retrasadas',
    icon: AlertTriangle,
    iconClassName: 'text-orange-500',
    bgClassName: 'bg-orange-50 dark:bg-orange-900/20',
  },
  completed: {
    title: 'Completadas',
    icon: CheckCircle,
    iconClassName: 'text-green-500',
    bgClassName: 'bg-green-50 dark:bg-green-900/20',
  },
  closed: {
    title: 'Cerradas',
    icon: CheckCircle,
    iconClassName: 'text-emerald-500',
    bgClassName: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  cancelled: {
    title: 'Canceladas',
    icon: XCircle,
    iconClassName: 'text-red-500',
    bgClassName: 'bg-red-50 dark:bg-red-900/20',
  },
};

/**
 * Props del componente StatCard
 */
interface StatCardProps {
  title: string;
  value: number;
  icon: typeof Package;
  iconClassName: string;
  bgClassName: string;
  isActive?: boolean;
  onClick?: () => void;
  trend?: number;
}

/**
 * Card individual de estadística
 */
function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  bgClassName,
  isActive,
  onClick,
  trend,
}: Readonly<StatCardProps>) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        isActive && 'ring-2 ring-primary',
        onClick && 'hover:scale-[1.02]',
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <div className="flex items-baseline gap-1 sm:gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold">{value.toLocaleString()}</span>
              {trend !== undefined && trend !== 0 && (
                <span
                  className={cn(
                    'flex items-center text-xs',
                    trend > 0 ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {trend > 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
          </div>
          <div className={cn('p-2 sm:p-3 rounded-full', bgClassName)}>
            <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6', iconClassName)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// COMPONENTE PRINCIPAL

/**
 * Grid de cards de estadísticas por estado
 * @param props - Props del componente
 * @returns Componente de estadísticas
 */
function OrderStatsCardsComponent({
  statusCounts,
  onStatusClick,
  activeStatus,
  className,
}: Readonly<OrderStatsCardsProps>) {
  // Calcular totales
  const totals = useMemo(() => {
    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const active = statusCounts.in_transit + statusCounts.at_milestone + statusCounts.assigned;
    const attention = statusCounts.delayed + statusCounts.pending;
    return { total, active, attention };
  }, [statusCounts]);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4', className)}>
      {/* Total órdenes */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Total órdenes</p>
              <span className="text-2xl sm:text-3xl font-bold">{totals.total.toLocaleString()}</span>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center overflow-visible">
              <AnimatedPackageIcon size={40} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* En curso */}
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
          activeStatus === 'in_transit' && 'ring-2 ring-primary',
        )}
        onClick={() => onStatusClick?.('in_transit')}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">En curso</p>
              <span className="text-2xl sm:text-3xl font-bold text-indigo-500">
                {totals.active.toLocaleString()}
              </span>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center overflow-visible">
              <AnimatedTruckIcon size={40} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completadas */}
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
          activeStatus === 'completed' && 'ring-2 ring-primary',
        )}
        onClick={() => onStatusClick?.('completed')}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Completadas</p>
              <span className="text-2xl sm:text-3xl font-bold text-green-500">
                {statusCounts.completed.toLocaleString()}
              </span>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center overflow-visible">
              <AnimatedCheckIcon size={40} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requieren atención */}
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
          activeStatus === 'delayed' && 'ring-2 ring-primary',
        )}
        onClick={() => onStatusClick?.('delayed')}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Requieren atención</p>
              <span className="text-2xl sm:text-3xl font-bold text-orange-500">
                {totals.attention.toLocaleString()}
              </span>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center overflow-visible">
              <AnimatedWarningIcon size={40} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Exportación memoizada
 */
export const OrderStatsCards = memo(OrderStatsCardsComponent);

// COMPONENTE MINI STATS

/**
 * Props del componente MiniStats
 */
interface OrderMiniStatsProps {
  /** Contadores por estado */
  statusCounts: Record<OrderStatus, number>;
  /** Clase adicional */
  className?: string;
}

/**
 * Versión compacta de estadísticas para header
 */
function OrderMiniStatsComponent({ statusCounts, className }: OrderMiniStatsProps) {
  const stats = [
    { status: 'pending' as OrderStatus, label: 'Pendientes', color: 'text-yellow-500' },
    { status: 'in_transit' as OrderStatus, label: 'En tránsito', color: 'text-indigo-500' },
    { status: 'delayed' as OrderStatus, label: 'Retrasadas', color: 'text-orange-500' },
  ];

  return (
    <div className={cn('flex items-center gap-2 sm:gap-4 flex-wrap', className)}>
      {stats.map(({ status, label, color }) => (
        <div key={status} className="flex items-center gap-1 sm:gap-1.5">
          <span className={cn('text-base sm:text-lg font-bold', color)}>
            {statusCounts[status]}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Exportación memoizada
 */
export const OrderMiniStats = memo(OrderMiniStatsComponent);
