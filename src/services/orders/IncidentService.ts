import type {
  IncidentCatalogItem,
  IncidentCategory,
  IncidentSeverity,
  IncidentRecord,
  IncidentAdditionalField,
  IncidentCatalogFilters,
  IncidentStatistics,
  CreateIncidentCatalogItemDTO,
  CreateIncidentRecordDTO,
} from '@/types/incident';
import {
  mockIncidentsCatalog,
  searchIncidentCatalog,
  getIncidentCategoriesWithCount,
  incidentCategoryLabels,
  incidentSeverityLabels,
  incidentSeverityColors,
} from '@/mocks/orders/incidents.mock';
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * Simula latencia de red
 */
const simulateDelay = (ms: number = 300): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Genera un ID único
 */
const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Clase de servicio para gestión de incidencias
 */
class IncidentService {
  private catalog: IncidentCatalogItem[] = [...mockIncidentsCatalog];
  private readonly records: Map<string, IncidentRecord[]> = new Map();
  private readonly useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Obtiene todos los items del catálogo
   * @param filters - Filtros opcionales
   * @returns Promesa con items del catálogo
   */
  async getCatalogItems(filters?: IncidentCatalogFilters): Promise<IncidentCatalogItem[]> {
    if (this.useMocks) {
      await simulateDelay();

      let result = [...this.catalog];

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(
          item =>
            item.name.toLowerCase().includes(searchLower) ||
            item.description.toLowerCase().includes(searchLower) ||
            item.code.toLowerCase().includes(searchLower) ||
            item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      if (filters?.category) {
        result = result.filter(item => item.category === filters.category);
      }

      if (filters?.severity) {
        result = result.filter(item => item.defaultSeverity === filters.severity);
      }

      if (filters?.status) {
        result = result.filter(item => item.status === filters.status);
      }

      if (filters?.requiresEvidence !== undefined) {
        result = result.filter(item => item.requiresEvidence === filters.requiresEvidence);
      }

      if (filters?.requiresImmediateAction !== undefined) {
        result = result.filter(
          item => item.requiresImmediateAction === filters.requiresImmediateAction
        );
      }

      return result.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog`, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene items activos del catálogo
   * @returns Promesa con items activos
   */
  async getActiveCatalogItems(): Promise<IncidentCatalogItem[]> {
    if (this.useMocks) {
      await simulateDelay(200);
      return this.catalog.filter(item => item.status === 'active');
    }
    return apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog/active`);
  }

  /**
   * Obtiene un item del catálogo por ID
   * @param id - ID del item
   * @returns Promesa con el item o null
   */
  async getCatalogItemById(id: string): Promise<IncidentCatalogItem | null> {
    if (this.useMocks) {
      await simulateDelay(100);
      return this.catalog.find(item => item.id === id) ?? null;
    }
    return apiClient.get<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog/${id}`);
  }

  /**
   * Obtiene items por categoría
   * @param category - Categoría de incidencias
   * @returns Promesa con items de la categoría
   */
  async getCatalogItemsByCategory(
    category: IncidentCategory
  ): Promise<IncidentCatalogItem[]> {
    if (this.useMocks) {
      await simulateDelay(200);
      return this.catalog.filter(
        item => item.category === category && item.status === 'active'
      );
    }
    return apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog`, { params: { category } });
  }

  /**
   * Busca en el catálogo
   * @param query - Texto de búsqueda
   * @returns Promesa con items que coinciden
   */
  async searchCatalog(query: string): Promise<IncidentCatalogItem[]> {
    if (this.useMocks) {
      await simulateDelay(200);
      return searchIncidentCatalog(query);
    }
    return apiClient.get<IncidentCatalogItem[]>(`${API_ENDPOINTS.operations.incidents}/catalog/search`, { params: { q: query } });
  }

  /**
   * Obtiene categorías con conteo
   * @returns Promesa con mapa de categorías a cantidad
   */
  async getCategoriesWithCount(): Promise<Map<IncidentCategory, number>> {
    if (this.useMocks) {
      await simulateDelay(100);
      return getIncidentCategoriesWithCount();
    }
    const data = await apiClient.get<Record<IncidentCategory, number>>(`${API_ENDPOINTS.operations.incidents}/catalog/categories`);
    return new Map(Object.entries(data) as [IncidentCategory, number][]);
  }

  /**
   * Crea un nuevo item en el catálogo
   * @param data - Datos del item
   * @returns Promesa con el item creado
   */
  async createCatalogItem(data: CreateIncidentCatalogItemDTO): Promise<IncidentCatalogItem> {
    if (this.useMocks) {
      await simulateDelay(500);

      const now = new Date().toISOString();
      const maxSortOrder = Math.max(...this.catalog.map(i => i.sortOrder), 0);

      const newItem: IncidentCatalogItem = {
        id: generateId('inc'),
        code: data.code,
        name: data.name,
        description: data.description,
        category: data.category,
        defaultSeverity: data.defaultSeverity,
        requiresEvidence: data.requiresEvidence,
        acceptedEvidenceTypes: data.acceptedEvidenceTypes,
        minEvidenceCount: data.minEvidenceCount,
        requiresImmediateAction: data.requiresImmediateAction,
        suggestedActions: data.suggestedActions,
        descriptionTemplate: data.descriptionTemplate,
        additionalFields: data.additionalFields?.map((field, i) => ({
          ...field,
          id: `${generateId('field')}-${i}`,
        })),
        affectsCompliance: data.affectsCompliance,
        autoNotifyRoles: data.autoNotifyRoles,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        sortOrder: maxSortOrder + 1,
        tags: data.tags,
      };

      this.catalog.push(newItem);
      return newItem;
    }
    return apiClient.post<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog`, data);
  }

  /**
   * Actualiza un item del catálogo
   * @param id - ID del item
   * @param data - Datos a actualizar
   * @returns Promesa con el item actualizado
   */
  async updateCatalogItem(
    id: string,
    data: Partial<CreateIncidentCatalogItemDTO>
  ): Promise<IncidentCatalogItem> {
    if (this.useMocks) {
      await simulateDelay(400);

      const index = this.catalog.findIndex(item => item.id === id);
      if (index === -1) {
        throw new Error(`Incident catalog item ${id} not found`);
      }

      const updatedItem: IncidentCatalogItem = {
        ...this.catalog[index],
        ...data,
        updatedAt: new Date().toISOString(),
        additionalFields: data.additionalFields
          ? data.additionalFields.map((field, i): IncidentAdditionalField => ({
              ...field,
              id: `${id}-field-${i + 1}`,
            }))
          : this.catalog[index].additionalFields,
      };

      this.catalog[index] = updatedItem;
      return updatedItem;
    }
    return apiClient.put<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog/${id}`, data);
  }

  /**
   * Desactiva un item del catálogo
   * @param id - ID del item
   * @returns Promesa con el item desactivado
   */
  async deactivateCatalogItem(id: string): Promise<IncidentCatalogItem> {
    if (this.useMocks) {
      return this.updateCatalogItem(id, { status: 'inactive' } as never);
    }
    return apiClient.patch<IncidentCatalogItem>(`${API_ENDPOINTS.operations.incidents}/catalog/${id}/deactivate`);
  }

  /**
   * Obtiene incidencias registradas de una orden
   * @param orderId - ID de la orden
   * @returns Promesa con incidencias de la orden
   */
  async getOrderIncidents(orderId: string): Promise<IncidentRecord[]> {
    if (this.useMocks) {
      await simulateDelay(200);
      return this.records.get(orderId) ?? [];
    }
    return apiClient.get<IncidentRecord[]>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}`);
  }

  /**
   * Registra una incidencia en una orden
   * @param orderId - ID de la orden
   * @param data - Datos de la incidencia
   * @returns Promesa con la incidencia registrada
   */
  async createIncidentRecord(
    orderId: string,
    data: CreateIncidentRecordDTO
  ): Promise<IncidentRecord> {
    if (this.useMocks) {
      await simulateDelay(400);

      let catalogItem: IncidentCatalogItem | undefined;
      let name: string;
      let category: IncidentCategory;

      if (data.type === 'catalog' && data.catalogItemId) {
        catalogItem = await this.getCatalogItemById(data.catalogItemId) ?? undefined;
        if (!catalogItem) {
          throw new Error(`Catalog item ${data.catalogItemId} not found`);
        }
        name = catalogItem.name;
        category = catalogItem.category;
      } else {
        if (!data.customName || !data.category) {
          throw new Error('Custom name and category are required for free text incidents');
        }
        name = data.customName;
        category = data.category;
      }

      const now = new Date().toISOString();

      const record: IncidentRecord = {
        id: generateId('inc-rec'),
        orderId,
        catalogItemId: data.catalogItemId ?? null,
        catalogItem,
        type: data.type,
        name,
        description: data.description,
        category,
        severity: data.severity,
        occurredAt: data.occurredAt,
        milestoneId: data.milestoneId,
        location: data.location,
        actionTaken: data.actionTaken,
        resolutionStatus: 'pending',
        evidence: [],
        additionalFieldValues: data.additionalFieldValues,
        reportedBy: 'current-user',
        reportedByName: 'Usuario Actual',
        reportedAt: now,
      };

      const orderRecords = this.records.get(orderId) ?? [];
      orderRecords.push(record);
      this.records.set(orderId, orderRecords);

      return record;
    }
    return apiClient.post<IncidentRecord>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}`, data);
  }

  /**
   * Actualiza una incidencia registrada
   * @param orderId - ID de la orden
   * @param recordId - ID del registro
   * @param data - Datos a actualizar
   * @returns Promesa con la incidencia actualizada
   */
  async updateIncidentRecord(
    orderId: string,
    recordId: string,
    data: Partial<IncidentRecord>
  ): Promise<IncidentRecord> {
    if (this.useMocks) {
      await simulateDelay(300);

      const orderRecords = this.records.get(orderId);
      if (!orderRecords) {
        throw new Error(`No incidents found for order ${orderId}`);
      }

      const index = orderRecords.findIndex(r => r.id === recordId);
      if (index === -1) {
        throw new Error(`Incident record ${recordId} not found`);
      }

      const updatedRecord: IncidentRecord = {
        ...orderRecords[index],
        ...data,
      };

      orderRecords[index] = updatedRecord;
      this.records.set(orderId, orderRecords);

      return updatedRecord;
    }
    return apiClient.put<IncidentRecord>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}/${recordId}`, data);
  }

  /**
   * Resuelve una incidencia
   * @param orderId - ID de la orden
   * @param recordId - ID del registro
   * @param resolution - Datos de resolución
   * @returns Promesa con la incidencia resuelta
   */
  async resolveIncident(
    orderId: string,
    recordId: string,
    resolution: {
      description: string;
      status: 'resolved' | 'unresolved';
    }
  ): Promise<IncidentRecord> {
    if (this.useMocks) {
      return this.updateIncidentRecord(orderId, recordId, {
        resolutionStatus: resolution.status,
        resolutionDescription: resolution.description,
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'current-user',
      });
    }
    return apiClient.post<IncidentRecord>(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}/${recordId}/resolve`, resolution);
  }

  /**
   * Elimina una incidencia registrada
   * @param orderId - ID de la orden
   * @param recordId - ID del registro
   * @returns Promesa que indica éxito
   */
  async deleteIncidentRecord(orderId: string, recordId: string): Promise<boolean> {
    if (this.useMocks) {
      await simulateDelay(200);

      const orderRecords = this.records.get(orderId);
      if (!orderRecords) {
        return false;
      }

      const index = orderRecords.findIndex(r => r.id === recordId);
      if (index === -1) {
        return false;
      }

      orderRecords.splice(index, 1);
      this.records.set(orderId, orderRecords);

      return true;
    }
    await apiClient.delete(`${API_ENDPOINTS.operations.incidents}/orders/${orderId}/${recordId}`);
    return true;
  }

  /**
   * Obtiene estadísticas de incidencias
   * @param dateRange - Rango de fechas opcional
   * @returns Promesa con estadísticas
   */
  async getStatistics(dateRange?: {
    from: string;
    to: string;
  }): Promise<IncidentStatistics> {
    if (this.useMocks) {
      await simulateDelay(300);

      const allRecords: IncidentRecord[] = [];
      this.records.forEach(records => {
        if (dateRange) {
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          records.forEach(r => {
            const recordDate = new Date(r.occurredAt);
            if (recordDate >= fromDate && recordDate <= toDate) {
              allRecords.push(r);
            }
          });
        } else {
          allRecords.push(...records);
        }
      });

      // Contar por categoría
      const byCategory: Record<IncidentCategory, number> = {
        vehicle: 0,
        cargo: 0,
        driver: 0,
        route: 0,
        customer: 0,
        weather: 0,
        security: 0,
        documentation: 0,
        other: 0,
      };
      allRecords.forEach(r => {
        byCategory[r.category]++;
      });

      // Contar por severidad
      const bySeverity: Record<IncidentSeverity, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };
      allRecords.forEach(r => {
        bySeverity[r.severity]++;
      });

      // Contar por estado de resolución
      const byResolutionStatus: Record<string, number> = {
        pending: 0,
        in_progress: 0,
        resolved: 0,
        unresolved: 0,
      };
      allRecords.forEach(r => {
        byResolutionStatus[r.resolutionStatus]++;
      });

      // Contar por tipo
      const byType = {
        catalog: allRecords.filter(r => r.type === 'catalog').length,
        freeText: allRecords.filter(r => r.type === 'free_text').length,
      };

      // Top 10 incidencias más frecuentes
      const incidentCounts = new Map<string, { name: string; count: number; catalogItemId?: string }>();
      allRecords.forEach(r => {
        const key = r.catalogItemId ?? r.name;
        const existing = incidentCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          incidentCounts.set(key, {
            name: r.name,
            count: 1,
            catalogItemId: r.catalogItemId ?? undefined,
          });
        }
      });

      const topIncidents = Array.from(incidentCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        total: allRecords.length,
        byCategory,
        bySeverity,
        byResolutionStatus,
        byType,
        topIncidents,
        period: {
          from: dateRange?.from ?? new Date(0).toISOString(),
          to: dateRange?.to ?? new Date().toISOString(),
        },
      };
    }
    return apiClient.get<IncidentStatistics>(`${API_ENDPOINTS.operations.incidents}/statistics`, { params: dateRange as unknown as Record<string, string> });
  }

  /**
   * Obtiene labels de categorías
   * @returns Mapa de categoría a label
   */
  getCategoryLabels(): Record<IncidentCategory, string> {
    return incidentCategoryLabels;
  }

  /**
   * Obtiene labels de severidad
   * @returns Mapa de severidad a label
   */
  getSeverityLabels(): Record<IncidentSeverity, string> {
    return incidentSeverityLabels;
  }

  /**
   * Obtiene colores de severidad
   * @returns Mapa de severidad a clases CSS
   */
  getSeverityColors(): Record<IncidentSeverity, string> {
    return incidentSeverityColors;
  }
}

/**
 * Instancia singleton del servicio de incidencias
 */
export const incidentService = new IncidentService();

/**
 * Exporta la clase para testing
 */
export { IncidentService };
