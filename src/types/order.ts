import type { Customer } from './models/customer';
import type { Driver } from './models/driver';
import type { Vehicle, VehicleType } from './models/vehicle';

/**
 * Estados posibles de una orden en el sistema
 * @enum {string}
 */
export type OrderStatus =
  | 'draft'           // Borrador - orden creada pero no confirmada
  | 'pending'         // Pendiente - esperando asignación
  | 'assigned'        // Asignada - vehículo y conductor asignados
  | 'in_transit'      // En tránsito - viaje iniciado
  | 'at_milestone'    // En hito - vehículo en una geocerca
  | 'delayed'         // Retrasada - fuera de tiempo estimado
  | 'completed'       // Completada - todos los hitos cumplidos
  | 'closed'          // Cerrada - cierre manual realizado
  | 'cancelled';      // Cancelada - orden anulada

/**
 * Estados de envío a sistemas externos
 * @enum {string}
 */
export type OrderSyncStatus =
  | 'not_sent'        // No enviada
  | 'pending'         // Pendiente de envío
  | 'sending'         // Enviando
  | 'sent'            // Enviada exitosamente
  | 'error'           // Error en el envío
  | 'retry';          // Reintentando

/**
 * Estados de un hito/milestone
 * @enum {string}
 */
export type MilestoneStatus =
  | 'pending'         // Pendiente - aún no alcanzado
  | 'approaching'     // Aproximándose - cerca de la geocerca
  | 'arrived'         // Llegó - entrada a geocerca
  | 'in_progress'     // En progreso - dentro de la geocerca
  | 'completed'       // Completado - salió de la geocerca
  | 'skipped'         // Saltado - no se visitó
  | 'delayed';        // Retrasado - llegó tarde

/**
 * Prioridades de una orden
 * @enum {string}
 */
export type OrderPriority =
  | 'low'             // Baja
  | 'normal'          // Normal
  | 'high'            // Alta
  | 'urgent';         // Urgente

/**
 * Tipos de servicio de transporte
 * @enum {string}
 */
export type ServiceType =
  | 'distribucion'         // Distribución local/nacional
  | 'importacion'          // Importación marítima/aérea/terrestre
  | 'exportacion'          // Exportación marítima/aérea/terrestre
  | 'transporte_minero'    // Transporte de mineral/concentrado
  | 'transporte_residuos'  // Transporte de residuos peligrosos
  | 'interprovincial'      // Transporte interprovincial de carga
  | 'mudanza'              // Mudanza comercial/industrial
  | 'courier'              // Paquetería y courier
  | 'otro';                // Otro tipo de servicio

/**
 * Tipos de carga
 * @enum {string}
 */
export type CargoType =
  | 'general'         // Carga general
  | 'refrigerated'    // Refrigerada
  | 'hazardous'       // Peligrosa
  | 'fragile'         // Frágil
  | 'oversized'       // Sobredimensionada
  | 'liquid'          // Líquidos
  | 'bulk';           // Granel

/**
 * Representa un hito/punto de control en la ruta de una orden
 * @interface OrderMilestone
 */
export interface OrderMilestone {
  /** Identificador único del hito */
  id: string;
  /** ID de la orden a la que pertenece */
  orderId: string;
  /** ID de la geocerca asociada */
  geofenceId: string;
  /** Nombre de la geocerca/hito */
  geofenceName: string;
  
  type: 'origin' | 'waypoint' | 'destination';
  /** Orden de secuencia en la ruta */
  sequence: number;
  /** Dirección del hito */
  address: string;
  /** Coordenadas geográficas */
  coordinates: {
    lat: number;
    lng: number;
  };
  /** Hora estimada de llegada */
  estimatedArrival: string;
  /** Hora estimada de salida */
  estimatedDeparture?: string;
  /** Hora real de entrada a la geocerca */
  actualEntry?: string;
  /** Hora real de salida de la geocerca */
  actualExit?: string;
  /** Estado actual del hito */
  status: MilestoneStatus;
  /** Diferencia en minutos respecto a lo estimado (+ = retraso, - = adelanto) */
  delayMinutes?: number;
  /** Notas o instrucciones específicas del hito */
  notes?: string;
  /** Contacto en el punto */
  contact?: {
    name: string;
    phone: string;
    email?: string;
  };
  /** Indica si el hito fue llenado manualmente (contingencia sin GPS) */
  isManual?: boolean;
  /** Datos del llenado manual */
  manualEntryData?: {
    /** Usuario que registró manualmente */
    registeredBy: string;
    /** Fecha/hora del registro manual */
    registeredAt: string;
    /** Observación del operador */
    observation: string;
    /** Motivo de la entrada manual */
    reason: 'sin_senal_gps' | 'falla_equipo' | 'carga_retroactiva' | 'correccion' | 'otro';
  };
}

/**
 * Información de la carga transportada
 * @interface OrderCargo
 */
export interface OrderCargo {
  /** Descripción de la carga */
  description: string;
  
  type: CargoType;
  /** Peso en kilogramos */
  weightKg: number;
  /** Volumen en metros cúbicos */
  volumeM3?: number;
  /** Cantidad de unidades/bultos */
  quantity: number;
  /** Valor declarado en USD */
  declaredValue?: number;
  /** Requiere temperatura controlada */
  temperatureControlled?: boolean;
  /** Rango de temperatura si aplica */
  temperatureRange?: {
    min: number;
    max: number;
    unit: 'celsius' | 'fahrenheit';
  };
  /** Instrucciones especiales de manejo */
  handlingInstructions?: string;
}

/**
 * Datos para el cierre de una orden
 * @interface OrderClosureData
 */
export interface OrderClosureData {
  /** Observaciones generales del viaje */
  observations: string;
  /** Lista de incidencias ocurridas */
  incidents: OrderIncidentRecord[];
  /** Motivos de desviación si los hubo */
  deviationReasons: DeviationReason[];
  /** ID del usuario que cerró la orden */
  closedBy: string;
  /** Nombre del usuario que cerró */
  closedByName: string;
  /** Fecha y hora del cierre */
  closedAt: string;
  /** Firma digital o confirmación */
  signature?: string;
  /** Documentos adjuntos al cierre */
  attachments?: OrderAttachment[];
}

/**
 * Registro de una incidencia en la orden
 * @interface OrderIncidentRecord
 */
export interface OrderIncidentRecord {
  /** ID único del registro */
  id: string;
  /** ID del catálogo de incidencias (si aplica) */
  incidentCatalogId?: string;
  /** Nombre de la incidencia del catálogo */
  incidentName?: string;
  /** Descripción libre de la incidencia */
  freeDescription?: string;
  /** Severidad de la incidencia */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Fecha y hora de ocurrencia */
  occurredAt: string;
  /** Hito donde ocurrió (opcional) */
  milestoneId?: string;
  /** Acción tomada */
  actionTaken?: string;
  /** Evidencias adjuntas */
  evidence?: OrderAttachment[];
}

/**
 * Motivo de desviación de la ruta o tiempo
 * @interface DeviationReason
 */
export interface DeviationReason {
  /** ID único */
  id: string;
  /** Tipo de desviación */
  type: 'route' | 'time' | 'cargo' | 'other';
  /** Descripción del motivo */
  description: string;
  /** Impacto en minutos o kilómetros */
  impact?: {
    value: number;
    unit: 'minutes' | 'hours' | 'kilometers';
  };
  /** Documentación de respaldo */
  documentation?: string;
}

/**
 * Archivo adjunto a una orden
 * @interface OrderAttachment
 */
export interface OrderAttachment {
  /** ID único */
  id: string;
  
  fileName: string;
  /** Tipo MIME */
  mimeType: string;
  /** Tamaño en bytes */
  sizeBytes: number;
  /** URL de acceso */
  url: string;
  
  uploadedAt: string;
  /** Usuario que subió */
  uploadedBy: string;
  /** Categoría del documento */
  category?: 'pod' | 'invoice' | 'photo' | 'document' | 'other';
}

/**
 * Historial de cambios de estado de la orden
 * @interface OrderStatusHistory
 */
export interface OrderStatusHistory {
  /** ID único del registro */
  id: string;
  /** Estado anterior */
  fromStatus: OrderStatus;
  /** Estado nuevo */
  toStatus: OrderStatus;
  
  changedAt: string;
  /** Usuario que realizó el cambio */
  changedBy: string;
  
  changedByName: string;
  /** Motivo del cambio (opcional) */
  reason?: string;
}

/**
 * Representa una orden de transporte completa
 * @interface Order
 */
export interface Order {
  /** Identificador único de la orden */
  id: string;
  /** Número de orden (visible al usuario) */
  orderNumber: string;
  
  customerId: string;
  /** Datos del cliente (populated) */
  customer?: Pick<Customer, 'id' | 'name' | 'code' | 'email'>;
  /** ID del transportista asignado */
  carrierId?: string;
  
  carrierName?: string;
  /** ID del vehículo asignado */
  vehicleId?: string;
  /** Datos del vehículo (populated) - usa campos aplanados para compatibilidad */
  vehicle?: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    type: VehicleType;
  };
  /** ID del conductor asignado */
  driverId?: string;
  /** Datos del conductor (populated) */
  driver?: Pick<Driver, 'id' | 'fullName' | 'phone'>;
  /** ID del operador GPS */
  gpsOperatorId?: string;
  /** Nombre del operador GPS */
  gpsOperatorName?: string;
  /** ID del workflow asignado */
  workflowId?: string;
  
  workflowName?: string;
  /** Estado actual de la orden */
  status: OrderStatus;
  /** Prioridad de la orden */
  priority: OrderPriority;
  /** Estado de sincronización externa */
  syncStatus: OrderSyncStatus;
  /** Mensaje de error de sincronización */
  syncErrorMessage?: string;
  /** Último intento de sincronización */
  lastSyncAttempt?: string;
  /** Información de la carga */
  cargo: OrderCargo;
  /** Lista de hitos/puntos de control */
  milestones: OrderMilestone[];
  /** Porcentaje de cumplimiento del viaje */
  completionPercentage: number;
  /** Fecha de creación */
  createdAt: string;
  /** Usuario que creó la orden */
  createdBy: string;
  /** Fecha de última actualización */
  updatedAt: string;
  /** Fecha programada de inicio */
  scheduledStartDate: string;
  /** Fecha programada de finalización */
  scheduledEndDate: string;
  /** Fecha real de inicio */
  actualStartDate?: string;
  /** Fecha real de finalización */
  actualEndDate?: string;
  /** Datos del cierre (solo si está cerrada) */
  closureData?: OrderClosureData;
  /** Motivo de cancelación (solo si está cancelada) */
  cancellationReason?: string;
  /** Fecha de cancelación */
  cancelledAt?: string;
  /** Usuario que canceló la orden */
  cancelledBy?: string;
  /** Historial de estados */
  statusHistory: OrderStatusHistory[];
  /** Tipo de servicio de la orden */
  serviceType: ServiceType;
  /** Referencia del documento (booking, guía, BL, factura, etc.) */
  reference?: string;
  /** Referencia externa (del sistema del cliente) */
  externalReference?: string;
  /** Notas generales */
  notes?: string;
  /** Etiquetas para clasificación */
  tags?: string[];
  /** Metadatos adicionales */
  metadata?: Record<string, unknown>;
}

/**
 * Datos para crear una nueva orden
 * @interface CreateOrderDTO
 */
export interface CreateOrderDTO {
  customerId: string;
  carrierId?: string;
  vehicleId?: string;
  driverId?: string;
  workflowId?: string;
  priority: OrderPriority;
  serviceType: ServiceType;
  reference?: string;
  cargo: OrderCargo;
  milestones: Omit<OrderMilestone, 'id' | 'orderId' | 'status' | 'actualEntry' | 'actualExit' | 'delayMinutes'>[];
  scheduledStartDate: string;
  scheduledEndDate: string;
  externalReference?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Datos para actualizar una orden existente
 * @interface UpdateOrderDTO
 */
export interface UpdateOrderDTO extends Partial<CreateOrderDTO> {
  status?: OrderStatus;
}

/**
 * Filtros para búsqueda de órdenes
 * @interface OrderFilters
 */
export interface OrderFilters {
  /** Búsqueda por número de orden */
  search?: string;
  /** Filtrar por cliente */
  customerId?: string;
  /** Filtrar por transportista */
  carrierId?: string;
  /** Filtrar por operador GPS */
  gpsOperatorId?: string;
  /** Filtrar por estado */
  status?: OrderStatus | OrderStatus[];
  /** Filtrar por prioridad */
  priority?: OrderPriority | OrderPriority[];
  /** Filtrar por estado de sincronización */
  syncStatus?: OrderSyncStatus;
  /** Tipo de fecha para el filtro de rango */
  dateType?: 'creation' | 'scheduled' | 'execution';
  /** Fecha de inicio del rango */
  dateFrom?: string;
  /** Fecha de fin del rango */
  dateTo?: string;
  /** Filtrar por tipo de servicio */
  serviceType?: ServiceType;
  /** Filtrar por etiquetas */
  tags?: string[];
  /** Ordenar por campo */
  sortBy?: keyof Order;
  /** Dirección del ordenamiento */
  sortOrder?: 'asc' | 'desc';
  /** Página actual (paginación) */
  page?: number;
  /** Elementos por página */
  pageSize?: number;
}

/**
 * Resultado paginado de órdenes
 * @interface OrdersResponse
 */
export interface OrdersResponse {
  /** Lista de órdenes */
  data: Order[];
  
  total: number;
  
  page: number;
  /** Tamaño de página */
  pageSize: number;
  /** Total de páginas */
  totalPages: number;
  /** Contadores por estado */
  statusCounts: Record<OrderStatus, number>;
}

/**
 * Datos para importación masiva desde Excel
 * @interface OrderImportRow
 */
export interface OrderImportRow {
  /** Número de fila en el Excel */
  rowNumber: number;
  /** Datos parseados */
  data: Partial<CreateOrderDTO>;
  /** Errores de validación */
  errors: string[];
  /** Advertencias */
  warnings: string[];
  /** Estado de la fila */
  status: 'valid' | 'invalid' | 'warning';
}

/**
 * Resultado de importación masiva
 * @interface OrderImportResult
 */
export interface OrderImportResult {
  /** Total de filas procesadas */
  totalRows: number;
  /** Filas válidas */
  validRows: number;
  /** Filas con errores */
  errorRows: number;
  /** Filas con advertencias */
  warningRows: number;
  /** Detalle por fila */
  rows: OrderImportRow[];
  /** Órdenes creadas exitosamente */
  createdOrders?: Order[];
}

/**
 * Datos para exportación a Excel
 * @interface OrderExportOptions
 */
export interface OrderExportOptions {
  /** Filtros a aplicar */
  filters: OrderFilters;
  /** IDs específicos a exportar (si no se usan filtros) */
  orderIds?: string[];
  /** Incluir hitos detallados */
  includeMilestones: boolean;
  /** Incluir historial de estados */
  includeStatusHistory: boolean;
  /** Incluir datos de cierre */
  includeClosureData: boolean;
  /** Formato de fechas */
  dateFormat?: string;
  /** Zona horaria */
  timezone?: string;
}

/**
 * Payload para envío masivo a sistemas externos
 * @interface BulkSendPayload
 */
export interface BulkSendPayload {
  /** IDs de órdenes a enviar */
  orderIds: string[];
  /** Sistema destino */
  targetSystem: string;
  /** Forzar reenvío aunque ya se haya enviado */
  forceResend?: boolean;
  /** Callback URL para notificaciones */
  callbackUrl?: string;
}

/**
 * Resultado de envío masivo
 * @interface BulkSendResult
 */
export interface BulkSendResult {
  /** ID del batch job */
  batchId: string;
  /** Total de órdenes en el batch */
  totalOrders: number;
  
  status: 'queued' | 'processing' | 'completed' | 'failed';
  /** Progreso (0-100) */
  progress: number;
  /** Resultados por orden */
  results: Array<{
    orderId: string;
    status: 'success' | 'error';
    message?: string;
  }>;
  
  startedAt: string;
  /** Fecha de finalización */
  completedAt?: string;
}

/**
 * Evento de actualización en tiempo real
 * @interface OrderRealtimeEvent
 */
export interface OrderRealtimeEvent {
  
  type: 'status_change' | 'milestone_update' | 'location_update' | 'sync_update';
  /** ID de la orden afectada */
  orderId: string;
  /** Datos del evento */
  payload: {
    /** Datos anteriores */
    previous?: Partial<Order>;
    /** Datos actuales */
    current: Partial<Order>;
  };
  /** Timestamp del evento */
  timestamp: string;
}

/**
 * Información del workflow conectado a la orden
 * @interface OrderWorkflowInfo
 */
export interface OrderWorkflowInfo {
  /** ID del workflow asignado */
  workflowId: string;
  
  workflowName: string;
  /** Código del workflow */
  workflowCode: string;
  /** Estado actual en el workflow */
  currentStepId?: string;
  /** Nombre del paso actual */
  currentStepName?: string;
  /** Índice del paso actual (1-based) */
  currentStepIndex?: number;
  
  totalSteps: number;
  /** Porcentaje de avance en el workflow */
  workflowProgress: number;
  /** Duración estimada total (horas) */
  estimatedDurationHours: number;
  /** Está retrasado según el workflow */
  isDelayed: boolean;
}

/**
 * Información de programación conectada a la orden
 * @interface OrderSchedulingInfo
 */
export interface OrderSchedulingInfo {
  /** Fecha programada */
  scheduledDate: string;
  /** Hora de inicio programada */
  scheduledStartTime?: string;
  /** Hora de fin estimada */
  estimatedEndTime?: string;
  /** ID del vehículo asignado */
  vehicleId?: string;
  /** Placa del vehículo */
  vehiclePlate?: string;
  /** ID del conductor asignado */
  driverId?: string;
  
  driverName?: string;
  /** Tiene conflictos de programación */
  hasConflicts: boolean;
  /** Mensajes de conflicto */
  conflictMessages?: string[];
}

/**
 * Orden enriquecida con información de conexiones
 * @interface EnrichedOrder
 */
export interface EnrichedOrder extends Order {
  /** Información del workflow conectado */
  workflowInfo?: OrderWorkflowInfo;
  /** Información de programación conectada */
  schedulingInfo?: OrderSchedulingInfo;
  /** Metadatos de conexión */
  connectionMetadata?: {
    /** Fecha de última sincronización de workflow */
    workflowSyncedAt?: string;
    /** Fecha de última sincronización de programación */
    schedulingSyncedAt?: string;
    /** Advertencias de conexión */
    connectionWarnings?: string[];
  };
}
