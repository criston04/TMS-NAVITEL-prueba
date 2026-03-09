"use client";

import { cn } from "@/lib/utils";
import { Filter, Square, Zap, Shield, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { RouteEventFilter } from "@/types/monitoring";

interface EventFilterPanelProps {
  filters: RouteEventFilter;
  onFiltersChange: (filters: RouteEventFilter) => void;
  className?: string;
}

/**
 * Panel de filtros de eventos para ruta histórica
 */
export function EventFilterPanel({
  filters,
  onFiltersChange,
  className,
}: EventFilterPanelProps) {
  const update = (partial: Partial<RouteEventFilter>) =>
    onFiltersChange({ ...filters, ...partial });

  return (
    <div className={cn("rounded-lg border bg-card p-3 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Filtrar eventos</span>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs cursor-pointer">
            <Square className="h-3.5 w-3.5 text-blue-500" />
            Paradas
          </Label>
          <Switch
            checked={filters.showStops}
            onCheckedChange={(v) => update({ showStops: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs cursor-pointer">
            <Zap className="h-3.5 w-3.5 text-red-500" />
            Excesos de velocidad
          </Label>
          <Switch
            checked={filters.showSpeedAlerts}
            onCheckedChange={(v) => update({ showSpeedAlerts: v })}
          />
        </div>

        {filters.showSpeedAlerts && (
          <div className="pl-6">
            <Label className="text-[11px] text-muted-foreground">Umbral (km/h)</Label>
            <Input
              type="number"
              value={filters.speedThreshold || 80}
              onChange={(e) => update({ speedThreshold: parseInt(e.target.value) || 80 })}
              className="h-7 text-xs mt-1"
              min={30}
              max={200}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs cursor-pointer">
            <Shield className="h-3.5 w-3.5 text-violet-500" />
            Eventos de geocerca
          </Label>
          <Switch
            checked={filters.showGeofenceEvents}
            onCheckedChange={(v) => update({ showGeofenceEvents: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs cursor-pointer">
            <Power className="h-3.5 w-3.5 text-amber-500" />
            Ignición on/off
          </Label>
          <Switch
            checked={filters.showIgnitionEvents}
            onCheckedChange={(v) => update({ showIgnitionEvents: v })}
          />
        </div>
      </div>
    </div>
  );
}
