/* ============================================
   TYPES: Route Planner Module
   Transportation Management System
   ============================================ */

export type OrderStatus = "pending" | "assigned" | "in_transit" | "delivered";
export type RouteStatus = "draft" | "generated" | "confirmed" | "dispatched";
export type Priority = "speed" | "cost" | "balanced";

/* ============================================
   TRANSPORT ORDER
   ============================================ */
export interface TransportOrder {
  id: string;
  orderNumber: string;
  client: {
    name: string;
    phone: string;
  };
  pickup: {
    address: string;
    city: string;
    coordinates: [number, number]; // [lat, lng]
    timeWindow?: {
      start: string;
      end: string;
    };
  };
  delivery: {
    address: string;
    city: string;
    coordinates: [number, number];
    timeWindow?: {
      start: string;
      end: string;
    };
  };
  cargo: {
    weight: number; // kg
    volume: number; // m³
    description: string;
    requiresRefrigeration?: boolean;
    fragile?: boolean;
  };
  status: OrderStatus;
  priority: "high" | "medium" | "low";
  requestedDate: string;
  zone: string;
}

/* ============================================
   ROUTE STOP
   ============================================ */
export interface RouteStop {
  id: string;
  orderId: string;
  sequence: number;
  type: "pickup" | "delivery";
  address: string;
  city: string;
  coordinates: [number, number];
  estimatedArrival?: string;
  timeWindow?: {
    start: string;
    end: string;
  };
  duration: number; // minutos
  status: "pending" | "completed" | "skipped";
}

/* ============================================
   VEHICLE
   ============================================ */
export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  capacity: {
    weight: number; // kg
    volume: number; // m³
  };
  fuelType: "diesel" | "gasoline" | "electric" | "hybrid";
  fuelConsumption: number; // km/L
  status: "available" | "in_route" | "maintenance" | "unavailable";
  currentLocation?: [number, number];
  features: string[];
}

/* ============================================
   DRIVER
   ============================================ */
export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  rating: number; // 0-5
  status: "available" | "on_route" | "off_duty";
  experience: number; // años
  specializations: string[];
  avatar?: string;
}

/* ============================================
   ROUTE
   ============================================ */
export interface Route {
  id: string;
  name: string;
  status: RouteStatus;
  stops: RouteStop[];
  vehicle?: Vehicle;
  driver?: Driver;
  metrics: {
    totalDistance: number; // km
    estimatedDuration: number; // minutos
    estimatedCost: number; // USD
    fuelCost: number;
    tollsCost: number;
    totalWeight: number; // kg
    totalVolume: number; // m³
  };
  configuration: RouteConfiguration;
  polyline?: [number, number][]; // Coordenadas de la ruta
  color?: string; // Color asignado para visualización multi-ruta
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  alerts?: RouteAlert[];
}

/* ============================================
   ROUTE CONFIGURATION
   ============================================ */
export interface RouteConfiguration {
  avoidTolls: boolean;
  priority: Priority;
  considerTraffic: boolean;
  maxStops?: number;
  timeBuffer: number; // minutos extra por parada
}

/* ============================================
   ROUTE ALERT
   ============================================ */
export interface RouteAlert {
  id: string;
  type: "warning" | "error" | "info";
  severity: "high" | "medium" | "low";
  message: string;
  code: "CAPACITY_EXCEEDED" | "DELAY_RISK" | "TRAFFIC_WARNING" | "TIME_WINDOW_CONFLICT" | "OTHER";
}

/* ============================================
   FILTERS
   ============================================ */
export interface OrderFilters {
  zone?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: OrderStatus[];
  priority?: ("high" | "medium" | "low")[];
  searchTerm?: string;
}

/* ============================================
   OPTIMIZATION PARAMS
   ============================================ */
export interface OptimizationParams {
  timeWindowStart: string; // "08:00"
  timeWindowEnd: string;   // "18:00"
  truckCount: number;
  stopDuration: number;    // minutos por parada
}

/* ============================================
   PLANNER STEP
   ============================================ */
export type PlannerStep = "select" | "configure" | "results" | "assign";

/* ============================================
   ROUTE ASSIGNMENT
   ============================================ */
export interface RouteAssignment {
  routeId: string;
  vehicle?: Vehicle;
  driver?: Driver;
}

/* ============================================
   DEPOT (origin/return point for routes)
   ============================================ */
export interface Depot {
  id: string;
  name: string;
  address: string;
  city: string;
  coordinates: [number, number];
  operatingHours: {
    start: string;
    end: string;
  };
}

/* ============================================
   VEHICLE RESTRICTIONS
   ============================================ */
export interface VehicleRestrictions {
  maxHeight?: number; // metros
  maxWeight?: number; // toneladas (peso bruto vehicular)
  hazmatClass?: string; // clase HAZMAT si aplica
  temperatureRequired?: boolean;
  temperatureRange?: { min: number; max: number }; // °C
  requiresLiftGate?: boolean;
}

/* ============================================
   WHAT-IF SCENARIO
   Para comparar distintas configuraciones
   ============================================ */
export interface WhatIfScenario {
  id: string;
  name: string;
  configuration: RouteConfiguration;
  optimizationParams: OptimizationParams;
  routes: Route[];
  summary: {
    totalDistance: number;
    totalDuration: number;
    totalCost: number;
    totalRoutes: number;
    avgStopsPerRoute: number;
  };
  createdAt: string;
}

/* ============================================
   ROUTE TEMPLATE
   Plantilla reutilizable de ruta
   ============================================ */
export interface RouteTemplate {
  id: string;
  name: string;
  description: string;
  configuration: RouteConfiguration;
  optimizationParams: OptimizationParams;
  defaultDepotId?: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

/* ============================================
   API CONTRACT: Route Optimization Request
   Backend integration — request payload
   ============================================ */
export interface RouteOptimizationRequest {
  /** Orders to optimize into routes */
  orders: Array<{
    id: string;
    orderNumber: string;
    pickup: {
      coordinates: [number, number];
      address: string;
      city: string;
      timeWindow?: { start: string; end: string };
    };
    delivery: {
      coordinates: [number, number];
      address: string;
      city: string;
      timeWindow?: { start: string; end: string };
    };
    cargo: {
      weight: number;
      volume: number;
      requiresRefrigeration?: boolean;
      fragile?: boolean;
    };
    priority: "high" | "medium" | "low";
  }>;
  /** Optimization parameters */
  params: {
    timeWindowStart: string;
    timeWindowEnd: string;
    truckCount: number;
    stopDuration: number;
  };
  /** Route configuration */
  config: {
    avoidTolls: boolean;
    priority: Priority;
    considerTraffic: boolean;
    timeBuffer: number;
  };
  /** Optional: Depot / origin */
  depotCoordinates?: [number, number];
  /** Optional: Available vehicles for assignment matching */
  vehicleIds?: string[];
}

/* ============================================
   API CONTRACT: Route Optimization Response
   Backend integration — response payload
   ============================================ */
export interface RouteOptimizationResponse {
  success: boolean;
  /** Generated routes */
  routes: Array<{
    id: string;
    name: string;
    stops: RouteStop[];
    polyline: [number, number][];
    metrics: {
      totalDistance: number;
      estimatedDuration: number;
      estimatedCost: number;
      fuelCost: number;
      tollsCost: number;
      totalWeight: number;
      totalVolume: number;
    };
    alerts?: RouteAlert[];
    /** Suggested vehicle assignment based on capacity matching */
    suggestedVehicleId?: string;
  }>;
  /** Global optimization summary */
  summary: {
    totalRoutes: number;
    totalDistance: number;
    totalDuration: number;
    totalCost: number;
    unassignedOrders: string[];
    optimizationTimeMs: number;
  };
  error?: string;
}
