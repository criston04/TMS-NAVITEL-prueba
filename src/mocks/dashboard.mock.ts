/**
 * Mock data for Dashboard module
 * Provides realistic data that the backend should replicate
 */

export interface DashboardStats {
  // Indicadores Operativos
  totalFleet: number;
  onTimeDeliveryRate: number;
  dailyOrders: number;
  avgDeliveryTimeMinutes: number;
  // Monitoreo en Tiempo Real
  vehiclesOnRoute: number;
  activeDrivers: number;
  avgSpeedKmh: number;
  inMaintenance: number;
  // Seguridad y Documentación
  docsExpiringSoon: number;
  enabledVehicles: number;
  dailyIncidents: number;
  gpsComplianceRate: number;
}

export interface DashboardTrend {
  value: string;
  label: string;
  isPositive: boolean;
}

export interface VehicleOverviewData {
  available: number;
  onRoute: number;
  inMaintenance: number;
  inactive: number;
  avgRouteTime: string;
  avgIdleTime: string;
  avgMaintenanceTime: string;
  avgLoadTime: string;
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
  driver: string;
  route: string;
  status: "on-time" | "delayed" | "ahead";
  progress: number;
  eta: string;
  speed: number;
}

// Stats mock data
export const mockDashboardStats: DashboardStats = {
  totalFleet: 156,
  onTimeDeliveryRate: 98.5,
  dailyOrders: 87,
  avgDeliveryTimeMinutes: 45,
  vehiclesOnRoute: 94,
  activeDrivers: 112,
  avgSpeedKmh: 62,
  inMaintenance: 8,
  docsExpiringSoon: 12,
  enabledVehicles: 142,
  dailyIncidents: 2,
  gpsComplianceRate: 99.2,
};

// Trend data for stat cards  
export const mockDashboardTrends: Record<string, DashboardTrend> = {
  totalFleet: { value: "+3", label: "vs mes anterior", isPositive: true },
  onTimeDelivery: { value: "+2.1%", label: "vs semana anterior", isPositive: true },
  dailyOrders: { value: "+12", label: "vs ayer", isPositive: true },
  avgDeliveryTime: { value: "-5m", label: "vs promedio", isPositive: true },
  vehiclesOnRoute: { value: "60%", label: "de la flota", isPositive: true },
  activeDrivers: { value: "95%", label: "disponibilidad", isPositive: true },
  avgSpeed: { value: "+3 km/h", label: "vs ayer", isPositive: true },
  inMaintenance: { value: "-2", label: "vs semana anterior", isPositive: true },
  docsExpiring: { value: "+4", label: "esta semana", isPositive: false },
  enabledVehicles: { value: "91%", label: "de la flota", isPositive: true },
  dailyIncidents: { value: "-1", label: "vs ayer", isPositive: true },
  gpsCompliance: { value: "+0.3%", label: "vs mes anterior", isPositive: true },
};

// Sparkline data for stat cards
export const mockSparklineData: Record<string, number[]> = {
  totalFleet: [148, 150, 152, 151, 153, 155, 156],
  onTimeDelivery: [95, 96.5, 97, 96.8, 98, 97.5, 98.5],
  dailyOrders: [65, 72, 80, 75, 82, 78, 87],
  avgDeliveryTime: [52, 50, 48, 47, 46, 45, 45],
  vehiclesOnRoute: [88, 90, 85, 92, 90, 95, 94],
  activeDrivers: [105, 108, 110, 107, 112, 109, 112],
  avgSpeed: [58, 60, 59, 61, 63, 60, 62],
  inMaintenance: [12, 10, 11, 9, 8, 10, 8],
};

// Vehicle overview
export const mockVehicleOverview: VehicleOverviewData = {
  available: 39.7,
  onRoute: 28.3,
  inMaintenance: 17.4,
  inactive: 14.6,
  avgRouteTime: "2hr 10min",
  avgIdleTime: "45min",
  avgMaintenanceTime: "1hr 30min",
  avgLoadTime: "25min",
};

// Shipment statistics
export const mockShipmentData: ShipmentDataPoint[] = [
  { month: "Ene", entregadas: 2300, enProceso: 450, canceladas: 120 },
  { month: "Feb", entregadas: 2100, enProceso: 380, canceladas: 95 },
  { month: "Mar", entregadas: 2500, enProceso: 520, canceladas: 140 },
  { month: "Abr", entregadas: 2400, enProceso: 490, canceladas: 110 },
  { month: "May", entregadas: 2700, enProceso: 550, canceladas: 130 },
  { month: "Jun", entregadas: 2600, enProceso: 510, canceladas: 115 },
  { month: "Jul", entregadas: 2800, enProceso: 580, canceladas: 125 },
  { month: "Ago", entregadas: 2900, enProceso: 600, canceladas: 135 },
  { month: "Sep", entregadas: 3100, enProceso: 620, canceladas: 145 },
  { month: "Oct", entregadas: 3000, enProceso: 590, canceladas: 128 },
];

// On-route vehicles
export const mockOnRouteVehicles: OnRouteVehicle[] = [
  {
    id: "v-001",
    plate: "ABC-123",
    driver: "Carlos Mendoza",
    route: "Lima → Arequipa",
    status: "on-time",
    progress: 72,
    eta: "14:30",
    speed: 65,
  },
  {
    id: "v-002",
    plate: "DEF-456",
    driver: "María García",
    route: "Lima → Cusco",
    status: "delayed",
    progress: 45,
    eta: "18:15",
    speed: 48,
  },
  {
    id: "v-003",
    plate: "GHI-789",
    driver: "Roberto Silva",
    route: "Trujillo → Lima",
    status: "ahead",
    progress: 88,
    eta: "11:45",
    speed: 72,
  },
  {
    id: "v-004",
    plate: "JKL-012",
    driver: "Ana Torres",
    route: "Lima → Piura",
    status: "on-time",
    progress: 35,
    eta: "20:00",
    speed: 60,
  },
  {
    id: "v-005",
    plate: "MNO-345",
    driver: "Pedro Vargas",
    route: "Ica → Lima",
    status: "on-time",
    progress: 92,
    eta: "10:30",
    speed: 58,
  },
];

/**
 * Dashboard Service Mock
 * Simulates API endpoints for the dashboard
 */
export const dashboardServiceMock = {
  getStats: async (_dateFilter?: string): Promise<DashboardStats> => {
    await new Promise(r => setTimeout(r, 300));
    return { ...mockDashboardStats };
  },

  getVehicleOverview: async (): Promise<VehicleOverviewData> => {
    await new Promise(r => setTimeout(r, 200));
    return { ...mockVehicleOverview };
  },

  getShipmentData: async (): Promise<{ data: ShipmentDataPoint[]; total: number }> => {
    await new Promise(r => setTimeout(r, 250));
    const total = mockShipmentData.reduce((sum, d) => sum + d.entregadas + d.enProceso + d.canceladas, 0);
    return { data: [...mockShipmentData], total };
  },

  getOnRouteVehicles: async (): Promise<{ vehicles: OnRouteVehicle[]; total: number }> => {
    await new Promise(r => setTimeout(r, 200));
    return { vehicles: [...mockOnRouteVehicles], total: 25 };
  },
};
