import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import { notificationService } from "@/services/notification.service";
import { tmsEventBus } from "@/services/integration/event-bus.service";
import { mockGeofenceEvents } from "@/mocks/monitoring/geofence-events.mock";
import type {
  GeofenceEvent,
  GeofenceDwellSummary,
  GeofenceEventFilters,
  GeofenceEventStats,
  CreateGeofenceEventDTO,
  UpdateGeofenceEventDTO,
} from "@/types/geofence-events";


/**
 * Servicio para gestión de eventos de geocerca
 */
class GeofenceEventsService {
  private events: GeofenceEvent[] = [...mockGeofenceEvents];
  private useMocks: boolean;
  private listeners: Set<(event: GeofenceEvent) => void> = new Set();

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Simula delay de red
   */
  private async simulateDelay(ms: number = 200): Promise<void> {
    if (this.useMocks) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  /**
   * Genera ID único
   */
  private generateId(): string {
    return `gfe-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

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
    await this.simulateDelay();

    if (this.useMocks) {
      let filtered = [...this.events];

      // Aplicar filtros
      if (filters.geofenceId) {
        filtered = filtered.filter(e => e.geofenceId === filters.geofenceId);
      }
      if (filters.geofenceIds && filters.geofenceIds.length > 0) {
        filtered = filtered.filter(e => filters.geofenceIds!.includes(e.geofenceId));
      }
      if (filters.vehicleId) {
        filtered = filtered.filter(e => e.vehicleId === filters.vehicleId);
      }
      if (filters.vehicleIds && filters.vehicleIds.length > 0) {
        filtered = filtered.filter(e => filters.vehicleIds!.includes(e.vehicleId));
      }
      if (filters.driverId) {
        filtered = filtered.filter(e => e.driverId === filters.driverId);
      }
      if (filters.orderId) {
        filtered = filtered.filter(e => e.orderId === filters.orderId);
      }
      if (filters.eventType) {
        filtered = filtered.filter(e => e.eventType === filters.eventType);
      }
      if (filters.status) {
        filtered = filtered.filter(e => e.status === filters.status);
      }
      if (filters.startDate) {
        filtered = filtered.filter(e => 
          new Date(e.timestamp) >= new Date(filters.startDate!)
        );
      }
      if (filters.endDate) {
        filtered = filtered.filter(e => 
          new Date(e.timestamp) <= new Date(filters.endDate!)
        );
      }
      if (filters.wasExpected !== undefined) {
        filtered = filtered.filter(e => e.wasExpected === filters.wasExpected);
      }
      if (filters.arrivedOnTime !== undefined) {
        filtered = filtered.filter(e => e.arrivedOnTime === filters.arrivedOnTime);
      }

      // Ordenar por timestamp (más reciente primero)
      filtered.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Paginación
      const start = (page - 1) * pageSize;
      const paginatedData = filtered.slice(start, start + pageSize);

      return {
        data: paginatedData,
        total: filtered.length,
        page,
        pageSize,
      };
    }

    return apiClient.get<{ data: GeofenceEvent[]; total: number; page: number; pageSize: number }>(API_ENDPOINTS.monitoring.geofenceEvents, {
      params: {
        ...filters as unknown as Record<string, string>,
        page: String(page),
        pageSize: String(pageSize),
      },
    });
  }

  /**
   * Obtiene un evento por ID
   */
  async getEventById(id: string): Promise<GeofenceEvent | null> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      return this.events.find(e => e.id === id) || null;
    }

    return apiClient.get<GeofenceEvent | null>(`${API_ENDPOINTS.monitoring.geofenceEvents}/${id}`);
  }

  /**
   * Crea un nuevo evento de geocerca
   */
  async createEvent(data: CreateGeofenceEventDTO): Promise<GeofenceEvent> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      const now = data.timestamp || new Date().toISOString();
      
      // Buscar información adicional (mock)
      const geofenceName = `Geocerca ${data.geofenceId}`;
      const vehiclePlate = `PLACA-${data.vehicleId}`;
      const driverName = data.driverId ? `Conductor ${data.driverId}` : undefined;
      const orderNumber = data.orderId ? `ORD-${data.orderId}` : undefined;

      const newEvent: GeofenceEvent = {
        id: this.generateId(),
        geofenceId: data.geofenceId,
        geofenceName,
        geofenceCategory: "other",
        vehicleId: data.vehicleId,
        vehiclePlate,
        driverId: data.driverId,
        driverName,
        orderId: data.orderId,
        orderNumber,
        milestoneId: data.milestoneId,
        eventType: data.eventType,
        status: data.eventType === "entry" ? "active" : "completed",
        timestamp: now,
        entryTimestamp: data.eventType === "entry" ? now : undefined,
        coordinates: data.coordinates,
        speed: data.speed,
        createdAt: now,
        updatedAt: now,
      };

      this.events.unshift(newEvent);

      // Notificar a los listeners
      this.notifyListeners(newEvent);

      // Publicar evento en EventBus para integración cross-module
      if (data.eventType === 'entry') {
        tmsEventBus.publish('monitoring:geofence_entry', {
          vehicleId: data.vehicleId,
          geofenceId: data.geofenceId,
          geofenceName,
          orderId: data.orderId,
          milestoneId: data.milestoneId,
          timestamp: now,
          coordinates: data.coordinates,
        }, 'geofence-events-service');
      } else if (data.eventType === 'exit') {
        tmsEventBus.publish('monitoring:geofence_exit', {
          vehicleId: data.vehicleId,
          geofenceId: data.geofenceId,
          geofenceName,
          orderId: data.orderId,
          milestoneId: data.milestoneId,
          timestamp: now,
          coordinates: data.coordinates,
          durationMinutes: newEvent.durationMinutes,
        }, 'geofence-events-service');
      }

      // Crear notificación del sistema
      await this.sendEventNotification(newEvent);

      return newEvent;
    }

    return apiClient.post<GeofenceEvent>(API_ENDPOINTS.monitoring.geofenceEvents, data);
  }

  /**
   * Actualiza un evento (completar salida)
   */
  async updateEvent(id: string, data: UpdateGeofenceEventDTO): Promise<GeofenceEvent> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      const index = this.events.findIndex(e => e.id === id);
      if (index === -1) {
        throw new Error(`Evento con ID ${id} no encontrado`);
      }

      const event = this.events[index];
      const now = new Date().toISOString();

      // Calcular duración si es salida
      let durationMinutes = data.durationMinutes;
      if (data.exitTimestamp && event.entryTimestamp && !durationMinutes) {
        const entry = new Date(event.entryTimestamp).getTime();
        const exit = new Date(data.exitTimestamp).getTime();
        durationMinutes = Math.round((exit - entry) / (1000 * 60));
      }

      const updated: GeofenceEvent = {
        ...event,
        status: data.status || event.status,
        exitTimestamp: data.exitTimestamp || event.exitTimestamp,
        durationMinutes: durationMinutes || event.durationMinutes,
        updatedAt: now,
      };

      this.events[index] = updated;

      // Notificar a los listeners
      this.notifyListeners(updated);

      return updated;
    }

    return apiClient.patch<GeofenceEvent>(`${API_ENDPOINTS.monitoring.geofenceEvents}/${id}`, data);
  }

  /**
   * Registra una salida de geocerca
   */
  async recordExit(
    vehicleId: string,
    geofenceId: string,
    coordinates: { lat: number; lng: number },
    speed?: number
  ): Promise<GeofenceEvent> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      // Buscar el evento de entrada activo
      const activeEntry = this.events.find(e =>
        e.vehicleId === vehicleId &&
        e.geofenceId === geofenceId &&
        e.eventType === "entry" &&
        e.status === "active"
      );

      const now = new Date().toISOString();

      if (activeEntry) {
        // Completar el evento de entrada
        await this.updateEvent(activeEntry.id, {
          status: "completed",
          exitTimestamp: now,
        });
      }

      // Crear evento de salida
      return this.createEvent({
        geofenceId,
        vehicleId,
        driverId: activeEntry?.driverId,
        orderId: activeEntry?.orderId,
        milestoneId: activeEntry?.milestoneId,
        eventType: "exit",
        coordinates,
        speed,
        timestamp: now,
      });
    }

    return apiClient.post<GeofenceEvent>(`${API_ENDPOINTS.monitoring.geofenceEvents}/record-exit`, {
      vehicleId,
      geofenceId,
      coordinates,
      speed,
    });
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
    await this.simulateDelay(300);

    if (this.useMocks) {
      // Filtrar eventos de entrada completados
      let entries = this.events.filter(e => 
        e.eventType === "entry" && 
        e.status === "completed" &&
        e.durationMinutes !== undefined
      );

      if (filters.geofenceId) {
        entries = entries.filter(e => e.geofenceId === filters.geofenceId);
      }
      if (filters.vehicleId) {
        entries = entries.filter(e => e.vehicleId === filters.vehicleId);
      }
      if (filters.startDate) {
        entries = entries.filter(e => new Date(e.timestamp) >= new Date(filters.startDate!));
      }
      if (filters.endDate) {
        entries = entries.filter(e => new Date(e.timestamp) <= new Date(filters.endDate!));
      }

      // Agrupar por geocerca-vehículo
      const groups = new Map<string, GeofenceEvent[]>();
      
      for (const event of entries) {
        const key = `${event.geofenceId}-${event.vehicleId}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(event);
      }

      // Calcular resúmenes
      const summaries: GeofenceDwellSummary[] = [];

      for (const [, events] of groups) {
        const dwellTimes = events.map(e => e.durationMinutes!);
        const timestamps = events.map(e => new Date(e.timestamp).getTime());

        summaries.push({
          geofenceId: events[0].geofenceId,
          geofenceName: events[0].geofenceName,
          vehicleId: events[0].vehicleId,
          vehiclePlate: events[0].vehiclePlate,
          visitCount: events.length,
          totalDwellMinutes: dwellTimes.reduce((sum, t) => sum + t, 0),
          avgDwellMinutes: Math.round(
            dwellTimes.reduce((sum, t) => sum + t, 0) / events.length
          ),
          minDwellMinutes: Math.min(...dwellTimes),
          maxDwellMinutes: Math.max(...dwellTimes),
          firstVisit: new Date(Math.min(...timestamps)).toISOString(),
          lastVisit: new Date(Math.max(...timestamps)).toISOString(),
        });
      }

      // Ordenar por total de permanencia
      summaries.sort((a, b) => b.totalDwellMinutes - a.totalDwellMinutes);

      return summaries;
    }

    return apiClient.get<GeofenceDwellSummary[]>(`${API_ENDPOINTS.monitoring.geofenceEvents}/dwell-summary`, {
      params: filters as unknown as Record<string, string>,
    });
  }

  /**
   * Obtiene estadísticas de eventos
   */
  async getStats(filters: GeofenceEventFilters = {}): Promise<GeofenceEventStats> {
    await this.simulateDelay(300);

    if (this.useMocks) {
      const result = await this.getEvents(filters, 1, 10000);
      const events = result.data;

      const entries = events.filter(e => e.eventType === "entry");
      const exits = events.filter(e => e.eventType === "exit");
      const activeEvents = events.filter(e => e.status === "active");

      // Calcular permanencia promedio
      const completedEntries = entries.filter(e => 
        e.status === "completed" && e.durationMinutes !== undefined
      );
      const avgDwellMinutes = completedEntries.length > 0
        ? Math.round(
            completedEntries.reduce((sum, e) => sum + e.durationMinutes!, 0) / 
            completedEntries.length
          )
        : 0;

      // Eventos esperados y puntuales
      const expectedEvents = events.filter(e => e.wasExpected);
      const onTimeArrivals = events.filter(e => e.arrivedOnTime);
      const onTimeRate = expectedEvents.length > 0
        ? Math.round((onTimeArrivals.length / expectedEvents.length) * 100)
        : 100;

      // Por geocerca
      const byGeofenceMap = new Map<string, { name: string; count: number; dwell: number[] }>();
      for (const event of events) {
        if (!byGeofenceMap.has(event.geofenceId)) {
          byGeofenceMap.set(event.geofenceId, { 
            name: event.geofenceName, 
            count: 0, 
            dwell: [] 
          });
        }
        const geo = byGeofenceMap.get(event.geofenceId)!;
        geo.count++;
        if (event.durationMinutes) {
          geo.dwell.push(event.durationMinutes);
        }
      }

      const byGeofence = Array.from(byGeofenceMap.entries()).map(([id, data]) => ({
        geofenceId: id,
        geofenceName: data.name,
        eventCount: data.count,
        avgDwellMinutes: data.dwell.length > 0
          ? Math.round(data.dwell.reduce((s, d) => s + d, 0) / data.dwell.length)
          : 0,
      }));

      // Por vehículo
      const byVehicleMap = new Map<string, { plate: string; count: number }>();
      for (const event of events) {
        if (!byVehicleMap.has(event.vehicleId)) {
          byVehicleMap.set(event.vehicleId, { plate: event.vehiclePlate, count: 0 });
        }
        byVehicleMap.get(event.vehicleId)!.count++;
      }

      const byVehicle = Array.from(byVehicleMap.entries()).map(([id, data]) => ({
        vehicleId: id,
        vehiclePlate: data.plate,
        eventCount: data.count,
      }));

      return {
        totalEvents: events.length,
        entries: entries.length,
        exits: exits.length,
        activeEvents: activeEvents.length,
        avgDwellMinutes,
        expectedEvents: expectedEvents.length,
        onTimeArrivals: onTimeArrivals.length,
        onTimeRate,
        byGeofence: byGeofence.sort((a, b) => b.eventCount - a.eventCount).slice(0, 10),
        byVehicle: byVehicle.sort((a, b) => b.eventCount - a.eventCount).slice(0, 10),
      };
    }

    return apiClient.get<GeofenceEventStats>(`${API_ENDPOINTS.monitoring.geofenceEvents}/stats`, {
      params: filters as unknown as Record<string, string>,
    });
  }

  /**
   * Obtiene eventos activos (vehículos dentro de geocercas)
   */
  async getActiveEvents(): Promise<GeofenceEvent[]> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      return this.events.filter(e => 
        e.eventType === "entry" && e.status === "active"
      );
    }

    return apiClient.get<GeofenceEvent[]>(`${API_ENDPOINTS.monitoring.geofenceEvents}/active`);
  }

  /**
   * Verifica si un vehículo está dentro de una geocerca
   */
  async isVehicleInGeofence(
    vehicleId: string,
    geofenceId: string
  ): Promise<{ isInside: boolean; event: GeofenceEvent | null }> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      const activeEntry = this.events.find(e =>
        e.vehicleId === vehicleId &&
        e.geofenceId === geofenceId &&
        e.eventType === "entry" &&
        e.status === "active"
      );

      return {
        isInside: !!activeEntry,
        event: activeEntry || null,
      };
    }

    return apiClient.get<{ isInside: boolean; event: GeofenceEvent | null }>(
      `${API_ENDPOINTS.monitoring.geofenceEvents}/check/${vehicleId}/${geofenceId}`
    );
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
