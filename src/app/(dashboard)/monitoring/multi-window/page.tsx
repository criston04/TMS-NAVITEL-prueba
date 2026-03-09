"use client";

import dynamic from "next/dynamic";

const MultiWindowContainer = dynamic(
  () => import("@/components/monitoring/multi-window/multi-window-container").then(mod => mod.MultiWindowContainer),
  { 
    ssr: false,
    loading: () => <MultiWindowLoading />
  }
);

function MultiWindowLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Cargando Multiventana...</p>
      </div>
    </div>
  );
}

export default function MultiWindowPage() {
  return <MultiWindowContainer />;
}
