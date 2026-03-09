"use client";

import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Clock, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConnectionHistoryEntry } from "@/types/monitoring";

interface ConnectionHistoryProps {
  history: ConnectionHistoryEntry[];
  vehiclePlate?: string;
  className?: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Timeline de historial de conexión/desconexión de un vehículo
 */
export function ConnectionHistory({ history, vehiclePlate, className }: ConnectionHistoryProps) {
  if (history.length === 0) {
    return (
      <div className={cn("flex flex-col items-center gap-2 p-6", className)}>
        <Clock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Sin historial disponible</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">Historial de conexión</p>
        {vehiclePlate && (
          <p className="text-xs text-muted-foreground">{vehiclePlate}</p>
        )}
      </div>
      <ScrollArea className="max-h-[300px]">
        <div className="p-3 space-y-0">
          {history.map((entry, i) => {
            const isOnline = entry.status === "online";
            const isDisconnected = entry.status === "disconnected";
            return (
              <div key={entry.id} className="flex items-start gap-3 relative">
                {/* Timeline line */}
                {i < history.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                )}
                {/* Status dot */}
                <div
                  className={cn(
                    "mt-1 h-[22px] w-[22px] shrink-0 rounded-full flex items-center justify-center ring-2 ring-background",
                    isOnline ? "bg-emerald-500" : isDisconnected ? "bg-red-500" : "bg-amber-500"
                  )}
                >
                  {isOnline ? (
                    <Wifi className="h-3 w-3 text-white" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-white" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {isOnline ? "En línea" : isDisconnected ? "Desconectado" : "Pérdida temporal"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(entry.startTime)} {formatTime(entry.startTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      Duración: {formatDuration(entry.durationSeconds)}
                    </span>
                    {!isOnline && entry.durationSeconds > 900 && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
