"use client";

import { cn } from "@/lib/utils";
import { Vehicle, TrackingEvent, TrackingEventStatus } from "@/types/fleet";
import { Truck, ChevronRight, CheckCircle2, Circle, MapPin } from "lucide-react";

/**
 * Props para el componente VehicleCard
 * @interface VehicleCardProps
 */
interface VehicleCardProps {
  /** Datos del vehículo */
  vehicle: Vehicle;
  /** Si la tarjeta está seleccionada */
  isSelected: boolean;
  /** Si la tarjeta está expandida mostrando el timeline */
  isExpanded: boolean;
  /** Callback cuando se selecciona la tarjeta */
  onSelect: () => void;
  /** Callback para expandir/colapsar la tarjeta */
  onToggleExpand: () => void;
}

/**
 * Obtiene el icono correspondiente al estado del evento
 * @param status - Estado del evento de tracking
 * @returns Componente de icono React
 */
function getStatusIcon(status: TrackingEventStatus): React.ReactNode {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
    case "current":
      return <MapPin className="h-6 w-6 text-primary" />;
    default:
      return <Circle className="h-6 w-6 text-muted-foreground/40" />;
  }
}

/**
 * Obtiene la clase CSS del título según el estado del evento
 * @param status - Estado del evento de tracking
 * @returns Nombre de clase CSS
 */
function getStatusTitleClass(status: TrackingEventStatus): string {
  switch (status) {
    case "completed":
      return "text-emerald-500";
    case "current":
      return "text-primary";
    default:
      return "text-muted-foreground/60";
  }
}

function TrackingTimeline({ events }: Readonly<{ events: TrackingEvent[] }>) {
  return (
    <div className="space-y-3 mt-4">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        return (
          <div key={event.id} className="relative flex gap-3">
            {!isLast && (
              <div className={cn(
                "absolute left-2.75 top-6 w-0.5 h-full -ml-px",
                event.status === "completed" ? "bg-emerald-500" : "bg-border"
              )} />
            )}
            <div className="relative z-10 shrink-0">
              {getStatusIcon(event.status)}
            </div>
            <div className="flex-1 min-w-0 pb-3">
              <p className={cn(
                "text-xs font-bold uppercase tracking-wide",
                getStatusTitleClass(event.status)
              )}>
                {event.title}
              </p>
              {event.handler && (
                <p className="text-sm font-medium text-foreground mt-0.5">{event.handler}</p>
              )}
              <p className="text-xs text-muted-foreground">{event.timestamp}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeliveryProgress({ progress }: Readonly<{ progress: number }>) {
  return (
    <div className="py-3 border-b">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Delivery Process</span>
        <span className="text-sm font-bold text-primary">{progress}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-primary to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function VehicleCard({
  vehicle, isSelected, isExpanded, onSelect, onToggleExpand,
}: Readonly<VehicleCardProps>) {
  return (
    <div className={cn(
      "border rounded-xl transition-all duration-200 overflow-hidden",
      isSelected ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-primary/30"
    )}>
      <button
        onClick={() => { onSelect(); onToggleExpand(); }}
        className="w-full p-4 flex items-center gap-4 text-left"
      >
        <div className={cn(
          "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all",
          isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
        )}>
          <Truck className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{vehicle.code}</p>
          <p className="text-sm text-muted-foreground">
            {vehicle.address}, {vehicle.city}, {vehicle.country}
          </p>
        </div>
        <ChevronRight className={cn(
          "h-5 w-5 text-muted-foreground transition-transform duration-200",
          isExpanded && "rotate-90"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        isExpanded ? "max-h-150 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="px-4 pb-4">
          <DeliveryProgress progress={vehicle.progress} />
          <TrackingTimeline events={vehicle.tracking} />
        </div>
      </div>
    </div>
  );
}
