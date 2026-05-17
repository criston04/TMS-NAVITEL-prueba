/**
 * Emisor centralizado de eventos del modulo MONITOREO al `tmsEventBus`.
 *
 * 2026-05-05: creado para que `geofence-events.service` y `tracking.service`
 * propaguen al bus los eventos de GPS/geocercas que llegan del backend.
 * Antes el `integration-hub` escuchaba `monitoring:geofence_entry` y
 * `monitoring:geofence_exit` pero NADIE los emitia, asi que los milestones
 * de las ordenes nunca se actualizaban automaticamente.
 *
 * Cuando GPS detecta entrada/salida de geocerca:
 *   1. Backend recibe webhook
 *   2. Frontend lee /monitoring/geofence-events o WebSocket lo notifica
 *   3. Service del frontend llama a `monitoringEvents.geofenceEntry(...)`
 *   4. Bus dispara handler del hub
 *   5. Hub actualiza milestone de la orden afectada
 *
 * Esto cierra el ciclo OPERACIONES → MONITOREO → OPERACIONES.
 */

import {
  tmsEventBus,
  type GeofenceEventPayload,
} from "./event-bus.service";

const SOURCE = "monitoring-service";

interface GeofenceEventInput {
  vehicleId: string;
  vehiclePlate: string;
  geofenceId: string;
  geofenceName: string;
  orderId?: string;
  milestoneId?: string;
  /** ISO timestamp. Default: ahora. */
  timestamp?: string;
}

export const monitoringEvents = {
  /**
   * Vehiculo entro en una geocerca. Dispara update de milestone tipo
   * "approaching → in_progress" en la orden asociada.
   */
  geofenceEntry(input: GeofenceEventInput): void {
    const payload: GeofenceEventPayload = {
      vehicleId: input.vehicleId,
      vehiclePlate: input.vehiclePlate,
      geofenceId: input.geofenceId,
      geofenceName: input.geofenceName,
      eventType: "entry",
      orderId: input.orderId,
      milestoneId: input.milestoneId,
      timestamp: input.timestamp ?? new Date().toISOString(),
    };
    tmsEventBus.publish("monitoring:geofence_entry", payload, SOURCE);
  },

  /**
   * Vehiculo salio de una geocerca. Dispara cambio de milestone a
   * "completed" en la orden asociada.
   */
  geofenceExit(input: GeofenceEventInput): void {
    const payload: GeofenceEventPayload = {
      vehicleId: input.vehicleId,
      vehiclePlate: input.vehiclePlate,
      geofenceId: input.geofenceId,
      geofenceName: input.geofenceName,
      eventType: "exit",
      orderId: input.orderId,
      milestoneId: input.milestoneId,
      timestamp: input.timestamp ?? new Date().toISOString(),
    };
    tmsEventBus.publish("monitoring:geofence_exit", payload, SOURCE);
  },

  /**
   * Vehiculo llego al destino final (ultimo milestone OK).
   * Dispara `monitoring:vehicle_arrived` que el hub usa para
   * pre-marcar la orden como completada.
   */
  vehicleArrived(input: {
    vehicleId: string;
    vehiclePlate: string;
    orderId: string;
    timestamp?: string;
  }): void {
    tmsEventBus.publish(
      "monitoring:vehicle_arrived",
      {
        vehicleId: input.vehicleId,
        vehiclePlate: input.vehiclePlate,
        orderId: input.orderId,
        timestamp: input.timestamp ?? new Date().toISOString(),
      },
      SOURCE
    );
  },

  /**
   * Entrega confirmada (POD firmado / receptor confirmado).
   */
  deliveryCompleted(input: {
    orderId: string;
    vehicleId: string;
    deliveredAt: string;
    receiverName?: string;
  }): void {
    tmsEventBus.publish("monitoring:delivery_completed", input, SOURCE);
  },
};
