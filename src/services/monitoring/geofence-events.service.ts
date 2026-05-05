import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import { notificationService } from "@/services/notification.service";
import type {
  GeofenceEvent,
  GeofenceDwellSummary,
  GeofenceEventFilters,
  GeofenceEventStats,
  CreateGeofenceEventDTO,
  UpdateGeofenceEventDTO,
} from "@/types/geofence-events";

/**
 * 2026-05-03: Helper para desempacar respuestas envueltas en `{data: ...}`.
 * El backend del modulo monitoreo casi siempre usa este envelope.
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
 * Servicio para gestión de eventos de geocerca
 */
class GeofenceEventsService {
  private listeners: Set<(event: GeofenceEvent) => void> = new Set();

  /**
   * Obtiene eventos con filtros
   */
  async getEvents(
    filters: GeofenceEventFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    data: GeofenceEvent[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    // Este endpoint SI devuelve el envelope esperado {data, total, page, pageSize}
    // pero por consistencia usamos el shape directo que ya espera el caller.
    return apiClient.get<{ data: GeofenceEvent[]; total: number; page: number; pageSize: number }>(API_ENDPOINTS.monitoring.geofenceEvents, {
      params: {
        ...filters as unknown as Record<string, string>,
        page: String(page),
        pageSize: String(pageSize),
      },
    });
  }

  /**
   * Obtiene un evento por ID.
   * 2026-05-03: agregado unwrap para envelope `{data: ...}`.
   */
  async getEventById(id: string): Promise<GeofenceEvent | null> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.geofenceEvents}/${id}`);
    return unwrap<GeofenceEvent | null>(raw);
  }

  /**
   * Crea un nuevo evento de geocerca.
   * 2026-05-03: agregado unwrap por consistencia con el patron del modulo.
   */
  async createEvent(data: CreateGeofenceEventDTO): Promise<GeofenceEvent> {
    const raw = await apiClient.post<unknown>(API_ENDPOINTS.monitoring.geofenceEvents, data);
    const created = unwrap<GeofenceEvent>(raw);
    this.notifyListeners(created);
    await this.sendEventNotification(created);
    return created;
  }

  /**
   * Actualiza un evento (completar salida).
   * 2026-05-03: agregado unwrap.
   */
  async updateEvent(id: string, data: UpdateGeofenceEventDTO): Promise<GeofenceEvent> {
    const raw = await apiClient.patch<unknown>(`${API_ENDPOINTS.monitoring.geofenceEvents}/${id}`, data);
    const updated = unwrap<GeofenceEvent>(raw);
    this.notifyListeners(updated);
    return updated;
  }

  /**
   * Registra una salida de geocerca.
   * 2026-05-03: agregado unwrap.
   */
  async recordExit(
    vehicleId: string,
    geofenceId: string,
    coordinates: { lat: number; lng: number },
    speed?: number
  ): Promise<GeofenceEvent> {
    const raw = await apiClient.post<unknown>(`${API_ENDPOINTS.monitoring.geofenceEvents}/record-exit`, {
      vehicleId,
      geofenceId,
      coordinates,
      speed,
    });
    return unwrap<GeofenceEvent>(raw);
  }

  // ANÁLISIS Y ESTADÍSTICAS

  /**
   * Obtiene resumen de permanencia por geocerca/vehículo
   */
  async getDwellSummary(
    filters: {
      geofenceId?: string;
      vehicleId?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<GeofenceDwellSummary[]> {
    // 2026-05-03 (bug fix): agregado unwrap. Backend devuelve `{data: []}`.
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.geofenceEvents}/dwell-summary`, {
      params: filters as unknown as Record<string, string>,
    });
    return unwrap<GeofenceDwellSummary[]>(raw);
  }

  /**
   * Obtiene estadisticas de eventos.
   * 2026-05-03 (bug fix): agregado unwrap. Backend devuelve `{data: {totalEvents, ...}}`.
   * Sin desempacar, las cards mostraban `undefined` en cada metrica.
   */
  async getStats(filters: GeofenceEventFilters = {}): Promise<GeofenceEventStats> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.geofenceEvents}/stats`, {
      params: filters as unknown as Record<string, string>,
    });
    return unwrap<GeofenceEventStats>(raw);
  }

  /**
   * Obtiene eventos activos (vehiculos dentro de geocercas).
   * 2026-05-03 (bug fix): agregado unwrap.
   */
  async getActiveEvents(): Promise<GeofenceEvent[]> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.geofenceEvents}/active`);
    return unwrap<GeofenceEvent[]>(raw);
  }

  /**
   * Verifica si un vehiculo esta dentro de una geocerca.
   * 2026-05-03: agregado unwrap.
   */
  async isVehicleInGeofence(
    vehicleId: string,
    geofenceId: string
  ): Promise<{ isInside: boolean; event: GeofenceEvent | null }> {
    const raw = await apiClient.get<unknown>(
      `${API_ENDPOINTS.monitoring.geofenceEvents}/check/${vehicleId}/${geofenceId}`
    );
    return unwrap<{ isInside: boolean; event: GeofenceEvent | null }>(raw);
  }

  // SUSCRIPCIÓN EN TIEMPO REAL

  /**
   * Suscribe a nuevos eventos
   */
  subscribe(callback: (event: GeofenceEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifica a los listeners
   */
  private notifyListeners(event: GeofenceEvent): void {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error("[GeofenceEventsService] Error en listener:", error);
      }
    });
  }

  /**
   * Envía notificación del evento
   */
  private async sendEventNotification(event: GeofenceEvent): Promise<void> {
    try {
      await notificationService.notifyGeofenceEvent(
        event.vehicleId,
        event.vehiclePlate,
        event.geofenceName,
        event.eventType as "entry" | "exit"
      );
    } catch (error) {
      console.error("[GeofenceEventsService] Error al enviar notificación:", error);
    }
  }
}

/** Instancia singleton del servicio */
export const geofenceEventsService = new GeofenceEventsService();

export default geofenceEventsService;
