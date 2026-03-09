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
 */

import { apiClient } from "@/lib/api";
import { apiConfig } from "@/config/api.config";
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

// Import mocks dinámicamente
import {
  mockTenants,
  mockTransferRequests,
  mockPlatformDashboard,
  mockPlatformActivity,
  mockFleetGroups,
} from "@/mocks/platform.mock";

/**
 * Simula delay de red para mocks
 */
async function simulateDelay(ms: number = 500): Promise<void> {
  if (apiConfig.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

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

// ════════════════════════════════════════════════════════
// TENANTS
// ════════════════════════════════════════════════════════

export const tenantService = {
  /**
   * Lista todos los tenants con paginación
   */
  async getAll(params?: SearchParams): Promise<PaginatedResponse<Tenant>> {
    if (apiConfig.useMocks) {
      await simulateDelay();
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 10;
      const search = params?.search?.toLowerCase();

      let filtered = [...mockTenants];
      if (search) {
        filtered = filtered.filter(
          (t) =>
            t.name.toLowerCase().includes(search) ||
            t.taxId.includes(search) ||
            t.email.toLowerCase().includes(search) ||
            t.code.toLowerCase().includes(search)
        );
      }

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (page - 1) * pageSize;
      const items = filtered.slice(startIndex, startIndex + pageSize);

      return {
        items,
        pagination: { page, pageSize, totalItems, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
      };
    }
    return apiClient.get<PaginatedResponse<Tenant>>("/platform/tenants", { params: toRequestParams(params) });
  },

  /**
   * Obtiene un tenant por ID
   */
  async getById(id: string): Promise<Tenant> {
    if (apiConfig.useMocks) {
      await simulateDelay(300);
      const tenant = mockTenants.find((t) => t.id === id);
      if (!tenant) throw new Error(`Tenant ${id} no encontrado`);
      return tenant;
    }
    return apiClient.get<Tenant>(`/platform/tenants/${id}`);
  },

  /**
   * Crea un nuevo tenant (cuenta de cliente)
   */
  async create(data: CreateTenantDTO): Promise<Tenant> {
    if (apiConfig.useMocks) {
      await simulateDelay(600);
      const now = new Date().toISOString();
      const enabledModulesConfig: TenantModuleConfig[] = data.enabledModules.map(
        (moduleCode) => ({
          moduleCode,
          isEnabled: true,
          enabledAt: now,
          enabledBy: "platform_owner",
        })
      );

      const newTenant: Tenant = {
        id: crypto.randomUUID(),
        code: data.code,
        name: data.name,
        legalName: data.legalName,
        taxId: data.taxId,
        status: data.enableTrial ? "trial" : "active",
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        phone: data.phone,
        email: data.email,
        website: data.website,
        logo: data.logo,
        plan: data.plan,
        subscriptionStartDate: now,
        isTrialActive: data.enableTrial ?? false,
        trialEndDate: data.enableTrial && data.trialDays
          ? new Date(Date.now() + (data.trialDays ?? 30) * 86400000).toISOString()
          : undefined,
        maxUsers: data.maxUsers,
        maxVehicles: data.maxVehicles,
        currentUsersCount: 0,
        currentVehiclesCount: 0,
        enabledModules: enabledModulesConfig,
        timezone: data.timezone ?? "America/Lima",
        defaultCurrency: data.defaultCurrency ?? "PEN",
        defaultLanguage: data.defaultLanguage ?? "es",
        internalNotes: data.internalNotes,
        createdAt: now,
        updatedAt: now,
        createdBy: "platform_owner",
      };
      mockTenants.push(newTenant);
      return newTenant;
    }
    return apiClient.post<Tenant>("/platform/tenants", data);
  },

  /**
   * Actualiza un tenant existente
   */
  async update(id: string, data: UpdateTenantDTO): Promise<Tenant> {
    if (apiConfig.useMocks) {
      await simulateDelay(400);
      const idx = mockTenants.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error(`Tenant ${id} no encontrado`);
      const updated = { ...mockTenants[idx], ...data, updatedAt: new Date().toISOString() };
      mockTenants[idx] = updated;
      return updated;
    }
    return apiClient.put<Tenant>(`/platform/tenants/${id}`, data);
  },

  /**
   * Suspende un tenant
   */
  async suspend(id: string, data: SuspendTenantDTO): Promise<Tenant> {
    if (apiConfig.useMocks) {
      await simulateDelay(400);
      const idx = mockTenants.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error(`Tenant ${id} no encontrado`);
      mockTenants[idx] = {
        ...mockTenants[idx],
        status: "suspended",
        suspendedAt: new Date().toISOString(),
        suspensionReason: data.reason,
        updatedAt: new Date().toISOString(),
      };
      return mockTenants[idx];
    }
    return apiClient.post<Tenant>(`/platform/tenants/${id}/suspend`, data);
  },

  /**
   * Reactiva un tenant suspendido
   */
  async reactivate(id: string): Promise<Tenant> {
    if (apiConfig.useMocks) {
      await simulateDelay(400);
      const idx = mockTenants.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error(`Tenant ${id} no encontrado`);
      mockTenants[idx] = {
        ...mockTenants[idx],
        status: "active",
        suspendedAt: undefined,
        suspensionReason: undefined,
        updatedAt: new Date().toISOString(),
      };
      return mockTenants[idx];
    }
    return apiClient.post<Tenant>(`/platform/tenants/${id}/reactivate`);
  },

  /**
   * Elimina un tenant (solo platform_owner)
   */
  async delete(id: string): Promise<void> {
    if (apiConfig.useMocks) {
      await simulateDelay(500);
      const idx = mockTenants.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error(`Tenant ${id} no encontrado`);
      mockTenants.splice(idx, 1);
      return;
    }
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
    if (apiConfig.useMocks) {
      await simulateDelay(300);
      const tenant = mockTenants.find((t) => t.id === tenantId);
      return tenant?.enabledModules ?? [];
    }
    return apiClient.get<TenantModuleConfig[]>(`/platform/tenants/${tenantId}/modules`);
  },

  /**
   * Actualiza los módulos de un tenant (activar/desactivar)
   */
  async updateModules(tenantId: string, data: UpdateTenantModulesDTO): Promise<TenantModuleConfig[]> {
    if (apiConfig.useMocks) {
      await simulateDelay(500);
      const now = new Date().toISOString();
      const tenantIdx = mockTenants.findIndex((t) => t.id === tenantId);
      if (tenantIdx === -1) throw new Error(`Tenant ${tenantId} no encontrado`);

      const tenant = mockTenants[tenantIdx];
      const modules = [...tenant.enabledModules];

      // Habilitar módulos
      if (data.enableModules) {
        for (const moduleCode of data.enableModules) {
          const existing = modules.find((m) => m.moduleCode === moduleCode);
          if (existing) {
            existing.isEnabled = true;
            existing.enabledAt = now;
            existing.enabledBy = "platform_owner";
            existing.disabledAt = undefined;
          } else {
            modules.push({
              moduleCode,
              isEnabled: true,
              enabledAt: now,
              enabledBy: "platform_owner",
            });
          }
        }
      }

      // Deshabilitar módulos
      if (data.disableModules) {
        for (const moduleCode of data.disableModules) {
          const existing = modules.find((m) => m.moduleCode === moduleCode);
          if (existing) {
            existing.isEnabled = false;
            existing.disabledAt = now;
          }
        }
      }

      mockTenants[tenantIdx] = { ...tenant, enabledModules: modules, updatedAt: now };
      return modules;
    }
    return apiClient.put<TenantModuleConfig[]>(`/platform/tenants/${tenantId}/modules`, data);
  },

  /**
   * Verifica si un módulo está activo para un tenant
   */
  async isModuleEnabled(tenantId: string, moduleCode: SystemModuleCode): Promise<boolean> {
    if (apiConfig.useMocks) {
      await simulateDelay(100);
      const tenant = mockTenants.find((t) => t.id === tenantId);
      const mod = tenant?.enabledModules.find((m) => m.moduleCode === moduleCode);
      return mod?.isEnabled ?? false;
    }
    const result = await apiClient.get<{ enabled: boolean }>(
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
    if (apiConfig.useMocks) {
      await simulateDelay(500);
      const tenant = mockTenants.find((t) => t.id === data.tenantId);
      const newUser: AuthUser = {
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: "owner",
        tier: "tenant_admin",
        tenantId: data.tenantId,
        tenantName: tenant?.name ?? "Tenant",
        isActive: true,
        forcePasswordChange: data.forcePasswordChange ?? true,
        createdBy: "platform",
      };

      // Actualizar el tenant con los datos del usuario maestro
      if (tenant) {
        const idx = mockTenants.indexOf(tenant);
        mockTenants[idx] = {
          ...tenant,
          masterUserId: newUser.id,
          masterUserName: newUser.name,
          masterUserEmail: newUser.email,
          updatedAt: new Date().toISOString(),
        };
      }

      return newUser;
    }
    return apiClient.post<AuthUser>(`/platform/tenants/${data.tenantId}/master-users`, data);
  },

  /**
   * Fuerza el reset de contraseña de un usuario
   */
  async forcePasswordReset(data: ForcePasswordResetDTO): Promise<{ success: boolean; message: string }> {
    if (apiConfig.useMocks) {
      await simulateDelay(300);
      return {
        success: true,
        message: data.sendByEmail
          ? `Se envió un correo de reset a ${data.userId}`
          : "El usuario deberá cambiar su contraseña en el siguiente login",
      };
    }
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
    if (apiConfig.useMocks) {
      await simulateDelay();
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 10;
      const items = mockTransferRequests.slice((page - 1) * pageSize, page * pageSize);
      return {
        items,
        pagination: {
          page,
          pageSize,
          totalItems: mockTransferRequests.length,
          totalPages: Math.ceil(mockTransferRequests.length / pageSize),
          hasNext: page * pageSize < mockTransferRequests.length,
          hasPrevious: page > 1,
        },
      };
    }
    return apiClient.get<PaginatedResponse<VehicleTransferRequest>>("/platform/transfers", { params: toRequestParams(params) });
  },

  /**
   * Crea una solicitud de transferencia
   */
  async create(data: CreateVehicleTransferDTO): Promise<VehicleTransferRequest> {
    if (apiConfig.useMocks) {
      await simulateDelay(500);
      const fromTenant = mockTenants.find((t) => t.id === data.fromTenantId);
      const toTenant = mockTenants.find((t) => t.id === data.toTenantId);
      const transfer: VehicleTransferRequest = {
        id: crypto.randomUUID(),
        vehicleIds: data.vehicleIds,
        fromTenantId: data.fromTenantId,
        fromTenantName: fromTenant?.name ?? "Origen",
        toTenantId: data.toTenantId,
        toTenantName: toTenant?.name ?? "Destino",
        status: "pending",
        reason: data.reason,
        transferGpsHistory: data.transferGpsHistory ?? false,
        transferMaintenanceHistory: data.transferMaintenanceHistory ?? false,
        requestedBy: "platform_owner",
        requestedAt: new Date().toISOString(),
        notes: data.notes,
      };
      mockTransferRequests.push(transfer);
      return transfer;
    }
    return apiClient.post<VehicleTransferRequest>("/platform/transfers", data);
  },

  /**
   * Aprueba una transferencia
   */
  async approve(id: string): Promise<VehicleTransferRequest> {
    if (apiConfig.useMocks) {
      await simulateDelay(400);
      const idx = mockTransferRequests.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error(`Transferencia ${id} no encontrada`);
      mockTransferRequests[idx] = {
        ...mockTransferRequests[idx],
        status: "approved",
        processedBy: "platform_owner",
        processedAt: new Date().toISOString(),
      };
      return mockTransferRequests[idx];
    }
    return apiClient.post<VehicleTransferRequest>(`/platform/transfers/${id}/approve`);
  },

  /**
   * Ejecuta la transferencia aprobada
   */
  async execute(id: string): Promise<VehicleTransferRequest> {
    if (apiConfig.useMocks) {
      await simulateDelay(800);
      const idx = mockTransferRequests.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error(`Transferencia ${id} no encontrada`);
      mockTransferRequests[idx] = {
        ...mockTransferRequests[idx],
        status: "completed",
        processedBy: mockTransferRequests[idx].processedBy ?? "platform_owner",
        processedAt: new Date().toISOString(),
      };
      return mockTransferRequests[idx];
    }
    return apiClient.post<VehicleTransferRequest>(`/platform/transfers/${id}/execute`);
  },

  /**
   * Rechaza una transferencia
   */
  async reject(id: string, reason: string): Promise<VehicleTransferRequest> {
    if (apiConfig.useMocks) {
      await simulateDelay(400);
      const idx = mockTransferRequests.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error(`Transferencia ${id} no encontrada`);
      mockTransferRequests[idx] = {
        ...mockTransferRequests[idx],
        status: "rejected",
        processedBy: "platform_owner",
        processedAt: new Date().toISOString(),
        notes: reason,
      };
      return mockTransferRequests[idx];
    }
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
    if (apiConfig.useMocks) {
      await simulateDelay(600);
      return mockPlatformDashboard;
    }
    return apiClient.get<PlatformDashboard>("/platform/dashboard");
  },

  /**
   * Obtiene el log de actividad de la plataforma
   */
  async getActivityLog(params?: SearchParams): Promise<PaginatedResponse<PlatformActivityLog>> {
    if (apiConfig.useMocks) {
      await simulateDelay();
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 20;
      const items = mockPlatformActivity.slice((page - 1) * pageSize, page * pageSize);
      return {
        items,
        pagination: {
          page,
          pageSize,
          totalItems: mockPlatformActivity.length,
          totalPages: Math.ceil(mockPlatformActivity.length / pageSize),
          hasNext: page * pageSize < mockPlatformActivity.length,
          hasPrevious: page > 1,
        },
      };
    }
    return apiClient.get<PaginatedResponse<PlatformActivityLog>>("/platform/activity", { params: toRequestParams(params) });
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
    if (apiConfig.useMocks) {
      await simulateDelay(300);
      return mockFleetGroups.filter((g) => g.tenantId === tenantId);
    }
    return apiClient.get<FleetGroup[]>(`/tenants/${tenantId}/fleet-groups`);
  },

  /**
   * Crea un grupo de flota
   */
  async create(tenantId: string, data: Omit<FleetGroup, "id" | "tenantId" | "createdAt" | "updatedAt">): Promise<FleetGroup> {
    if (apiConfig.useMocks) {
      await simulateDelay(400);
      const group: FleetGroup = {
        ...data,
        id: crypto.randomUUID(),
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockFleetGroups.push(group);
      return group;
    }
    return apiClient.post<FleetGroup>(`/tenants/${tenantId}/fleet-groups`, data);
  },

  /**
   * Actualiza un grupo de flota
   */
  async update(tenantId: string, groupId: string, data: Partial<FleetGroup>): Promise<FleetGroup> {
    if (apiConfig.useMocks) {
      await simulateDelay(400);
      const idx = mockFleetGroups.findIndex((g) => g.id === groupId && g.tenantId === tenantId);
      if (idx === -1) throw new Error(`Grupo ${groupId} no encontrado`);
      mockFleetGroups[idx] = { ...mockFleetGroups[idx], ...data, updatedAt: new Date().toISOString() };
      return mockFleetGroups[idx];
    }
    return apiClient.put<FleetGroup>(`/tenants/${tenantId}/fleet-groups/${groupId}`, data);
  },

  /**
   * Elimina un grupo de flota
   */
  async delete(tenantId: string, groupId: string): Promise<void> {
    if (apiConfig.useMocks) {
      await simulateDelay(300);
      const idx = mockFleetGroups.findIndex((g) => g.id === groupId && g.tenantId === tenantId);
      if (idx !== -1) mockFleetGroups.splice(idx, 1);
      return;
    }
    return apiClient.delete(`/tenants/${tenantId}/fleet-groups/${groupId}`);
  },
};
