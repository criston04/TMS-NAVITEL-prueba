import type {
  Order,
  OrderStatus,
  OrderFilters,
  OrdersResponse,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderClosureData,
  OrderMilestone,
  BulkSendPayload,
  BulkSendResult,
  OrderRealtimeEvent,
} from '@/types/order';
import { tmsEventBus } from '@/services/integration/event-bus.service';
import { API_ENDPOINTS } from '@/config/api.config';
import { apiClient } from '@/lib/api';
import {
  mapOrderFromBackend,
  mapOrderToBackend,
  type BackendOrder,
} from '@/lib/transformers/order.transformer';

/**
 * Clase de servicio para gestión de órdenes
 */
class OrderService {
  private readonly eventListeners: Map<string, Set<(event: OrderRealtimeEvent) => void>> = new Map();

  /**
   * Obtiene órdenes con filtros y paginación
   */
  async getOrders(filters: OrderFilters = {}): Promise<OrdersResponse> {
    // Backend canonicamente responde: {items: T[], meta: {total, page, pageSize, totalPages}}
    // Cada item viene en shape snake_case/flat del backend — aplicamos mapper a cada uno.
    // statusCounts NO viene del backend, lo calculamos local.
    const response = await apiClient.get<Record<string, unknown>>(
      API_ENDPOINTS.operations.orders,
      { params: filters as unknown as Record<string, string> }
    );

    const meta = (response.meta ?? response.pagination ?? {}) as Record<string, number>;
    const rawList = (response.items ?? response.data ?? []) as unknown[];
    const list: Order[] = rawList
      .filter((x): x is BackendOrder => typeof x === "object" && x !== null)
      .map(mapOrderFromBackend);

    const pageSize = (response.pageSize as number) ?? meta.pageSize ?? filters.pageSize ?? 10;
    const total = (response.total as number) ?? meta.total ?? list.length;
    const page = (response.page as number) ?? meta.page ?? filters.page ?? 1;
    const totalPages = (response.totalPages as number) ?? meta.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

    // statusCounts: el backend no lo devuelve. Lo calculamos del listado actual
    // (aproximacion de la pagina, no del total). TODO pedir a backend que lo incluya.
    const statusCounts: Record<OrderStatus, number> = (response.statusCounts as Record<OrderStatus, number>) ?? {
      draft: 0, pending: 0, assigned: 0, in_transit: 0,
      at_milestone: 0, delayed: 0, completed: 0, closed: 0, cancelled: 0,
    };
    if (!response.statusCounts) {
      for (const order of list) {
        if (order.status && order.status in statusCounts) {
          statusCounts[order.status]++;
        }
      }
    }

    return { data: list, total, page, pageSize, totalPages, statusCounts };
  }

  /**
   * Obtiene una orden por su ID.
   *
   * 2026-05-02: WORKAROUND para bug del backend.
   * El endpoint `GET /orders/:id` está documentado en Rev3 pero responde 404
   * aunque la orden exista (confirmado en `GET /orders` lista). Mientras
   * backend lo arregla, hacemos fallback a `GET /orders?search=...` y
   * filtramos client-side.
   *
   * TODO: cuando el backend arregle el routing de /:id, eliminar el fallback
   * y dejar solo el GET directo.
   */
  async getOrderById(id: string): Promise<Order | null> {
    // 1. Intentar GET directo (forma oficial Rev3)
    try {
      const response = await apiClient.get<Record<string, unknown>>(
        `${API_ENDPOINTS.operations.orders}/${id}`
      );
      const raw = (response.data ?? response) as BackendOrder;
      if (raw && raw.id) return mapOrderFromBackend(raw);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status !== 404) throw err;
      console.warn(
        `[OrderService] GET /orders/${id} → 404. Aplicando workaround vía lista.`
      );
    }

    // 2. Fallback: buscar en la lista (workaround mientras backend arregla)
    try {
      const result = await apiClient.get<{ data?: unknown[]; items?: unknown[] }>(
        API_ENDPOINTS.operations.orders,
        { params: { pageSize: 200 } }
      );
      const list = (result.data ?? result.items ?? []) as BackendOrder[];
      const found = list.find((o) => o.id === id);
      if (!found) return null;
      return mapOrderFromBackend(found);
    } catch (err) {
      console.error(`[OrderService] Fallback de getOrderById también falló:`, err);
      return null;
    }
  }

  /**
   * Obtiene una orden por número de orden
   */
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    // NOTE: backend NO tiene /orders/by-number/:num. Usamos GET /orders?search=X
    // que soporta busqueda segun el Excel. Tomamos el primer match.
    const result = await apiClient.get<{ data?: Order[]; items?: Order[] }>(
      API_ENDPOINTS.operations.orders,
      { params: { search: orderNumber } }
    );
    const list = result.data ?? result.items ?? [];
    return list.find(o => o.orderNumber === orderNumber) ?? null;
  }

  /**
   * Obtiene los contadores por estado
   */
  async getStatusCounts(): Promise<Record<OrderStatus, number>> {
    return apiClient.get<Record<OrderStatus, number>>(`${API_ENDPOINTS.operations.orders}/status-counts`);
  }

  /**
   * Obtiene órdenes asignadas a un conductor específico
   */
  async getOrdersByDriver(
    driverId: string,
    options: {
      status?: OrderStatus[];
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<{
    orders: Order[];
    stats: {
      total: number;
      completed: number;
      cancelled: number;
      inProgress: number;
      onTimeDeliveryRate: number;
      avgDeliveryTime: number;
    };
  }> {
    // NOTE: backend NO tiene /orders/by-driver/:id. Usamos GET /orders?driverId=X
    // y devolvemos stats vacios (TODO: el backend deberia exponer stats en un futuro).
    try {
      const result = await apiClient.get<{ data?: Order[]; items?: Order[]; stats?: typeof options }>(
        API_ENDPOINTS.operations.orders,
        { params: { ...options, driverId } as unknown as Record<string, string> }
      );
      const orders = (result.data ?? result.items ?? []) as Order[];
      return {
        orders,
        stats: {
          total: orders.length,
          completed: 0, cancelled: 0, inProgress: 0,
          onTimeDeliveryRate: 0, avgDeliveryTime: 0,
        },
      };
    } catch (err) {
      if ((err as { status?: number }).status === 404) {
        return { orders: [], stats: { total: 0, completed: 0, cancelled: 0, inProgress: 0, onTimeDeliveryRate: 0, avgDeliveryTime: 0 } };
      }
      throw err;
    }
  }

  /**
   * Obtiene órdenes asignadas a un vehículo específico
   */
  async getOrdersByVehicle(
    vehicleId: string,
    options: {
      status?: OrderStatus[];
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<{
    orders: Order[];
    stats: {
      total: number;
      completed: number;
      cancelled: number;
      inProgress: number;
      totalDistanceKm: number;
    };
  }> {
    // NOTE: backend NO tiene /orders/by-vehicle/:id. Usamos GET /orders?vehicleId=X
    try {
      const result = await apiClient.get<{ data?: Order[]; items?: Order[] }>(
        API_ENDPOINTS.operations.orders,
        { params: { ...options, vehicleId } as unknown as Record<string, string> }
      );
      const orders = (result.data ?? result.items ?? []) as Order[];
      return {
        orders,
        stats: { total: orders.length, completed: 0, cancelled: 0, inProgress: 0, totalDistanceKm: 0 },
      };
    } catch (err) {
      if ((err as { status?: number }).status === 404) {
        return { orders: [], stats: { total: 0, completed: 0, cancelled: 0, inProgress: 0, totalDistanceKm: 0 } };
      }
      throw err;
    }
  }

  /**
   * Crea una nueva orden
   */
  async createOrder(data: CreateOrderDTO): Promise<Order> {
    // Backend espera payload en shape snake_case/flat. Convertimos con transformer.
    const payload = mapOrderToBackend(data);
    const response = await apiClient.post<Record<string, unknown>>(
      API_ENDPOINTS.operations.orders,
      payload
    );
    const raw = (response.data ?? response) as BackendOrder;
    return mapOrderFromBackend(raw);
  }

  /**
   * 2026-05-03: Helper privado — wrap any `/orders/:id*` call con detección
   * de endpoints no implementados.
   *
   * Diagnóstico actualizado: lo que antes atribuíamos a "bug NGINX" o "bug
   * de routing" en realidad es el handler 404 default del framework backend
   * cuando una ruta no está registrada. NGINX proxea todo correctamente al
   * backend; el backend simplemente no tiene los handlers `:id` implementados.
   */
  private async withBugDetection<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        const explanatory = new Error(
          `${operation} no está disponible: el backend devuelve 404 porque ` +
          `esta ruta NO está implementada en producción. El equipo backend ` +
          `debe implementar el handler correspondiente.`
        ) as Error & { status?: number; backendNotImplemented?: boolean };
        explanatory.status = 404;
        explanatory.backendNotImplemented = true;
        throw explanatory;
      }
      throw err;
    }
  }

  /**
   * Actualiza una orden existente. Bloqueado por bug del backend.
   */
  async updateOrder(id: string, data: UpdateOrderDTO): Promise<Order> {
    const payload = mapOrderToBackend(data);
    return this.withBugDetection("Actualizar orden (PATCH /orders/:id)", async () => {
      const response = await apiClient.patch<Record<string, unknown>>(
        `${API_ENDPOINTS.operations.orders}/${id}`,
        payload
      );
      const raw = (response.data ?? response) as BackendOrder;
      return mapOrderFromBackend(raw);
    });
  }

  /**
   * Elimina una orden (solo si está en borrador). Bloqueado por bug del backend.
   */
  async deleteOrder(id: string): Promise<boolean> {
    return this.withBugDetection("Eliminar orden (DELETE /orders/:id)", () =>
      apiClient.delete<boolean>(`${API_ENDPOINTS.operations.orders}/${id}`)
    );
  }

  /**
   * Cambia el estado de una orden
   */
  async changeStatus(
    id: string,
    newStatus: OrderStatus,
    _reason?: string
  ): Promise<Order> {
    return this.updateOrder(id, { status: newStatus });
  }

  /**
   * Asigna vehículo y conductor a una orden. Bloqueado por bug del backend.
   */
  async assignVehicleAndDriver(
    id: string,
    vehicleId: string,
    driverId: string
  ): Promise<Order> {
    return this.withBugDetection("Asignar recursos (PATCH /orders/:id/assign)", async () => {
      const response = await apiClient.patch<Record<string, unknown>>(
        `${API_ENDPOINTS.operations.orders}/${id}/assign`,
        { vehicle_id: vehicleId, driver_id: driverId }
      );
      const raw = (response.data ?? response) as BackendOrder;
      return mapOrderFromBackend(raw);
    });
  }

  /**
   * Inicia el viaje de una orden. Bloqueado por bug del backend.
   */
  async startTrip(id: string): Promise<Order> {
    return this.withBugDetection("Iniciar viaje (PATCH /orders/:id/status)", async () => {
      const response = await apiClient.patch<Record<string, unknown>>(
        `${API_ENDPOINTS.operations.orders}/${id}/status`,
        { status: 'in_transit' }
      );
      const raw = (response.data ?? response) as BackendOrder;
      return mapOrderFromBackend(raw);
    });
  }

  /**
   * Verifica si una orden puede ser cerrada
   */
  async canCloseOrder(id: string): Promise<{ canClose: boolean; reason?: string }> {
    const order = await this.getOrderById(id);
    if (!order) {
      return { canClose: false, reason: 'Orden no encontrada' };
    }

    if (order.status === 'closed') {
      return { canClose: false, reason: 'La orden ya está cerrada' };
    }

    if (order.status !== 'completed') {
      return { canClose: false, reason: 'La orden debe estar completada antes de cerrar' };
    }

    const pendingMilestones = order.milestones.filter(
      m => m.status !== 'completed' && m.status !== 'skipped'
    );

    if (pendingMilestones.length > 0) {
      return {
        canClose: false,
        reason: `Hay ${pendingMilestones.length} hito(s) pendiente(s)`,
      };
    }

    return { canClose: true };
  }

  /**
   * Cierra una orden manualmente. Bloqueado por bug del backend.
   */
  async closeOrder(id: string, closureData: Omit<OrderClosureData, 'closedAt'>): Promise<Order> {
    const canClose = await this.canCloseOrder(id);
    if (!canClose.canClose) {
      throw new Error(canClose.reason);
    }

    const closedOrder = await this.withBugDetection(
      "Cerrar orden (POST /orders/:id/close)",
      () => apiClient.post<Order>(`${API_ENDPOINTS.operations.orders}/${id}/close`, closureData)
    );

    // Publicar evento específico de cierre
    tmsEventBus.publish('order:closed', {
      orderId: closedOrder.id,
      orderNumber: closedOrder.orderNumber,
      customerId: closedOrder.customerId,
      vehicleId: closedOrder.vehicleId,
      driverId: closedOrder.driverId,
      closedBy: closureData.closedBy,
    }, 'order-service');

    return closedOrder;
  }

  /**
   * Actualiza un hito de la orden. Bloqueado por bug del backend.
   */
  async updateMilestone(
    orderId: string,
    milestoneId: string,
    data: Partial<OrderMilestone>
  ): Promise<Order> {
    return this.withBugDetection(
      "Actualizar hito (PATCH /orders/:id/milestones/:milestoneId)",
      () => apiClient.patch<Order>(
        `${API_ENDPOINTS.operations.orders}/${orderId}/milestones/${milestoneId}`,
        data
      )
    );
  }

  /**
   * Registra entrada a un hito (geocerca)
   */
  async enterMilestone(orderId: string, milestoneId: string): Promise<Order> {
    const now = new Date().toISOString();
    return this.updateMilestone(orderId, milestoneId, {
      status: 'in_progress',
      actualEntry: now,
    });
  }

  /**
   * Registra salida de un hito (geocerca)
   */
  async exitMilestone(orderId: string, milestoneId: string): Promise<Order> {
    const now = new Date().toISOString();
    return this.updateMilestone(orderId, milestoneId, {
      status: 'completed',
      actualExit: now,
    });
  }

  /**
   * Envía una orden a sistema externo
   */
  async sendToExternal(id: string): Promise<Order> {
    // Backend NO tiene /orders/:id/send-external (single). Usamos /bulk-send con un solo ID.
    await apiClient.post(`${API_ENDPOINTS.operations.orders}/bulk-send`, { orderIds: [id] });
    return apiClient.get<Order>(`${API_ENDPOINTS.operations.orders}/${id}`);
  }

  /**
   * Envía múltiples órdenes a sistema externo
   */
  async bulkSendToExternal(payload: BulkSendPayload): Promise<BulkSendResult> {
    // Backend expone /orders/bulk-send (no /bulk-send-external)
    return apiClient.post<BulkSendResult>(`${API_ENDPOINTS.operations.orders}/bulk-send`, payload);
  }

  /**
   * Obtiene lista de clientes para filtros.
   * Reutiliza customersService.getAll() — el backend NO tiene endpoint
   * dedicado de "options", así que tomamos el listado completo y mapeamos al
   * shape mínimo. Si el backend falla con 429/404, devolvemos `[]` para que
   * el filtro se muestre vacío en vez de romper toda la página.
   */
  async getCustomers(): Promise<Array<{ id: string; name: string; code: string }>> {
    try {
      const { customersService } = await import('@/services/master/customers.service');
      const res = await customersService.getAll({ pageSize: 200 });
      return (res.items ?? []).map(c => ({
        id: c.id,
        name: c.name ?? '',
        code: c.code ?? '',
      }));
    } catch (err) {
      console.warn('[OrderService.getCustomers] error, devolviendo []:', err);
      return [];
    }
  }

  /**
   * Obtiene lista de transportistas (operadores logísticos) para filtros.
   */
  async getCarriers(): Promise<Array<{ id: string; name: string }>> {
    try {
      const { operatorsService } = await import('@/services/master/operators.service');
      const list = await operatorsService.getAll();
      return list.map(o => ({
        id: o.id,
        name: o.businessName ?? o.tradeName ?? '',
      }));
    } catch (err) {
      console.warn('[OrderService.getCarriers] error, devolviendo []:', err);
      return [];
    }
  }

  /**
   * Obtiene lista de operadores GPS para filtros.
   * El backend aún no tiene endpoint dedicado de operadores GPS — devolvemos
   * lista vacía para no romper la UI. Cuando el backend lo exponga, conectar
   * aquí (ej. apiClient.get(`${API_ENDPOINTS.operations.gpsOperators}`)).
   */
  async getGPSOperators(): Promise<Array<{ id: string; name: string }>> {
    return [];
  }

  /**
   * Suscribe a eventos de una orden
   */
  subscribe(
    orderId: string,
    callback: (event: OrderRealtimeEvent) => void
  ): () => void {
    if (!this.eventListeners.has(orderId)) {
      this.eventListeners.set(orderId, new Set());
    }

    this.eventListeners.get(orderId)!.add(callback);

    return () => {
      this.eventListeners.get(orderId)?.delete(callback);
    };
  }
}

/**
 * Instancia singleton del servicio de órdenes
 */
export const orderService = new OrderService();

export { OrderService };

export type IOrderService = InstanceType<typeof OrderService>;
