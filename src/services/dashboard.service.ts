/**
 * Servicio de Dashboard
 *
 * Consume los 4 endpoints reales del backend:
 *  - GET /dashboard/stats                       → KPIs principales + trends + sparklines
 *  - GET /dashboard/vehicles/overview           → Distribucion de la flota por estado
 *  - GET /dashboard/shipments                   → Historico mensual de envios
 *  - GET /dashboard/vehicles/on-route           → Vehiculos actualmente en ruta
 *
 * Defensas:
 *  - Cache module-scope de 60s para reducir presión sobre backend rate-limited.
 *  - 404/429/5xx → devolvemos shape vacío para que la UI no crashee.
 */

import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import type {
  DashboardStats,
  VehicleOverviewData,
  ShipmentDataPoint,
  OnRouteVehicle,
} from "@/types/dashboard";

// ────────────────────────────────────────────────────────────
//  Cache simple module-scope
// ────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000; // 60 segundos
type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function isRecoverableError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 404 || status === 429 || (typeof status === "number" && status >= 500);
}

// ────────────────────────────────────────────────────────────
//  Empty shapes (fallback)
// ────────────────────────────────────────────────────────────

const EMPTY_STATS: DashboardStats = {
  totalShipments: 0,
  activeOrders: 0,
  completedOrders: 0,
  totalVehicles: 0,
  activeVehicles: 0,
  totalDrivers: 0,
  activeDrivers: 0,
};

const EMPTY_OVERVIEW: VehicleOverviewData = {
  available: 0,
  onRoute: 0,
  maintenance: 0,
  inactive: 0,
  total: 0,
};

// ────────────────────────────────────────────────────────────
//  Servicio
// ────────────────────────────────────────────────────────────

export const dashboardService = {
  async getStats(dateFilter?: string): Promise<DashboardStats> {
    const key = `stats:${dateFilter ?? "no-filter"}`;
    const hit = cached<DashboardStats>(key);
    if (hit) return hit;

    try {
      const res = await apiClient.get<DashboardStats>(API_ENDPOINTS.dashboard.stats, {
        params: dateFilter ? { date: dateFilter } : undefined,
      });
      setCache(key, res);
      return res;
    } catch (err) {
      if (isRecoverableError(err)) {
        console.warn(`[dashboardService.getStats] backend error (${(err as { status?: number })?.status}). Devolviendo empty.`);
        return EMPTY_STATS;
      }
      throw err;
    }
  },

  async getVehicleOverview(): Promise<VehicleOverviewData> {
    const hit = cached<VehicleOverviewData>("overview");
    if (hit) return hit;

    try {
      const res = await apiClient.get<VehicleOverviewData>(API_ENDPOINTS.dashboard.vehiclesOverview);
      setCache("overview", res);
      return res;
    } catch (err) {
      if (isRecoverableError(err)) return EMPTY_OVERVIEW;
      throw err;
    }
  },

  async getShipmentData(): Promise<{ data: ShipmentDataPoint[]; total: number }> {
    const hit = cached<{ data: ShipmentDataPoint[]; total: number }>("shipments");
    if (hit) return hit;

    try {
      const response = await apiClient.get<ShipmentDataPoint[] | { data: ShipmentDataPoint[]; total?: number }>(
        API_ENDPOINTS.dashboard.shipments
      );
      let result: { data: ShipmentDataPoint[]; total: number };
      if (Array.isArray(response)) {
        const total = response.reduce((acc, p) => acc + p.entregadas + p.enProceso + p.canceladas, 0);
        result = { data: response, total };
      } else {
        result = {
          data: response.data ?? [],
          total: response.total ?? (response.data ?? []).length,
        };
      }
      setCache("shipments", result);
      return result;
    } catch (err) {
      if (isRecoverableError(err)) return { data: [], total: 0 };
      throw err;
    }
  },

  async getOnRouteVehicles(): Promise<{ vehicles: OnRouteVehicle[]; total: number }> {
    const hit = cached<{ vehicles: OnRouteVehicle[]; total: number }>("on-route");
    if (hit) return hit;

    try {
      const response = await apiClient.get<OnRouteVehicle[] | { vehicles: OnRouteVehicle[]; total?: number } | { data: OnRouteVehicle[] }>(
        API_ENDPOINTS.dashboard.vehiclesOnRoute
      );
      let result: { vehicles: OnRouteVehicle[]; total: number };
      if (Array.isArray(response)) {
        result = { vehicles: response, total: response.length };
      } else if ("vehicles" in response) {
        result = { vehicles: response.vehicles, total: response.total ?? response.vehicles.length };
      } else {
        const list = (response as { data: OnRouteVehicle[] }).data ?? [];
        result = { vehicles: list, total: list.length };
      }
      setCache("on-route", result);
      return result;
    } catch (err) {
      if (isRecoverableError(err)) return { vehicles: [], total: 0 };
      throw err;
    }
  },
};
