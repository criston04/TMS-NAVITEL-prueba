import { useState, useEffect, useCallback } from "react";
import { dashboardService } from "@/services/dashboard.service";
import { useIsMounted } from "@/hooks/use-is-mounted";
import type {
  DashboardStats,
  VehicleOverviewData,
  ShipmentDataPoint,
  OnRouteVehicle,
} from "@/types/dashboard";

// Re-export para mantener compat con consumers que importaban del hook
export type { DashboardStats, VehicleOverviewData, ShipmentDataPoint, OnRouteVehicle };

const emptyTrends: Record<string, unknown> = {};
const emptySparklines: Record<string, number[]> = {};

export interface UseDashboardReturn {
  stats: DashboardStats | null;
  vehicleOverview: VehicleOverviewData | null;
  shipmentData: ShipmentDataPoint[];
  shipmentTotal: number;
  onRouteVehicles: OnRouteVehicle[];
  onRouteTotal: number;
  trends: typeof emptyTrends;
  sparklines: typeof emptySparklines;
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

  const isMounted = useIsMounted();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResult, overviewResult, shipmentResult, vehiclesResult] = await Promise.all([
        dashboardService.getStats(dateFilter),
        dashboardService.getVehicleOverview(),
        dashboardService.getShipmentData(),
        dashboardService.getOnRouteVehicles(),
      ]);

      // Guard: si el componente se desmontó mientras los fetch estaban en
      // vuelo, no setear estado (evita warning React + memory leak).
      if (!isMounted.current) return;

      setStats(statsResult);
      setVehicleOverview(overviewResult);
      setShipmentData(shipmentResult.data);
      setShipmentTotal(shipmentResult.total);
      setOnRouteVehicles(vehiclesResult.vehicles);
      setOnRouteTotal(vehiclesResult.total);
    } catch (err) {
      if (!isMounted.current) return;
      const message = err instanceof Error ? err.message : "Error al cargar dashboard";
      setError(message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [dateFilter, isMounted]);

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
    trends: emptyTrends,
    sparklines: emptySparklines,
    loading,
    error,
    refresh: fetchAll,
    setDateFilter,
  };
}

export default useDashboard;
