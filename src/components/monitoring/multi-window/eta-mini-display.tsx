"use client";

import { cn } from "@/lib/utils";
import { Clock, MapPin } from "lucide-react";

interface EtaMiniDisplayProps {
  /** Nombre del próximo destino */
  destinationName?: string;
  /** Distancia restante en km */
  distanceKm?: number;
  /** Hora estimada de llegada (ISO o HH:MM) */
  eta?: string;
  /** ¿Está retrasado? */
  isDelayed?: boolean;
  className?: string;
}

/**
 * Miniatura de ETA para mostrar en paneles multiventana
 */
export function EtaMiniDisplay({
  destinationName,
  distanceKm,
  eta,
  isDelayed = false,
  className,
}: EtaMiniDisplayProps) {
  if (!destinationName && !eta) {
    return null;
  }

  const etaFormatted = eta
    ? eta.includes("T")
      ? new Date(eta).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
      : eta
    : null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[10px] rounded px-1.5 py-0.5",
        isDelayed ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600",
        className
      )}
    >
      <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
      {destinationName && (
        <span className="truncate max-w-[60px]" title={destinationName}>
          {destinationName}
        </span>
      )}
      {distanceKm != null && (
        <span className="font-mono flex-shrink-0">
          {distanceKm.toFixed(1)}km
        </span>
      )}
      {etaFormatted && (
        <>
          <Clock className="h-2.5 w-2.5 flex-shrink-0" />
          <span className="font-mono font-medium flex-shrink-0">{etaFormatted}</span>
        </>
      )}
    </div>
  );
}
