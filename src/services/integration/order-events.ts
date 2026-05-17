/**
 * Emisor centralizado de eventos del modulo OPERACIONES (Orders) al
 * `tmsEventBus`. Cada funcion construye el payload tipado y publica el
 * evento con el `source` correcto.
 *
 * 2026-05-05: creado para cerrar el gap de integracion. Antes
 * `OrderService.closeOrder` era el unico que publicaba (`order:closed`)
 * mientras los demas metodos (create, updateStatus, assign, etc.) no
 * emitian nada — el `integration-hub` quedaba escuchando en silencio.
 *
 * Patron: los services importan `orderEvents` y llaman `orderEvents.created(o)`
 * en una linea despues del HTTP exitoso. El payload se construye una sola
 * vez aqui (DRY) y TypeScript valida que cumpla el shape del bus.
 *
 * Uso desde un service:
 * ```ts
 * import { orderEvents } from '@/services/integration/order-events';
 *
 * async createOrder(data) {
 *   const order = await ...;
 *   orderEvents.created(order);
 *   return order;
 * }
 * ```
 */

import {
  tmsEventBus,
  type OrderCreatedPayload,
  type OrderStatusChangedPayload,
  type OrderCompletedPayload,
  type OrderClosedPayload,
} from "./event-bus.service";
import type { Order } from "@/types/order";

const SOURCE = "order-service";

export const orderEvents = {
  /**
   * Orden recien creada (POST /orders → 201).
   */
  created(order: Order): void {
    const payload: OrderCreatedPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId ?? "",
      serviceType: order.serviceType ?? "delivery",
    };
    tmsEventBus.publish("order:created", payload, SOURCE);
  },

  /**
   * Cambio de status (cualquier transicion: draft→pending, pending→assigned,
   * assigned→in_transit, in_transit→completed, etc.).
   */
  statusChanged(order: Order, previousStatus: string): void {
    const payload: OrderStatusChangedPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: order.status,
      vehicleId: order.vehicleId,
      driverId: order.driverId,
      customerId: order.customerId,
    };
    tmsEventBus.publish("order:status_changed", payload, SOURCE);
  },

  /**
   * Asignacion de vehiculo + conductor (PATCH /:id/assign).
   * Tambien emitimos status_changed para que los handlers que escuchan
   * cualquier transicion se enteren.
   */
  assigned(order: Order, previousStatus: string): void {
    // El hub no tiene un handler dedicado a 'order:assigned' — el cambio se
    // propaga via status_changed que SI tiene handler. Pero publicamos
    // ambos por completitud del bus log y futura observabilidad.
    tmsEventBus.publish(
      "order:assigned",
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        vehicleId: order.vehicleId,
        driverId: order.driverId,
      },
      SOURCE
    );
    if (previousStatus !== order.status) {
      this.statusChanged(order, previousStatus);
    }
  },

  /**
   * Orden completada (todos los hitos OK, status=completed).
   * Dispara el handler del hub que crea costos en Finance.
   *
   * Nota: `totalDistance` / `totalDuration` quedan undefined porque el tipo
   * Order del frontend no los expone directamente. El hub puede consultarlos
   * via GET /orders/:id si los necesita (estan en BackendOrder).
   */
  completed(order: Order): void {
    const o = order as Order & {
      estimatedDistanceKm?: number;
      estimatedDurationMinutes?: number;
    };
    const payload: OrderCompletedPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId ?? "",
      vehicleId: order.vehicleId,
      driverId: order.driverId,
      totalDistance: o.estimatedDistanceKm,
      totalDuration: o.estimatedDurationMinutes,
      cargo: order.cargo
        ? {
            weightKg: order.cargo.weightKg ?? 0,
            volumeM3: order.cargo.volumeM3,
            type: order.cargo.type ?? "general",
          }
        : undefined,
    };
    tmsEventBus.publish("order:completed", payload, SOURCE);
  },

  /**
   * Orden cerrada administrativamente (POST /:id/close).
   * Dispara el handler del hub que genera factura en Finance.
   */
  closed(order: Order, closedBy: string): void {
    const payload: OrderClosedPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId ?? "",
      vehicleId: order.vehicleId,
      driverId: order.driverId,
      closedBy,
    };
    tmsEventBus.publish("order:closed", payload, SOURCE);
  },

  /**
   * Orden cancelada (POST /:id/cancel o PATCH status=cancelled).
   */
  cancelled(order: Order, reason?: string): void {
    tmsEventBus.publish(
      "order:cancelled",
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        vehicleId: order.vehicleId,
        driverId: order.driverId,
        reason,
      },
      SOURCE
    );
  },
};
