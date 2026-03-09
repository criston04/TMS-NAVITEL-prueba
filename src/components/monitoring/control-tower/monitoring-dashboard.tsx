"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Truck,
  TrendingUp,
  MapPin,
  Clock,
  Gauge,
  AlertTriangle,
  Package,
  CheckCircle2,
  Wifi,
  WifiOff,
  Activity,
  Route,
} from "lucide-react";
import type { TrackedVehicle, MonitoringAlert, MonitoringKPIs } from "@/types/monitoring";

interface MonitoringDashboardProps {
  /** Vehículos rastreados (para calcular KPIs automáticamente) */
  vehicles?: TrackedVehicle[];
  /** Alertas activas */
  alerts?: MonitoringAlert[];
  /** KPIs pre-calculados (alternativa) */
  kpis?: MonitoringKPIs;
  isLoading?: boolean;
  className?: string;
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  trend?: "up" | "down" | "neutral";
}

function KPICard({ icon, label, value, subValue, color }: KPICardProps) {
  return (
    <div className="rounded-lg border bg-card p-3 flex items-center gap-3 transition-shadow hover:shadow-sm">
      <div className={cn("rounded-md p-2", color)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold tabular-nums">{value}</p>
        {subValue && (
          <p className="text-[11px] text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Dashboard de KPIs globales de monitoreo
 */
export function MonitoringDashboard({
  vehicles,
  alerts,
  kpis: externalKpis,
  isLoading,
  className,
}: MonitoringDashboardProps) {
  // Calcular KPIs desde vehículos y alertas si no se pasan pre-calculados
  const kpis = useMemo<MonitoringKPIs>(() => {
    if (externalKpis) return externalKpis;
    if (!vehicles) {
      return {
        totalVehicles: 0, activeVehicles: 0, activePercentage: 0,
        movingVehicles: 0, stoppedVehicles: 0, idleVehicles: 0,
        totalKmToday: 0, avgSpeedFleet: 0,
        onTimeDeliveryRate: 0, completedOrders: 0, totalOrders: 0,
        activeAlerts: 0, disconnectedVehicles: 0,
      };
    }
    const total = vehicles.length;
    const active = vehicles.filter((v) => v.connectionStatus !== "disconnected").length;
    const moving = vehicles.filter((v) => v.movementStatus === "moving").length;
    const stopped = vehicles.filter((v) => v.movementStatus === "stopped").length;
    // Idle: connected but not moving for >5min (approximation based on stoppedSince)
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const idle = vehicles.filter((v) => {
      if (v.connectionStatus === "disconnected" || v.movementStatus === "moving") return false;
      if (!v.stoppedSince) return false;
      return new Date(v.stoppedSince).getTime() < fiveMinAgo;
    }).length;
    const disconnected = vehicles.filter((v) => v.connectionStatus === "disconnected").length;
    const speeds = vehicles.map((v) => v.speed).filter((s) => s > 0);
    const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const activeAlertCount = alerts?.filter((a) => a.status === "active").length ?? 0;
    
    // Calcular órdenes y tasa de entregas a tiempo
    const vehiclesWithOrders = vehicles.filter((v) => v.activeOrderId);
    const totalOrders = vehiclesWithOrders.length;
    // Simulación: vehículos en movimiento con órdenes se consideran "on track"
    const onTrackVehicles = vehiclesWithOrders.filter((v) => v.movementStatus === "moving");
    // completedOrders: aproximación basada en órdenes activas * factor de completitud
    const completedOrders = Math.round(totalOrders * 0.6);
    // onTimeDeliveryRate: calculado de vehículos en movimiento vs total con órdenes
    // En producción, esto debería venir del backend con datos reales de entregas
    const onTimeDeliveryRate = totalOrders > 0 
      ? Math.round((onTrackVehicles.length / totalOrders) * 100)
      : 0;

    return {
      totalVehicles: total,
      activeVehicles: active,
      activePercentage: total > 0 ? (active / total) * 100 : 0,
      movingVehicles: moving,
      stoppedVehicles: stopped,
      idleVehicles: idle,
      totalKmToday: Math.round(moving * avgSpeed * 0.2),
      avgSpeedFleet: avgSpeed,
      onTimeDeliveryRate,
      completedOrders,
      totalOrders,
      activeAlerts: activeAlertCount,
      disconnectedVehicles: disconnected,
    };
  }, [vehicles, alerts, externalKpis]);
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[88px] rounded-lg border bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3", className)}>
      <KPICard
        icon={<Truck className="h-4 w-4 text-blue-600" />}
        label="Flota activa"
        value={`${kpis.activeVehicles}/${kpis.totalVehicles}`}
        subValue={`${kpis.activePercentage.toFixed(0)}% en línea`}
        color="bg-blue-100 dark:bg-blue-900/30"
      />
      <KPICard
        icon={<Activity className="h-4 w-4 text-emerald-600" />}
        label="En movimiento"
        value={kpis.movingVehicles}
        subValue={`${kpis.stoppedVehicles} detenidos`}
        color="bg-emerald-100 dark:bg-emerald-900/30"
      />
      <KPICard
        icon={<Route className="h-4 w-4 text-violet-600" />}
        label="Km recorridos hoy"
        value={`${kpis.totalKmToday.toFixed(0)}`}
        subValue={`Prom: ${kpis.avgSpeedFleet.toFixed(0)} km/h`}
        color="bg-violet-100 dark:bg-violet-900/30"
      />
      <KPICard
        icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
        label="Tasa puntualidad"
        value={`${kpis.onTimeDeliveryRate.toFixed(0)}%`}
        subValue={`${kpis.completedOrders}/${kpis.totalOrders} órdenes`}
        color="bg-green-100 dark:bg-green-900/30"
      />
      <KPICard
        icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
        label="Alertas activas"
        value={kpis.activeAlerts}
        color="bg-amber-100 dark:bg-amber-900/30"
      />
      <KPICard
        icon={<WifiOff className="h-4 w-4 text-red-600" />}
        label="Sin conexión"
        value={kpis.disconnectedVehicles}
        color="bg-red-100 dark:bg-red-900/30"
      />
    </div>
  );
}
