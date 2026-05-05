/**
 * Tipos del módulo Dashboard
 *
 * Estos tipos describen la forma de las respuestas del backend para los
 * endpoints bajo /api/v1/dashboard/*. Antes vivían en src/mocks/dashboard.mock.ts.
 */

export interface DashboardStats {
  totalShipments: number;
  activeOrders: number;
  completedOrders: number;
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  totalRevenue?: number;
  trends?: Record<string, number>;
  sparklines?: Record<string, number[]>;
  // Campos opcionales que el backend puede agregar en el futuro
  [key: string]: unknown;
}

export interface VehicleOverviewData {
  available: number;
  onRoute: number;
  maintenance: number;
  inactive: number;
  total: number;
}

export interface ShipmentDataPoint {
  month: string;
  entregadas: number;
  enProceso: number;
  canceladas: number;
}

export interface OnRouteVehicle {
  id: string;
  plate: string;
  driver?: string;
  driverName?: string;
  origin?: string;
  destination?: string;
  speed?: number;
  progress?: number;
  eta?: string;
  status?: string;
  lat?: number;
  lng?: number;
}
