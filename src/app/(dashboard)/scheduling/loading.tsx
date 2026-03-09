import { PageWrapper } from '@/components/page-wrapper';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Componente de carga del módulo de programación
 * @returns Skeleton de carga
 */
export default function SchedulingLoading() {
  return (
    <PageWrapper>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header KPIs skeleton */}
        <div className="flex items-center gap-4 px-4 py-3 border-b bg-card">
          {new Array(4).fill(null).map((_, i) => (
            <div key={`kpi-${i}`} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
          <div className="ml-auto">
            <Skeleton className="h-8 w-32" />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar skeleton */}
          <div className="w-87.5 border-r bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-9 w-full" />
            <div className="flex gap-2">
              {new Array(4).fill(null).map((_, i) => (
                <Skeleton key={`filter-${i}`} className="h-7 w-16" />
              ))}
            </div>
            <div className="space-y-3 pt-4">
              {new Array(5).fill(null).map((_, i) => (
                <Skeleton key={`card-${i}`} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Calendar skeleton */}
          <div className="flex-1 p-4">
            <div className="h-full bg-card rounded-lg border">
              {/* Calendar header */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-6 w-32 ml-2" />
                </div>
                <Skeleton className="h-8 w-40" />
              </div>

              {/* Days of week */}
              <div className="grid grid-cols-7 border-b">
                {new Array(7).fill(null).map((_, i) => (
                  <Skeleton key={`day-${i}`} className="h-10 w-full border-r" />
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {new Array(35).fill(null).map((_, i) => (
                  <div
                    key={`cell-${i}`}
                    className="h-28 border-r border-b p-2"
                  >
                    <Skeleton className="h-5 w-5 rounded-full mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
