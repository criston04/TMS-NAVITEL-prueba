export default function MultiWindowLoading() {
  return (
    <div className="p-6">
      {/* Controls skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="flex gap-2">
          <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
