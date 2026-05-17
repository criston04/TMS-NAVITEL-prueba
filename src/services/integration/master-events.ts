/**
 * Emisor centralizado de eventos del modulo MAESTRO al `tmsEventBus`.
 *
 * 2026-05-05: creado para que cambios en master (asignacion driver↔vehicle,
 * bloqueo/desbloqueo de vehiculos, cambios en customers) propaguen al bus.
 *
 * Notas:
 * - Maintenance YA emite via `master/maintenance.service.ts` (preexistente).
 * - Aqui agregamos: assignment, vehicles.block, customers.statusChange.
 * - `event-bus.service.ts` no tiene tipos especificos para algunos de estos,
 *   asi que usamos types inline en el publish (el bus acepta `<T = unknown>`).
 *   En una iteracion futura se pueden agregar payload types tipados.
 */

import { tmsEventBus } from "./event-bus.service";

const SOURCE = "master-service";

export const masterEvents = {
  /**
   * Conductor asignado a un vehiculo (POST /assignments).
   * Util para que ordenes activas con ese driver/vehicle se enteren.
   */
  driverAssigned(input: {
    assignmentId: string;
    driverId: string;
    driverName?: string;
    vehicleId: string;
    vehiclePlate?: string;
    startDate: string;
    endDate?: string;
  }): void {
    // Reutilizamos `scheduling:assigned` semanticamente similar; o se
    // puede agregar `master:driver_assigned` al bus en una iteracion futura.
    tmsEventBus.publish(
      "scheduling:assigned",
      {
        orderId: "", // no aplica aqui; es asignacion de recurso a recurso
        orderNumber: "",
        vehicleId: input.vehicleId,
        vehiclePlate: input.vehiclePlate ?? "",
        driverId: input.driverId,
        driverName: input.driverName ?? "",
        scheduledDate: input.startDate,
      },
      SOURCE
    );
  },

  /**
   * Conductor desasignado (DELETE /assignments/:id).
   */
  driverUnassigned(input: {
    assignmentId: string;
    driverId: string;
    vehicleId: string;
  }): void {
    // No hay tipo dedicado todavia; usamos publish generico.
    // En una proxima iteracion agregar 'master:driver_unassigned' al bus.
    tmsEventBus.publish(
      "scheduling:assigned",
      { ...input, action: "unassigned" } as unknown as Record<string, unknown>,
      SOURCE
    );
  },

  /**
   * Vehiculo bloqueado (POST /master/vehicles/:id/block).
   * Las ordenes activas con ese vehiculo deberian re-asignarse o pausarse.
   */
  vehicleBlocked(input: {
    vehicleId: string;
    vehiclePlate: string;
    reason?: string;
  }): void {
    // Reusamos `maintenance:scheduled` semanticamente (vehiculo sale de
    // operacion). Ideal: agregar 'master:vehicle_blocked' tipado al bus.
    tmsEventBus.publish(
      "maintenance:scheduled",
      {
        maintenanceId: `block-${input.vehicleId}`,
        vehicleId: input.vehicleId,
        vehiclePlate: input.vehiclePlate,
        maintenanceType: "blocked",
        status: "scheduled",
        estimatedCompletion: undefined,
      },
      SOURCE
    );
  },

  /**
   * Vehiculo habilitado (POST /master/vehicles/:id/enable).
   */
  vehicleEnabled(input: {
    vehicleId: string;
    vehiclePlate: string;
  }): void {
    tmsEventBus.publish(
      "maintenance:completed",
      {
        maintenanceId: `unblock-${input.vehicleId}`,
        vehicleId: input.vehicleId,
        vehiclePlate: input.vehiclePlate,
        maintenanceType: "blocked",
        status: "completed",
      },
      SOURCE
    );
  },
};
