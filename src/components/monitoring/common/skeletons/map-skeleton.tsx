import { cn } from "@/lib/utils";
import { Map } from "lucide-react";

interface MapSkeletonProps {
  /** Clase adicional */
  className?: string;
}

/**
 * Skeleton para componentes de mapa
 */
export function MapSkeleton({ className }: MapSkeletonProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center bg-muted/50",
        className
      )}
    >
      {/* Fondo con patrón */}
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full bg-[linear-gradient(45deg,transparent_25%,currentColor_25%,currentColor_50%,transparent_50%,transparent_75%,currentColor_75%)] bg-[length:20px_20px]" />
      </div>
      
      {/* Icono central */}
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-background p-4 shadow-lg">
          <Map className="h-12 w-12 animate-pulse text-muted-foreground" />
        </div>
        <div className="text-sm text-muted-foreground">Cargando mapa...</div>
      </div>
      
      {/* Controles de zoom fake */}
      <div className="absolute right-4 top-4 flex flex-col gap-1">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
