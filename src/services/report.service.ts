import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import type {
  ReportDefinition,
  ReportTemplate,
  GeneratedReport,
  ReportSchedule,
  ReportUsageStats,
  OperationalReportData,
  FinancialReportData,
  GenerateReportRequest,
  CreateReportDefinitionDTO,
  CreateReportScheduleDTO,
  GeneratedReportFilters,
  ReportType,
  ReportStatus,
} from "@/types/report";


class ReportService {
  // DEFINICIONES DE REPORTE

  async getDefinitions(
    filters?: { type?: ReportType; category?: string; search?: string }
  ): Promise<ReportDefinition[]> {
    return apiClient.get(API_ENDPOINTS.reports.definitions, {
      params: filters as unknown as Record<string, string>,
    });
  }

  async getDefinitionById(id: string): Promise<ReportDefinition | null> {
    return apiClient.get(`${API_ENDPOINTS.reports.definitions}/${id}`);
  }

  async createDefinition(data: CreateReportDefinitionDTO): Promise<ReportDefinition> {
    return apiClient.post(API_ENDPOINTS.reports.definitions, data);
  }

  async updateDefinition(
    id: string,
    data: Partial<CreateReportDefinitionDTO>
  ): Promise<ReportDefinition> {
    return apiClient.put(`${API_ENDPOINTS.reports.definitions}/${id}`, data);
  }

  async deleteDefinition(id: string): Promise<void> {
    return apiClient.delete(`${API_ENDPOINTS.reports.definitions}/${id}`);
  }

  // PLANTILLAS

  async getTemplates(type?: ReportType): Promise<ReportTemplate[]> {
    return apiClient.get(API_ENDPOINTS.reports.templates, { params: type ? { type } : undefined });
  }

  async getTemplateById(id: string): Promise<ReportTemplate | null> {
    return apiClient.get(`${API_ENDPOINTS.reports.templates}/${id}`);
  }

  // GENERACIÓN DE REPORTES

  async generateReport(request: GenerateReportRequest): Promise<GeneratedReport> {
    // 2026-05-03: corregido. Antes apuntaba a /reports/generated (que solo
    // acepta GET, devuelve 405 en POST). El endpoint correcto es
    // POST /reports/generate (verificado contra producción).
    // Backend exige body: { definitionId, format, ...parameters }
    return apiClient.post(API_ENDPOINTS.reports.generate, request);
  }

  async getGeneratedReports(
    filters: GeneratedReportFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ data: GeneratedReport[]; total: number }> {
    return apiClient.get(API_ENDPOINTS.reports.generated, {
      params: { ...filters, page, pageSize } as unknown as Record<string, string>,
    });
  }

  async getReportById(id: string): Promise<GeneratedReport | null> {
    return apiClient.get(`${API_ENDPOINTS.reports.generated}/${id}`);
  }

  async getReportStatus(id: string): Promise<ReportStatus> {
    return apiClient.get(`${API_ENDPOINTS.reports.generated}/${id}/status`);
  }

  async downloadReport(id: string): Promise<{ url: string; filename: string }> {
    return apiClient.get(`${API_ENDPOINTS.reports.generated}/${id}/download`);
  }

  async getSchedules(): Promise<ReportSchedule[]> {
    return apiClient.get(API_ENDPOINTS.reports.schedules);
  }

  async getScheduleById(id: string): Promise<ReportSchedule | null> {
    return apiClient.get(`${API_ENDPOINTS.reports.schedules}/${id}`);
  }

  async createSchedule(data: CreateReportScheduleDTO): Promise<ReportSchedule> {
    return apiClient.post(API_ENDPOINTS.reports.schedules, data);
  }

  async updateSchedule(id: string, data: Partial<CreateReportScheduleDTO>): Promise<ReportSchedule> {
    return apiClient.put(`${API_ENDPOINTS.reports.schedules}/${id}`, data);
  }

  async toggleSchedule(id: string): Promise<ReportSchedule> {
    return apiClient.patch(`${API_ENDPOINTS.reports.schedules}/${id}/toggle`);
  }

  async deleteSchedule(id: string): Promise<void> {
    return apiClient.delete(`${API_ENDPOINTS.reports.schedules}/${id}`);
  }

  async runScheduleNow(id: string): Promise<GeneratedReport> {
    return apiClient.post(`${API_ENDPOINTS.reports.schedules}/${id}/run`);
  }

  async getOperationalData(
    startDate: string,
    endDate: string
  ): Promise<OperationalReportData> {
    return apiClient.get(API_ENDPOINTS.reports.dataOperational, { params: { startDate, endDate } });
  }

  async getFinancialData(
    startDate: string,
    endDate: string
  ): Promise<FinancialReportData> {
    return apiClient.get(API_ENDPOINTS.reports.dataFinancial, { params: { startDate, endDate } });
  }

  async getUsageStats(): Promise<ReportUsageStats> {
    return apiClient.get(API_ENDPOINTS.reports.usageStats);
  }

  async getReportCategories(): Promise<string[]> {
    return apiClient.get(`${API_ENDPOINTS.reports.definitions}/categories`);
  }
}

export const reportService = new ReportService();

export default reportService;
