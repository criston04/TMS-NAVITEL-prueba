'use client';

import { memo } from 'react';
import {
  Package,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Truck,
  User,
  Clock,
  Target,
} from 'lucide-react';
import type { SchedulingKPIs } from '@/types/scheduling';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SchedulingKPIBarProps {
  /** KPIs de programación */
  kpis: SchedulingKPIs;
  /** Cargando */
  isLoading?: boolean;
  /** Orientación */
  orientation?: 'horizontal' | 'vertical';
  /** Mostrar detalles expandidos */
  expanded?: boolean;
  /** Clase adicional */
  className?: string;
}

interface KPIConfig {
  key: keyof SchedulingKPIs;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  format: (value: number) => string;
  color: (value: number) => string;
  tooltip: string;
  showProgress?: boolean;
  progressMax?: number;
}

/**
 * Helper functions for KPI color determination
 */
const getThresholdColor = (value: number, thresholds: { high: number; medium: number }, colors: { high: string; medium: string; low: string }): string => {
  if (value > thresholds.high) return colors.high;
  if (value > thresholds.medium) return colors.medium;
  return colors.low;
};

const getInverseThresholdColor = (value: number, thresholds: { low: number; high: number }, colors: { low: string; high: string; normal: string }): string => {
  if (value < thresholds.low) return colors.low;
  if (value > thresholds.high) return colors.high;
  return colors.normal;
};

const KPI_CONFIGS: KPIConfig[] = [
  {
    key: 'pendingOrders',
    label: 'Pendientes',
    icon: Package,
    format: (v) => v.toString(),
    color: (v) => getThresholdColor(v, { high: 20, medium: 10 }, { high: 'text-red-500', medium: 'text-amber-500', low: 'text-green-500' }),
    tooltip: 'Órdenes pendientes de programar',
  },
  {
    key: 'scheduledToday',
    label: 'Programadas Hoy',
    icon: Calendar,
    format: (v) => v.toString(),
    color: () => 'text-[#34b7ff]',
    tooltip: 'Órdenes programadas para hoy',
  },
  {
    key: 'driverUtilization',
    label: 'Uso de Operadores',
    icon: User,
    format: (v) => `${v}%`,
    color: (v) => getInverseThresholdColor(v, { low: 50, high: 90 }, { low: 'text-amber-500', high: 'text-red-500', normal: 'text-green-500' }),
    tooltip: 'Porcentaje de utilización de operadores',
    showProgress: true,
    progressMax: 100,
  },
  {
    key: 'onTimeDeliveryRate',
    label: 'Entregas a Tiempo',
    icon: Target,
    format: (v) => `${v}%`,
    color: (v) => getThresholdColor(v, { high: 95, medium: 80 }, { high: 'text-green-500', medium: 'text-amber-500', low: 'text-red-500' }),
    tooltip: 'Tasa de entregas puntuales',
    showProgress: true,
    progressMax: 100,
  },
  {
    key: 'averageLeadTime',
    label: 'Lead Time Promedio',
    icon: Clock,
    format: (v) => `${v}h`,
    color: (v) => getThresholdColor(v, { high: 48, medium: 24 }, { high: 'text-red-500', medium: 'text-amber-500', low: 'text-green-500' }),
    tooltip: 'Tiempo promedio desde pedido hasta entrega',
  },
  {
    key: 'weeklyTrend',
    label: 'Tendencia Semanal',
    icon: TrendingUp,
    format: (v) => `${v >= 0 ? '+' : ''}${v}%`,
    color: (v) => v >= 0 ? 'text-green-500' : 'text-red-500',
    tooltip: 'Cambio en volumen vs semana anterior',
  },
];

// COMPONENTE: KPI INDIVIDUAL

const KPICard = memo(function KPICard({
  config,
  value,
  isLoading,
  expanded,
}: Readonly<{
  config: KPIConfig;
  value: number;
  isLoading?: boolean;
  expanded?: boolean;
}>) {
  const Icon = config.icon;
  const colorClass = config.color(value);
  const formattedValue = config.format(value);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn(
          'transition-all hover:shadow-md cursor-default',
          expanded ? 'p-4' : 'p-2'
        )}>
          <CardContent className="p-0">
            <div className="flex items-center gap-3">
              <div className={cn(
                'rounded-lg p-2 bg-muted/50',
                colorClass
              )}>
                <Icon className={cn(
                  expanded ? 'h-5 w-5' : 'h-4 w-4'
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {config.label}
                </p>
                
                {isLoading ? (
                  <div className="h-6 w-16 bg-muted animate-pulse rounded mt-1" />
                ) : (
                  <p className={cn(
                    'font-bold tabular-nums',
                    expanded ? 'text-xl' : 'text-lg',
                    colorClass
                  )}>
                    {formattedValue}
                  </p>
                )}
                
                {config.showProgress && !isLoading && expanded && (
                  <Progress
                    value={Math.min(value, config.progressMax || 100)}
                    max={config.progressMax || 100}
                    className="h-1.5 mt-2"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
});

// COMPONENTE PRINCIPAL

export const SchedulingKPIBar = memo(function SchedulingKPIBar({
  kpis,
  isLoading = false,
  orientation = 'horizontal',
  expanded = false,
  className,
}: Readonly<SchedulingKPIBarProps>) {
  // Seleccionar KPIs principales para vista compacta
  const visibleKPIs = expanded 
    ? KPI_CONFIGS 
    : KPI_CONFIGS.slice(0, 6);

  return (
    <div
      className={cn(
        'gap-3',
        orientation === 'horizontal' 
          ? 'flex flex-wrap items-stretch' 
          : 'flex flex-col',
        className
      )}
    >
      {visibleKPIs.map(config => (
        <KPICard
          key={config.key}
          config={config}
          value={kpis[config.key]}
          isLoading={isLoading}
          expanded={expanded}
        />
      ))}
    </div>
  );
});

// COMPONENTE COMPACTO ALTERNATIVO

export const SchedulingKPICompact = memo(function SchedulingKPICompact({
  kpis,
  isLoading = false,
  className,
}: Pick<SchedulingKPIBarProps, 'kpis' | 'isLoading' | 'className'>) {
  const mainKPIs: (keyof SchedulingKPIs)[] = [
    'pendingOrders',
    'scheduledToday',
    'atRiskOrders',
    'fleetUtilization',
  ];

  return (
    <div className={cn('flex items-center gap-4 px-4 py-2 bg-card border-b', className)}>
      {mainKPIs.map(key => {
        const config = KPI_CONFIGS.find(c => c.key === key);
        if (!config) return null;
        
        const Icon = config.icon;
        const value = kpis[key];
        const colorClass = config.color(value);

        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Icon className={cn('h-4 w-4', colorClass)} />
                <span className="text-xs text-muted-foreground">
                  {config.label}:
                </span>
                {isLoading ? (
                  <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                ) : (
                  <span className={cn('font-semibold text-sm', colorClass)}>
                    {config.format(value)}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{config.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
});
