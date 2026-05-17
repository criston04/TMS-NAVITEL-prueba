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
import { orderEvents } from '@/services/integration/order-events';
import { API_ENDPOINTS } from '@/config/api.config';
import { apiClient } from '@/lib/api';
import { safeCall } from '@/services/missing-endpoint-helper';
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
   * Obtiene órdenes con filtros y paginación.
   *
   * 2026-05-05 (bug fix): antes calculabamos statusCounts iterando sobre
   * la lista PAGINADA (10 items) lo cual hacia que las KPI cards mostraran
   * "Total ordenes: 10" cuando en realidad habia 34. Ahora traemos en
   * paralelo /orders/stats que devuelve byStatus con totales reales de
   * TODA la base. Si /stats falla (404, 500), caemos al calculo local.
   */
  async getOrders(filters: OrderFilters = {}): Promise<OrdersResponse> {
    const [response, statsResponse] = await Promise.all([
      apiClient.get<Record<string, unknown>>(
        API_ENDPOINTS.operations.orders,
        { params: filters as unknown as Record<string, string> }
      ),
      // Traer stats globales en paralelo. safeCall devuelve null si el
      // endpoint no existe o falla, asi que el listado sigue funcionando.
      safeCall(
        "GET /orders/stats",
        () => apiClient.get<Record<string, unknown>>(
          `${API_ENDPOINTS.operations.orders}/stats`
        ),
        null as Record<string, unknown> | null
      ),
    ]);

    const meta = (response.meta ?? response.pagination ?? {}) as Record<string, number>;
    const rawList = (response.items ?? response.data ?? []) as unknown[];
    const list: Order[] = rawList
      .filter((x): x is BackendOrder => typeof x === "object" && x !== null)
      .map(mapOrderFromBackend);

    const pageSize = (response.pageSize as number) ?? meta.pageSize ?? filters.pageSize ?? 10;
    const page = (response.page as number) ?? meta.page ?? filters.page ?? 1;

    // statusCounts: prioridad de fuentes (de mas confiable a menos):
    //   1. /orders/stats response.byStatus (totales reales)
    //   2. response.statusCounts (si el backend lo agrega al list endpoint)
    //   3. Conteo local de la pagina actual (fallback)
    const statsData = (statsResponse?.data ?? statsResponse) as Record<string, unknown> | null;
    const byStatusFromStats = statsData?.byStatus as Record<OrderStatus, number> | undefined;
    const totalFromStats = statsData?.total as number | undefined ?? statsData?.totalOrders as number | undefined;

    const statusCounts: Record<OrderStatus, number> = byStatusFromStats
      ?? (response.statusCounts as Record<OrderStatus, number>)
      ?? {
        draft: 0, pending: 0, assigned: 0, in_transit: 0,
        at_milestone: 0, delayed: 0, completed: 0, closed: 0, cancelled: 0,
      };
    if (!byStatusFromStats && !response.statusCounts) {
      for (const order of list) {
        if (order.status && order.status in statusCounts) {
          statusCounts[order.status]++;
        }
      }
    }

    // Total: prioridad similar
    //   1. /orders/stats.total (mas confiable, total real)
    //   2. response.total / meta.total (del list endpoint)
    //   3. list.length (fallback de la pagina)
    const total = totalFromStats ?? (response.total as number) ?? meta.total ?? list.length;
    const totalPages = (response.totalPages as number) ?? meta.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

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

  /*
   * 2026-05-06: METODOS ELIMINADOS (codigo muerto, ningun consumidor).
   *
   * Eliminados:
   *  - getOrderByNumber(orderNumber)        ← /orders/by-number/:n (404)
   *  - getStatusCounts()                    ← /orders/status-counts (404)
   *  - getOrdersByDriver(driverId, opts)    ← /orders/by-driver/:id (404)
   *  - getOrdersByVehicle(vehicleId, opts)  ← /orders/by-vehicle/:id (404)
   *
   * Por que se eliminaron:
   *  1. Ninguno de estos metodos era llamado desde la UI:
   *     - getStatusCounts: sin consumidor.
   *     - getOrdersByDriver: solo usado por useDriverOrderHistory hook
   *       (eliminado tambien) que no se importaba en ningun componente.
   *     - getOrdersByVehicle: sin consumidor.
   *     - getOrderByNumber: la busqueda por numero usa GET /orders?search=X
   *       directamente desde el filtro de la pagina /orders.
   *  2. Los 4 endpoints estan documentados en OPERACIONES_AL_DETALLE.md
   *     (secciones 2.9, 2.10, 2.11, 2.12) pero el backend solo los implementa
   *     en path `/operations/orders/X` (no `/orders/X` como dice doc).
   *  3. Habian quedado como deuda historica con fallbacks via querystring,
   *     que la UI no usaba.
   *
   * Cuando el backend estandarice el path canonico `/orders/X` y la UI
   * necesite estas vistas (historial por conductor/vehiculo, busqueda
   * directa por numero, contadores), volveremos a agregarlas siguiendo
   * la doc fielmente.
   */

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
    const order = mapOrderFromBackend(raw);

    // 2026-05-05: integracion cross-module. El hub de integracion escucha
    // 'order:created' para registrar la orden en monitoring, notificaciones
    // y dashboard. Sin este publish, esos modulos quedaban ciegos.
    orderEvents.created(order);

    return order;
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
   *
   * 2026-05-05: si el update incluye un cambio de status, publicamos
   * 'order:status_changed' al bus para que monitoring/notificaciones reaccionen.
   * Capturamos el status previo desde la response del backend (que devuelve
   * la orden ANTES del update si esta es la primera mutation) o leemos antes.
   */
  async updateOrder(id: string, data: UpdateOrderDTO): Promise<Order> {
    const payload = mapOrderToBackend(data);

    // Para detectar cambio de status, leemos el status previo si el update
    // contiene status. Si no hay cambio de status, no hay overhead extra.
    let previousStatus: string | undefined;
    if (data.status) {
      try {
        const before = await this.getOrderById(id);
        previousStatus = before?.status;
      } catch {
        // si falla la lectura previa, seguimos sin emitir status_changed
        previousStatus = undefined;
      }
    }

    return this.withBugDetection("Actualizar orden (PATCH /orders/:id)", async () => {
      const response = await apiClient.patch<Record<string, unknown>>(
        `${API_ENDPOINTS.operations.orders}/${id}`,
        payload
      );
      const raw = (response.data ?? response) as BackendOrder;
      const updated = mapOrderFromBackend(raw);

      // Emit eventos relevantes
      if (previousStatus && previousStatus !== updated.status) {
        orderEvents.statusChanged(updated, previousStatus);
        if (updated.status === "completed") orderEvents.completed(updated);
        if (updated.status === "cancelled") orderEvents.cancelled(updated);
      }

      return updated;
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
   * Cambia el estado de una orden.
   *
   * 2026-05-05 (bug fix CRITICO): antes esto delegaba a `updateOrder` que
   * llama a `PATCH /orders/:id` (endpoint generico). El backend IGNORA el
   * campo `status` en ese endpoint — solo respeta cambios de status si
   * vienen al endpoint dedicado `PATCH /orders/:id/status`. El sintoma:
   * la API respondia 200 OK pero el status NO cambiaba en la BD, y la UI
   * mostraba "Orden enviada" pero la orden seguia en draft.
   *
   * Ahora usa el endpoint correcto y publica `order:status_changed` al bus.
   */
  async changeStatus(
    id: string,
    newStatus: OrderStatus,
    _reason?: string
  ): Promise<Order> {
    // Capturar status previo para el evento del bus
    let previousStatus: string | undefined;
    try {
      const before = await this.getOrderById(id);
      previousStatus = before?.status;
    } catch {
      previousStatus = undefined;
    }

    return this.withBugDetection(
      `Cambiar status (PATCH /orders/:id/status → ${newStatus})`,
      async () => {
        const response = await apiClient.patch<Record<string, unknown>>(
          `${API_ENDPOINTS.operations.orders}/${id}/status`,
          { status: newStatus }
        );
        const raw = (response.data ?? response) as BackendOrder;
        const updated = mapOrderFromBackend(raw);

        // Emitir eventos al bus
        if (previousStatus && previousStatus !== updated.status) {
          orderEvents.statusChanged(updated, previousStatus);
          if (updated.status === "completed") orderEvents.completed(updated);
          if (updated.status === "cancelled") orderEvents.cancelled(updated);
        }

        return updated;
      }
    );
  }

  /**
   * Asigna vehículo y conductor a una orden. Bloqueado por bug del backend.
   *
   * 2026-05-05: emite 'order:assigned' al bus tras una asignacion exitosa.
   * El backend cambia el status a 'assigned' como side-effect; capturamos el
   * status previo para emitir tambien 'order:status_changed'.
   */
  async assignVehicleAndDriver(
    id: string,
    vehicleId: string,
    driverId: string
  ): Promise<Order> {
    let previousStatus: string | undefined;
    try {
      const before = await this.getOrderById(id);
      previousStatus = before?.status;
    } catch {
      previousStatus = undefined;
    }

    return this.withBugDetection("Asignar recursos (PATCH /orders/:id/assign)", async () => {
      const response = await apiClient.patch<Record<string, unknown>>(
        `${API_ENDPOINTS.operations.orders}/${id}/assign`,
        { vehicle_id: vehicleId, driver_id: driverId }
      );
      const raw = (response.data ?? response) as BackendOrder;
      const assigned = mapOrderFromBackend(raw);
      orderEvents.assigned(assigned, previousStatus ?? assigned.status);
      return assigned;
    });
  }

  /**
   * Inicia el viaje de una orden. Bloqueado por bug del backend.
   *
   * 2026-05-05: emite 'order:status_changed' al bus (assigned -> in_transit)
   * para que monitoring empiece a trackear el vehiculo.
   */
  async startTrip(id: string): Promise<Order> {
    return this.withBugDetection("Iniciar viaje (PATCH /orders/:id/status)", async () => {
      const response = await apiClient.patch<Record<string, unknown>>(
        `${API_ENDPOINTS.operations.orders}/${id}/status`,
        { status: 'in_transit' }
      );
      const raw = (response.data ?? response) as BackendOrder;
      const inTransit = mapOrderFromBackend(raw);
      orderEvents.statusChanged(inTransit, "assigned");
      return inTransit;
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

    // 2026-05-05 (bug fix): aplicar mapOrderFromBackend para que la response
    // venga en shape camelCase nested (no raw snake_case del backend).
    const closedOrder = await this.withBugDetection(
      "Cerrar orden (POST /orders/:id/close)",
      async () => {
        const response = await apiClient.post<Record<string, unknown>>(
          `${API_ENDPOINTS.operations.orders}/${id}/close`,
          closureData
        );
        const raw = (response.data ?? response) as BackendOrder;
        return mapOrderFromBackend(raw);
      }
    );

    // 2026-05-05: migrado al helper centralizado orderEvents.closed
    // (antes se construia el payload inline aqui — ahora un solo lugar
    // en order-events.ts mantiene el shape estandar).
    orderEvents.closed(closedOrder, closureData.closedBy);

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
    // 2026-05-05 (bug fix): aplicar mapOrderFromBackend para evitar que el
    // state quede con shape raw del backend (causa crashes de createdAt y
    // cargo undefined al re-renderizar).
    return this.withBugDetection(
      "Actualizar hito (PATCH /orders/:id/milestones/:milestoneId)",
      async () => {
        const response = await apiClient.patch<Record<string, unknown>>(
          `${API_ENDPOINTS.operations.orders}/${orderId}/milestones/${milestoneId}`,
          data
        );
        const raw = (response.data ?? response) as BackendOrder;
        return mapOrderFromBackend(raw);
      }
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
    // 2026-05-05 (bug fix): la respuesta raw del backend viene en snake_case
    // y flat (created_at, total_weight, etc.) pero el frontend espera shape
    // camelCase nested (createdAt, cargo.weightKg, etc.). Sin el transformer
    // el state queda corrupto y crashea formatDate(order.createdAt) y similares.
    const response = await apiClient.get<Record<string, unknown>>(
      `${API_ENDPOINTS.operations.orders}/${id}`
    );
    const raw = (response.data ?? response) as BackendOrder;
    return mapOrderFromBackend(raw);
  }

  /**
   * Envia una orden de forma INTELIGENTE.
   *
   * 2026-05-05: nuevo metodo que cubre el caso comun "el usuario quiere
   * enviar una orden recien creada que esta en draft". Antes el flujo era:
   *   1. Cambiar manualmente status a pending (PATCH /:id/status)
   *   2. Click en "Enviar" (POST /bulk-send)
   * Pero el botón "Enviar" solo aparecía con status=pending|assigned, asi
   * que en draft quedaba bloqueado.
   *
   * Comportamiento:
   *   - draft     → PATCH /:id/status pending → POST /bulk-send → GET /:id
   *   - pending   → POST /bulk-send → GET /:id
   *   - assigned  → POST /bulk-send → GET /:id
   *   - otros     → throw (no se puede enviar)
   *
   * Cuando el backend implemente `POST /orders/:id/send` unificado, este
   * metodo se reduce a un solo call. Ver propuesta en mensaje al backend.
   */
  async sendSmart(id: string): Promise<Order> {
    // Leemos el status actual para decidir el flujo
    const current = await this.getOrderById(id);
    if (!current) {
      throw new Error("Orden no encontrada");
    }

    const status = current.status;
    if (status === "closed" || status === "cancelled" || status === "completed") {
      throw new Error(
        `No se puede enviar una orden en estado "${status}". Solo se pueden enviar ordenes en borrador, pendientes o asignadas.`
      );
    }

    // Si esta en draft, primero cambiamos a pending
    if (status === "draft") {
      // Validacion minima: debe tener customer y al menos origin/destination
      const hasMinimalData =
        current.customerId &&
        current.milestones.length >= 2 &&
        current.milestones[0]?.address &&
        current.milestones[current.milestones.length - 1]?.address;

      if (!hasMinimalData) {
        throw new Error(
          "Faltan datos requeridos: cliente, direccion de origen y direccion de destino son obligatorios para enviar."
        );
      }

      // 2026-05-05 (bug fix): usar changeStatus que ya hace PATCH /:id/status
      // (endpoint dedicado). Antes usaba updateOrder que va al endpoint
      // generico /orders/:id donde el backend ignora el campo status.
      // changeStatus tambien emite order:status_changed al bus.
      await this.changeStatus(id, "pending");
    }

    // Llamamos a sendToExternal que hace POST /bulk-send + GET /:id
    return this.sendToExternal(id);
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
