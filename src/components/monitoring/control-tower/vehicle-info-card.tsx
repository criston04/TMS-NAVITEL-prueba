"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { X, MapPin, User, Package, Clock, Navigation, TimerOff, Phone, Route, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionStatusBadge } from "../common/connection-status-badge";
import { MovementStatusBadge } from "../common/movement-status-badge";
import { MaintenanceIndicator } from "./maintenance-indicator";
import { MilestoneList } from "./milestone-list";
import type { TrackedVehicle, TrackedOrder, TrackedMilestone } from "@/types/monitoring";

interface VehicleInfoCardProps {
  /** Vehículo */
  vehicle: TrackedVehicle;
  /** Orden asociada (opcional) */
  order?: TrackedOrder | null;
  /** Callback al cerrar */
  onClose: () => void;
  /** Callback al centrar en mapa */
  onCenterMap?: () => void;
  /** Clase adicional */
  className?: string;
}

/**
 * Formatea coordenadas para mostrar
 */
function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Formatea fecha para mostrar
 */
function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Calcula y formatea la duración desde que está detenido
 */
function formatStoppedDuration(stoppedSince: string): string {
  const diff = Date.now() - new Date(stoppedSince).getTime();
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

/**
 * Calcula ETA dinámico hacia el siguiente hito
 */
function calculateETA(
  vehicle: TrackedVehicle,
  milestones: TrackedMilestone[]
): { nextMilestone: TrackedMilestone; distanceKm: number; etaMinutes: number; isDelayed: boolean; delayMinutes: number } | null {
  if (!milestones || milestones.length === 0) return null;

  // Encontrar siguiente hito no completado
  const sorted = [...milestones].sort((a, b) => a.sequence - b.sequence);
  const next = sorted.find((m) => m.trackingStatus === "pending" || m.trackingStatus === "in_progress");
  if (!next) return null;

  // Calcular distancia con Haversine
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(next.coordinates.lat - vehicle.position.lat);
  const dLng = toRad(next.coordinates.lng - vehicle.position.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(vehicle.position.lat)) *
    Math.cos(toRad(next.coordinates.lat)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // Velocidad - usar actual o asumir 40 km/h si está detenido
  const speed = vehicle.position.speed > 0 ? vehicle.position.speed : 40;
  const etaMinutes = Math.round((distanceKm / speed) * 60);

  // Calcular retraso comparando con ETA original si existe
  let isDelayed = false;
  let delayMinutes = 0;

  if (next.estimatedArrival) {
    const originalETA = new Date(next.estimatedArrival);
    const calculatedETA = new Date(Date.now() + etaMinutes * 60 * 1000);
    const diffMs = calculatedETA.getTime() - originalETA.getTime();
    
    // Solo mostrar delay si es futuro y positivo (llegamos después de lo esperado)
    if (diffMs > 0 && originalETA.getTime() > Date.now()) {
      delayMinutes = Math.round(diffMs / 60000);
      isDelayed = delayMinutes > 5;
    }
  }

  return { nextMilestone: next, distanceKm, etaMinutes, isDelayed, delayMinutes };
}

/**
 * Tarjeta con información detallada de un vehículo
 */
export function VehicleInfoCard({
  vehicle,
  order,
  onClose,
  onCenterMap,
  className,
}: VehicleInfoCardProps) {
  // Calcular ETA dinámico
  const eta = useMemo(() => {
    if (!order) return null;
    return calculateETA(vehicle, order.milestones);
  }, [vehicle, order]);

  return (
    <div className={cn("relative rounded-xl border bg-card/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden transition-all duration-300 max-h-[calc(100vh-180px)]", className)}>
      {/* Header con gradiente sutil */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent rounded-t-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{vehicle.plate.slice(-3)}</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{vehicle.plate}</h3>
            {vehicle.economicNumber && (
              <p className="text-xs text-muted-foreground">#{vehicle.economicNumber}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body con scroll invisible */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-4">
          {/* Estados */}
          <div className="flex flex-wrap gap-2">
            <ConnectionStatusBadge status={vehicle.connectionStatus} />
            <MovementStatusBadge 
              status={vehicle.movementStatus} 
              speed={vehicle.position.speed}
            />
          </div>

          {/* Tiempo detenido en tiempo real */}
          {vehicle.movementStatus === "stopped" && vehicle.stoppedSince && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-900/20">
              <TimerOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Tiempo detenido</p>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatStoppedDuration(vehicle.stoppedSince)}
                </p>
              </div>
            </div>
          )}

          {/* Información del vehículo */}
          <div className="space-y-2 text-sm">
            {/* Posición */}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">Posición actual</p>
                <p className="text-muted-foreground">
                  {formatCoordinates(vehicle.position.lat, vehicle.position.lng)}
                </p>
              </div>
            </div>

            {/* Conductor */}
            {vehicle.driverName && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Conductor</p>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">{vehicle.driverName}</p>
                    {vehicle.driverPhone && (
                      <a
                        href={`tel:${vehicle.driverPhone}`}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-colors dark:text-emerald-400"
                        title={`Llamar a ${vehicle.driverName}`}
                      >
                        <Phone className="h-3 w-3" />
                        Llamar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Indicador de mantenimiento */}
            <MaintenanceIndicator
              kmToMaintenance={vehicle.kmToMaintenance}
              daysToMaintenance={vehicle.daysToMaintenance}
              maintenanceType={vehicle.maintenanceType}
            />

            {/* Dirección/Velocidad */}
            <div className="flex items-start gap-2">
              <Navigation className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">Velocidad / Dirección</p>
                <p className="text-muted-foreground">
                  {vehicle.position.speed} km/h • {vehicle.position.heading}°
                </p>
              </div>
            </div>

            {/* Última actualización */}
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">Última actualización</p>
                <p className="text-muted-foreground">{formatTime(vehicle.lastUpdate)}</p>
              </div>
            </div>

            {/* Empresa */}
            {vehicle.companyName && (
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Operador</p>
                  <p className="text-muted-foreground">{vehicle.companyName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Información de orden */}
          {order && (
            <div className="space-y-3 border-t pt-4">
              <div>
                <p className="text-sm font-medium">Orden activa</p>
                <p className="text-sm text-primary">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">{order.customerName}</p>
              </div>

              {/* Referencia y tipo de servicio */}
              {(order.reference || order.serviceType) && (
                <div className="flex flex-wrap gap-2">
                  {order.reference && (
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      Ref: {order.reference}
                    </span>
                  )}
                  {order.serviceType && (
                    <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
                      {order.serviceType}
                    </span>
                  )}
                </div>
              )}

              {/* Progreso */}
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>Progreso</span>
                  <span>{order.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full bg-primary transition-all" 
                    style={{ width: `${order.progress}%` }}
                  />
                </div>
              </div>

              {/* ETA dinámico integrado */}
              {eta && (
                <div className={cn(
                  "rounded-lg p-3 space-y-2",
                  eta.isDelayed 
                    ? "bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50"
                    : "bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Route className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold">ETA dinámico</span>
                    </div>
                    {eta.isDelayed && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        +{eta.delayMinutes} min
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Próximo destino</p>
                      <p className="font-medium truncate">{eta.nextMilestone.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Distancia</p>
                      <p className="font-medium font-mono">{eta.distanceKm.toFixed(1)} km</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Llegada estimada</p>
                      <p className="font-medium">
                        {new Date(Date.now() + eta.etaMinutes * 60 * 1000).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Vel. promedio</p>
                      <p className="font-medium font-mono">{vehicle.position.speed} km/h</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de hitos */}
              <MilestoneList 
                milestones={order.milestones}
                currentIndex={order.currentMilestoneIndex}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Footer sticky con acciones */}
      <div className="shrink-0 border-t bg-card/95 backdrop-blur-sm p-3 rounded-b-xl">
        <Button 
          variant="default" 
          size="sm" 
          className="w-full gap-2"
          onClick={onCenterMap}
        >
          <MapPin className="h-4 w-4" />
          Centrar en mapa
        </Button>
      </div>
    </div>
  );
}
