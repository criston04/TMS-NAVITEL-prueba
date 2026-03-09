import { cn } from "@/lib/utils";

interface StatsPanelSkeletonProps {
  /** Cantidad de cards */
  cards?: number;
  /** Clase adicional */
  className?: string;
}

/**
 * Skeleton para paneles de estadísticas
 */
export function StatsPanelSkeleton({
  cards = 4,
  className,
}: StatsPanelSkeletonProps) {
  return (
    <div className={cn("grid gap-4", className)} style={{
      gridTemplateColumns: `repeat(${Math.min(cards, 4)}, minmax(0, 1fr))`
    }}>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border bg-card p-4"
        >
          {/* Título */}
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted" />
          {/* Valor */}
          <div className="mb-1 h-8 w-16 animate-pulse rounded bg-muted" />
          {/* Subtítulo */}
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
