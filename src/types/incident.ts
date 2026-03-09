/**
 * Categorías de incidencias
 * @enum {string}
 */
export type IncidentCategory =
  | 'vehicle'         // Relacionadas con el vehículo
  | 'cargo'           // Relacionadas con la carga
  | 'driver'          // Relacionadas con el conductor
  | 'route'           // Relacionadas con la ruta
  | 'customer'        // Relacionadas con el cliente
  | 'weather'         // Condiciones climáticas
  | 'security'        // Seguridad
  | 'documentation'   // Documentación
  | 'other';          // Otras

/**
 * Severidad de la incidencia
 * @enum {string}
 */
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Estado de una incidencia
 * @enum {string}
 */
export type IncidentStatus = 'active' | 'inactive';

/**
 * Representa una incidencia del catálogo predefinido
 * @interface IncidentCatalogItem
 */
export interface IncidentCatalogItem {
  /** ID único de la incidencia en el catálogo */
  id: string;
  /** Código de la incidencia */
  code: string;
  /** Nombre de la incidencia */
  name: string;
  /** Descripción detallada */
  description: string;
  /** Categoría */
  category: IncidentCategory;
  /** Severidad por defecto */
  defaultSeverity: IncidentSeverity;
  /** Requiere evidencia (fotos/documentos) */
  requiresEvidence: boolean;
  /** Tipos de evidencia aceptados */
  acceptedEvidenceTypes?: ('photo' | 'document' | 'video')[];
  /** Cantidad mínima de evidencias */
  minEvidenceCount?: number;
  /** Requiere acción inmediata */
  requiresImmediateAction: boolean;
  /** Acciones sugeridas */
  suggestedActions?: string[];
  /** Plantilla de descripción (con placeholders) */
  descriptionTemplate?: string;
  /** Campos adicionales requeridos */
  additionalFields?: IncidentAdditionalField[];
  /** Afecta el cumplimiento de la orden */
  affectsCompliance: boolean;
  /** Notificar automáticamente a */
  autoNotifyRoles?: string[];
  /** Estado en el catálogo */
  status: IncidentStatus;
  /** Fecha de creación */
  createdAt: string;
  /** Fecha de última actualización */
  updatedAt: string;
  /** Ordenamiento en la lista */
  sortOrder: number;
  /** Tags para búsqueda */
  tags?: string[];
}

/**
 * Campo adicional para una incidencia
 * @interface IncidentAdditionalField
 */
export interface IncidentAdditionalField {
  
  id: string;
  /** Etiqueta del campo */
  label: string;
  
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  /** Es obligatorio */
  required: boolean;
  /** Opciones para select */
  options?: Array<{ value: string; label: string }>;
  /** Placeholder */
  placeholder?: string;
  /** Valor por defecto */
  defaultValue?: string;
}

/**
 * Incidencia registrada en una orden (instancia)
 * @interface IncidentRecord
 */
export interface IncidentRecord {
  /** ID único del registro */
  id: string;
  /** ID de la orden */
  orderId: string;
  /** ID del catálogo (null si es texto libre) */
  catalogItemId: string | null;
  /** Datos del catálogo (populated) */
  catalogItem?: IncidentCatalogItem;
  
  type: 'catalog' | 'free_text';
  /** Nombre de la incidencia (del catálogo o personalizado) */
  name: string;
  /** Descripción (del catálogo, plantilla procesada o libre) */
  description: string;
  /** Categoría (del catálogo o seleccionada para texto libre) */
  category: IncidentCategory;
  /** Severidad asignada */
  severity: IncidentSeverity;
  /** Fecha y hora de ocurrencia */
  occurredAt: string;
  /** ID del hito donde ocurrió (opcional) */
  milestoneId?: string;
  
  milestoneName?: string;
  /** Ubicación donde ocurrió */
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  /** Acción tomada */
  actionTaken: string;
  /** Estado de resolución */
  resolutionStatus: 'pending' | 'in_progress' | 'resolved' | 'unresolved';
  /** Descripción de la resolución */
  resolutionDescription?: string;
  /** Fecha de resolución */
  resolvedAt?: string;
  /** Usuario que resolvió */
  resolvedBy?: string;
  /** Evidencias adjuntas */
  evidence: IncidentEvidence[];
  /** Valores de campos adicionales */
  additionalFieldValues?: Record<string, string | number>;
  /** Usuario que registró */
  reportedBy: string;
  /** Nombre del usuario que registró */
  reportedByName: string;
  
  reportedAt: string;
  /** Notas adicionales */
  notes?: string;
}

/**
 * Evidencia de una incidencia
 * @interface IncidentEvidence
 */
export interface IncidentEvidence {
  /** ID único */
  id: string;
  
  type: 'photo' | 'document' | 'video';
  
  fileName: string;
  /** Tipo MIME */
  mimeType: string;
  /** Tamaño en bytes */
  sizeBytes: number;
  /** URL de acceso */
  url: string;
  /** URL de miniatura (para imágenes) */
  thumbnailUrl?: string;
  /** Descripción */
  description?: string;
  
  capturedAt: string;
  /** Ubicación de captura */
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * DTO para crear una incidencia del catálogo
 * @interface CreateIncidentCatalogItemDTO
 */
export interface CreateIncidentCatalogItemDTO {
  code: string;
  name: string;
  description: string;
  category: IncidentCategory;
  defaultSeverity: IncidentSeverity;
  requiresEvidence: boolean;
  acceptedEvidenceTypes?: ('photo' | 'document' | 'video')[];
  minEvidenceCount?: number;
  requiresImmediateAction: boolean;
  suggestedActions?: string[];
  descriptionTemplate?: string;
  additionalFields?: Omit<IncidentAdditionalField, 'id'>[];
  affectsCompliance: boolean;
  autoNotifyRoles?: string[];
  tags?: string[];
}

/**
 * DTO para registrar una incidencia en una orden
 * @interface CreateIncidentRecordDTO
 */
export interface CreateIncidentRecordDTO {
  /** Tipo: del catálogo o texto libre */
  type: 'catalog' | 'free_text';
  /** ID del catálogo (requerido si type es 'catalog') */
  catalogItemId?: string;
  /** Nombre personalizado (requerido si type es 'free_text') */
  customName?: string;
  /** Descripción personalizada o procesada */
  description: string;
  /** Categoría (requerida si type es 'free_text') */
  category?: IncidentCategory;
  /** Severidad */
  severity: IncidentSeverity;
  
  occurredAt: string;
  /** ID del hito relacionado */
  milestoneId?: string;
  /** Ubicación */
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  /** Acción tomada */
  actionTaken: string;
  /** Valores de campos adicionales */
  additionalFieldValues?: Record<string, string | number>;
}

/**
 * Filtros para búsqueda en el catálogo
 * @interface IncidentCatalogFilters
 */
export interface IncidentCatalogFilters {
  search?: string;
  category?: IncidentCategory;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  requiresEvidence?: boolean;
  requiresImmediateAction?: boolean;
  tags?: string[];
}

/**
 * Estadísticas de incidencias
 * @interface IncidentStatistics
 */
export interface IncidentStatistics {
  
  total: number;
  /** Por categoría */
  byCategory: Record<IncidentCategory, number>;
  /** Por severidad */
  bySeverity: Record<IncidentSeverity, number>;
  /** Por estado de resolución */
  byResolutionStatus: Record<string, number>;
  /** Incidencias del catálogo vs texto libre */
  byType: {
    catalog: number;
    freeText: number;
  };
  /** Top 10 incidencias más frecuentes */
  topIncidents: Array<{
    name: string;
    count: number;
    catalogItemId?: string;
  }>;
  /** Período analizado */
  period: {
    from: string;
    to: string;
  };
}
