/**
 * @fileoverview Tipos de Plataforma — Gestión Multi-Tenant
 * Sistema TMS Navitel
 *
 * Define las entidades de nivel plataforma que permiten al Owner (proveedor TMS)
 * administrar múltiples cuentas de clientes (tenants), controlar módulos contratados,
 * transferir unidades y gestionar la facturación de la plataforma.
 *
 * Jerarquía:
 *   Platform Owner (Proveedor TMS)
 *     └── Tenant (Cuenta Cliente)
 *           └── Usuario Maestro (Client Admin)
 *                 └── Subusuarios (Operadores)
 */

// ════════════════════════════════════════════════════════
// TENANT (CUENTA CLIENTE)
// ════════════════════════════════════════════════════════

/**
 * Estados posibles de una cuenta de cliente (tenant)
 */
export type TenantStatus =
  | "active"        // Cuenta activa y operativa
  | "trial"         // En periodo de prueba
  | "suspended"     // Suspendida temporalmente (falta de pago, violación, etc.)
  | "cancelled"     // Cancelada por el cliente
  | "pending";      // Pendiente de activación inicial

/**
 * Plan de suscripción del tenant
 */
export type SubscriptionPlan =
  | "starter"       // Plan básico
  | "professional"  // Plan profesional
  | "enterprise"    // Plan empresarial
  | "custom";       // Plan personalizado

/**
 * Cuenta de cliente (Tenant) — Entidad raíz de la arquitectura multi-tenant
 */
export interface Tenant {
  /** ID único del tenant */
  id: string;
  /** Código interno del tenant (ej: "TRANSPORTES-GARCIA") */
  code: string;
  /** Nombre comercial de la empresa */
  name: string;
  /** Razón social */
  legalName: string;
  /** RUC / NIT / Tax ID */
  taxId: string;
  /** Estado actual del tenant */
  status: TenantStatus;

  // ── Contacto ──
  /** Dirección fiscal */
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone: string;
  email: string;
  website?: string;
  /** Logo de la empresa */
  logo?: string;

  // ── Suscripción ──
  /** Plan de suscripción */
  plan: SubscriptionPlan;
  /** Fecha de inicio de suscripción */
  subscriptionStartDate: string;
  /** Fecha de vencimiento de suscripción */
  subscriptionEndDate?: string;
  /** Si el periodo de prueba está activo */
  isTrialActive: boolean;
  /** Fecha de fin del periodo de prueba */
  trialEndDate?: string;

  // ── Límites del plan ──
  /** Máximo de usuarios permitidos */
  maxUsers: number;
  /** Máximo de vehículos/unidades permitidos */
  maxVehicles: number;
  /** Usuarios actualmente activos */
  currentUsersCount: number;
  /** Vehículos actualmente registrados */
  currentVehiclesCount: number;

  // ── Módulos contratados ──
  /** Módulos habilitados para este tenant (controlados por el Owner) */
  enabledModules: TenantModuleConfig[];

  // ── Datos del Usuario Maestro ──
  /** ID del usuario maestro de esta cuenta */
  masterUserId?: string;
  /** Nombre del usuario maestro */
  masterUserName?: string;
  /** Email del usuario maestro */
  masterUserEmail?: string;

  // ── Configuración ──
  /** Zona horaria por defecto */
  timezone: string;
  /** Moneda por defecto */
  defaultCurrency: string;
  /** Idioma por defecto */
  defaultLanguage: "es" | "en";

  // ── Auditoría ──
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** Motivo de suspensión (si aplica) */
  suspensionReason?: string;
  /** Fecha de suspensión */
  suspendedAt?: string;
  /** Notas internas del Owner sobre esta cuenta */
  internalNotes?: string;
}

// ════════════════════════════════════════════════════════
// MÓDULOS DEL SISTEMA
// ════════════════════════════════════════════════════════

/**
 * Códigos de módulos del sistema que pueden activarse/desactivarse por tenant.
 * Cada módulo agrupa funcionalidades relacionadas.
 */
export type SystemModuleCode =
  // Operaciones
  | "orders"            // Gestión de Órdenes
  | "scheduling"        // Programación
  | "workflows"         // Flujos de Trabajo
  | "incidents"         // Incidencias
  | "bitacora"          // Bitácora
  | "route_planner"     // Planificador de Rutas
  // Monitoreo
  | "monitoring"        // Monitoreo (Torre de Control, Retransmisión, Histórico, Multiventana)
  | "alerts"            // Alertas y Notificaciones de Monitoreo
  // Finanzas
  | "invoicing"         // Facturación
  | "payments"          // Cobros y Pagos
  | "costs"             // Control de Costos
  | "rates"             // Tarifario
  | "settlements"       // Liquidaciones de Viaje
  // Mantenimiento
  | "maintenance"       // Mantenimiento de Flota
  // Datos Maestros
  | "customers"         // Clientes
  | "drivers"           // Conductores
  | "vehicles"          // Vehículos
  | "operators"         // Operadores Logísticos
  | "products"          // Productos / Carga
  | "geofences"         // Geocercas
  // Reportes
  | "reports"           // Centro de Reportes
  // Soporte
  | "notifications"     // Notificaciones (email, SMS, push)
  | "integrations";     // Integraciones Externas (GPS, ERP, etc.)

/**
 * Definición estática de un módulo del sistema
 */
export interface SystemModuleDefinition {
  /** Código del módulo */
  code: SystemModuleCode;
  /** Nombre para mostrar */
  name: string;
  /** Descripción del módulo */
  description: string;
  /** Categoría/grupo del módulo */
  category: "operations" | "monitoring" | "finance" | "maintenance" | "master" | "reports" | "support";
  /** Icono (nombre de lucide-react) */
  icon: string;
  /** Si es un módulo core (siempre incluido en todos los planes) */
  isCore: boolean;
  /** Planes que incluyen este módulo por defecto */
  includedInPlans: SubscriptionPlan[];
  /** Dependencias (otros módulos que deben estar activos) */
  dependencies?: SystemModuleCode[];
  /** Orden de visualización */
  displayOrder: number;
}

/**
 * Configuración de un módulo habilitado para un tenant específico
 */
export interface TenantModuleConfig {
  /** Código del módulo */
  moduleCode: SystemModuleCode;
  /** Si está habilitado para este tenant */
  isEnabled: boolean;
  /** Fecha de activación */
  enabledAt?: string;
  /** Quién lo activó (Owner) */
  enabledBy?: string;
  /** Fecha de desactivación (si fue desactivado) */
  disabledAt?: string;
  /** Límites específicos de este módulo para el tenant */
  limits?: Record<string, number>;
  /** Configuración custom del módulo */
  config?: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════
// CATÁLOGO DE MÓDULOS DEL SISTEMA
// ════════════════════════════════════════════════════════

/**
 * Catálogo completo de módulos disponibles en el sistema TMS
 */
export const SYSTEM_MODULES: SystemModuleDefinition[] = [
  // ── OPERACIONES ──
  {
    code: "orders",
    name: "Órdenes",
    description: "Gestión completa de órdenes de transporte: creación, seguimiento, asignación y cierre.",
    category: "operations",
    icon: "Package",
    isCore: true,
    includedInPlans: ["starter", "professional", "enterprise", "custom"],
    displayOrder: 1,
  },
  {
    code: "scheduling",
    name: "Programación",
    description: "Programación y calendarización de viajes, asignación masiva de recursos.",
    category: "operations",
    icon: "CalendarDays",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    dependencies: ["orders"],
    displayOrder: 2,
  },
  {
    code: "workflows",
    name: "Workflows",
    description: "Flujos de trabajo automatizados con pasos configurables por tipo de carga.",
    category: "operations",
    icon: "Route",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    dependencies: ["orders"],
    displayOrder: 3,
  },
  {
    code: "incidents",
    name: "Incidencias",
    description: "Registro, seguimiento y resolución de incidentes operativos.",
    category: "operations",
    icon: "AlertTriangle",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    dependencies: ["orders"],
    displayOrder: 4,
  },
  {
    code: "bitacora",
    name: "Bitácora",
    description: "Registro cronológico de eventos operativos por viaje.",
    category: "operations",
    icon: "ClipboardList",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    dependencies: ["orders"],
    displayOrder: 5,
  },
  {
    code: "route_planner",
    name: "Planificador de Rutas",
    description: "Optimización y planificación de rutas con algoritmos de ruteo.",
    category: "operations",
    icon: "Navigation",
    isCore: false,
    includedInPlans: ["enterprise", "custom"],
    dependencies: ["orders", "vehicles"],
    displayOrder: 6,
  },

  // ── MONITOREO ──
  {
    code: "monitoring",
    name: "Monitoreo",
    description: "Torre de control, rastreo en tiempo real, retransmisión GPS, multiventana e histórico.",
    category: "monitoring",
    icon: "TowerControl",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    dependencies: ["vehicles"],
    displayOrder: 10,
  },
  {
    code: "alerts",
    name: "Alertas de Monitoreo",
    description: "Configuración y gestión de alertas: velocidad, geocerca, paradas, inactividad.",
    category: "monitoring",
    icon: "Bell",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    dependencies: ["monitoring"],
    displayOrder: 11,
  },

  // ── FINANZAS ──
  {
    code: "invoicing",
    name: "Facturación",
    description: "Generación, envío y seguimiento de facturas electrónicas.",
    category: "finance",
    icon: "FileText",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    displayOrder: 20,
  },
  {
    code: "payments",
    name: "Cobros y Pagos",
    description: "Control de cuentas por cobrar y por pagar, conciliación de pagos.",
    category: "finance",
    icon: "Wallet",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    displayOrder: 21,
  },
  {
    code: "costs",
    name: "Control de Costos",
    description: "Registro y análisis de costos operativos: combustible, peajes, viáticos.",
    category: "finance",
    icon: "DollarSign",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    displayOrder: 22,
  },
  {
    code: "rates",
    name: "Tarifario",
    description: "Gestión de tarifas por cliente, ruta, tipo de carga y vehículo.",
    category: "finance",
    icon: "DollarSign",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    displayOrder: 23,
  },
  {
    code: "settlements",
    name: "Liquidaciones",
    description: "Liquidación de viajes: cálculo automático de pagos a conductores y proveedores.",
    category: "finance",
    icon: "Calculator",
    isCore: false,
    includedInPlans: ["enterprise", "custom"],
    dependencies: ["orders", "costs"],
    displayOrder: 24,
  },

  // ── MANTENIMIENTO ──
  {
    code: "maintenance",
    name: "Mantenimiento",
    description: "Gestión de mantenimiento preventivo y correctivo: OT, inspecciones, repuestos, talleres.",
    category: "maintenance",
    icon: "Wrench",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    dependencies: ["vehicles"],
    displayOrder: 30,
  },

  // ── DATOS MAESTROS ──
  {
    code: "customers",
    name: "Clientes",
    description: "Gestión del catálogo de clientes: datos, contactos, puntos de entrega.",
    category: "master",
    icon: "Users",
    isCore: true,
    includedInPlans: ["starter", "professional", "enterprise", "custom"],
    displayOrder: 40,
  },
  {
    code: "drivers",
    name: "Conductores",
    description: "Gestión de conductores: documentos, licencias, asignaciones.",
    category: "master",
    icon: "UserCircle",
    isCore: true,
    includedInPlans: ["starter", "professional", "enterprise", "custom"],
    displayOrder: 41,
  },
  {
    code: "vehicles",
    name: "Vehículos",
    description: "Gestión de flota vehicular: unidades, documentos, GPS.",
    category: "master",
    icon: "Car",
    isCore: true,
    includedInPlans: ["starter", "professional", "enterprise", "custom"],
    displayOrder: 42,
  },
  {
    code: "operators",
    name: "Operadores Logísticos",
    description: "Gestión de transportistas terceros y proveedores de servicio.",
    category: "master",
    icon: "Building2",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    displayOrder: 43,
  },
  {
    code: "products",
    name: "Productos",
    description: "Catálogo de productos y tipos de carga.",
    category: "master",
    icon: "Box",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    displayOrder: 44,
  },
  {
    code: "geofences",
    name: "Geocercas",
    description: "Definición de zonas geográficas para control y monitoreo.",
    category: "master",
    icon: "MapPinned",
    isCore: false,
    includedInPlans: ["professional", "enterprise", "custom"],
    displayOrder: 45,
  },

  // ── REPORTES ──
  {
    code: "reports",
    name: "Reportes",
    description: "Centro de reportes operativos, financieros y de flota.",
    category: "reports",
    icon: "BarChart3",
    isCore: true,
    includedInPlans: ["starter", "professional", "enterprise", "custom"],
    displayOrder: 50,
  },

  // ── SOPORTE ──
  {
    code: "notifications",
    name: "Notificaciones",
    description: "Sistema de notificaciones por email, SMS y push.",
    category: "support",
    icon: "Bell",
    isCore: true,
    includedInPlans: ["starter", "professional", "enterprise", "custom"],
    displayOrder: 60,
  },
  {
    code: "integrations",
    name: "Integraciones",
    description: "Conexión con proveedores GPS, ERPs, plataformas de pago y más.",
    category: "support",
    icon: "Plug",
    isCore: false,
    includedInPlans: ["enterprise", "custom"],
    displayOrder: 61,
  },
];

// ════════════════════════════════════════════════════════
// SCOPE / ALCANCE DE USUARIO
// ════════════════════════════════════════════════════════

/**
 * Tipo de restricción de alcance para un usuario dentro de un tenant.
 * Define qué datos puede ver/operar un subusuario.
 */
export type ScopeType =
  | "all"               // Sin restricción (ve todo dentro del tenant)
  | "by_vehicles"       // Solo ve unidades específicas asignadas
  | "by_fleet_groups"   // Solo ve grupos/flotas específicos
  | "by_geofences"      // Solo ve operaciones dentro de geocercas específicas
  | "by_customers"      // Solo ve órdenes de clientes específicos
  | "by_operation_type" // Solo ve operaciones de cierto tipo
  | "custom";           // Combinación personalizada

/**
 * Grupo de flota para agrupar vehículos y filtrar visibilidad
 */
export interface FleetGroup {
  id: string;
  name: string;
  description?: string;
  /** IDs de vehículos en este grupo */
  vehicleIds: string[];
  /** Color para el UI */
  color?: string;
  /** Si está activo */
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Alcance (scope) de visibilidad de un usuario.
 * Controla qué datos puede ver y operar el usuario dentro de su tenant.
 *
 * El Usuario Maestro define esto al crear/editar subusuarios.
 */
export interface UserScope {
  /** Tipo de restricción principal */
  type: ScopeType;

  /** IDs de vehículos/unidades asignadas (cuando type incluye by_vehicles) */
  vehicleIds?: string[];

  /** IDs de grupos de flota asignados (cuando type incluye by_fleet_groups) */
  fleetGroupIds?: string[];

  /** IDs de geocercas asignadas (cuando type incluye by_geofences) */
  geofenceIds?: string[];

  /** IDs de clientes asignados (cuando type incluye by_customers) */
  customerIds?: string[];

  /** Tipos de operación permitidos (when type includes by_operation_type) */
  operationTypes?: string[];

  /** Si puede ver datos de cualquier conductor o solo los asignados */
  restrictDriverVisibility?: boolean;

  /** IDs de conductores visibles (si restrictDriverVisibility=true) */
  driverIds?: string[];
}

// ════════════════════════════════════════════════════════
// TRANSFERENCIA DE UNIDADES
// ════════════════════════════════════════════════════════

/**
 * Solicitud de transferencia de unidad(es) entre tenants.
 * Solo el Owner de la plataforma puede ejecutar esto.
 */
export interface VehicleTransferRequest {
  /** ID único de la solicitud */
  id: string;
  /** IDs de vehículos a transferir */
  vehicleIds: string[];
  /** Tenant origen */
  fromTenantId: string;
  fromTenantName: string;
  /** Tenant destino */
  toTenantId: string;
  toTenantName: string;
  /** Motivo de la transferencia */
  reason: string;
  /** Estado de la transferencia */
  status: "pending" | "approved" | "completed" | "rejected" | "cancelled";
  /** Transferir también el historial GPS */
  transferGpsHistory: boolean;
  /** Transferir también el historial de mantenimiento */
  transferMaintenanceHistory: boolean;
  /** Quién solicitó */
  requestedBy: string;
  requestedAt: string;
  /** Quién aprobó/rechazó */
  processedBy?: string;
  processedAt?: string;
  /** Notas */
  notes?: string;
}

// ════════════════════════════════════════════════════════
// DTOs DE PLATAFORMA
// ════════════════════════════════════════════════════════

/**
 * Crear un nuevo tenant (cuenta de cliente)
 */
export interface CreateTenantDTO {
  /** Código del tenant */
  code: string;
  /** Nombre comercial */
  name: string;
  /** Razón social */
  legalName: string;
  /** RUC / NIT */
  taxId: string;
  /** Dirección */
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  /** Plan de suscripción */
  plan: SubscriptionPlan;
  /** Duración de suscripción en meses */
  subscriptionMonths?: number;
  /** Activar periodo de prueba */
  enableTrial?: boolean;
  /** Días de prueba */
  trialDays?: number;
  /** Máximo de usuarios */
  maxUsers: number;
  /** Máximo de vehículos */
  maxVehicles: number;
  /** Módulos a activar */
  enabledModules: SystemModuleCode[];
  /** Zona horaria */
  timezone?: string;
  /** Moneda */
  defaultCurrency?: string;
  /** Idioma */
  defaultLanguage?: "es" | "en";
  /** Notas internas */
  internalNotes?: string;
}

/**
 * Actualizar un tenant existente
 */
export interface UpdateTenantDTO {
  name?: string;
  legalName?: string;
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  plan?: SubscriptionPlan;
  maxUsers?: number;
  maxVehicles?: number;
  timezone?: string;
  defaultCurrency?: string;
  defaultLanguage?: "es" | "en";
  internalNotes?: string;
}

/**
 * Suspender un tenant
 */
export interface SuspendTenantDTO {
  /** Motivo de suspensión */
  reason: string;
  /** Notificar al usuario maestro por email */
  notifyMasterUser?: boolean;
}

/**
 * Crear el usuario maestro de un tenant
 */
export interface CreateMasterUserDTO {
  /** ID del tenant al que pertenecerá */
  tenantId: string;
  /** Nombre completo */
  name: string;
  /** Email (será su login) */
  email: string;
  /** Contraseña temporal */
  password: string;
  /** Teléfono */
  phone?: string;
  /** Forzar cambio de contraseña en primer login */
  forcePasswordChange?: boolean;
}

/**
 * Activar o desactivar módulos para un tenant
 */
export interface UpdateTenantModulesDTO {
  /** Módulos a activar */
  enableModules?: SystemModuleCode[];
  /** Módulos a desactivar */
  disableModules?: SystemModuleCode[];
}

/**
 * DTO para transferir unidades entre tenants
 */
export interface CreateVehicleTransferDTO {
  vehicleIds: string[];
  fromTenantId: string;
  toTenantId: string;
  reason: string;
  transferGpsHistory?: boolean;
  transferMaintenanceHistory?: boolean;
  notes?: string;
}

/**
 * Forzar reset de contraseña desde plataforma
 */
export interface ForcePasswordResetDTO {
  /** ID del usuario */
  userId: string;
  /** ID del tenant del usuario */
  tenantId: string;
  /** Nueva contraseña temporal (si no se envía, se genera automáticamente) */
  temporaryPassword?: string;
  /** Enviar por email al usuario */
  sendByEmail?: boolean;
  /** Forzar cambio en próximo login */
  forceChangeOnLogin?: boolean;
}

// ════════════════════════════════════════════════════════
// ESTADÍSTICAS Y DASHBOARD DE PLATAFORMA
// ════════════════════════════════════════════════════════

/**
 * Resumen de la plataforma para el dashboard del Owner
 */
export interface PlatformDashboard {
  /** Total de tenants */
  totalTenants: number;
  /** Tenants activos */
  activeTenants: number;
  /** Tenants suspendidos */
  suspendedTenants: number;
  /** Tenants en periodo de prueba */
  trialTenants: number;
  /** Total de usuarios en la plataforma */
  totalUsers: number;
  /** Total de vehículos en la plataforma */
  totalVehicles: number;
  /** Ingresos mensuales recurrentes (MRR) */
  monthlyRecurringRevenue: number;
  /** Tenants creados este mes */
  newTenantsThisMonth: number;
  /** Tasa de churn del mes */
  churnRate: number;
  /** Distribución por plan */
  planDistribution: {
    plan: SubscriptionPlan;
    count: number;
    percentage: number;
  }[];
  /** Módulos más utilizados */
  topModules: {
    moduleCode: SystemModuleCode;
    moduleName: string;
    tenantsUsing: number;
    percentage: number;
  }[];
  /** Últimas actividades */
  recentActivity: PlatformActivityLog[];
}

/**
 * Log de actividad de la plataforma
 */
export interface PlatformActivityLog {
  id: string;
  timestamp: string;
  /** Quién realizó la acción (platform user) */
  userId: string;
  userName: string;
  /** Acción realizada */
  action:
    | "tenant_created"
    | "tenant_suspended"
    | "tenant_reactivated"
    | "tenant_cancelled"
    | "module_enabled"
    | "module_disabled"
    | "user_created"
    | "user_reset_password"
    | "vehicle_transferred"
    | "plan_changed"
    | "master_user_created";
  /** Descripción legible */
  description: string;
  /** Tenant afectado */
  tenantId?: string;
  tenantName?: string;
  /** Metadata adicional */
  metadata?: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════

/**
 * Obtiene la definición de un módulo por su código
 */
export function getModuleDefinition(code: SystemModuleCode): SystemModuleDefinition | undefined {
  return SYSTEM_MODULES.find((m) => m.code === code);
}

/**
 * Obtiene los módulos incluidos por defecto en un plan
 */
export function getModulesForPlan(plan: SubscriptionPlan): SystemModuleDefinition[] {
  return SYSTEM_MODULES.filter((m) => m.includedInPlans.includes(plan));
}

/**
 * Verifica si un módulo está habilitado para un tenant
 */
export function isTenantModuleEnabled(
  tenant: Tenant | Pick<Tenant, "enabledModules">,
  moduleCode: SystemModuleCode
): boolean {
  return tenant.enabledModules.some(
    (m) => m.moduleCode === moduleCode && m.isEnabled
  );
}

/**
 * Obtiene los códigos de todos los módulos habilitados de un tenant
 */
export function getEnabledModuleCodes(
  tenant: Tenant | Pick<Tenant, "enabledModules">
): SystemModuleCode[] {
  return tenant.enabledModules
    .filter((m) => m.isEnabled)
    .map((m) => m.moduleCode);
}

/**
 * Verifica las dependencias de un módulo antes de activarlo
 */
export function checkModuleDependencies(
  moduleCode: SystemModuleCode,
  enabledModules: SystemModuleCode[]
): { canEnable: boolean; missingDependencies: SystemModuleCode[] } {
  const moduleDef = getModuleDefinition(moduleCode);
  if (!moduleDef || !moduleDef.dependencies) {
    return { canEnable: true, missingDependencies: [] };
  }

  const missing = moduleDef.dependencies.filter(
    (dep) => !enabledModules.includes(dep)
  );

  return {
    canEnable: missing.length === 0,
    missingDependencies: missing,
  };
}

/**
 * Verifica si un módulo puede desactivarse sin romper dependencias de otros módulos activos
 */
export function checkModuleDependents(
  moduleCode: SystemModuleCode,
  enabledModules: SystemModuleCode[]
): { canDisable: boolean; dependentModules: SystemModuleCode[] } {
  const dependents = SYSTEM_MODULES.filter(
    (m) =>
      m.dependencies?.includes(moduleCode) &&
      enabledModules.includes(m.code)
  ).map((m) => m.code);

  return {
    canDisable: dependents.length === 0,
    dependentModules: dependents,
  };
}
