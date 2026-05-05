import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import type {
  Operator,
  OperatorStats,
  OperatorContact,
  OperatorValidationChecklist,
  OperatorDocument
} from "@/types/models/operator";
import {
  mapOperatorFromBackend,
  mapOperatorToBackend,
  type BackendOperator,
} from "@/lib/transformers/operator.transformer";

// Simulación de delay de red (usado por métodos legacy que combinan fetch+update)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Cache module-scope para getStats (mitiga rate-limit 429 del backend)
const STATS_CACHE_MS = 60_000; // 1 minuto
let operatorsStatsCache: { value: OperatorStats; timestamp: number } | null = null;

/**
 * Filtros para operadores
 */
export interface OperatorFilters {
  search?: string;
  type?: "propio" | "tercero" | "asociado" | "all";
  status?: "enabled" | "blocked" | "pending" | "all";
  checklistComplete?: boolean;
}

/**
 * DTO para crear operador
 */
export interface CreateOperatorDTO {
  code?: string;
  ruc: string;
  businessName: string;
  tradeName?: string;
  type: "propio" | "tercero" | "asociado";
  email: string;
  phone: string;
  fiscalAddress: string;
  contacts?: OperatorContact[];
  contractStartDate?: string;
  contractEndDate?: string;
  notes?: string;
}

/**
 * DTO para actualizar operador
 */
export interface UpdateOperatorDTO extends Partial<CreateOperatorDTO> {
  status?: "enabled" | "blocked" | "pending";
  checklist?: OperatorValidationChecklist;
  documents?: OperatorDocument[];
}

/**
 * Respuesta paginada de operadores
 */
export interface OperatorsResponse {
  data: Operator[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Servicio de Operadores Logísticos
 */
class OperatorsService {
  /**
   * Obtiene todos los operadores con filtros opcionales
   */
  async getAll(filters?: OperatorFilters): Promise<Operator[]> {
    return this.fetchListFromBackend(filters as Record<string, unknown>);
  }

  /**
   * Helper: GET backend con envelope {items|data} + transformer aplicado
   */
  private async fetchListFromBackend(params?: Record<string, unknown>): Promise<Operator[]> {
    const response = await apiClient.get<Record<string, unknown>>(
      API_ENDPOINTS.master.operators,
      { params: params as Record<string, string> }
    );
    const rawList = ((response.items ?? response.data ?? []) as unknown[])
      .filter((x): x is BackendOperator => typeof x === "object" && x !== null);
    return rawList.map(mapOperatorFromBackend);
  }

  /**
   * Obtiene operadores paginados
   */
  async getPaginated(
    filters?: OperatorFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<OperatorsResponse> {
    const response = await apiClient.get<Record<string, unknown>>(
      API_ENDPOINTS.master.operators,
      { params: { ...filters, page, pageSize } as unknown as Record<string, string> }
    );
    const rawList = ((response.items ?? response.data ?? []) as unknown[])
      .filter((x): x is BackendOperator => typeof x === "object" && x !== null);
    const data = rawList.map(mapOperatorFromBackend);

    const meta = (response.meta ?? response.pagination ?? {}) as Record<string, number>;
    const total = meta.total ?? meta.totalItems ?? data.length;
    const totalPages = meta.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

    return {
      data,
      total,
      page: meta.page ?? page,
      pageSize: meta.pageSize ?? pageSize,
      totalPages,
    };
  }

  /**
   * Obtiene un operador por ID
   */
  async getById(id: string): Promise<Operator | null> {
    return this.withMissingEndpointDetection(
      "Detalle operador (GET /master/operators/:id)",
      async () => {
        const response = await apiClient.get<Record<string, unknown>>(`${API_ENDPOINTS.master.operators}/${id}`);
        const raw = (response.data ?? response) as BackendOperator;
        if (!raw || typeof raw !== "object") return null;
        return mapOperatorFromBackend(raw);
      }
    );
  }

  /**
   * 2026-05-03: Helper privado para detectar endpoints no implementados.
   *
   * IMPORTANTE: cambio de diagnóstico. Antes este helper se llamaba
   * `withIdBugDetection` y atribuía los 404 al "bug NGINX". Investigación
   * profunda confirmó que NGINX NO está bloqueando nada (proxea todo al
   * backend). El "Not Found" plain text 9 bytes es el handler 404 default
   * del framework backend cuando la ruta NO está implementada.
   */
  private async withMissingEndpointDetection<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        const explanatory = new Error(
          `${operation} no está disponible: el backend devuelve 404 porque ` +
          `esta ruta NO está implementada en producción.`
        ) as Error & { status?: number; backendNotImplemented?: boolean };
        explanatory.status = 404;
        explanatory.backendNotImplemented = true;
        throw explanatory;
      }
      throw err;
    }
  }

  /**
   * Obtiene un operador por código.
   *
   * 2026-05-03: NO está en el Excel oficial pero el backend SI lo tiene
   * implementado y devuelve 200 en producción (verificado). Es un endpoint
   * implementado pero no documentado — gap del Excel oficial.
   */
  async getByCode(code: string): Promise<Operator | null> {
    return apiClient.getOptional<Operator>(`${API_ENDPOINTS.master.operators}/by-code/${code}`);
  }

  /**
   * Obtiene un operador por RUC.
   *
   * 2026-05-03: NO está en el Excel oficial pero el backend SI lo tiene
   * implementado y devuelve 200 en producción (verificado).
   */
  async getByRuc(ruc: string): Promise<Operator | null> {
    return apiClient.getOptional<Operator>(`${API_ENDPOINTS.master.operators}/by-ruc/${ruc}`);
  }

  /**
   * Crea un nuevo operador
   */
  async create(data: CreateOperatorDTO): Promise<Operator> {
    // Auto-generar code si no viene del form. El backend lo exige obligatorio
    // y devuelve 400 si falta.
    if (!data.code) {
      const ts = Date.now().toString(36).toUpperCase();
      data = { ...data, code: `OPL-${ts}` };
    }

    const payload = mapOperatorToBackend(data as Partial<Operator>);
    try {
      const response = await apiClient.post<Record<string, unknown>>(API_ENDPOINTS.master.operators, payload);
      const raw = (response.data ?? response) as BackendOperator;
      // Invalidar cache de stats — al crear cambia el total
      operatorsStatsCache = null;
      return mapOperatorFromBackend(raw);
    } catch (err) {
      // Logging para diagnóstico — el backend muchas veces devuelve mensajes
      // poco específicos. Imprimimos el body que enviamos.
      console.error("[operatorsService.create] Error al crear operador. Payload enviado:", payload);
      console.error("[operatorsService.create] Error original:", err);
      throw err;
    }
  }

  /**
   * Actualiza un operador existente
   */
  async update(id: string, data: UpdateOperatorDTO): Promise<Operator> {
    const payload = mapOperatorToBackend(data as Partial<Operator>);
    return this.withMissingEndpointDetection(
      "Actualizar operador (PUT /master/operators/:id)",
      async () => {
        const response = await apiClient.put<Record<string, unknown>>(`${API_ENDPOINTS.master.operators}/${id}`, payload);
        const raw = (response.data ?? response) as BackendOperator;
        return mapOperatorFromBackend(raw);
      }
    );
  }

  /**
   * Elimina un operador
   */
  async delete(id: string): Promise<boolean> {
    return this.withMissingEndpointDetection(
      "Eliminar operador (DELETE /master/operators/:id)",
      () => apiClient.delete(`${API_ENDPOINTS.master.operators}/${id}`)
    );
  }

  /**
   * Cambia el estado de un operador
   */
  async changeStatus(id: string, status: "enabled" | "blocked" | "pending"): Promise<Operator> {
    // Backend NO tiene PATCH /:id/status. Usamos el endpoint update generico PUT /:id.
    return this.update(id, { status });
  }

  /**
   * Actualiza el checklist de un operador
   */
  async updateChecklist(id: string, checklist: OperatorValidationChecklist): Promise<Operator> {
    // Backend NO tiene PUT /:id/checklist. Usamos update generico.
    return this.update(id, { checklist });
  }

  /**
   * Marca un ítem del checklist
   * Backend NO tiene endpoints dedicados — fetch + modify + update generico.
   */
  async checkItem(id: string, itemId: string, checked: boolean): Promise<Operator> {
    await delay(200);

    const operator = await this.getById(id);
    if (!operator) {
      throw new Error("Operador no encontrado");
    }

    const now = new Date().toISOString();
    const updatedItems = operator.checklist.items.map(item =>
      item.id === itemId ? { ...item, checked, date: checked ? now.split("T")[0] : undefined } : item
    );

    const isComplete = updatedItems.every(item => item.checked);

    return this.update(id, {
      checklist: {
        items: updatedItems,
        isComplete,
        lastUpdated: now,
      },
    });
  }

  /**
   * Agrega un documento a un operador
   * Backend NO tiene POST /:id/documents — fetch + append + update generico.
   */
  async addDocument(id: string, document: OperatorDocument): Promise<Operator> {
    await delay(300);

    const operator = await this.getById(id);
    if (!operator) {
      throw new Error("Operador no encontrado");
    }

    const documents = [...operator.documents, document];
    return this.update(id, { documents });
  }

  /**
   * Agrega un contacto a un operador
   * Backend NO tiene POST /:id/contacts — fetch + append + update generico.
   */
  async addContact(id: string, contact: OperatorContact): Promise<Operator> {
    await delay(300);

    const operator = await this.getById(id);
    if (!operator) {
      throw new Error("Operador no encontrado");
    }

    const contacts = [...operator.contacts, contact];
    return this.update(id, { contacts } as UpdateOperatorDTO);
  }

  /**
   * Obtiene estadísticas de operadores
   */
  async getStats(): Promise<OperatorStats> {
    // BUG #1 backend: /stats devuelve 404 porque el router resuelve /:id antes.
    // BUG #2: el backend tiene rate limit agresivo y devuelve 429 con frecuencia
    //          para los endpoints /stats. Cacheamos client-side para no spamear.
    const now = Date.now();
    if (operatorsStatsCache && now - operatorsStatsCache.timestamp < STATS_CACHE_MS) {
      return operatorsStatsCache.value;
    }

    try {
      const fresh = await apiClient.get<OperatorStats>(`${API_ENDPOINTS.master.operators}/stats`);
      operatorsStatsCache = { value: fresh, timestamp: now };
      return fresh;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        console.warn("[operatorsService.getStats] backend 404 (BUG #1). Calculando stats client-side.");
        const fallback = await this.computeStatsFromList();
        operatorsStatsCache = { value: fallback, timestamp: now };
        return fallback;
      }
      if (status === 429) {
        console.warn("[operatorsService.getStats] backend 429 Too Many Requests. Calculando stats client-side y cacheando 60s.");
        const fallback = await this.computeStatsFromList();
        operatorsStatsCache = { value: fallback, timestamp: now };
        return fallback;
      }
      throw err;
    }
  }

  /**
   * Calcula stats a partir del listado real (fallback cuando backend /stats falla)
   */
  private async computeStatsFromList(): Promise<OperatorStats> {
    try {
      const items = await this.fetchListFromBackend({ pageSize: 200 });
      return {
        total: items.length,
        enabled: items.filter(o => o.status === "enabled").length,
        blocked: items.filter(o => o.status === "blocked").length,
        pendingValidation: items.filter(o => o.status === "pending").length,
        propios: items.filter(o => o.type === "propio").length,
        terceros: items.filter(o => o.type === "tercero").length,
      };
    } catch {
      return {
        total: 0, enabled: 0, blocked: 0,
        pendingValidation: 0, propios: 0, terceros: 0,
      };
    }
  }

  /**
   * Obtiene operadores habilitados (para selects)
   */
  async getEnabled(): Promise<Operator[]> {
    return this.fetchListFromBackend({ status: "active" });
  }

  /**
   * Busca operadores por texto
   */
  async search(query: string): Promise<Operator[]> {
    // NOTE: backend NO expone /search dedicado. Usamos GET /master/operators con filtro search.
    return this.fetchListFromBackend({ search: query });
  }
}

export const operatorsService = new OperatorsService();
export { OperatorsService };
