import type {
  Product,
  ProductStats,
  ProductCategory,
  TransportConditions,
  ProductDimensions,
  UnitOfMeasure
} from "@/types/models/product";
import type { EntityStatus } from "@/types/common";
import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import {
  mapProductFromBackend,
  mapProductToBackend,
  type BackendProduct,
} from "@/lib/transformers/product.transformer";

/**
 * Filtros para productos
 */
export interface ProductFilters {
  search?: string;
  category?: ProductCategory | "all";
  status?: EntityStatus | "all";
  requiresRefrigeration?: boolean;
  customerId?: string;
}

/**
 * DTO para crear producto
 */
export interface CreateProductDTO {
  sku: string;
  name: string;
  description?: string;
  category: ProductCategory;
  unitOfMeasure: UnitOfMeasure;
  dimensions?: ProductDimensions;
  transportConditions: TransportConditions;
  /** Carga peligrosa (mapea a `is_hazardous` en el backend). */
  isDangerous?: boolean;
  /** Clasificación de carga peligrosa (ADR / IMDG / etc). */
  hazardousClass?: string;
  barcode?: string;
  unitPrice?: number;
  imageUrl?: string;
  customerId?: string;
  notes?: string;
}

/**
 * DTO para actualizar producto
 */
export interface UpdateProductDTO extends Partial<CreateProductDTO> {
  status?: EntityStatus;
}

/**
 * Respuesta paginada de productos
 */
export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Servicio de Productos
 */
class ProductsService {
  /**
   * Obtiene todos los productos con filtros opcionales
   */
  async getAll(filters?: ProductFilters): Promise<Product[]> {
    const response = await apiClient.get<Record<string, unknown>>(
      API_ENDPOINTS.master.products,
      { params: filters as unknown as Record<string, string> }
    );
    const rawList = ((response.items ?? response.data ?? []) as unknown[])
      .filter((x): x is BackendProduct => typeof x === "object" && x !== null);
    return rawList.map(mapProductFromBackend);
  }

  /**
   * Obtiene productos paginados
   */
  async getPaginated(
    filters?: ProductFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ProductsResponse> {
    const response = await apiClient.get<Record<string, unknown>>(
      API_ENDPOINTS.master.products,
      { params: { ...filters, page, pageSize } as unknown as Record<string, string> }
    );
    const rawList = ((response.items ?? response.data ?? []) as unknown[])
      .filter((x): x is BackendProduct => typeof x === "object" && x !== null);
    const data = rawList.map(mapProductFromBackend);

    const meta = (response.meta ?? response.pagination ?? {}) as Record<string, number>;
    const total = meta.total ?? meta.totalItems ?? data.length;
    const totalPages = meta.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

    return {
      data,
      total,
      page: meta.page ?? page,
      pageSize: meta.pageSize ?? pageSize,
      totalPages,
    };
  }

  /**
   * Obtiene un producto por ID
   */
  async getById(id: string): Promise<Product | null> {
    return this.withMissingEndpointDetection(
      "Detalle producto (GET /master/products/:id)",
      async () => {
        const response = await apiClient.get<Record<string, unknown>>(`${API_ENDPOINTS.master.products}/${id}`);
        const raw = (response.data ?? response) as BackendProduct;
        if (!raw || typeof raw !== "object") return null;
        return mapProductFromBackend(raw);
      }
    );
  }

  /**
   * 2026-05-03: Helper privado para detectar endpoints no implementados.
   * Diagnóstico corregido: NO es bug NGINX, es backend que no implementó la ruta.
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
          `esta ruta NO está implementada en producción.`
        ) as Error & { status?: number; backendNotImplemented?: boolean };
        explanatory.status = 404;
        explanatory.backendNotImplemented = true;
        throw explanatory;
      }
      throw err;
    }
  }

  /**
   * Obtiene un producto por SKU
   */
  async getBySku(sku: string): Promise<Product | null> {
    // NOTE: backend NO tiene /by-sku. Usamos GET /master/products con filtro search.
    const list = await this.fetchListFromBackend({ search: sku });
    return list.find(p => p.sku === sku) ?? null;
  }

  /**
   * Obtiene un producto por código de barras
   */
  async getByBarcode(barcode: string): Promise<Product | null> {
    // NOTE: backend NO tiene /by-barcode. Usamos GET /master/products con filtro search.
    const list = await this.fetchListFromBackend({ search: barcode });
    return list.find(p => p.barcode === barcode) ?? null;
  }

  /**
   * Helper: GET backend + transformer, devuelve array aplanado
   */
  private async fetchListFromBackend(params?: Record<string, unknown>): Promise<Product[]> {
    const response = await apiClient.get<Record<string, unknown>>(
      API_ENDPOINTS.master.products,
      { params: params as Record<string, string> }
    );
    const rawList = ((response.items ?? response.data ?? []) as unknown[])
      .filter((x): x is BackendProduct => typeof x === "object" && x !== null);
    return rawList.map(mapProductFromBackend);
  }

  /**
   * Crea un nuevo producto
   */
  async create(data: CreateProductDTO): Promise<Product> {
    const payload = mapProductToBackend(data as Partial<Product>);
    const response = await apiClient.post<Record<string, unknown>>(API_ENDPOINTS.master.products, payload);
    const raw = (response.data ?? response) as BackendProduct;
    return mapProductFromBackend(raw);
  }

  /**
   * Actualiza un producto existente
   */
  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    const payload = mapProductToBackend(data as Partial<Product>);
    return this.withMissingEndpointDetection(
      "Actualizar producto (PUT /master/products/:id)",
      async () => {
        const response = await apiClient.put<Record<string, unknown>>(`${API_ENDPOINTS.master.products}/${id}`, payload);
        const raw = (response.data ?? response) as BackendProduct;
        return mapProductFromBackend(raw);
      }
    );
  }

  /**
   * Elimina un producto
   */
  async delete(id: string): Promise<boolean> {
    return this.withMissingEndpointDetection(
      "Eliminar producto (DELETE /master/products/:id)",
      () => apiClient.delete(`${API_ENDPOINTS.master.products}/${id}`)
    );
  }

  /**
   * Cambia el estado de un producto
   */
  async changeStatus(id: string, status: EntityStatus): Promise<Product> {
    return this.withMissingEndpointDetection(
      "Cambiar status producto (PATCH /master/products/:id/status)",
      () => apiClient.patch(`${API_ENDPOINTS.master.products}/${id}/status`, { status })
    );
  }

  /**
   * Obtiene estadísticas de productos
   */
  async getStats(): Promise<ProductStats> {
    // BUG #1 backend: /stats devuelve 404 porque el router resuelve /:id antes.
    try {
      return await apiClient.get<ProductStats>(`${API_ENDPOINTS.master.products}/stats`);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        console.warn("[productsService.getStats] backend 404 (BUG #1). Calculando stats client-side.");
        return this.computeStatsFromList();
      }
      throw err;
    }
  }

  /**
   * Calcula stats a partir del listado real (fallback cuando backend /stats falla)
   */
  private async computeStatsFromList(): Promise<ProductStats> {
    try {
      const items = await this.fetchListFromBackend({ pageSize: 200 });
      const byCategory: Record<ProductCategory, number> = {
        general: 0, perecible: 0, peligroso: 0,
        fragil: 0, refrigerado: 0, congelado: 0, granel: 0,
      };
      items.forEach(p => {
        if (p.category in byCategory) byCategory[p.category]++;
      });
      return {
        total: items.length,
        active: items.filter(p => p.status === "active").length,
        inactive: items.filter(p => p.status === "inactive").length,
        byCategory,
      };
    } catch {
      return {
        total: 0, active: 0, inactive: 0,
        byCategory: {
          general: 0, perecible: 0, peligroso: 0,
          fragil: 0, refrigerado: 0, congelado: 0, granel: 0,
        },
      };
    }
  }

  /**
   * Obtiene productos activos (para selects)
   */
  async getActive(): Promise<Product[]> {
    return this.fetchListFromBackend({ status: "active" });
  }

  /**
   * Obtiene productos por categoría
   */
  async getByCategory(category: ProductCategory): Promise<Product[]> {
    return this.fetchListFromBackend({ category });
  }

  /**
   * Obtiene productos que requieren refrigeración
   */
  async getRefrigerated(): Promise<Product[]> {
    return this.fetchListFromBackend({ refrigerated: "true" });
  }

  /**
   * Obtiene productos por cliente
   */
  async getByCustomer(customerId: string): Promise<Product[]> {
    return this.fetchListFromBackend({ customerId });
  }

  /**
   * Busca productos por texto
   */
  async search(query: string): Promise<Product[]> {
    // NOTE: backend NO tiene /search dedicado. Usamos GET /master/products con filtro.
    return this.fetchListFromBackend({ search: query });
  }

  /**
   * Obtiene las categorías disponibles con conteo
   */
  async getCategories(): Promise<Array<{ category: ProductCategory; count: number }>> {
    // NOTE: backend NO tiene /categories. Traemos todos los productos y agrupamos client-side.
    // TODO: pedir al backend que implemente GET /master/products/categories con conteo.
    const all = await this.fetchListFromBackend({ pageSize: 1000 });
    const counts = new Map<ProductCategory, number>();
    for (const p of all) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
  }

  /**
   * Duplica un producto
   */
  async duplicate(id: string): Promise<Product> {
    return apiClient.post(`${API_ENDPOINTS.master.products}/${id}/duplicate`);
  }
}

export const productsService = new ProductsService();
export { ProductsService };
