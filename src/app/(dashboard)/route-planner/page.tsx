"use client";

/* ============================================
   PAGE: Route Planner (Multi-Route Optimization)
   Transportation Management System
   Flow: select → configure → results → assign
   ============================================ */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TransportOrder, RouteStop } from "@/types/route-planner";
import {
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Settings2,
  Truck,
  User,
  Clock,
  MapPin,
  Route,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoutePlannerProvider, useRoutePlanner } from "@/contexts/route-planner-context";
import { OrderList } from "@/components/route-planner/order-list";
import { RouteMap } from "@/components/route-planner/route-map-enhanced";
import { KpiCards } from "@/components/route-planner/kpi-cards";
import { VehicleSelector } from "@/components/route-planner/vehicle-selector";
import { DriverSelector } from "@/components/route-planner/driver-selector";
import { RouteActionsEnhanced } from "@/components/route-planner/route-actions-enhanced";
import { StopSequenceEnhanced } from "@/components/route-planner/stop-sequence-enhanced";
import { RouteAlerts, ManualRouteCreator } from "@/components/route-planner";
import { mockVehicles, mockDrivers, ROUTE_COLORS } from "@/lib/mock-data/route-planner";
import { useRoutePlannerOrders } from "@/hooks/useRoutePlannerOrders";
import { cn } from "@/lib/utils";

/* ============================================
   STEP INDICATOR
   ============================================ */
const STEPS = [
  { key: "select" as const, label: "Puntos de Entrega", icon: MapPin },
  { key: "configure" as const, label: "Configurar", icon: Settings2 },
  { key: "results" as const, label: "Rutas Generadas", icon: Route },
  { key: "assign" as const, label: "Asignar y Confirmar", icon: CheckCircle2 },
] as const;

function StepIndicator() {
  const { plannerStep, setPlannerStep, selectedOrders, generatedRoutes } = useRoutePlanner();
  const currentIndex = STEPS.findIndex((s) => s.key === plannerStep);

  return (
    <div className="flex items-center gap-1 px-4 py-3 border-b border-border bg-card overflow-x-auto">
      {STEPS.map((step, index) => {
        const isActive = step.key === plannerStep;
        const isPast = index < currentIndex;
        const canNavigate =
          (step.key === "select") ||
          (step.key === "configure" && selectedOrders.length > 0) ||
          (step.key === "results" && generatedRoutes.length > 0) ||
          (step.key === "assign" && generatedRoutes.length > 0);

        return (
          <div key={step.key} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  "w-6 md:w-10 h-0.5 mx-1",
                  isPast ? "bg-[#3DBAFF]" : "bg-border"
                )}
              />
            )}
            <button
              onClick={() => canNavigate && setPlannerStep(step.key)}
              disabled={!canNavigate}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-[#3DBAFF] text-white shadow-md"
                  : isPast
                    ? "bg-[#3DBAFF]/10 text-[#3DBAFF] hover:bg-[#3DBAFF]/20"
                    : "text-muted-foreground hover:text-foreground",
                !canNavigate && "opacity-50 cursor-not-allowed"
              )}
            >
              <step.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{index + 1}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================
   OPTIMIZATION CONFIG PANEL
   ============================================ */
function OptimizationConfigPanel() {
  const {
    optimizationParams,
    updateOptimizationParams,
    configuration,
    updateConfiguration,
    selectedOrders,
    generateOptimizedRoutes,
    isOptimizing,
    setPlannerStep,
  } = useRoutePlanner();
  const [truckCountInput, setTruckCountInput] = useState(String(optimizationParams.truckCount));
  const [stopDurationInput, setStopDurationInput] = useState(String(optimizationParams.stopDuration));

  const handleGenerate = async () => {
    await generateOptimizedRoutes();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-border p-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-[#3DBAFF]" />
          Parámetros de Optimización
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedOrders.length} puntos de entrega seleccionados
        </p>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6">
          {/* Time Window */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Ventana Horaria
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Inicio</label>
                <Input
                  type="time"
                  value={optimizationParams.timeWindowStart}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    updateOptimizationParams({ timeWindowStart: newStart });
                    // Auto-fix: if start >= end, push end 1 hour later
                    if (newStart >= optimizationParams.timeWindowEnd) {
                      const [h] = newStart.split(':').map(Number);
                      const endH = Math.min(h + 1, 23);
                      updateOptimizationParams({ timeWindowEnd: `${String(endH).padStart(2, '0')}:00` });
                    }
                  }}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fin</label>
                <Input
                  type="time"
                  value={optimizationParams.timeWindowEnd}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    // Only allow end > start
                    if (newEnd > optimizationParams.timeWindowStart) {
                      updateOptimizationParams({ timeWindowEnd: newEnd });
                    }
                  }}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Truck Count */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Camiones Disponibles
            </label>
            <Input
              type="number"
              min={1}
              max={Math.max(selectedOrders.length, 1)}
              value={truckCountInput}
              onChange={(e) => {
                setTruckCountInput(e.target.value);
                const parsed = parseInt(e.target.value);
                if (!isNaN(parsed) && parsed >= 1) {
                  updateOptimizationParams({ truckCount: Math.min(parsed, Math.max(selectedOrders.length, 1)) });
                }
              }}
              onBlur={() => {
                const parsed = parseInt(truckCountInput);
                if (isNaN(parsed) || parsed < 1) {
                  setTruckCountInput(String(optimizationParams.truckCount));
                } else {
                  const clamped = Math.min(parsed, Math.max(selectedOrders.length, 1));
                  setTruckCountInput(String(clamped));
                  updateOptimizationParams({ truckCount: clamped });
                }
              }}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Máximo {selectedOrders.length} rutas (1 por punto)
            </p>
          </div>

          {/* Stop Duration */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Tiempo por Parada (minutos)
            </label>
            <Input
              type="number"
              min={5}
              max={120}
              value={stopDurationInput}
              onChange={(e) => {
                setStopDurationInput(e.target.value);
                const parsed = parseInt(e.target.value);
                if (!isNaN(parsed) && parsed >= 5) {
                  updateOptimizationParams({ stopDuration: Math.min(parsed, 120) });
                }
              }}
              onBlur={() => {
                const parsed = parseInt(stopDurationInput);
                if (isNaN(parsed) || parsed < 5) {
                  setStopDurationInput(String(optimizationParams.stopDuration));
                } else {
                  const clamped = Math.min(parsed, 120);
                  setStopDurationInput(String(clamped));
                  updateOptimizationParams({ stopDuration: clamped });
                }
              }}
              className="h-9"
            />
          </div>

          {/* Priority */}
          <div className="space-y-3">
            <label className="text-sm font-semibold">Priorizar</label>
            <div className="grid grid-cols-3 gap-2">
              {(["speed", "balanced", "cost"] as const).map((priority) => (
                <Button
                  key={priority}
                  variant={configuration.priority === priority ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfiguration({ priority })}
                  className={cn(
                    "text-xs",
                    configuration.priority === priority && "bg-[#3DBAFF] hover:bg-[#3DBAFF]/90"
                  )}
                >
                  {priority === "speed"
                    ? "⚡ Rapidez"
                    : priority === "balanced"
                      ? "⚖️ Balance"
                      : "💰 Costo"}
                </Button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Evitar peajes</span>
              <button
                onClick={() => updateConfiguration({ avoidTolls: !configuration.avoidTolls })}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  configuration.avoidTolls ? "bg-[#3DBAFF]" : "bg-muted"
                )}
              >
                <motion.span
                  layout
                  className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
                  animate={{ x: configuration.avoidTolls ? 24 : 4 }}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tráfico en tiempo real</span>
              <button
                onClick={() =>
                  updateConfiguration({ considerTraffic: !configuration.considerTraffic })
                }
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  configuration.considerTraffic ? "bg-[#3DBAFF]" : "bg-muted"
                )}
              >
                <motion.span
                  layout
                  className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
                  animate={{ x: configuration.considerTraffic ? 24 : 4 }}
                />
              </button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex-shrink-0 border-t border-border p-4 space-y-2">
        <Button
          onClick={handleGenerate}
          disabled={selectedOrders.length === 0 || isOptimizing}
          className="w-full gap-2 bg-gradient-to-r from-[#3DBAFF] to-blue-600 hover:from-[#3DBAFF]/90 hover:to-blue-600/90"
          size="lg"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Optimizando {selectedOrders.length} puntos...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generar {optimizationParams.truckCount} Rutas Optimizadas
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPlannerStep("select")}
          className="w-full gap-1 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a selección
        </Button>
      </div>
    </div>
  );
}

/* ============================================
   ROUTE RESULTS LIST
   ============================================ */
function RouteResultsList() {
  const {
    generatedRoutes,
    selectedRouteId,
    setSelectedRouteId,
    routeAssignments,
    setPlannerStep,
  } = useRoutePlanner();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-border p-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Route className="h-5 w-5 text-[#3DBAFF]" />
          Rutas Generadas
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {generatedRoutes.length} rutas optimizadas
        </p>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {generatedRoutes.map((route, index) => {
            const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
            const isSelected = selectedRouteId === route.id;
            const assignment = routeAssignments.find((a) => a.routeId === route.id);

            return (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    "p-3 cursor-pointer transition-all hover:shadow-md",
                    isSelected
                      ? "ring-2 shadow-md"
                      : "hover:border-foreground/20"
                  )}
                  style={{
                    borderColor: isSelected ? color : undefined,
                  }}
                  onClick={() => setSelectedRouteId(route.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{route.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{route.stops.length} paradas</span>
                        <span>•</span>
                        <span>{route.metrics.totalDistance} km</span>
                        <span>•</span>
                        <span>
                          {Math.floor(route.metrics.estimatedDuration / 60)}h{" "}
                          {route.metrics.estimatedDuration % 60}m
                        </span>
                      </div>
                    </div>
                    {assignment?.vehicle && assignment?.driver ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Sin asignar
                      </Badge>
                    )}
                  </div>

                  {/* Assignment info */}
                  {(assignment?.vehicle || assignment?.driver) && (
                    <div className="mt-2 pt-2 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
                      {assignment?.vehicle && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {assignment.vehicle.plate}
                        </span>
                      )}
                      {assignment?.driver && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {assignment.driver.firstName} {assignment.driver.lastName}
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex-shrink-0 border-t border-border p-4 space-y-2">
        <Button
          onClick={() => setPlannerStep("assign")}
          className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-600"
          size="lg"
        >
          <Truck className="h-5 w-5" />
          Asignar Camiones y Conductores
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPlannerStep("configure")}
          className="w-full gap-1 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Reconfigurar
        </Button>
      </div>
    </div>
  );
}

/* ============================================
   ROUTE ASSIGNMENT PANEL
   ============================================ */
function RouteAssignmentPanel() {
  const {
    generatedRoutes,
    routeAssignments,
    selectedRouteId,
    setSelectedRouteId,
    assignVehicleToRoute,
    assignDriverToRoute,
    unassignVehicleFromRoute,
    unassignDriverFromRoute,
    confirmAllRoutes,
    allRoutesAssigned,
    setPlannerStep,
    resetAll,
  } = useRoutePlanner();

  const [activeTab, setActiveTab] = useState("vehicle");
  const [isConfirming, setIsConfirming] = useState(false);
  const isAllConfirmed = generatedRoutes.every((r) => r.status === "confirmed");

  const selectedRoute = generatedRoutes.find((r) => r.id === selectedRouteId);
  const currentAssignment = routeAssignments.find((a) => a.routeId === selectedRouteId);

  const handleConfirmAll = async () => {
    setIsConfirming(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    confirmAllRoutes();
    setIsConfirming(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-border p-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Asignar Recursos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {routeAssignments.filter((a) => a.vehicle && a.driver).length}/
          {generatedRoutes.length} rutas asignadas
        </p>
      </div>

      {/* Route selector tabs */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2.5">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {generatedRoutes.map((route, index) => {
            const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
            const assignment = routeAssignments.find((a) => a.routeId === route.id);
            const isComplete = assignment?.vehicle && assignment?.driver;

            return (
              <button
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border whitespace-nowrap min-h-[36px]",
                  selectedRouteId === route.id
                    ? "border-current shadow-sm bg-accent/50"
                    : "border-transparent hover:bg-muted"
                )}
                style={{
                  color: selectedRouteId === route.id ? color : undefined,
                }}
              >
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {index + 1}
                </div>
                <span>Ruta {index + 1}</span>
                {isComplete && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vehicle/Driver selector for selected route */}
      {selectedRoute && (
        <>
          {/* Route summary */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-muted/30">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Paradas</div>
                <div className="font-semibold text-sm">{selectedRoute.stops.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Distancia</div>
                <div className="font-semibold text-sm">{selectedRoute.metrics.totalDistance} km</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Peso</div>
                <div className="font-semibold text-sm">{selectedRoute.metrics.totalWeight} kg</div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-shrink-0 px-4 pt-2">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="vehicle" className="gap-2">
                  <Truck className="h-4 w-4" />
                  Vehículo
                  {currentAssignment?.vehicle && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger value="driver" className="gap-2">
                  <User className="h-4 w-4" />
                  Conductor
                  {currentAssignment?.driver && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <TabsContent value="vehicle" className="p-4 mt-0">
                <VehicleSelector
                  vehicles={mockVehicles}
                  onSelect={(vehicle) => {
                    if (!selectedRouteId) return;
                    if (vehicle) {
                      assignVehicleToRoute(selectedRouteId, vehicle);
                    } else {
                      unassignVehicleFromRoute(selectedRouteId);
                    }
                  }}
                  selectedVehicleId={currentAssignment?.vehicle?.id}
                  routeWeight={selectedRoute?.metrics.totalWeight}
                  routeVolume={selectedRoute?.metrics.totalVolume}
                />
              </TabsContent>
              <TabsContent value="driver" className="p-4 mt-0">
                <DriverSelector
                  drivers={mockDrivers}
                  onSelect={(driver) => {
                    if (!selectedRouteId) return;
                    if (driver) {
                      assignDriverToRoute(selectedRouteId, driver);
                    } else {
                      unassignDriverFromRoute(selectedRouteId);
                    }
                  }}
                  selectedDriverId={currentAssignment?.driver?.id}
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </>
      )}

      {/* Actions */}
      <div className="flex-shrink-0 border-t border-border p-4 space-y-2">
        {!isAllConfirmed ? (
          <Button
            onClick={handleConfirmAll}
            disabled={!allRoutesAssigned || isConfirming}
            className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-600"
            size="lg"
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Confirmar y Generar Órdenes ({generatedRoutes.length})
              </>
            )}
          </Button>
        ) : (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">{generatedRoutes.length} órdenes generadas</span>
            </div>
            <Button onClick={resetAll} variant="outline" className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              Nueva Planificación
            </Button>
          </div>
        )}
        {!isAllConfirmed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPlannerStep("results")}
            className="w-full gap-1 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a rutas
          </Button>
        )}
      </div>
    </div>
  );
}

/* ============================================
   ROUTE PLANNER CONTENT (multi-step)
   ============================================ */
function RoutePlannerContent() {
  const {
    plannerStep,
    setPlannerStep,
    currentRoute,
    reorderStops,
    selectedOrders,
    configuration,
    updateConfiguration,
    generatedRoutes,
    selectedRouteId,
    setSelectedRouteId,
    resetAll,
    addOrder,
  } = useRoutePlanner();

  // Órdenes reales del módulo Orders (con fallback a mock data)
  const { orders: plannerOrders, isLoading: ordersLoading, usingFallback } = useRoutePlannerOrders();
  
  // Órdenes importadas desde archivo Excel
  const [importedOrders, setImportedOrders] = useState<TransportOrder[]>([]);

  // Estado para el modal de creación manual
  const [showManualCreator, setShowManualCreator] = useState(false);

  // Combinar órdenes del sistema con las importadas
  const allOrders = useMemo(() => {
    return [...plannerOrders, ...importedOrders];
  }, [plannerOrders, importedOrders]);

  // Handler para importar órdenes desde archivo
  const handleImportOrders = useCallback((orders: TransportOrder[]) => {
    setImportedOrders((prev) => [...prev, ...orders]);
  }, []);

  // Handler para limpiar órdenes importadas
  const handleClearImportedOrders = useCallback(() => {
    setImportedOrders([]);
  }, []);

  // Handler para crear ruta manual
  const handleSaveManualRoute = useCallback((stops: RouteStop[]) => {
    if (stops.length === 0) return;

    // Convertir las paradas en una orden temporal
    const manualOrder: TransportOrder = {
      id: `manual-route-${Date.now()}`,
      orderNumber: `MAN-${Date.now().toString().slice(-6)}`,
      client: {
        name: "Ruta Manual",
        phone: "-",
      },
      pickup: {
        address: stops[0].address,
        city: stops[0].city,
        coordinates: stops[0].coordinates,
      },
      delivery: {
        address: stops[stops.length - 1].address,
        city: stops[stops.length - 1].city,
        coordinates: stops[stops.length - 1].coordinates,
      },
      cargo: {
        weight: 0,
        volume: 0,
        description: "Ruta creada manualmente",
      },
      status: "pending",
      priority: "medium",
      requestedDate: new Date().toISOString(),
      zone: "Manual",
    };

    // Agregar la orden a las importadas
    setImportedOrders((prev) => [...prev, manualOrder]);
    
    // Agregar automáticamente al planner
    addOrder(manualOrder);
    
    setShowManualCreator(false);
  }, [addOrder]);

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [showStopSequence, setShowStopSequence] = useState(false);

  // Determine which route to show on map
  const selectedGenRoute = generatedRoutes.find((r) => r.id === selectedRouteId) || null;
  const mapRoute =
    plannerStep === "results" || plannerStep === "assign"
      ? selectedGenRoute
      : currentRoute;

  // Show left panel only on select step
  const showLeftPanel = plannerStep === "select";
  // Show right panel on configure, results, and assign steps
  const showRightPanel = plannerStep !== "select" || selectedOrders.length > 0;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      {/* Step Indicator */}
      <StepIndicator />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ============================================
            LEFT PANEL: Orders (select step only)
            ============================================ */}
        <motion.div
          initial={false}
          animate={{
            width: showLeftPanel && !leftPanelCollapsed ? "340px" : "0px",
            minWidth: showLeftPanel && !leftPanelCollapsed ? "340px" : "0px",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="overflow-hidden border-r border-border bg-card"
          style={{ flexShrink: 0 }}
        >
          <div className="w-[340px] h-full">
            {usingFallback && (
              <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs text-center">
                Usando datos de ejemplo — crea órdenes en el módulo Órdenes
              </div>
            )}
            <OrderList 
              orders={allOrders} 
              onImportOrders={handleImportOrders}
              onClearImported={handleClearImportedOrders}
              importedCount={importedOrders.length}
              onCreateManual={() => setShowManualCreator(true)}
            />
          </div>
        </motion.div>

        {/* Left Collapse Button */}
        {showLeftPanel && (
          <div
            className="absolute z-[1010]"
            style={{
              top: "calc(50% - 18px)",
              left: leftPanelCollapsed ? "8px" : "324px",
              transition: "left 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <button
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="flex h-9 w-9 items-center justify-center rounded-full shadow-lg bg-[#3DBAFF] hover:bg-[#3DBAFF]/90 border-2 border-white dark:border-gray-800 transition-transform hover:scale-110 active:scale-95"
            >
              {leftPanelCollapsed ? (
                <ChevronRight className="h-4 w-4 text-white" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        )}

        {/* ============================================
            CENTER CONTENT: Map & KPIs
            ============================================ */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Map Area */}
          <div className="flex-1 relative min-h-0">
            <RouteMap
              route={mapRoute}
              allRoutes={(plannerStep === "results" || plannerStep === "assign") ? generatedRoutes : []}
              selectedRouteId={selectedRouteId}
              selectedOrders={selectedOrders}
              onStopReorder={reorderStops}
              showOrderMarkers={plannerStep === "select" || plannerStep === "configure"}
            />

            {/* Multi-route colors legend (on results/assign steps) */}
            {(plannerStep === "results" || plannerStep === "assign") && generatedRoutes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-4 left-4 z-[999] bg-card/95 backdrop-blur-sm rounded-lg border border-border shadow-lg p-3"
              >
                <div className="text-xs font-semibold mb-2">Rutas ({generatedRoutes.length})</div>
                <div className="space-y-1.5">
                  {generatedRoutes.map((route, index) => {
                    const color = route.color || ROUTE_COLORS[index % ROUTE_COLORS.length];
                    const isSelected = selectedRouteId === route.id;
                    return (
                      <div
                        key={route.id}
                        onClick={() => setSelectedRouteId(route.id)}
                        className={cn(
                          "flex items-center gap-2 text-xs w-full rounded px-1.5 py-0.5 transition-colors cursor-pointer",
                          isSelected ? "bg-muted font-medium" : "hover:bg-muted/50"
                        )}
                      >
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span>{route.name}</span>
                        <span className="text-muted-foreground ml-auto">{route.stops.length} ·</span>
                        <span className="text-muted-foreground">{route.metrics.totalDistance} km</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Stop Sequence Toggle Button (only when current route is visible) */}
            {mapRoute && mapRoute.stops.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 right-16 z-[1000]"
              >
                <Button
                  variant={showStopSequence ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowStopSequence(!showStopSequence)}
                  className={cn(
                    "gap-2 shadow-lg",
                    !showStopSequence && "bg-card/95 backdrop-blur-sm"
                  )}
                >
                  <ListOrdered className="h-4 w-4" />
                  {showStopSequence ? "Ocultar" : "Secuencia"}
                </Button>
              </motion.div>
            )}

            {/* Stop Sequence Overlay Panel */}
            <AnimatePresence>
              {showStopSequence && mapRoute && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute top-16 right-4 bottom-4 w-96 z-[1000]"
                >
                  <Card className="h-full bg-card/95 backdrop-blur-xl border-border shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-border bg-gradient-to-r from-[#3DBAFF]/10 to-transparent">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Secuencia de Paradas</h3>
                          <p className="text-xs text-muted-foreground">
                            {mapRoute.name} — {mapRoute.stops.length} paradas
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {mapRoute.stops.length} paradas
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4 h-[calc(100%-80px)] overflow-auto">
                      <StopSequenceEnhanced
                        stops={mapRoute.stops}
                        onReorder={reorderStops}
                      />
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ============================================
              BOTTOM: KPIs & Alerts
              ============================================ */}
          <motion.div
            layout
            className="border-t border-border bg-card/50 backdrop-blur-sm"
          >
            {mapRoute?.alerts && mapRoute.alerts.length > 0 && (
              <div className="px-4 pt-4">
                <RouteAlerts alerts={mapRoute.alerts} />
              </div>
            )}
            <KpiCards route={mapRoute} />
          </motion.div>

          {/* ============================================
              ACTIONS BAR (select step)
              ============================================ */}
          {plannerStep === "select" && (
            <div className="border-t border-border bg-card px-6 py-3">
              <div className="flex items-center gap-3">
                {selectedOrders.length > 0 && (
                  <Button
                    onClick={() => setPlannerStep("configure")}
                    className="gap-2 bg-gradient-to-r from-[#3DBAFF] to-blue-600"
                    size="lg"
                  >
                    <ArrowRight className="h-5 w-5" />
                    Configurar Optimización ({selectedOrders.length} puntos)
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">
                  {selectedOrders.length === 0
                    ? "Selecciona puntos de entrega para comenzar"
                    : `${selectedOrders.length} punto${selectedOrders.length !== 1 ? "s" : ""} seleccionado${selectedOrders.length !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Collapse Button */}
        {showRightPanel && plannerStep !== "select" && (
          <div
            className="absolute z-[1010]"
            style={{
              top: "calc(50% - 18px)",
              right: rightPanelCollapsed ? "8px" : "364px",
              transition: "right 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="flex h-9 w-9 items-center justify-center rounded-full shadow-lg bg-[#3DBAFF] hover:bg-[#3DBAFF]/90 border-2 border-white dark:border-gray-800 transition-transform hover:scale-110 active:scale-95"
            >
              {rightPanelCollapsed ? (
                <ChevronLeft className="h-4 w-4 text-white" />
              ) : (
                <ChevronRight className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        )}

        {/* ============================================
            RIGHT PANEL: Config / Results / Assignment
            ============================================ */}
        {plannerStep !== "select" && (
          <motion.div
            initial={false}
            animate={{
              width: rightPanelCollapsed ? "0px" : "380px",
              minWidth: rightPanelCollapsed ? "0px" : "380px",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden border-l border-border bg-card"
            style={{ flexShrink: 0 }}
          >
            <div className="w-[380px] h-full">
              {plannerStep === "configure" && <OptimizationConfigPanel />}
              {plannerStep === "results" && <RouteResultsList />}
              {plannerStep === "assign" && <RouteAssignmentPanel />}
            </div>
          </motion.div>
        )}
      </div>

      {/* Manual Route Creator Modal */}
      <ManualRouteCreator
        open={showManualCreator}
        onOpenChange={setShowManualCreator}
        onSave={handleSaveManualRoute}
      />
    </div>
  );
}

/* ============================================
   ROUTE PLANNER PAGE
   ============================================ */
export default function RoutePlannerPage() {
  return (
    <RoutePlannerProvider>
      <div className="h-full">
        <RoutePlannerContent />
      </div>
    </RoutePlannerProvider>
  );
}
