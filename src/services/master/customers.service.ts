import { BulkService } from "@/services/base.service";
import { API_ENDPOINTS, apiConfig } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import {
  Customer,
  CustomerStats,
  CustomerFilters,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerCategory,
  CustomerOperationalStats
} from "@/types/models";
import type { CreateDTO, UpdateDTO, SearchParams, PaginatedResponse } from "@/types/common";
import {
  mapCustomerFromBackend,
  mapCustomerToBackend,
  type BackendCustomer,
} from "@/lib/transformers/customer.transformer";

/**
 * Genera código único de cliente
 */
function generateCustomerCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CLI-${timestamp}-${random}`;
}

/**
 * Servicio para gestión de Clientes
 *
 */
class CustomersService extends BulkService<Customer> {
  constructor() {
    super(API_ENDPOINTS.master.customers, []);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  OVERRIDES CRUD — aplican transformer backend (snake_case) ↔ frontend (camelCase)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Listado con paginacion. Override para aplicar mapper a cada item.
   */
  async getAll(params?: SearchParams): Promise<PaginatedResponse<Customer>> {
    const queryParams = params
      ? {
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          status: params.status,
        }
      : undefined;

    const response = await apiClient.get<Record<string, unknown>>(this.endpoint, { params: queryParams });
    const rawList = ((response.items ?? response.data ?? []) as unknown[])
      .filter((x): x is BackendCustomer => typeof x === "object" && x !== null);
    const items = rawList.map(mapCustomerFromBackend);

    const meta = (response.meta ?? response.pagination ?? {}) as Record<string, number>;
    const page = meta.page ?? params?.page ?? 1;
    const pageSize = meta.pageSize ?? params?.pageSize ?? items.length;
    const totalItems = meta.total ?? meta.totalItems ?? items.length;
    const totalPages = meta.totalPages ?? 1;

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Obtener por ID — override para aplicar mapper.
   * Bloqueado por bug NGINX :id del backend (lanza error explicativo).
   */
  async getById(id: string): Promise<Customer> {
    return this.withMissingEndpointDetection(
      "Detalle cliente (GET /master/customers/:id)",
      async () => {
        const response = await apiClient.get<Record<string, unknown>>(`${this.endpoint}/${id}`);
        const raw = (response.data ?? response) as BackendCustomer;
        return mapCustomerFromBackend(raw);
      }
    );
  }

  /**
   * Crear — convierte payload a snake_case, response a camelCase.
   *
   * IMPORTANTE: el backend EXIGE `code` como campo obligatorio al crear
   * (sin él responde 422). El formulario UI no captura código manualmente,
   * así que lo generamos aquí si no viene provisto. Verificado por sniff
   * 2026-04-30 contra backend real.
   */
  async create(data: CreateDTO<Customer>): Promise<Customer> {
    const dataWithCode = data as Partial<Customer>;
    if (!dataWithCode.code) {
      dataWithCode.code = generateCustomerCode();
    }
    const payload = mapCustomerToBackend(dataWithCode);
    const response = await apiClient.post<Record<string, unknown>>(this.endpoint, payload);
    const raw = (response.data ?? response) as BackendCustomer;
    return mapCustomerFromBackend(raw);
  }

  /**
   * Actualizar — convierte payload a snake_case, response a camelCase.
   * Bloqueado por bug NGINX :id del backend (lanza error explicativo).
   */
  async update(id: string, data: UpdateDTO<Customer>): Promise<Customer> {
    const payload = mapCustomerToBackend(data as Partial<Customer>);
    return this.withMissingEndpointDetection(
      "Actualizar cliente (PUT /master/customers/:id)",
      async () => {
        const response = await apiClient.put<Record<string, unknown>>(`${this.endpoint}/${id}`, payload);
        const raw = (response.data ?? response) as BackendCustomer;
        return mapCustomerFromBackend(raw);
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  METODOS ESPECIFICOS DEL SERVICE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene clientes con filtros avanzados
   */
  async getFiltered(filters: CustomerFilters, page = 1, pageSize = 10): Promise<PaginatedResponse<Customer>> {
    // API real — backend responde en snake_case, aplicamos mapper a cada item
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "all") {
        queryParams.append(key, String(value));
      }
    });
    queryParams.append("page", String(page));
    queryParams.append("pageSize", String(pageSize));

    const response = await this.request<Record<string, unknown>>(
      "GET",
      `${this.endpoint}?${queryParams}`
    );

    // Backend responde {items: [...], meta: {...}} o {data: [...]}
    const rawList = ((response.items ?? response.data ?? []) as unknown[])
      .filter((x): x is BackendCustomer => typeof x === "object" && x !== null);
    const items = rawList.map(mapCustomerFromBackend);

    const meta = (response.meta ?? response.pagination ?? {}) as Record<string, number>;
    const totalItems = meta.total ?? meta.totalItems ?? items.length;
    const totalPages = meta.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));

    return {
      items,
      pagination: {
        page: meta.page ?? page,
        pageSize: meta.pageSize ?? pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Obtiene estadísticas de clientes.
   *
   * 2026-05-03: Test E2E confirmó que /stats SÍ funciona (status 200).
   * Mantenemos fallback a `computeStatsFromList()` por defensive programming
   * en caso de que el backend tenga downtime intermitente.
   */
  async getStats(): Promise<CustomerStats> {
    try {
      return await this.request<CustomerStats>("GET", `${this.endpoint}/stats`);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404 || status === 500) {
        console.warn(`[customersService.getStats] backend ${status}. Fallback client-side.`);
        return this.computeStatsFromList();
      }
      throw err;
    }
  }

  /**
   * Calcula stats a partir del listado real (fallback cuando backend /stats falla)
   */
  private async computeStatsFromList(): Promise<CustomerStats> {
    try {
      const list = await this.getAll({ page: 1, pageSize: 200 });
      const items = list.items;
      const active = items.filter(c => c.status === "active").length;
      const inactive = items.filter(c => c.status === "inactive").length;

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const newThisMonth = items.filter(
        c => c.createdAt && new Date(c.createdAt) >= thisMonth
      ).length;

      const byCategory: Record<CustomerCategory, number> = {
        standard: 0,
        premium: 0,
        vip: 0,
        wholesale: 0,
        corporate: 0,
        government: 0,
      };
      items.forEach(c => {
        const cat = (c.category || "standard") as CustomerCategory;
        if (cat in byCategory) byCategory[cat]++;
      });

      const totalCreditLimit = items.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
      const totalCreditUsed = items.reduce((sum, c) => sum + (c.creditUsed || 0), 0);

      return {
        total: items.length,
        active,
        inactive,
        newThisMonth,
        byCategory,
        totalCreditLimit,
        totalCreditUsed,
      };
    } catch {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        newThisMonth: 0,
        byCategory: {
          standard: 0,
          premium: 0,
          vip: 0,
          wholesale: 0,
          corporate: 0,
          government: 0,
        },
        totalCreditLimit: 0,
        totalCreditUsed: 0,
      };
    }
  }

  /**
   * 2026-05-03: Helper privado para detectar endpoints no implementados.
   *
   * IMPORTANTE: cambio de diagnóstico. Antes este helper se llamaba
   * `withIdBugDetection` y atribuía los 404 al "bug NGINX". Investigación
   * profunda confirmó que NGINX NO está bloqueando nada (proxea todo al
   * backend). El "Not Found" plain text 9 bytes es el handler 404 default
   * del framework backend cuando la ruta NO está implementada.
   */
  private async withMissingEndpointDetection<T>(
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
   * Crea un nuevo cliente.
   *
   * IMPORTANTE (2026-05-14): el backend EXIGE `code` como campo obligatorio
   * al crear — sin él responde 422 "Unprocessable Content". El formulario UI
   * no captura código manualmente, así que lo generamos aquí si no viene
   * provisto. Verificado contra DB real (existen códigos como CUST-BRUNO-894,
   * PROBE-individual-208, CUST-TEST-086184, etc.).
   */
  async createCustomer(data: CreateCustomerDTO): Promise<Customer> {
    const dataWithCode = data as Partial<Customer>;
    if (!dataWithCode.code) {
      dataWithCode.code = generateCustomerCode();
    }
    // Backend espera snake_case. Convertimos payload + response con transformer.
    const payload = mapCustomerToBackend(dataWithCode);
    const response = await this.request<Record<string, unknown>>("POST", this.endpoint, payload);
    const raw = (response.data ?? response) as BackendCustomer;
    return mapCustomerFromBackend(raw);
  }

  /**
   * Actualiza un cliente existente. Bloqueado por bug NGINX :id del backend.
   */
  async updateCustomer(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    const payload = mapCustomerToBackend(data as Partial<Customer>);
    return this.withMissingEndpointDetection(
      "Actualizar cliente (PUT /master/customers/:id)",
      async () => {
        const response = await this.request<Record<string, unknown>>("PUT", `${this.endpoint}/${id}`, payload);
        const raw = (response.data ?? response) as BackendCustomer;
        return mapCustomerFromBackend(raw);
      }
    );
  }

  /**
   * Elimina un cliente. Bloqueado por bug NGINX :id del backend.
   */
  async deleteCustomer(id: string): Promise<void> {
    return this.withMissingEndpointDetection(
      "Eliminar cliente (DELETE /master/customers/:id)",
      () => this.request<void>("DELETE", `${this.endpoint}/${id}`)
    );
  }

  /**
   * Elimina múltiples clientes
   *
   * @param ids - Array de IDs de clientes a eliminar
   * @returns Resultado con éxitos y errores
   */
  async bulkDeleteCustomers(ids: string[]): Promise<{
    success: string[];
    failed: { id: string; reason: string }[];
  }> {
    return this.request<{ success: string[]; failed: { id: string; reason: string }[] }>(
      "DELETE",
      // Excel: POST /bulk-delete (no /bulk)
      `${this.endpoint}/bulk-delete`,
      { ids }
    );
  }

  /**
   * Cambia el estado de un cliente. Bloqueado por bug NGINX :id del backend.
   */
  async toggleStatus(id: string): Promise<Customer> {
    return this.withMissingEndpointDetection(
      "Cambiar status cliente (POST /master/customers/:id/toggle-status)",
      async () => {
        const response = await this.request<Record<string, unknown>>(
          "POST",
          `${this.endpoint}/${id}/toggle-status`
        );
        const raw = (response.data ?? response) as BackendCustomer;
        return mapCustomerFromBackend(raw);
      }
    );
  }

  /**
   * Busca clientes por documento
   */
  async findByDocument(documentNumber: string): Promise<Customer | null> {
    // Backend expone /find-by-document con query param (Excel), no path param.
    try {
      const response = await this.request<Record<string, unknown>>(
        "GET",
        `${this.endpoint}/find-by-document?documentNumber=${encodeURIComponent(documentNumber)}`
      );
      const raw = (response.data ?? response) as BackendCustomer | null;
      if (!raw || !raw.id) return null;
      return mapCustomerFromBackend(raw);
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  /**
   * Obtiene ciudades únicas de los clientes
   */
  async getCities(): Promise<string[]> {
    return this.request<string[]>("GET", `${this.endpoint}/cities`);
  }

  /**
   * Importa múltiples clientes desde CSV/Excel
   */
  async importCustomers(customers: CreateCustomerDTO[]): Promise<{
    success: string[];
    failed: { row: number; message: string }[];
  }> {
    // Producción: llamada al API
    return this.request("POST", `${this.endpoint}/import`, customers);
  }

  /**
   * Exporta clientes a CSV.
   *
   * 2026-05-03: corregido. Antes usaba `fetch(this.endpoint/export/csv)` con
   * URL relativa, lo cual no funciona porque `this.endpoint` empieza con `/`
   * pero NO incluye el baseUrl (`apiConfig.baseUrl = /api/v1`). Tampoco enviaba
   * el token de autenticación, por lo que el backend devolvería 401.
   *
   * Ahora construye la URL completa con `apiConfig.baseUrl` y envía el JWT.
   * Verificado contra producción: GET /api/v1/master/customers/export/csv → 200
   * con Content-Type: text/csv y filename "customers.csv" en Content-Disposition.
   *
   * Filtros se serializan como query params (backend puede ignorarlos hoy pero
   * el contrato queda preparado).
   */
  async exportToCSV(filters?: CustomerFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null && v !== "") {
          params.append(k, String(v));
        }
      }
    }
    const query = params.toString();
    const url = `${apiConfig.baseUrl}${this.endpoint}/export/csv${query ? `?${query}` : ""}`;

    const token = typeof window !== "undefined"
      ? localStorage.getItem("tms_access_token") ?? localStorage.getItem("accessToken")
      : null;

    const response = await fetch(url, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      throw new Error(`Export CSV falló: HTTP ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Request helper para métodos adicionales
   */
  private async request<T>(method: string, endpoint: string, data?: unknown): Promise<T> {
    const { apiClient } = await import("@/lib/api");

    switch (method) {
      case "GET":
        return apiClient.get<T>(endpoint);
      case "POST":
        return apiClient.post<T>(endpoint, data);
      case "PUT":
        return apiClient.put<T>(endpoint, data);
      case "PATCH":
        return apiClient.patch<T>(endpoint, data);
      case "DELETE":
        return apiClient.delete(endpoint) as T;
      default:
        return apiClient.get<T>(endpoint);
    }
  }

  /**
   * Obtiene estadísticas operativas de un cliente.
   *
   * 2026-05-03: el endpoint `/master/customers/:id/operational-stats` NO está
   * en el Excel oficial (frontend lo inventó) y producción devuelve 404.
   * Como workaround, calculamos las stats client-side desde el listado de
   * órdenes filtradas por customerId (que SI funciona).
   */
  async getOperationalStats(customerId: string): Promise<CustomerOperationalStats> {
    try {
      // 2026-05-03 (issue HIGH #7): el listado de orders del backend devuelve
      // los pesos en distintos campos (`weightKg`, `cargo.totalWeight`, o
      // `cargo_weight_kg`). Antes solo leíamos `o.weight` que NO existe;
      // resultado: totalVolumeKg siempre era 0. Ahora leemos varios candidatos
      // tolerando shapes (snake_case del backend, camelCase del transformer,
      // sub-objeto `cargo`).
      type OrderShape = {
        status?: string;
        weightKg?: number;
        weight_kg?: number;
        cargo_weight_kg?: number;
        cargo?: { totalWeight?: number; weight_kg?: number };
        created_at?: string;
        createdAt?: string;
        completed_at?: string;
        completedAt?: string;
      };
      const ordersResponse = await this.request<{
        data?: OrderShape[];
        items?: OrderShape[];
      }>("GET", `/orders?customerId=${customerId}&pageSize=200`);

      const orders = ordersResponse.data ?? ordersResponse.items ?? [];
      const completed = orders.filter(o => o.status === "completed").length;
      const cancelled = orders.filter(o => o.status === "cancelled").length;
      const totalVolumeKg = orders.reduce((sum, o) => {
        const weight =
          o.weightKg ??
          o.weight_kg ??
          o.cargo_weight_kg ??
          o.cargo?.totalWeight ??
          o.cargo?.weight_kg ??
          0;
        return sum + weight;
      }, 0);
      const lastOrder = orders[0];

      return {
        totalOrders: orders.length,
        completedOrders: completed,
        cancelledOrders: cancelled,
        onTimeDeliveryRate: 0,             // requiere comparar fechas programadas vs reales
        totalVolumeKg,
        lastOrderDate: lastOrder?.createdAt ?? lastOrder?.created_at ?? undefined,
        totalBilledAmount: 0,              // no disponible sin endpoint de finance
      } as CustomerOperationalStats;
    } catch (err) {
      console.warn(
        `[customersService.getOperationalStats] fallback fallo (${(err as Error).message}). ` +
        `Devolviendo stats vacías.`
      );
      return {
        totalOrders: 0, completedOrders: 0, cancelledOrders: 0,
        onTimeDeliveryRate: 0, totalVolumeKg: 0,
        lastOrderDate: undefined, totalBilledAmount: 0,
      } as CustomerOperationalStats;
    }
  }

  /**
   * Obtiene historial de órdenes de un cliente.
   *
   * 2026-05-03: el endpoint `/master/customers/:id/orders` NO está en el
   * Excel y producción devuelve 404. Reemplazado por `GET /orders?customerId=X`
   * (que SÍ está en el Excel y funciona, verificado en producción).
   */
  async getOrderHistory(
    customerId: string,
    options: {
      limit?: number;
      status?: string[];
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    orders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      createdAt: string;
      completedAt?: string;
      totalWeight?: number;
    }>;
    summary: {
      total: number;
      completed: number;
      inProgress: number;
      cancelled: number;
    };
  }> {
    const params = new URLSearchParams();
    params.append("customerId", customerId);
    if (options.limit) params.append("pageSize", String(options.limit));
    if (options.status) options.status.forEach(s => params.append("status", s));
    if (options.startDate) params.append("startDate", options.startDate);
    if (options.endDate) params.append("endDate", options.endDate);

    const response = await this.request<{
      data?: Array<{ id: string; orderNumber: string; status: string; createdAt: string; completedAt?: string; totalWeight?: number }>;
      items?: Array<{ id: string; orderNumber: string; status: string; createdAt: string; completedAt?: string; totalWeight?: number }>;
    }>("GET", `/orders?${params.toString()}`);

    const orders = response.data ?? response.items ?? [];
    return {
      orders,
      summary: {
        total: orders.length,
        completed: orders.filter(o => o.status === "completed").length,
        inProgress: orders.filter(o => ["assigned","in_transit","picked_up"].includes(o.status)).length,
        cancelled: orders.filter(o => o.status === "cancelled").length,
      },
    };
  }

  /**
   * Refresh de stats operacionales.
   *
   * 2026-05-03: ELIMINADO el endpoint inventado `POST /:id/refresh-stats`
   * (no está en Excel; producción devuelve 404). Ahora simplemente reinvoca
   * `getOperationalStats()` que recalcula client-side desde /orders.
   */
  async refreshOperationalStats(customerId: string): Promise<CustomerOperationalStats> {
    return this.getOperationalStats(customerId);
  }
}

/** Instancia singleton del servicio */
export const customersService = new CustomersService();
