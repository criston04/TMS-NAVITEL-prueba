"use client";

import dynamic from "next/dynamic";

const HistoricalContainer = dynamic(
  () => import("@/components/monitoring/historical/historical-container").then(mod => mod.HistoricalContainer),
  { 
    ssr: false,
    loading: () => <HistoricalLoading />
  }
);

function HistoricalLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Cargando Rastreo Histórico...</p>
      </div>
    </div>
  );
}

export default function HistoricalPage() {
  return <HistoricalContainer />;
}
