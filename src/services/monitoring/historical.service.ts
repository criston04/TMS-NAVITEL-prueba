import type {
  HistoricalRoute,
  HistoricalRouteParams,
  HistoricalRouteStats,
  RouteExportOptions,
} from "@/types/monitoring";
import type { Vehicle } from "@/types/models/vehicle";
import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * 2026-05-03: Helper para desempacar respuestas envueltas en `{data: [...]}`.
 * El backend del modulo monitoreo devuelve TODOS sus endpoints con el envelope
 * `{data: ...}` (verificado empiricamente contra produccion). Si llega un array
 * directo, lo respeta. Si viene un objeto sin envelope, asume que es el dato.
 */
function unwrap<T>(response: unknown): T {
  if (Array.isArray(response)) return response as T;
  if (response && typeof response === "object") {
    const r = response as { data?: unknown; items?: unknown };
    if (r.data !== undefined) return r.data as T;
    if (r.items !== undefined) return r.items as T;
  }
  return response as T;
}

/**
 * 2026-05-03 (UI bug fix): garantiza que el shape de `HistoricalRoute` siempre
 * tenga los campos requeridos (`points`, `stats`, `vehiclePlate`, `startDate`,
 * `endDate`, `id`, `generatedAt`). El backend a veces devuelve ruta sin `stats`
 * o sin algunos campos, y la UI hace `route.points.length`,
 * `stats.totalDistanceKm.toFixed(1)`, etc. sin guards en multiples lugares.
 *
 * En lugar de parchar cada acceso en el componente, normalizamos en el service.
 */
function defaultStats(): HistoricalRouteStats {
  return {
    totalDistanceKm: 0,
    maxSpeedKmh: 0,
    avgSpeedKmh: 0,
    movingTimeSeconds: 0,
    stoppedTimeSeconds: 0,
    totalTimeSeconds: 0,
    totalPoints: 0,
    totalStops: 0,
    startPoint: { lat: 0, lng: 0 },
    endPoint: { lat: 0, lng: 0 },
  };
}

function normalizeRoute(
  raw: Partial<HistoricalRoute> | null | undefined,
  params: HistoricalRouteParams
): HistoricalRoute {
  const r = raw ?? {};
  const points = Array.isArray(r.points) ? r.points : [];
  const incomingStats = r.stats ?? {};
  const stats: HistoricalRouteStats = {
    ...defaultStats(),
    ...incomingStats,
  };
  return {
    id: r.id ?? "",
    vehicleId: r.vehicleId ?? params.vehicleId,
    vehiclePlate: r.vehiclePlate ?? "",
    startDate: r.startDate ?? params.startDateTime,
    endDate: r.endDate ?? params.endDateTime,
    points,
    stats,
    generatedAt: r.generatedAt ?? new Date().toISOString(),
  };
}

/**
 * Servicio de Rastreo Histórico
 */
export class HistoricalTrackingService {
  // Caché de rutas consultadas
  private routeCache: Map<string, HistoricalRoute> = new Map();
  private readonly cacheMaxSize = 10;

  /**
   * Genera clave de caché única para una consulta
   */
  private getCacheKey(params: HistoricalRouteParams): string {
    return `${params.vehicleId}_${params.startDateTime}_${params.endDateTime}`;
  }

  /**
   * Agrega ruta al caché
   */
  private addToCache(key: string, route: HistoricalRoute): void {
    if (this.routeCache.size >= this.cacheMaxSize) {
      const firstKey = this.routeCache.keys().next().value;
      if (firstKey) {
        this.routeCache.delete(firstKey);
      }
    }
    this.routeCache.set(key, route);
  }

  /**
   * Obtiene una ruta histórica
   */
  async getRoute(params: HistoricalRouteParams): Promise<HistoricalRoute> {
    const cacheKey = this.getCacheKey(params);
    const cached = this.routeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const raw = await apiClient.get<unknown>(API_ENDPOINTS.monitoring.historical, {
      params: {
        vehicleId: params.vehicleId,
        startDateTime: params.startDateTime,
        endDateTime: params.endDateTime,
      },
    });
    const result = normalizeRoute(unwrap<Partial<HistoricalRoute>>(raw), params);
    this.addToCache(cacheKey, result);
    return result;
  }

  /**
   * Exporta una ruta a un formato específico.
   * El backend aún no expone endpoint server-side de export — devolvemos un
   * blob vacío con el mime type correcto. La UI muestra "no hay export disponible".
   */
  async exportRoute(_route: HistoricalRoute, options: RouteExportOptions): Promise<Blob> {
    // TODO backend: POST /monitoring/historical/{id}/export
    const mime = options.format === "csv" ? "text/csv" : "application/json";
    return new Blob([""], { type: mime });
  }

  /**
   * Obtiene lista de vehiculos con historico disponible.
   *
   * 2026-05-03 (bug fix CRITICO): el endpoint `/monitoring/historical/vehicles`
   * devuelve `{data: []}` envolventemente y el frontend antes asumia un array
   * directo. Resultado: el dropdown de "Seleccionar vehiculo" en
   * `/monitoring/historical` aparecia vacio aunque el backend respondia 200 OK.
   *
   * Ademas, cuando la BD `vehicle_positions` esta vacia, este endpoint devuelve
   * `[]` (no hay vehiculos con datos historicos). Como fallback, intentamos el
   * master de vehiculos para que el usuario al menos pueda intentar buscar.
   * El backend devolvera ruta vacia y la UI mostrara "sin datos en el rango".
   */
  async getAvailableVehicles(): Promise<Pick<Vehicle, "id" | "plate">[]> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.historical}/vehicles`);
    const list = unwrap<Pick<Vehicle, "id" | "plate">[]>(raw);
    if (Array.isArray(list) && list.length > 0) return list;

    // Fallback al master cuando la tabla vehicle_positions esta vacia.
    try {
      const masterRaw = await apiClient.get<unknown>("/master/vehicles", { params: { pageSize: 200 } });
      const masterList = unwrap<Array<{ id: string; plate: string }>>(masterRaw);
      if (Array.isArray(masterList)) return masterList.map((v) => ({ id: v.id, plate: v.plate }));
    } catch (err) {
      console.warn("[historicalTrackingService.getAvailableVehicles] fallback al master fallo", err);
    }
    return [];
  }

  /**
   * Obtiene el rango de fechas disponible para un vehiculo.
   * 2026-05-03: agregado unwrap para envelope `{data: ...}` del backend.
   */
  async getAvailableDateRange(_vehicleId: string): Promise<{ min: string; max: string }> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.historical}/vehicles/${_vehicleId}/date-range`);
    return unwrap<{ min: string; max: string }>(raw);
  }

  /**
   * Calcula estadísticas de una ruta.
   * El backend debería devolver las stats junto con la ruta. Mientras no lo
   * haga, devolvemos un objeto con valores en cero para no romper la UI.
   */
  calculateRouteStats(_route: HistoricalRoute): HistoricalRouteStats {
    // TODO backend: incluir stats en el response de getRoute()
    return {
      totalDistance: 0,
      totalDuration: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      minSpeed: 0,
      totalStops: 0,
      totalIdleTime: 0,
      fuelConsumption: 0,
      idleTimePercentage: 0,
    } as unknown as HistoricalRouteStats;
  }

  /**
   * Obtiene rutas pre-generadas (para desarrollo/demo).
   * 2026-05-03: agregado unwrap. El endpoint NO esta implementado en backend (404)
   * pero dejamos el desempaquetado correcto para cuando lo implementen.
   */
  async getPreloadedRoutes(): Promise<HistoricalRoute[]> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.historical}/preloaded`);
    return unwrap<HistoricalRoute[]>(raw);
  }

  /**
   * Limpia la caché de rutas
   */
  clearCache(): void {
    this.routeCache.clear();
  }

  /**
   * Valida parámetros de consulta de ruta
   */
  validateRouteParams(params: HistoricalRouteParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.vehicleId) {
      errors.push("Se requiere un vehículo");
    }

    if (!params.startDateTime) {
      errors.push("Se requiere fecha/hora de inicio");
    }

    if (!params.endDateTime) {
      errors.push("Se requiere fecha/hora de fin");
    }

    if (params.startDateTime && params.endDateTime) {
      const start = new Date(params.startDateTime);
      const end = new Date(params.endDateTime);

      if (start >= end) {
        errors.push("La fecha de inicio debe ser anterior a la fecha de fin");
      }

      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 7) {
        errors.push("El rango máximo permitido es de 7 días");
      }

      if (end > new Date()) {
        errors.push("No se pueden consultar fechas futuras");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Descarga un archivo de ruta exportada
   */
  downloadExportedRoute(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Singleton del servicio de rastreo histórico
 */
export const historicalTrackingService = new HistoricalTrackingService();
