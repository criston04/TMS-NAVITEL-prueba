/** Entornos disponibles */
type Environment = "development" | "staging" | "production";

/** Configuración por entorno */
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  useMocks: boolean;
}

/**
 * Determina si usar mocks basado en variables de entorno
 * NEXT_PUBLIC_USE_MOCKS=true fuerza mocks en cualquier entorno (útil para demos)
 */
const shouldUseMocks = (envDefault: boolean): boolean => {
  const forcesMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
  const forcesApi = process.env.NEXT_PUBLIC_USE_MOCKS === 'false';
  
  if (forcesMocks) return true;
  if (forcesApi) return false;
  return envDefault;
};

const configs: Record<Environment, ApiConfig> = {
  development: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
    timeout: 30000,
    useMocks: shouldUseMocks(true), // Usar mocks en desarrollo por defecto
  },
  staging: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "https://staging-api.navitel.com/api",
    timeout: 30000,
    useMocks: shouldUseMocks(false),
  },
  production: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "https://api.navitel.com/api",
    timeout: 15000,
    useMocks: shouldUseMocks(true), // Usar mocks por defecto en producción para demo
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
  // ── AUTH ──────────────────────────────
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    me: "/auth/me",
  },

  // ── MÓDULO MAESTRO ───────────────────
  master: {
    customers: "/master/customers",
    drivers: "/master/drivers",
    vehicles: "/master/vehicles",
    operators: "/master/operators",
    products: "/master/products",
    geofences: "/master/geofences",
    assignments: "/master/assignments",
    audit: "/master/audit",
    maintenance: "/master/maintenance",
    medicalExams: "/master/medical-exams",
    workflows: "/master/workflows",
  },

  // ── MÓDULO OPERACIONES ───────────────
  operations: {
    orders: "/operations/orders",
    scheduling: "/operations/scheduling",
    incidents: "/operations/incidents",
    orderWorkflows: "/operations/order-workflows",
  },

  // ── MÓDULO MONITOREO ─────────────────
  monitoring: {
    tracking: "/monitoring/tracking",
    historical: "/monitoring/historical",
    retransmission: "/monitoring/retransmission",
    geofenceEvents: "/monitoring/geofence-events",
    websocket: "/monitoring/ws",
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
    customerSummary: "/finance/customers", // + /:customerId/summary
  },

  // ── MÓDULO REPORTES ──────────────────
  reports: {
    definitions: "/reports/definitions",
    templates: "/reports/templates",
    generated: "/reports/generated",
    schedules: "/reports/schedules",
  },

  // ── MÓDULO NOTIFICACIONES ────────────
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
    documents: "/maintenance/documents",
    settings: "/maintenance/settings",
  },

  // ── SERVICIO DE RUTAS ────────────────
  routing: {
    calculate: "/routing/calculate",
    optimize: "/routing/optimize",
    geocode: "/routing/geocode",
  },
} as const;

/** Tipo para los endpoints (útil para autocompletado) */
export type ApiEndpoints = typeof API_ENDPOINTS;
