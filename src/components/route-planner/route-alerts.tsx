"use client";

/* ============================================
   COMPONENT: Route Alerts
   Alertas visuales para la ruta
   ============================================ */

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Clock,
  Weight,
  Box,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RouteAlert } from "@/types/route-planner";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface RouteAlertsProps {
  alerts: RouteAlert[];
  onDismiss?: (alertId: string) => void;
  compact?: boolean;
}

/* ============================================
   ALERT ICON MAPPING
   ============================================ */
const alertIcons: Record<string, React.ReactNode> = {
  CAPACITY_EXCEEDED: <Weight className="h-4 w-4" />,
  DELAY_RISK: <Clock className="h-4 w-4" />,
  TRAFFIC_WARNING: <Zap className="h-4 w-4" />,
  TIME_WINDOW_CONFLICT: <Clock className="h-4 w-4" />,
  OTHER: <Info className="h-4 w-4" />,
};

/* ============================================
   SINGLE ALERT COMPONENT
   ============================================ */
function AlertItem({
  alert,
  onDismiss,
  index,
}: {
  alert: RouteAlert;
  onDismiss?: () => void;
  index: number;
}) {
  const isError = alert.type === "error";
  const isWarning = alert.type === "warning";

  const bgColor = isError
    ? "bg-red-500/10 border-red-500/30"
    : isWarning
      ? "bg-yellow-500/10 border-yellow-500/30"
      : "bg-blue-500/10 border-blue-500/30";

  const textColor = isError
    ? "text-red-500"
    : isWarning
      ? "text-yellow-500"
      : "text-blue-500";

  const Icon = isError ? AlertCircle : isWarning ? AlertTriangle : Info;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "relative p-3 rounded-lg border",
        bgColor
      )}
    >
      <div className="flex items-start gap-3">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: index * 0.05 + 0.1, type: "spring" }}
          className={cn("shrink-0 mt-0.5", textColor)}
        >
          {alertIcons[alert.code] || <Icon className="h-4 w-4" />}
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className={cn("text-sm font-medium", textColor)}>
                {alert.code === "CAPACITY_EXCEEDED"
                  ? "Exceso de Capacidad"
                  : alert.code === "DELAY_RISK"
                    ? "Riesgo de Retraso"
                    : alert.code === "TRAFFIC_WARNING"
                      ? "Alerta de Tráfico"
                      : alert.code === "TIME_WINDOW_CONFLICT"
                        ? "Conflicto de Horario"
                        : "Aviso"}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alert.message}
              </p>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Severity Indicator */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
        className={cn(
          "absolute bottom-0 left-0 h-0.5 rounded-full",
          isError
            ? "bg-red-500"
            : isWarning
              ? "bg-yellow-500"
              : "bg-blue-500"
        )}
      />
    </motion.div>
  );
}

/* ============================================
   ROUTE ALERTS COMPONENT
   ============================================ */
export function RouteAlerts({ alerts, onDismiss, compact = false }: RouteAlertsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));
  const errors = visibleAlerts.filter((a) => a.type === "error");
  const warnings = visibleAlerts.filter((a) => a.type === "warning");
  const infos = visibleAlerts.filter((a) => a.type === "info");

  const handleDismiss = (alertId: string) => {
    setDismissed((prev) => new Set(prev).add(alertId));
    onDismiss?.(alertId);
  };

  if (visibleAlerts.length === 0) return null;

  if (compact) {
    // Compact mode - just show summary
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-2"
      >
        {errors.length > 0 && (
          <div className="flex items-center gap-1.5 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">{errors.length} error(es)</span>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="flex items-center gap-1.5 text-yellow-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">{warnings.length} advertencia(s)</span>
          </div>
        )}
        {infos.length > 0 && (
          <div className="flex items-center gap-1.5 text-blue-500">
            <Info className="h-4 w-4" />
            <span className="text-xs font-medium">{infos.length} aviso(s)</span>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3"
    >
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">
            {visibleAlerts.length} alerta{visibleAlerts.length !== 1 ? "s" : ""}
          </span>
        </div>
        {visibleAlerts.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newDismissed = new Set(dismissed);
              visibleAlerts.forEach((a) => newDismissed.add(a.id));
              setDismissed(newDismissed);
            }}
            className="text-xs h-7"
          >
            Descartar todas
          </Button>
        )}
      </div>

      {/* Alerts List */}
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map((alert, index) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            index={index}
            onDismiss={() => handleDismiss(alert.id)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

/* ============================================
   INLINE ALERT BANNER
   ============================================ */
export function AlertBanner({
  type,
  message,
  onDismiss,
}: {
  type: "error" | "warning" | "info";
  message: string;
  onDismiss?: () => void;
}) {
  const config = {
    error: {
      icon: AlertCircle,
      bg: "bg-red-500/10 border-red-500/30",
      text: "text-red-500",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-yellow-500/10 border-yellow-500/30",
      text: "text-yellow-500",
    },
    info: {
      icon: Info,
      bg: "bg-blue-500/10 border-blue-500/30",
      text: "text-blue-500",
    },
  };

  const { icon: Icon, bg, text } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn("flex items-center gap-3 p-3 rounded-lg border", bg)}
    >
      <Icon className={cn("h-5 w-5 shrink-0", text)} />
      <p className="flex-1 text-sm">{message}</p>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}
