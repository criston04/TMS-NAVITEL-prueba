'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  Order,
  OrderStatus,
  OrderFilters,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderClosureData,
  OrderRealtimeEvent,
  BulkSendPayload,
  BulkSendResult,
} from '@/types/order';
import { orderService } from '@/services/orders';

/**
 * Estado del hook useOrders
 */
interface UseOrdersState {
  /** Lista de órdenes */
  orders: Order[];
  
  total: number;
  
  page: number;
  /** Total de páginas */
  totalPages: number;
  /** Contadores por estado */
  statusCounts: Record<OrderStatus, number>;
  
  isLoading: boolean;
  
  error: string | null;
}

/**
 * Opciones para useOrders
 */
interface UseOrdersOptions {
  /** Filtros iniciales */
  initialFilters?: OrderFilters;
  /** Tamaño de página */
  pageSize?: number;
  /** Auto-fetch al montar */
  autoFetch?: boolean;
  /** Polling interval en ms (0 = desactivado) */
  pollingInterval?: number;
}

/**
 * Resultado del hook useOrders
 */
interface UseOrdersResult extends UseOrdersState {
  
  filters: OrderFilters;
  /** Actualiza los filtros */
  setFilters: (filters: OrderFilters) => void;
  /** Actualiza un filtro específico */
  updateFilter: <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => void;
  /** Limpia todos los filtros */
  clearFilters: () => void;
  /** Cambia de página */
  setPage: (page: number) => void;
  /** Recarga los datos */
  refresh: () => Promise<void>;
  /** Crea una orden */
  createOrder: (data: CreateOrderDTO) => Promise<Order>;
  /** Actualiza una orden */
  updateOrder: (id: string, data: UpdateOrderDTO) => Promise<Order>;
  /** Elimina una orden */
  deleteOrder: (id: string) => Promise<boolean>;
  /** Cierra una orden */
  closeOrder: (id: string, data: Omit<OrderClosureData, 'closedAt'>) => Promise<Order>;
  /** Envío masivo */
  bulkSend: (payload: BulkSendPayload) => Promise<BulkSendResult>;
  /** IDs seleccionados */
  selectedIds: Set<string>;
  /** Selecciona/deselecciona una orden */
  toggleSelection: (id: string) => void;
  /** Selecciona todas las órdenes visibles */
  selectAll: () => void;
  /** Deselecciona todas */
  clearSelection: () => void;
  /** Verifica si una orden está seleccionada */
  isSelected: (id: string) => boolean;
}

/**
 * Hook para gestión de lista de órdenes con filtros y paginación
 * @param options - Opciones del hook
 * @returns Estado y métodos para gestionar órdenes
 */
export function useOrders(options: UseOrdersOptions = {}): UseOrdersResult {
  const {
    initialFilters = {},
    pageSize = 10,
    autoFetch = true,
    pollingInterval = 0,
  } = options;

  const [state, setState] = useState<UseOrdersState>({
    orders: [],
    total: 0,
    page: 1,
    totalPages: 0,
    statusCounts: {
      draft: 0,
      pending: 0,
      assigned: 0,
      in_transit: 0,
      at_milestone: 0,
      delayed: 0,
      completed: 0,
      closed: 0,
      cancelled: 0,
    },
    isLoading: false,
    error: null,
  });

  const [filters, setFiltersState] = useState<OrderFilters>({
    ...initialFilters,
    pageSize,
  });

  // Selección
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Ref para evitar doble fetch en StrictMode
  const fetchingRef = useRef(false);

  /**
   * Fetch de órdenes
   */
  const fetchOrders = useCallback(async (currentFilters: OrderFilters) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await orderService.getOrders(currentFilters);
      setState(prev => ({
        ...prev,
        orders: response.data,
        total: response.total,
        page: response.page,
        totalPages: response.totalPages,
        statusCounts: response.statusCounts,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message,
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  /**
   * Actualiza filtros
   */
  const setFilters = useCallback((newFilters: OrderFilters) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset página al cambiar filtros
    }));
  }, []);

  /**
   * Actualiza un filtro específico
   */
  const updateFilter = useCallback(<K extends keyof OrderFilters>(
    key: K,
    value: OrderFilters[K]
  ) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  }, []);

  /**
   * Limpia filtros
   */
  const clearFilters = useCallback(() => {
    setFiltersState({ pageSize });
    setSelectedIds(new Set());
  }, [pageSize]);

  /**
   * Cambia página
   */
  const setPage = useCallback((page: number) => {
    setFiltersState(prev => ({ ...prev, page }));
  }, []);

  /**
   * Recarga datos
   */
  const refresh = useCallback(async () => {
    await fetchOrders(filters);
  }, [fetchOrders, filters]);

  /**
   * Crea una orden
   */
  const createOrder = useCallback(async (data: CreateOrderDTO): Promise<Order> => {
    const order = await orderService.createOrder(data);
    await refresh();
    return order;
  }, [refresh]);

  /**
   * Actualiza una orden
   */
  const updateOrder = useCallback(async (
    id: string,
    data: UpdateOrderDTO
  ): Promise<Order> => {
    const order = await orderService.updateOrder(id, data);
    await refresh();
    return order;
  }, [refresh]);

  /**
   * Elimina una orden
   */
  const deleteOrder = useCallback(async (id: string): Promise<boolean> => {
    const result = await orderService.deleteOrder(id);
    if (result) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      await refresh();
    }
    return result;
  }, [refresh]);

  /**
   * Cierra una orden
   */
  const closeOrder = useCallback(async (
    id: string,
    data: Omit<OrderClosureData, 'closedAt'>
  ): Promise<Order> => {
    const order = await orderService.closeOrder(id, data);
    await refresh();
    return order;
  }, [refresh]);

  /**
   * Envío masivo
   */
  const bulkSend = useCallback(async (payload: BulkSendPayload): Promise<BulkSendResult> => {
    const result = await orderService.bulkSendToExternal(payload);
    await refresh();
    return result;
  }, [refresh]);

  /**
   * Toggle selección
   */
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  /**
   * Selecciona todas
   */
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(state.orders.map(o => o.id)));
  }, [state.orders]);

  /**
   * Limpia selección
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /**
   * Verifica selección
   */
  const isSelected = useCallback((id: string): boolean => {
    return selectedIds.has(id);
  }, [selectedIds]);

  // Fetch inicial y cuando cambian filtros
  useEffect(() => {
    if (autoFetch) {
      fetchOrders(filters);
    }
  }, [filters, autoFetch, fetchOrders]);

  // Polling
  useEffect(() => {
    if (pollingInterval > 0) {
      const interval = setInterval(() => {
        fetchOrders(filters);
      }, pollingInterval);

      return () => clearInterval(interval);
    }
  }, [pollingInterval, filters, fetchOrders]);

  return {
    ...state,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    setPage,
    refresh,
    createOrder,
    updateOrder,
    deleteOrder,
    closeOrder,
    bulkSend,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  };
}

/**
 * Estado del hook useOrder
 */
interface UseOrderState {
  /** Orden cargada */
  order: Order | null;
  
  isLoading: boolean;
  
  error: string | null;
}

/**
 * Resultado del hook useOrder
 */
interface UseOrderResult extends UseOrderState {
  /** Recarga la orden */
  refresh: () => Promise<void>;
  /** Actualiza la orden */
  update: (data: UpdateOrderDTO) => Promise<Order | null>;
  /** Cambia el estado */
  changeStatus: (status: OrderStatus, reason?: string) => Promise<Order | null>;
  /** Cierra la orden */
  close: (data: Omit<OrderClosureData, 'closedAt'>) => Promise<Order | null>;
  /** Inicia el viaje */
  startTrip: () => Promise<Order | null>;
  /** Envía a sistema externo */
  sendToExternal: () => Promise<Order | null>;
}

/**
 * Hook para gestión de una orden individual
 * @param orderId - ID de la orden
 * @param options - Opciones del hook
 * @returns Estado y métodos para gestionar la orden
 */
export function useOrder(
  orderId: string | null,
  options: { autoFetch?: boolean; realtimeUpdates?: boolean } = {}
): UseOrderResult {
  const { autoFetch = true, realtimeUpdates = false } = options;

  const [state, setState] = useState<UseOrderState>({
    order: null,
    isLoading: false,
    error: null,
  });

  /**
   * Fetch de la orden
   */
  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setState({ order: null, isLoading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const order = await orderService.getOrderById(orderId);
      setState({ order, isLoading: false, error: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message,
      }));
    }
  }, [orderId]);

  /**
   * Recarga
   */
  const refresh = useCallback(async () => {
    await fetchOrder();
  }, [fetchOrder]);

  /**
   * Actualiza
   */
  const update = useCallback(async (data: UpdateOrderDTO): Promise<Order | null> => {
    if (!orderId) return null;
    
    try {
      const order = await orderService.updateOrder(orderId, data);
      setState(prev => ({ ...prev, order }));
      return order;
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }));
      return null;
    }
  }, [orderId]);

  /**
   * Cambia estado
   */
  const changeStatus = useCallback(async (
    status: OrderStatus,
    reason?: string
  ): Promise<Order | null> => {
    if (!orderId) return null;
    
    try {
      const order = await orderService.changeStatus(orderId, status, reason);
      setState(prev => ({ ...prev, order }));
      return order;
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }));
      return null;
    }
  }, [orderId]);

  /**
   * Cierra orden
   */
  const close = useCallback(async (
    data: Omit<OrderClosureData, 'closedAt'>
  ): Promise<Order | null> => {
    if (!orderId) return null;
    
    try {
      const order = await orderService.closeOrder(orderId, data);
      setState(prev => ({ ...prev, order }));
      return order;
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }));
      return null;
    }
  }, [orderId]);

  /**
   * Inicia viaje
   */
  const startTrip = useCallback(async (): Promise<Order | null> => {
    if (!orderId) return null;
    
    try {
      const order = await orderService.startTrip(orderId);
      setState(prev => ({ ...prev, order }));
      return order;
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }));
      return null;
    }
  }, [orderId]);

  /**
   * Envía a externo
   */
  const sendToExternal = useCallback(async (): Promise<Order | null> => {
    if (!orderId) return null;
    
    try {
      const order = await orderService.sendToExternal(orderId);
      setState(prev => ({ ...prev, order }));
      return order;
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }));
      return null;
    }
  }, [orderId]);

  // Fetch inicial
  useEffect(() => {
    if (autoFetch && orderId) {
      fetchOrder();
    }
  }, [orderId, autoFetch, fetchOrder]);

  // Suscripción a eventos en tiempo real
  useEffect(() => {
    if (!realtimeUpdates || !orderId) return;

    const unsubscribe = orderService.subscribe(orderId, (event: OrderRealtimeEvent) => {
      if (event.payload.current) {
        setState(prev => ({
          ...prev,
          order: { ...prev.order, ...event.payload.current } as Order,
        }));
      }
    });

    return unsubscribe;
  }, [orderId, realtimeUpdates]);

  return {
    ...state,
    refresh,
    update,
    changeStatus,
    close,
    startTrip,
    sendToExternal,
  };
}

/**
 * Hook para gestionar filtros de órdenes con persistencia en URL
 * @param initialFilters - Filtros iniciales
 * @returns Estado y métodos para gestionar filtros
 */
export function useOrderFilters(initialFilters: OrderFilters = {}) {
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [carriers, setCarriers] = useState<Array<{ id: string; name: string }>>([]);
  const [gpsOperators, setGPSOperators] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos de filtros
  useEffect(() => {
    const loadFilterData = async () => {
      setIsLoading(true);
      try {
        const [customersData, carriersData, gpsData] = await Promise.all([
          orderService.getCustomers(),
          orderService.getCarriers(),
          orderService.getGPSOperators(),
        ]);
        setCustomers(customersData);
        setCarriers(carriersData);
        setGPSOperators(gpsData);
      } catch (error) {
        console.error('Error loading filter data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFilterData();
  }, []);

  const updateFilter = useCallback(<K extends keyof OrderFilters>(
    key: K,
    value: OrderFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => v !== undefined && v !== '');
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== undefined && v !== '').length;
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    filterOptions: {
      customers,
      carriers,
      gpsOperators,
      statuses: [
        { value: 'draft', label: 'Borrador' },
        { value: 'pending', label: 'Pendiente' },
        { value: 'assigned', label: 'Asignada' },
        { value: 'in_transit', label: 'En tránsito' },
        { value: 'at_milestone', label: 'En hito' },
        { value: 'delayed', label: 'Retrasada' },
        { value: 'completed', label: 'Completada' },
        { value: 'closed', label: 'Cerrada' },
        { value: 'cancelled', label: 'Cancelada' },
      ],
      priorities: [
        { value: 'low', label: 'Baja' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'Alta' },
        { value: 'urgent', label: 'Urgente' },
      ],
    },
    isLoadingOptions: isLoading,
  };
}

/**
 * Hook para suscripción a eventos en tiempo real de órdenes
 * @param orderId - ID de la orden (o '*' para todas)
 * @param onEvent - Callback cuando hay evento
 */
export function useOrderRealtime(
  orderId: string,
  onEvent: (event: OrderRealtimeEvent) => void
) {
  useEffect(() => {
    const unsubscribe = orderService.subscribe(orderId, onEvent);
    return unsubscribe;
  }, [orderId, onEvent]);
}
