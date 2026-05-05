/** Entornos disponibles */
type Environment = "development" | "staging" | "production";

/** Configuración por entorno */
interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

/** URL real del backend TMS Navitel */
const REAL_BACKEND_URL = "https://api-service.gruponavitel.com/api/v1";

const configs: Record<Environment, ApiConfig> = {
  development: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || REAL_BACKEND_URL,
    timeout: 30000,
  },
  staging: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || REAL_BACKEND_URL,
    timeout: 30000,
  },
  production: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || REAL_BACKEND_URL,
    timeout: 15000,
  },
};

/** Entorno actual basado en NODE_ENV */
const currentEnv = (process.env.NODE_ENV as Environment) || "development";

/** Configuración activa */
export const apiConfig = configs[currentEnv];

/**
 * Endpoints de la API organizados por módulo
 * Facilita agregar nuevos módulos sin modificar código existente (OCP)
 */
export const API_ENDPOINTS = {
  // ── DASHBOARD ────────────────────────
  dashboard: {
    stats: "/dashboard/stats",
    vehiclesOverview: "/dashboard/vehicles/overview",
    shipments: "/dashboard/shipments",
    vehiclesOnRoute: "/dashboard/vehicles/on-route",
  },

  // ── BITACORA ─────────────────────────
  bitacora: {
    base: "/bitacora",
    stats: "/bitacora/stats",
    summaryVehicles: "/bitacora/summary/vehicles",
    summaryGeofences: "/bitacora/summary/geofences",
    export: "/bitacora/export",
    geofenceBreaches: "/bitacora/geofence-breaches",
  },

  // ── AUTH ──────────────────────────────
  // El backend expone estos endpoints SIN prefijo /api/v1 (root del host).
  // El apiClient los maneja vía rootUrl() para esquivar el namespace versionado.
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    refresh: "/auth/refresh",      // doc oficial Rev3 confirma su existencia
    me: "/auth/me",                // ⚠ no documentado en Rev3 — verificar con backend
  },

  // ── MÓDULO MAESTRO ───────────────────
  master: {
    customers: "/master/customers",
    drivers: "/master/drivers",
    vehicles: "/master/vehicles",
    operators: "/master/operators",
    products: "/master/products",
    // CORREGIDO 2026-05-02 según Excel oficial backend:
    //   - Geofences vive en ROOT (sin /api/v1) — service usa rootUrl()
    // 2026-05-03: DISCREPANCIA Excel vs producción. Excel oficial dice
    //   /api/v1/workflows pero producción solo responde en /api/v1/master/workflows
    //   (probado: /api/v1/workflows da 404, /api/v1/master/workflows da 200).
    //   Mantenemos /master/workflows hasta que el backend defina el path canónico.
    geofences: "/geofences",                       // ⚠ Service usa rootUrl() — este path es solo referencial
    assignments: "/master/assignments",
    audit: "/master/audit",
    maintenance: "/maintenance",
    medicalExams: "/master/medical-exams",
    workflows: "/master/workflows",                // ⚠ DISCREPANCIA Excel/Backend (ver comentario arriba)
    workflowDefinitions: "/master/workflows",      // backend NO expone /definitions
    workflowExecutions: "/master/workflows",       // ejecuciones via /master/workflows/:id/executions
  },

  // ── MÓDULO OPERACIONES ───────────────
  operations: {
    orders: "/orders",                            // Backend: /api/v1/orders (sin /operations)
    scheduling: "/operations/scheduling",         // Backend SÍ usa /operations/scheduling
    incidents: "/incidents",                      // ⚠ NO EXISTE en backend. Solo mocks.
    orderWorkflows: "/master/workflows",          // ⚠ Mismo path que workflows (ver comentario arriba)
  },

  // ── MÓDULO MONITOREO ─────────────────
  monitoring: {
    tracking: "/monitoring/tracking",
    historical: "/monitoring/historical",
    retransmission: "/monitoring/retransmission",
    geofenceEvents: "/monitoring/geofence-events",
    websocket: "/monitoring/websocket", // Backend: /monitoring/websocket (no /ws)
  },

  // ── MÓDULO FINANZAS ──────────────────
  finance: {
    invoices: "/finance/invoices",
    payments: "/finance/payments",
    costs: "/finance/costs",
    rates: "/finance/rates",
    stats: "/finance/stats",
    aging: "/finance/aging",
    profitability: "/finance/profitability",
    cashFlow: "/finance/cash-flow",
    customerSummary: "/finance/clientes", // Backend usa español: /finance/clientes/:id/summary
  },

  // ── MÓDULO REPORTES ──────────────────
  reports: {
    definitions: "/reports/definitions",
    templates: "/reports/templates",
    generated: "/reports/generated",                 // GET listado/detalle/status/download
    generate: "/reports/generate",                   // POST para crear un reporte (verificado producción 2026-05-03)
    schedules: "/reports/schedules",
    // Datos precalculados y stats - paths distintos en backend
    dataOperational: "/reports/data/operational",
    dataFinancial: "/reports/data/financial",
    usageStats: "/reports/usage-stats",
  },

  // ── MÓDULO NOTIFICACIONES ────────────
  // Doc oficial Rev3 confirma que el módulo está implementado.
  notifications: {
    base: "/notifications",
    preferences: "/notifications/preferences",
    templates: "/notifications/templates",
    stats: "/notifications/stats",
  },

  // ── MÓDULO CONFIGURACIÓN ─────────────
  settings: {
    base: "/settings",
    roles: "/settings/roles",
    integrations: "/settings/integrations",
    audit: "/settings/audit",
  },

  // ── MÓDULO MANTENIMIENTO ─────────────
  maintenance: {
    vehicles: "/maintenance/vehicles",
    schedules: "/maintenance/schedules",
    workOrders: "/maintenance/work-orders",
    inspections: "/maintenance/inspections",
    parts: "/maintenance/parts",
    workshops: "/maintenance/workshops",
    breakdowns: "/maintenance/breakdowns",
    alerts: "/maintenance/alerts",
    metrics: "/maintenance/metrics",
    documents: "/maintenance/documents", // ⚠ NO EXISTE en backend. Solo mocks.
    settings: "/maintenance/settings",
  },

  // ── SERVICIO DE RUTAS ────────────────
  routing: {
    calculate: "/route-planner/calculate",
    optimize: "/route-planner/optimize",
    geocode: "/route-planner/geocode",
  },
} as const;

/** Tipo para los endpoints (útil para autocompletado) */
export type ApiEndpoints = typeof API_ENDPOINTS;
