"use client";

import { cn } from "@/lib/utils";
import { Wrench, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MaintenanceIndicatorProps {
  /** Km restantes para próximo mantenimiento */
  kmToMaintenance?: number;
  /** Días restantes para próximo mantenimiento */
  daysToMaintenance?: number;
  /** Tipo de mantenimiento */
  maintenanceType?: string;
  /** Compact mode (solo icono) */
  compact?: boolean;
  className?: string;
}

function getStatus(km?: number, days?: number) {
  if (km != null && km <= 0) return { level: "overdue", color: "text-red-500 bg-red-500/10", label: "Vencido" };
  if (days != null && days <= 0) return { level: "overdue", color: "text-red-500 bg-red-500/10", label: "Vencido" };
  if ((km != null && km <= 500) || (days != null && days <= 7))
    return { level: "urgent", color: "text-amber-500 bg-amber-500/10", label: "Urgente" };
  if ((km != null && km <= 2000) || (days != null && days <= 30))
    return { level: "upcoming", color: "text-yellow-500 bg-yellow-500/10", label: "Próximo" };
  return { level: "ok", color: "text-emerald-500 bg-emerald-500/10", label: "Al día" };
}

/**
 * Indicador visual de estado de mantenimiento del vehículo
 */
export function MaintenanceIndicator({
  kmToMaintenance,
  daysToMaintenance,
  maintenanceType = "General",
  compact = false,
  className,
}: MaintenanceIndicatorProps) {
  const status = getStatus(kmToMaintenance, daysToMaintenance);

  if (status.level === "ok") {
    return null; // No mostrar si todo está al día
  }

  const content = (
    <div className={cn("flex items-center gap-1.5", className)}>
      {status.level === "overdue" ? (
        <AlertTriangle className={cn("h-3.5 w-3.5 flex-shrink-0", status.color.split(" ")[0])} />
      ) : (
        <Wrench className={cn("h-3.5 w-3.5 flex-shrink-0", status.color.split(" ")[0])} />
      )}
      {!compact && (
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", status.color)}>
          {status.label}
          {kmToMaintenance != null && ` ${kmToMaintenance}km`}
          {daysToMaintenance != null && ` ${daysToMaintenance}d`}
        </Badge>
      )}
    </div>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="top" className="z-[10001]">
            <p className="text-xs">
              <strong>Mantenimiento:</strong> {maintenanceType}
            </p>
            {kmToMaintenance != null && (
              <p className="text-xs">{kmToMaintenance} km restantes</p>
            )}
            {daysToMaintenance != null && (
              <p className="text-xs">{daysToMaintenance} días restantes</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
