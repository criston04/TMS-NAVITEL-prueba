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
import { API_ENDPOINTS, BACKEND_FEATURES } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import { safeCall, withMissingEndpointDetection } from "@/services/missing-endpoint-helper";

/**
 * 2026-05-05: Empty IncidentStatistics que devolvemos cuando el backend
 * de incidents no esta implementado. Misma forma que el contrato real,
 * todos los conteos en 0.
 */
const EMPTY_STATS = {
  total: 0,
  byCategory: {} as Record<string, number>,
  bySeverity: {} as Record<string, number>,
  byResolutionStatus: {} as Record<string, number>,
  byType: { catalog: 0, freeText: 0 },
  topIncidents: [] as Array<{ name: string; count: number; catalogItemId?: string }>,
  period: { from: '', to: '' },
};

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
   * Obtiene todos los items del catálogo.
   * 2026-05-05: si el feature flag esta off, NO hace fetch (Network limpio).
   */
  async getCatalogItems(filters?: IncidentCatalogFilters): Promise<IncidentCatalogItem[]> {
    if (!BACKEND_FEATURES.incidents) return [];
    return safeCall(
      "GET /incidents/catalog",
      () => apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog`, { params: filters as unknown as Record<string, string> }),
      []
    );
  }

  /**
   * Obtiene items activos del catálogo.
   */
  async getActiveCatalogItems(): Promise<IncidentCatalogItem[]> {
    if (!BACKEND_FEATURES.incidents) return [];
    return safeCall(
      "GET /incidents/catalog/active",
      () => apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog/active`),
      []
    );
  }

  /**
   * Obtiene un item del catálogo por ID.
   */
  async getCatalogItemById(id: string): Promise<IncidentCatalogItem | null> {
    if (!BACKEND_FEATURES.incidents) return null;
    return safeCall(
      "GET /incidents/catalog/:id",
      () => apiClient.get<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog/${id}`),
      null
    );
  }

  /**
   * Obtiene items por categoría.
   */
  async getCatalogItemsByCategory(
    category: IncidentCategory
  ): Promise<IncidentCatalogItem[]> {
    if (!BACKEND_FEATURES.incidents) return [];
    return safeCall(
      "GET /incidents/catalog?category=",
      () => apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog`, { params: { category } }),
      []
    );
  }

  /**
   * Busca en el catálogo.
   */
  async searchCatalog(query: string): Promise<IncidentCatalogItem[]> {
    if (!BACKEND_FEATURES.incidents) return [];
    return safeCall(
      "GET /incidents/catalog/search",
      () => apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog/search`, { params: { q: query } }),
      []
    );
  }

  /**
   * Obtiene categorías con conteo.
   */
  async getCategoriesWithCount(): Promise<Map<IncidentCategory, number>> {
    if (!BACKEND_FEATURES.incidents) return new Map();
    const data = await safeCall(
      "GET /incidents/catalog/categories",
      () => apiClient.get<Record<IncidentCategory, number>>(`${API_ENDPOINTS.operations.incidents}/catalog/categories`),
      {} as Record<IncidentCategory, number>
    );
    return new Map(Object.entries(data) as [IncidentCategory, number][]);
  }

  /**
   * Crea un nuevo item en el catálogo.
   * 2026-05-05: writes lanzan error explicativo si backend no implementa.
   */
  async createCatalogItem(data: CreateIncidentCatalogItemDTO): Promise<IncidentCatalogItem> {
    if (!BACKEND_FEATURES.incidents) {
      throw Object.assign(
        new Error("El modulo de Incidencias todavia no esta disponible en el backend. La funcionalidad estara activa cuando el equipo backend lo implemente."),
        { backendNotImplemented: true, status: 404 }
      );
    }
    return withMissingEndpointDetection(
      "POST /incidents/catalog",
      () => apiClient.post<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog`, data)
    );
  }

  /**
   * Actualiza un item del catálogo.
   */
  async updateCatalogItem(
    id: string,
    data: Partial<CreateIncidentCatalogItemDTO>
  ): Promise<IncidentCatalogItem> {
    if (!BACKEND_FEATURES.incidents) {
      throw Object.assign(
        new Error("El modulo de Incidencias todavia no esta disponible en el backend. La funcionalidad estara activa cuando el equipo backend lo implemente."),
        { backendNotImplemented: true, status: 404 }
      );
    }
    return withMissingEndpointDetection(
      "PUT /incidents/catalog/:id",
      () => apiClient.put<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog/${id}`, data)
    );
  }

  /**
   * Desactiva un item del catálogo.
   */
  async deactivateCatalogItem(id: string): Promise<IncidentCatalogItem> {
    if (!BACKEND_FEATURES.incidents) {
      throw Object.assign(
        new Error("El modulo de Incidencias todavia no esta disponible en el backend. La funcionalidad estara activa cuando el equipo backend lo implemente."),
        { backendNotImplemented: true, status: 404 }
      );
    }
    return withMissingEndpointDetection(
      "PATCH /incidents/catalog/:id/deactivate",
      () => apiClient.patch<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog/${id}/deactivate`)
    );
  }

  /**
   * Obtiene incidencias registradas de una orden.
   * 2026-05-05: si feature flag off, NO firingea el request (Network limpio).
   */
  async getOrderIncidents(orderId: string): Promise<IncidentRecord[]> {
    if (!BACKEND_FEATURES.incidents) return [];
    return safeCall(
      "GET /incidents/orders/:id",
      () => apiClient.get<IncidentRecord[]>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}`),
      []
    );
  }

  /**
   * Registra una incidencia en una orden.
   */
  async createIncidentRecord(
    orderId: string,
    data: CreateIncidentRecordDTO
  ): Promise<IncidentRecord> {
    if (!BACKEND_FEATURES.incidents) {
      throw Object.assign(
        new Error("El modulo de Incidencias todavia no esta disponible en el backend. La funcionalidad estara activa cuando el equipo backend lo implemente."),
        { backendNotImplemented: true, status: 404 }
      );
    }
    return withMissingEndpointDetection(
      "POST /incidents/orders/:id",
      () => apiClient.post<IncidentRecord>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}`, data)
    );
  }

  /**
   * Actualiza una incidencia registrada.
   */
  async updateIncidentRecord(
    orderId: string,
    recordId: string,
    data: Partial<IncidentRecord>
  ): Promise<IncidentRecord> {
    if (!BACKEND_FEATURES.incidents) {
      throw Object.assign(
        new Error("El modulo de Incidencias todavia no esta disponible en el backend. La funcionalidad estara activa cuando el equipo backend lo implemente."),
        { backendNotImplemented: true, status: 404 }
      );
    }
    return withMissingEndpointDetection(
      "PUT /incidents/orders/:id/:recordId",
      () => apiClient.put<IncidentRecord>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}/${recordId}`, data)
    );
  }

  /**
   * Resuelve una incidencia.
   */
  async resolveIncident(
    orderId: string,
    recordId: string,
    resolution: {
      description: string;
      status: 'resolved' | 'unresolved';
    }
  ): Promise<IncidentRecord> {
    if (!BACKEND_FEATURES.incidents) {
      throw Object.assign(
        new Error("El modulo de Incidencias todavia no esta disponible en el backend. La funcionalidad estara activa cuando el equipo backend lo implemente."),
        { backendNotImplemented: true, status: 404 }
      );
    }
    return withMissingEndpointDetection(
      "POST /incidents/orders/:id/:recordId/resolve",
      () => apiClient.post<IncidentRecord>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}/${recordId}/resolve`, resolution)
    );
  }

  /**
   * Elimina una incidencia registrada.
   */
  async deleteIncidentRecord(orderId: string, recordId: string): Promise<boolean> {
    await withMissingEndpointDetection(
      "DELETE /incidents/orders/:id/:recordId",
      () => apiClient.delete(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}/${recordId}`)
    );
    return true;
  }

  /**
   * Obtiene estadísticas de incidencias.
   * 2026-05-05: si feature flag off, devuelve EMPTY_STATS sin firingear.
   */
  async getStatistics(dateRange?: {
    from: string;
    to: string;
  }): Promise<IncidentStatistics> {
    const fallbackStats: IncidentStatistics = {
      ...EMPTY_STATS,
      byCategory: {} as Record<IncidentCategory, number>,
      bySeverity: {} as Record<IncidentSeverity, number>,
      period: { from: dateRange?.from ?? '', to: dateRange?.to ?? '' },
    };
    if (!BACKEND_FEATURES.incidents) return fallbackStats;
    return safeCall(
      "GET /incidents/statistics",
      () => apiClient.get<IncidentStatistics>(`${API_ENDPOINTS.operations.incidents}/statistics`, { params: dateRange as unknown as Record<string, string> }),
      fallbackStats
    );
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
