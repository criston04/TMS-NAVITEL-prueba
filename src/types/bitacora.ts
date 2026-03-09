/**
 * Tipos para el módulo de Bitácora
 * Control operativo: ingresos, salidas y recorridos no planificados
 * 
 * Relaciones: Monitoreo, Geocercas, Órdenes, Reportes
 */

/**
 * Tipo de evento de bitácora
 */
export type BitacoraEventType =
  | "entry"              // Ingreso a geocerca
  | "exit"               // Salida de geocerca
  | "unplanned_stop"     // Parada no planificada
  | "unplanned_route"    // Recorrido fuera de ruta
  | "dwell"              // Permanencia prolongada
  | "deviation"          // Desviación de ruta planificada
  | "idle"               // Tiempo inactivo
  | "speeding";          // Exceso de velocidad

/**
 * Estado del registro de bitácora
 */
export type BitacoraStatus =
  | "active"          // Evento en curso
  | "completed"       // Evento finalizado
  | "reviewed"        // Revisado por operador
  | "order_created"   // Se creó una orden a partir de este evento
  | "dismissed";      // Descartado

/**
 * Severidad del evento
 */
export type BitacoraSeverity = "low" | "medium" | "high" | "critical";

/**
 * Origen del registro
 */
export type BitacoraSource =
  | "automatic"    // Detectado automáticamente por el sistema
  | "manual"       // Registrado manualmente por un operador
  | "geofence"     // Generado por evento de geocerca
  | "monitoring";  // Generado desde torre de control

/**
 * Registro individual de bitácora
 */
export interface BitacoraEntry {
  /** ID único */
  id: string;
  /** Tipo de evento */
  eventType: BitacoraEventType;
  /** Estado */
  status: BitacoraStatus;
  /** Severidad */
  severity: BitacoraSeverity;
  /** Origen del registro */
  source: BitacoraSource;

  // -- Vehículo --
  /** ID del vehículo */
  vehicleId: string;
  /** Placa del vehículo */
  vehiclePlate: string;
  /** Tipo de vehículo */
  vehicleType?: string;

  // -- Conductor --
  /** ID del conductor */
  driverId?: string;
  /** Nombre del conductor */
  driverName?: string;

  // -- Geocerca (si aplica) --
  /** ID de la geocerca */
  geofenceId?: string;
  /** Nombre de la geocerca */
  geofenceName?: string;
  /** Categoría de la geocerca */
  geofenceCategory?: string;

  // -- Orden relacionada (si aplica) --
  /** ID de la orden original */
  relatedOrderId?: string;
  /** Número de la orden */
  relatedOrderNumber?: string;
  /** ¿Fue un evento esperado (parte de ruta planificada)? */
  wasExpected: boolean;

  // -- Orden creada (si "order_created") --
  /** ID de la orden creada a partir de este evento */
  createdOrderId?: string;
  /** Número de la orden creada */
  createdOrderNumber?: string;

  // -- Temporal --
  /** Timestamp de inicio del evento */
  startTimestamp: string;
  /** Timestamp de fin del evento */
  endTimestamp?: string;
  /** Duración en minutos */
  durationMinutes?: number;
  /** Tiempo de permanencia (para dwell/entry) */
  dwellTimeMinutes?: number;

  // -- Ubicación --
  /** Coordenadas del evento */
  coordinates: {
    lat: number;
    lng: number;
  };
  /** Dirección geocodificada */
  address?: string;
  /** Velocidad al momento del evento (km/h) */
  speed?: number;
  /** Distancia recorrida fuera de ruta (km) */
  deviationKm?: number;

  // -- Metadata --
  /** Descripción/observación libre */
  description?: string;
  /** Notas del operador */
  operatorNotes?: string;
  /** Operador que revisó */
  reviewedBy?: string;
  /** Fecha de revisión */
  reviewedAt?: string;
  /** Fecha de creación del registro */
  createdAt: string;
  /** Fecha de actualización */
  updatedAt: string;
}

/**
 * Filtros de bitácora
 */
export interface BitacoraFilters {
  search?: string;
  eventType?: BitacoraEventType | BitacoraEventType[];
  status?: BitacoraStatus | BitacoraStatus[];
  severity?: BitacoraSeverity | BitacoraSeverity[];
  source?: BitacoraSource;
  vehicleId?: string;
  driverId?: string;
  geofenceId?: string;
  wasExpected?: boolean;
  startDate?: string;
  endDate?: string;
}

/**
 * Estadísticas de bitácora
 */
export interface BitacoraStats {
  /** Total de registros */
  totalEntries: number;
  /** Ingresos */
  totalEntries_entry: number;
  /** Salidas */
  totalEntries_exit: number;
  /** Paradas no planificadas */
  unplannedStops: number;
  /** Desviaciones */
  deviations: number;
  /** Permanencias prolongadas */
  dwellEvents: number;
  /** Eventos activos */
  activeEvents: number;
  /** Eventos revisados */
  reviewedEvents: number;
  /** Órdenes creadas desde bitácora */
  ordersCreated: number;
  /** Promedio de permanencia (minutos) */
  avgDwellMinutes: number;
  /** Tasa de eventos esperados */
  expectedRate: number;
}

/**
 * Resumen por vehículo en bitácora
 */
export interface BitacoraVehicleSummary {
  vehicleId: string;
  vehiclePlate: string;
  driverName?: string;
  totalEvents: number;
  entries: number;
  exits: number;
  unplannedStops: number;
  deviations: number;
  totalDwellMinutes: number;
  avgDwellMinutes: number;
  lastEvent?: BitacoraEntry;
}

/**
 * Resumen por geocerca en bitácora
 */
export interface BitacoraGeofenceSummary {
  geofenceId: string;
  geofenceName: string;
  geofenceCategory?: string;
  totalVisits: number;
  avgDwellMinutes: number;
  totalDwellMinutes: number;
  expectedVisits: number;
  unexpectedVisits: number;
}

/**
 * DTO para crear orden desde bitácora
 */
export interface CreateOrderFromBitacoraDTO {
  /** ID del registro de bitácora */
  bitacoraEntryId: string;
  /** Notas adicionales */
  notes?: string;
  /** Prioridad de la orden */
  priority?: "low" | "medium" | "high" | "urgent";
}
