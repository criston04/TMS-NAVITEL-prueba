export default function HistoricalLoading() {
  return (
    <div className="flex h-full w-full">
      {/* Sidebar skeleton */}
      <div className="w-96 border-r bg-background p-4">
        <div className="space-y-6">
          {/* Search form skeleton */}
          <div className="space-y-4">
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
          {/* Playback controls skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
            <div className="flex justify-center gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Map skeleton */}
      <div className="flex-1 animate-pulse bg-muted" />
    </div>
  );
}
