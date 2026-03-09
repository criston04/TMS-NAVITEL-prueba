import type { Order } from '@/types/order';
import type { 
  SchedulingKPIs,
  SchedulingFeatureFlags,
  ResourceTimeline,
  ResourceSuggestion,
  ScheduleAuditLog,
  BlockedDay,
  SchedulingNotification,
  GanttResourceRow,
  ScheduledOrder,
} from '@/types/scheduling';

import {
  SHARED_VEHICLES,
  SHARED_DRIVERS,
  SHARED_ORDERS,
  findCustomerById,
  findLocationById,
  findVehicleById as findSharedVehicleById,
  findDriverById as findSharedDriverById,
  getOrderStats,
  getFleetStats,
} from './shared-data';

import type { VehicleType } from '@/types/models/vehicle';

export interface MockVehicle {
  id: string;
  plateNumber: string;
  model: string;
  status: 'available' | 'in_use' | 'maintenance';
  type: VehicleType;
  capacityKg: number;
}

export interface MockDriver {
  id: string;
  fullName: string;
  name: string;
  status: 'available' | 'on_duty' | 'off_duty';
  phone: string;
  licenseExpiry: string;
  hoursThisWeek: number;
}

/**
 * Vehículos disponibles para programación
 */
export const MOCK_VEHICLES = SHARED_VEHICLES.map(v => ({
  id: v.id,
  plateNumber: v.plate,
  model: `${v.brand} ${v.model}`,
  status: v.operationalStatus === 'available' ? 'available' as const : 
          v.operationalStatus === 'on-route' ? 'in_use' as const : 
          'maintenance' as const,
  type: v.type,
  capacityKg: v.capacityKg,
}));

/**
 * Conductores disponibles para programación
 */
export const MOCK_DRIVERS = SHARED_DRIVERS.map(d => ({
  id: d.id,
  fullName: d.fullName,
  name: d.shortName,
  status: d.availability === 'available' ? 'available' as const :
          d.availability === 'on-route' ? 'on_duty' as const :
          'off_duty' as const,
  phone: d.phone,
  licenseExpiry: d.licenseExpiry,
  hoursThisWeek: d.hoursThisWeek,
}));

// KPIs POR DEFECTO

export function getSchedulingKPIs(): SchedulingKPIs {
  const orderStats = getOrderStats();
  const fleetStats = getFleetStats();
  
  const fleetUtilization = fleetStats.totalVehicles > 0 
    ? Math.round((fleetStats.onRouteVehicles / fleetStats.totalVehicles) * 100)
    : 0;
    
  const driverUtilization = fleetStats.totalDrivers > 0
    ? Math.round((fleetStats.onRouteDrivers / fleetStats.totalDrivers) * 100)
    : 0;

  return {
    pendingOrders: orderStats.pending + orderStats.assigned,
    scheduledToday: orderStats.inTransit,
    atRiskOrders: orderStats.urgent,
    fleetUtilization,
    driverUtilization,
    onTimeDeliveryRate: 94, // Mock
    averageLeadTime: 18, // Mock hours
    weeklyTrend: 5, // Mock %
  };
}

export const DEFAULT_KPIS: SchedulingKPIs = getSchedulingKPIs();

export const DEFAULT_SCHEDULING_CONFIG: SchedulingFeatureFlags = {
  enableHOSValidation: true,
  maxDrivingHours: 10,
  enableAutoSuggestion: true,
  enableRealtimeConflictCheck: true,
  conflictCheckIntervalMs: 5000,
  gpsIntegrationType: 'internal',
};

// GENERADORES DE DATOS

/**
 * Genera órdenes pendientes mock usando datos compartidos
 */
export function generateMockPendingOrders(count?: number): Order[] {
  const pendingOrders = SHARED_ORDERS.filter(
    o => o.status === 'pending' || o.status === 'assigned'
  );
  
  const ordersToReturn = count ? pendingOrders.slice(0, count) : pendingOrders;
  
  return ordersToReturn.map(order => mapSharedOrderToOrder(order)) as Order[];
}

/**
 * Genera TODAS las órdenes mock (todos los estados)
 */
export function generateMockAllOrders(): Order[] {
  return SHARED_ORDERS.map(order => mapSharedOrderToOrder(order)) as Order[];
}

/**
 * Mapea una SharedOrder a una Order completa
 */
function mapSharedOrderToOrder(order: (typeof SHARED_ORDERS)[number]): Order {
  const customer = findCustomerById(order.customerId);
  const vehicle = order.vehicleId ? findSharedVehicleById(order.vehicleId) : undefined;
  const driver = order.driverId ? findSharedDriverById(order.driverId) : undefined;
  const origin = findLocationById(order.originId);
  const destination = findLocationById(order.destinationId);
  
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    priority: order.priority,
    customerId: order.customerId,
    customer: customer ? {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      email: customer.email,
    } : undefined,
    vehicleId: order.vehicleId,
    vehicle: vehicle ? {
      id: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      type: vehicle.type,
    } : undefined,
    driverId: order.driverId,
    driver: driver ? {
      id: driver.id,
      fullName: driver.fullName,
      phone: driver.phone,
    } : undefined,
    cargo: {
      description: order.cargoDescription,
      type: order.cargoType,
      weightKg: order.weightKg,
      quantity: 1,
    },
    milestones: [
      {
        id: `ms-${order.id}-origin`,
        orderId: order.id,
        geofenceId: order.originId,
        geofenceName: order.originName,
        type: 'origin' as const,
        sequence: 1,
        address: origin?.address || '',
        coordinates: {
          lat: origin?.lat || -12.0464,
          lng: origin?.lng || -77.0428,
        },
        estimatedArrival: order.scheduledStartDate,
        status: 'pending' as const,
      },
      {
        id: `ms-${order.id}-dest`,
        orderId: order.id,
        geofenceId: order.destinationId,
        geofenceName: order.destinationName,
        type: 'destination' as const,
        sequence: 2,
        address: destination?.address || '',
        coordinates: {
          lat: destination?.lat || -12.0464,
          lng: destination?.lng || -77.0428,
        },
        estimatedArrival: order.scheduledEndDate,
        status: 'pending' as const,
      },
    ],
    completionPercentage: order.status === 'completed' ? 100 : order.status === 'in_transit' ? 50 : 0,
    createdAt: order.createdAt,
    createdBy: 'system',
    updatedAt: order.createdAt,
    scheduledStartDate: order.scheduledStartDate,
    scheduledEndDate: order.scheduledEndDate,
    statusHistory: [],
    syncStatus: 'not_sent' as const,
    serviceType: 'distribucion' as const,
    reference: order.reference,
    externalReference: order.externalReference,
  } as Order;
}

/**
 * Genera timelines de recursos con órdenes reales asignadas
 * @param scheduledOrders - Órdenes ya programadas para poblar los timelines
 */
export function generateMockTimelines(scheduledOrders: ScheduledOrder[] = []): ResourceTimeline[] {
  const vehicleTimelines: ResourceTimeline[] = SHARED_VEHICLES.slice(0, 4).map(vehicle => {
    const vehicleAssignments = scheduledOrders.filter(o => o.vehicleId === vehicle.id);
    const baseUtil = vehicle.operationalStatus === 'on-route' ? 40 : 0;
    const assignmentUtil = Math.min(60, vehicleAssignments.length * 20);
    return {
      resourceId: vehicle.id,
      type: 'vehicle' as const,
      name: `${vehicle.plate} - ${vehicle.brand}`,
      utilization: Math.min(100, baseUtil + assignmentUtil),
      assignments: vehicleAssignments,
      hasConflicts: vehicleAssignments.some(o => o.hasConflict),
    };
  });

  const driverTimelines: ResourceTimeline[] = SHARED_DRIVERS.slice(0, 4).map(driver => {
    const driverAssignments = scheduledOrders.filter(o => o.driverId === driver.id);
    const baseUtil = driver.availability === 'on-route' ? 40 : 0;
    const assignmentUtil = Math.min(60, driverAssignments.length * 20);
    return {
      resourceId: driver.id,
      type: 'driver' as const,
      name: driver.shortName,
      utilization: Math.min(100, baseUtil + assignmentUtil),
      assignments: driverAssignments,
      hasConflicts: driverAssignments.some(o => o.hasConflict),
    };
  });

  return [...vehicleTimelines, ...driverTimelines];
}

/**
 * Genera sugerencias de recursos evaluando compatibilidad real
 * Evalúa: disponibilidad, capacidad, HOS, tipo de carga
 * @param orderId - ID de la orden para evaluar compatibilidad
 * @param scheduledOrders - Órdenes ya programadas para verificar conflictos
 * @param targetDate - Fecha objetivo para verificar disponibilidad
 */
export function generateMockSuggestions(
  orderId: string,
  scheduledOrders: ScheduledOrder[] = [],
  targetDate?: Date
): ResourceSuggestion[] {
  // Buscar la orden para evaluar compatibilidad
  const order = SHARED_ORDERS.find(o => o.id === orderId);
  const orderWeight = order?.weightKg || 10000;
  const orderCargo = order?.cargoType || 'general';
  const dateStr = targetDate ? targetDate.toDateString() : new Date().toDateString();

  // Evaluar vehículos disponibles con scoring real
  const vehicleSuggestions: ResourceSuggestion[] = SHARED_VEHICLES
    .filter(v => v.operationalStatus !== 'maintenance')
    .map(vehicle => {
      let score = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];

      // Disponibilidad base (0-30)
      if (vehicle.operationalStatus === 'available') {
        score += 30;
        reasons.push('Vehículo disponible');
      } else {
        score += 10;
        warnings.push('Actualmente en ruta, verificar horario');
      }

      // Capacidad (0-30)
      if (vehicle.capacityKg >= orderWeight) {
        const capacityRatio = orderWeight / vehicle.capacityKg;
        // Ideal: usar 60-85% de capacidad
        if (capacityRatio >= 0.6 && capacityRatio <= 0.85) {
          score += 30;
          reasons.push(`Uso óptimo de capacidad (${Math.round(capacityRatio * 100)}%)`);
        } else if (capacityRatio < 0.6) {
          score += 20;
          reasons.push(`Capacidad suficiente (${Math.round(capacityRatio * 100)}% uso)`);
        } else {
          score += 25;
          reasons.push(`Capacidad ajustada (${Math.round(capacityRatio * 100)}% uso)`);
        }
      } else {
        score += 0;
        warnings.push(`Capacidad insuficiente: ${vehicle.capacityKg}kg < ${orderWeight}kg`);
      }

      // Tipo de carga compatible (0-20)
      const needsSpecial = ['refrigerated', 'hazardous', 'liquid'].includes(orderCargo);
      if (needsSpecial && vehicle.type === 'tractocamion') {
        score += 15;
        reasons.push('Tipo de vehículo compatible con carga especial');
      } else if (!needsSpecial) {
        score += 20;
        reasons.push('Carga general compatible');
      } else {
        score += 5;
        warnings.push('Verificar equipamiento para carga especial');
      }

      // Sin conflictos en la fecha (0-20)
      const hasConflict = scheduledOrders.some(
        o => o.vehicleId === vehicle.id &&
        new Date(o.scheduledDate).toDateString() === dateStr
      );
      if (!hasConflict) {
        score += 20;
      } else {
        warnings.push('Ya tiene asignación para esta fecha');
      }

      return {
        type: 'vehicle' as const,
        resourceId: vehicle.id,
        name: `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}`,
        score: Math.min(100, score),
        reason: reasons[0] || 'Disponible',
        reasons,
        warnings: warnings.length > 0 ? warnings : undefined,
        isAvailable: vehicle.operationalStatus === 'available' && !hasConflict,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Evaluar conductores con scoring real
  const HOS_MAX_WEEKLY = 60;
  const HOS_MAX_DAILY = 11;

  const driverSuggestions: ResourceSuggestion[] = SHARED_DRIVERS
    .filter(d => d.availability !== 'vacation')
    .map(driver => {
      let score = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];

      // Disponibilidad (0-25)
      if (driver.availability === 'available') {
        score += 25;
        reasons.push('Conductor disponible');
      } else if (driver.availability === 'on-route') {
        score += 10;
        warnings.push('Actualmente en ruta');
      } else {
        score += 0;
        warnings.push('Fuera de servicio');
      }

      // HOS compliance (0-35)
      const hoursRemaining = HOS_MAX_WEEKLY - driver.hoursThisWeek;
      const estimatedDuration = 4; // Default
      if (hoursRemaining >= estimatedDuration + 2) {
        score += 35;
        reasons.push(`HOS OK: ${hoursRemaining}h disponibles esta semana`);
      } else if (hoursRemaining >= estimatedDuration) {
        score += 20;
        warnings.push(`HOS ajustado: solo ${hoursRemaining}h disponibles`);
      } else {
        score += 0;
        warnings.push(`HOS insuficiente: ${hoursRemaining}h restantes vs ${estimatedDuration}h necesarias`);
      }

      // Licencia vigente (0-20)
      const licenseDate = new Date(driver.licenseExpiry);
      const now = new Date();
      if (licenseDate > now) {
        const monthsLeft = (licenseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsLeft > 3) {
          score += 20;
          reasons.push('Licencia vigente');
        } else {
          score += 10;
          warnings.push(`Licencia vence en ${Math.round(monthsLeft)} meses`);
        }
      } else {
        score += 0;
        warnings.push('Licencia vencida');
      }

      // Sin conflictos en la fecha (0-20)
      const hasConflict = scheduledOrders.some(
        o => o.driverId === driver.id &&
        new Date(o.scheduledDate).toDateString() === dateStr
      );
      if (!hasConflict) {
        score += 20;
      } else {
        warnings.push('Ya tiene asignación para esta fecha');
      }

      return {
        type: 'driver' as const,
        resourceId: driver.id,
        name: driver.fullName,
        score: Math.min(100, score),
        reason: reasons[0] || 'Disponible',
        reasons,
        warnings: warnings.length > 0 ? warnings : undefined,
        isAvailable: driver.availability === 'available' && !hasConflict && hoursRemaining >= estimatedDuration,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return [...vehicleSuggestions, ...driverSuggestions];
}

export function findVehicleById(id: string): MockVehicle | undefined {
  return MOCK_VEHICLES.find(v => v.id === id);
}

export function findDriverById(id: string): MockDriver | undefined {
  return MOCK_DRIVERS.find(d => d.id === id);
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG MOCK (Feature 9)
// ═══════════════════════════════════════════════════════════════

/**
 * Genera registros de auditoría mock
 */
export function generateMockAuditLogs(): ScheduleAuditLog[] {
  const now = new Date();
  return [
    {
      id: 'audit-001',
      scheduleId: 'sched-001',
      action: 'created',
      description: 'Orden ORD-2025-001 programada para el 10 de julio',
      changes: [
        { field: 'vehicleId', oldValue: '', newValue: 'VEH-001' },
        { field: 'driverId', oldValue: '', newValue: 'DRV-001' },
      ],
      performedBy: 'USR-001',
      performedByName: 'Carlos García',
      performedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-002',
      scheduleId: 'sched-002',
      action: 'reassigned',
      description: 'Conductor reasignado en orden ORD-2025-003',
      changes: [
        { field: 'driverId', oldValue: 'DRV-002', newValue: 'DRV-003' },
      ],
      performedBy: 'USR-002',
      performedByName: 'Ana Martínez',
      performedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-003',
      scheduleId: 'sched-001',
      action: 'conflict_detected',
      description: 'Conflicto de vehículo detectado: VEH-001 doble asignación',
      performedBy: 'SYSTEM',
      performedByName: 'Sistema',
      performedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-004',
      scheduleId: 'sched-003',
      action: 'unscheduled',
      description: 'Orden ORD-2025-005 desprogramada por mantenimiento de vehículo',
      changes: [
        { field: 'scheduleStatus', oldValue: 'scheduled', newValue: 'unscheduled' },
      ],
      performedBy: 'USR-001',
      performedByName: 'Carlos García',
      performedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-005',
      scheduleId: 'sched-004',
      action: 'updated',
      description: 'Fecha de programación actualizada en ORD-2025-002',
      changes: [
        { field: 'scheduledDate', oldValue: '2025-07-08', newValue: '2025-07-10' },
      ],
      performedBy: 'USR-002',
      performedByName: 'Ana Martínez',
      performedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit-006',
      scheduleId: 'sched-005',
      action: 'conflict_resolved',
      description: 'Conflicto de conductor resuelto: DRV-003 reasignado',
      performedBy: 'USR-001',
      performedByName: 'Carlos García',
      performedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// BLOCKED DAYS MOCK (Feature 10)
// ═══════════════════════════════════════════════════════════════

/**
 * Genera días bloqueados mock
 */
export function generateMockBlockedDays(): BlockedDay[] {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const inTwoWeeks = new Date(today);
  inTwoWeeks.setDate(today.getDate() + 14);

  return [
    {
      id: 'block-001',
      date: nextWeek.toISOString().split('T')[0],
      reason: 'Feriado nacional - Fiestas Patrias',
      blockType: 'holiday',
      appliesToAll: true,
      createdBy: 'Carlos García',
      createdAt: today.toISOString(),
    },
    {
      id: 'block-002',
      date: inTwoWeeks.toISOString().split('T')[0],
      reason: 'Mantenimiento programado de flota',
      blockType: 'full_day',
      appliesToAll: false,
      resourceIds: [SHARED_VEHICLES[0].id, SHARED_VEHICLES[1].id],
      createdBy: 'Ana Martínez',
      createdAt: today.toISOString(),
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS MOCK (Feature 6)
// ═══════════════════════════════════════════════════════════════

/**
 * Genera notificaciones mock iniciales
 */
export function generateMockNotifications(): SchedulingNotification[] {
  const now = new Date();
  return [
    {
      id: 'notif-001',
      type: 'conflict',
      severity: 'warning',
      title: 'Conflicto de vehículo',
      message: 'El vehículo ABC-123 tiene 2 asignaciones simultáneas para el 10 de julio.',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      isRead: false,
      relatedOrderId: 'ORD-001',
      actionLabel: 'Ver conflicto',
    },
    {
      id: 'notif-002',
      type: 'hos_warning',
      severity: 'error',
      title: 'HOS - Límite próximo',
      message: 'El conductor Juan Pérez alcanzará el límite semanal de horas en 2h.',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      actionLabel: 'Revisar',
    },
    {
      id: 'notif-003',
      type: 'assignment',
      severity: 'success',
      title: 'Asignación completada',
      message: 'Orden ORD-2025-004 asignada exitosamente a VEH-003 / DRV-002.',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      isRead: true,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// GANTT DATA MOCK (Feature 8)
// ═══════════════════════════════════════════════════════════════

/**
 * Genera datos para la vista Gantt multi-día con órdenes reales
 * @param startDate - Fecha de inicio del rango
 * @param days - Número de días a mostrar  
 * @param scheduledOrders - Órdenes programadas para poblar el Gantt
 * @param blockedDays - Días bloqueados del sistema
 */
export function generateMockGanttData(
  startDate: Date,
  days: number = 7,
  scheduledOrders: ScheduledOrder[] = [],
  blockedDays: BlockedDay[] = []
): GanttResourceRow[] {
  const rows: GanttResourceRow[] = [];
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Vehículos
  SHARED_VEHICLES.slice(0, 4).forEach(vehicle => {
    const dailyAssignments = [];
    for (let d = 0; d < days; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      // Órdenes del vehículo para este día
      const dayOrders = scheduledOrders.filter(o => {
        if (o.vehicleId !== vehicle.id) return false;
        const orderDate = o.scheduledDate instanceof Date ? o.scheduledDate : new Date(o.scheduledDate);
        return isSameDay(orderDate, date);
      });

      // Calcular utilización real basada en horas asignadas
      const totalHours = dayOrders.reduce((sum, o) => sum + (o.estimatedDuration || 4), 0);
      const utilization = isWeekend && dayOrders.length === 0 ? 0 : Math.min(100, Math.round((totalHours / 10) * 100));

      // Verificar si el día está bloqueado para este recurso
      const dateStr = date.toISOString().split('T')[0];
      const isBlocked = blockedDays.some(b =>
        b.date === dateStr && (b.appliesToAll || b.resourceIds?.includes(vehicle.id))
      );

      dailyAssignments.push({
        date,
        orders: dayOrders,
        utilization,
        isBlocked,
      });
    }
    rows.push({
      resourceId: vehicle.id,
      type: 'vehicle' as const,
      name: `${vehicle.plate} - ${vehicle.brand}`,
      code: vehicle.plate,
      dailyAssignments,
    });
  });

  // Conductores
  SHARED_DRIVERS.slice(0, 4).forEach(driver => {
    const dailyAssignments = [];
    for (let d = 0; d < days; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      const dayOrders = scheduledOrders.filter(o => {
        if (o.driverId !== driver.id) return false;
        const orderDate = o.scheduledDate instanceof Date ? o.scheduledDate : new Date(o.scheduledDate);
        return isSameDay(orderDate, date);
      });

      const totalHours = dayOrders.reduce((sum, o) => sum + (o.estimatedDuration || 4), 0);
      const utilization = isWeekend && dayOrders.length === 0 ? 0 : Math.min(100, Math.round((totalHours / 11) * 100));

      const dateStr = date.toISOString().split('T')[0];
      const isBlocked = blockedDays.some(b =>
        b.date === dateStr && (b.appliesToAll || b.resourceIds?.includes(driver.id))
      );

      dailyAssignments.push({
        date,
        orders: dayOrders,
        utilization,
        isBlocked,
      });
    }
    rows.push({
      resourceId: driver.id,
      type: 'driver' as const,
      name: driver.shortName,
      code: driver.id,
      dailyAssignments,
    });
  });

  return rows;
}

/* ═══════════════════════════════════════════════════════════════
   AUTO-SCHEDULING: Algoritmo real con scoring
   Evalúa: capacidad, HOS, disponibilidad, prioridad, proximidad
   ═══════════════════════════════════════════════════════════════ */

/** FMCSA HOS limits (usados como referencia) */
const HOS_LIMITS = {
  maxDrivingHoursPerDay: 11,
  maxDutyHoursPerDay: 14,
  requiredBreakAfterHours: 8,
  breakDurationMinutes: 30,
  maxWeeklyHours7Day: 60,
  maxWeeklyHours8Day: 70,
  restartHours: 34,
};

export interface AutoScheduleAssignment {
  orderId: string;
  orderNumber: string;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  scheduledDate: Date;
  estimatedDuration: number;
  score: number;
}

export interface AutoScheduleResult {
  assigned: number;
  failed: number;
  errors: string[];
  assignments: AutoScheduleAssignment[];
}

/**
 * Estima duración del viaje basándose en distancia Haversine entre origen y destino
 */
function estimateTripDuration(order: Order): number {
  const origin = order.milestones?.find(m => m.type === 'origin');
  const dest = order.milestones?.find(m => m.type === 'destination');
  if (!origin?.coordinates || !dest?.coordinates) return 4; // fallback 4h

  // Haversine
  const R = 6371;
  const dLat = ((dest.coordinates.lat - origin.coordinates.lat) * Math.PI) / 180;
  const dLng = ((dest.coordinates.lng - origin.coordinates.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((origin.coordinates.lat * Math.PI) / 180) *
    Math.cos((dest.coordinates.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Velocidad promedio: 55 km/h (carreteras peruanas) + 1h carga/descarga
  const drivingHours = km / 55;
  const loadUnloadHours = 1;
  return Math.max(2, Math.round((drivingHours + loadUnloadHours) * 10) / 10);
}

/**
 * Ejecuta auto-programación con algoritmo de scoring real
 * Estrategia: greedy por prioridad → mejor match de recursos
 */
export function mockAutoSchedule(
  pendingOrders: Order[],
  vehicles: MockVehicle[],
  drivers: MockDriver[],
  existingScheduled: ScheduledOrder[] = []
): AutoScheduleResult {
  const result: AutoScheduleResult = {
    assigned: 0,
    failed: 0,
    errors: [],
    assignments: [],
  };

  if (pendingOrders.length === 0) return result;

  // Ordenar por prioridad (urgent > high > normal > low)
  const priorityWeight: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
  const sortedOrders = [...pendingOrders].sort(
    (a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0)
  );

  // Track de recursos ya usados en esta sesión de auto-schedule
  const usedVehicles = new Map<string, number>(); // vehicleId → total hours on target date
  const usedDrivers = new Map<string, number>();   // driverId → total hours on target date

  // Pre-cargar horas ya asignadas del día objetivo
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 1); // Programar para mañana
  const targetDateStr = targetDate.toDateString();

  for (const so of existingScheduled) {
    const soDate = so.scheduledDate instanceof Date ? so.scheduledDate : new Date(so.scheduledDate);
    if (soDate.toDateString() === targetDateStr) {
      if (so.vehicleId) {
        usedVehicles.set(so.vehicleId, (usedVehicles.get(so.vehicleId) || 0) + (so.estimatedDuration || 4));
      }
      if (so.driverId) {
        usedDrivers.set(so.driverId, (usedDrivers.get(so.driverId) || 0) + (so.estimatedDuration || 4));
      }
    }
  }

  for (const order of sortedOrders) {
    const duration = estimateTripDuration(order);
    const orderWeight = order.cargo?.weightKg || 10000;

    // Evaluar cada vehículo disponible
    let bestVehicle: MockVehicle | null = null;
    let bestVehicleScore = -1;

    for (const vehicle of vehicles) {
      if (vehicle.status === 'maintenance') continue;
      if (vehicle.capacityKg < orderWeight) continue;

      const hoursUsed = usedVehicles.get(vehicle.id) || 0;
      if (hoursUsed + duration > HOS_LIMITS.maxDutyHoursPerDay) continue;

      let score = 0;
      // Disponibilidad (0-30)
      score += vehicle.status === 'available' ? 30 : 10;
      // Capacidad match (0-30) — penalizar exceso innecesario
      const ratio = orderWeight / vehicle.capacityKg;
      score += ratio >= 0.5 && ratio <= 0.9 ? 30 : ratio < 0.5 ? 15 : 25;
      // Menor carga horaria existente es mejor (0-20)
      score += Math.max(0, 20 - hoursUsed * 2);
      // Tipo compatible (0-20)
      const needsHeavy = orderWeight > 15000;
      if (needsHeavy && (vehicle.type === 'tractocamion')) score += 20;
      else if (!needsHeavy) score += 20;
      else score += 5;

      if (score > bestVehicleScore) {
        bestVehicleScore = score;
        bestVehicle = vehicle;
      }
    }

    if (!bestVehicle) {
      result.failed++;
      result.errors.push(`${order.orderNumber}: No hay vehículo con capacidad suficiente (${orderWeight}kg) y disponibilidad`);
      continue;
    }

    // Evaluar cada conductor disponible
    let bestDriver: MockDriver | null = null;
    let bestDriverScore = -1;

    for (const driver of drivers) {
      if (driver.status === 'off_duty') continue;

      // HOS check: horas semanales + duración estimada
      const weeklyRemaining = HOS_LIMITS.maxWeeklyHours7Day - driver.hoursThisWeek;
      if (weeklyRemaining < duration) continue;

      const dailyUsed = usedDrivers.get(driver.id) || 0;
      if (dailyUsed + duration > HOS_LIMITS.maxDrivingHoursPerDay) continue;

      // Licencia vigente
      const licenseOk = new Date(driver.licenseExpiry) > new Date();
      if (!licenseOk) continue;

      let score = 0;
      // Disponibilidad (0-25)
      score += driver.status === 'available' ? 25 : 10;
      // HOS holgura (0-35)
      score += Math.min(35, Math.round((weeklyRemaining / HOS_LIMITS.maxWeeklyHours7Day) * 35));
      // Menor carga diaria (0-20)
      score += Math.max(0, 20 - dailyUsed * 3);
      // Licencia con margen (0-20)
      const monthsToExpiry = (new Date(driver.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
      score += monthsToExpiry > 6 ? 20 : monthsToExpiry > 2 ? 10 : 5;

      if (score > bestDriverScore) {
        bestDriverScore = score;
        bestDriver = driver;
      }
    }

    if (!bestDriver) {
      result.failed++;
      result.errors.push(`${order.orderNumber}: No hay conductor con HOS suficiente (${duration}h necesarias)`);
      continue;
    }

    // Asignar
    const assignment: AutoScheduleAssignment = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      vehicleId: bestVehicle.id,
      vehiclePlate: bestVehicle.plateNumber,
      driverId: bestDriver.id,
      driverName: bestDriver.fullName,
      scheduledDate: targetDate,
      estimatedDuration: duration,
      score: Math.round((bestVehicleScore + bestDriverScore) / 2),
    };

    result.assignments.push(assignment);
    result.assigned++;

    // Registrar uso de recursos para esta sesión
    usedVehicles.set(bestVehicle.id, (usedVehicles.get(bestVehicle.id) || 0) + duration);
    usedDrivers.set(bestDriver.id, (usedDrivers.get(bestDriver.id) || 0) + duration);
  }

  return result;
}
