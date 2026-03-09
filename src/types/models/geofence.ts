import { BaseEntity, EntityStatus } from "@/types/common";

/**
 * Tipo de geocerca
 */
export type GeofenceType = "polygon" | "circle" | "corridor";

/**
 * Categoría de geocerca
 */
export type GeofenceCategory = 
  | "warehouse"     // Almacén
  | "customer"      // Cliente
  | "plant"         // Planta
  | "port"          // Puerto
  | "checkpoint"    // Punto de control
  | "restricted"    // Zona restringida
  | "delivery"      // Zona de entrega
  | "other";

/**
 * Coordenada geográfica
 */
export interface GeoCoordinate {
  lat: number;
  lng: number;
}

/**
 * Geometría de polígono
 */
export interface PolygonGeometry {
  type: "polygon";
  coordinates: GeoCoordinate[];
}

/**
 * Geometría de círculo
 */
export interface CircleGeometry {
  type: "circle";
  center: GeoCoordinate;
  radius: number; // metros
}

/**
 * Geometría de corredor (ruta con buffer)
 */
export interface CorridorGeometry {
  type: "corridor";
  path: GeoCoordinate[];
  width: number; // metros
}

/**
 * Geometría de geocerca (unión de tipos)
 */
export type GeofenceGeometry = PolygonGeometry | CircleGeometry | CorridorGeometry;

/**
 * Etiqueta para filtrado
 */
export interface GeofenceTag {
  id: string;
  name: string;
  color: string;
}

/**
 * Configuración de alertas
 */
export interface GeofenceAlerts {
  onEntry: boolean;
  onExit: boolean;
  onDwell: boolean;
  dwellTimeMinutes?: number;
  notifyEmails?: string[];
}

/**
 * Dirección estructurada de una geocerca
 */
export interface GeofenceAddress {
  /** Ciudad */
  city?: string;
  /** Distrito */
  district?: string;
  /** Calle / Avenida */
  street?: string;
  /** Referencia adicional */
  reference?: string;
}

/**
 * Entidad Geocerca
 */
export interface Geofence extends BaseEntity {
  /** Código único */
  code: string;
  /** Nombre de la geocerca */
  name: string;
  /** Descripción */
  description?: string;
  
  type: GeofenceType;
  /** Categoría */
  category: GeofenceCategory;
  /** Geometría */
  geometry: GeofenceGeometry;
  /** Etiquetas para filtrado */
  tags: GeofenceTag[];
  /** Configuración de alertas */
  alerts: GeofenceAlerts;
  /** Estado */
  status: EntityStatus;
  /** Color en el mapa */
  color: string;
  /** Opacidad (0-1) */
  opacity: number;
  /** Dirección (si aplica) - legacy string */
  address?: string;
  /** Dirección estructurada */
  structuredAddress?: GeofenceAddress;
  /** Cliente asociado (si aplica) */
  customerId?: string;
  /** Notas */
  notes?: string;
}

/**
 * Estadísticas de geocercas
 */
export interface GeofenceStats {
  total: number;
  polygons: number;
  circles: number;
  byCategory: Record<GeofenceCategory, number>;
  tagsCount: number;
}
