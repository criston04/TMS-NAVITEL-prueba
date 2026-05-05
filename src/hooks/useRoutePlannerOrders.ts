'use client';

/* ============================================
   HOOK: useRoutePlannerOrders
   Puente entre el módulo Orders y Route Planner.
   Consume órdenes reales desde OrderService,
   las convierte a TransportOrder, y las expone
   con fallback a mock data si no hay órdenes reales.
   ============================================ */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TransportOrder } from '@/types/route-planner';
import type { Order, OrderFilters } from '@/types/order';
import { orderService } from '@/services/orders';
import { ordersToTransportOrders } from '@/lib/mappers/order-to-transport-order';
import { useEntityCache } from '@/contexts/entity-cache-context';

interface UseRoutePlannerOrdersOptions {
  /** Si true, incluye mock data del route planner como fallback cuando no hay órdenes reales */
  includeFallbackMocks?: boolean;
  /** Filtros adicionales para las órdenes */
  filters?: Pick<OrderFilters, 'customerId' | 'carrierId' | 'dateFrom' | 'dateTo'>;
}

interface UseRoutePlannerOrdersResult {
  /** Órdenes convertidas a formato TransportOrder */
  orders: TransportOrder[];
  /** Indica si está cargando */
  isLoading: boolean;
  /** Error si hubo alguno */
  error: string | null;
  /** Cantidad total de órdenes planificables */
  totalPlannable: number;
  /** Cantidad de órdenes originales del módulo Orders */
  realOrderCount: number;
  /** Indica si se están usando datos mock de fallback */
  usingFallback: boolean;
  /** Recarga las órdenes desde el servicio */
  refresh: () => Promise<void>;
}

/**
 * Hook que conecta el módulo Orders con el Route Planner.
 * 
 * Flujo:
 * 1. Carga órdenes reales desde OrderService (con estado planificable: draft, pending, assigned)
 * 2. Las convierte de Order → TransportOrder usando el mapper
 * 3. Si no hay órdenes reales, usa mock data del Route Planner como fallback
 * 
 * @param options - Opciones del hook
 * @returns Órdenes en formato TransportOrder listas para el planificador
 */
export function useRoutePlannerOrders(
  options: UseRoutePlannerOrdersOptions = {}
): UseRoutePlannerOrdersResult {
  const { includeFallbackMocks = true, filters } = options;

  const [realOrders, setRealOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // EntityCache para hidratar customer_name cuando el backend no lo envía
  const { getCustomerName } = useEntityCache();

  /**
   * Carga órdenes planificables desde el servicio
   */
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Traer muchas órdenes; el mapper ya filtra por status planificable
      // (draft|pending|assigned) client-side. Enviar status como array al
      // backend no siempre funciona, así que filtramos después.
      const response = await orderService.getOrders({
        pageSize: 200,
        page: 1,
        ...filters,
      });

      setRealOrders(response.data);
    } catch (err) {
      console.error('[useRoutePlannerOrders] Error cargando órdenes:', err);
      setError(err instanceof Error ? err.message : 'Error cargando órdenes');
      setRealOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Cargar al montar
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /**
   * Órdenes convertidas al formato TransportOrder.
   * Pasamos el resolver del cache para que los nombres de clientes se hidraten
   * aunque el backend no los haya enviado en el payload de la orden.
   */
  const convertedOrders = useMemo(() => {
    return ordersToTransportOrders(realOrders, { getCustomerName });
  }, [realOrders, getCustomerName]);

  /**
   * Mock fallback eliminado el 2026-05-02. Si no hay órdenes reales, retornar
   * lista vacía. La UI debe mostrar empty state.
   */
  const usingFallback = false;

  const orders = useMemo(() => convertedOrders, [convertedOrders]);

  return {
    orders,
    isLoading,
    error,
    totalPlannable: orders.length,
    realOrderCount: convertedOrders.length,
    usingFallback,
    refresh: fetchOrders,
  };
}
