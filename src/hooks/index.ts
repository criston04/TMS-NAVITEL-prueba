export * from "./use-navigation";
export * from "./use-service";
export * from "./useGeofences";
export * from "./useLeafletMap";
export * from "./useDrawingTools";
export * from "./useWorkflowIntegration";
export * from "./useOrders";
export * from "./useOrderImportExport";

// 2026-05-03 (issue CRITICAL #1): `useVehicles` está deprecated (100% mock,
// 0 consumidores). Se conservan los TYPES (VehicleFilters, VehiclesState)
// pero no se exporta el hook a la API pública.
export type { VehicleFilters, VehiclesState } from "./useVehicles";
export * from "./useCustomers";
export * from "./useDocumentAlerts";
export * from "./useDriverVehicleAssignment";
// 2026-05-06: useDriverOrderHistory eliminado (codigo muerto, sin consumidores).
// Llamaba a OrderService.getOrdersByDriver tambien eliminado. Cuando se
// implemente la vista "Historial de ordenes" en /master/drivers/:id el
// hook se reconstruira siguiendo OPERACIONES_AL_DETALLE.md sec 2.10.
export * from "./useVehicleMaintenance";
export * from "./useCustomerOperationalStats";

export * from "./useNotifications";

export * from "./useGeofenceEvents";

export * from "./useFinance";

export * from "./useReports";

export * from "./useSettings";

export * from "./monitoring";

// Hooks adicionales
export * from "./useIncidents";
export * from "./useWorkflows";
export * from "./useWorkflowManagement";
export * from "./useCustomerDetail";
export * from "./useMaintenance";
export * from "./use-scheduling";
export * from "./useProducts";
export * from "./usePlatform";
