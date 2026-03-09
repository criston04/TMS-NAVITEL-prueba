import type { Order, OrderPriority } from './order';

/**
 * Configuración de features habilitables del módulo
 * @interface SchedulingFeatureFlags
 */
export interface SchedulingFeatureFlags {
  /** Habilita validación de Hours of Service (horas máximas de conducción) */
  enableHOSValidation: boolean;
  /** Máximo de horas de conducción permitidas */
  maxDrivingHours: number;
  /** Habilita sugerencia automática de recursos */
  enableAutoSuggestion: boolean;
  /** Habilita validación de conflictos en tiempo real */
  enableRealtimeConflictCheck: boolean;
  /** Intervalo de validación de conflictos (ms) */
  conflictCheckIntervalMs: number;
  /** Tipo de integración GPS */
  gpsIntegrationType: 'internal' | 'external' | 'none';
  /** URL del proveedor GPS externo (si aplica) */
  externalGpsProviderUrl?: string;
  /** Webhook para notificaciones GPS */
  gpsWebhookUrl?: string;
}

/**
 * Configuración por defecto del módulo
 */
export const DEFAULT_SCHEDULING_CONFIG: SchedulingFeatureFlags = {
  enableHOSValidation: false,
  maxDrivingHours: 10,
  enableAutoSuggestion: false,
  enableRealtimeConflictCheck: false,
  conflictCheckIntervalMs: 5000,
  gpsIntegrationType: 'none',
};

/**
 * Estados de una programación
 * @enum {string}
 */
export type ScheduleStatus =
  | 'unscheduled'    // Sin programar
  | 'scheduled'      // Programada (fecha asignada)
  | 'partial'        // Parcial (falta vehículo o conductor)
  | 'ready'          // Lista (recursos completos)
  | 'in_progress'    // En ejecución
  | 'conflict'       // Con conflicto
  | 'completed'      // Completada
  | 'cancelled';     // Cancelada

/**
 * Tipos de vista del calendario
 * @enum {string}
 */
export type CalendarViewType = 'day' | 'week' | 'month';

/**
 * Alias para compatibilidad con componentes existentes
 * @deprecated Usar CalendarViewType directamente
 */
export type CalendarView = CalendarViewType;

/**
 * Tipos de conflicto
 * @enum {string}
 */
export type ConflictType =
  | 'vehicle_overlap'      // Vehículo con 2+ órdenes solapadas
  | 'driver_overlap'       // Conductor con 2+ órdenes solapadas
  | 'driver_hos'           // Conductor excede horas de conducción
  | 'vehicle_maintenance'  // Vehículo en mantenimiento
  | 'driver_unavailable'   // Conductor no disponible
  | 'capacity_exceeded'    // Capacidad del vehículo excedida
  | 'license_expired'      // Licencia del conductor vencida
  | 'no_resource';         // Sin recurso asignado

/**
 * Severidad del conflicto
 * @enum {string}
 */
export type ConflictSeverity = 'low' | 'medium' | 'high';

/**
 * Representa una programación de orden
 * Extiende Order con información de programación
 * @interface ScheduledOrder
 */
export interface ScheduledOrder extends Order {
  /** Fecha programada (Date o string ISO) */
  scheduledDate: Date | string;
  /** Hora de inicio programada (HH:mm) */
  scheduledStartTime?: string;
  /** Hora de fin estimada (HH:mm) */
  estimatedEndTime?: string;
  /** Duración estimada en horas */
  estimatedDuration?: number;
  /** ID del vehículo asignado (override de Order) */
  vehicleId?: string;
  /** ID del conductor asignado (override de Order) */
  driverId?: string;
  /** Estado de la programación */
  scheduleStatus?: ScheduleStatus;
  /** Tiene conflicto detectado */
  hasConflict?: boolean;
  /** Conflictos detectados */
  conflicts?: ScheduleConflict[];
  /** Notas de la programación */
  schedulingNotes?: string;
  /** Usuario que programó */
  scheduledBy?: string;
  /** Nombre del usuario que programó */
  scheduledByName?: string;
}

/**
 * Conflicto detectado en la programación
 * @interface ScheduleConflict
 */
export interface ScheduleConflict {
  /** ID único del conflicto */
  id: string;
  
  type: ConflictType;
  /** Severidad */
  severity: ConflictSeverity;
  /** Mensaje descriptivo */
  message: string;
  /** Resolución sugerida */
  suggestedResolution?: string;
  /** Entidad afectada (vehículo, conductor, orden) */
  affectedEntity?: {
    type: 'vehicle' | 'driver' | 'order';
    id: string;
    name: string;
  };
  /** IDs de órdenes relacionadas */
  relatedOrderIds?: string[];
  /** Resuelto automáticamente */
  autoResolved?: boolean;
  /** Fecha de detección */
  detectedAt: string;
}

/**
 * Recurso sugerido para asignación
 * @interface ResourceSuggestion
 */
export interface ResourceSuggestion {
  
  type: 'vehicle' | 'driver';
  
  resourceId: string;
  
  name: string;
  /** Puntuación de compatibilidad (0-100) */
  score: number;
  /** Razón principal de la sugerencia */
  reason: string;
  /** Razones adicionales */
  reasons?: string[];
  /** Advertencias si las hay */
  warnings?: string[];
  /** Disponible para la fecha/hora */
  isAvailable: boolean;
}

/**
 * Ventana de tiempo para entrega
 * @interface DeliveryTimeWindow
 */
export interface DeliveryTimeWindow {
  /** Hora de inicio de la ventana */
  startTime: string;
  /** Hora de fin de la ventana */
  endTime: string;
  /** Es ventana estricta (no se puede entregar fuera) */
  isStrict: boolean;
}

// CALENDARIO

/**
 * Datos de un día en el calendario
 * @interface CalendarDayData
 */
export interface CalendarDayData {
  /** Fecha como objeto Date */
  date: Date;
  /** Órdenes programadas para este día */
  orders: ScheduledOrder[];
  /** Porcentaje de utilización del día */
  utilization: number;
  /** Día está bloqueado */
  isBlocked: boolean;
  /** Razón del bloqueo */
  blockReason?: string;
}

/**
 * Datos de un día en el calendario (formato extendido para API)
 * @interface CalendarDayDataExtended
 */
export interface CalendarDayDataExtended {
  /** Fecha (YYYY-MM-DD) */
  date: string;
  /** Día del mes */
  dayOfMonth: number;
  /** Es hoy */
  isToday: boolean;
  /** Es del mes actual */
  isCurrentMonth: boolean;
  /** Es fin de semana */
  isWeekend: boolean;
  /** Está bloqueado */
  isBlocked: boolean;
  /** Razón del bloqueo */
  blockReason?: string;
  /** Órdenes programadas */
  scheduledOrders: ScheduledOrder[];
  /** Resumen de capacidad */
  capacitySummary: DayCapacitySummary;
}

/**
 * Resumen de capacidad de un día
 * @interface DayCapacitySummary
 */
export interface DayCapacitySummary {
  /** Total de vehículos disponibles */
  totalVehicles: number;
  /** Vehículos asignados */
  assignedVehicles: number;
  /** Total de órdenes */
  totalOrders: number;
  /** Órdenes con conflicto */
  ordersWithConflicts: number;
  /** Órdenes sin recurso */
  ordersWithoutResource: number;
  /** Capacidad total en kg */
  totalCapacityKg: number;
  /** Capacidad utilizada en kg */
  usedCapacityKg: number;
  /** Porcentaje de utilización */
  utilizationPercent: number;
}

// TIMELINE

/**
 * Entrada en el timeline de un recurso
 * @interface TimelineEntry
 */
export interface TimelineEntry {
  /** ID de la programación */
  scheduleId: string;
  /** ID de la orden */
  orderId: string;
  /** Número de orden */
  orderNumber: string;
  /** Hora de inicio */
  startTime: string;
  /** Hora de fin */
  endTime: string;
  /** Duración en minutos */
  durationMinutes: number;
  /** Estado */
  status: ScheduleStatus;
  
  customerName: string;
  /** Destino */
  destination: string;
  /** Prioridad */
  priority: OrderPriority;
}

/**
 * Línea de tiempo de un recurso
 * @interface ResourceTimeline
 */
export interface ResourceTimeline {
  
  resourceId: string;
  
  type: 'vehicle' | 'driver';
  
  name: string;
  /** Código/placa (para vehículos) */
  code?: string;
  /** Porcentaje de utilización */
  utilization: number;
  /** Asignaciones del día */
  assignments: ScheduledOrder[];
  /** Tiene conflictos */
  hasConflicts?: boolean;
}

/**
 * Línea de tiempo de un recurso (formato API extendido)
 * @interface ResourceTimelineExtended
 */
export interface ResourceTimelineExtended {
  
  resourceType: 'vehicle' | 'driver';
  
  resourceId: string;
  
  resourceName: string;
  /** Código/placa */
  resourceCode: string;
  /** Entradas del timeline */
  entries: TimelineEntry[];
  /** Total de horas programadas */
  totalScheduledHours: number;
  /** Tiene conflictos */
  hasConflicts: boolean;
}

/**
 * Filtros para órdenes pendientes de programar
 * @interface PendingOrdersFilters
 */
export interface PendingOrdersFilters {
  /** Búsqueda por número de orden */
  search?: string;
  /** Filtrar por empresa */
  companyId?: string;
  /** Filtrar por operador logístico */
  operatorId?: string;
  /** Solo órdenes asignadas */
  onlyAssigned?: boolean;
  /** Solo órdenes sin asignar */
  onlyUnassigned?: boolean;
  /** Prioridad */
  priority?: OrderPriority;
  /** Fecha desde */
  dateFrom?: string;
  /** Fecha hasta */
  dateTo?: string;
}

/**
 * Filtros para el calendario
 * @interface CalendarFilters
 */
export interface CalendarFilters {
  /** ID del vehículo */
  vehicleId?: string;
  /** Fecha inicio */
  dateFrom?: string;
  /** Fecha fin */
  dateTo?: string;
  /** ID de la empresa */
  companyId?: string;
  /** ID del operador logístico */
  operatorId?: string;
  /** Estados a mostrar */
  statuses?: ScheduleStatus[];
  /** Mostrar solo con conflictos */
  onlyWithConflicts?: boolean;
}

/**
 * Payload para programar una orden
 * @interface ScheduleOrderPayload
 */
export interface ScheduleOrderPayload {
  /** ID de la orden */
  orderId: string;
  /** Fecha programada */
  scheduledDate: string;
  /** Hora de inicio */
  scheduledStartTime: string;
  /** ID del vehículo (opcional) */
  vehicleId?: string;
  /** ID del conductor (opcional) */
  driverId?: string;
  /** Notas */
  notes?: string;
}

/**
 * Payload para reasignar recursos
 * @interface ReassignResourcePayload
 */
export interface ReassignResourcePayload {
  /** ID de la programación */
  scheduleId: string;
  /** Nuevo vehículo */
  vehicleId?: string;
  /** Nuevo conductor */
  driverId?: string;
  /** Razón del cambio */
  reason?: string;
}

/**
 * Payload para desprogramar una orden
 * @interface UnscheduleOrderPayload
 */
export interface UnscheduleOrderPayload {
  /** ID de la programación */
  scheduleId: string;
  /** Razón de la desprogramación */
  reason: string;
}

/**
 * Registro en el historial de cambios
 * @interface ScheduleAuditLog
 */
export interface ScheduleAuditLog {
  
  id: string;
  /** ID de la programación */
  scheduleId: string;
  /** Tipo de acción */
  action: 'created' | 'updated' | 'reassigned' | 'unscheduled' | 'conflict_detected' | 'conflict_resolved';
  /** Descripción del cambio */
  description: string;
  /** Cambios específicos */
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  /** Usuario que realizó la acción */
  performedBy: string;
  
  performedByName: string;
  /** Fecha y hora */
  performedAt: string;
}

// HOS (HOURS OF SERVICE) VALIDATION

/**
 * Resultado de validación HOS (Horas de Servicio)
 * @interface HOSValidationResult
 */
export interface HOSValidationResult {
  /** Validación pasó */
  isValid: boolean;
  /** Horas restantes disponibles hoy */
  remainingHoursToday: number;
  /** Horas usadas esta semana */
  weeklyHoursUsed: number;
  /** Lista de violaciones detectadas */
  violations: string[];
  /** Advertencias */
  warnings?: string[];
}

// GPS INTEGRATION

/**
 * Configuración de integración GPS
 * @interface GPSIntegrationConfig
 */
export interface GPSIntegrationConfig {
  /** Tipo de integración */
  type: 'internal' | 'external';
  /** Proveedor (si es externo) */
  provider?: string;
  /** URL del API */
  apiUrl?: string;
  /** API Key */
  apiKey?: string;
  /** Webhook para recibir actualizaciones */
  webhookUrl?: string;
  /** Intervalo de polling (ms) */
  pollingIntervalMs?: number;
}

/**
 * Payload para vincular orden a GPS
 * @interface LinkToGPSPayload
 */
export interface LinkToGPSPayload {
  /** ID de la orden */
  orderId: string;
  /** ID del vehículo */
  vehicleId: string;
  /** Configuración GPS */
  gpsConfig: GPSIntegrationConfig;
  /** Fecha de inicio del tracking */
  trackingStartDate: string;
}

// RESÚMENES Y KPIs

/**
 * KPIs del módulo de programación
 * @interface SchedulingKPIs
 */
export interface SchedulingKPIs {
  /** Órdenes pendientes de programar */
  pendingOrders: number;
  /** Órdenes programadas para hoy */
  scheduledToday: number;
  /** Órdenes en riesgo (conflictos) */
  atRiskOrders: number;
  /** Porcentaje de utilización de flota */
  fleetUtilization: number;
  /** Porcentaje de utilización de conductores */
  driverUtilization: number;
  /** Tasa de entregas a tiempo */
  onTimeDeliveryRate: number;
  /** Lead time promedio (horas) */
  averageLeadTime: number;
  /** Tendencia semanal (% cambio) */
  weeklyTrend: number;
}

// ═══════════════════════════════════════════════════════════════
// BULK ASSIGNMENT (Feature 1)
// ═══════════════════════════════════════════════════════════════

/**
 * Resultado de una asignación masiva
 * @interface BulkAssignmentResult
 */
export interface BulkAssignmentResult {
  /** Total de órdenes procesadas */
  total: number;
  /** Asignaciones exitosas */
  success: number;
  /** Asignaciones fallidas */
  failed: number;
  /** Errores por orden */
  errors: { orderId: string; orderNumber: string; error: string }[];
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS (Feature 6)
// ═══════════════════════════════════════════════════════════════

/**
 * Tipos de notificación del módulo
 */
export type SchedulingNotificationType =
  | 'conflict'
  | 'assignment'
  | 'reschedule'
  | 'auto_schedule'
  | 'day_blocked'
  | 'bulk_assignment'
  | 'hos_warning'
  | 'info';

/**
 * Severidad de una notificación
 */
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

/**
 * Notificación del módulo de programación
 * @interface SchedulingNotification
 */
export interface SchedulingNotification {
  id: string;
  type: SchedulingNotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  /** Marca de tiempo */
  timestamp: string;
  /** Si fue leída */
  isRead: boolean;
  /** ID de orden asociada (opcional) */
  relatedOrderId?: string;
  /** Acción sugerida */
  actionLabel?: string;
  /** Descartada */
  isDismissed?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// BLOCKED DAYS (Feature 10)
// ═══════════════════════════════════════════════════════════════

/**
 * Día bloqueado para programación
 * @interface BlockedDay
 */
export interface BlockedDay {
  id: string;
  /** Fecha bloqueada */
  date: string;
  /** Razón del bloqueo */
  reason: string;
  /** Tipo de bloqueo */
  blockType: 'full_day' | 'partial' | 'holiday';
  /** Si aplica a todos los recursos */
  appliesToAll: boolean;
  /** IDs de recursos específicos bloqueados */
  resourceIds?: string[];
  /** Creado por */
  createdBy: string;
  /** Fecha de creación */
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// GANTT VIEW (Feature 8)
// ═══════════════════════════════════════════════════════════════

/**
 * Rango de días para la vista Gantt
 * @interface GanttDateRange
 */
export interface GanttDateRange {
  startDate: Date;
  endDate: Date;
  totalDays: number;
}

/**
 * Datos de recurso para Gantt multi-día
 * @interface GanttResourceRow
 */
export interface GanttResourceRow {
  resourceId: string;
  type: 'vehicle' | 'driver';
  name: string;
  code?: string;
  /** Asignaciones distribuidas por día */
  dailyAssignments: {
    date: Date;
    orders: ScheduledOrder[];
    utilization: number;
    isBlocked: boolean;
  }[];
}
