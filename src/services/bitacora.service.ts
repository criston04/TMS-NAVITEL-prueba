/**
 * Servicio de Bitacora
 *
 * Consume los 15 endpoints del backend bajo /api/v1/bitacora/*:
 *  - GET    /bitacora                       listar entries (paginado + filtros)
 *  - GET    /bitacora/:id                   detalle
 *  - POST   /bitacora                       crear entry (manual)
 *  - GET    /bitacora/stats                 stats por estado y severity
 *  - GET    /bitacora/summary/vehicles      resumen agrupado por vehiculo
 *  - GET    /bitacora/summary/geofences     resumen agrupado por geocerca
 *  - GET    /bitacora/export                exportar (csv/json/xlsx)
 *  - GET    /bitacora/geofence-breaches     listar breaches
 *  - GET    /bitacora/vehicle/:vehicleId    historial por vehiculo
 *  - PUT    /bitacora/:id/review            marcar como revisado
 *  - PUT    /bitacora/:id/dismiss           descartar
 *  - PUT    /bitacora/:id/notes             actualizar notas del operador
 *  - PUT    /bitacora/:id/assign-order      asignar a una orden
 *  - POST   /bitacora/:id/create-order      crear orden desde la entry
 *  - PUT    /bitacora/:id/complete          completar entry (calcula dwell_time)
 */

import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import { snakeToCamel } from "@/lib/case-converter";
import { withMissingEndpointDetection } from "@/services/missing-endpoint-helper";
import type {
  BitacoraEntry,
  BitacoraFilters,
  BitacoraStats,
  BitacoraVehicleSummary,
  BitacoraGeofenceSummary,
  CreateOrderFromBitacoraDTO,
} from "@/types/bitacora";

type ListResponse<T> = { data?: T[]; items?: T[]; total?: number; meta?: { total?: number; page?: number; pageSize?: number } };

/**
 * Helper: extrae items y aplica `snakeToCamel`.
 *
 * 2026-05-03 (UI bug fix): el backend de bitacora devuelve los campos en
 * snake_case (`event_type`, `vehicle_id`, `vehicle_plate`, `start_timestamp`,
 * etc.) pero el frontend tipa los modelos en camelCase. Sin esta conversión,
 * componentes que leen `entry.eventType` o `entry.startTimestamp` reciben
 * undefined.
 */
function extractList<T>(response: ListResponse<T> | T[]): { items: T[]; total: number } {
  if (Array.isArray(response)) {
    return { items: response.map((item) => snakeToCamel<T>(item)), total: response.length };
  }
  const rawItems = (response.items ?? response.data ?? []) as T[];
  const items = rawItems.map((item) => snakeToCamel<T>(item));
  const total = response.total ?? response.meta?.total ?? items.length;
  return { items, total };
}

/**
 * Normaliza una BitacoraEntry para que la UI nunca crashee:
 *  - Sintetiza `coordinates` desde `lat`/`lng` que el backend devuelve planos
 *  - Default de `eventType` cuando viene "" o null (BD permite vacíos)
 *  - Coerce `wasExpected` numérico (0/1) a boolean
 *  - Default de `vehiclePlate` para que `.toLowerCase()` no truene
 */
function normalizeEntry(raw: BitacoraEntry & { lat?: number | null; lng?: number | null }): BitacoraEntry {
  const lat = typeof raw.lat === "number" ? raw.lat : null;
  const lng = typeof raw.lng === "number" ? raw.lng : null;
  const coordinates = raw.coordinates
    ?? (lat !== null && lng !== null ? { lat, lng } : { lat: 0, lng: 0 });

  return {
    ...raw,
    eventType: (raw.eventType && String(raw.eventType).trim()) ? raw.eventType : "entry",
    status: raw.status || "active",
    severity: raw.severity || "low",
    vehiclePlate: raw.vehiclePlate || raw.vehicleId || "—",
    wasExpected: typeof raw.wasExpected === "number" ? Boolean(raw.wasExpected) : Boolean(raw.wasExpected),
    coordinates,
  } as BitacoraEntry;
}

export const bitacoraService = {
  /**
   * Listado paginado con filtros.
   */
  async getEntries(
    filters: BitacoraFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ entries: BitacoraEntry[]; total: number; page: number; pageSize: number }> {
    const response = await apiClient.get<ListResponse<BitacoraEntry>>(API_ENDPOINTS.bitacora.base, {
      params: { ...filters, page, pageSize } as unknown as Record<string, string>,
    });
    const { items, total } = extractList(response);
    const entries = items.map((it) => normalizeEntry(it as BitacoraEntry & { lat?: number | null; lng?: number | null }));
    return { entries, total, page, pageSize };
  },

  /**
   * Detalle de una entry.
   */
  async getById(id: string): Promise<BitacoraEntry | null> {
    const raw = await apiClient.getOptional<unknown>(`${API_ENDPOINTS.bitacora.base}/${id}`);
    if (!raw) return null;
    const camel = snakeToCamel<BitacoraEntry & { lat?: number | null; lng?: number | null }>(raw);
    return normalizeEntry(camel);
  },

  /**
   * Crea una entry manual.
   */
  async createEntry(data: Partial<BitacoraEntry>): Promise<BitacoraEntry> {
    return apiClient.post<BitacoraEntry>(API_ENDPOINTS.bitacora.base, data);
  },

  /**
   * Stats por estado y severity.
   */
  async getStats(): Promise<BitacoraStats> {
    return apiClient.get<BitacoraStats>(API_ENDPOINTS.bitacora.stats);
  },

  /**
   * Resumen agrupado por vehiculo.
   */
  async getVehicleSummary(): Promise<BitacoraVehicleSummary[]> {
    const response = await apiClient.get<ListResponse<BitacoraVehicleSummary>>(
      API_ENDPOINTS.bitacora.summaryVehicles
    );
    return extractList(response).items;
  },

  /**
   * Resumen agrupado por geocerca.
   */
  async getGeofenceSummary(): Promise<BitacoraGeofenceSummary[]> {
    const response = await apiClient.get<ListResponse<BitacoraGeofenceSummary>>(
      API_ENDPOINTS.bitacora.summaryGeofences
    );
    return extractList(response).items;
  },

  /**
   * Exporta bitacora en formato csv/excel/json/pdf/html.
   *
   * NOTA: el backend Rev3 acepta "excel", NO "xlsx". Verificado 2026-05-01.
   */
  async exportEntries(format: "csv" | "excel" | "json" | "pdf" | "html" = "csv", filters: BitacoraFilters = {}): Promise<Blob> {
    const url = `${apiConfig.baseUrl}${API_ENDPOINTS.bitacora.export}?format=${format}&${new URLSearchParams(filters as unknown as Record<string, string>).toString()}`;
    const response = await fetch(url, { method: "GET" });
    return response.blob();
  },

  /**
   * Listado de geofence breaches (entry/exit/dwell/deviation).
   */
  async getGeofenceBreaches(filters: BitacoraFilters = {}): Promise<BitacoraEntry[]> {
    const response = await apiClient.get<ListResponse<BitacoraEntry>>(
      API_ENDPOINTS.bitacora.geofenceBreaches,
      { params: filters as unknown as Record<string, string> }
    );
    return extractList(response).items.map((it) =>
      normalizeEntry(it as BitacoraEntry & { lat?: number | null; lng?: number | null })
    );
  },

  /**
   * Historial de bitacora por vehiculo.
   */
  async getVehicleHistory(vehicleId: string): Promise<BitacoraEntry[]> {
    const response = await apiClient.get<ListResponse<BitacoraEntry>>(
      `${API_ENDPOINTS.bitacora.base}/vehicle/${vehicleId}`
    );
    return extractList(response).items.map((it) =>
      normalizeEntry(it as BitacoraEntry & { lat?: number | null; lng?: number | null })
    );
  },

  /**
   * Marcar entry como revisada.
   *
   * 2026-05-03: validado en producción → 404 (backend no implementa la ruta).
   * Envuelto con `withMissingEndpointDetection` para que la UI muestre
   * "Función pendiente del backend" en vez de un crash genérico.
   */
  async reviewEntry(id: string, reviewedBy: string = "Operador TMS"): Promise<BitacoraEntry> {
    return withMissingEndpointDetection(
      "Marcar revisada (PUT /bitacora/:id/review)",
      async () => {
        const raw = await apiClient.put<unknown>(`${API_ENDPOINTS.bitacora.base}/${id}/review`, { reviewedBy });
        const camel = snakeToCamel<BitacoraEntry & { lat?: number | null; lng?: number | null }>(raw);
        return normalizeEntry(camel);
      }
    );
  },

  /**
   * Descartar entry.
   * 2026-05-03: validado → 404 (backend pendiente).
   */
  async dismissEntry(id: string, reason?: string): Promise<BitacoraEntry> {
    return withMissingEndpointDetection(
      "Descartar evento (PUT /bitacora/:id/dismiss)",
      async () => {
        const raw = await apiClient.put<unknown>(`${API_ENDPOINTS.bitacora.base}/${id}/dismiss`, { reason });
        const camel = snakeToCamel<BitacoraEntry & { lat?: number | null; lng?: number | null }>(raw);
        return normalizeEntry(camel);
      }
    );
  },

  /**
   * Actualizar notas del operador.
   * 2026-05-03: validado → 404 (backend pendiente).
   */
  async updateNotes(id: string, notes: string): Promise<BitacoraEntry> {
    return withMissingEndpointDetection(
      "Actualizar notas (PUT /bitacora/:id/notes)",
      async () => {
        const raw = await apiClient.put<unknown>(`${API_ENDPOINTS.bitacora.base}/${id}/notes`, { notes });
        const camel = snakeToCamel<BitacoraEntry & { lat?: number | null; lng?: number | null }>(raw);
        return normalizeEntry(camel);
      }
    );
  },

  /**
   * Asignar entry a una orden existente.
   * 2026-05-03: validado → 404 (backend pendiente).
   */
  async assignToOrder(entryId: string, orderId: string): Promise<BitacoraEntry> {
    return withMissingEndpointDetection(
      "Asignar a orden (PUT /bitacora/:id/assign-order)",
      async () => {
        const raw = await apiClient.put<unknown>(
          `${API_ENDPOINTS.bitacora.base}/${entryId}/assign-order`,
          { orderId }
        );
        const camel = snakeToCamel<BitacoraEntry & { lat?: number | null; lng?: number | null }>(raw);
        return normalizeEntry(camel);
      }
    );
  },

  /**
   * Crear orden desde una entry (bitacora → order).
   * 2026-05-03: validado → 404 (backend pendiente).
   */
  async createOrderFromEntry(entryId: string, data: CreateOrderFromBitacoraDTO): Promise<{ orderId: string; entry: BitacoraEntry }> {
    return withMissingEndpointDetection(
      "Crear orden desde bitácora (POST /bitacora/:id/create-order)",
      async () => {
        const raw = await apiClient.post<{ orderId: string; entry: unknown }>(
          `${API_ENDPOINTS.bitacora.base}/${entryId}/create-order`,
          data
        );
        const camel = snakeToCamel<BitacoraEntry & { lat?: number | null; lng?: number | null }>(raw.entry);
        return { orderId: raw.orderId, entry: normalizeEntry(camel) };
      }
    );
  },

  /**
   * Completar entry — backend calcula dwell_time_minutes desde timestamps.
   * 2026-05-03: validado → 404 (backend pendiente).
   */
  async completeEntry(id: string, endTimestamp?: string): Promise<BitacoraEntry> {
    return withMissingEndpointDetection(
      "Completar evento (PUT /bitacora/:id/complete)",
      async () => {
        const raw = await apiClient.put<unknown>(
          `${API_ENDPOINTS.bitacora.base}/${id}/complete`,
          { endTimestamp }
        );
        const camel = snakeToCamel<BitacoraEntry & { lat?: number | null; lng?: number | null }>(raw);
        return normalizeEntry(camel);
      }
    );
  },
};
