import type { Order } from '@/types/order';
import type {
  ScheduledOrder,
  CalendarDayData,
  ScheduleConflict,
  ResourceSuggestion,
  HOSValidationResult,
  SchedulingKPIs,
  ScheduleAuditLog,
  BlockedDay,
  SchedulingNotification,
  GanttResourceRow,
  BulkAssignmentResult,
} from '@/types/scheduling';
import { moduleConnectorService } from '@/services/integration';
import { API_ENDPOINTS } from '@/config/api.config';
import { apiClient } from '@/lib/api';
import { snakeToCamel } from '@/lib/case-converter';

// Tipos antes en mocks/scheduling — ahora locales al servicio.
// TODO backend: mover a @/types/scheduling cuando esté formalizado.
export interface MockVehicle {
  id: string;
  plateNumber: string;
  type: string;
  model: string;
  year?: number;
  status?: string;
  capacity?: number;
  available?: boolean;
}

export interface MockDriver {
  id: string;
  name: string;
  fullName: string;
  phone: string;
  license?: string;
  hoursThisWeek: number;
  available?: boolean;
}

export interface AutoScheduleResult {
  totalProcessed: number;
  successfulAssignments: number;
  failedAssignments: number;
  assignments: Array<{
    orderId: string;
    vehicleId: string;
    driverId: string;
    scheduledDate: string;
    score: number;
  }>;
  unassigned: Array<{ orderId: string; reason: string }>;
}

export interface AssignmentPayload {
  orderId: string;
  vehicleId: string;
  driverId: string;
  scheduledDate: Date;
  notes?: string;
}

export interface SchedulingServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// SERVICIO DE PROGRAMACIÓN

class SchedulingService {
  /**
   * Helper: desempaca la respuesta paginada del backend {items|data: []}.
   *
   * 2026-05-03 (UI bug fix): aplica `snakeToCamel` automáticamente porque el
   * backend de scheduling devuelve los campos en snake_case (`scheduled_pickup_at`,
   * `customer_id`, `vehicle_plate`, etc.) pero el frontend tipa los modelos en
   * camelCase. Sin esta transformación, todas las propiedades llegan undefined
   * y la UI crashea con "Cannot read properties of undefined".
   */
  private unwrapList<T>(response: unknown): T[] {
    let items: unknown = response;
    if (response && typeof response === "object" && !Array.isArray(response)) {
      const r = response as { items?: unknown; data?: unknown };
      items = r.items ?? r.data ?? [];
    }
    if (!Array.isArray(items)) return [];
    return items.map((item) => snakeToCamel<T>(item));
  }

  /**
   * Helper: ejecuta una promesa GET y devuelve fallback en errores
   * recuperables (404 endpoint no implementado, 429 rate limit, 5xx bug backend).
   * Otros errores se propagan al caller.
   */
  private async getOrFallback<T>(loader: () => Promise<T>, fallback: T, label = "scheduling"): Promise<T> {
    try {
      return await loader();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404 || status === 429 || (typeof status === "number" && status >= 500)) {
        console.warn(`[${label}] backend ${status}. Devolviendo empty.`);
        return fallback;
      }
      throw err;
    }
  }

  /**
   * Obtiene las órdenes pendientes de programar.
   *
   * 2026-05-03 (UI bug fix): "pendiente de programar" en el frontend incluye
   * órdenes en `status='pending'` Y `status='draft'`. Antes el query solo
   * pedía `status=pending` y todas las órdenes recién creadas (que están en
   * `draft`) no aparecían en la columna lateral, aunque sí aparecían
   * asignadas en el calendario. Resultado UX confuso: "Pendientes: 0" pero
   * 13 órdenes en el día.
   *
   * El backend NO acepta múltiples status en una sola query (probado:
   * `?status=pending,draft` devuelve 0), así que hacemos 2 queries en
   * paralelo y mergeamos.
   *
   * Cuando el backend implemente filtro multi-status, simplificar a un solo
   * query con `?status=pending,draft`.
   */
  async getPendingOrders(): Promise<Order[]> {
    return this.getOrFallback(async () => {
      const fetchByStatus = async (status: string): Promise<Order[]> => {
        const response = await apiClient.get<unknown>(
          `${API_ENDPOINTS.operations.scheduling}/orders`,
          { params: { status } }
        );
        return this.unwrapList<Order>(response);
      };
      const [pending, draft] = await Promise.allSettled([
        fetchByStatus('pending'),
        fetchByStatus('draft'),
      ]);
      const pendingList = pending.status === 'fulfilled' ? pending.value : [];
      const draftList = draft.status === 'fulfilled' ? draft.value : [];
      return [...pendingList, ...draftList];
    }, [], "scheduling.getPendingOrders");
  }

  /**
   * Obtiene todas las órdenes (todos los estados)
   */
  async getAllOrders(): Promise<Order[]> {
    return this.getOrFallback(async () => {
      const response = await apiClient.get<unknown>(`${API_ENDPOINTS.operations.scheduling}/orders`);
      return this.unwrapList<Order>(response);
    }, [], "scheduling.getAllOrders");
  }

  /**
   * Obtiene los vehículos disponibles
   * NOTE: backend NO expone /operations/scheduling/vehicles. Usamos /master/vehicles.
   */
  async getVehicles(): Promise<MockVehicle[]> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.master.vehicles);
    return this.unwrapList<MockVehicle>(response);
  }

  /**
   * Obtiene los conductores disponibles
   * NOTE: backend NO expone /operations/scheduling/drivers. Usamos /master/drivers.
   */
  async getDrivers(): Promise<MockDriver[]> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.master.drivers);
    return this.unwrapList<MockDriver>(response);
  }

  /**
   * Obtiene los KPIs del módulo
   */
  async getKPIs(): Promise<SchedulingKPIs> {
    const empty: SchedulingKPIs = {
      pendingOrders: 0,
      scheduledToday: 0,
      fleetUtilization: 0,
      driverUtilization: 0,
      averageDelay: 0,
      onTimeRate: 0,
      conflictsCount: 0,
    } as unknown as SchedulingKPIs;
    return this.getOrFallback(
      () => apiClient.get<SchedulingKPIs>(`${API_ENDPOINTS.operations.scheduling}/kpis`),
      empty,
      "scheduling.getKPIs"
    );
  }

  /**
   * Genera datos del calendario para un mes
   */
  generateCalendarDays(month: Date, existingOrders: ScheduledOrder[] = [], blockedDays: BlockedDay[] = []): CalendarDayData[] {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const lastDay = new Date(year, monthIndex + 1, 0);

    const days: CalendarDayData[] = [];

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, monthIndex, day);

      // Buscar órdenes existentes para este día
      const dayOrders = existingOrders.filter(order => {
        const orderDate = order.scheduledDate instanceof Date
          ? order.scheduledDate
          : new Date(order.scheduledDate);
        return this.isSameDay(orderDate, date);
      });

      // Check if this day is blocked
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const blocked = blockedDays.some(bd => {
        // 2026-05-03 (UI bug fix): guarda defensiva. Si bd.date viene undefined
        // (transformación malformada del backend), retornar false en vez de
        // crashear. El transformer en getBlockedDays() ya hace el trabajo de
        // mapear, esto es una salvaguarda final.
        if (!bd?.date || typeof bd.date !== "string") return false;
        const bdDate = bd.date.split('T')[0]; // handle ISO strings
        return bdDate === dateStr;
      });

      days.push({
        date,
        orders: dayOrders,
        utilization: Math.min(100, dayOrders.length * 15),
        isBlocked: blocked,
      });
    }

    return days;
  }

  /**
   * Compara si dos fechas son el mismo día
   */
  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Estima duración del viaje basándose en distancia Haversine origen→destino
   */
  private estimateTripDuration(order: Order): number {
    const origin = order.milestones?.find(m => m.type === 'origin');
    const dest = order.milestones?.find(m => m.type === 'destination');
    if (!origin?.coordinates || !dest?.coordinates) return 4;

    const R = 6371;
    const dLat = ((dest.coordinates.lat - origin.coordinates.lat) * Math.PI) / 180;
    const dLng = ((dest.coordinates.lng - origin.coordinates.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((origin.coordinates.lat * Math.PI) / 180) *
      Math.cos((dest.coordinates.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const drivingHours = km / 55;
    return Math.max(2, Math.round((drivingHours + 1) * 10) / 10);
  }

  /**
   * Crea una orden programada a partir de una orden y datos de asignación
   * Calcula duración estimada real basada en distancia geográfica
   *
   * NOTA: este helper construye un ScheduledOrder en memoria sin consultar
   * vehicle/driver detalles del backend. El caller debe enriquecer
   * `vehicle` y `driver` cuando los tenga disponibles.
   */
  createScheduledOrder(
    order: Order,
    payload: AssignmentPayload
  ): ScheduledOrder {
    const duration = this.estimateTripDuration(order);

    const scheduledOrder: ScheduledOrder = {
      ...order,
      scheduledDate: payload.scheduledDate,
      scheduledStartTime: this.formatTime(payload.scheduledDate),
      estimatedEndTime: this.calculateEndTime(payload.scheduledDate, duration),
      estimatedDuration: duration,
      vehicleId: payload.vehicleId,
      driverId: payload.driverId,
      scheduleStatus: 'scheduled',
      hasConflict: false,
      conflicts: [],
      schedulingNotes: payload.notes,
      scheduledBy: 'current-user',
      scheduledByName: 'Usuario Actual',
    };

    return scheduledOrder;
  }

  /**
   * Formatea una fecha a formato de hora HH:mm
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /**
   * Calcula la hora de fin estimada
   */
  private calculateEndTime(startDate: Date, durationHours: number): string {
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
    return this.formatTime(endDate);
  }

  /**
   * Asigna recursos a una orden con validación de workflow.
   *
   * Backend Rev3 (verificado 2026-05-01) requiere camelCase:
   *   { orderId, scheduledDate (YYYY-MM-DD), scheduledStartTime (HH:MM),
   *     vehicleId, driverId, notes?, force? }
   * El backend rechaza con HTTP 400 si falta `scheduledStartTime`.
   */
  async assignOrder(payload: AssignmentPayload): Promise<SchedulingServiceResult<ScheduledOrder>> {
    const isoDate = payload.scheduledDate.toISOString();
    const dateOnly = isoDate.split("T")[0];          // "2026-05-02"
    const timeOnly = this.formatTime(payload.scheduledDate); // "08:00"

    const backendPayload = {
      orderId: payload.orderId,
      vehicleId: payload.vehicleId,
      driverId: payload.driverId,
      scheduledDate: dateOnly,
      scheduledStartTime: timeOnly,                   // OBLIGATORIO
      notes: payload.notes,
      force: false,
    };
    return apiClient.post<SchedulingServiceResult<ScheduledOrder>>(
      `${API_ENDPOINTS.operations.scheduling}/assign`,
      backendPayload
    );
  }

  /**
   * Valida una orden contra su workflow antes de programar
   * @param order - Orden a validar
   * @returns Resultado de validación con sugerencias
   */
  async validateOrderWorkflow(order: Partial<ScheduledOrder>): Promise<{
    isValid: boolean;
    suggestedDuration: number | null;
    warnings: string[];
    errors: string[];
  }> {
    if (order.workflowId) {
      // Backend: POST /workflows/:id/validate-for-schedule con partial<ScheduledOrder>
      return apiClient.post<{ isValid: boolean; suggestedDuration: number | null; warnings: string[]; errors: string[] }>(
        `${API_ENDPOINTS.master.workflows}/${order.workflowId}/validate-for-schedule`,
        order
      );
    }

    // Sin workflowId: usar el connector local (no es mock — es validación cliente)
    const result = await moduleConnectorService.validateSchedulingWithWorkflow(order);
    return {
      isValid: result.isValid,
      suggestedDuration: result.suggestedDuration || null,
      warnings: result.warnings,
      errors: result.errors,
    };
  }

  /**
   * Obtiene información del workflow para mostrar en la UI de programación
   *
   * NOTE: backend NO tiene /operations/scheduling/workflow-info/:id.
   * getOptional devuelve null en 404 para que el caller lo maneje sin crashear.
   */
  async getWorkflowInfoForScheduling(workflowId: string): Promise<{
    steps: number;
    totalDuration: number;
    requiredGeofences: string[];
  } | null> {
    return apiClient.getOptional<{ steps: number; totalDuration: number; requiredGeofences: string[] }>(
      `${API_ENDPOINTS.operations.scheduling}/workflow-info/${workflowId}`
    );
  }

  /**
   * Obtiene sugerencias de recursos para una orden.
   *
   * 2026-05-06 (bug fix): el backend devuelve 500 Internal Server Error en
   * `GET /operations/scheduling/suggestions/:orderId` con cualquier orderId
   * real (validacion existe — UUID dummy devuelve 404, pero al procesar una
   * orden valida el handler crashea internamente). Reportado al backend.
   *
   * Para evitar que el modal "Programar Orden" crashee con stack trace de
   * runtime, capturamos el 500/404 y devolvemos lista vacia. La UI muestra
   * "No hay sugerencias disponibles" y el usuario puede seguir programando
   * manualmente seleccionando vehiculo y conductor desde los dropdowns.
   */
  async getSuggestions(
    orderId: string,
    date: Date,
    _existingOrders: ScheduledOrder[] = []
  ): Promise<ResourceSuggestion[]> {
    try {
      const response = await apiClient.get<unknown>(
        `${API_ENDPOINTS.operations.scheduling}/suggestions/${orderId}`,
        { params: { date: date.toISOString() } }
      );
      return this.unwrapList<ResourceSuggestion>(response);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 500 || status === 404) {
        // Bug del backend o orden no encontrada — fallback a lista vacia.
        // El usuario puede seguir programando manualmente.
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[SchedulingService] getSuggestions(${orderId}) → ${status}. ` +
            "Fallback a lista vacia. El backend tiene un bug en este endpoint."
          );
        }
        return [];
      }
      throw err;
    }
  }

  /**
   * Valida las horas de servicio de un conductor
   * Referencia FMCSA: 11h conduccción, 14h servicio, 60h/7días
   */
  async validateHOS(
    driverId: string,
    date: Date,
    estimatedDuration: number,
    _existingOrders: ScheduledOrder[] = []
  ): Promise<HOSValidationResult> {
    return apiClient.post<HOSValidationResult>(
      `${API_ENDPOINTS.operations.scheduling}/validate-hos`,
      { driverId, date: date.toISOString(), estimatedDuration }
    );
  }

  /**
   * Detecta conflictos para una asignación propuesta
   */
  async detectConflicts(
    orderId: string,
    vehicleId: string,
    driverId: string,
    scheduledDate: Date,
    _existingOrders: ScheduledOrder[],
    _estimatedDuration?: number
  ): Promise<ScheduleConflict[]> {
    return apiClient.post<ScheduleConflict[]>(
      `${API_ENDPOINTS.operations.scheduling}/detect-conflicts`,
      { orderId, vehicleId, driverId, scheduledDate: scheduledDate.toISOString() }
    );
  }

  /**
   * Actualiza los KPIs después de una asignación
   */
  updateKPIsAfterAssignment(currentKPIs: SchedulingKPIs): SchedulingKPIs {
    return {
      ...currentKPIs,
      pendingOrders: Math.max(0, currentKPIs.pendingOrders - 1),
      scheduledToday: currentKPIs.scheduledToday + 1,
      fleetUtilization: Math.min(100, currentKPIs.fleetUtilization + 3),
      driverUtilization: Math.min(100, currentKPIs.driverUtilization + 2),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  BULK ASSIGNMENT (Feature 1)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Asigna múltiples órdenes a un mismo par vehículo/conductor
   */
  async bulkAssign(
    orderIds: string[],
    vehicleId: string,
    driverId: string,
    scheduledDate: Date,
    notes?: string
  ): Promise<BulkAssignmentResult> {
    return apiClient.post<BulkAssignmentResult>(
      `${API_ENDPOINTS.operations.scheduling}/bulk-assign`,
      { orderIds, vehicleId, driverId, scheduledDate: scheduledDate.toISOString(), notes }
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  RESCHEDULE (Feature 3)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Reprograma una orden ya asignada a otra fecha/hora
   */
  async rescheduleOrder(
    orderId: string,
    newDate: Date,
    newResourceId?: string,
    _existingOrders: ScheduledOrder[] = []
  ): Promise<SchedulingServiceResult<ScheduledOrder>> {
    return apiClient.post<SchedulingServiceResult<ScheduledOrder>>(
      `${API_ENDPOINTS.operations.scheduling}/reschedule`,
      { orderId, newDate: newDate.toISOString(), newResourceId }
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  AUTO-SCHEDULING (Feature 7)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Ejecuta auto-programación
   */
  async autoSchedule(
    pendingOrders: Order[],
    _vehicles: MockVehicle[],
    _drivers: MockDriver[],
    _existingScheduled: ScheduledOrder[] = []
  ): Promise<AutoScheduleResult> {
    return apiClient.post<AutoScheduleResult>(
      `${API_ENDPOINTS.operations.scheduling}/auto-schedule`,
      { orderIds: pendingOrders.map(o => o.id) }
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  AUDIT LOG (Feature 9)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtiene el historial de cambios
   */
  async getAuditLogs(): Promise<ScheduleAuditLog[]> {
    return this.getOrFallback(async () => {
      const response = await apiClient.get<unknown>(
        `${API_ENDPOINTS.operations.scheduling}/audit-logs`
      );
      return this.unwrapList<ScheduleAuditLog>(response);
    }, [], "scheduling.getAuditLogs");
  }

  // ═══════════════════════════════════════════════════════════════
  //  BLOCKED DAYS (Feature 10)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtiene los días bloqueados.
   *
   * 2026-05-03 (UI bug fix): el backend devuelve los campos en snake_case
   * (`blocked_date, block_type, applies_to_all, resource_ids, created_by,
   * created_at`) pero el tipo `BlockedDay` del frontend usa camelCase
   * (`date, blockType, appliesToAll, resourceIds, createdBy, createdAt`).
   * Antes el frontend asumía el shape camelCase ya formado y crasheaba al
   * iterar (`bd.date.split is undefined`). Ahora aplicamos transformación.
   */
  async getBlockedDays(): Promise<BlockedDay[]> {
    return this.getOrFallback(async () => {
      const response = await apiClient.get<unknown>(
        `${API_ENDPOINTS.operations.scheduling}/blocked-days`
      );
      // unwrapList ya aplica snakeToCamel automáticamente, así que recibimos
      // los campos en camelCase: blockedDate (NO date — el backend usa
      // `blocked_date` que se convierte a `blockedDate`, distinto a `date`).
      // Tras conversión: { id, blockedDate, reason, blockType, appliesToAll,
      // resourceIds, createdBy, createdAt }
      const raw = this.unwrapList<Record<string, unknown>>(response);
      return raw.map((b): BlockedDay => ({
        id: String(b.id ?? ""),
        // El backend usa `blocked_date` → conversión auto a `blockedDate`.
        // El frontend tipa `BlockedDay.date`. Mapeamos manualmente.
        date: String(b.blockedDate ?? b.date ?? ""),
        reason: String(b.reason ?? ""),
        blockType: (b.blockType ?? "full_day") as BlockedDay["blockType"],
        appliesToAll: Boolean(b.appliesToAll ?? true),
        resourceIds: b.resourceIds as string[] | undefined,
        createdBy: String(b.createdBy ?? ""),
        createdAt: String(b.createdAt ?? ""),
      }));
    }, [], "scheduling.getBlockedDays");
  }

  /**
   * Bloquea un día
   */
  async blockDay(day: Omit<BlockedDay, 'id' | 'createdAt'>): Promise<BlockedDay> {
    // Backend: POST /operations/scheduling/block-day (singular), GET /blocked-days (plural)
    return apiClient.post<BlockedDay>(
      `${API_ENDPOINTS.operations.scheduling}/block-day`,
      day
    );
  }

  /**
   * Desbloquea un día
   */
  async unblockDay(blockId: string): Promise<void> {
    // Backend: DELETE /operations/scheduling/block-day/:id (singular)
    await apiClient.delete(`${API_ENDPOINTS.operations.scheduling}/block-day/${blockId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  //  NOTIFICATIONS (Feature 6)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtiene notificaciones del módulo
   */
  async getNotifications(): Promise<SchedulingNotification[]> {
    return this.getOrFallback(async () => {
      const response = await apiClient.get<unknown>(
        `${API_ENDPOINTS.operations.scheduling}/notifications`
      );
      return this.unwrapList<SchedulingNotification>(response);
    }, [], "scheduling.getNotifications");
  }

  // ═══════════════════════════════════════════════════════════════
  //  GANTT (Feature 8)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtiene datos para la vista Gantt multi-día
   */
  async getGanttData(
    startDate: Date,
    days: number = 7,
    _scheduledOrders: ScheduledOrder[] = [],
    _blockedDays: BlockedDay[] = []
  ): Promise<GanttResourceRow[]> {
    return this.getOrFallback(async () => {
      const response = await apiClient.get<unknown>(
        `${API_ENDPOINTS.operations.scheduling}/gantt`,
        { params: { startDate: startDate.toISOString(), days } }
      );
      return this.unwrapList<GanttResourceRow>(response);
    }, [], "scheduling.getGanttData");
  }

  // ═══════════════════════════════════════════════════════════════
  //  EXPORT (Feature 5)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Genera CSV de la programación
   */
  generateScheduleCSV(orders: Order[]): string {
    const headers = [
      'Orden', 'Referencia', 'Cliente', 'Estado', 'Prioridad',
      'Vehículo', 'Conductor', 'Origen', 'Destino',
      'Fecha Prog.', 'Peso (kg)',
    ];

    const rows = orders.map(o => {
      const origin = o.milestones?.find(m => m.type === 'origin');
      const dest = o.milestones?.find(m => m.type === 'destination');
      return [
        o.orderNumber || '',
        o.reference || '',
        o.customer?.name || '',
        o.status || '',
        o.priority || '',
        o.vehicle?.plate || '',
        o.driver?.fullName || '',
        origin?.geofenceName || '',
        dest?.geofenceName || '',
        o.scheduledStartDate || '',
        String(o.cargo?.weightKg || 0),
      ].map(v => `"${v}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const schedulingService = new SchedulingService();
