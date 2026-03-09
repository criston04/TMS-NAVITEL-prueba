"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, MapPin, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    type: "departure",
    message: "Vehículo V-001 inició ruta R-105",
    time: "hace 5 min",
    icon: Truck,
    color: "text-[#34b7ff]",
    bg: "bg-[#34b7ff]/10 border-[#34b7ff]/30 dark:border-[#34b7ff]/20",
  },
  {
    id: 2,
    type: "delivery",
    message: "Entrega #4521 completada con éxito",
    time: "hace 12 min",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-900",
  },
  {
    id: 3,
    type: "alert",
    message: "Alerta de velocidad: V-003 superó 90km/h",
    time: "hace 25 min",
    icon: AlertCircle,
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-900",
  },
  {
    id: 4,
    type: "location",
    message: "V-002 llegó al punto de control Norte",
    time: "hace 40 min",
    icon: MapPin,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10 border-indigo-200 dark:border-indigo-900",
  },
  {
    id: 5,
    type: "delivery",
    message: "Entrega #4520 completada con éxito",
    time: "hace 1 hora",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-900",
  },
  {
    id: 6,
    type: "departure",
    message: "Vehículo V-004 inició ruta R-109",
    time: "hace 1.5 horas",
    icon: Truck,
    color: "text-[#34b7ff]",
    bg: "bg-[#34b7ff]/10 border-[#34b7ff]/30 dark:border-[#34b7ff]/20",
  },
];

export function ActivityFeed() {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full px-6 pb-6">
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative flex gap-4">
                {/* Timeline Line */}
                {index !== activities.length - 1 && (
                  <div className="absolute left-[11px] top-8 h-full w-[2px] bg-border" />
                )}
                
                <div
                  className={cn(
                    "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    activity.bg,
                    activity.color
                  )}
                >
                  <activity.icon className="h-3.5 w-3.5" />
                </div>
                
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-foreground leading-tight py-1">{activity.message}</p>
                  <span className="text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
