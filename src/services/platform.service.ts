/**
 * @fileoverview Platform Service — Gestión de la plataforma TMS (Nivel 1)
 *
 * Operaciones exclusivas del Owner/Admin de la plataforma:
 *   - Gestión de tenants (cuentas de clientes)
 *   - Activación/desactivación de módulos por tenant
 *   - Transferencia de unidades entre tenants
 *   - Dashboard de plataforma
 *   - Forzar reset de contraseñas
 *   - Creación de usuarios maestros
 *
 * ⚠️ MÓDULO PENDIENTE DE BACKEND (verificado 2026-05-03)
 *
 * Todos los endpoints `/platform/*` que este service llama NO están en el
 * Excel oficial NI implementados en producción. Sin embargo, este módulo
 * tiene 6 páginas activas en `app/(dashboard)/platform/`:
 *   - tenants (list/detail), modules, activity, transfers, page.tsx
 *
 * El backend debe implementar todo este módulo. Mientras tanto:
 *  - Los métodos siguen llamando a los paths esperados.
 *  - El hook `usePlatform` debe manejar el 404 con `isBackendNotImplemented`.
 *  - Las páginas deben mostrar estado "módulo pendiente del backend" en lugar
 *    de error de carga genérico.
 *
 * Ver `otros/docs-backend/...-platform-...` para detalle del contrato.
 */

import { apiClient } from "@/lib/api";
import type { PaginatedResponse, SearchParams } from "@/types/common";
import type {
  Tenant,
  TenantModuleConfig,
  VehicleTransferRequest,
  PlatformDashboard,
  PlatformActivityLog,
  CreateTenantDTO,
  UpdateTenantDTO,
  SuspendTenantDTO,
  RenewSubscriptionDTO,
  CreateMasterUserDTO,
  UpdateTenantModulesDTO,
  CreateVehicleTransferDTO,
  ForcePasswordResetDTO,
  FleetGroup,
  SystemModuleCode,
} from "@/types/platform";
import type { AuthUser } from "@/types/auth";
import { snakeToCamel } from "@/lib/case-converter";

/**
 * Convierte SearchParams en params compatibles con RequestOptions
 */
function toRequestParams(
  params?: SearchParams
): Record<string, string | number | boolean | undefined> | undefined {
  if (!params) return undefined;
  const { filters, ...rest } = params;
  const result: Record<string, string | number | boolean | undefined> = { ...rest };
  // Flatten filters into query params
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      result[`filter_${key}`] = value;
    }
  }
  return result;
}

/**
 * 2026-05-03 (UI bug fix): el backend de platform devuelve los campos en
 * snake_case (`tenant_id`, `created_at`, `is_active`, `subscription_plan`,
 * etc. — 24 campos snake en /platform/tenants). Aplicamos snakeToCamel.
 */
async function getCamel<T>(url: string, opts?: Parameters<typeof apiClient.get>[1]): Promise<T> {
  const raw = await apiClient.get<unknown>(url, opts);
  return snakeToCamel<T>(raw);
}

/**
 * 2026-05-07 (verificado empiricamente): el backend devuelve el listado de
 * tenants envuelto como `{ data: [...] }`, NO como `{ items: [], pagination: {} }`
 * que espera el frontend. Ademas usa columnas distintas:
 *   - backend `company_name` → frontend `name`
 *   - backend `ruc` → frontend `taxId`
 *   - backend `is_trial_active` (TINYINT 0/1) → frontend `isTrialActive` (boolean)
 *
 * Este mapper normaliza el shape para mantener el contrato del frontend
 * mientras el backend se uniformiza.
 */
function mapBackendTenant(raw: unknown): Tenant {
  const r = (raw ?? {}) as Record<string, unknown>;
  // El backend devuelve `company_name`/`ruc`. snakeToCamel los convierte a
  // `companyName`/`ruc` (ruc se queda igual). Nosotros los aplanamos a `name`/`taxId`.
  const name = (r.name as string) ?? (r.companyName as string) ?? (r.tradeName as string) ?? "";
  const taxId = (r.taxId as string) ?? (r.ruc as string) ?? "";
  // is_trial_active viene como 0/1 (TINYINT). Coerce a boolean.
  const isTrialActive = Boolean(r.isTrialActive);

  return {
    id: (r.id as string) ?? "",
    code: (r.code as string) ?? "",
    name,
    legalName: (r.legalName as string) ?? (r.tradeName as string) ?? name,
    taxId,
    status: ((r.status as string) ?? "active") as Tenant["status"],
    address: (r.address as string) ?? "",
    city: (r.city as string) ?? "",
    state: r.state as string | undefined,
    country: (r.country as string) ?? "PE",
    postalCode: r.postalCode as string | undefined,
    phone: (r.phone as string) ?? "",
    email: (r.email as string) ?? "",
    website: r.website as string | undefined,
    logo: r.logoUrl as string | undefined,
    plan: ((r.plan as string) ?? "starter") as Tenant["plan"],
    subscriptionStartDate: (r.subscriptionStartDate as string) ?? "",
    subscriptionEndDate: r.subscriptionEndDate as string | undefined,
    isTrialActive,
    trialEndDate: r.trialEndDate as string | undefined,
    maxUsers: (r.maxUsers as number) ?? 0,
    maxVehicles: (r.maxVehicles as number) ?? 0,
    currentUsersCount: (r.currentUsersCount as number) ?? (r.usage as { users?: number } | undefined)?.users ?? 0,
    currentVehiclesCount: (r.currentVehiclesCount as number) ?? (r.usage as { vehicles?: number } | undefined)?.vehicles ?? 0,
    enabledModules: (r.modules as Tenant["enabledModules"]) ?? (r.enabledModules as Tenant["enabledModules"]) ?? [],
    masterUserId: r.masterUserId as string | undefined,
    masterUserName: r.masterUserName as string | undefined,
    masterUserEmail: r.masterUserEmail as string | undefined,
    timezone: (r.timezone as string) ?? "America/Lima",
    defaultCurrency: (r.defaultCurrency as string) ?? "PEN",
    defaultLanguage: ((r.defaultLanguage as string) ?? "es") as Tenant["defaultLanguage"],
    createdAt: (r.createdAt as string) ?? "",
    updatedAt: (r.updatedAt as string) ?? "",
    createdBy: (r.createdBy as string) ?? "",
    suspensionReason: r.suspensionReason as string | undefined,
    suspendedAt: r.suspendedAt as string | undefined,
    internalNotes: r.internalNotes as string | undefined,
  };
}

/**
 * 2026-05-07 (verificado empiricamente): TODOS los listados del backend de
 * `/platform/*` devuelven `{ data: [...] }` SIN envelope `pagination/meta`.
 * El frontend espera `PaginatedResponse<T> = { items, pagination }`.
 *
 * Este helper normaliza la respuesta para mantener el contrato del frontend.
 * Acepta:
 *   - { data: [...] }                     (forma actual del backend)
 *   - { items: [...] }                    (envelope tradicional)
 *   - [...]                               (array directo)
 *   - { data: [...], meta: {...} }        (envelope completo si el backend lo agrega)
 *   - { items: [...], pagination: {...} } (forma esperada por el frontend)
 */
function normalizePaginated<T>(
  raw: unknown,
  mapItem: (item: unknown) => T,
  fallbackPage = 1,
  fallbackPageSize = 20,
): PaginatedResponse<T> {
  const r = (raw ?? {}) as {
    data?: unknown;
    items?: unknown;
    meta?: { total?: number; page?: number; pageSize?: number; totalPages?: number };
    pagination?: { total?: number; page?: number; pageSize?: number; totalPages?: number };
  };

  let rawList: unknown[] = [];
  if (Array.isArray(raw)) {
    rawList = raw;
  } else if (Array.isArray(r.items)) {
    rawList = r.items;
  } else if (Array.isArray(r.data)) {
    rawList = r.data;
  }

  const items = rawList.map(mapItem);
  const meta = r.meta ?? r.pagination ?? {};
  const page = meta.page ?? fallbackPage;
  const pageSize = meta.pageSize ?? fallbackPageSize;
  const totalItems = meta.total ?? items.length;
  const totalPages = meta.totalPages ?? Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Helper para responses singulares envueltas en `{ data: {...} }`.
 */
function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && "data" in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

// ════════════════════════════════════════════════════════
// TENANTS
// ════════════════════════════════════════════════════════

export const tenantService = {
  /**
   * Lista todos los tenants con paginación.
   *
   * 2026-05-07: el backend responde con shape `{ data: [...] }` sin envelope.
   */
  async getAll(params?: SearchParams): Promise<PaginatedResponse<Tenant>> {
    const raw = await getCamel<unknown>("/platform/tenants", { params: toRequestParams(params) });
    return normalizePaginated<Tenant>(raw, mapBackendTenant, params?.page, params?.pageSize);
  },

  /**
   * Obtiene un tenant por ID. Backend responde con `{ data: {...} }`.
   */
  async getById(id: string): Promise<Tenant> {
    const raw = await getCamel<unknown>(`/platform/tenants/${id}`);
    return mapBackendTenant(unwrapData<unknown>(raw));
  },

  /**
   * Crea un nuevo tenant (cuenta de cliente).
   *
   * Body en camelCase (segun handoff doc 4.3.4): `code`, `name`, `legalName`,
   * `taxId`, `subscriptionMonths`, `enableTrial`, `maxUsers`, `maxVehicles`,
   * `enabledModules`, `defaultCurrency`, `defaultLanguage`, etc.
   *
   * Response: el backend devuelve el tenant con campos snake_case → se aplica
   * snakeToCamel + mapBackendTenant para entregar el Tenant del frontend.
   *
   * Endpoint: POST /platform/tenants
   */
  async create(data: CreateTenantDTO): Promise<Tenant> {
    const raw = await apiClient.post<unknown>("/platform/tenants", data);
    const camel = snakeToCamel<unknown>(raw);
    return mapBackendTenant(unwrapData<unknown>(camel));
  },

  /**
   * Actualiza un tenant existente.
   * Body en camelCase (mismas convenciones que POST).
   * Endpoint: PUT /platform/tenants/:id
   */
  async update(id: string, data: UpdateTenantDTO): Promise<Tenant> {
    const raw = await apiClient.put<unknown>(`/platform/tenants/${id}`, data);
    const camel = snakeToCamel<unknown>(raw);
    return mapBackendTenant(unwrapData<unknown>(camel));
  },

  /**
   * Suspende un tenant
   */
  async suspend(id: string, data: SuspendTenantDTO): Promise<Tenant> {
    return apiClient.post<Tenant>(`/platform/tenants/${id}/suspend`, data);
  },

  /**
   * Reactiva un tenant suspendido
   */
  async reactivate(id: string): Promise<Tenant> {
    return apiClient.post<Tenant>(`/platform/tenants/${id}/reactivate`);
  },

  /**
   * 2026-05-07: Renueva / extiende la suscripcion de un tenant.
   *
   * Endpoint: POST /platform/tenants/:id/renew
   *
   * Backend (pendiente de implementar) debe:
   *  - Si mode='extend': nueva fecha = MAX(NOW(), subscription_end_date) + months
   *  - Si mode='set_date': subscription_end_date = customEndDate
   *  - Si plan/maxUsers/maxVehicles vienen → actualizar
   *  - Cambiar status de 'suspended'/'trial' a 'active'
   *  - INSERT INTO platform_activity_log (action='subscription.renewed', details JSON)
   *  - Si notifyMasterUser → enviar email al master_user
   *  - Retornar 200 con tenant actualizado
   */
  async renew(id: string, data: RenewSubscriptionDTO): Promise<Tenant> {
    const raw = await apiClient.post<unknown>(`/platform/tenants/${id}/renew`, data);
    const camel = snakeToCamel<unknown>(raw);
    return mapBackendTenant(unwrapData<unknown>(camel));
  },

  /**
   * Elimina un tenant (solo platform_owner)
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/platform/tenants/${id}`);
  },
};

// ════════════════════════════════════════════════════════
// MÓDULOS POR TENANT
// ════════════════════════════════════════════════════════

export const tenantModuleService = {
  /**
   * Obtiene los módulos configurados de un tenant.
   * 2026-05-07: backend responde con `{ data: [...] }`.
   */
  async getByTenant(tenantId: string): Promise<TenantModuleConfig[]> {
    const raw = await getCamel<unknown>(`/platform/tenants/${tenantId}/modules`);
    const inner = unwrapData<unknown>(raw);
    return Array.isArray(inner) ? (inner as TenantModuleConfig[]) : [];
  },

  /**
   * Actualiza los módulos de un tenant (activar/desactivar).
   * 2026-05-07: backend responde con `{ data: [...] }`.
   */
  async updateModules(tenantId: string, data: UpdateTenantModulesDTO): Promise<TenantModuleConfig[]> {
    const raw = await apiClient.put<unknown>(`/platform/tenants/${tenantId}/modules`, data);
    const camel = snakeToCamel<unknown>(raw);
    const inner = unwrapData<unknown>(camel);
    return Array.isArray(inner) ? (inner as TenantModuleConfig[]) : [];
  },

  /**
   * Verifica si un módulo está activo para un tenant
   */
  async isModuleEnabled(tenantId: string, moduleCode: SystemModuleCode): Promise<boolean> {
    const result = await getCamel<{ enabled: boolean }>(
      `/platform/tenants/${tenantId}/modules/${moduleCode}/status`
    );
    return result.enabled;
  },
};

// ════════════════════════════════════════════════════════
// USUARIOS DE PLATAFORMA (Owner / Admin del TMS)
// ════════════════════════════════════════════════════════

/**
 * Item devuelto por GET /platform/users.
 * Shape REAL del backend (2026-05-12), snake_case → camelCase aplicado por consumidor.
 */
export interface PlatformUserItem {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string; // "platform_owner" | "platform_admin" | "owner" (legacy) | "despachador" (legacy del root tenant) | ...
  status: "active" | "inactive" | "suspended" | "pending";
  lastLoginAt: string | null;
  createdAt: string;
  permissions: string[];
}

/**
 * Convierte item raw del backend (snake_case) al shape del frontend (camelCase).
 */
function mapBackendPlatformUser(raw: unknown): PlatformUserItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    tenantId: String(r.tenant_id ?? r.tenantId ?? ""),
    username: String(r.username ?? ""),
    email: String(r.email ?? ""),
    firstName: (r.first_name ?? r.firstName ?? null) as string | null,
    lastName: (r.last_name ?? r.lastName ?? null) as string | null,
    role: String(r.role ?? ""),
    status: ((r.status as string) ?? "active") as PlatformUserItem["status"],
    lastLoginAt: (r.last_login_at ?? r.lastLoginAt ?? null) as string | null,
    createdAt: String(r.created_at ?? r.createdAt ?? ""),
    permissions: Array.isArray(r.permissions) ? (r.permissions as string[]) : [],
  };
}

/**
 * Payload para crear platform user.
 * El backend acepta snake_case Y camelCase indistintamente para los nombres.
 */
export interface CreatePlatformUserDTO {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: "platform_owner" | "platform_admin";
  phone?: string;
  permissions?: string[];
}

export interface UpdatePlatformUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: "platform_owner" | "platform_admin";
  status?: "active" | "inactive";
  permissions?: string[];
}

/**
 * Convierte UpdatePlatformUserDTO (camelCase) al shape snake_case que el
 * handoff documenta para PUT /platform/users/:id.
 */
function toBackendUpdatePayload(
  data: UpdatePlatformUserDTO,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.email !== undefined) payload.email = data.email;
  if (data.firstName !== undefined) payload.first_name = data.firstName;
  if (data.lastName !== undefined) payload.last_name = data.lastName;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.role !== undefined) payload.role = data.role;
  if (data.permissions !== undefined) payload.permissions = data.permissions;
  if (data.status !== undefined) payload.status = data.status;
  return payload;
}

export const platformUserService = {
  /**
   * Lista usuarios de plataforma (Owner + Admin del TMS).
   * Endpoint: GET /api/v1/platform/users
   * Response: `{data:[...], meta:{...}}` (snake_case → camelCase).
   */
  async getAll(params?: SearchParams): Promise<PaginatedResponse<PlatformUserItem>> {
    const raw = await apiClient.get<unknown>("/platform/users", {
      params: toRequestParams(params),
    });
    return normalizePaginated<PlatformUserItem>(
      raw,
      mapBackendPlatformUser,
      params?.page,
      params?.pageSize,
    );
  },

  /**
   * Obtiene un usuario de plataforma por id.
   * Endpoint: GET /api/v1/platform/users/:id
   */
  async getById(id: string): Promise<PlatformUserItem> {
    const raw = await apiClient.get<unknown>(`/platform/users/${id}`);
    return mapBackendPlatformUser(unwrapData<unknown>(raw));
  },

  /**
   * Crea un platform user. Solo `platform_owner` puede invocarlo.
   * Endpoint: POST /api/v1/platform/users
   */
  async create(data: CreatePlatformUserDTO): Promise<PlatformUserItem> {
    const raw = await apiClient.post<unknown>("/platform/users", data);
    return mapBackendPlatformUser(unwrapData<unknown>(raw));
  },

  /**
   * Actualiza un platform user. Body en snake_case.
   * Endpoint: PUT /api/v1/platform/users/:id
   */
  async update(id: string, data: UpdatePlatformUserDTO): Promise<PlatformUserItem> {
    const payload = toBackendUpdatePayload(data);
    const raw = await apiClient.put<unknown>(`/platform/users/${id}`, payload);
    return mapBackendPlatformUser(unwrapData<unknown>(raw));
  },

  /**
   * Activa o desactiva un platform user.
   * Endpoint: PUT /api/v1/platform/users/:id con `{status}`
   */
  async toggleStatus(id: string, status: "active" | "inactive"): Promise<PlatformUserItem> {
    return this.update(id, { status });
  },

  /**
   * Elimina un platform user.
   * Endpoint: DELETE /api/v1/platform/users/:id
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/platform/users/${id}`);
  },
};

// ════════════════════════════════════════════════════════
// USUARIOS MAESTROS
// ════════════════════════════════════════════════════════

export const masterUserService = {
  /**
   * Crea un usuario maestro para un tenant.
   *
   * 2026-05-13: **BLOQUEADO POR BACKEND.** Ambos approaches fallan:
   *
   * 1. `POST /platform/tenants/:id/master-users` (segun doc §6.2) → 404 NO IMPL.
   * 2. `POST /platform/users` con `tenantId` + `role:master` → 201 PERO el backend
   *    IGNORA el `tenantId` y crea el user en el tenant root. Ademas, el campo
   *    `master_user_id` del tenant destino NO se actualiza.
   *
   * NO HAY WORKAROUND POSIBLE sin que el backend implemente el endpoint dedicado
   * que ademas haga `UPDATE tenants SET master_user_id = <newId>` (vease §6.2.5).
   */
  async createMasterUser(data: CreateMasterUserDTO): Promise<AuthUser> {
    return apiClient.post<AuthUser>(`/platform/tenants/${data.tenantId}/master-users`, data);
  },

  /**
   * Fuerza el reset de contraseña de un usuario
   */
  async forcePasswordReset(data: ForcePasswordResetDTO): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/platform/users/${data.userId}/force-reset`, data);
  },
};

// ════════════════════════════════════════════════════════
// TRANSFERENCIAS DE VEHÍCULOS
// ════════════════════════════════════════════════════════

export const vehicleTransferService = {
  /**
   * Lista todas las solicitudes de transferencia
   */
  async getAll(params?: SearchParams): Promise<PaginatedResponse<VehicleTransferRequest>> {
    const raw = await getCamel<unknown>("/platform/transfers", { params: toRequestParams(params) });
    return normalizePaginated<VehicleTransferRequest>(
      raw,
      (item) => item as VehicleTransferRequest,
      params?.page,
      params?.pageSize,
    );
  },

  /**
   * Crea una solicitud de transferencia
   */
  async create(data: CreateVehicleTransferDTO): Promise<VehicleTransferRequest> {
    return apiClient.post<VehicleTransferRequest>("/platform/transfers", data);
  },

  /**
   * Aprueba una transferencia
   */
  async approve(id: string): Promise<VehicleTransferRequest> {
    return apiClient.post<VehicleTransferRequest>(`/platform/transfers/${id}/approve`);
  },

  /**
   * Ejecuta la transferencia aprobada
   */
  async execute(id: string): Promise<VehicleTransferRequest> {
    return apiClient.post<VehicleTransferRequest>(`/platform/transfers/${id}/execute`);
  },

  /**
   * Rechaza una transferencia
   */
  async reject(id: string, reason: string): Promise<VehicleTransferRequest> {
    return apiClient.post<VehicleTransferRequest>(`/platform/transfers/${id}/reject`, { reason });
  },
};

// ════════════════════════════════════════════════════════
// DASHBOARD DE PLATAFORMA
// ════════════════════════════════════════════════════════

export const platformDashboardService = {
  /**
   * Obtiene el dashboard de la plataforma.
   *
   * 2026-05-07: backend responde con `{ data: {...} }` y usa `cnt` en lugar
   * de `count` en planDistribution/topModules. Tampoco devuelve
   * `monthlyRecurringRevenue` ni `churnRate` (los seteamos a 0 como fallback).
   */
  async getDashboard(): Promise<PlatformDashboard> {
    const raw = await getCamel<unknown>("/platform/dashboard");
    const inner = unwrapData<Record<string, unknown>>(raw);

    const planDistribution = (Array.isArray(inner.planDistribution) ? inner.planDistribution : []) as Array<
      Record<string, unknown>
    >;
    const topModules = (Array.isArray(inner.topModules) ? inner.topModules : []) as Array<
      Record<string, unknown>
    >;
    const recentActivity = (Array.isArray(inner.recentActivity) ? inner.recentActivity : []) as PlatformDashboard["recentActivity"];

    const totalTenants = Number(inner.totalTenants ?? 0);
    return {
      totalTenants,
      activeTenants: Number(inner.activeTenants ?? 0),
      suspendedTenants: Number(inner.suspendedTenants ?? 0),
      trialTenants: Number(inner.trialTenants ?? 0),
      totalUsers: Number(inner.totalUsers ?? 0),
      totalVehicles: Number(inner.totalVehicles ?? 0),
      monthlyRecurringRevenue: Number(inner.monthlyRecurringRevenue ?? 0),
      newTenantsThisMonth: Number(inner.newTenantsThisMonth ?? 0),
      churnRate: Number(inner.churnRate ?? 0),
      planDistribution: planDistribution.map((p) => ({
        plan: (p.plan as PlatformDashboard["planDistribution"][number]["plan"]) ?? "starter",
        // backend devuelve `cnt` en lugar de `count` — soportar ambos
        count: Number(p.count ?? p.cnt ?? 0),
        percentage: totalTenants > 0 ? (Number(p.count ?? p.cnt ?? 0) / totalTenants) * 100 : 0,
      })),
      topModules: topModules.map((m) => ({
        // backend devuelve `module_code` (snake) → snakeToCamel ya lo convirtio a `moduleCode`
        moduleCode: ((m.moduleCode as string) ?? (m.module_code as string) ?? "") as SystemModuleCode,
        moduleName: (m.moduleName as string) ?? (m.module_code as string) ?? "",
        tenantsUsing: Number(m.tenantsUsing ?? m.count ?? m.cnt ?? 0),
        percentage:
          totalTenants > 0
            ? (Number(m.tenantsUsing ?? m.count ?? m.cnt ?? 0) / totalTenants) * 100
            : 0,
      })),
      recentActivity,
    };
  },

  /**
   * Obtiene el log de actividad de la plataforma.
   * 2026-05-07: backend responde con `{ data: [...] }` sin envelope `pagination`.
   */
  async getActivityLog(params?: SearchParams): Promise<PaginatedResponse<PlatformActivityLog>> {
    const raw = await getCamel<unknown>("/platform/activity", { params: toRequestParams(params) });
    return normalizePaginated<PlatformActivityLog>(
      raw,
      (item) => item as PlatformActivityLog,
      params?.page,
      params?.pageSize,
    );
  },
};

// ════════════════════════════════════════════════════════
// GRUPOS DE FLOTA (para scopes de visibilidad)
// ════════════════════════════════════════════════════════

export const fleetGroupService = {
  /**
   * Obtiene los grupos de flota de un tenant.
   * 2026-05-07: backend responde con `{ data: [...] }`.
   */
  async getByTenant(tenantId: string): Promise<FleetGroup[]> {
    const raw = await getCamel<unknown>(`/platform/tenants/${tenantId}/fleet-groups`);
    const inner = unwrapData<unknown>(raw);
    return Array.isArray(inner) ? (inner as FleetGroup[]) : [];
  },

  /**
   * Crea un grupo de flota
   */
  async create(tenantId: string, data: Omit<FleetGroup, "id" | "tenantId" | "createdAt" | "updatedAt">): Promise<FleetGroup> {
    return apiClient.post<FleetGroup>(`/platform/tenants/${tenantId}/fleet-groups`, data);
  },

  /**
   * Actualiza un grupo de flota
   */
  async update(tenantId: string, groupId: string, data: Partial<FleetGroup>): Promise<FleetGroup> {
    return apiClient.put<FleetGroup>(`/platform/tenants/${tenantId}/fleet-groups/${groupId}`, data);
  },

  /**
   * Elimina un grupo de flota
   */
  async delete(tenantId: string, groupId: string): Promise<void> {
    return apiClient.delete(`/platform/tenants/${tenantId}/fleet-groups/${groupId}`);
  },
};
