"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { 
  PanelLeftClose, 
  PanelLeft, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Filter,
  List,
  Bell,
  LayoutDashboard,
  Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVehicleTracking } from "@/hooks/monitoring/use-vehicle-tracking";
import { useTrackedOrder } from "@/hooks/monitoring/use-tracked-order";
import { useMonitoringAlerts } from "@/hooks/monitoring/use-monitoring-alerts";
import { ControlTowerFilters } from "./control-tower-filters";
import { VehicleInfoCard } from "./vehicle-info-card";
import { VehicleListSidebar } from "./vehicle-list-sidebar";
import { AlertPanel } from "./alert-panel";
import { AlertRulesConfig } from "./alert-rules-config";
import { MonitoringDashboard } from "./monitoring-dashboard";
import { MapSkeleton } from "../common/skeletons/map-skeleton";
import { getAllActiveRoutes } from "@/mocks/monitoring/vehicle-positions.mock";
import type { TrackedVehicle } from "@/types/monitoring";

// Dynamic import del mapa para evitar SSR
const ControlTowerMap = dynamic(
  () => import("./control-tower-map").then((mod) => mod.ControlTowerMap),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);

interface ControlTowerContainerProps {
  /** Clase adicional */
  className?: string;
}

/**
 * Contenedor principal del módulo Torre de Control
 */
export function ControlTowerContainer({
  className,
}: ControlTowerContainerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"vehicles" | "filters" | "alerts" | "config">("vehicles");
  const [carriers, setCarriers] = useState<string[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const {
    vehiclesList,
    isConnected,
    isLoading,
    error,
    selectedVehicle,
    filters,
    selectVehicle,
    setFilters,
    refresh,
    centerOnVehicle,
    getCarriers,
  } = useVehicleTracking({
    autoConnect: true,
  });

  const { order, isLoading: _isLoadingOrder } = useTrackedOrder(selectedVehicle?.id);

  // Hook de alertas de monitoreo
  const {
    alerts,
    rules,
    activeCount,
    criticalCount,
    acknowledge: acknowledgeAlert,
    resolve: resolveAlert,
    addRule,
    toggleRule,
    deleteRule,
  } = useMonitoringAlerts({ vehicles: vehiclesList });

  // Obtener rutas de todos los vehículos con órdenes activas
  const allVehicleRoutes = useMemo(() => {
    if (vehiclesList.length === 0) return undefined;
    return getAllActiveRoutes();
  }, [vehiclesList]);

  // Cargar lista de transportistas
  useEffect(() => {
    getCarriers().then(setCarriers);
  }, [getCarriers]);

  /**
   * Maneja selección de vehículo en el mapa
   */
  const handleVehicleSelect = useCallback((vehicle: TrackedVehicle | null) => {
    selectVehicle(vehicle?.id ?? null);
  }, [selectVehicle]);

  /**
   * Cierra el panel de info
   */
  const handleCloseInfo = useCallback(() => {
    selectVehicle(null);
  }, [selectVehicle]);

  /**
   * Centra el mapa en el vehículo seleccionado
   */
  const handleCenterMap = useCallback(() => {
    if (selectedVehicle) {
      centerOnVehicle(selectedVehicle.id);
    }
  }, [selectedVehicle, centerOnVehicle]);

  return (
    <div className={cn("flex h-full w-full", className)}>
      {/* Overlay mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar con tabs */}
      <div
        className={cn(
          "flex flex-col border-r bg-background transition-all duration-300",
          isMobile
            ? cn(
                'fixed inset-y-0 left-0 z-50 w-[85vw] max-w-80 shadow-xl',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              )
            : sidebarOpen ? "w-80" : "w-0 overflow-hidden"
        )}
      >
        {/* Header del sidebar */}
        <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
          <h2 className="font-semibold">Torre de Control</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs: Vehículos / Filtros / Alertas / Config */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "vehicles" | "filters" | "alerts" | "config")} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 mx-2 sm:mx-4 mt-3 mb-2 overflow-visible" style={{ width: 'calc(100% - 1rem)' }}>
            <TabsTrigger value="vehicles" className="gap-1 sm:gap-1.5 text-xs">
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Vehículos</span>
            </TabsTrigger>
            <TabsTrigger value="filters" className="gap-1 sm:gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filtros</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1 sm:gap-1.5 text-xs relative">
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Alertas</span>
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center px-1">
                  {activeCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1 sm:gap-1.5 text-xs">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Lista de vehículos */}
          <TabsContent value="vehicles" className="flex-1 m-0 min-h-0">
            <VehicleListSidebar
              vehicles={vehiclesList}
              selectedVehicleId={selectedVehicle?.id}
              onVehicleSelect={handleVehicleSelect}
              className="h-full"
            />
          </TabsContent>

          {/* Filtros */}
          <TabsContent value="filters" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full p-4">
              <ControlTowerFilters
                filters={filters}
                onFiltersChange={setFilters}
                carriers={carriers}
              />
            </ScrollArea>
          </TabsContent>

          {/* Alertas */}
          <TabsContent value="alerts" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full">
              <AlertPanel
                alerts={alerts}
                onAcknowledge={acknowledgeAlert}
                onResolve={resolveAlert}
                onCenterOnVehicle={(vehicleId: string) => {
                  const vehicle = vehiclesList.find((v) => v.id === vehicleId);
                  if (vehicle) {
                    selectVehicle(vehicle.id);
                    centerOnVehicle(vehicle.id);
                  }
                }}
              />
            </ScrollArea>
          </TabsContent>

          {/* Configuración de alertas */}
          <TabsContent value="config" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full">
              <AlertRulesConfig
                rules={rules}
                onAddRule={addRule}
                onToggleRule={toggleRule}
                onDeleteRule={deleteRule}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Estado de conexión */}
        <div className="border-t p-4 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  Conectado en tiempo real
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-red-600 dark:text-red-400">
                  Desconectado
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Área principal del mapa */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Botón para abrir sidebar */}
        {!sidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-4 z-[1000] shadow-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Botón de refresh */}
        <Button
          variant="outline"
          size="sm"
          className="absolute left-4 top-16 z-[1000] shadow-lg"
          onClick={refresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Actualizar
        </Button>

        {/* Toggle KPI Dashboard */}
        <Button
          variant={showDashboard ? "default" : "outline"}
          size="sm"
          className="absolute left-4 top-28 z-[1000] shadow-lg"
          onClick={() => setShowDashboard(!showDashboard)}
        >
          <LayoutDashboard className="h-4 w-4 mr-2" />
          KPIs
        </Button>

        {/* KPI Dashboard panel */}
        {showDashboard && (
          <div className="absolute left-4 right-4 top-40 z-[1000]">
            <MonitoringDashboard
              vehicles={vehiclesList}
              alerts={alerts}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute left-4 right-4 top-28 z-[1000] rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive shadow-lg">
            <p className="font-medium">Error de conexión</p>
            <p>{error.message}</p>
          </div>
        )}

        {/* Mapa */}
        <ControlTowerMap
          vehicles={vehiclesList}
          selectedVehicleId={selectedVehicle?.id}
          onVehicleSelect={handleVehicleSelect}
          allVehicleRoutes={allVehicleRoutes}
        />

        {/* Panel de información del vehículo seleccionado */}
        {selectedVehicle && (
          <div className="absolute right-2 sm:right-4 top-2 sm:top-4 z-[1000] w-[calc(100%-1rem)] sm:w-80">
            <VehicleInfoCard
              vehicle={selectedVehicle}
              order={order}
              onClose={handleCloseInfo}
              onCenterMap={handleCenterMap}
            />
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && vehiclesList.length === 0 && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Cargando vehículos...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
