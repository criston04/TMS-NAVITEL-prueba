export * from "./common";

// Navegación
export * from "./navigation";

// Modelos de datos (contiene Vehicle, Driver, Customer, etc.)
export * from "./models";

export * from "./order";

// Incidentes
export * from "./incident";

export * from "./scheduling";

export * from "./workflow";

export * from "./monitoring";

export * from "./notification";

// Eventos de Geocerca
export * from "./geofence-events";
export * from "./finance";
export * from "./report";
export * from "./settings";

// Tipos de módulos específicos (fleet, maintenance, route-planner, technician)
// Se importan directamente desde su archivo para evitar colisiones de nombres.
// Ejemplo: import type { Vehicle } from '@/types/fleet';
// Ejemplo: import type { WorkOrder } from '@/types/maintenance';
