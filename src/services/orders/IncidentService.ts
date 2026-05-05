import type {
  IncidentCatalogItem,
  IncidentCategory,
  IncidentSeverity,
  IncidentRecord,
  IncidentCatalogFilters,
  IncidentStatistics,
  CreateIncidentCatalogItemDTO,
  CreateIncidentRecordDTO,
} from '@/types/incident';
import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * ⚠️ MÓDULO PENDIENTE DE BACKEND (verificado 2026-05-03)
 *
 * `API_ENDPOINTS.operations.incidents` apunta a `/incidents` que NO está en
 * el Excel oficial. La nota del api.config dice "NO EXISTE en backend. Solo
 * mocks." y eso sigue siendo cierto.
 *
 * La UI usa este service vía `useIncidents` en el detalle de orders.
 * Mientras el backend implemente, el hook debe manejar el 404 con
 * `isBackendNotImplemented` para mostrar estado "pendiente".
 *
 * Cuando el backend implemente, este service debería funcionar sin cambios.
 *
 * Ver `otros/docs-backend/...-incidents-...` para detalle del contrato.
 */

/**
 * Etiquetas en español para categorías de incidencias
 */
const incidentCategoryLabels: Record<IncidentCategory, string> = {
  vehicle: 'Vehículo',
  cargo: 'Carga',
  driver: 'Conductor',
  route: 'Ruta',
  customer: 'Cliente',
  weather: 'Clima',
  security: 'Seguridad',
  documentation: 'Documentación',
  other: 'Otro',
};

/**
 * Etiquetas en español para severidad de incidencias
 */
const incidentSeverityLabels: Record<IncidentSeverity, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

/**
 * Colores (clases CSS) para severidad
 */
const incidentSeverityColors: Record<IncidentSeverity, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

/**
 * Clase de servicio para gestión de incidencias
 */
class IncidentService {
  /**
   * Obtiene todos los items del catálogo
   */
  async getCatalogItems(filters?: IncidentCatalogFilters): Promise<IncidentCatalogItem[]> {
    return apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog`, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene items activos del catálogo
   */
  async getActiveCatalogItems(): Promise<IncidentCatalogItem[]> {
    return apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog/active`);
  }

  /**
   * Obtiene un item del catálogo por ID
   */
  async getCatalogItemById(id: string): Promise<IncidentCatalogItem | null> {
    return apiClient.get<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog/${id}`);
  }

  /**
   * Obtiene items por categoría
   */
  async getCatalogItemsByCategory(
    category: IncidentCategory
  ): Promise<IncidentCatalogItem[]> {
    return apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog`, { params: { category } });
  }

  /**
   * Busca en el catálogo
   */
  async searchCatalog(query: string): Promise<IncidentCatalogItem[]> {
    return apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog/search`, { params: { q: query } });
  }

  /**
   * Obtiene categorías con conteo
   */
  async getCategoriesWithCount(): Promise<Map<IncidentCategory, number>> {
    const data = await apiClient.get<Record<IncidentCategory, number>>(`${API_ENDPOINTS.operations.incidents}/catalog/categories`);
    return new Map(Object.entries(data) as [IncidentCategory, number][]);
  }

  /**
   * Crea un nuevo item en el catálogo
   */
  async createCatalogItem(data: CreateIncidentCatalogItemDTO): Promise<IncidentCatalogItem> {
    return apiClient.post<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog`, data);
  }

  /**
   * Actualiza un item del catálogo
   */
  async updateCatalogItem(
    id: string,
    data: Partial<CreateIncidentCatalogItemDTO>
  ): Promise<IncidentCatalogItem> {
    return apiClient.put<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog/${id}`, data);
  }

  /**
   * Desactiva un item del catálogo
   */
  async deactivateCatalogItem(id: string): Promise<IncidentCatalogItem> {
    return apiClient.patch<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog/${id}/deactivate`);
  }

  /**
   * Obtiene incidencias registradas de una orden
   */
  async getOrderIncidents(orderId: string): Promise<IncidentRecord[]> {
    return apiClient.get<IncidentRecord[]>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}`);
  }

  /**
   * Registra una incidencia en una orden
   */
  async createIncidentRecord(
    orderId: string,
    data: CreateIncidentRecordDTO
  ): Promise<IncidentRecord> {
    return apiClient.post<IncidentRecord>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}`, data);
  }

  /**
   * Actualiza una incidencia registrada
   */
  async updateIncidentRecord(
    orderId: string,
    recordId: string,
    data: Partial<IncidentRecord>
  ): Promise<IncidentRecord> {
    return apiClient.put<IncidentRecord>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}/${recordId}`, data);
  }

  /**
   * Resuelve una incidencia
   */
  async resolveIncident(
    orderId: string,
    recordId: string,
    resolution: {
      description: string;
      status: 'resolved' | 'unresolved';
    }
  ): Promise<IncidentRecord> {
    return apiClient.post<IncidentRecord>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}/${recordId}/resolve`, resolution);
  }

  /**
   * Elimina una incidencia registrada
   */
  async deleteIncidentRecord(orderId: string, recordId: string): Promise<boolean> {
    await apiClient.delete(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}/${recordId}`);
    return true;
  }

  /**
   * Obtiene estadísticas de incidencias
   */
  async getStatistics(dateRange?: {
    from: string;
    to: string;
  }): Promise<IncidentStatistics> {
    return apiClient.get<IncidentStatistics>(`${API_ENDPOINTS.operations.incidents}/statistics`, { params: dateRange as unknown as Record<string, string> });
  }

  /**
   * Obtiene labels de categorías
   */
  getCategoryLabels(): Record<IncidentCategory, string> {
    return incidentCategoryLabels;
  }

  /**
   * Obtiene labels de severidad
   */
  getSeverityLabels(): Record<IncidentSeverity, string> {
    return incidentSeverityLabels;
  }

  /**
   * Obtiene colores de severidad
   */
  getSeverityColors(): Record<IncidentSeverity, string> {
    return incidentSeverityColors;
  }
}

/**
 * Instancia singleton del servicio de incidencias
 */
export const incidentService = new IncidentService();

export { IncidentService };
