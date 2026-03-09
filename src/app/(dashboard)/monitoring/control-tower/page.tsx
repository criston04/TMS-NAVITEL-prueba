"use client";

import dynamic from "next/dynamic";

const ControlTowerContainer = dynamic(
  () => import("@/components/monitoring/control-tower/control-tower-container").then(mod => mod.ControlTowerContainer),
  { 
    ssr: false,
    loading: () => <ControlTowerLoading />
  }
);

function ControlTowerLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Cargando Torre de Control...</p>
      </div>
    </div>
  );
}

export default function ControlTowerPage() {
  return (
    <div className="h-full min-h-0">
      <ControlTowerContainer className="h-full" />
    </div>
  );
}
