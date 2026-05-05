"use client";

import { cn } from "@/lib/utils";
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  Activity
} from "lucide-react";
import type { RetransmissionStats } from "@/types/monitoring";

interface RetransmissionStatsProps {
  /** Estadísticas */
  stats: RetransmissionStats;
  
  isLoading?: boolean;
  /** Clase adicional */
  className?: string;
}

interface StatCardProps {
  title: string;
  value: number;
  percentage?: number;
  icon: React.ReactNode;
  color: "default" | "success" | "warning" | "danger";
}

function StatCard({ title, value, percentage, icon, color }: StatCardProps) {
  const colorClasses = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg p-2", colorClasses[color])}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {percentage !== undefined && (
              <span className="text-sm text-muted-foreground">
                ({percentage}%)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Panel de estadísticas de retransmisión
 */
export function RetransmissionStats({
  stats,
  isLoading = false,
  className,
}: RetransmissionStatsProps) {
  if (isLoading) {
    return (
      <div className={cn("grid gap-4 md:grid-cols-4", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  // 2026-05-03: defaults defensivos. El backend a veces devuelve `stats` sin
  // todos los campos (ej. solo `data: {}`); aqui garantizamos numeros.
  const safeTotal = stats?.total ?? 0;
  const safeOnline = stats?.online ?? 0;
  const safeTempLoss = stats?.temporaryLoss ?? 0;
  const safeDisconnected = stats?.disconnected ?? 0;
  const safeOnlinePct = stats?.onlinePercentage ?? 0;
  const safeTempLossPct = stats?.temporaryLossPercentage ?? 0;
  const safeDisconnectedPct = stats?.disconnectedPercentage ?? 0;

  return (
    <div className={cn("grid gap-4 md:grid-cols-4", className)}>
      <StatCard
        title="Total Vehículos"
        value={safeTotal}
        icon={<Activity className="h-5 w-5" />}
        color="default"
      />
      <StatCard
        title="En Línea"
        value={safeOnline}
        percentage={safeOnlinePct}
        icon={<Wifi className="h-5 w-5" />}
        color="success"
      />
      <StatCard
        title="Pérdida Temporal"
        value={safeTempLoss}
        percentage={safeTempLossPct}
        icon={<AlertTriangle className="h-5 w-5" />}
        color="warning"
      />
      <StatCard
        title="Sin Conexión"
        value={safeDisconnected}
        percentage={safeDisconnectedPct}
        icon={<WifiOff className="h-5 w-5" />}
        color="danger"
      />
    </div>
  );
}
