"use client";

import { cn } from "@/lib/utils";
import type { RetransmissionStatus } from "@/types/monitoring";

interface ConnectionStatusBadgeProps {
  /** Estado de conexión */
  status: RetransmissionStatus;
  /** Mostrar texto del estado */
  showText?: boolean;
  /** Tamaño del badge */
  size?: "sm" | "md" | "lg";
  /** Clase adicional */
  className?: string;
}

const statusConfig: Record<RetransmissionStatus, { label: string; className: string }> = {
  online: {
    label: "En línea",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  temporary_loss: {
    label: "Pérdida temporal",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  disconnected: {
    label: "Sin conexión",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

const sizeConfig = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-2.5 py-1",
};

const dotSizeConfig = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

/**
 * Badge que muestra el estado de conexión de un vehículo
 */
export function ConnectionStatusBadge({
  status,
  showText = true,
  size = "md",
  className,
}: ConnectionStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.className,
        sizeConfig[size],
        className
      )}
    >
      <span
        className={cn(
          "rounded-full",
          dotSizeConfig[size],
          status === "online" ? "bg-emerald-500 animate-pulse" : "",
          status === "temporary_loss" ? "bg-amber-500" : "",
          status === "disconnected" ? "bg-red-500" : ""
        )}
      />
      {showText && config.label}
    </span>
  );
}
