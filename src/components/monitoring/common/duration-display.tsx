"use client";

import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface DurationDisplayProps {
  /** Duración en segundos */
  seconds: number;
  /** Mostrar icono */
  showIcon?: boolean;
  /** Formato de visualización */
  format?: "full" | "compact" | "short";
  /** Clase adicional */
  className?: string;
}

/**
 * Formatea segundos a HH:MM:SS
 */
function formatDuration(seconds: number, format: "full" | "compact" | "short"): string {
  if (seconds < 0) seconds = 0;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, "0");

  switch (format) {
    case "full":
      // 02 horas, 30 minutos, 45 segundos
      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
      if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minuto" : "minutos"}`);
      if (secs > 0 || parts.length === 0) parts.push(`${secs} ${secs === 1 ? "segundo" : "segundos"}`);
      return parts.join(", ");
      
    case "compact":
      // 2h 30m 45s
      const compactParts: string[] = [];
      if (hours > 0) compactParts.push(`${hours}h`);
      if (minutes > 0) compactParts.push(`${minutes}m`);
      if (secs > 0 || compactParts.length === 0) compactParts.push(`${secs}s`);
      return compactParts.join(" ");
      
    case "short":
    default:
      // 02:30:45
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
}

/**
 * Componente que muestra una duración formateada
 */
export function DurationDisplay({
  seconds,
  showIcon = false,
  format = "short",
  className,
}: DurationDisplayProps) {
  const formattedDuration = formatDuration(seconds, format);

  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-sm", className)}>
      {showIcon && <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
      <span>{formattedDuration}</span>
    </span>
  );
}

// Exporta la función de formateo para uso externo
export { formatDuration };
