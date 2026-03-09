"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowUp, Minus } from "lucide-react";

interface PriorityBadgeProps {
  /** Duración sin conexión en segundos */
  disconnectedDuration: number;
  /** Si tiene orden activa */
  hasActiveOrder?: boolean;
  className?: string;
}

type PriorityLevel = "critical" | "high" | "medium" | "low";

function calculatePriority(durationSec: number, hasOrder: boolean): PriorityLevel {
  if (durationSec > 3600 || (durationSec > 1800 && hasOrder)) return "critical";
  if (durationSec > 1800 || (durationSec > 900 && hasOrder)) return "high";
  if (durationSec > 900) return "medium";
  return "low";
}

const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; class: string; icon: React.ReactNode }> = {
  critical: {
    label: "Crítica",
    class: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  high: {
    label: "Alta",
    class: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50",
    icon: <ArrowUp className="h-3 w-3" />,
  },
  medium: {
    label: "Media",
    class: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
    icon: <Minus className="h-3 w-3" />,
  },
  low: {
    label: "Baja",
    class: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50",
    icon: null,
  },
};

/**
 * Badge de prioridad automática para retransmisión
 */
export function PriorityBadge({
  disconnectedDuration,
  hasActiveOrder = false,
  className,
}: PriorityBadgeProps) {
  const priority = calculatePriority(disconnectedDuration, hasActiveOrder);
  const config = PRIORITY_CONFIG[priority];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-[10px] font-medium", config.class, className)}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
