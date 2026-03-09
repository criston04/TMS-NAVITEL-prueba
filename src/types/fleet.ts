/**
 * Estado de un evento de tracking
 * @typedef TrackingEventStatus
 */
export type TrackingEventStatus = "completed" | "current" | "pending";

/**
 * Ubicación geográfica de un vehículo
 * @interface VehicleLocation
 */
export interface VehicleLocation {
  /** Latitud en grados decimales */
  lat: number;
  /** Longitud en grados decimales */
  lng: number;
}

/**
 * Evento en el timeline de tracking de un vehículo
 * @interface TrackingEvent
 */
export interface TrackingEvent {
  /** Identificador único del evento */
  id: string;
  /** Estado del evento: completado, en curso, o pendiente */
  status: TrackingEventStatus;
  /** Título descriptivo del evento */
  title: string;
  /** Descripción detallada del evento */
  description: string;
  /** Marca de tiempo formateada */
  timestamp: string;
  /** Nombre del responsable (opcional) */
  handler?: string;
}

/**
 * Información completa de un vehículo de la flota
 * @interface Vehicle
 */
export interface Vehicle {
  /** Identificador único del vehículo */
  id: string;
  /** Código de identificación (ej: "TRK-001") */
  code: string;
  /** Ubicación geográfica actual */
  location: VehicleLocation;
  /** Dirección de la ubicación actual */
  address: string;
  /** Ciudad de la ubicación actual */
  city: string;
  /** País de la ubicación actual */
  country: string;
  /** Porcentaje de progreso de la entrega (0-100) */
  progress: number;
  /** Nombre del conductor asignado */
  driver: string;
  /** Estado actual del vehículo */
  status: "en-ruta" | "entregando" | "completado" | "esperando";
  /** Lista de eventos de tracking */
  tracking: TrackingEvent[];
}
