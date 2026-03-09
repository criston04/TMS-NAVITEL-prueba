import type { 
  RetransmissionRecord, 
  RetransmissionStats, 
  RetransmissionFilters,
  GpsCompany 
} from "@/types/monitoring";
import { 
  retransmissionMock, 
  generateRetransmissionStats,
  filterRetransmissionRecords,
  updateRetransmissionComment 
} from "@/mocks/monitoring/retransmission.mock";
import { gpsCompaniesMock, getActiveGpsCompanies } from "@/mocks/monitoring/gps-companies.mock";
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * Servicio de Retransmisión
 * Maneja consultas y actualizaciones de estado de retransmisión GPS
 */
export class RetransmissionService {
  private readonly useMocks: boolean;
  private readonly endpoint = "/monitoring/retransmission";

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Simula delay de red para mocks
   */
  private async simulateDelay(ms: number = 300): Promise<void> {
    if (this.useMocks) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  /**
   * Obtiene todos los registros de retransmisión con filtros opcionales
   */
  async getAll(filters?: RetransmissionFilters): Promise<RetransmissionRecord[]> {
    if (this.useMocks) {
      await this.simulateDelay();
      
      if (!filters) {
        return [...retransmissionMock];
      }
      
      return filterRetransmissionRecords(retransmissionMock, {
        vehicleSearch: filters.vehicleSearch,
        companyId: filters.companyId,
        movementStatus: filters.movementStatus,
        retransmissionStatus: filters.retransmissionStatus,
        gpsCompanyId: filters.gpsCompanyId,
        hasComments: filters.hasComments,
      });
    }

    return apiClient.get<RetransmissionRecord[]>(API_ENDPOINTS.monitoring.retransmission, {
      params: filters as unknown as Record<string, string>,
    });
  }

  /**
   * Obtiene un registro por ID
   */
  async getById(id: string): Promise<RetransmissionRecord | null> {
    if (this.useMocks) {
      await this.simulateDelay(200);
      const record = retransmissionMock.find(r => r.id === id);
      return record || null;
    }

    return apiClient.get<RetransmissionRecord | null>(`${API_ENDPOINTS.monitoring.retransmission}/${id}`);
  }

  /**
   * Actualiza el comentario de un registro
   */
  async updateComment(recordId: string, comment: string): Promise<RetransmissionRecord> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const record = updateRetransmissionComment(recordId, comment);
      
      if (!record) {
        throw new Error(`Record not found: ${recordId}`);
      }
      
      return record;
    }

    return apiClient.patch<RetransmissionRecord>(`${API_ENDPOINTS.monitoring.retransmission}/${recordId}/comment`, { comment });
  }

  /**
   * Obtiene estadísticas de retransmisión
   */
  async getStats(filters?: RetransmissionFilters): Promise<RetransmissionStats> {
    if (this.useMocks) {
      await this.simulateDelay(200);
      
      const records = filters 
        ? filterRetransmissionRecords(retransmissionMock, filters)
        : retransmissionMock;
        
      return generateRetransmissionStats(records);
    }

    return apiClient.get<RetransmissionStats>(`${API_ENDPOINTS.monitoring.retransmission}/stats`, {
      params: filters as unknown as Record<string, string>,
    });
  }

  /**
   * Obtiene lista de empresas GPS
   */
  async getGpsCompanies(): Promise<GpsCompany[]> {
    if (this.useMocks) {
      await this.simulateDelay(100);
      return [...gpsCompaniesMock];
    }

    return apiClient.get<GpsCompany[]>(`${API_ENDPOINTS.monitoring.retransmission}/gps-companies`);
  }

  /**
   * Obtiene solo empresas GPS activas
   */
  async getActiveGpsCompanies(): Promise<GpsCompany[]> {
    if (this.useMocks) {
      await this.simulateDelay(100);
      return getActiveGpsCompanies();
    }

    return apiClient.get<GpsCompany[]>(`${API_ENDPOINTS.monitoring.retransmission}/gps-companies`, {
      params: { active: "true" },
    });
  }

  /**
   * Obtiene lista única de empresas/operadores en los registros
   */
  async getCompanies(): Promise<string[]> {
    if (this.useMocks) {
      await this.simulateDelay(100);
      const companies = new Set(retransmissionMock.map(r => r.companyName));
      return Array.from(companies).sort();
    }

    return apiClient.get<string[]>(`${API_ENDPOINTS.monitoring.retransmission}/companies`);
  }

  /**
   * Exporta registros de retransmisión a CSV
   */
  async exportToCSV(filters?: RetransmissionFilters): Promise<Blob> {
    const records = await this.getAll(filters);
    
    const headers = [
      "ID",
      "Placa",
      "Empresa",
      "GPS Provider",
      "Última Conexión",
      "Estado Movimiento",
      "Estado Retransmisión",
      "Duración Sin Conexión (seg)",
      "Comentarios"
    ].join(",");
    
    const rows = records.map(record => [
      record.id,
      record.vehiclePlate,
      `"${record.companyName}"`,
      record.gpsCompanyName,
      record.lastConnection,
      record.movementStatus,
      record.retransmissionStatus,
      record.disconnectedDuration,
      `"${record.comments || ""}"`,
    ].join(","));
    
    const csv = [headers, ...rows].join("\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8;" });
  }

  /**
   * Marca múltiples registros con el mismo comentario
   */
  async bulkUpdateComments(recordIds: string[], comment: string): Promise<RetransmissionRecord[]> {
    if (this.useMocks) {
      await this.simulateDelay(500);
      
      const updatedRecords: RetransmissionRecord[] = [];
      
      for (const recordId of recordIds) {
        const record = updateRetransmissionComment(recordId, comment);
        if (record) {
          updatedRecords.push(record);
        }
      }
      
      return updatedRecords;
    }

    return apiClient.patch<RetransmissionRecord[]>(`${API_ENDPOINTS.monitoring.retransmission}/bulk-comments`, {
      recordIds,
      comment,
    });
  }
}

/**
 * Singleton del servicio de retransmisión
 */
export const retransmissionService = new RetransmissionService();
