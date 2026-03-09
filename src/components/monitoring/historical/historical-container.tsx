"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { History, PanelLeftClose, PanelLeft, Gauge, Filter as FilterIcon, Download, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHistoricalRoute } from "@/hooks/monitoring/use-historical-route";
import { useRoutePlayback } from "@/hooks/monitoring/use-route-playback";
import { SearchForm } from "./search-form";
import { RouteStatsPanel } from "./route-stats-panel";
import { TripSegmentsPanel } from "./trip-segments-panel";
import { PlaybackControls } from "./playback-controls";
import { ExportButton } from "./export-button";
import { SpeedChart } from "./speed-chart";
import { EventFilterPanel } from "./event-filter-panel";
import { StopsHeatMap } from "./stops-heat-map";
import { RoutePdfReport } from "./route-pdf-report";
import { MapSkeleton } from "../common/skeletons/map-skeleton";
import type { HistoricalRouteParams, RouteExportFormat, HistoricalRoutePoint, TripSegment, RouteEventFilter } from "@/types/monitoring";

// Dynamic import del mapa
const HistoricalMap = dynamic(
  () => import("./historical-map").then((mod) => mod.HistoricalMap),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);

interface HistoricalContainerProps {
  /** Clase adicional */
  className?: string;
}

/**
 * Contenedor principal del módulo de Rastreo Histórico
 */
export function HistoricalContainer({
  className,
}: HistoricalContainerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"search" | "analysis">("search");
  
  const [vehicles, setVehicles] = useState<Array<{ id: string; plate: string }>>([]);
  
  // Punto actual para reproducción
  const [currentPlaybackPoint, setCurrentPlaybackPoint] = useState<HistoricalRoutePoint | null>(null);

  // Filtros de eventos para análisis
  const [eventFilters, setEventFilters] = useState<RouteEventFilter>({
    showStops: true,
    showSpeedAlerts: true,
    showGeofenceEvents: false,
    showIgnitionEvents: false,
    speedThreshold: 80,
  });

  const {
    route,
    stats,
    isLoading,
    error,
    loadRoute,
    exportRoute,
    getAvailableVehicles,
  } = useHistoricalRoute();

  const playback = useRoutePlayback({
    points: route?.points || [],
    onPointChange: (point, _index) => {
      setCurrentPlaybackPoint(point);
    },
  });

  // Cargar vehículos disponibles
  useEffect(() => {
    getAvailableVehicles().then(setVehicles);
  }, [getAvailableVehicles]);

  /**
   * Busca una ruta histórica
   */
  const handleSearch = useCallback(async (params: HistoricalRouteParams) => {
    // Detener reproducción actual
    playback.stop();
    setCurrentPlaybackPoint(null);

    await loadRoute(params);
  }, [loadRoute, playback]);

  /**
   * Exporta la ruta usando el hook
   */
  const handleExport = useCallback(async (format: RouteExportFormat) => {
    if (!route) return;
    await exportRoute(format);
  }, [route, exportRoute]);

  /**
   * Maneja selección de segmento de viaje (navega al punto del segmento)
   */
  const handleSegmentSelect = useCallback((segment: TripSegment) => {
    if (!route) return;
    playback.seekTo(segment.startPointIndex);
    const point = route.points[segment.startPointIndex];
    if (point) {
      setCurrentPlaybackPoint(point);
    }
  }, [route, playback]);

  return (
    <div className={cn("flex h-full w-full", className)}>
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r bg-background transition-all duration-300",
          sidebarOpen ? "w-80" : "w-0 overflow-hidden"
        )}
      >
        {/* Header del sidebar */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <h2 className="font-semibold">Rastreo Histórico</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Contenido */}
        <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as "search" | "analysis")} className="flex-1 flex flex-col min-h-0">
          {route && (
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-3 mb-2" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger value="search" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Búsqueda
              </TabsTrigger>
              <TabsTrigger value="analysis" className="gap-1.5 text-xs">
                <Gauge className="h-3.5 w-3.5" />
                Análisis
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="search" className="flex-1 m-0 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-6 p-4">
              {/* Formulario de búsqueda */}
              <SearchForm
                onSearch={handleSearch}
                vehicles={vehicles}
                isLoading={isLoading}
              />

              {/* Resultados */}
              {route && (
                <>
                  <Separator />

                  {/* Estadísticas */}
                  {stats && (
                    <RouteStatsPanel stats={stats} />
                  )}

                  <Separator />

                  {/* Segmentación de viaje */}
                  <TripSegmentsPanel
                    points={route.points}
                    onSegmentSelect={handleSegmentSelect}
                  />

                </>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="font-medium">Error al cargar la ruta</p>
                  <p>{error.message}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab de análisis detallado */}
          <TabsContent value="analysis" className="flex-1 m-0 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {route && (
              <div className="space-y-4 p-4">
                {/* Gráfico de velocidad */}
                <SpeedChart
                  points={route.points}
                  speedLimit={80}
                  currentIndex={playback.currentIndex}
                />

                {/* Paradas detectadas */}
                <StopsHeatMap points={route.points} />

                {/* Filtros de eventos */}
                <EventFilterPanel
                  filters={eventFilters}
                  onFiltersChange={setEventFilters}
                />

                <Separator />

                {/* Exportar - sección integrada */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Exportar ruta</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {route.points.length} puntos
                    </span>
                    <span>·</span>
                    <span>{stats?.totalDistanceKm.toFixed(1)} km</span>
                    <span>·</span>
                    <span>{stats ? Math.round(stats.totalTimeSeconds / 60) : 0} min</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ExportButton
                      route={route}
                      onExport={handleExport}
                      className="w-full"
                    />
                    <RoutePdfReport
                      vehiclePlate={route.vehiclePlate || "—"}
                      date={route.startDate || new Date().toLocaleDateString("es-PE")}
                      points={route.points}
                      distanceKm={stats?.totalDistanceKm ?? 0}
                      durationMin={(stats?.totalTimeSeconds ?? 0) / 60}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Área del mapa */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Botón para abrir sidebar */}
        {!sidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-4 z-1000 shadow-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Mapa */}
        {route ? (
          <HistoricalMap
            route={route}
            currentPoint={currentPlaybackPoint}
            currentIndex={playback.currentIndex}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-muted/30">
            <History className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium text-muted-foreground">
              Selecciona un vehículo y rango de fechas
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              La ruta aparecerá aquí
            </p>
          </div>
        )}

        {/* Controles de reproducción (sobre el mapa) */}
        {route && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-1000">
            <PlaybackControls
              state={{
                playbackState: playback.playbackState,
                isPlaying: playback.isPlaying,
                isPaused: playback.isPaused,
                currentIndex: playback.currentIndex,
                currentPoint: playback.currentPoint,
                speed: playback.speed,
                progress: playback.progress,
                currentTime: playback.currentTime,
                totalPoints: playback.totalPoints,
              }}
              actions={{
                play: playback.play,
                pause: playback.pause,
                stop: playback.stop,
                reset: playback.reset,
                setSpeed: playback.setSpeed,
                seekTo: playback.seekTo,
                seekToProgress: playback.seekToProgress,
                stepForward: playback.stepForward,
                stepBackward: playback.stepBackward,
              }}
              compact
            />
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-999 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Cargando ruta histórica...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
