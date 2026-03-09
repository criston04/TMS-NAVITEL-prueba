import { useState, useEffect, useCallback, useMemo } from "react";
import { customersService } from "@/services/master/customers.service";
import type { CustomerOperationalStats } from "@/types/models/customer";


/**
 * Orden simplificada para historial
 */
export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  totalWeight?: number;
}

/**
 * Resumen de órdenes
 */
export interface OrdersSummary {
  total: number;
  completed: number;
  inProgress: number;
  cancelled: number;
}

/**
 * Filtros para el historial
 */
export interface CustomerOrderFilters {
  status?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Estado del hook
 */
interface UseCustomerOperationalStatsState {
  stats: CustomerOperationalStats | null;
  orders: CustomerOrderSummary[];
  ordersSummary: OrdersSummary;
  isLoading: boolean;
  error: string | null;
}

/**
 * Resultado del hook
 */
interface UseCustomerOperationalStatsReturn extends UseCustomerOperationalStatsState {
  /** Recargar datos */
  refresh: () => Promise<void>;
  /** Cargar historial de órdenes */
  loadOrderHistory: (filters?: CustomerOrderFilters) => Promise<void>;
  /** Cliente tiene órdenes activas */
  hasActiveOrders: boolean;
  /** Tasa de éxito */
  successRate: number;
  /** Tendencia de órdenes (últimos 30 días vs anterior) */
  ordersTrend: "up" | "down" | "stable";
  /** Valor promedio por orden */
  avgOrderValue: number;
  /** Fidelidad del cliente (basado en frecuencia) */
  loyaltyLevel: "new" | "regular" | "loyal" | "vip";
  /** Días desde última orden */
  daysSinceLastOrder: number | null;
}

const _defaultStats: CustomerOperationalStats = {
  totalOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  onTimeDeliveryRate: 100,
  totalVolumeKg: 0,
};

const defaultSummary: OrdersSummary = {
  total: 0,
  completed: 0,
  inProgress: 0,
  cancelled: 0,
};


/**
 * Hook para obtener y gestionar estadísticas operativas de un cliente
 * 
 * @param customerId - ID del cliente
 * @returns Estado y funciones para estadísticas del cliente
 * 
 */
export function useCustomerOperationalStats(
  customerId: string | undefined
): UseCustomerOperationalStatsReturn {
  const [state, setState] = useState<UseCustomerOperationalStatsState>({
    stats: null,
    orders: [],
    ordersSummary: defaultSummary,
    isLoading: false,
    error: null,
  });

  /**
   * Carga las estadísticas operativas
   */
  const loadStats = useCallback(async () => {
    if (!customerId) {
      setState(prev => ({
        ...prev,
        stats: null,
        isLoading: false,
        error: null,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const stats = await customersService.getOperationalStats(customerId);
      
      setState(prev => ({
        ...prev,
        stats,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar estadísticas";
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      console.error("[useCustomerOperationalStats] Error:", err);
    }
  }, [customerId]);

  /**
   * Carga el historial de órdenes
   */
  const loadOrderHistory = useCallback(async (filters: CustomerOrderFilters = {}) => {
    if (!customerId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await customersService.getOrderHistory(customerId, filters);
      
      setState(prev => ({
        ...prev,
        orders: result.orders,
        ordersSummary: result.summary,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar historial";
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      console.error("[useCustomerOperationalStats] Error:", err);
    }
  }, [customerId]);

  // Cargar datos al montar o cuando cambie el customerId
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /**
   * Recargar todos los datos
   */
  const refresh = useCallback(async () => {
    await loadStats();
    if (state.orders.length > 0) {
      await loadOrderHistory();
    }
  }, [loadStats, loadOrderHistory, state.orders.length]);

  // Cliente tiene órdenes activas
  const hasActiveOrders = useMemo(() => {
    return state.ordersSummary.inProgress > 0;
  }, [state.ordersSummary.inProgress]);

  // Tasa de éxito
  const successRate = useMemo(() => {
    if (!state.stats) return 100;
    const { totalOrders, completedOrders, cancelledOrders } = state.stats;
    const relevantOrders = totalOrders - cancelledOrders;
    if (relevantOrders === 0) return 100;
    return Math.round((completedOrders / relevantOrders) * 100 * 10) / 10;
  }, [state.stats]);

  // Tendencia de órdenes
  const ordersTrend = useMemo((): "up" | "down" | "stable" => {
    // Simplificado: basado en cantidad de órdenes
    if (!state.stats) return "stable";
    if (state.stats.totalOrders >= 10) return "up";
    if (state.stats.totalOrders <= 2) return "down";
    return "stable";
  }, [state.stats]);

  // Valor promedio por orden
  const avgOrderValue = useMemo(() => {
    if (!state.stats) return 0;
    const { totalOrders, totalBilledAmount } = state.stats;
    if (totalOrders === 0 || !totalBilledAmount) return 0;
    return Math.round((totalBilledAmount / totalOrders) * 100) / 100;
  }, [state.stats]);

  // Nivel de fidelidad
  const loyaltyLevel = useMemo((): "new" | "regular" | "loyal" | "vip" => {
    if (!state.stats) return "new";
    const { totalOrders, onTimeDeliveryRate, completedOrders } = state.stats;
    
    // VIP: más de 50 órdenes completadas con buena tasa
    if (completedOrders >= 50 && onTimeDeliveryRate >= 90) return "vip";
    
    // Loyal: más de 20 órdenes completadas
    if (completedOrders >= 20) return "loyal";
    
    // Regular: más de 5 órdenes
    if (totalOrders >= 5) return "regular";
    
    // New: menos de 5 órdenes
    return "new";
  }, [state.stats]);

  // Días desde última orden
  const daysSinceLastOrder = useMemo((): number | null => {
    if (!state.stats?.lastOrderDate) return null;
    const lastDate = new Date(state.stats.lastOrderDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [state.stats?.lastOrderDate]);

  return {
    stats: state.stats,
    orders: state.orders,
    ordersSummary: state.ordersSummary,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
    loadOrderHistory,
    hasActiveOrders,
    successRate,
    ordersTrend,
    avgOrderValue,
    loyaltyLevel,
    daysSinceLastOrder,
  };
}

export default useCustomerOperationalStats;
