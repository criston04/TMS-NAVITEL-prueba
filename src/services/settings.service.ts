import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
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
  async getAllSettings(): Promise<SystemSettings> {
    return apiClient.get(API_ENDPOINTS.settings.base);
  }

  async getSettingsByCategory<T extends keyof SystemSettings>(
    category: T
  ): Promise<SystemSettings[T]> {
    return apiClient.get(`${API_ENDPOINTS.settings.base}/${category}`);
  }

  async updateSettings(data: UpdateSettingsDTO): Promise<void> {
    return apiClient.put(API_ENDPOINTS.settings.base, data);
  }

  async resetSettings(category: SettingCategory): Promise<SystemSettings[keyof SystemSettings]> {
    return apiClient.post(`${API_ENDPOINTS.settings.base}/${category}/reset`);
  }

  async exportSettings(): Promise<string> {
    return apiClient.get(`${API_ENDPOINTS.settings.base}/export`);
  }

  async importSettings(json: string): Promise<void> {
    return apiClient.post(`${API_ENDPOINTS.settings.base}/import`, { json });
  }

  // ROLES Y PERMISOS

  async getRoles(): Promise<Role[]> {
    return apiClient.get(API_ENDPOINTS.settings.roles);
  }

  async getRoleById(id: string): Promise<Role | null> {
    return apiClient.get(`${API_ENDPOINTS.settings.roles}/${id}`);
  }

  async createRole(data: CreateRoleDTO): Promise<Role> {
    return apiClient.post(API_ENDPOINTS.settings.roles, data);
  }

  async updateRole(id: string, data: Partial<CreateRoleDTO>): Promise<Role> {
    return apiClient.put(`${API_ENDPOINTS.settings.roles}/${id}`, data);
  }

  async deleteRole(id: string): Promise<void> {
    return apiClient.delete(`${API_ENDPOINTS.settings.roles}/${id}`);
  }

  // INTEGRACIONES

  async getIntegrations(): Promise<Integration[]> {
    return apiClient.get(API_ENDPOINTS.settings.integrations);
  }

  async getIntegrationById(id: string): Promise<Integration | null> {
    return apiClient.get(`${API_ENDPOINTS.settings.integrations}/${id}`);
  }

  async createIntegration(data: CreateIntegrationDTO): Promise<Integration> {
    return apiClient.post(API_ENDPOINTS.settings.integrations, data);
  }

  async updateIntegration(id: string, data: Partial<CreateIntegrationDTO>): Promise<Integration> {
    return apiClient.put(`${API_ENDPOINTS.settings.integrations}/${id}`, data);
  }

  async toggleIntegration(id: string): Promise<Integration> {
    return apiClient.patch(`${API_ENDPOINTS.settings.integrations}/${id}/toggle`);
  }

  async testIntegration(id: string): Promise<{ success: boolean; message: string; responseTimeMs: number }> {
    return apiClient.post(`${API_ENDPOINTS.settings.integrations}/${id}/test`);
  }

  async syncIntegration(id: string): Promise<{ recordsSynced: number }> {
    return apiClient.post(`${API_ENDPOINTS.settings.integrations}/${id}/sync`);
  }

  async getIntegrationHealth(): Promise<IntegrationHealthStatus[]> {
    return apiClient.get(`${API_ENDPOINTS.settings.integrations}/health`);
  }

  async getAuditLog(
    filters: AuditLogFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: AuditLogEntry[]; total: number }> {
    return apiClient.get(API_ENDPOINTS.settings.audit, {
      params: { ...filters, page, pageSize } as unknown as Record<string, string>,
    });
  }

  async exportAuditLog(filters: AuditLogFilters = {}): Promise<string> {
    const result = await this.getAuditLog(filters, 1, 10000);
    return JSON.stringify(result.data, null, 2);
  }

  // RESUMEN

  async getSettingsOverview(): Promise<SettingsOverview> {
    return apiClient.get(`${API_ENDPOINTS.settings.base}/overview`);
  }
}

export const settingsService = new SettingsService();

export default settingsService;
