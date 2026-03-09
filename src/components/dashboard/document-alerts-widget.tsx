"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  FileText,
  ChevronRight,
  Bell,
  User,
  Truck,
  RefreshCw,
} from "lucide-react";
import { useDocumentAlerts, DocumentAlert } from "@/hooks/useDocumentAlerts";
import { Driver } from "@/types/models/driver";
import { Vehicle } from "@/types/models/vehicle";
import { cn } from "@/lib/utils";


interface DocumentAlertsWidgetProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  maxAlerts?: number;
  onViewAll?: () => void;
  onAlertClick?: (alert: DocumentAlert) => void;
  className?: string;
}


type AlertLevel = "expired" | "urgent" | "warning" | "ok";

const ALERT_LEVEL_CONFIG: Record<AlertLevel, { icon: typeof AlertCircle; color: string; bgColor: string; borderColor: string; label: string }> = {
  expired: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800",
    label: "Vencido",
  },
  urgent: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    label: "Urgente",
  },
  warning: {
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    label: "Próximo",
  },
  ok: {
    icon: FileText,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
    label: "Vigente",
  },
};


export function DocumentAlertsWidget({
  drivers,
  vehicles,
  maxAlerts = 5,
  onViewAll,
  onAlertClick,
  className,
}: DocumentAlertsWidgetProps) {
  const {
    alerts,
    summary,
    isLoading,
    refreshAlerts,
  } = useDocumentAlerts({ drivers, vehicles });

  const displayedAlerts = alerts.slice(0, maxAlerts);
  const hasMoreAlerts = alerts.length > maxAlerts;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Alertas de Documentos
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => refreshAlerts()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Actualizar alertas</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Summary badges */}
        {summary && (summary.expired > 0 || summary.urgent > 0 || summary.warning > 0) && (
          <div className="flex gap-2 mt-2">
            {summary.expired > 0 && (
              <Badge variant="destructive" className="text-xs">
                {summary.expired} vencidos
              </Badge>
            )}
            {summary.urgent > 0 && (
              <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                {summary.urgent} urgentes
              </Badge>
            )}
            {summary.warning > 0 && (
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                {summary.warning} próximos
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                <div className="h-8 w-8 rounded bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-2 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-sm font-medium text-green-600">
              Todo en orden
            </p>
            <p className="text-xs text-muted-foreground">
              No hay documentos vencidos o por vencer
            </p>
          </div>
        ) : (
          <ScrollArea className="h-70">
            <div className="space-y-2">
              {displayedAlerts.map(alert => {
                const config = ALERT_LEVEL_CONFIG[alert.alertLevel as AlertLevel] || ALERT_LEVEL_CONFIG.warning;
                const Icon = config.icon;
                const EntityIcon = alert.entityType === "driver" ? User : Truck;

                return (
                  <button
                    key={alert.id}
                    onClick={() => onAlertClick?.(alert)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left",
                      config.bgColor,
                      config.borderColor,
                      "hover:opacity-90"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-full", config.bgColor)}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <EntityIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium truncate">
                          {alert.entityName}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {alert.documentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        alert.alertLevel === "expired" && "border-red-500 text-red-600",
                        alert.alertLevel === "urgent" && "border-orange-500 text-orange-600",
                        alert.alertLevel === "warning" && "border-yellow-500 text-yellow-600"
                      )}
                    >
                      {alert.daysUntilExpiry < 0
                        ? `${Math.abs(alert.daysUntilExpiry)}d atrás`
                        : `${alert.daysUntilExpiry}d`}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* View All button */}
        {(hasMoreAlerts || onViewAll) && alerts.length > 0 && (
          <Button
            variant="ghost"
            className="w-full mt-3"
            size="sm"
            onClick={onViewAll}
          >
            Ver todas las alertas
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


export function DocumentAlertsCompact({
  drivers,
  vehicles,
  onClick,
}: {
  drivers: Driver[];
  vehicles: Vehicle[];
  onClick?: () => void;
}) {
  const { summary } = useDocumentAlerts({ drivers, vehicles });

  if (!summary || (summary.expired === 0 && summary.urgent === 0)) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={onClick}
          >
            <Bell className="h-4 w-4" />
            {(summary.expired > 0 || summary.urgent > 0) && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {summary.expired + summary.urgent}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {summary.expired > 0 && `${summary.expired} vencidos`}
            {summary.expired > 0 && summary.urgent > 0 && ", "}
            {summary.urgent > 0 && `${summary.urgent} urgentes`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default DocumentAlertsWidget;
