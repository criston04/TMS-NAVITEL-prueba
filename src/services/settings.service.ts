import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import {
  mockSettings,
  mockRoles,
  mockIntegrations,
  mockAuditLog,
} from "@/mocks/settings";
import type {
  SystemSettings,
  SettingCategory,
  Role,
  Integration,
  AuditLogEntry,
  SettingsOverview,
  IntegrationHealthStatus,
  UpdateSettingsDTO,
  CreateRoleDTO,
  CreateIntegrationDTO,
  AuditLogFilters,
} from "@/types/settings";


class SettingsService {
  private settings: SystemSettings = { ...mockSettings };
  private roles: Role[] = [...mockRoles];
  private integrations: Integration[] = [...mockIntegrations];
  private auditLog: AuditLogEntry[] = [...mockAuditLog];
  private useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  private async simulateDelay(ms: number = 200): Promise<void> {
    if (this.useMocks) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private addAuditEntry(entry: Omit<AuditLogEntry, "id" | "timestamp">): void {
    this.auditLog.unshift({
      id: this.generateId("audit"),
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }

  async getAllSettings(): Promise<SystemSettings> {
    await this.simulateDelay();

    if (this.useMocks) {
      return { ...this.settings };
    }

    return apiClient.get(API_ENDPOINTS.settings.base);
  }

  async getSettingsByCategory<T extends keyof SystemSettings>(
    category: T
  ): Promise<SystemSettings[T]> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      return { ...this.settings[category] };
    }

    return apiClient.get(`${API_ENDPOINTS.settings.base}/${category}`);
  }

  async updateSettings(data: UpdateSettingsDTO): Promise<void> {
    await this.simulateDelay(300);

    if (this.useMocks) {
      const category = data.category as keyof SystemSettings;
      const oldSettings = { ...this.settings[category] };

      this.settings = {
        ...this.settings,
        [category]: {
          ...this.settings[category],
          ...data.settings,
        },
      };

      // Registrar en auditoría
      const changes = Object.entries(data.settings)
        .filter(([key, value]) => (oldSettings as Record<string, unknown>)[key] !== value)
        .map(([key, value]) => ({
          field: key,
          oldValue: (oldSettings as Record<string, unknown>)[key],
          newValue: value,
        }));

      this.addAuditEntry({
        userId: "current-user",
        userName: "Usuario Actual",
        action: "config",
        resource: "settings",
        resourceId: category,
        details: `Actualización de configuración: ${category}`,
        changes,
      });

      return;
    }

    return apiClient.put(API_ENDPOINTS.settings.base, data);
  }

  async resetSettings(category: SettingCategory): Promise<SystemSettings[keyof SystemSettings]> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      const defaults = mockSettings[category as keyof SystemSettings];
      Object.assign(this.settings, { [category]: { ...defaults } });

      this.addAuditEntry({
        userId: "current-user",
        userName: "Usuario Actual",
        action: "config",
        resource: "settings",
        resourceId: category,
        details: `Restablecimiento de configuración: ${category}`,
      });

      return defaults;
    }

    return apiClient.post(`${API_ENDPOINTS.settings.base}/${category}/reset`);
  }

  async exportSettings(): Promise<string> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      return JSON.stringify(this.settings, null, 2);
    }

    return apiClient.get(`${API_ENDPOINTS.settings.base}/export`);
  }

  async importSettings(json: string): Promise<void> {
    await this.simulateDelay(300);

    if (this.useMocks) {
      try {
        const imported = JSON.parse(json) as Partial<SystemSettings>;
        this.settings = {
          ...this.settings,
          ...imported,
        };

        this.addAuditEntry({
          userId: "current-user",
          userName: "Usuario Actual",
          action: "import",
          resource: "settings",
          details: "Importación de configuración",
        });
      } catch {
        throw new Error("JSON de configuración inválido");
      }
      return;
    }

    return apiClient.post(`${API_ENDPOINTS.settings.base}/import`, { json });
  }

  // ROLES Y PERMISOS

  async getRoles(): Promise<Role[]> {
    await this.simulateDelay();

    if (this.useMocks) {
      return [...this.roles];
    }

    return apiClient.get(API_ENDPOINTS.settings.roles);
  }

  async getRoleById(id: string): Promise<Role | null> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      return this.roles.find(r => r.id === id) || null;
    }

    return apiClient.get(`${API_ENDPOINTS.settings.roles}/${id}`);
  }

  async createRole(data: CreateRoleDTO): Promise<Role> {
    await this.simulateDelay(300);

    if (this.useMocks) {
      const now = new Date().toISOString();
      const role: Role = {
        id: this.generateId("role"),
        code: data.code,
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isSystem: false,
        isActive: true,
        userCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      this.roles.push(role);

      this.addAuditEntry({
        userId: "current-user",
        userName: "Usuario Actual",
        action: "create",
        resource: "roles",
        resourceId: role.id,
        resourceName: role.name,
        details: `Creación de rol: ${role.name}`,
      });

      return role;
    }

    return apiClient.post(API_ENDPOINTS.settings.roles, data);
  }

  async updateRole(id: string, data: Partial<CreateRoleDTO>): Promise<Role> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      const index = this.roles.findIndex(r => r.id === id);
      if (index === -1) throw new Error("Rol no encontrado");

      if (this.roles[index].isSystem) {
        throw new Error("No se puede modificar un rol del sistema");
      }

      this.roles[index] = {
        ...this.roles[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      this.addAuditEntry({
        userId: "current-user",
        userName: "Usuario Actual",
        action: "update",
        resource: "roles",
        resourceId: id,
        resourceName: this.roles[index].name,
        details: `Actualización de rol: ${this.roles[index].name}`,
      });

      return this.roles[index];
    }

    return apiClient.put(`${API_ENDPOINTS.settings.roles}/${id}`, data);
  }

  async deleteRole(id: string): Promise<void> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      const role = this.roles.find(r => r.id === id);
      if (!role) throw new Error("Rol no encontrado");
      if (role.isSystem) throw new Error("No se puede eliminar un rol del sistema");
      if (role.userCount > 0) throw new Error("No se puede eliminar un rol con usuarios asignados");

      this.roles = this.roles.filter(r => r.id !== id);

      this.addAuditEntry({
        userId: "current-user",
        userName: "Usuario Actual",
        action: "delete",
        resource: "roles",
        resourceId: id,
        resourceName: role.name,
        details: `Eliminación de rol: ${role.name}`,
      });

      return;
    }

    return apiClient.delete(`${API_ENDPOINTS.settings.roles}/${id}`);
  }

  // INTEGRACIONES

  async getIntegrations(): Promise<Integration[]> {
    await this.simulateDelay();

    if (this.useMocks) {
      return [...this.integrations];
    }

    return apiClient.get(API_ENDPOINTS.settings.integrations);
  }

  async getIntegrationById(id: string): Promise<Integration | null> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      return this.integrations.find(i => i.id === id) || null;
    }

    return apiClient.get(`${API_ENDPOINTS.settings.integrations}/${id}`);
  }

  async createIntegration(data: CreateIntegrationDTO): Promise<Integration> {
    await this.simulateDelay(300);

    if (this.useMocks) {
      const now = new Date().toISOString();
      const integration: Integration = {
        id: this.generateId("int"),
        code: data.code,
        name: data.name,
        description: data.description,
        type: data.type,
        status: "pending",
        config: data.config,
        credentials: data.credentials,
        baseUrl: data.baseUrl,
        webhookUrl: data.webhookUrl,
        syncIntervalMinutes: data.syncIntervalMinutes,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      };

      this.integrations.push(integration);

      this.addAuditEntry({
        userId: "current-user",
        userName: "Usuario Actual",
        action: "create",
        resource: "integrations",
        resourceId: integration.id,
        resourceName: integration.name,
        details: `Creación de integración: ${integration.name}`,
      });

      return integration;
    }

    return apiClient.post(API_ENDPOINTS.settings.integrations, data);
  }

  async updateIntegration(id: string, data: Partial<CreateIntegrationDTO>): Promise<Integration> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      const index = this.integrations.findIndex(i => i.id === id);
      if (index === -1) throw new Error("Integración no encontrada");

      this.integrations[index] = {
        ...this.integrations[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      return this.integrations[index];
    }

    return apiClient.put(`${API_ENDPOINTS.settings.integrations}/${id}`, data);
  }

  async toggleIntegration(id: string): Promise<Integration> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      const index = this.integrations.findIndex(i => i.id === id);
      if (index === -1) throw new Error("Integración no encontrada");

      const newActive = !this.integrations[index].isActive;
      this.integrations[index] = {
        ...this.integrations[index],
        isActive: newActive,
        status: newActive ? "active" : "inactive",
        updatedAt: new Date().toISOString(),
      };

      return this.integrations[index];
    }

    return apiClient.patch(`${API_ENDPOINTS.settings.integrations}/${id}/toggle`);
  }

  async testIntegration(id: string): Promise<{ success: boolean; message: string; responseTimeMs: number }> {
    await this.simulateDelay(500);

    if (this.useMocks) {
      const integration = this.integrations.find(i => i.id === id);
      if (!integration) throw new Error("Integración no encontrada");

      // Simular test
      const success = Math.random() > 0.2;
      const responseTimeMs = Math.floor(Math.random() * 300) + 50;

      if (success) {
        const index = this.integrations.findIndex(i => i.id === id);
        this.integrations[index].status = "active";
        this.integrations[index].lastSyncAt = new Date().toISOString();
      }

      return {
        success,
        message: success ? "Conexión exitosa" : "Error de conexión: timeout",
        responseTimeMs,
      };
    }

    return apiClient.post(`${API_ENDPOINTS.settings.integrations}/${id}/test`);
  }

  async syncIntegration(id: string): Promise<{ recordsSynced: number }> {
    await this.simulateDelay(1000);

    if (this.useMocks) {
      const integration = this.integrations.find(i => i.id === id);
      if (!integration) throw new Error("Integración no encontrada");

      const index = this.integrations.findIndex(i => i.id === id);
      this.integrations[index].lastSyncAt = new Date().toISOString();

      return { recordsSynced: Math.floor(Math.random() * 100) + 10 };
    }

    return apiClient.post(`${API_ENDPOINTS.settings.integrations}/${id}/sync`);
  }

  async getIntegrationHealth(): Promise<IntegrationHealthStatus[]> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      return this.integrations.map(i => ({
        integrationId: i.id,
        integrationName: i.name,
        status: i.status,
        lastCheck: new Date().toISOString(),
        responseTimeMs: Math.floor(Math.random() * 200) + 30,
        errorRate: i.status === "active" ? Math.random() * 5 : 25 + Math.random() * 25,
        uptime: i.status === "active" ? 95 + Math.random() * 5 : 50 + Math.random() * 30,
      }));
    }

    return apiClient.get(`${API_ENDPOINTS.settings.integrations}/health`);
  }

  async getAuditLog(
    filters: AuditLogFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: AuditLogEntry[]; total: number }> {
    await this.simulateDelay();

    if (this.useMocks) {
      let filtered = [...this.auditLog];

      if (filters.userId) {
        filtered = filtered.filter(e => e.userId === filters.userId);
      }
      if (filters.action) {
        const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
        filtered = filtered.filter(e => actions.includes(e.action));
      }
      if (filters.resource) {
        filtered = filtered.filter(e => e.resource === filters.resource);
      }
      if (filters.startDate) {
        filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(filters.startDate!));
      }
      if (filters.endDate) {
        filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(filters.endDate!));
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(e =>
          e.userName.toLowerCase().includes(s) ||
          e.resource.toLowerCase().includes(s) ||
          e.details?.toLowerCase().includes(s)
        );
      }

      filtered.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const start = (page - 1) * pageSize;
      return {
        data: filtered.slice(start, start + pageSize),
        total: filtered.length,
      };
    }

    return apiClient.get(API_ENDPOINTS.settings.audit, { params: { ...filters, page, pageSize } as unknown as Record<string, string> });
  }

  async exportAuditLog(filters: AuditLogFilters = {}): Promise<string> {
    const result = await this.getAuditLog(filters, 1, 10000);
    return JSON.stringify(result.data, null, 2);
  }

  // RESUMEN

  async getSettingsOverview(): Promise<SettingsOverview> {
    await this.simulateDelay(300);

    if (this.useMocks) {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const entries24h = this.auditLog.filter(e => new Date(e.timestamp) >= last24h);
      const entries7d = this.auditLog.filter(e => new Date(e.timestamp) >= last7d);

      // Contar acciones
      const actionCounts = new Map<string, number>();
      const userCounts = new Map<string, { name: string; count: number }>();

      for (const entry of entries7d) {
        const actionCount = actionCounts.get(entry.action) || 0;
        actionCounts.set(entry.action, actionCount + 1);

        const userCount = userCounts.get(entry.userId) || { name: entry.userName, count: 0 };
        userCount.count++;
        userCounts.set(entry.userId, userCount);
      }

      return {
        lastUpdated: new Date().toISOString(),
        updatedBy: "Admin",
        totalSettings: 50,
        customizedSettings: 25,
        roles: {
          total: this.roles.length,
          active: this.roles.filter(r => r.isActive).length,
        },
        integrations: {
          total: this.integrations.length,
          active: this.integrations.filter(i => i.isActive).length,
          withErrors: this.integrations.filter(i => i.status === "error").length,
        },
        auditLog: {
          entriesLast24h: entries24h.length,
          entriesLast7d: entries7d.length,
          topActions: Array.from(actionCounts.entries())
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
          topUsers: Array.from(userCounts.entries())
            .map(([userId, data]) => ({ userId, userName: data.name, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
        },
      };
    }

    return apiClient.get(`${API_ENDPOINTS.settings.base}/overview`);
  }
}

export const settingsService = new SettingsService();

export default settingsService;
