"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { VehicleOverview } from "@/components/dashboard/vehicle-overview";
import { ShipmentStatistics } from "@/components/dashboard/shipment-statistics";
import { OnRouteVehicles } from "@/components/dashboard/on-route-vehicles";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/useDashboard";

import {
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  MapPin,
  Shield,
  FileWarning,
  Users,
  Gauge,
  Radio,
  ShieldAlert,
  CalendarDays,
} from "lucide-react";

export default function DashboardPage() {
  const {
    stats,
    vehicleOverview,
    shipmentData,
    shipmentTotal,
    onRouteVehicles,
    onRouteTotal,
    trends,
    sparklines,
    loading,
    setDateFilter,
  } = useDashboard();

  const dateFilter = (() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  })();

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-3 sm:p-4 md:p-6 bg-slate-50/50 dark:bg-black/20 min-h-screen">
      {/* Header con filtro de fecha */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Resumen operativo del día
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {/* ========== SECCIÓN 1: OPERATIVOS ========== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-sm font-semibold px-3 py-1 border-blue-300 text-blue-700 dark:text-blue-300">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            Indicadores Operativos
          </Badge>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 stagger-animation">
          <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
            <StatCard
              title="Flota Total"
              value={String(stats?.totalFleet ?? "-")}
              icon={Truck}
              trend={{ value: 12, label: trends.totalFleet.label }}
              data={(sparklines.totalFleet ?? []).map(v => ({ value: v }))}
              color="#3b82f6"
              className="shadow-sm border-0"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <StatCard
              title="Entregas a Tiempo"
              value={stats ? `${stats.onTimeDeliveryRate}%` : "-"}
              icon={CheckCircle2}
              trend={{ value: 2.1, label: trends.onTimeDelivery.label }}
              data={(sparklines.onTimeDelivery ?? []).map(v => ({ value: v }))}
              color="#10b981"
              className="shadow-sm border-0"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <StatCard
              title="Órdenes del Día"
              value={String(stats?.dailyOrders ?? "-")}
              icon={Package}
              trend={{ value: 15, label: trends.dailyOrders.label }}
              data={(sparklines.dailyOrders ?? []).map(v => ({ value: v }))}
              color="#8b5cf6"
              className="shadow-sm border-0"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <StatCard
              title="Tiempo Promedio Entrega"
              value={stats ? `${stats.avgDeliveryTimeMinutes}m` : "-"}
              icon={Clock}
              trend={{ value: -12, label: trends.avgDeliveryTime.label }}
              data={(sparklines.avgDeliveryTime ?? []).map(v => ({ value: v }))}
              color="#6366f1"
              className="shadow-sm border-0"
            />
          </div>
        </div>
      </div>

      {/* ========== SECCIÓN 2: MONITOREO ========== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-sm font-semibold px-3 py-1 border-emerald-300 text-emerald-700 dark:text-emerald-300">
            <Radio className="h-3.5 w-3.5 mr-1.5" />
            Monitoreo en Tiempo Real
          </Badge>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 stagger-animation">
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <StatCard
              title="Vehículos en Ruta"
              value={String(stats?.vehiclesOnRoute ?? "-")}
              icon={MapPin}
              trend={{ value: 8, label: trends.vehiclesOnRoute.label }}
              data={(sparklines.vehiclesOnRoute ?? []).map(v => ({ value: v }))}
              color="#10b981"
              className="shadow-sm border-0"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <StatCard
              title="Conductores Activos"
              value={String(stats?.activeDrivers ?? "-")}
              icon={Users}
              trend={{ value: 5, label: trends.activeDrivers.label }}
              data={(sparklines.activeDrivers ?? []).map(v => ({ value: v }))}
              color="#06b6d4"
              className="shadow-sm border-0"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <StatCard
              title="Velocidad Prom."
              value={stats ? `${stats.avgSpeedKmh} km/h` : "-"}
              icon={Gauge}
              trend={{ value: -3, label: trends.avgSpeed.label }}
              data={(sparklines.avgSpeed ?? []).map(v => ({ value: v }))}
              color="#f59e0b"
              className="shadow-sm border-0"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
            <StatCard
              title="En Mantenimiento"
              value={String(stats?.inMaintenance ?? "-")}
              icon={AlertTriangle}
              trend={{ value: -5, label: trends.inMaintenance.label }}
              data={(sparklines.inMaintenance ?? []).map(v => ({ value: v }))}
              color="#ef4444"
              className="shadow-sm border-0"
            />
          </div>
        </div>
      </div>

      {/* ========== SECCIÓN 3: SEGURIDAD Y DOCUMENTACIÓN ========== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-sm font-semibold px-3 py-1 border-amber-300 text-amber-700 dark:text-amber-300">
            <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
            Seguridad y Documentación
          </Badge>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 stagger-animation">
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <StatCard
              title="Docs por Vencer"
              value={String(stats?.docsExpiringSoon ?? "-")}
              icon={FileWarning}
              trend={{ value: -3, label: trends.docsExpiring.label }}
              color="#f59e0b"
              className="shadow-sm border-0"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <StatCard
              title="Vehículos Habilitados"
              value={String(stats?.enabledVehicles ?? "-")}
              icon={Shield}
              trend={{ value: 3, label: trends.enabledVehicles.label }}
              color="#22c55e"
              className="shadow-sm border-0"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <StatCard
              title="Incidentes del Día"
              value={String(stats?.dailyIncidents ?? "-")}
              icon={AlertTriangle}
              trend={{ value: -40, label: trends.dailyIncidents.label }}
              color="#ef4444"
              className="shadow-sm border-0"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
            <StatCard
              title="Cumplimiento GPS"
              value={stats ? `${stats.gpsComplianceRate}%` : "-"}
              icon={Radio}
              trend={{ value: 0.5, label: trends.gpsCompliance.label }}
              color="#3b82f6"
              className="shadow-sm border-0"
            />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-12 lg:grid-cols-12">
        <div className="col-span-1 md:col-span-6 lg:col-span-5 min-h-[300px] md:min-h-[420px] animate-slide-up" style={{ animationDelay: '500ms' }}>
          <VehicleOverview data={vehicleOverview} />
        </div>
        <div className="col-span-1 md:col-span-6 lg:col-span-7 min-h-[300px] md:min-h-[420px] animate-slide-up" style={{ animationDelay: '600ms' }}>
          <ShipmentStatistics data={shipmentData} total={shipmentTotal} />
        </div>
      </div>

      {/* Tabla de vehículos en ruta */}
      <div className="grid gap-4 grid-cols-1 animate-slide-up" style={{ animationDelay: '700ms' }}>
        <OnRouteVehicles vehicles={onRouteVehicles} total={onRouteTotal} />
      </div>
    </div>
  );
}