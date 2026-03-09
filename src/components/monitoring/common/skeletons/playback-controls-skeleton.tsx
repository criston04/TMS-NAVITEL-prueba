import { cn } from "@/lib/utils";

interface PlaybackControlsSkeletonProps {
  /** Clase adicional */
  className?: string;
}

/**
 * Skeleton para controles de reproducción de ruta
 */
export function PlaybackControlsSkeleton({
  className,
}: PlaybackControlsSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Barra de progreso */}
      <div className="space-y-2">
        <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
        <div className="flex justify-between">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
      
      {/* Botones de control */}
      <div className="flex items-center justify-center gap-2">
        {/* Step back */}
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
        {/* Stop */}
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
        {/* Play/Pause */}
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
        {/* Step forward */}
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
      </div>
      
      {/* Selector de velocidad */}
      <div className="flex items-center justify-center gap-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      </div>
      
      {/* Info del punto actual */}
      <div className="flex justify-between text-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
