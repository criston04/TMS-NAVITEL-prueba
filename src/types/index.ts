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

// Tipos de módulos específicos con nombres que podrían colisionar.
// Importar directamente desde su archivo:
//   import type { FleetVehicle } from '@/types/fleet';
//   import type { MaintenanceVehicle } from '@/types/maintenance';
//   import type { RoutePlannerVehicle, RoutePlannerDriver } from '@/types/route-planner';
