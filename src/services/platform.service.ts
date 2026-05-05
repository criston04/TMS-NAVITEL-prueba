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

// ════════════════════════════════════════════════════════
// TENANTS
// ════════════════════════════════════════════════════════

export const tenantService = {
  /**
   * Lista todos los tenants con paginación
   */
  async getAll(params?: SearchParams): Promise<PaginatedResponse<Tenant>> {
    return getCamel<PaginatedResponse<Tenant>>("/platform/tenants", { params: toRequestParams(params) });
  },

  /**
   * Obtiene un tenant por ID
   */
  async getById(id: string): Promise<Tenant> {
    return getCamel<Tenant>(`/platform/tenants/${id}`);
  },

  /**
   * Crea un nuevo tenant (cuenta de cliente)
   */
  async create(data: CreateTenantDTO): Promise<Tenant> {
    return apiClient.post<Tenant>("/platform/tenants", data);
  },

  /**
   * Actualiza un tenant existente
   */
  async update(id: string, data: UpdateTenantDTO): Promise<Tenant> {
    return apiClient.put<Tenant>(`/platform/tenants/${id}`, data);
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
   * Obtiene los módulos configurados de un tenant
   */
  async getByTenant(tenantId: string): Promise<TenantModuleConfig[]> {
    return getCamel<TenantModuleConfig[]>(`/platform/tenants/${tenantId}/modules`);
  },

  /**
   * Actualiza los módulos de un tenant (activar/desactivar)
   */
  async updateModules(tenantId: string, data: UpdateTenantModulesDTO): Promise<TenantModuleConfig[]> {
    return apiClient.put<TenantModuleConfig[]>(`/platform/tenants/${tenantId}/modules`, data);
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
// USUARIOS MAESTROS
// ════════════════════════════════════════════════════════

export const masterUserService = {
  /**
   * Crea un usuario maestro para un tenant
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
    return getCamel<PaginatedResponse<VehicleTransferRequest>>("/platform/transfers", { params: toRequestParams(params) });
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
   * Obtiene el dashboard de la plataforma
   */
  async getDashboard(): Promise<PlatformDashboard> {
    return getCamel<PlatformDashboard>("/platform/dashboard");
  },

  /**
   * Obtiene el log de actividad de la plataforma
   */
  async getActivityLog(params?: SearchParams): Promise<PaginatedResponse<PlatformActivityLog>> {
    return getCamel<PaginatedResponse<PlatformActivityLog>>("/platform/activity", { params: toRequestParams(params) });
  },
};

// ════════════════════════════════════════════════════════
// GRUPOS DE FLOTA (para scopes de visibilidad)
// ════════════════════════════════════════════════════════

export const fleetGroupService = {
  /**
   * Obtiene los grupos de flota de un tenant
   */
  async getByTenant(tenantId: string): Promise<FleetGroup[]> {
    return getCamel<FleetGroup[]>(`/platform/tenants/${tenantId}/fleet-groups`);
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
