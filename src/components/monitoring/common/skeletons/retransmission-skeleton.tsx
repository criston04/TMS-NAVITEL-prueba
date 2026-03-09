import { cn } from "@/lib/utils";

interface RetransmissionSkeletonProps {
  /** Cantidad de filas */
  rows?: number;
  /** Clase adicional */
  className?: string;
}

/**
 * Skeleton para la tabla de retransmisión
 */
export function RetransmissionSkeleton({
  rows = 10,
  className,
}: RetransmissionSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
        {[120, 150, 100, 140, 100, 80, 100].map((width, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-muted"
            style={{ width }}
          />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b px-4 py-3"
        >
          {/* Placa */}
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          {/* Empresa */}
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          {/* GPS */}
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          {/* Última conexión */}
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          {/* Estado movimiento */}
          <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          {/* Estado conexión */}
          <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
          {/* Duración */}
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
