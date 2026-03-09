"use client";

/* ============================================
   CONTEXT: Route Planner (Multi-Route)
   Transportation Management System
   Supports: select → configure → results → assign
   ============================================ */

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type {
  TransportOrder,
  Route,
  RouteStop,
  Vehicle,
  Driver,
  RouteConfiguration,
  RouteAlert,
  OptimizationParams,
  PlannerStep,
  RouteAssignment,
} from "@/types/route-planner";
import {
  generateRoutePolyline,
  calculateTotalDistance,
  estimateDuration,
  estimateCost,
  generateMultipleOptimizedRoutes,
  calculateEstimatedArrivals,
} from "@/lib/mock-data/route-planner";
import { routingService } from "@/services/routing.service";
import { tmsEventBus } from "@/services/integration/event-bus.service";
import type { AllRoutesConfirmedPayload, RouteConfirmedPayload } from "@/services/integration/event-bus.service";

/* ============================================
   CONTEXT TYPES
   ============================================ */
interface RoutePlannerContextValue {
  // Step
  plannerStep: PlannerStep;
  setPlannerStep: (step: PlannerStep) => void;

  // Orders
  selectedOrders: TransportOrder[];
  addOrder: (order: TransportOrder) => void;
  removeOrder: (orderId: string) => void;
  clearOrders: () => void;

  // Optimization params
  optimizationParams: OptimizationParams;
  updateOptimizationParams: (params: Partial<OptimizationParams>) => void;

  // Single route (legacy/compatibility)
  currentRoute: Route | null;
  generateRoute: () => void;
  reorderStops: (stops: RouteStop[]) => void;

  // Multi-route optimization
  generatedRoutes: Route[];
  generateOptimizedRoutes: () => Promise<void>;
  isOptimizing: boolean;

  // Assignments
  routeAssignments: RouteAssignment[];
  assignVehicleToRoute: (routeId: string, vehicle: Vehicle) => void;
  assignDriverToRoute: (routeId: string, driver: Driver) => void;
  unassignVehicleFromRoute: (routeId: string) => void;
  unassignDriverFromRoute: (routeId: string) => void;

  // Vehicle/Driver (legacy single-route)
  selectedVehicle: Vehicle | null;
  selectedDriver: Driver | null;
  selectVehicle: (vehicle: Vehicle | null) => void;
  selectDriver: (driver: Driver | null) => void;

  // Configuration
  configuration: RouteConfiguration;
  updateConfiguration: (config: Partial<RouteConfiguration>) => void;

  // Actions
  confirmRoute: () => void;
  confirmAllRoutes: () => void;
  resetRoute: () => void;
  resetAll: () => void;

  // Helpers
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;
  allRoutesAssigned: boolean;

  // Async states
  isGenerating: boolean;
  error: string | null;
  isSuccess: boolean;
  clearError: () => void;
}

const RoutePlannerContext = createContext<RoutePlannerContextValue | undefined>(undefined);

/* ============================================
   DEFAULT CONFIGURATION
   ============================================ */
const defaultConfiguration: RouteConfiguration = {
  avoidTolls: false,
  priority: "balanced",
  considerTraffic: true,
  timeBuffer: 10,
};

const defaultOptimizationParams: OptimizationParams = {
  timeWindowStart: "08:00",
  timeWindowEnd: "18:00",
  truckCount: 3,
  stopDuration: 30,
};

/* ============================================
   PROVIDER COMPONENT
   ============================================ */
export function RoutePlannerProvider({ children }: { children: ReactNode }) {
  const [plannerStep, setPlannerStep] = useState<PlannerStep>("select");
  const [selectedOrders, setSelectedOrders] = useState<TransportOrder[]>([]);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [generatedRoutes, setGeneratedRoutes] = useState<Route[]>([]);
  const [routeAssignments, setRouteAssignments] = useState<RouteAssignment[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [configuration, setConfiguration] = useState<RouteConfiguration>(defaultConfiguration);
  const [optimizationParams, setOptimizationParams] = useState<OptimizationParams>(defaultOptimizationParams);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Ref to track mounted state — prevents async updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Clear error helper
  const clearError = useCallback(() => { setError(null); }, []);

  /* ============================================
     ADD ORDER TO SELECTION
     ============================================ */
  const addOrder = useCallback((order: TransportOrder) => {
    setSelectedOrders((prev) => {
      if (prev.find((o) => o.id === order.id)) return prev;
      return [...prev, order];
    });
  }, []);

  /* ============================================
     REMOVE ORDER FROM SELECTION
     ============================================ */
  const removeOrder = useCallback((orderId: string) => {
    setSelectedOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  /* ============================================
     CLEAR ALL ORDERS
     ============================================ */
  const clearOrders = useCallback(() => {
    setSelectedOrders([]);
    setCurrentRoute(null);
    setGeneratedRoutes([]);
    setRouteAssignments([]);
    setError(null);
    setIsSuccess(false);
  }, []);

  /* ============================================
     GENERATE ROUTE FROM SELECTED ORDERS
     Now uses routingService for real OSRM polylines
     and calculates ETAs for each stop
     ============================================ */
  const generateRoute = useCallback(() => {
    if (selectedOrders.length === 0) return;
    setIsGenerating(true);
    setError(null);
    setIsSuccess(false);

    // Crear paradas desde las órdenes seleccionadas
    const stops: RouteStop[] = [];
    let sequence = 1;

    selectedOrders.forEach((order) => {
      stops.push({
        id: `stop-${order.id}-pickup`,
        orderId: order.id,
        sequence: sequence++,
        type: "pickup",
        address: order.pickup.address,
        city: order.pickup.city,
        coordinates: order.pickup.coordinates,
        timeWindow: order.pickup.timeWindow,
        duration: 15,
        status: "pending",
      });
      stops.push({
        id: `stop-${order.id}-delivery`,
        orderId: order.id,
        sequence: sequence++,
        type: "delivery",
        address: order.delivery.address,
        city: order.delivery.city,
        coordinates: order.delivery.coordinates,
        timeWindow: order.delivery.timeWindow,
        duration: 15,
        status: "pending",
      });
    });

    // Calcular ETAs
    const stopsWithETA = calculateEstimatedArrivals(stops, "08:00", {
      priority: configuration.priority,
      considerTraffic: configuration.considerTraffic,
    });

    // Calcular métricas
    const totalDistance = calculateTotalDistance(stopsWithETA);
    const estimatedDurationValue = estimateDuration(totalDistance, stopsWithETA.length, {
      priority: configuration.priority,
      considerTraffic: configuration.considerTraffic,
    });
    const fuelConsumption = selectedVehicle?.fuelConsumption || 10;
    const costs = estimateCost(totalDistance, fuelConsumption, !configuration.avoidTolls, configuration.priority);

    const totalWeight = selectedOrders.reduce((sum, o) => sum + o.cargo.weight, 0);
    const totalVolume = selectedOrders.reduce((sum, o) => sum + o.cargo.volume, 0);

    // Generar alertas
    const alerts: RouteAlert[] = [];
    
    if (selectedVehicle) {
      if (totalWeight > selectedVehicle.capacity.weight) {
        alerts.push({
          id: "alert-weight",
          type: "error",
          severity: "high",
          message: `Peso total (${totalWeight}kg) excede capacidad del vehículo (${selectedVehicle.capacity.weight}kg)`,
          code: "CAPACITY_EXCEEDED",
        });
      }
      if (totalVolume > selectedVehicle.capacity.volume) {
        alerts.push({
          id: "alert-volume",
          type: "error",
          severity: "high",
          message: `Volumen total (${totalVolume}m³) excede capacidad del vehículo (${selectedVehicle.capacity.volume}m³)`,
          code: "CAPACITY_EXCEEDED",
        });
      }
    }

    if (estimatedDurationValue > 480) {
      alerts.push({
        id: "alert-duration",
        type: "warning",
        severity: "medium",
        message: "Ruta excede 8 horas de trabajo. Considere dividir la ruta.",
        code: "DELAY_RISK",
      });
    }

    // Crear ruta con polyline fallback (se actualizará async con OSRM)
    const fallbackPolyline = generateRoutePolyline(stopsWithETA);

    const route: Route = {
      id: `route-${Date.now()}`,
      name: `Ruta ${new Date().toLocaleDateString()}`,
      status: "generated",
      stops: stopsWithETA,
      vehicle: selectedVehicle || undefined,
      driver: selectedDriver || undefined,
      metrics: {
        totalDistance,
        estimatedDuration: estimatedDurationValue,
        estimatedCost: costs.total,
        fuelCost: costs.fuel,
        tollsCost: costs.tolls,
        totalWeight,
        totalVolume,
      },
      configuration,
      polyline: fallbackPolyline,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      alerts: alerts.length > 0 ? alerts : undefined,
    };

    setCurrentRoute(route);

    // Obtener polyline real de OSRM (async, actualiza cuando esté listo)
    const coords = stopsWithETA.map((s) => s.coordinates);
    routingService.calculateRoute(coords).then((result) => {
      if (!isMountedRef.current) return;
      setCurrentRoute((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          polyline: result.polyline,
          metrics: {
            ...prev.metrics,
            totalDistance: result.totalDistance,
            estimatedDuration: result.totalDuration + stopsWithETA.length * 15,
          },
        };
      });
      setIsSuccess(true);
    }).catch((err) => {
      if (!isMountedRef.current) return;
      // Fallback polyline already set — just report info
      console.warn("OSRM fallback: usando polyline local", err);
      setIsSuccess(true);
    }).finally(() => {
      if (isMountedRef.current) setIsGenerating(false);
    });
  }, [selectedOrders, selectedVehicle, selectedDriver, configuration]);

  /* ============================================
     REORDER STOPS
     Recalculates metrics, ETAs, and fetches new OSRM polyline
     ============================================ */
  const reorderStops = useCallback((stops: RouteStop[]) => {
    if (!currentRoute) return;

    const reorderedStops = stops.map((stop, index) => ({
      ...stop,
      sequence: index + 1,
    }));

    // Recalcular ETAs
    const stopsWithETA = calculateEstimatedArrivals(reorderedStops, "08:00", {
      priority: configuration.priority,
      considerTraffic: configuration.considerTraffic,
    });

    const totalDistance = calculateTotalDistance(stopsWithETA);
    const estimatedDurationValue = estimateDuration(totalDistance, stopsWithETA.length, {
      priority: configuration.priority,
      considerTraffic: configuration.considerTraffic,
    });
    const fuelConsumption = selectedVehicle?.fuelConsumption || 10;
    const costs = estimateCost(totalDistance, fuelConsumption, !configuration.avoidTolls, configuration.priority);

    setCurrentRoute({
      ...currentRoute,
      stops: stopsWithETA,
      metrics: {
        ...currentRoute.metrics,
        totalDistance,
        estimatedDuration: estimatedDurationValue,
        estimatedCost: costs.total,
        fuelCost: costs.fuel,
        tollsCost: costs.tolls,
      },
      polyline: generateRoutePolyline(stopsWithETA),
      updatedAt: new Date().toISOString(),
    });

    // Actualizar polyline con OSRM async
    const coords = stopsWithETA.map((s) => s.coordinates);
    routingService.calculateRoute(coords).then((result) => {
      if (!isMountedRef.current) return;
      setCurrentRoute((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          polyline: result.polyline,
          metrics: {
            ...prev.metrics,
            totalDistance: result.totalDistance,
          },
        };
      });
    }).catch(() => { /* fallback ya aplicado */ });
  }, [currentRoute, selectedVehicle, configuration]);

  /* ============================================
     SELECT VEHICLE
     ============================================ */
  const selectVehicle = useCallback((vehicle: Vehicle | null) => {
    setSelectedVehicle(vehicle);
  }, []);

  /* ============================================
     SELECT DRIVER
     ============================================ */
  const selectDriver = useCallback((driver: Driver | null) => {
    setSelectedDriver(driver);
  }, []);

  /* ============================================
     UPDATE CONFIGURATION
     ============================================ */
  const updateConfiguration = useCallback((config: Partial<RouteConfiguration>) => {
    setConfiguration((prev) => ({ ...prev, ...config }));
  }, []);

  /* ============================================
     CONFIRM ROUTE
     ============================================ */
  const confirmRoute = useCallback(() => {
    if (!currentRoute) return;
    const confirmed: Route = {
      ...currentRoute,
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    };
    setCurrentRoute(confirmed);

    // Publicar evento cross-module (single route)
    const payload: RouteConfirmedPayload = {
      routeId: confirmed.id,
      routeName: confirmed.name,
      vehicleId: selectedVehicle?.id,
      vehiclePlate: selectedVehicle?.plate,
      driverId: selectedDriver?.id,
      driverName: selectedDriver ? `${selectedDriver.firstName} ${selectedDriver.lastName}` : undefined,
      stops: confirmed.stops.map((stop) => ({
        orderId: stop.orderId,
        type: stop.type,
        address: stop.address,
        city: stop.city,
        coordinates: stop.coordinates,
      })),
      metrics: confirmed.metrics,
    };
    tmsEventBus.publish('route:confirmed', payload, 'route-planner');
  }, [currentRoute, selectedVehicle, selectedDriver]);

  /* ============================================
     GENERATE MULTIPLE OPTIMIZED ROUTES (ASYNC)
     Now calls async OSRM-powered optimization
     ============================================ */
  const generateOptimizedRoutes = useCallback(async () => {
    if (selectedOrders.length === 0) return;
    setIsOptimizing(true);
    setError(null);
    setIsSuccess(false);
    try {
      const routes = await generateMultipleOptimizedRoutes(
        selectedOrders,
        optimizationParams,
        configuration
      );
      if (!isMountedRef.current) return;
      setGeneratedRoutes(routes);
      setRouteAssignments(routes.map((r) => ({ routeId: r.id })));
      setPlannerStep("results");
      if (routes.length > 0) {
        setSelectedRouteId(routes[0].id);
      }
      setIsSuccess(true);
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = err instanceof Error ? err.message : "Error generando rutas optimizadas";
      setError(msg);
      console.error("Error generando rutas optimizadas:", err);
    } finally {
      if (isMountedRef.current) setIsOptimizing(false);
    }
  }, [selectedOrders, optimizationParams, configuration]);

  /* ============================================
     ASSIGN VEHICLE TO ROUTE
     Validates vehicle isn't already assigned to another route
     ============================================ */
  const assignVehicleToRoute = useCallback((routeId: string, vehicle: Vehicle) => {
    setRouteAssignments((prev) => {
      // Verificar si el vehículo ya está asignado a otra ruta
      const existingAssignment = prev.find(
        (a) => a.vehicle?.id === vehicle.id && a.routeId !== routeId
      );
      if (existingAssignment) {
        // Quitar de la ruta anterior
        const cleaned = prev.map((a) =>
          a.routeId === existingAssignment.routeId ? { ...a, vehicle: undefined } : a
        );
        return cleaned.map((a) => (a.routeId === routeId ? { ...a, vehicle } : a));
      }
      return prev.map((a) => (a.routeId === routeId ? { ...a, vehicle } : a));
    });
    setGeneratedRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, vehicle } : r))
    );
  }, []);

  /* ============================================
     ASSIGN DRIVER TO ROUTE
     Validates driver isn't already assigned to another route
     ============================================ */
  const assignDriverToRoute = useCallback((routeId: string, driver: Driver) => {
    setRouteAssignments((prev) => {
      // Verificar si el conductor ya está asignado a otra ruta
      const existingAssignment = prev.find(
        (a) => a.driver?.id === driver.id && a.routeId !== routeId
      );
      if (existingAssignment) {
        // Quitar de la ruta anterior
        const cleaned = prev.map((a) =>
          a.routeId === existingAssignment.routeId ? { ...a, driver: undefined } : a
        );
        return cleaned.map((a) => (a.routeId === routeId ? { ...a, driver } : a));
      }
      return prev.map((a) => (a.routeId === routeId ? { ...a, driver } : a));
    });
    setGeneratedRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, driver } : r))
    );
  }, []);

  /* ============================================
     UNASSIGN VEHICLE FROM ROUTE
     ============================================ */
  const unassignVehicleFromRoute = useCallback((routeId: string) => {
    setRouteAssignments((prev) =>
      prev.map((a) => (a.routeId === routeId ? { ...a, vehicle: undefined } : a))
    );
    setGeneratedRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, vehicle: undefined } : r))
    );
  }, []);

  /* ============================================
     UNASSIGN DRIVER FROM ROUTE
     ============================================ */
  const unassignDriverFromRoute = useCallback((routeId: string) => {
    setRouteAssignments((prev) =>
      prev.map((a) => (a.routeId === routeId ? { ...a, driver: undefined } : a))
    );
    setGeneratedRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, driver: undefined } : r))
    );
  }, []);

  /* ============================================
     UPDATE OPTIMIZATION PARAMS
     ============================================ */
  const updateOptimizationParams = useCallback((params: Partial<OptimizationParams>) => {
    setOptimizationParams((prev) => ({ ...prev, ...params }));
  }, []);

  /* ============================================
     CONFIRM ALL ROUTES
     Publica evento al EventBus para generar órdenes
     ============================================ */
  const confirmAllRoutes = useCallback(() => {
    const confirmedRoutes = generatedRoutes.map((r) => ({
      ...r,
      status: "confirmed" as const,
      confirmedAt: new Date().toISOString(),
    }));
    setGeneratedRoutes(confirmedRoutes);

    // Construir payloads de cada ruta con sus asignaciones
    const routePayloads: RouteConfirmedPayload[] = confirmedRoutes.map((route) => {
      const assignment = routeAssignments.find((a) => a.routeId === route.id);
      return {
        routeId: route.id,
        routeName: route.name,
        vehicleId: assignment?.vehicle?.id,
        vehiclePlate: assignment?.vehicle?.plate,
        driverId: assignment?.driver?.id,
        driverName: assignment?.driver
          ? `${assignment.driver.firstName} ${assignment.driver.lastName}`
          : undefined,
        stops: route.stops.map((stop) => ({
          orderId: stop.orderId,
          type: stop.type,
          address: stop.address,
          city: stop.city,
          coordinates: stop.coordinates,
        })),
        metrics: route.metrics,
      };
    });

    // Publicar evento cross-module → genera órdenes de transporte
    const payload: AllRoutesConfirmedPayload = {
      routes: routePayloads,
      totalOrders: confirmedRoutes.length,
      plannerSessionId: `session-${Date.now()}`,
    };
    tmsEventBus.publish('route:all_confirmed', payload, 'route-planner');
  }, [generatedRoutes, routeAssignments]);

  /* ============================================
     RESET ROUTE
     ============================================ */
  const resetRoute = useCallback(() => {
    setCurrentRoute(null);
    setSelectedOrders([]);
    setSelectedVehicle(null);
    setSelectedDriver(null);
    setConfiguration(defaultConfiguration);
  }, []);

  /* ============================================
     RESET ALL (multi-route)
     ============================================ */
  const resetAll = useCallback(() => {
    setPlannerStep("select");
    setSelectedOrders([]);
    setCurrentRoute(null);
    setGeneratedRoutes([]);
    setRouteAssignments([]);
    setSelectedVehicle(null);
    setSelectedDriver(null);
    setConfiguration(defaultConfiguration);
    setOptimizationParams(defaultOptimizationParams);
    setSelectedRouteId(null);
  }, []);

  /* ============================================
     COMPUTED VALUES
     ============================================ */
  const allRoutesAssigned = routeAssignments.length > 0 &&
    routeAssignments.every((a) => a.vehicle && a.driver);

  const value: RoutePlannerContextValue = {
    plannerStep,
    setPlannerStep,
    selectedOrders,
    addOrder,
    removeOrder,
    clearOrders,
    optimizationParams,
    updateOptimizationParams,
    currentRoute,
    generateRoute,
    reorderStops,
    generatedRoutes,
    generateOptimizedRoutes,
    isOptimizing,
    routeAssignments,
    assignVehicleToRoute,
    assignDriverToRoute,
    unassignVehicleFromRoute,
    unassignDriverFromRoute,
    selectedVehicle,
    selectedDriver,
    selectVehicle,
    selectDriver,
    configuration,
    updateConfiguration,
    confirmRoute,
    confirmAllRoutes,
    resetRoute,
    resetAll,
    selectedRouteId,
    setSelectedRouteId,
    allRoutesAssigned,
    isGenerating,
    error,
    isSuccess,
    clearError,
  };

  return (
    <RoutePlannerContext.Provider value={value}>
      {children}
    </RoutePlannerContext.Provider>
  );
}

/* ============================================
   HOOK: useRoutePlanner
   ============================================ */
export function useRoutePlanner() {
  const context = useContext(RoutePlannerContext);
  if (context === undefined) {
    throw new Error("useRoutePlanner must be used within RoutePlannerProvider");
  }
  return context;
}
