"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { OnRouteVehicle } from "@/mocks/dashboard.mock";

interface OnRouteVehiclesProps {
  vehicles?: OnRouteVehicle[];
  total?: number;
}

const statusColors: Record<string, string> = {
  "on-time": "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  delayed: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  ahead: "bg-[#34b7ff]/10 text-[#34b7ff] dark:bg-[#34b7ff]/20 dark:text-[#34b7ff]",
};

const statusLabels: Record<string, string> = {
  "on-time": "A tiempo",
  delayed: "Retrasado",
  ahead: "Adelantado",
};

export function OnRouteVehicles({ vehicles: vehiclesProp, total: totalProp }: OnRouteVehiclesProps) {
  const defaultVehicles = [
    { id: "v-001", plate: "VEH-468031", driver: "-", route: "Lima, Perú → Arequipa, Perú", status: "on-time" as const, progress: 49, eta: "14:30", speed: 65 },
    { id: "v-002", plate: "VEH-302781", driver: "-", route: "Trujillo, Perú → Chiclayo, Perú", status: "delayed" as const, progress: 24, eta: "18:15", speed: 48 },
    { id: "v-003", plate: "VEH-715822", driver: "-", route: "Cusco, Perú → Puno, Perú", status: "ahead" as const, progress: 7, eta: "11:45", speed: 72 },
    { id: "v-004", plate: "VEH-451430", driver: "-", route: "Piura, Perú → Tumbes, Perú", status: "on-time" as const, progress: 95, eta: "20:00", speed: 60 },
    { id: "v-005", plate: "VEH-921577", driver: "-", route: "Huancayo, Perú → Lima, Perú", status: "on-time" as const, progress: 65, eta: "10:30", speed: 58 },
  ];

  const vehicles = vehiclesProp ?? defaultVehicles;
  const totalCount = totalProp ?? 25;
  return (
    <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Vehículos en Ruta</CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md overflow-x-auto">
            <div className="grid grid-cols-[30px_50px_1fr_1.5fr_1.5fr_1fr_1.5fr] gap-4 py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b min-w-[700px]">
                <div></div>
                <div></div>
                <div>Ubicación</div>
                <div>Ruta Origen</div>
                <div>Ruta Destino</div>
                <div>Alertas</div>
                <div>Progreso</div>
            </div>
            
            <div className="divide-y min-w-[700px]">
            {vehicles.map((v) => {
                const [origin, dest] = (v.route || "").split("→").map(s => s.trim());
                return (
                <div key={v.id} className="grid grid-cols-[30px_50px_1fr_1.5fr_1.5fr_1fr_1.5fr] gap-4 py-4 px-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors min-w-[700px]">
                    <div className="flex items-center">
                        <Checkbox className="rounded-sm border-slate-300" />
                    </div>
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        <Truck className="h-4 w-4" />
                    </div>
                    <div className="font-semibold text-slate-700 dark:text-slate-200">{v.plate}</div>
                    <div className="text-sm text-slate-500">{origin || "-"}</div>
                    <div className="text-sm text-slate-500">{dest || "-"}</div>
                    <div>
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${statusColors[v.status] || statusColors["on-time"]}`}>
                            {statusLabels[v.status] || v.status}
                         </span>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="h-2 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${v.progress}%` }}></div>
                         </div>
                         <span className="text-xs font-medium text-slate-500 w-8 text-right">{v.progress}%</span>
                    </div>
                </div>
                );
            })}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 px-4">
                <span className="text-xs sm:text-sm text-muted-foreground">Mostrando 1 a {vehicles.length} de {totalCount} registros</span>
                <div className="flex items-center gap-1">
                     <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-slate-100 dark:bg-slate-800"><span className="text-xs">|&lt;</span></Button>
                     <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-slate-100 dark:bg-slate-800"><span className="text-xs">&lt;</span></Button>
                     <Button variant="default" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"><span className="text-xs">1</span></Button>
                     <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-md"><span className="text-xs">2</span></Button>
                     <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-md"><span className="text-xs">3</span></Button>
                     <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-slate-100 dark:bg-slate-800"><span className="text-xs">&gt;</span></Button>
                     <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-slate-100 dark:bg-slate-800"><span className="text-xs">&gt;|</span></Button>
                </div>
            </div>

        </div>
      </CardContent>
    </Card>
  );
}
