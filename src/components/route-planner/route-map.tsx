"use client";

/* ============================================
   COMPONENT: Route Map
   Mapa interactivo con marcadores y ruta
   ============================================ */

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { MapPin, Navigation } from "lucide-react";
import type { Route, RouteStop } from "@/types/route-planner";
import { cn } from "@/lib/utils";

// Importar el mapa dinámicamente para evitar errores de SSR
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface RouteMapProps {
  route: Route | null;
  onStopReorder?: (stops: RouteStop[]) => void;
}

/* ============================================
   ROUTE MAP COMPONENT
   ============================================ */
export function RouteMap({ route }: RouteMapProps) {
  if (!route) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20">
        <div className="text-center">
          <Navigation className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Selecciona órdenes y genera una ruta para visualizar en el mapa
          </p>
        </div>
      </div>
    );
  }

  const center: [number, number] = route.stops.length > 0
    ? route.stops[0].coordinates
    : [-12.0464, -77.0428];

  return (
    <div className="h-full w-full relative">
      <div style={{ height: "100%", width: "100%" }}>
        <MapContainer
          //@ts-ignore
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Polyline (ruta) */}
          {route.polyline && (
            //@ts-ignore
            <Polyline
              positions={route.polyline}
              pathOptions={{
                //@ts-ignore
                color: "#3DBAFF",
                weight: 4,
                opacity: 0.7,
              }}
            />
          )}

          {/* Markers (paradas) */}
          {route.stops.map((stop) => (
            <Marker key={stop.id} position={stop.coordinates}>
              <Popup>
                <div className="p-2">
                  <div className="font-semibold mb-1">
                    Parada {stop.sequence} - {stop.type === "pickup" ? "Recolección" : "Entrega"}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    <div>{stop.address}</div>
                    <div>{stop.city}</div>
                  </div>
                  {stop.timeWindow && (
                    <div className="text-xs text-muted-foreground">
                      Ventana: {stop.timeWindow.start} - {stop.timeWindow.end}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Duración estimada: {stop.duration} min
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Route Info Overlay */}
      <div className="absolute top-4 left-4 z-[1000] bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-[#3DBAFF]" />
          <span className="font-semibold text-sm">{route.name}</span>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">{route.stops.length}</span> paradas
          </div>
          <div>
            <span className="font-medium">{route.metrics.totalDistance}</span> km
          </div>
          <div>
            <span className="font-medium">{Math.floor(route.metrics.estimatedDuration / 60)}h {route.metrics.estimatedDuration % 60}m</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <div className="text-xs font-semibold mb-2">Leyenda</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600" />
            <span>Recolección</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#3DBAFF] border-2 border-[#3DBAFF]" />
            <span>Entrega</span>
          </div>
        </div>
      </div>
    </div>
  );
}
