export default function RetransmissionLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      {/* Filters skeleton */}
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-40 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg border bg-background">
        <div className="h-12 border-b bg-muted/50" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-14 border-b animate-pulse bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
