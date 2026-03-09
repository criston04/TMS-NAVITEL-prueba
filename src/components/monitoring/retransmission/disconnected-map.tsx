"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { RetransmissionRecord } from "@/types/monitoring";

interface DisconnectedMapProps {
  /** Registros desconectados */
  records: RetransmissionRecord[];
  className?: string;
}

/**
 * Mini-mapa con última posición conocida de vehículos desconectados
 */
export function DisconnectedMap({ records, className }: DisconnectedMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  const disconnected = records.filter(
    (r) => r.retransmissionStatus === "disconnected" && r.lastLocation
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const init = async () => {
      const leafletModule = await import("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (leafletModule.default || leafletModule) as any;

      const container = mapContainerRef.current;
      if (!container) return;
      if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return;

      const map = L.map(container, {
        center: [-12.0464, -77.0428],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Add markers for disconnected vehicles
      const bounds: Array<[number, number]> = [];
      disconnected.forEach((rec) => {
        if (!rec.lastLocation) return;
        const { lat, lng } = rec.lastLocation;
        bounds.push([lat, lng]);

        const icon = L.divIcon({
          html: `<div class="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold shadow ring-2 ring-red-300/50 animate-pulse">!</div>`,
          className: "disconnected-marker",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="padding:4px;min-width:120px">
              <b>${rec.vehiclePlate}</b><br>
              <span style="font-size:11px;color:#999">${rec.companyName}</span><br>
              <span style="font-size:11px;color:#ef4444">⚠ ${Math.floor(rec.disconnectedDuration / 60)} min sin señal</span>
            </div>`
          );
      });

      if (bounds.length > 0) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
      }

      setIsReady(true);
    };

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsReady(false);
      }
    };
  }, [disconnected.length]);

  if (disconnected.length === 0) {
    return (
      <div className={cn("rounded-lg border bg-card p-6 text-center", className)}>
        <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto" />
        <p className="mt-2 text-sm text-muted-foreground">
          No hay vehículos desconectados
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <div className="border-b px-4 py-2.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Última posición conocida</p>
          <span className="text-xs text-red-500 font-medium">
            {disconnected.length} desconectados
          </span>
        </div>
      </div>
      <div className="relative h-[200px]">
        <div ref={mapContainerRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
