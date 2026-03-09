"use client";

import { cn } from "@/lib/utils";
import { Navigation, Square } from "lucide-react";
import type { MovementStatus } from "@/types/monitoring";

interface MovementStatusBadgeProps {
  
  status: MovementStatus;
  /** Velocidad en km/h (opcional) */
  speed?: number;
  /** Mostrar texto del estado */
  showText?: boolean;
  /** Tamaño del badge */
  size?: "sm" | "md" | "lg";
  /** Clase adicional */
  className?: string;
}

const statusConfig: Record<MovementStatus, { label: string; className: string }> = {
  moving: {
    label: "En movimiento",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  stopped: {
    label: "Detenido",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
  },
};

const sizeConfig = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-2.5 py-1",
};

const iconSizeConfig = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

/**
 * Badge que muestra el estado de movimiento de un vehículo
 */
export function MovementStatusBadge({
  status,
  speed,
  showText = true,
  size = "md",
  className,
}: MovementStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = status === "moving" ? Navigation : Square;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.className,
        sizeConfig[size],
        className
      )}
    >
      <Icon className={cn(iconSizeConfig[size], status === "moving" && "animate-pulse")} />
      {showText && (
        <span>
          {speed !== undefined && status === "moving" 
            ? `${speed} km/h` 
            : config.label}
        </span>
      )}
    </span>
  );
}
