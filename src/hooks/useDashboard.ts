import { useState, useEffect, useCallback } from "react";
import {
  dashboardServiceMock,
  type DashboardStats,
  type VehicleOverviewData,
  type ShipmentDataPoint,
  type OnRouteVehicle,
  mockDashboardTrends,
  mockSparklineData,
} from "@/mocks/dashboard.mock";

export interface UseDashboardReturn {
  stats: DashboardStats | null;
  vehicleOverview: VehicleOverviewData | null;
  shipmentData: ShipmentDataPoint[];
  shipmentTotal: number;
  onRouteVehicles: OnRouteVehicle[];
  onRouteTotal: number;
  trends: typeof mockDashboardTrends;
  sparklines: typeof mockSparklineData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setDateFilter: (date: string) => void;
}

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [vehicleOverview, setVehicleOverview] = useState<VehicleOverviewData | null>(null);
  const [shipmentData, setShipmentData] = useState<ShipmentDataPoint[]>([]);
  const [shipmentTotal, setShipmentTotal] = useState(0);
  const [onRouteVehicles, setOnRouteVehicles] = useState<OnRouteVehicle[]>([]);
  const [onRouteTotal, setOnRouteTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResult, overviewResult, shipmentResult, vehiclesResult] = await Promise.all([
        dashboardServiceMock.getStats(dateFilter),
        dashboardServiceMock.getVehicleOverview(),
        dashboardServiceMock.getShipmentData(),
        dashboardServiceMock.getOnRouteVehicles(),
      ]);

      setStats(statsResult);
      setVehicleOverview(overviewResult);
      setShipmentData(shipmentResult.data);
      setShipmentTotal(shipmentResult.total);
      setOnRouteVehicles(vehiclesResult.vehicles);
      setOnRouteTotal(vehiclesResult.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar dashboard";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    stats,
    vehicleOverview,
    shipmentData,
    shipmentTotal,
    onRouteVehicles,
    onRouteTotal,
    trends: mockDashboardTrends,
    sparklines: mockSparklineData,
    loading,
    error,
    refresh: fetchAll,
    setDateFilter,
  };
}

export default useDashboard;
