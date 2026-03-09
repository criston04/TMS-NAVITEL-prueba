/* ============================================
   SERVICE: TMS Event Bus
   Patrón Mediator/EventBus para comunicación
   cross-module en el TMS.
   
   Todos los módulos publican eventos aquí y
   los módulos interesados se suscriben.
   ============================================ */

export type TMSEventType =
  // Orders lifecycle
  | 'order:created'
  | 'order:status_changed'
  | 'order:assigned'
  | 'order:completed'
  | 'order:closed'
  | 'order:cancelled'
  // Route Planner
  | 'route:confirmed'
  | 'route:dispatched'
  | 'route:all_confirmed'
  // Scheduling
  | 'scheduling:assigned'
  | 'scheduling:dispatched'
  // Monitoring
  | 'monitoring:geofence_entry'
  | 'monitoring:geofence_exit'
  | 'monitoring:delivery_completed'
  | 'monitoring:vehicle_arrived'
  // Maintenance
  | 'maintenance:started'
  | 'maintenance:completed'
  | 'maintenance:scheduled'
  // Finance
  | 'finance:cost_recorded'
  | 'finance:invoice_created'
  | 'finance:invoice_paid'
  // Notifications
  | 'notification:created';

export interface TMSEvent<T = unknown> {
  type: TMSEventType;
  payload: T;
  timestamp: string;
  source: string; // module name
}

// Payload types for each event
export interface OrderCreatedPayload {
  orderId: string;
  orderNumber: string;
  customerId: string;
  serviceType: string;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  orderNumber: string;
  previousStatus: string;
  newStatus: string;
  vehicleId?: string;
  driverId?: string;
  customerId?: string;
}

export interface OrderCompletedPayload {
  orderId: string;
  orderNumber: string;
  customerId: string;
  vehicleId?: string;
  driverId?: string;
  totalDistance?: number;
  totalDuration?: number; // minutes
  cargo?: {
    weightKg: number;
    volumeM3?: number;
    type: string;
  };
}

export interface OrderClosedPayload {
  orderId: string;
  orderNumber: string;
  customerId: string;
  vehicleId?: string;
  driverId?: string;
  closedBy: string;
}

export interface RouteConfirmedPayload {
  routeId: string;
  routeName: string;
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  stops: Array<{
    orderId: string;
    type: 'pickup' | 'delivery';
    address: string;
    city: string;
    coordinates: [number, number];
  }>;
  metrics: {
    totalDistance: number;
    estimatedDuration: number;
    estimatedCost: number;
    fuelCost: number;
    tollsCost: number;
    totalWeight: number;
    totalVolume: number;
  };
}

export interface AllRoutesConfirmedPayload {
  routes: RouteConfirmedPayload[];
  totalOrders: number;
  plannerSessionId: string;
}

export interface SchedulingAssignedPayload {
  orderId: string;
  orderNumber: string;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  scheduledDate: string;
}

export interface GeofenceEventPayload {
  vehicleId: string;
  vehiclePlate: string;
  geofenceId: string;
  geofenceName: string;
  eventType: 'entry' | 'exit';
  orderId?: string;
  milestoneId?: string;
  timestamp: string;
}

export interface MaintenanceStatusPayload {
  maintenanceId: string;
  vehicleId: string;
  vehiclePlate: string;
  maintenanceType: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  estimatedCompletion?: string;
}

export interface FinanceCostRecordedPayload {
  costId: string;
  orderId?: string;
  vehicleId?: string;
  type: string;
  amount: number;
  currency: string;
}

export interface FinanceInvoiceCreatedPayload {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  orderIds: string[];
  totalAmount: number;
}

type EventCallback<T = unknown> = (event: TMSEvent<T>) => void;

/**
 * Event Bus centralizado para el TMS.
 * Implementa publish/subscribe desacoplado entre módulos.
 */
class TMSEventBus {
  private listeners: Map<TMSEventType, Set<EventCallback>> = new Map();
  private eventLog: TMSEvent[] = [];
  private maxLogSize = 500;

  /**
   * Suscribirse a un tipo de evento
   * @returns función para desuscribirse
   */
  subscribe<T = unknown>(
    eventType: TMSEventType,
    callback: EventCallback<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    const typedCallback = callback as EventCallback;
    this.listeners.get(eventType)!.add(typedCallback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(typedCallback);
    };
  }

  /**
   * Publicar un evento para todos los suscriptores
   */
  publish<T = unknown>(
    eventType: TMSEventType,
    payload: T,
    source: string
  ): void {
    const event: TMSEvent<T> = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      source,
    };

    // Log event
    this.eventLog.push(event as TMSEvent);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    // Notify listeners
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(event as TMSEvent);
        } catch (error) {
          console.error(
            `[TMSEventBus] Error in listener for ${eventType}:`,
            error
          );
        }
      });
    }

    // Debug log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[TMSEventBus] ${eventType} from ${source}`,
        payload
      );
    }
  }

  /**
   * Obtener el log de eventos recientes
   */
  getEventLog(limit?: number): TMSEvent[] {
    if (limit) {
      return this.eventLog.slice(-limit);
    }
    return [...this.eventLog];
  }

  /**
   * Obtener eventos filtrados por tipo
   */
  getEventsByType(eventType: TMSEventType): TMSEvent[] {
    return this.eventLog.filter((e) => e.type === eventType);
  }

  /**
   * Limpiar todas las suscripciones (útil para testing)
   */
  clearAll(): void {
    this.listeners.clear();
    this.eventLog = [];
  }

  /**
   * Obtener estadísticas de suscriptores
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.listeners.forEach((set, type) => {
      stats[type] = set.size;
    });
    return stats;
  }
}

// Singleton export
export const tmsEventBus = new TMSEventBus();
export { TMSEventBus };
