"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, PackageOpen, Package, Clock } from "lucide-react";
import type { VehicleOverviewData } from "@/mocks/dashboard.mock";

interface VehicleOverviewProps {
  data?: VehicleOverviewData | null;
}

export function VehicleOverview({ data }: VehicleOverviewProps) {
  const available = data?.available ?? 39.7;
  const onRoute = data?.onRoute ?? 28.3;
  const inMaintenance = data?.inMaintenance ?? 17.4;
  const inactive = data?.inactive ?? 14.6;
  const avgRouteTime = data?.avgRouteTime ?? "2hr 10min";
  const avgIdleTime = data?.avgIdleTime ?? "45min";
  const avgMaintenanceTime = data?.avgMaintenanceTime ?? "1hr 30min";
  const avgLoadTime = data?.avgLoadTime ?? "25min";

  return (
    <Card className="h-full rounded-2xl border-none shadow-sm bg-white dark:bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Resumen de Flota</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 text-xs text-muted-foreground gap-1">
            <span>En ruta</span>
            <span>Descargando</span>
            <span className="hidden sm:block">Cargando</span>
            <span className="hidden sm:block text-right">En espera</span>
        </div>

        <div className="flex h-10 sm:h-12 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
            <div className="flex h-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200" style={{ width: `${available}%` }}>
                {available}%
            </div>
            <div className="flex h-full items-center justify-center bg-[#6366f1] text-xs font-semibold text-white" style={{ width: `${onRoute}%` }}>
                {onRoute}%
            </div>
            <div className="flex h-full items-center justify-center bg-[#0ea5e9] text-xs font-semibold text-white" style={{ width: `${inMaintenance}%` }}>
                {inMaintenance}%
            </div>
            <div className="flex h-full items-center justify-center bg-[#1e293b] text-xs font-semibold text-white" style={{ width: `${inactive}%` }}>
                {inactive}%
            </div>
        </div>

        <div className="space-y-5 pt-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <Truck className="h-5 w-5 text-slate-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">En ruta</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{avgRouteTime}</span>
                    <span className="text-sm text-muted-foreground w-10 text-right">{available}%</span>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <PackageOpen className="h-5 w-5 text-slate-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">Descargando</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{avgIdleTime}</span>
                    <span className="text-sm text-muted-foreground w-10 text-right">{onRoute}%</span>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <Package className="h-5 w-5 text-slate-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">Cargando</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{avgMaintenanceTime}</span>
                    <span className="text-sm text-muted-foreground w-10 text-right">{inMaintenance}%</span>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <Clock className="h-5 w-5 text-slate-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">En espera</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{avgLoadTime}</span>
                    <span className="text-sm text-muted-foreground w-10 text-right">{inactive}%</span>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
