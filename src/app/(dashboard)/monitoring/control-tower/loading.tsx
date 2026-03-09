export default function ControlTowerLoading() {
  return (
    <div className="flex h-full w-full">
      {/* Sidebar skeleton */}
      <div className="w-80 border-r bg-background p-4">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>
      </div>
      {/* Map skeleton */}
      <div className="flex-1 animate-pulse bg-muted" />
    </div>
  );
}
