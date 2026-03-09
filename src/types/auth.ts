/**
 * @fileoverview Tipos de Autenticación, Roles y Permisos
 * Sistema TMS Navitel — Control de acceso basado en roles (RBAC)
 *
 * JERARQUÍA DE 3 NIVELES (definida por la dirección):
 *
 *   Nivel 1 — Owner (Proveedor TMS / Super Administrador)
 *     Rol máximo del sistema. Pertenece a la compañía proveedora del TMS.
 *     Control total sobre TODOS los clientes (tenants).
 *     Puede crear cuentas, activar módulos, transferir unidades, etc.
 *
 *   Nivel 2 — Usuario Maestro (Client Admin / Account Admin)
 *     Administrador principal DENTRO de una cuenta cliente (tenant).
 *     Control total solo sobre su propia empresa.
 *     Crea subusuarios, asigna permisos, restringe visibilidad.
 *
 *   Nivel 3 — Subusuario (Operador / Usuario Operativo)
 *     Usuario operativo con permisos limitados definidos por el Usuario Maestro.
 *     Perfiles: gerente_operaciones, despachador, gerente_finanzas, gerente_flota,
 *              operador_monitoreo, conductor, auditor, empresa_cliente, operador_logistico.
 *
 * Estructura jerárquica:
 *   Owner (Proveedor TMS)
 *     └── Cuenta Cliente (Tenant)
 *           └── Usuario Maestro
 *                 └── Subusuarios
 */

import type { SystemModuleCode, UserScope } from "@/types/platform";

// ════════════════════════════════════════════════════════
// NIVELES JERÁRQUICOS (TIERS)
// ════════════════════════════════════════════════════════

/**
 * Nivel jerárquico del usuario en el sistema.
 * Define la capa de acceso del usuario según la estructura de la dirección.
 */
export type UserTier =
  | "platform"       // Nivel 1: Owner / Proveedor TMS → acceso cross-tenant
  | "tenant_admin"   // Nivel 2: Usuario Maestro / Client Admin → admin de su tenant
  | "tenant_user";   // Nivel 3: Subusuario / Operador → permisos limitados

// ════════════════════════════════════════════════════════
// ROLES
// ════════════════════════════════════════════════════════

/**
 * Roles de la plataforma — Nivel 1: Owner (Proveedor TMS)
 * Estos usuarios operan FUERA de un tenant específico.
 * Tienen acceso cross-tenant a todas las cuentas de clientes.
 */
export type PlatformRole =
  | "platform_owner"   // Super Administrador / Dueño del TMS
  | "platform_admin";  // Administrador de plataforma (soporte)

/**
 * Roles de Usuario Maestro — Nivel 2: Client Admin
 * Administradores principales dentro de una cuenta cliente.
 * Control total sobre su propio tenant.
 */
export type MasterUserRole =
  | "owner"   // Dueño / Gerente General de la cuenta (Usuario Maestro)
  | "admin";  // Co-administrador del tenant

/**
 * Roles de Subusuario — Nivel 3: Operador / Usuario Operativo
 * Usuarios con permisos limitados definidos por el Usuario Maestro.
 */
export type SubUserRole =
  | "gerente_operaciones"   // Jefe de Operaciones
  | "despachador"           // Coordinador / Despachador
  | "gerente_finanzas"      // Jefe de Finanzas / Contador
  | "gerente_flota"         // Jefe de Flota / Mantenimiento
  | "operador_monitoreo"    // Operador de Torre de Control
  | "conductor"             // Conductor / Chofer
  | "auditor";              // Auditor / Solo lectura

/**
 * Roles internos del sistema (personal de la empresa) — Nivel 2 + Nivel 3
 */
export type InternalRole = MasterUserRole | SubUserRole;

/**
 * Roles externos (acceso portal) — Nivel 3 (subusuarios con acceso externo)
 */
export type ExternalRole =
  | "empresa_cliente"       // Cliente con acceso al portal
  | "operador_logistico";   // Transportista / Operador tercero

/**
 * Todos los roles del sistema dentro de un tenant (excluye roles de plataforma)
 */
export type UserRole = InternalRole | ExternalRole;

/**
 * Todos los roles del sistema incluyendo plataforma
 */
export type AnyRole = PlatformRole | UserRole;

/**
 * Agrupación lógica de roles (útil para validaciones rápidas)
 */
export const ROLE_GROUPS = {
  // ── Por Nivel/Tier ──
  /** Nivel 1: Plataforma (Owner del TMS, acceso cross-tenant) */
  PLATFORM: ["platform_owner", "platform_admin"] as const,
  /** Nivel 2: Usuarios Maestros (Client Admin dentro de un tenant) */
  MASTER_USERS: ["owner", "admin"] as const,
  /** Nivel 3: Subusuarios (Operadores / Usuarios Operativos) */
  SUB_USERS: ["gerente_operaciones", "despachador", "gerente_finanzas", "gerente_flota", "operador_monitoreo", "conductor", "auditor"] as const,

  // ── Por Función ──
  /** Acceso total dentro del tenant (Usuarios Maestros) */
  SUPER: ["owner", "admin"] as const,
  /** Gestión operativa */
  OPERATIONS: ["owner", "admin", "gerente_operaciones", "despachador"] as const,
  /** Gestión financiera */
  FINANCE: ["owner", "admin", "gerente_finanzas"] as const,
  /** Gestión de flota */
  FLEET: ["owner", "admin", "gerente_flota"] as const,
  /** Monitoreo */
  MONITORING: ["owner", "admin", "gerente_operaciones", "despachador", "operador_monitoreo"] as const,
  /** Solo lectura general */
  READERS: ["owner", "admin", "gerente_operaciones", "despachador", "gerente_finanzas", "gerente_flota", "operador_monitoreo", "auditor"] as const,
  /** Pueden crear/gestionar usuarios (dentro del tenant) */
  USER_MANAGERS: ["owner", "admin"] as const,
  /** Pueden cambiar configuración de la cuenta */
  CONFIG_MANAGERS: ["owner", "admin"] as const,
  /** Internos (todos los de la empresa) */
  INTERNAL: ["owner", "admin", "gerente_operaciones", "despachador", "gerente_finanzas", "gerente_flota", "operador_monitoreo", "conductor", "auditor"] as const,
  /** Externos */
  EXTERNAL: ["empresa_cliente", "operador_logistico"] as const,
} as const;

// ════════════════════════════════════════════════════════
// PERMISOS
// ════════════════════════════════════════════════════════

/**
 * Recursos protegidos del sistema
 */
export type PermissionResource =
  // Operaciones
  | "orders"
  | "scheduling"
  | "workflows"
  | "incidents"
  | "bitacora"
  | "route_planner"
  // Monitoreo
  | "monitoring_control_tower"
  | "monitoring_retransmission"
  | "monitoring_historical"
  | "monitoring_multiwindow"
  | "monitoring_alerts"
  // Finanzas
  | "invoices"
  | "payments"
  | "costs"
  | "rates"
  | "finance_reports"
  | "settlements"
  // Mantenimiento
  | "work_orders"
  | "maintenance_schedules"
  | "inspections"
  | "parts_inventory"
  | "workshops"
  | "breakdowns"
  // Maestro
  | "customers"
  | "drivers"
  | "vehicles"
  | "operators"
  | "products"
  | "geofences"
  | "assignments"
  // Reportes
  | "reports"
  | "report_schedules"
  // Notificaciones
  | "notifications"
  | "notification_templates"
  // Configuración del tenant
  | "settings_general"
  | "settings_operations"
  | "settings_fleet"
  | "settings_finance"
  | "settings_notifications"
  | "settings_security"
  | "settings_appearance"
  | "roles"
  | "integrations"
  | "audit_log"
  // Gestión de usuarios (dentro del tenant)
  | "users"
  // Plataforma (Owner del TMS)
  | "platform_tenants"        // Gestión de cuentas de clientes
  | "platform_modules"        // Activar/desactivar módulos por tenant
  | "platform_transfers"      // Transferencia de unidades entre tenants
  | "platform_billing"        // Facturación de la plataforma
  | "platform_dashboard"      // Dashboard de plataforma
  | "platform_users"          // Gestión de usuarios de plataforma
  // Suscripción (vista del tenant)
  | "subscription"
  | "billing";

/**
 * Acciones CRUD + extras
 */
export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "export"
  | "import"
  | "approve"
  | "assign";

/**
 * Permiso individual
 */
export interface Permission {
  resource: PermissionResource;
  actions: PermissionAction[];
}

/**
 * Definición completa de un rol con metadatos
 */
export interface RoleDefinition {
  /** Código del rol */
  code: AnyRole;
  /** Nombre para mostrar */
  label: string;
  /** Descripción */
  description: string;
  /** Es un rol del sistema (no se puede eliminar) */
  isSystem: boolean;
  /** Nivel jerárquico (1 = más alto) */
  level: number;
  /** Categoría */
  category: "platform" | "internal" | "external";
  /** Tier / Capa al que pertenece este rol */
  tier: UserTier;
  /** Permisos del rol */
  permissions: Permission[];
  /** Restricciones explícitas del rol (lo que NO puede hacer) */
  restrictions?: string[];
}

// ════════════════════════════════════════════════════════
// USUARIO AUTENTICADO
// ════════════════════════════════════════════════════════

/**
 * Usuario del sistema con rol y permisos
 */
export interface AuthUser {
  /** ID único */
  id: string;
  /** Nombre completo */
  name: string;
  /** Email */
  email: string;
  /** Rol principal (dentro del tenant) */
  role: UserRole;
  /** Tier / nivel jerárquico del usuario */
  tier: UserTier;
  /** Avatar URL */
  avatar?: string;
  /** Teléfono */
  phone?: string;

  // ── Multi-tenant ──
  /** ID del tenant (multi-tenant). Vacío para usuarios de plataforma. */
  tenantId: string;
  /** Nombre de la empresa del tenant */
  tenantName: string;

  // ── Permisos y alcance ──
  /** Permisos efectivos (puede ser customizado por el Usuario Maestro) */
  permissions?: Permission[];
  /** Alcance/scope de visibilidad del usuario (definido por Usuario Maestro) */
  scope?: UserScope;
  /** Módulos habilitados para el tenant de este usuario */
  enabledModules?: SystemModuleCode[];

  // ── Estado ──
  /** Si el usuario está activo */
  isActive: boolean;
  /** Si debe cambiar contraseña en el próximo login (forzado por Owner/Admin) */
  forcePasswordChange?: boolean;
  /** Último login */
  lastLoginAt?: string;
  /** ID del usuario que creó este usuario */
  createdBy?: string;

  /** Preferencias del usuario */
  preferences?: UserPreferences;
}

/**
 * Usuario de plataforma (Owner / Admin del TMS).
 * Opera fuera de cualquier tenant con acceso cross-tenant.
 */
export interface PlatformUser {
  /** ID único */
  id: string;
  /** Nombre completo */
  name: string;
  /** Email */
  email: string;
  /** Rol de plataforma */
  role: PlatformRole;
  /** Siempre es tier platform */
  tier: "platform";
  /** Avatar URL */
  avatar?: string;
  /** Teléfono */
  phone?: string;
  /** Permisos de plataforma */
  permissions?: Permission[];
  /** Si está activo */
  isActive: boolean;
  /** Forzar cambio de contraseña */
  forcePasswordChange?: boolean;
  /** Último login */
  lastLoginAt?: string;
  /** Preferencias */
  preferences?: UserPreferences;
}

/**
 * Preferencias del usuario
 */
export interface UserPreferences {
  language: "es" | "en";
  timezone: string;
  theme: "light" | "dark" | "system";
  /** Módulo de inicio al hacer login */
  defaultModule?: string;
  /** Sidebar colapsado */
  sidebarCollapsed?: boolean;
}

// ════════════════════════════════════════════════════════
// DTOs DE AUTH
// ════════════════════════════════════════════════════════

/**
 * Payload de login
 */
export interface LoginDTO {
  email: string;
  password: string;
  /** Código de 2FA si está habilitado */
  twoFactorCode?: string;
  /** Recordar sesión */
  rememberMe?: boolean;
}

/**
 * Respuesta de login exitoso
 */
export interface LoginResponse {
  /** Usuario autenticado (tenant user o platform user) */
  user: AuthUser | PlatformUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // segundos
  /** Si requiere 2FA antes de continuar */
  requires2FA?: boolean;
  /** Si requiere cambio de contraseña antes de continuar */
  requiresPasswordChange?: boolean;
}

/**
 * Payload de registro (solo owner puede crear la empresa)
 */
export interface RegisterDTO {
  /** Datos de la empresa */
  company: {
    name: string;
    ruc: string;
    address: string;
    phone: string;
  };
  /** Datos del owner */
  user: {
    name: string;
    email: string;
    password: string;
    phone: string;
  };
}

/**
 * Payload para crear usuario dentro del tenant (Usuario Maestro crea subusuarios)
 */
export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  /** Permisos personalizados (si no se usa, hereda del rol) */
  customPermissions?: Permission[];
  /** Alcance/scope de visibilidad (restricción por unidades, grupos, etc.) */
  scope?: UserScope;
  /** Forzar cambio de contraseña en primer login */
  forcePasswordChange?: boolean;
}

/**
 * Payload para actualizar usuario
 */
export interface UpdateUserDTO {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: UserRole;
  isActive?: boolean;
  customPermissions?: Permission[];
  /** Actualizar alcance/scope de visibilidad */
  scope?: UserScope;
  /** Forzar cambio de contraseña en próximo login */
  forcePasswordChange?: boolean;
}

/**
 * Cambio de contraseña
 */
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Recuperación de contraseña
 */
export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// ════════════════════════════════════════════════════════
// DEFINICIÓN DE ROLES POR DEFECTO
// ════════════════════════════════════════════════════════

/**
 * Catálogo de roles del sistema con sus permisos predeterminados.
 *
 * ESTRUCTURA JERÁRQUICA (según definición de la dirección):
 *
 * NIVEL 1 — PLATAFORMA (Owner del TMS)
 *   platform_owner  → Super Administrador con acceso cross-tenant
 *   platform_admin  → Administrador de soporte de la plataforma
 *
 * NIVEL 2 — USUARIO MAESTRO (Client Admin dentro de un tenant)
 *   owner           → Dueño / Gerente General de la cuenta (Usuario Maestro)
 *   admin           → Co-administrador del tenant
 *
 * NIVEL 3 — SUBUSUARIOS (Operadores con permisos limitados)
 *   gerente_operaciones, despachador, gerente_finanzas, gerente_flota,
 *   operador_monitoreo, conductor, auditor, empresa_cliente, operador_logistico
 *
 * Convención de permisos:
 *   - "full" = ["create", "read", "update", "delete", "export", "import", "approve", "assign"]
 *   - "manage" = ["create", "read", "update", "delete"]
 *   - "read" = ["read"]
 *   - "read_export" = ["read", "export"]
 */
export const DEFAULT_ROLES: RoleDefinition[] = [

  // ═══════════════════════════════════════════════
  // NIVEL 1 — PLATAFORMA (Owner del TMS / Proveedor)
  // ═══════════════════════════════════════════════

  // ── PLATFORM OWNER (Super Administrador) ────────
  {
    code: "platform_owner",
    label: "Owner — Super Administrador TMS",
    description:
      "Rol máximo del sistema. Pertenece a la compañía proveedora del TMS. " +
      "Control total sobre TODOS los clientes (tenants): crear/editar/suspender/eliminar cuentas, " +
      "activar/desactivar módulos, transferir unidades, crear usuarios maestros, " +
      "resetear credenciales, acceso sin restricciones a todas las cuentas.",
    isSystem: true,
    level: 0,
    category: "platform",
    tier: "platform",
    permissions: [
      // Gestión de tenants (cuentas de clientes)
      { resource: "platform_tenants", actions: ["create", "read", "update", "delete"] },
      // Activar/desactivar módulos por tenant
      { resource: "platform_modules", actions: ["create", "read", "update", "delete"] },
      // Transferir unidades entre tenants
      { resource: "platform_transfers", actions: ["create", "read", "update", "delete", "approve"] },
      // Facturación de la plataforma
      { resource: "platform_billing", actions: ["create", "read", "update", "delete", "export"] },
      // Dashboard de plataforma
      { resource: "platform_dashboard", actions: ["read", "export"] },
      // Gestión de usuarios de plataforma
      { resource: "platform_users", actions: ["create", "read", "update", "delete"] },
      // Acceso total a todos los recursos de cualquier tenant
      { resource: "orders", actions: ["create", "read", "update", "delete", "export", "import", "approve", "assign"] },
      { resource: "scheduling", actions: ["create", "read", "update", "delete", "assign"] },
      { resource: "workflows", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "incidents", actions: ["create", "read", "update", "delete"] },
      { resource: "bitacora", actions: ["create", "read", "update", "delete"] },
      { resource: "route_planner", actions: ["create", "read", "update", "delete"] },
      { resource: "monitoring_control_tower", actions: ["read"] },
      { resource: "monitoring_retransmission", actions: ["read", "update"] },
      { resource: "monitoring_historical", actions: ["read", "export"] },
      { resource: "monitoring_multiwindow", actions: ["read"] },
      { resource: "monitoring_alerts", actions: ["create", "read", "update", "delete"] },
      { resource: "invoices", actions: ["create", "read", "update", "delete", "export", "approve"] },
      { resource: "payments", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "costs", actions: ["create", "read", "update", "delete"] },
      { resource: "rates", actions: ["create", "read", "update", "delete"] },
      { resource: "finance_reports", actions: ["read", "export"] },
      { resource: "settlements", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "work_orders", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "maintenance_schedules", actions: ["create", "read", "update", "delete"] },
      { resource: "inspections", actions: ["create", "read", "update", "delete"] },
      { resource: "parts_inventory", actions: ["create", "read", "update", "delete"] },
      { resource: "workshops", actions: ["create", "read", "update", "delete"] },
      { resource: "breakdowns", actions: ["create", "read", "update", "delete"] },
      { resource: "customers", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "drivers", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "vehicles", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "operators", actions: ["create", "read", "update", "delete"] },
      { resource: "products", actions: ["create", "read", "update", "delete"] },
      { resource: "geofences", actions: ["create", "read", "update", "delete"] },
      { resource: "assignments", actions: ["create", "read", "update", "delete"] },
      { resource: "reports", actions: ["create", "read", "update", "delete", "export"] },
      { resource: "report_schedules", actions: ["create", "read", "update", "delete"] },
      { resource: "notifications", actions: ["read", "update"] },
      { resource: "notification_templates", actions: ["create", "read", "update", "delete"] },
      { resource: "settings_general", actions: ["read", "update"] },
      { resource: "settings_operations", actions: ["read", "update"] },
      { resource: "settings_fleet", actions: ["read", "update"] },
      { resource: "settings_finance", actions: ["read", "update"] },
      { resource: "settings_notifications", actions: ["read", "update"] },
      { resource: "settings_security", actions: ["read", "update"] },
      { resource: "settings_appearance", actions: ["read", "update"] },
      { resource: "roles", actions: ["create", "read", "update", "delete"] },
      { resource: "users", actions: ["create", "read", "update", "delete"] },
      { resource: "integrations", actions: ["create", "read", "update", "delete"] },
      { resource: "audit_log", actions: ["read", "export"] },
      { resource: "subscription", actions: ["read", "update"] },
      { resource: "billing", actions: ["read", "update"] },
    ],
    restrictions: [],
  },

  // ── PLATFORM ADMIN (Soporte de plataforma) ──────
  {
    code: "platform_admin",
    label: "Administrador de Plataforma",
    description:
      "Administrador de soporte de la plataforma TMS. " +
      "Puede gestionar tenants, módulos y dar soporte. No puede eliminar cuentas ni gestionar facturación.",
    isSystem: true,
    level: 0,
    category: "platform",
    tier: "platform",
    permissions: [
      { resource: "platform_tenants", actions: ["create", "read", "update"] },
      { resource: "platform_modules", actions: ["read", "update"] },
      { resource: "platform_transfers", actions: ["create", "read", "update"] },
      { resource: "platform_dashboard", actions: ["read"] },
      { resource: "platform_users", actions: ["read"] },
      // Acceso de lectura a tenants para soporte
      { resource: "orders", actions: ["read"] },
      { resource: "vehicles", actions: ["read"] },
      { resource: "drivers", actions: ["read"] },
      { resource: "customers", actions: ["read"] },
      { resource: "users", actions: ["read", "update"] },
      { resource: "audit_log", actions: ["read", "export"] },
    ],
    restrictions: [
      "No puede eliminar cuentas de clientes",
      "No puede gestionar facturación de la plataforma",
      "No puede crear otros usuarios de plataforma",
    ],
  },

  // ═══════════════════════════════════════════════
  // NIVEL 2 — USUARIO MAESTRO (Client Admin)
  // ═══════════════════════════════════════════════

  // ── OWNER (Usuario Maestro) ─────────────────────
  {
    code: "owner",
    label: "Usuario Maestro — Dueño / Gerente General",
    description:
      "Administrador principal de la cuenta cliente (tenant). " +
      "Control total sobre su propia empresa: crear/editar/desactivar subusuarios, " +
      "asignar roles y permisos por módulo, asignar unidades por usuario, " +
      "restringir visibilidad por grupo/flota/geocerca. " +
      "Solo puede habilitar módulos previamente activados por el Owner de la plataforma.",
    isSystem: true,
    level: 1,
    category: "internal",
    tier: "tenant_admin",
    permissions: [
      // Operaciones
      { resource: "orders", actions: ["create", "read", "update", "delete", "export", "import", "approve", "assign"] },
      { resource: "scheduling", actions: ["create", "read", "update", "delete", "assign"] },
      { resource: "workflows", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "incidents", actions: ["create", "read", "update", "delete"] },
      { resource: "bitacora", actions: ["create", "read", "update", "delete"] },
      { resource: "route_planner", actions: ["create", "read", "update", "delete"] },
      // Monitoreo
      { resource: "monitoring_control_tower", actions: ["read"] },
      { resource: "monitoring_retransmission", actions: ["read", "update"] },
      { resource: "monitoring_historical", actions: ["read", "export"] },
      { resource: "monitoring_multiwindow", actions: ["read"] },
      { resource: "monitoring_alerts", actions: ["create", "read", "update", "delete"] },
      // Finanzas
      { resource: "invoices", actions: ["create", "read", "update", "delete", "export", "approve"] },
      { resource: "payments", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "costs", actions: ["create", "read", "update", "delete"] },
      { resource: "rates", actions: ["create", "read", "update", "delete"] },
      { resource: "finance_reports", actions: ["read", "export"] },
      { resource: "settlements", actions: ["create", "read", "update", "delete", "approve"] },
      // Mantenimiento
      { resource: "work_orders", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "maintenance_schedules", actions: ["create", "read", "update", "delete"] },
      { resource: "inspections", actions: ["create", "read", "update", "delete"] },
      { resource: "parts_inventory", actions: ["create", "read", "update", "delete"] },
      { resource: "workshops", actions: ["create", "read", "update", "delete"] },
      { resource: "breakdowns", actions: ["create", "read", "update", "delete"] },
      // Maestro
      { resource: "customers", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "drivers", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "vehicles", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "operators", actions: ["create", "read", "update", "delete"] },
      { resource: "products", actions: ["create", "read", "update", "delete"] },
      { resource: "geofences", actions: ["create", "read", "update", "delete"] },
      { resource: "assignments", actions: ["create", "read", "update", "delete"] },
      // Reportes
      { resource: "reports", actions: ["create", "read", "update", "delete", "export"] },
      { resource: "report_schedules", actions: ["create", "read", "update", "delete"] },
      // Notificaciones
      { resource: "notifications", actions: ["read", "update"] },
      { resource: "notification_templates", actions: ["create", "read", "update", "delete"] },
      // Configuración (total dentro de su tenant)
      { resource: "settings_general", actions: ["read", "update"] },
      { resource: "settings_operations", actions: ["read", "update"] },
      { resource: "settings_fleet", actions: ["read", "update"] },
      { resource: "settings_finance", actions: ["read", "update"] },
      { resource: "settings_notifications", actions: ["read", "update"] },
      { resource: "settings_security", actions: ["read", "update"] },
      { resource: "settings_appearance", actions: ["read", "update"] },
      // Gestión de roles y usuarios
      { resource: "roles", actions: ["create", "read", "update", "delete"] },
      { resource: "users", actions: ["create", "read", "update", "delete"] },
      { resource: "integrations", actions: ["create", "read", "update", "delete"] },
      { resource: "audit_log", actions: ["read", "export"] },
      // Vista de suscripción (solo lectura, la gestión la hace la plataforma)
      { resource: "subscription", actions: ["read"] },
      // NO billing (lo maneja la plataforma)
    ],
    restrictions: [
      "No puede crear nuevas cuentas de clientes (tenants)",
      "No puede activar módulos no contratados por la plataforma",
      "No puede transferir unidades entre tenants",
      "No puede visualizar datos de otras cuentas",
      "No puede gestionar facturación de la plataforma",
    ],
  },

  // ── ADMIN (Co-Administrador del Tenant) ─────────
  {
    code: "admin",
    label: "Co-Administrador del Sistema",
    description:
      "Co-administrador dentro de la cuenta cliente (tenant). " +
      "Mismo alcance que el Owner pero sin poder modificar la suscripción " +
      "ni eliminar la cuenta. Puede crear subusuarios y gestionar permisos.",
    isSystem: true,
    level: 2,
    category: "internal",
    tier: "tenant_admin",
    permissions: [
      // Operaciones
      { resource: "orders", actions: ["create", "read", "update", "delete", "export", "import", "approve", "assign"] },
      { resource: "scheduling", actions: ["create", "read", "update", "delete", "assign"] },
      { resource: "workflows", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "incidents", actions: ["create", "read", "update", "delete"] },
      { resource: "bitacora", actions: ["create", "read", "update", "delete"] },
      { resource: "route_planner", actions: ["create", "read", "update", "delete"] },
      // Monitoreo
      { resource: "monitoring_control_tower", actions: ["read"] },
      { resource: "monitoring_retransmission", actions: ["read", "update"] },
      { resource: "monitoring_historical", actions: ["read", "export"] },
      { resource: "monitoring_multiwindow", actions: ["read"] },
      { resource: "monitoring_alerts", actions: ["create", "read", "update", "delete"] },
      // Finanzas
      { resource: "invoices", actions: ["create", "read", "update", "delete", "export", "approve"] },
      { resource: "payments", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "costs", actions: ["create", "read", "update", "delete"] },
      { resource: "rates", actions: ["create", "read", "update", "delete"] },
      { resource: "finance_reports", actions: ["read", "export"] },
      { resource: "settlements", actions: ["create", "read", "update", "delete", "approve"] },
      // Mantenimiento
      { resource: "work_orders", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "maintenance_schedules", actions: ["create", "read", "update", "delete"] },
      { resource: "inspections", actions: ["create", "read", "update", "delete"] },
      { resource: "parts_inventory", actions: ["create", "read", "update", "delete"] },
      { resource: "workshops", actions: ["create", "read", "update", "delete"] },
      { resource: "breakdowns", actions: ["create", "read", "update", "delete"] },
      // Maestro
      { resource: "customers", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "drivers", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "vehicles", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "operators", actions: ["create", "read", "update", "delete"] },
      { resource: "products", actions: ["create", "read", "update", "delete"] },
      { resource: "geofences", actions: ["create", "read", "update", "delete"] },
      { resource: "assignments", actions: ["create", "read", "update", "delete"] },
      // Reportes
      { resource: "reports", actions: ["create", "read", "update", "delete", "export"] },
      { resource: "report_schedules", actions: ["create", "read", "update", "delete"] },
      // Notificaciones
      { resource: "notifications", actions: ["read", "update"] },
      { resource: "notification_templates", actions: ["create", "read", "update", "delete"] },
      // Configuración (todo excepto suscripción)
      { resource: "settings_general", actions: ["read", "update"] },
      { resource: "settings_operations", actions: ["read", "update"] },
      { resource: "settings_fleet", actions: ["read", "update"] },
      { resource: "settings_finance", actions: ["read", "update"] },
      { resource: "settings_notifications", actions: ["read", "update"] },
      { resource: "settings_security", actions: ["read", "update"] },
      { resource: "settings_appearance", actions: ["read", "update"] },
      // Gestión de roles y usuarios
      { resource: "roles", actions: ["create", "read", "update", "delete"] },
      { resource: "users", actions: ["create", "read", "update", "delete"] },
      { resource: "integrations", actions: ["create", "read", "update", "delete"] },
      { resource: "audit_log", actions: ["read", "export"] },
      // NO subscription / billing
    ],
    restrictions: [
      "No puede crear nuevas cuentas de clientes (tenants)",
      "No puede activar módulos no contratados",
      "No puede transferir unidades entre tenants",
      "No puede visualizar datos de otras cuentas",
      "No puede gestionar suscripción ni facturación",
      "No puede eliminar la cuenta / tenant",
    ],
  },

  // ═══════════════════════════════════════════════
  // NIVEL 3 — SUBUSUARIOS (Operadores / Usuarios Operativos)
  //
  // Permisos limitados definidos por el Usuario Maestro.
  // Restricciones comunes a todos los subusuarios:
  //   - No puede crear usuarios
  //   - No puede modificar estructura de permisos
  //   - No puede activar o desactivar módulos
  //   - No puede cambiar configuración de la cuenta
  // ═══════════════════════════════════════════════

  // ── GERENTE DE OPERACIONES ──────────────────────
  {
    code: "gerente_operaciones",
    label: "Gerente de Operaciones",
    description:
      "Subusuario — Supervisa toda la operación: órdenes, programación, monitoreo, bitácora, incidencias, rutas. Puede aprobar y asignar.",
    isSystem: true,
    level: 3,
    category: "internal",
    tier: "tenant_user",
    permissions: [
      { resource: "orders", actions: ["create", "read", "update", "delete", "export", "import", "approve", "assign"] },
      { resource: "scheduling", actions: ["create", "read", "update", "delete", "assign"] },
      { resource: "workflows", actions: ["read", "update", "approve"] },
      { resource: "incidents", actions: ["create", "read", "update", "delete"] },
      { resource: "bitacora", actions: ["create", "read", "update"] },
      { resource: "route_planner", actions: ["create", "read", "update", "delete"] },
      { resource: "monitoring_control_tower", actions: ["read"] },
      { resource: "monitoring_retransmission", actions: ["read", "update"] },
      { resource: "monitoring_historical", actions: ["read", "export"] },
      { resource: "monitoring_multiwindow", actions: ["read"] },
      { resource: "monitoring_alerts", actions: ["create", "read", "update", "delete"] },
      { resource: "customers", actions: ["read"] },
      { resource: "drivers", actions: ["read"] },
      { resource: "vehicles", actions: ["read"] },
      { resource: "operators", actions: ["read"] },
      { resource: "geofences", actions: ["read"] },
      { resource: "assignments", actions: ["create", "read", "update"] },
      { resource: "reports", actions: ["read", "export"] },
      { resource: "notifications", actions: ["read", "update"] },
    ],
    restrictions: [
      "No puede crear usuarios",
      "No puede modificar estructura de permisos",
      "No puede activar o desactivar módulos",
      "No puede cambiar configuración de la cuenta",
    ],
  },

  // ── DESPACHADOR ───────────────────────────────────
  {
    code: "despachador",
    label: "Despachador / Coordinador",
    description:
      "Subusuario — Gestión operativa del día a día: crea y programa órdenes, asigna recursos, monitorea flota.",
    isSystem: true,
    level: 4,
    category: "internal",
    tier: "tenant_user",
    permissions: [
      { resource: "orders", actions: ["create", "read", "update", "export", "import", "assign"] },
      { resource: "scheduling", actions: ["create", "read", "update", "assign"] },
      { resource: "workflows", actions: ["read", "update"] },
      { resource: "incidents", actions: ["create", "read", "update"] },
      { resource: "bitacora", actions: ["create", "read", "update"] },
      { resource: "route_planner", actions: ["create", "read", "update"] },
      { resource: "monitoring_control_tower", actions: ["read"] },
      { resource: "monitoring_retransmission", actions: ["read"] },
      { resource: "monitoring_historical", actions: ["read", "export"] },
      { resource: "monitoring_multiwindow", actions: ["read"] },
      { resource: "monitoring_alerts", actions: ["read"] },
      { resource: "customers", actions: ["read"] },
      { resource: "drivers", actions: ["read"] },
      { resource: "vehicles", actions: ["read"] },
      { resource: "operators", actions: ["read"] },
      { resource: "geofences", actions: ["read"] },
      { resource: "assignments", actions: ["create", "read", "update"] },
      { resource: "reports", actions: ["read", "export"] },
      { resource: "notifications", actions: ["read", "update"] },
    ],
    restrictions: [
      "No puede crear usuarios",
      "No puede modificar estructura de permisos",
      "No puede activar o desactivar módulos",
      "No puede cambiar configuración de la cuenta",
    ],
  },

  // ── GERENTE DE FINANZAS ─────────────────────────
  {
    code: "gerente_finanzas",
    label: "Gerente de Finanzas / Contador",
    description:
      "Gestión financiera completa: facturación, cobros, costos, tarifas, reportes financieros.",
    isSystem: true,
    level: 4,
    category: "internal",
    tier: "tenant_user",
    permissions: [
      { resource: "invoices", actions: ["create", "read", "update", "delete", "export", "approve"] },
      { resource: "payments", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "costs", actions: ["create", "read", "update", "delete", "export"] },
      { resource: "rates", actions: ["create", "read", "update", "delete"] },
      { resource: "finance_reports", actions: ["read", "export"] },
      { resource: "orders", actions: ["read"] },
      { resource: "customers", actions: ["read"] },
      { resource: "reports", actions: ["read", "export"] },
      { resource: "report_schedules", actions: ["create", "read", "update", "delete"] },
      { resource: "settings_finance", actions: ["read", "update"] },
      { resource: "notifications", actions: ["read", "update"] },
      { resource: "settlements", actions: ["create", "read", "update", "delete", "approve"] },
    ],
    restrictions: [
      "No puede crear usuarios",
      "No puede modificar estructura de permisos",
      "No puede activar o desactivar módulos",
      "No puede cambiar configuración de la cuenta",
    ],
  },

  // ── GERENTE DE FLOTA ────────────────────────────
  {
    code: "gerente_flota",
    label: "Gerente de Flota / Mantenimiento",
    description:
      "Subusuario — Gestión de flota vehicular: vehículos, conductores, mantenimiento, inspecciones, inventario de repuestos.",
    isSystem: true,
    level: 4,
    category: "internal",
    tier: "tenant_user",
    permissions: [
      { resource: "vehicles", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "drivers", actions: ["create", "read", "update", "delete", "export", "import"] },
      { resource: "work_orders", actions: ["create", "read", "update", "delete", "approve"] },
      { resource: "maintenance_schedules", actions: ["create", "read", "update", "delete"] },
      { resource: "inspections", actions: ["create", "read", "update", "delete"] },
      { resource: "parts_inventory", actions: ["create", "read", "update", "delete"] },
      { resource: "workshops", actions: ["create", "read", "update", "delete"] },
      { resource: "breakdowns", actions: ["create", "read", "update", "delete"] },
      { resource: "operators", actions: ["read"] },
      { resource: "assignments", actions: ["create", "read", "update"] },
      { resource: "reports", actions: ["read", "export"] },
      { resource: "settings_fleet", actions: ["read", "update"] },
      { resource: "notifications", actions: ["read", "update"] },
    ],
    restrictions: [
      "No puede crear usuarios",
      "No puede modificar estructura de permisos",
      "No puede activar o desactivar módulos",
      "No puede cambiar configuración de la cuenta",
    ],
  },

  // ── OPERADOR DE MONITOREO ───────────────────
  {
    code: "operador_monitoreo",
    label: "Operador de Torre de Control",
    description:
      "Subusuario — Monitoreo en tiempo real de la flota: torre de control, retransmisión, rastreo histórico, multiventana, alertas.",
    isSystem: true,
    level: 5,
    category: "internal",
    tier: "tenant_user",
    permissions: [
      { resource: "monitoring_control_tower", actions: ["read"] },
      { resource: "monitoring_retransmission", actions: ["read", "update"] },
      { resource: "monitoring_historical", actions: ["read", "export"] },
      { resource: "monitoring_multiwindow", actions: ["read"] },
      { resource: "monitoring_alerts", actions: ["read", "update"] },
      { resource: "orders", actions: ["read"] },
      { resource: "bitacora", actions: ["create", "read", "update"] },
      { resource: "vehicles", actions: ["read"] },
      { resource: "drivers", actions: ["read"] },
      { resource: "geofences", actions: ["read"] },
      { resource: "notifications", actions: ["read", "update"] },
    ],
    restrictions: [
      "No puede crear usuarios",
      "No puede modificar estructura de permisos",
      "No puede activar o desactivar módulos",
      "No puede cambiar configuración de la cuenta",
    ],
  },

  // ── CONDUCTOR ───────────────────────────────
  {
    code: "conductor",
    label: "Conductor / Chofer",
    description:
      "Subusuario — Acceso limitado: solo sus órdenes asignadas, puede reportar incidencias, registrar eventos y cargar documentos.",
    isSystem: true,
    level: 6,
    category: "internal",
    tier: "tenant_user",
    permissions: [
      // Solo sus órdenes asignadas (filtro: driverId = userId)
      { resource: "orders", actions: ["read", "update"] },
      { resource: "incidents", actions: ["create", "read"] },
      { resource: "bitacora", actions: ["create", "read"] },
      { resource: "notifications", actions: ["read", "update"] },
    ],
    restrictions: [
      "No puede crear usuarios",
      "No puede modificar estructura de permisos",
      "No puede activar o desactivar módulos",
      "No puede cambiar configuración de la cuenta",
      "Solo puede ver sus órdenes asignadas (filtro: driverId = userId)",
    ],
  },

  // ── AUDITOR ─────────────────────────────────
  {
    code: "auditor",
    label: "Auditor / Solo Lectura",
    description:
      "Subusuario — Acceso de solo lectura a todos los módulos para auditoría y cumplimiento.",
    isSystem: true,
    level: 7,
    category: "internal",
    tier: "tenant_user",
    permissions: [
      { resource: "orders", actions: ["read", "export"] },
      { resource: "scheduling", actions: ["read"] },
      { resource: "workflows", actions: ["read"] },
      { resource: "incidents", actions: ["read"] },
      { resource: "bitacora", actions: ["read"] },
      { resource: "route_planner", actions: ["read"] },
      { resource: "monitoring_control_tower", actions: ["read"] },
      { resource: "monitoring_retransmission", actions: ["read"] },
      { resource: "monitoring_historical", actions: ["read", "export"] },
      { resource: "monitoring_multiwindow", actions: ["read"] },
      { resource: "monitoring_alerts", actions: ["read"] },
      { resource: "invoices", actions: ["read", "export"] },
      { resource: "payments", actions: ["read"] },
      { resource: "costs", actions: ["read", "export"] },
      { resource: "rates", actions: ["read"] },
      { resource: "finance_reports", actions: ["read", "export"] },
      { resource: "work_orders", actions: ["read"] },
      { resource: "maintenance_schedules", actions: ["read"] },
      { resource: "inspections", actions: ["read"] },
      { resource: "parts_inventory", actions: ["read"] },
      { resource: "workshops", actions: ["read"] },
      { resource: "breakdowns", actions: ["read"] },
      { resource: "customers", actions: ["read"] },
      { resource: "drivers", actions: ["read"] },
      { resource: "vehicles", actions: ["read"] },
      { resource: "operators", actions: ["read"] },
      { resource: "products", actions: ["read"] },
      { resource: "geofences", actions: ["read"] },
      { resource: "assignments", actions: ["read"] },
      { resource: "reports", actions: ["read", "export"] },
      { resource: "report_schedules", actions: ["read"] },
      { resource: "notifications", actions: ["read"] },
      { resource: "audit_log", actions: ["read", "export"] },
      { resource: "settlements", actions: ["read", "export"] },
    ],
    restrictions: [
      "No puede crear usuarios",
      "No puede modificar estructura de permisos",
      "No puede activar o desactivar módulos",
      "No puede cambiar configuración de la cuenta",
      "Solo lectura en todos los módulos",
    ],
  },

  // ── EMPRESA CLIENTE (EXTERNO) ───────────────
  {
    code: "empresa_cliente",
    label: "Cliente (Portal Externo)",
    description:
      "Subusuario externo — Portal de clientes: ve sus órdenes, facturas y reportes filtrados por su empresa.",
    isSystem: true,
    level: 8,
    category: "external",
    tier: "tenant_user",
    permissions: [
      // Filtrado por customerId del tenant externo
      { resource: "orders", actions: ["read"] },
      { resource: "invoices", actions: ["read"] },
      { resource: "monitoring_control_tower", actions: ["read"] },
      { resource: "reports", actions: ["read"] },
      { resource: "notifications", actions: ["read", "update"] },
    ],
    restrictions: [
      "No puede crear usuarios",
      "No puede modificar estructura de permisos",
      "No puede activar o desactivar módulos",
      "No puede cambiar configuración de la cuenta",
      "Solo ve datos filtrados por su empresa (customerId)",
    ],
  },

  // ── OPERADOR LOGÍSTICO (EXTERNO) ────────────
  {
    code: "operador_logistico",
    label: "Operador Logístico (Tercero)",
    description:
      "Subusuario externo — Transportista o socio externo: accede a órdenes asignadas, actualiza estados de entrega.",
    isSystem: true,
    level: 8,
    category: "external",
    tier: "tenant_user",
    permissions: [
      // Filtrado por carrierId del operador
      { resource: "orders", actions: ["read", "update"] },
      { resource: "monitoring_control_tower", actions: ["read"] },
      { resource: "drivers", actions: ["read"] },
      { resource: "vehicles", actions: ["read"] },
      { resource: "notifications", actions: ["read", "update"] },
    ],
    restrictions: [
      "No puede crear usuarios",
      "No puede modificar estructura de permisos",
      "No puede activar o desactivar módulos",
      "No puede cambiar configuración de la cuenta",
      "Solo ve órdenes filtradas por su empresa (carrierId)",
    ],
  },
];

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════

/**
 * Verifica si un rol tiene acceso a una acción sobre un recurso.
 * Soporta tanto roles de tenant como roles de plataforma.
 */
export function hasPermission(
  role: AnyRole,
  resource: PermissionResource,
  action: PermissionAction,
  customPermissions?: Permission[]
): boolean {
  // Si hay permisos personalizados, usar esos
  const permissions =
    customPermissions ??
    DEFAULT_ROLES.find((r) => r.code === role)?.permissions ??
    [];

  const perm = permissions.find((p) => p.resource === resource);
  return perm ? perm.actions.includes(action) : false;
}

/**
 * Verifica si un rol pertenece a un grupo
 */
export function isInGroup(
  role: AnyRole,
  group: keyof typeof ROLE_GROUPS
): boolean {
  return (ROLE_GROUPS[group] as readonly string[]).includes(role);
}

/**
 * Obtiene la definición completa de un rol
 */
export function getRoleDefinition(role: AnyRole): RoleDefinition | undefined {
  return DEFAULT_ROLES.find((r) => r.code === role);
}

/**
 * Verifica si un rol puede gestionar a otro (jerarquía)
 */
export function canManageRole(managerRole: AnyRole, targetRole: AnyRole): boolean {
  const manager = DEFAULT_ROLES.find((r) => r.code === managerRole);
  const target = DEFAULT_ROLES.find((r) => r.code === targetRole);
  if (!manager || !target) return false;
  return manager.level < target.level;
}

/**
 * Determina el tier de un rol
 */
export function getUserTier(role: AnyRole): UserTier {
  const def = DEFAULT_ROLES.find((r) => r.code === role);
  return def?.tier ?? "tenant_user";
}

/**
 * Verifica si un rol es de nivel plataforma (Owner del TMS)
 */
export function isPlatformRole(role: AnyRole): role is PlatformRole {
  return role === "platform_owner" || role === "platform_admin";
}

/**
 * Verifica si un rol es de nivel Usuario Maestro (Client Admin)
 */
export function isMasterUserRole(role: AnyRole): role is MasterUserRole {
  return role === "owner" || role === "admin";
}

/**
 * Verifica si un rol es de nivel Subusuario
 */
export function isSubUserRole(role: AnyRole): boolean {
  const def = DEFAULT_ROLES.find((r) => r.code === role);
  return def?.tier === "tenant_user";
}

/**
 * Verifica si un usuario puede crear otros usuarios.
 * Solo los Usuarios Maestros (owner, admin) y la Plataforma pueden.
 */
export function canCreateUsers(role: AnyRole): boolean {
  return isPlatformRole(role) || isMasterUserRole(role);
}

/**
 * Verifica si un usuario puede modificar la configuración de la cuenta.
 * Solo los Usuarios Maestros (owner, admin) pueden.
 */
export function canModifyAccountConfig(role: AnyRole): boolean {
  return isPlatformRole(role) || isMasterUserRole(role);
}

/**
 * Verifica si un usuario puede gestionar módulos del tenant.
 * Solo el Owner de la plataforma puede activar/desactivar módulos.
 */
export function canManageModules(role: AnyRole): boolean {
  return role === "platform_owner" || role === "platform_admin";
}

/**
 * Verifica si un usuario puede transferir unidades entre tenants.
 * Solo el Owner de la plataforma puede.
 */
export function canTransferVehicles(role: AnyRole): boolean {
  return role === "platform_owner";
}

/**
 * Obtiene los roles que un usuario puede asignar a otros.
 * Un usuario solo puede asignar roles de nivel inferior al suyo.
 * El Usuario Maestro solo puede crear Subusuarios.
 * La Plataforma puede crear Usuarios Maestros.
 */
export function getAssignableRoles(currentRole: AnyRole): RoleDefinition[] {
  const currentDef = DEFAULT_ROLES.find((r) => r.code === currentRole);
  if (!currentDef) return [];

  return DEFAULT_ROLES.filter((r) => {
    // Plataforma puede crear usuarios maestros y subusuarios
    if (isPlatformRole(currentRole)) {
      return r.tier !== "platform"; // Todo menos otros platform
    }
    // Usuario Maestro solo puede crear subusuarios
    if (isMasterUserRole(currentRole)) {
      return r.tier === "tenant_user" && r.level > currentDef.level;
    }
    // Subusuarios no pueden crear a nadie
    return false;
  });
}

/**
 * Obtiene las restricciones de un rol
 */
export function getRoleRestrictions(role: AnyRole): string[] {
  const def = DEFAULT_ROLES.find((r) => r.code === role);
  return def?.restrictions ?? [];
}
