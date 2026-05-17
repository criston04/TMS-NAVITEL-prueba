/* ============================================
   SERVICE: TMS Module Integration Hub
   
   Centraliza las reacciones cross-module:
   - Route Planner confirma → genera Orders
   - Order completada → genera costos + factura + notificación
   - Maintenance inicia → vehículo no disponible
   - Maintenance completa → vehículo disponible
   - Scheduling asigna → persiste en Orders
   - Geofence entry/exit → actualiza milestones
   ============================================ */

import {
  tmsEventBus,
  type AllRoutesConfirmedPayload,
  type OrderCompletedPayload,
  type OrderStatusChangedPayload,
  type OrderClosedPayload,
  type MaintenanceStatusPayload,
  type SchedulingAssignedPayload,
  type GeofenceEventPayload,
  type RouteConfirmedPayload,
} from './event-bus.service';
import { getStoredUser } from '@/lib/auth-storage';

/**
 * 2026-05-14 SECURITY FIX: las claves de localStorage estaban globales y causaban
 * fuga de datos entre usuarios distintos del mismo navegador (e.g. órdenes
 * auto-generadas del usuario A aparecían para el usuario B). Ahora se scopean
 * por userId. Si no hay usuario logueado, NO se lee ni escribe nada.
 *
 * Claves antes (sin scope):  tms-generated-orders, tms-auto-costs, tms-auto-invoices,
 *                            tms-scheduling-assignments, tms-vehicle-status-updates,
 *                            tms-milestone-updates
 * Claves ahora (scoped):     tms-<name>-<userId>
 *
 * `clearAuthSession()` también barre estas keys en logout (defensa en profundidad).
 */
function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  const user = getStoredUser<{ id?: string }>();
  return user?.id ?? null;
}

function scopedKey(name: string): string | null {
  const uid = getCurrentUserId();
  if (!uid) return null;
  return `tms-${name}-${uid}`;
}

/** Lee un array JSON del localStorage scoped. Devuelve [] si no hay user o no hay datos. */
function readScopedArray<T>(name: string): T[] {
  if (typeof window === 'undefined') return [];
  const key = scopedKey(name);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Escribe un array JSON al localStorage scoped. No hace nada si no hay user. */
function writeScopedArray<T>(name: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  const key = scopedKey(name);
  if (!key) {
    console.warn(`[TMSIntegrationHub] No userId — skip persisting ${name}`);
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[TMSIntegrationHub] Error persisting ${name}:`, e);
  }
}

/**
 * Hub de integración que conecta todos los módulos del TMS.
 * Se inicializa una vez y escucha eventos del EventBus para
 * disparar las acciones cross-module correspondientes.
 */
class TMSIntegrationHub {
  private initialized = false;
  private unsubscribers: (() => void)[] = [];

  /**
   * Inicializar todas las suscripciones cross-module.
   * Debe llamarse una vez al arrancar la aplicación.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    console.log('[TMSIntegrationHub] Initializing cross-module connections...');

    // ============================================
    // ROUTE PLANNER → ORDERS
    // Cuando se confirman todas las rutas, generar órdenes
    // ============================================
    this.unsubscribers.push(
      tmsEventBus.subscribe<AllRoutesConfirmedPayload>(
        'route:all_confirmed',
        async (event) => {
          try {
            await this.handleRoutesConfirmed(event.payload);
          } catch (error) {
            console.error('[TMSIntegrationHub] Error handling routes confirmed:', error);
          }
        }
      )
    );

    // ============================================
    // ORDER COMPLETED → FINANCE + NOTIFICATIONS
    // Cuando una orden se completa, generar costos y notificar
    // ============================================
    this.unsubscribers.push(
      tmsEventBus.subscribe<OrderCompletedPayload>(
        'order:completed',
        async (event) => {
          try {
            await this.handleOrderCompleted(event.payload);
          } catch (error) {
            console.error('[TMSIntegrationHub] Error handling order completed:', error);
          }
        }
      )
    );

    // ============================================
    // ORDER CLOSED → FINANCE INVOICE
    // Cuando una orden se cierra, pre-generar factura
    // ============================================
    this.unsubscribers.push(
      tmsEventBus.subscribe<OrderClosedPayload>(
        'order:closed',
        async (event) => {
          try {
            await this.handleOrderClosed(event.payload);
          } catch (error) {
            console.error('[TMSIntegrationHub] Error handling order closed:', error);
          }
        }
      )
    );

    // ============================================
    // ORDER STATUS CHANGED → NOTIFICATIONS
    // Notificar en cada cambio de estado relevante
    // ============================================
    this.unsubscribers.push(
      tmsEventBus.subscribe<OrderStatusChangedPayload>(
        'order:status_changed',
        async (event) => {
          try {
            await this.handleOrderStatusChanged(event.payload);
          } catch (error) {
            console.error('[TMSIntegrationHub] Error handling status change:', error);
          }
        }
      )
    );

    // ============================================
    // MAINTENANCE → VEHICLE STATUS
    // Cambiar disponibilidad del vehículo
    // ============================================
    this.unsubscribers.push(
      tmsEventBus.subscribe<MaintenanceStatusPayload>(
        'maintenance:started',
        async (event) => {
          try {
            await this.handleMaintenanceStarted(event.payload);
          } catch (error) {
            console.error('[TMSIntegrationHub] Error handling maintenance started:', error);
          }
        }
      )
    );

    this.unsubscribers.push(
      tmsEventBus.subscribe<MaintenanceStatusPayload>(
        'maintenance:completed',
        async (event) => {
          try {
            await this.handleMaintenanceCompleted(event.payload);
          } catch (error) {
            console.error('[TMSIntegrationHub] Error handling maintenance completed:', error);
          }
        }
      )
    );

    // ============================================
    // SCHEDULING → ORDERS
    // Persistir asignación en el módulo de órdenes
    // ============================================
    this.unsubscribers.push(
      tmsEventBus.subscribe<SchedulingAssignedPayload>(
        'scheduling:assigned',
        async (event) => {
          try {
            await this.handleSchedulingAssigned(event.payload);
          } catch (error) {
            console.error('[TMSIntegrationHub] Error handling scheduling assigned:', error);
          }
        }
      )
    );

    // ============================================
    // MONITORING GEOFENCE → ORDER MILESTONES
    // Actualizar hitos cuando el vehículo entra/sale de geocerca
    // ============================================
    this.unsubscribers.push(
      tmsEventBus.subscribe<GeofenceEventPayload>(
        'monitoring:geofence_entry',
        async (event) => {
          try {
            await this.handleGeofenceEntry(event.payload);
          } catch (error) {
            console.error('[TMSIntegrationHub] Error handling geofence entry:', error);
          }
        }
      )
    );

    this.unsubscribers.push(
      tmsEventBus.subscribe<GeofenceEventPayload>(
        'monitoring:geofence_exit',
        async (event) => {
          try {
            await this.handleGeofenceExit(event.payload);
          } catch (error) {
            console.error('[TMSIntegrationHub] Error handling geofence exit:', error);
          }
        }
      )
    );

    console.log('[TMSIntegrationHub] All cross-module connections established.');
  }

  /**
   * Cleanup all subscriptions
   */
  destroy(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.initialized = false;
  }

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Route Planner → Orders:
   * Convierte rutas confirmadas en órdenes de transporte
   */
  private async handleRoutesConfirmed(payload: AllRoutesConfirmedPayload): Promise<void> {
    const generatedOrders: Array<Record<string, unknown>> = [];

    for (const route of payload.routes) {
      // Crear una orden por cada ruta confirmada
      const order = {
        id: `ord-rp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        orderNumber: `OT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
        customerId: 'route-planner',
        customer: { id: 'route-planner', name: 'Planificador de Rutas', code: 'RP', email: '' },
        vehicleId: route.vehicleId || undefined,
        vehicle: route.vehiclePlate ? {
          id: route.vehicleId || '',
          plate: route.vehiclePlate,
          brand: '',
          model: '',
          type: 'truck' as const,
        } : undefined,
        driverId: route.driverId || undefined,
        driver: route.driverName ? {
          id: route.driverId || '',
          fullName: route.driverName,
          phone: '',
        } : undefined,
        status: 'assigned' as const,
        priority: 'normal' as const,
        syncStatus: 'not_sent' as const,
        serviceType: 'distribucion' as const,
        cargo: {
          description: `Carga consolidada - ${route.routeName}`,
          type: 'general' as const,
          weightKg: route.metrics.totalWeight,
          volumeM3: route.metrics.totalVolume,
          quantity: route.stops.filter(s => s.type === 'delivery').length,
        },
        milestones: route.stops.map((stop, idx) => ({
          id: `ms-${Date.now()}-${idx}`,
          orderId: '',
          geofenceId: `gf-${stop.orderId}`,
          geofenceName: stop.address,
          type: idx === 0 ? 'origin' as const : idx === route.stops.length - 1 ? 'destination' as const : 'waypoint' as const,
          sequence: idx + 1,
          address: `${stop.address}, ${stop.city}`,
          coordinates: { lat: stop.coordinates[0], lng: stop.coordinates[1] },
          estimatedArrival: new Date().toISOString(),
          status: 'pending' as const,
        })),
        completionPercentage: 0,
        createdAt: new Date().toISOString(),
        createdBy: 'route-planner',
        updatedAt: new Date().toISOString(),
        scheduledStartDate: new Date().toISOString(),
        scheduledEndDate: new Date(Date.now() + route.metrics.estimatedDuration * 60000).toISOString(),
        statusHistory: [{
          id: `sh-${Date.now()}`,
          fromStatus: 'draft',
          toStatus: 'assigned',
          changedAt: new Date().toISOString(),
          changedBy: 'system',
          changedByName: 'Route Planner',
          reason: `Generado automáticamente desde ${route.routeName}`,
        }],
        reference: route.routeId,
        notes: `Orden generada desde planificador de rutas. ${route.routeName}: ${route.stops.length} paradas, ${route.metrics.totalDistance}km estimados.`,
        tags: ['route-planner', 'auto-generated'],
        metadata: {
          sourceRouteId: route.routeId,
          sourcePlannerSession: payload.plannerSessionId,
          estimatedDistance: route.metrics.totalDistance,
          estimatedDuration: route.metrics.estimatedDuration,
          estimatedCost: route.metrics.estimatedCost,
        },
      };

      // Set orderId in milestones
      order.milestones.forEach((ms) => { ms.orderId = order.id; });

      generatedOrders.push(order);
    }

    // Persistir en localStorage scoped por user, para que OrderService las recupere
    const existingGenerated = readScopedArray<Record<string, unknown>>('generated-orders');
    writeScopedArray('generated-orders', [...existingGenerated, ...generatedOrders]);

    console.log(
      `[TMSIntegrationHub] Route Planner → Orders: ${generatedOrders.length} órdenes generadas`
    );

    // Emit individual order created events
    for (const order of generatedOrders) {
      tmsEventBus.publish('order:created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        serviceType: order.serviceType,
      }, 'integration-hub');
    }
  }

  /**
   * Order Completed → Finance + Notifications:
   * Auto-genera costos de transporte y notifica
   */
  private async handleOrderCompleted(payload: OrderCompletedPayload): Promise<void> {
    // 1. Auto-generar costo de transporte
    const transportCost = {
      id: `cost-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
      vehicleId: payload.vehicleId,
      type: 'fuel' as const,
      category: 'Combustible estimado',
      amount: payload.totalDistance ? (payload.totalDistance / 10) * 4.5 : 50, // ~$4.50/galón, 10km/galón
      currency: 'PEN',
      date: new Date().toISOString(),
      status: 'pending' as const,
      description: `Costo auto-generado al completar orden ${payload.orderNumber}`,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
    };

    // Persistir costo en localStorage scoped por user
    const existingCosts = readScopedArray<typeof transportCost>('auto-costs');
    writeScopedArray('auto-costs', [...existingCosts, transportCost]);

    tmsEventBus.publish('finance:cost_recorded', {
      costId: transportCost.id,
      orderId: payload.orderId,
      vehicleId: payload.vehicleId,
      type: 'fuel',
      amount: transportCost.amount,
      currency: 'PEN',
    }, 'integration-hub');

    // 2. Notificación de orden completada
    // Import dinámico para evitar circular dependencies
    try {
      const { notificationService } = await import('@/services/notification.service');
      await notificationService.notifyOrderCompleted(
        payload.orderId,
        payload.orderNumber
      );
    } catch (error) {
      console.error('[TMSIntegrationHub] Error sending completion notification:', error);
    }

    console.log(
      `[TMSIntegrationHub] Order Completed: costo auto-generado ($${transportCost.amount}) + notificación para ${payload.orderNumber}`
    );
  }

  /**
   * Order Closed → Finance Invoice:
   * Pre-genera factura borrador vinculada al cliente
   */
  private async handleOrderClosed(payload: OrderClosedPayload): Promise<void> {
    // Recuperar costos acumulados para esta orden (solo del usuario actual)
    const allCosts = readScopedArray<{ orderId?: string; amount: number }>('auto-costs');
    const orderCosts: Array<{ amount: number }> = allCosts.filter(
      (c) => c.orderId === payload.orderId,
    );

    const totalCosts = orderCosts.reduce((sum, c) => sum + c.amount, 0);

    // Pre-generar factura borrador
    const draftInvoice = {
      id: `inv-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      invoiceNumber: `FAC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
      customerId: payload.customerId,
      customerName: `Cliente ${payload.customerId}`,
      orderIds: [payload.orderId],
      status: 'draft' as const,
      type: 'freight' as const,
      subtotal: totalCosts > 0 ? totalCosts * 1.3 : 100, // markup ~30%
      taxRate: 18, // IGV
      taxAmount: 0,
      totalAmount: 0,
      amountDue: 0,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
      lineItems: [{
        id: `li-${Date.now()}`,
        description: `Servicio de transporte - Orden ${payload.orderNumber}`,
        quantity: 1,
        unitPrice: totalCosts > 0 ? totalCosts * 1.3 : 100,
        amount: totalCosts > 0 ? totalCosts * 1.3 : 100,
      }],
      notes: `Factura auto-generada al cerrar orden ${payload.orderNumber}`,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
    };

    // Calcular impuestos
    draftInvoice.taxAmount = Math.round(draftInvoice.subtotal * draftInvoice.taxRate / 100 * 100) / 100;
    draftInvoice.totalAmount = Math.round((draftInvoice.subtotal + draftInvoice.taxAmount) * 100) / 100;
    draftInvoice.amountDue = draftInvoice.totalAmount;

    // Persistir en localStorage scoped por user
    const existingInvoices = readScopedArray<typeof draftInvoice>('auto-invoices');
    writeScopedArray('auto-invoices', [...existingInvoices, draftInvoice]);

    tmsEventBus.publish('finance:invoice_created', {
      invoiceId: draftInvoice.id,
      invoiceNumber: draftInvoice.invoiceNumber,
      customerId: payload.customerId,
      orderIds: [payload.orderId],
      totalAmount: draftInvoice.totalAmount,
    }, 'integration-hub');

    console.log(
      `[TMSIntegrationHub] Order Closed → Invoice draft: ${draftInvoice.invoiceNumber} (${draftInvoice.totalAmount} PEN)`
    );
  }

  /**
   * Order Status Changed → Notifications
   */
  private async handleOrderStatusChanged(payload: OrderStatusChangedPayload): Promise<void> {
    // Solo notificar transiciones importantes
    const importantTransitions = ['in_transit', 'delayed', 'cancelled', 'completed'];
    if (!importantTransitions.includes(payload.newStatus)) return;

    try {
      const { notificationService } = await import('@/services/notification.service');
      
      const statusLabels: Record<string, string> = {
        in_transit: 'en tránsito',
        delayed: 'retrasada',
        cancelled: 'cancelada',
        completed: 'completada',
      };

      await notificationService.createNotification({
        title: `Orden ${statusLabels[payload.newStatus] || payload.newStatus}`,
        message: `La orden ${payload.orderNumber} cambió de ${payload.previousStatus} a ${payload.newStatus}.`,
        category: 'order',
        priority: payload.newStatus === 'delayed' ? 'high' : payload.newStatus === 'cancelled' ? 'urgent' : 'medium',
        channel: 'in_app',
        relatedEntity: {
          type: 'order',
          id: payload.orderId,
          name: payload.orderNumber,
        },
        actionUrl: `/orders/${payload.orderId}`,
        actionLabel: 'Ver orden',
      });
    } catch (error) {
      console.error('[TMSIntegrationHub] Error sending status notification:', error);
    }
  }

  /**
   * Maintenance Started → Vehicle status = maintenance
   */
  private async handleMaintenanceStarted(payload: MaintenanceStatusPayload): Promise<void> {
    // Actualizar estado del vehículo en localStorage
    this.updateVehicleStatus(payload.vehicleId, 'maintenance', payload.estimatedCompletion);

    try {
      const { notificationService } = await import('@/services/notification.service');
      await notificationService.notifyMaintenanceDue(
        payload.vehicleId,
        payload.vehiclePlate,
        payload.maintenanceType,
        payload.estimatedCompletion || new Date().toISOString()
      );
    } catch (error) {
      console.error('[TMSIntegrationHub] Error in maintenance notification:', error);
    }

    console.log(
      `[TMSIntegrationHub] Maintenance Started: ${payload.vehiclePlate} → status=maintenance`
    );
  }

  /**
   * Maintenance Completed → Vehicle status = available
   */
  private async handleMaintenanceCompleted(payload: MaintenanceStatusPayload): Promise<void> {
    this.updateVehicleStatus(payload.vehicleId, 'active');

    console.log(
      `[TMSIntegrationHub] Maintenance Completed: ${payload.vehiclePlate} → status=active`
    );
  }

  /**
   * Scheduling Assignment → Orders persistence
   */
  private async handleSchedulingAssigned(payload: SchedulingAssignedPayload): Promise<void> {
    // Persistir la asignación en localStorage scoped por user, para que OrderService la vea
    interface SchedulingAssignment {
      orderId: string;
      orderNumber: string;
      vehicleId: string;
      vehiclePlate: string;
      driverId: string;
      driverName: string;
      scheduledDate: string;
      assignedAt: string;
    }
    const assignments = readScopedArray<SchedulingAssignment>('scheduling-assignments');
    writeScopedArray<SchedulingAssignment>('scheduling-assignments', [
      ...assignments,
      {
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        vehicleId: payload.vehicleId,
        vehiclePlate: payload.vehiclePlate,
        driverId: payload.driverId,
        driverName: payload.driverName,
        scheduledDate: payload.scheduledDate,
        assignedAt: new Date().toISOString(),
      },
    ]);

    console.log(
      `[TMSIntegrationHub] Scheduling → Orders: ${payload.orderNumber} asignada a ${payload.vehiclePlate}/${payload.driverName}`
    );
  }

  /**
   * Geofence Entry → Milestone update (arrived/in_progress)
   */
  private async handleGeofenceEntry(payload: GeofenceEventPayload): Promise<void> {
    if (!payload.orderId || !payload.milestoneId) return;

    this.updateMilestoneStatus(
      payload.orderId,
      payload.milestoneId,
      'arrived',
      payload.timestamp
    );

    console.log(
      `[TMSIntegrationHub] Geofence Entry → Milestone ${payload.milestoneId} arrived at ${payload.geofenceName}`
    );
  }

  /**
   * Geofence Exit → Milestone update (completed)
   */
  private async handleGeofenceExit(payload: GeofenceEventPayload): Promise<void> {
    if (!payload.orderId || !payload.milestoneId) return;

    this.updateMilestoneStatus(
      payload.orderId,
      payload.milestoneId,
      'completed',
      undefined,
      payload.timestamp
    );

    console.log(
      `[TMSIntegrationHub] Geofence Exit → Milestone ${payload.milestoneId} completed at ${payload.geofenceName}`
    );
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Actualiza el estado de un vehículo en el almacenamiento compartido
   */
  private updateVehicleStatus(
    vehicleId: string,
    status: string,
    availableFrom?: string
  ): void {
    if (typeof window === 'undefined') return;

    interface VehicleStatusUpdate {
      vehicleId: string;
      status: string;
      availableFrom?: string;
      updatedAt: string;
    }
    const updates = readScopedArray<VehicleStatusUpdate>('vehicle-status-updates');
    // Reemplazar si ya existe para este vehículo
    const filtered = updates.filter((u) => u.vehicleId !== vehicleId);
    filtered.push({
      vehicleId,
      status,
      availableFrom,
      updatedAt: new Date().toISOString(),
    });
    writeScopedArray<VehicleStatusUpdate>('vehicle-status-updates', filtered);
  }

  /**
   * Actualiza el estado de un milestone en el almacenamiento compartido
   */
  private updateMilestoneStatus(
    orderId: string,
    milestoneId: string,
    status: string,
    actualEntry?: string,
    actualExit?: string
  ): void {
    if (typeof window === 'undefined') return;

    interface MilestoneUpdate {
      orderId: string;
      milestoneId: string;
      status: string;
      actualEntry?: string;
      actualExit?: string;
      updatedAt: string;
    }
    const updates = readScopedArray<MilestoneUpdate>('milestone-updates');
    writeScopedArray<MilestoneUpdate>('milestone-updates', [
      ...updates,
      {
        orderId,
        milestoneId,
        status,
        actualEntry,
        actualExit,
        updatedAt: new Date().toISOString(),
      },
    ]);
  }
}

// Singleton export
export const tmsIntegrationHub = new TMSIntegrationHub();
export { TMSIntegrationHub };
