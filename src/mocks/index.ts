export {
  SHARED_CUSTOMERS,
  SHARED_VEHICLES,
  SHARED_DRIVERS,
  SHARED_CARRIERS,
  SHARED_GPS_OPERATORS,
  SHARED_LOCATIONS,
  SHARED_CARGO_TYPES,
  SHARED_ORDERS,
  findCustomerById,
  findVehicleById,
  findDriverById,
  findCarrierById,
  findLocationById,
  findOrderById,
  findOrderByNumber,
  getOrderStats,
  getFleetStats,
} from './shared-data';

export type {
  SharedCustomer,
  SharedVehicle,
  SharedDriver,
  SharedCarrier,
  SharedGPSOperator,
  SharedLocation,
  SharedCargoType,
  SharedOrder,
} from './shared-data';

// Módulo de scheduling (con sus propios tipos)
export {
  MOCK_VEHICLES,
  MOCK_DRIVERS,
  DEFAULT_KPIS,
  DEFAULT_SCHEDULING_CONFIG,
  getSchedulingKPIs,
  generateMockPendingOrders,
  generateMockTimelines,
  generateMockSuggestions,
} from './scheduling';

export type { MockVehicle, MockDriver } from './scheduling';

// Submódulos de mocks (re-exportaciones selectivas para evitar colisiones)
export * from './master';
export * from './monitoring';
export * from './maintenance';
export * from './finance';
export * from './reports';
export * from './settings';
export * from './notifications';

// Orders: re-exportación selectiva (mockWorkflows ya existe en master)
export * from './orders/orders.mock';
export * from './orders/incidents.mock';
export {
  mockWorkflows as mockOrderWorkflows,
  getAllWorkflows,
  getWorkflowById,
  getActiveWorkflows,
  getDefaultWorkflow,
  getWorkflowsByCargoType,
} from './orders/workflows.mock';

// Plataforma (Nivel 1: Owner TMS)
export {
  mockTenants,
  mockTransferRequests,
  mockPlatformDashboard,
  mockPlatformActivity,
  mockFleetGroups,
} from './platform.mock';