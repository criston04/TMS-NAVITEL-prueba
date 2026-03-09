"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, MessageSquarePlus, MapPin } from "lucide-react";
import { ConnectionStatusBadge } from "../common/connection-status-badge";
import { MovementStatusBadge } from "../common/movement-status-badge";
import { DurationDisplay } from "../common/duration-display";
import type { RetransmissionRecord } from "@/types/monitoring";

interface RetransmissionRowProps {
  /** Registro de retransmisión */
  record: RetransmissionRecord;
  /** Callback al hacer clic en comentario */
  onCommentClick: (record: RetransmissionRecord) => void;
  /** Si la fila está seleccionada */
  isSelected?: boolean;
  /** Clase adicional */
  className?: string;
}

/**
 * Formatea fecha para mostrar
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Fila individual de la tabla de retransmisión
 */
export function RetransmissionRow({
  record,
  onCommentClick,
  isSelected = false,
  className,
}: RetransmissionRowProps) {
  const hasComment = !!record.comments && record.comments.trim().length > 0;

  return (
    <tr
      className={cn(
        "border-b transition-colors hover:bg-muted/50",
        isSelected && "bg-muted",
        className
      )}
    >
      {/* Placa */}
      <td className="px-4 py-3">
        <span className="font-medium">{record.vehiclePlate}</span>
      </td>

      {/* Empresa */}
      <td className="px-4 py-3 text-muted-foreground">
        {record.companyName}
      </td>

      {/* Empresa GPS */}
      <td className="px-4 py-3">
        <span className="rounded bg-muted px-2 py-1 text-xs font-medium">
          {record.gpsCompanyName}
        </span>
      </td>

      {/* Última conexión */}
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatDate(record.lastConnection)}
      </td>

      {/* Estado movimiento */}
      <td className="px-4 py-3">
        <MovementStatusBadge 
          status={record.movementStatus} 
          speed={record.speed}
        />
      </td>

      {/* Estado retransmisión */}
      <td className="px-4 py-3">
        <ConnectionStatusBadge status={record.retransmissionStatus} />
      </td>

      {/* Duración sin conexión */}
      <td className="px-4 py-3">
        {record.disconnectedDuration > 0 ? (
          <DurationDisplay 
            seconds={record.disconnectedDuration} 
            format="compact"
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* Dirección con enlace al mapa */}
      <td className="px-4 py-3">
        {record.lastAddress && record.lastLocation ? (
          <a
            href={`https://www.google.com/maps?q=${record.lastLocation.lat},${record.lastLocation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-sm text-primary hover:underline"
            title={`Ver en Google Maps: ${record.lastAddress}`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70 group-hover:text-primary" />
            <span className="max-w-[180px] truncate">{record.lastAddress}</span>
          </a>
        ) : record.lastLocation ? (
          <a
            href={`https://www.google.com/maps?q=${record.lastLocation.lat},${record.lastLocation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono">{record.lastLocation.lat.toFixed(5)}, {record.lastLocation.lng.toFixed(5)}</span>
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* Comentarios */}
      <td className="px-4 py-3">
        <button
          onClick={() => onCommentClick(record)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors",
            "hover:bg-muted",
            hasComment 
              ? "text-primary" 
              : "text-muted-foreground"
          )}
          title={hasComment ? record.comments : "Agregar comentario"}
        >
          {hasComment ? (
            <>
              <MessageSquare className="h-4 w-4 fill-current" />
              <span className="max-w-[100px] truncate">{record.comments}</span>
            </>
          ) : (
            <>
              <MessageSquarePlus className="h-4 w-4" />
              <span>Agregar</span>
            </>
          )}
        </button>
      </td>
    </tr>
  );
}
