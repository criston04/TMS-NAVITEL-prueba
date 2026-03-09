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
import {
  MOCK_VEHICLES,
  MOCK_DRIVERS,
  generateMockPendingOrders,
  generateMockAllOrders,
  generateMockSuggestions,
  generateMockAuditLogs,
  generateMockBlockedDays,
  generateMockNotifications,
  generateMockGanttData,
  mockAutoSchedule,
  findVehicleById,
  findDriverById,
  DEFAULT_KPIS,
  type MockVehicle,
  type MockDriver,
  type AutoScheduleResult,
} from '@/mocks/scheduling';
import { moduleConnectorService } from '@/services/integration';
import { tmsEventBus } from '@/services/integration/event-bus.service';
import { apiConfig, API_ENDPOINTS } from '@/config/api.config';
import { apiClient } from '@/lib/api';

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
  private readonly useMocks: boolean;
  private readonly simulateDelay = 500;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Simula una llamada API con delay
   */
  private async delay(ms: number = this.simulateDelay): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene las órdenes pendientes de programar
   */
  async getPendingOrders(): Promise<Order[]> {
    if (!this.useMocks) {
      return apiClient.get<Order[]>(`${API_ENDPOINTS.operations.scheduling}/pending-orders`);
    }

    await this.delay();
    return generateMockPendingOrders(12);
  }

  /**
   * Obtiene todas las órdenes (todos los estados)
   */
  async getAllOrders(): Promise<Order[]> {
    if (!this.useMocks) {
      return apiClient.get<Order[]>(`${API_ENDPOINTS.operations.scheduling}/all-orders`);
    }

    await this.delay();
    return generateMockAllOrders();
  }

  /**
   * Obtiene los vehículos disponibles
   */
  async getVehicles(): Promise<MockVehicle[]> {
    if (!this.useMocks) {
      return apiClient.get<MockVehicle[]>(`${API_ENDPOINTS.operations.scheduling}/vehicles`);
    }

    await this.delay(200);
    return MOCK_VEHICLES;
  }

  /**
   * Obtiene los conductores disponibles
   */
  async getDrivers(): Promise<MockDriver[]> {
    if (!this.useMocks) {
      return apiClient.get<MockDriver[]>(`${API_ENDPOINTS.operations.scheduling}/drivers`);
    }

    await this.delay(200);
    return MOCK_DRIVERS;
  }

  /**
   * Obtiene los KPIs del módulo
   */
  async getKPIs(): Promise<SchedulingKPIs> {
    if (!this.useMocks) {
      return apiClient.get<SchedulingKPIs>(`${API_ENDPOINTS.operations.scheduling}/kpis`);
    }

    await this.delay(300);
    return DEFAULT_KPIS;
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
   */
  createScheduledOrder(
    order: Order,
    payload: AssignmentPayload
  ): ScheduledOrder {
    const vehicle = findVehicleById(payload.vehicleId);
    const driver = findDriverById(payload.driverId);
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
      vehicle: vehicle ? {
        id: vehicle.id,
        plate: vehicle.plateNumber,
        brand: vehicle.model.split(' ')[0],
        model: vehicle.model,
        type: vehicle.type,
      } : undefined,
      driver: driver ? {
        id: driver.id,
        fullName: driver.fullName,
        phone: driver.phone,
      } : undefined,
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
   * Asigna recursos a una orden con validación de workflow
   */
  async assignOrder(payload: AssignmentPayload): Promise<SchedulingServiceResult<ScheduledOrder>> {
    if (!this.useMocks) {
      return apiClient.post<SchedulingServiceResult<ScheduledOrder>>(`${API_ENDPOINTS.operations.scheduling}/assign`, payload);
    }

    await this.delay(800);
    
    try {
      // Validar que existan los recursos
      const vehicle = findVehicleById(payload.vehicleId);
      const driver = findDriverById(payload.driverId);

      if (!vehicle) {
        return {
          success: false,
          error: 'Vehículo no encontrado',
        };
      }

      if (!driver) {
        return {
          success: false,
          error: 'Conductor no encontrado',
        };
      }

      // CONEXIÓN CON WORKFLOWS (VALIDACIÓN)
      // Nota: En producción, se obtendría la orden completa con su workflowId
      // Por ahora validamos si se pasa la información
      const scheduledOrderPartial: Partial<ScheduledOrder> = {
        scheduledDate: payload.scheduledDate,
        vehicleId: payload.vehicleId,
        driverId: payload.driverId,
        estimatedDuration: 4, // Default, en producción vendría del payload
      };

      const { validation, recommendations } = 
        await moduleConnectorService.prepareScheduledOrderWithValidation(scheduledOrderPartial);
      
      if (!validation.isValid) {
        console.warn('[SchedulingService] Validación de workflow falló:', validation.errors);
        return {
          success: false,
          error: validation.errors.join('. '),
        };
      }

      if (validation.warnings.length > 0) {
        console.info('[SchedulingService] Advertencias de workflow:', validation.warnings);
      }
      
      if (recommendations.length > 0) {
        console.info('[SchedulingService] Recomendaciones:', recommendations);
      }

      // Publicar evento de asignación exitosa
      tmsEventBus.publish('scheduling:assigned', {
        orderId: payload.orderId,
        vehicleId: payload.vehicleId,
        driverId: payload.driverId,
        scheduledDate: payload.scheduledDate instanceof Date 
          ? payload.scheduledDate.toISOString() 
          : String(payload.scheduledDate),
        vehiclePlate: vehicle.plateNumber,
        driverName: driver.name,
      }, 'scheduling-service');

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
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
    if (!this.useMocks) {
      return apiClient.post<{ isValid: boolean; suggestedDuration: number | null; warnings: string[]; errors: string[] }>(`${API_ENDPOINTS.operations.scheduling}/validate-workflow`, { orderId: order.id });
    }

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
   */
  async getWorkflowInfoForScheduling(workflowId: string): Promise<{
    steps: number;
    totalDuration: number;
    requiredGeofences: string[];
  } | null> {
    if (!this.useMocks) {
      return apiClient.get<{ steps: number; totalDuration: number; requiredGeofences: string[] } | null>(`${API_ENDPOINTS.operations.scheduling}/workflow-info/${workflowId}`);
    }

    const info = await moduleConnectorService.getWorkflowStepsForScheduling(workflowId);
    if (!info) return null;
    return {
      steps: info.steps.length,
      totalDuration: info.totalDuration,
      requiredGeofences: info.requiredGeofences,
    };
  }

  /**
   * Obtiene sugerencias de recursos para una orden
   * Pasa órdenes existentes para evaluar conflictos reales
   */
  async getSuggestions(
    orderId: string,
    date: Date,
    existingOrders: ScheduledOrder[] = []
  ): Promise<ResourceSuggestion[]> {
    if (!this.useMocks) {
      return apiClient.get<ResourceSuggestion[]>(`${API_ENDPOINTS.operations.scheduling}/suggestions/${orderId}`, { params: { date: date.toISOString() } });
    }

    await this.delay(600);
    return generateMockSuggestions(orderId, existingOrders, date);
  }

  /**
   * Valida las horas de servicio de un conductor
   * Acumula horas reales de asignaciones existentes (no solo mock estático)
   * Referencia FMCSA: 11h conduccción, 14h servicio, 60h/7días
   */
  async validateHOS(
    driverId: string,
    date: Date,
    estimatedDuration: number,
    existingOrders: ScheduledOrder[] = []
  ): Promise<HOSValidationResult> {
    if (!this.useMocks) {
      return apiClient.post<HOSValidationResult>(`${API_ENDPOINTS.operations.scheduling}/validate-hos`, { driverId, date: date.toISOString(), estimatedDuration });
    }

    await this.delay(400);
    
    const driver = findDriverById(driverId);
    
    if (!driver) {
      return {
        isValid: false,
        remainingHoursToday: 0,
        weeklyHoursUsed: 0,
        violations: ['Conductor no encontrado en el sistema'],
      };
    }

    // FMCSA limits
    const MAX_DRIVING_DAILY = 11;  // 11h conduccción
    const MAX_DUTY_DAILY = 14;     // 14h servicio total
    const MAX_WEEKLY = 60;         // 60h/7 días
    const BREAK_AFTER_HOURS = 8;   // Break obligatorio tras 8h
    
    const violations: string[] = [];
    const warnings: string[] = [];

    // Calcular horas ya asignadas HOY para este conductor
    const dateStr = date.toDateString();
    const todayAssignments = existingOrders.filter(o => {
      if (o.driverId !== driverId) return false;
      const oDate = o.scheduledDate instanceof Date ? o.scheduledDate : new Date(o.scheduledDate);
      return oDate.toDateString() === dateStr;
    });
    const hoursToday = todayAssignments.reduce((sum, o) => sum + (o.estimatedDuration || 4), 0);

    // Calcular horas semanales acumuladas (mock base + asignaciones reales)
    const weeklyFromAssignments = existingOrders
      .filter(o => o.driverId === driverId)
      .reduce((sum, o) => sum + (o.estimatedDuration || 4), 0);
    const totalWeekly = driver.hoursThisWeek + weeklyFromAssignments;

    // Validación 1: Límite diario de conducción (11h)
    if (hoursToday + estimatedDuration > MAX_DRIVING_DAILY) {
      violations.push(
        `Excede límite diario de conducción: ${hoursToday + estimatedDuration}h vs ${MAX_DRIVING_DAILY}h máximo (FMCSA §395.3)`
      );
    }

    // Validación 2: Límite diario de servicio (14h)
    if (hoursToday + estimatedDuration > MAX_DUTY_DAILY) {
      violations.push(
        `Excede límite diario de servicio: ${hoursToday + estimatedDuration}h vs ${MAX_DUTY_DAILY}h máximo (FMCSA §395.3)`
      );
    }

    // Validación 3: Límite semanal (60h/7d)
    if (totalWeekly + estimatedDuration > MAX_WEEKLY) {
      violations.push(
        `Excede límite semanal: ${totalWeekly + estimatedDuration}h vs ${MAX_WEEKLY}h máximo (FMCSA §395.3)`
      );
    }

    // Warning: Break obligatorio
    if (hoursToday + estimatedDuration > BREAK_AFTER_HOURS && todayAssignments.length > 0) {
      warnings.push(
        `Se requiere pausa de 30 min tras ${BREAK_AFTER_HOURS}h continuas (FMCSA §395.3(a)(3)(ii))`
      );
    }

    // Warning: Acercándose al límite
    const remainingDaily = MAX_DRIVING_DAILY - hoursToday;
    if (remainingDaily <= estimatedDuration + 2 && remainingDaily > estimatedDuration) {
      warnings.push(`Solo quedan ${remainingDaily}h disponibles hoy tras esta asignación`);
    }

    return {
      isValid: violations.length === 0,
      remainingHoursToday: Math.max(0, MAX_DRIVING_DAILY - hoursToday),
      weeklyHoursUsed: totalWeekly,
      violations,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Detecta conflictos para una asignación propuesta
   * Compara por VENTANA DE TIEMPO (hora inicio + duración), no solo por día
   * Elimina falsos positivos cuando las horas no se solapan
   */
  async detectConflicts(
    orderId: string,
    vehicleId: string,
    driverId: string,
    scheduledDate: Date,
    existingOrders: ScheduledOrder[],
    estimatedDuration?: number
  ): Promise<ScheduleConflict[]> {
    if (!this.useMocks) {
      return apiClient.post<ScheduleConflict[]>(`${API_ENDPOINTS.operations.scheduling}/detect-conflicts`, { orderId, vehicleId, driverId, scheduledDate: scheduledDate.toISOString() });
    }

    await this.delay(300);
    
    const conflicts: ScheduleConflict[] = [];
    const dateStr = scheduledDate.toDateString();
    const newStartHour = scheduledDate.getHours() + scheduledDate.getMinutes() / 60;
    const newDuration = estimatedDuration || 4;
    const newEndHour = newStartHour + newDuration;
    
    // Buscar órdenes en el mismo día
    const sameDayOrders = existingOrders.filter(order => {
      const orderDate = order.scheduledDate instanceof Date 
        ? order.scheduledDate 
        : new Date(order.scheduledDate);
      return orderDate.toDateString() === dateStr && order.id !== orderId;
    });

    /**
     * Verifica si dos ventanas de tiempo se solapan
     */
    const timeOverlaps = (order: ScheduledOrder): boolean => {
      const orderDate = order.scheduledDate instanceof Date
        ? order.scheduledDate
        : new Date(order.scheduledDate);
      const existingStart = orderDate.getHours() + orderDate.getMinutes() / 60;
      const existingDuration = order.estimatedDuration || 4;
      const existingEnd = existingStart + existingDuration;

      // Dos rangos [A,B] y [C,D] se solapan si A < D && C < B
      return newStartHour < existingEnd && existingStart < newEndHour;
    };

    // Verificar conflictos de vehículo CON solapamiento horario
    const vehicleConflicts = sameDayOrders.filter(
      o => o.vehicleId === vehicleId && timeOverlaps(o)
    );
    for (const vc of vehicleConflicts) {
      const vcDate = vc.scheduledDate instanceof Date ? vc.scheduledDate : new Date(vc.scheduledDate);
      const vcStart = `${vcDate.getHours().toString().padStart(2,'0')}:${vcDate.getMinutes().toString().padStart(2,'0')}`;
      const vcEndH = vcDate.getHours() + (vc.estimatedDuration || 4);
      const vcEnd = `${Math.floor(vcEndH).toString().padStart(2,'0')}:${Math.round((vcEndH % 1) * 60).toString().padStart(2,'0')}`;
      
      conflicts.push({
        id: `conflict-vehicle-${Date.now()}-${vc.id}`,
        type: 'vehicle_overlap',
        severity: 'high',
        message: `Vehículo ${vc.vehicle?.plate || vehicleId} ya asignado a ${vc.orderNumber} (${vcStart}-${vcEnd})`,
        suggestedResolution: 'Seleccione otro vehículo o ajuste el horario para evitar solapamiento',
        affectedEntity: {
          type: 'vehicle',
          id: vehicleId,
          name: vc.vehicle?.plate || vehicleId,
        },
        relatedOrderIds: [vc.id],
        detectedAt: new Date().toISOString(),
      });
    }

    // Verificar conflictos de conductor CON solapamiento horario
    const driverConflicts = sameDayOrders.filter(
      o => o.driverId === driverId && timeOverlaps(o)
    );
    for (const dc of driverConflicts) {
      const dcDate = dc.scheduledDate instanceof Date ? dc.scheduledDate : new Date(dc.scheduledDate);
      const dcStart = `${dcDate.getHours().toString().padStart(2,'0')}:${dcDate.getMinutes().toString().padStart(2,'0')}`;
      const dcEndH = dcDate.getHours() + (dc.estimatedDuration || 4);
      const dcEnd = `${Math.floor(dcEndH).toString().padStart(2,'0')}:${Math.round((dcEndH % 1) * 60).toString().padStart(2,'0')}`;

      conflicts.push({
        id: `conflict-driver-${Date.now()}-${dc.id}`,
        type: 'driver_overlap',
        severity: 'high',
        message: `Conductor ${dc.driver?.fullName || driverId} ya asignado a ${dc.orderNumber} (${dcStart}-${dcEnd})`,
        suggestedResolution: 'Seleccione otro conductor o ajuste los horarios para evitar solapamiento',
        affectedEntity: {
          type: 'driver',
          id: driverId,
          name: dc.driver?.fullName || driverId,
        },
        relatedOrderIds: [dc.id],
        detectedAt: new Date().toISOString(),
      });
    }

    // Verificar vehículo sin solapamiento pero mismo día (warning, no error)
    const vehicleSameDay = sameDayOrders.filter(
      o => o.vehicleId === vehicleId && !timeOverlaps(o)
    );
    if (vehicleSameDay.length > 0) {
      // No es conflicto pero se puede avisar
      // No se añade como conflicto para evitar falsos positivos
    }

    return conflicts;
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
    if (!this.useMocks) {
      return apiClient.post<BulkAssignmentResult>(
        `${API_ENDPOINTS.operations.scheduling}/bulk-assign`,
        { orderIds, vehicleId, driverId, scheduledDate: scheduledDate.toISOString(), notes }
      );
    }

    await this.delay(1200);

    const result: BulkAssignmentResult = {
      total: orderIds.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    const vehicle = findVehicleById(vehicleId);
    const driver = findDriverById(driverId);

    if (!vehicle) {
      result.failed = orderIds.length;
      result.errors = orderIds.map(id => ({
        orderId: id,
        orderNumber: id,
        error: 'Vehículo no encontrado',
      }));
      return result;
    }

    if (!driver) {
      result.failed = orderIds.length;
      result.errors = orderIds.map(id => ({
        orderId: id,
        orderNumber: id,
        error: 'Conductor no encontrado',
      }));
      return result;
    }

    // Simular asignación exitosa para todas
    result.success = orderIds.length;

    // Publicar evento por cada asignación exitosa
    for (const orderId of orderIds) {
      tmsEventBus.publish('scheduling:assigned', {
        orderId,
        vehicleId,
        driverId,
        scheduledDate: scheduledDate instanceof Date
          ? scheduledDate.toISOString()
          : String(scheduledDate),
        vehiclePlate: vehicle.plateNumber,
        driverName: driver.name,
      }, 'scheduling-service');
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //  RESCHEDULE (Feature 3)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Reprograma una orden ya asignada a otra fecha/hora
   * Valida conflictos y HOS en la nueva fecha antes de confirmar
   */
  async rescheduleOrder(
    orderId: string,
    newDate: Date,
    newResourceId?: string,
    existingOrders: ScheduledOrder[] = []
  ): Promise<SchedulingServiceResult<ScheduledOrder>> {
    if (!this.useMocks) {
      return apiClient.post<SchedulingServiceResult<ScheduledOrder>>(
        `${API_ENDPOINTS.operations.scheduling}/reschedule`,
        { orderId, newDate: newDate.toISOString(), newResourceId }
      );
    }

    await this.delay(600);

    // Buscar la orden existente
    const existingOrder = existingOrders.find(o => o.id === orderId);
    if (!existingOrder) {
      return { success: false, error: 'Orden no encontrada en las programaciones existentes' };
    }

    const vehicleId = newResourceId || existingOrder.vehicleId || '';
    const driverId = existingOrder.driverId || '';

    // Validar conflictos en la nueva fecha (excluyendo la propia orden)
    const otherOrders = existingOrders.filter(o => o.id !== orderId);
    const conflicts = await this.detectConflicts(
      orderId, vehicleId, driverId, newDate, otherOrders, existingOrder.estimatedDuration
    );

    if (conflicts.length > 0) {
      return {
        success: false,
        error: `Conflictos en nueva fecha: ${conflicts.map(c => c.message).join('; ')}`,
      };
    }

    // Validar HOS del conductor en nueva fecha
    if (driverId) {
      const hosResult = await this.validateHOS(
        driverId, newDate, existingOrder.estimatedDuration || 4, otherOrders
      );
      if (!hosResult.isValid) {
        return {
          success: false,
          error: `HOS inválido: ${hosResult.violations.join('; ')}`,
        };
      }
    }

    // Crear orden reprogramada
    const rescheduledOrder: ScheduledOrder = {
      ...existingOrder,
      scheduledDate: newDate,
      scheduledStartTime: this.formatTime(newDate),
      estimatedEndTime: this.calculateEndTime(newDate, existingOrder.estimatedDuration || 4),
      vehicleId: vehicleId || existingOrder.vehicleId,
      scheduleStatus: 'scheduled',
      hasConflict: false,
      conflicts: [],
    };

    // Publicar evento
    tmsEventBus.publish('scheduling:assigned', {
      orderId,
      vehicleId: rescheduledOrder.vehicleId || '',
      driverId: rescheduledOrder.driverId || '',
      scheduledDate: newDate.toISOString(),
      vehiclePlate: rescheduledOrder.vehicle?.plate || '',
      driverName: rescheduledOrder.driver?.fullName || '',
    }, 'scheduling-service');

    return { success: true, data: rescheduledOrder };
  }

  // ═══════════════════════════════════════════════════════════════
  //  AUTO-SCHEDULING (Feature 7)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Ejecuta auto-programación con algoritmo de scoring real
   * Retorna asignaciones concretas que el hook puede aplicar al estado
   */
  async autoSchedule(
    pendingOrders: Order[],
    vehicles: MockVehicle[],
    drivers: MockDriver[],
    existingScheduled: ScheduledOrder[] = []
  ): Promise<AutoScheduleResult> {
    if (!this.useMocks) {
      return apiClient.post<AutoScheduleResult>(
        `${API_ENDPOINTS.operations.scheduling}/auto-schedule`,
        { orderIds: pendingOrders.map(o => o.id) }
      );
    }

    await this.delay(2000);
    return mockAutoSchedule(pendingOrders, vehicles, drivers, existingScheduled);
  }

  // ═══════════════════════════════════════════════════════════════
  //  AUDIT LOG (Feature 9)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtiene el historial de cambios
   */
  async getAuditLogs(): Promise<ScheduleAuditLog[]> {
    if (!this.useMocks) {
      return apiClient.get<ScheduleAuditLog[]>(
        `${API_ENDPOINTS.operations.scheduling}/audit-logs`
      );
    }

    await this.delay(400);
    return generateMockAuditLogs();
  }

  // ═══════════════════════════════════════════════════════════════
  //  BLOCKED DAYS (Feature 10)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtiene los días bloqueados
   */
  async getBlockedDays(): Promise<BlockedDay[]> {
    if (!this.useMocks) {
      return apiClient.get<BlockedDay[]>(
        `${API_ENDPOINTS.operations.scheduling}/blocked-days`
      );
    }

    await this.delay(300);
    return generateMockBlockedDays();
  }

  /**
   * Bloquea un día
   */
  async blockDay(day: Omit<BlockedDay, 'id' | 'createdAt'>): Promise<BlockedDay> {
    if (!this.useMocks) {
      return apiClient.post<BlockedDay>(
        `${API_ENDPOINTS.operations.scheduling}/blocked-days`,
        day
      );
    }

    await this.delay(400);
    return {
      ...day,
      id: `block-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Desbloquea un día
   */
  async unblockDay(blockId: string): Promise<void> {
    if (!this.useMocks) {
      await apiClient.delete(`${API_ENDPOINTS.operations.scheduling}/blocked-days/${blockId}`);
      return;
    }

    await this.delay(300);
  }

  // ═══════════════════════════════════════════════════════════════
  //  NOTIFICATIONS (Feature 6)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtiene notificaciones del módulo
   */
  async getNotifications(): Promise<SchedulingNotification[]> {
    if (!this.useMocks) {
      return apiClient.get<SchedulingNotification[]>(
        `${API_ENDPOINTS.operations.scheduling}/notifications`
      );
    }

    await this.delay(300);
    return generateMockNotifications();
  }

  // ═══════════════════════════════════════════════════════════════
  //  GANTT (Feature 8)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtiene datos para la vista Gantt multi-día
   * Incluye órdenes reales y días bloqueados
   */
  async getGanttData(
    startDate: Date,
    days: number = 7,
    scheduledOrders: ScheduledOrder[] = [],
    blockedDays: BlockedDay[] = []
  ): Promise<GanttResourceRow[]> {
    if (!this.useMocks) {
      return apiClient.get<GanttResourceRow[]>(
        `${API_ENDPOINTS.operations.scheduling}/gantt`,
        { params: { startDate: startDate.toISOString(), days } }
      );
    }

    await this.delay(500);
    return generateMockGanttData(startDate, days, scheduledOrders, blockedDays);
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
