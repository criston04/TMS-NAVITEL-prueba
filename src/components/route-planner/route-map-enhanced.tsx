"use client";

/* ============================================
   COMPONENT: Route Map
   Mapa interactivo con marcadores numerados y ruta animada
   ============================================ */

import { useEffect, useState, useRef, useMemo, Fragment } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation,
  MapPin,
  Maximize2,
  Minimize2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Route, RouteStop, TransportOrder } from "@/types/route-planner";
import { cn } from "@/lib/utils";

// Dynamic imports for Leaflet components (only components, not hooks)
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
  allRoutes?: Route[];
  selectedRouteId?: string | null;
  selectedOrders?: TransportOrder[];
  onStopReorder?: (stops: RouteStop[]) => void;
  showOrderMarkers?: boolean;
}

/* ============================================
   FIT BOUNDS COMPONENT (uses useMap properly via dynamic component)
   ============================================ */
const MapBoundsController = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMap } = mod;
      // Create a proper React component that uses useMap hook
      function BoundsController({ bounds }: { bounds: [number, number][] }) {
        const map = useMap();
        useEffect(() => {
          if (bounds.length > 0 && map) {
            const L = require("leaflet");
            const leafletBounds = L.latLngBounds(
              bounds.map((b: [number, number]) => L.latLng(b[0], b[1]))
            );
            map.fitBounds(leafletBounds, {
              padding: [50, 50],
              maxZoom: 15,
              animate: true,
              duration: 0.5,
            });
          }
        }, [bounds, map]);
        return null;
      }
      return { default: BoundsController };
    }),
  { ssr: false }
) as any;

/* ============================================
   MAP RESIZE HANDLER (invalidates size on container resize)
   ============================================ */
const MapResizeHandler = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMap } = mod;
      function ResizeHandler() {
        const map = useMap();
        useEffect(() => {
          if (!map) return;
          const container = map.getContainer();
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          const observer = new ResizeObserver(() => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              map.invalidateSize();
            }, 150);
          });
          observer.observe(container);
          return () => {
            observer.disconnect();
            if (timeoutId) clearTimeout(timeoutId);
          };
        }, [map]);
        return null;
      }
      return { default: ResizeHandler };
    }),
  { ssr: false }
) as any;

/* ============================================
   ANIMATED POLYLINE PATH
   ============================================ */
function AnimatedPath({ positions }: { positions: [number, number][] }) {
  const [visiblePositions, setVisiblePositions] = useState<[number, number][]>([]);
  const animationRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (!positions.length) return;

    let index = 0;
    const animate = () => {
      if (!isMountedRef.current) return;
      if (index < positions.length) {
        setVisiblePositions(positions.slice(0, index + 1));
        index++;
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Reset and start animation
    setVisiblePositions([]);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      isMountedRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [positions]);

  if (visiblePositions.length < 2) return null;

  return (
    <>
      {/* Shadow line */}
      {/* @ts-ignore - Dynamic import types */}
      <Polyline
        positions={visiblePositions}
        pathOptions={{
          //@ts-ignore
          color: "#000",
          weight: 8,
          opacity: 0.15,
        }}
      />
      {/* Main line */}
      {/* @ts-ignore - Dynamic import types */}
      <Polyline
        positions={visiblePositions}
        pathOptions={{
          //@ts-ignore
          color: "#3DBAFF",
          weight: 5,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      {/* Animated dashes overlay */}
      {/* @ts-ignore - Dynamic import types */}
      <Polyline
        positions={visiblePositions}
        pathOptions={{
          //@ts-ignore
          color: "#fff",
          weight: 2,
          opacity: 0.5,
          dashArray: "10, 15",
        }}
      />
    </>
  );
}

/* ============================================
   EMPTY MAP STATE
   ============================================ */
function EmptyMapState() {
  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted/20 via-background to-muted/10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm"
      >
        {/* Animated Map Icon */}
        <div className="relative mx-auto mb-6">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3DBAFF]/20 to-[#3DBAFF]/5 mx-auto shadow-lg shadow-[#3DBAFF]/10 border border-[#3DBAFF]/10">
              <Navigation className="h-12 w-12 text-[#3DBAFF]/60" />
            </div>
          </motion.div>
          {/* Decorative dots */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-green-500/30"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-1 -left-3 h-3 w-3 rounded-full bg-[#3DBAFF]/30"
          />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Planifica tu ruta
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Selecciona órdenes del panel izquierdo y presiona{" "}
          <span className="font-medium text-[#3DBAFF]">"Generar Ruta"</span>{" "}
          para visualizar el recorrido optimizado
        </p>
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3DBAFF]/10 text-[#3DBAFF] text-[10px] font-bold">1</div>
            <span>Seleccionar</span>
          </div>
          <div className="h-px w-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3DBAFF]/10 text-[#3DBAFF] text-[10px] font-bold">2</div>
            <span>Generar</span>
          </div>
          <div className="h-px w-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3DBAFF]/10 text-[#3DBAFF] text-[10px] font-bold">3</div>
            <span>Confirmar</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ============================================
   ROUTE MAP COMPONENT
   ============================================ */
export function RouteMap({ route, allRoutes = [], selectedRouteId, selectedOrders = [], showOrderMarkers = false }: RouteMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");
  const mapRef = useRef<HTMLDivElement>(null);

  // Fix Leaflet default icon paths for webpack/Next.js bundlers
  useEffect(() => {
    if (typeof window !== "undefined") {
      const L = require("leaflet");
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    }
  }, []);

  // Calculate map center - consider all routes for multi-route view
  const center: [number, number] = useMemo(() => {
    if (route?.stops.length) {
      return route.stops[0].coordinates;
    }
    if (allRoutes.length > 0) {
      return allRoutes[0].stops[0]?.coordinates || [-12.0464, -77.0428];
    }
    if (selectedOrders.length) {
      return selectedOrders[0].pickup.coordinates;
    }
    return [-12.0464, -77.0428];
  }, [route, allRoutes, selectedOrders]);

  // Calculate bounds for all visible points (includes all routes)
  const bounds: [number, number][] = useMemo(() => {
    const points: [number, number][] = [];
    // Include all routes' stops for bounds
    if (allRoutes.length > 0) {
      allRoutes.forEach((r) => r.stops.forEach((s) => points.push(s.coordinates)));
    } else if (route?.stops.length) {
      route.stops.forEach((s) => points.push(s.coordinates));
    } else if (selectedOrders.length) {
      selectedOrders.forEach((o) => {
        points.push(o.pickup.coordinates);
        points.push(o.delivery.coordinates);
      });
    }
    return points;
  }, [route, allRoutes, selectedOrders]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Map tile URLs
  const tileUrls = {
    street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    satellite:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  };

  if (!route && selectedOrders.length === 0) {
    return <EmptyMapState />;
  }

  return (
    <div
      ref={mapRef}
      className={cn(
        "h-full w-full relative",
        isFullscreen && "fixed inset-0 z-50"
      )}
    >
      {/* Map Container */}
      <div style={{ height: "100%", width: "100%" }}>
        <MapContainer
          //@ts-ignore
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer url={tileUrls[mapStyle]} />

          {/* Auto-resize map when container changes */}
          <MapResizeHandler />

          {/* Auto-fit bounds when points change */}
          {bounds.length > 0 && (
            <MapBoundsController bounds={bounds} />
          )}

          {/* Multi-Route Polylines (all routes with their colors, non-selected dimmed) */}
          {allRoutes.length > 0 && allRoutes.map((r) => {
            if (!r.polyline) return null;
            const isSelected = r.id === selectedRouteId;
            const routeColor = r.color || "#3DBAFF";
            return (
              <Fragment key={`polyline-${r.id}`}>
                {/* Shadow */}
                {/* @ts-ignore */}
                <Polyline
                  positions={r.polyline}
                  pathOptions={{
                    //@ts-ignore
                    color: "#000",
                    weight: isSelected ? 8 : 5,
                    opacity: isSelected ? 0.15 : 0.05,
                  }}
                />
                {/* Main line */}
                {/* @ts-ignore */}
                <Polyline
                  positions={r.polyline}
                  pathOptions={{
                    //@ts-ignore
                    color: routeColor,
                    weight: isSelected ? 5 : 3,
                    opacity: isSelected ? 0.9 : 0.4,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              </Fragment>
            );
          })}

          {/* Single Route Polyline (when not in multi-route mode) */}
          {allRoutes.length === 0 && route?.polyline && <AnimatedPath positions={route.polyline} />}

          {/* Stop Markers */}
          {route?.stops.map((stop, index) => {
            // Create custom icon HTML
            const iconHtml = `
              <div class="custom-stop-marker ${stop.type === 'pickup' ? 'pickup' : 'delivery'}">
                <div class="marker-number">${index + 1}</div>
              </div>
            `;

            return (
              <Marker
                key={stop.id}
                position={stop.coordinates}
                //@ts-ignore
                icon={
                  typeof window !== "undefined"
                    ? new (require("leaflet").DivIcon)({
                        html: iconHtml,
                        className: "custom-marker-wrapper",
                        iconSize: [32, 40],
                        iconAnchor: [16, 40],
                        popupAnchor: [0, -40],
                      })
                    : undefined
                }
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold",
                          stop.type === "pickup"
                            ? "bg-green-500"
                            : "bg-[#3DBAFF]"
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="font-semibold text-sm">
                        {stop.type === "pickup" ? "Recolección" : "Entrega"}
                      </div>
                    </div>
                    <div className="text-sm mb-2">
                      <div className="font-medium">{stop.address}</div>
                      <div className="text-muted-foreground">{stop.city}</div>
                    </div>
                    {stop.timeWindow && (
                      <div className="text-xs text-muted-foreground mb-1">
                        <span className="font-medium">Ventana:</span>{" "}
                        {stop.timeWindow.start} - {stop.timeWindow.end}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Duración:</span>{" "}
                      {stop.duration} minutos
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Order Markers (when no route yet) */}
          {!route &&
            showOrderMarkers &&
            selectedOrders.map((order, index) => (
              <Fragment key={order.id}>
                {/* Pickup */}
                <Marker
                  key={`${order.id}-pickup`}
                  position={order.pickup.coordinates}
                  //@ts-ignore
                  icon={
                    typeof window !== "undefined"
                      ? new (require("leaflet").DivIcon)({
                          html: `<div class="custom-stop-marker pickup"><div class="marker-number">${index + 1}</div></div>`,
                          className: "custom-marker-wrapper",
                          iconSize: [32, 40],
                          iconAnchor: [16, 40],
                          popupAnchor: [0, -40],
                        })
                      : undefined
                  }
                >
                  <Popup>
                    <div className="p-2">
                      <div className="font-semibold text-sm mb-1">
                        Origen - {order.orderNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.pickup.address}
                      </div>
                    </div>
                  </Popup>
                </Marker>
                {/* Delivery */}
                <Marker
                  key={`${order.id}-delivery`}
                  position={order.delivery.coordinates}
                  //@ts-ignore
                  icon={
                    typeof window !== "undefined"
                      ? new (require("leaflet").DivIcon)({
                          html: `<div class="custom-stop-marker delivery"><div class="marker-number">${index + 1}</div></div>`,
                          className: "custom-marker-wrapper",
                          iconSize: [32, 40],
                          iconAnchor: [16, 40],
                          popupAnchor: [0, -40],
                        })
                      : undefined
                  }
                >
                  <Popup>
                    <div className="p-2">
                      <div className="font-semibold text-sm mb-1">
                        Destino - {order.orderNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.delivery.address}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </Fragment>
            ))}
        </MapContainer>
      </div>

      {/* Map Controls Overlay */}
      <div className="absolute top-4 left-4 z-[1000] space-y-2">
        {/* Route Info Card */}
        {route && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="p-3 bg-card/95 backdrop-blur-sm shadow-lg border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3DBAFF]/20">
                  <MapPin className="h-4 w-4 text-[#3DBAFF]" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{route.name}</div>
                  <Badge
                    variant={
                      route.status === "confirmed" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {route.status === "draft"
                      ? "Borrador"
                      : route.status === "generated"
                        ? "Generada"
                        : route.status === "confirmed"
                          ? "Confirmada"
                          : "Despachada"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Paradas</div>
                  <div className="font-semibold">{route.stops.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Distancia</div>
                  <div className="font-semibold">
                    {route.metrics.totalDistance} km
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tiempo</div>
                  <div className="font-semibold">
                    {Math.floor(route.metrics.estimatedDuration / 60)}h{" "}
                    {route.metrics.estimatedDuration % 60}m
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Right Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Fullscreen Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-card/95 backdrop-blur-sm shadow-lg h-9 w-9 p-0"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>

        {/* Map Style Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setMapStyle(mapStyle === "street" ? "satellite" : "street")
          }
          className="bg-card/95 backdrop-blur-sm shadow-lg h-9 w-9 p-0"
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      {route && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 right-4 z-[1000]"
        >
          <Card className="p-3 bg-card/95 backdrop-blur-sm shadow-lg border-border/50">
            <div className="text-xs font-semibold mb-2">Leyenda</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-[10px] font-bold">
                  1
                </div>
                <span>Recolección</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3DBAFF] text-white text-[10px] font-bold">
                  2
                </div>
                <span>Entrega</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-1 w-8 rounded-full bg-[#3DBAFF]" />
                <span>Ruta</span>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Custom Marker Styles */}
      <style jsx global>{`
        .custom-marker-wrapper {
          background: transparent !important;
          border: none !important;
        }

        .custom-stop-marker {
          position: relative;
          width: 32px;
          height: 40px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }

        .custom-stop-marker::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: translateX(-50%) rotate(-45deg);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .custom-stop-marker.pickup::before {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }

        .custom-stop-marker.delivery::before {
          background: linear-gradient(135deg, #3dbaff, #0ea5e9);
        }

        .custom-stop-marker .marker-number {
          position: relative;
          z-index: 1;
          color: white;
          font-size: 12px;
          font-weight: 700;
          margin-top: 5px;
        }
      `}</style>
    </div>
  );
}
