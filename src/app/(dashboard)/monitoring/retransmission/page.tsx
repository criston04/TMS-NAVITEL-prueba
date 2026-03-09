"use client";

import dynamic from "next/dynamic";

const RetransmissionContainer = dynamic(
  () => import("@/components/monitoring/retransmission/retransmission-container").then(mod => mod.RetransmissionContainer),
  { 
    ssr: false,
    loading: () => <RetransmissionLoading />
  }
);

function RetransmissionLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Cargando Retransmisión...</p>
      </div>
    </div>
  );
}

export default function RetransmissionPage() {
  return <RetransmissionContainer />;
}
