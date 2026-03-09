"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Bell,
  BellRing,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  X,
  Filter,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  MapPin,
  Zap,
  Shield,
  Wifi,
  WifiOff,
  Clock,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MonitoringAlert, AlertSeverity, AlertStatus, AlertRuleType } from "@/types/monitoring";

interface AlertPanelProps {
  alerts: MonitoringAlert[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  onCenterOnVehicle?: (vehicleId: string) => void;
  className?: string;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  critical: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800/50",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800/50",
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800/50",
  },
};

const ALERT_TYPE_ICONS: Record<AlertRuleType, React.ReactNode> = {
  speed_limit: <Zap className="h-3.5 w-3.5" />,
  geofence: <Shield className="h-3.5 w-3.5" />,
  stop_duration: <Timer className="h-3.5 w-3.5" />,
  disconnection: <WifiOff className="h-3.5 w-3.5" />,
  sos: <AlertCircle className="h-3.5 w-3.5" />,
};

const ALERT_TYPE_LABELS: Record<AlertRuleType, string> = {
  speed_limit: "Exceso velocidad",
  geofence: "Geocerca",
  stop_duration: "Parada excesiva",
  disconnection: "Desconexión",
  sos: "SOS / Pánico",
};

function formatAlertTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return new Date(timestamp).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

/**
 * Panel lateral de alertas en tiempo real
 */
export function AlertPanel({
  alerts,
  onAcknowledge,
  onResolve,
  onCenterOnVehicle,
  className,
}: AlertPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "all">("all");
  const [filterType, setFilterType] = useState<AlertRuleType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "all">("active");

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      if (filterType !== "all" && a.alertType !== filterType) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterType, filterStatus]);

  const activeCount = useMemo(() => alerts.filter((a) => a.status === "active").length, [alerts]);
  const criticalCount = useMemo(() => alerts.filter((a) => a.severity === "critical" && a.status === "active").length, [alerts]);

  return (
    <div className={cn("flex flex-col rounded-lg border bg-card shadow-lg overflow-hidden", className)}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors",
          criticalCount > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-muted/30"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {criticalCount > 0 ? (
            <BellRing className="h-4 w-4 text-red-500 animate-pulse" />
          ) : (
            <Bell className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold">Alertas</span>
          {activeCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setSoundEnabled(!soundEnabled);
            }}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Body expandible */}
      {isExpanded && (
        <>
          {/* Filtros */}
          <div className="flex gap-1.5 border-b p-2">
            <Select value={filterSeverity} onValueChange={(v) => setFilterSeverity(v as AlertSeverity | "all")}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="warning">Advertencia</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as AlertStatus | "all")}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="acknowledged">Reconocidas</SelectItem>
                <SelectItem value="resolved">Resueltas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de alertas */}
          <ScrollArea className="max-h-[400px]">
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Sin alertas</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredAlerts.map((alert) => {
                  const config = SEVERITY_CONFIG[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "rounded-md border p-2.5 transition-all",
                        config.bg,
                        config.border,
                        alert.status === "resolved" && "opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn("mt-0.5", config.color)}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={cn("text-xs font-semibold", config.color)}>
                              {alert.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-tight mb-1">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              {ALERT_TYPE_ICONS[alert.alertType]}
                              {ALERT_TYPE_LABELS[alert.alertType]}
                            </span>
                            <span>•</span>
                            <span className="font-medium">{alert.vehiclePlate}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {formatAlertTime(alert.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Acciones */}
                      {alert.status === "active" && (
                        <div className="flex gap-1 mt-2 pt-1.5 border-t border-current/10">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] flex-1"
                            onClick={() => onAcknowledge(alert.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Reconocer
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] flex-1"
                            onClick={() => onResolve(alert.id)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Resolver
                          </Button>
                          {alert.position && onCenterOnVehicle && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={() => onCenterOnVehicle(alert.vehicleId)}
                            >
                              <MapPin className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
}
