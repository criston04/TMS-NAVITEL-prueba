"use client";

import { useEffect } from "react";
import { tmsIntegrationHub } from "@/services/integration/integration-hub.service";

/**
 * Componente invisible que inicializa el IntegrationHub al montar.
 * Debe colocarse una sola vez en el layout principal (dashboard).
 * 
 * El IntegrationHub conecta todos los módulos del TMS:
 * - Route Planner → Orders (rutas confirmadas generan órdenes)
 * - Orders → Finance (órdenes completadas generan costos)
 * - Orders → Notifications (cambios de estado notifican)
 * - Maintenance → Vehicles (estado del vehículo se actualiza)
 * - Scheduling → Orders (asignaciones se persisten)
 * - Monitoring → Orders (geocercas actualizan milestones)
 */
export function IntegrationInitializer() {
  useEffect(() => {
    tmsIntegrationHub.initialize();
    console.info("[TMS] IntegrationHub inicializado - módulos conectados");

    return () => {
      tmsIntegrationHub.destroy();
    };
  }, []);

  return null;
}
