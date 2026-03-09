
/**
 * Tipo de evento de geocerca
 */
export type GeofenceEventType = "entry" | "exit" | "dwell";

/**
 * Estado del evento
 */
export type GeofenceEventStatus = "active" | "completed" | "cancelled";


/**
 * Evento de geocerca
 */
export interface GeofenceEvent {
  /** ID único del evento */
  id: string;
  /** ID de la geocerca */
  geofenceId: string;
  /** Nombre de la geocerca */
  geofenceName: string;
  /** Categoría de la geocerca */
  geofenceCategory: string;
  /** ID del vehículo */
  vehicleId: string;
  /** Placa del vehículo */
  vehiclePlate: string;
  /** ID del conductor (si aplica) */
  driverId?: string;
  
  driverName?: string;
  /** ID de la orden (si aplica) */
  orderId?: string;
  /** Número de orden */
  orderNumber?: string;
  /** ID del hito de la orden (si aplica) */
  milestoneId?: string;
  
  eventType: GeofenceEventType;
  
  status: GeofenceEventStatus;
  /** Timestamp del evento */
  timestamp: string;
  /** Timestamp de entrada (para eventos de salida/dwell) */
  entryTimestamp?: string;
  /** Timestamp de salida (para eventos completados) */
  exitTimestamp?: string;
  /** Duración en minutos (para eventos completados) */
  durationMinutes?: number;
  /** Coordenadas del evento */
  coordinates: {
    lat: number;
    lng: number;
  };
  /** Velocidad al momento del evento */
  speed?: number;
  /** Dirección geocodificada */
  address?: string;
  /** Era esperado (parte de ruta planificada) */
  wasExpected?: boolean;
  /** Llegó a tiempo (si era esperado) */
  arrivedOnTime?: boolean;
  /** Diferencia con hora estimada (minutos) */
  timeDifferenceMinutes?: number;
  /** Metadatos adicionales */
  metadata?: Record<string, unknown>;
  /** Fecha de creación del registro */
  createdAt: string;
  /** Fecha de actualización */
  updatedAt: string;
}

/**
 * Resumen de permanencia en geocerca
 */
export interface GeofenceDwellSummary {
  /** ID de la geocerca */
  geofenceId: string;
  /** Nombre de la geocerca */
  geofenceName: string;
  /** ID del vehículo */
  vehicleId: string;
  /** Placa del vehículo */
  vehiclePlate: string;
  /** Número de visitas */
  visitCount: number;
  /** Tiempo total de permanencia (minutos) */
  totalDwellMinutes: number;
  /** Tiempo promedio de permanencia (minutos) */
  avgDwellMinutes: number;
  /** Tiempo mínimo de permanencia */
  minDwellMinutes: number;
  /** Tiempo máximo de permanencia */
  maxDwellMinutes: number;
  /** Primera visita */
  firstVisit: string;
  /** Última visita */
  lastVisit: string;
}

/**
 * Filtros para eventos de geocerca
 */
export interface GeofenceEventFilters {
  geofenceId?: string;
  geofenceIds?: string[];
  vehicleId?: string;
  vehicleIds?: string[];
  driverId?: string;
  orderId?: string;
  eventType?: GeofenceEventType;
  status?: GeofenceEventStatus;
  startDate?: string;
  endDate?: string;
  wasExpected?: boolean;
  arrivedOnTime?: boolean;
}

/**
 * Estadísticas de eventos de geocerca
 */
export interface GeofenceEventStats {
  
  totalEvents: number;
  /** Entradas */
  entries: number;
  /** Salidas */
  exits: number;
  /** Eventos activos (dentro de geocerca) */
  activeEvents: number;
  /** Tiempo promedio de permanencia */
  avgDwellMinutes: number;
  /** Eventos esperados */
  expectedEvents: number;
  /** Llegadas a tiempo */
  onTimeArrivals: number;
  /** Tasa de puntualidad */
  onTimeRate: number;
  /** Por geocerca */
  byGeofence: {
    geofenceId: string;
    geofenceName: string;
    eventCount: number;
    avgDwellMinutes: number;
  }[];
  /** Por vehículo */
  byVehicle: {
    vehicleId: string;
    vehiclePlate: string;
    eventCount: number;
  }[];
}

/**
 * DTO para crear evento de geocerca
 */
export interface CreateGeofenceEventDTO {
  geofenceId: string;
  vehicleId: string;
  driverId?: string;
  orderId?: string;
  milestoneId?: string;
  eventType: GeofenceEventType;
  coordinates: {
    lat: number;
    lng: number;
  };
  speed?: number;
  timestamp?: string;
}

/**
 * DTO para actualizar evento (completar)
 */
export interface UpdateGeofenceEventDTO {
  status?: GeofenceEventStatus;
  exitTimestamp?: string;
  durationMinutes?: number;
}

export default GeofenceEvent;
