import type { 
  Product, 
  ProductStats, 
  ProductCategory, 
  TransportConditions,
  ProductDimensions,
  UnitOfMeasure
} from "@/types/models/product";
import type { EntityStatus } from "@/types/common";
import { productsMock, filterProducts } from "@/mocks/master/products.mock";
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

// Simulación de delay de red
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let productsState = [...productsMock];

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
  private readonly useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Obtiene todos los productos con filtros opcionales
   */
  async getAll(filters?: ProductFilters): Promise<Product[]> {
    if (this.useMocks) {
      await delay(300);

      let result = [...productsState];

      if (filters) {
        result = filterProducts(result, {
          search: filters.search,
          category: filters.category,
          status: filters.status,
        });

        if (filters.requiresRefrigeration !== undefined) {
          result = result.filter(
            p => p.transportConditions.requiresRefrigeration === filters.requiresRefrigeration
          );
        }

        if (filters.customerId) {
          result = result.filter(p => p.customerId === filters.customerId);
        }
      }

      return result;
    }

    return apiClient.get(API_ENDPOINTS.master.products, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene productos paginados
   */
  async getPaginated(
    filters?: ProductFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ProductsResponse> {
    if (this.useMocks) {
      await delay(300);

      const all = await this.getAll(filters);
      const total = all.length;
      const totalPages = Math.ceil(total / pageSize);
      const start = (page - 1) * pageSize;
      const data = all.slice(start, start + pageSize);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages,
      };
    }

    return apiClient.get(API_ENDPOINTS.master.products, { params: { ...filters, page, pageSize } as unknown as Record<string, string> });
  }

  /**
   * Obtiene un producto por ID
   */
  async getById(id: string): Promise<Product | null> {
    if (this.useMocks) {
      await delay(200);
      return productsState.find(p => p.id === id) || null;
    }

    return apiClient.get(`${API_ENDPOINTS.master.products}/${id}`);
  }

  /**
   * Obtiene un producto por SKU
   */
  async getBySku(sku: string): Promise<Product | null> {
    if (this.useMocks) {
      await delay(200);
      return productsState.find(p => p.sku === sku) || null;
    }

    return apiClient.get(`${API_ENDPOINTS.master.products}/by-sku/${sku}`);
  }

  /**
   * Obtiene un producto por código de barras
   */
  async getByBarcode(barcode: string): Promise<Product | null> {
    if (this.useMocks) {
      await delay(200);
      return productsState.find(p => p.barcode === barcode) || null;
    }

    return apiClient.get(`${API_ENDPOINTS.master.products}/by-barcode/${barcode}`);
  }

  /**
   * Crea un nuevo producto
   */
  async create(data: CreateProductDTO): Promise<Product> {
    if (this.useMocks) {
      await delay(400);

      // Validar SKU único
      const existingSku = productsState.find(p => p.sku === data.sku);
      if (existingSku) {
        throw new Error("Ya existe un producto con ese SKU");
      }

      // Validar código de barras único si se proporciona
      if (data.barcode) {
        const existingBarcode = productsState.find(p => p.barcode === data.barcode);
        if (existingBarcode) {
          throw new Error("Ya existe un producto con ese código de barras");
        }
      }

      const now = new Date().toISOString();
      const newId = `prod-${String(productsState.length + 1).padStart(3, "0")}`;

      const newProduct: Product = {
        id: newId,
        sku: data.sku,
        name: data.name,
        description: data.description,
        category: data.category,
        unitOfMeasure: data.unitOfMeasure,
        dimensions: data.dimensions,
        transportConditions: data.transportConditions,
        barcode: data.barcode,
        unitPrice: data.unitPrice,
        imageUrl: data.imageUrl,
        customerId: data.customerId,
        notes: data.notes,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      productsState = [...productsState, newProduct];
      return newProduct;
    }

    return apiClient.post(API_ENDPOINTS.master.products, data);
  }

  /**
   * Actualiza un producto existente
   */
  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    if (this.useMocks) {
      await delay(400);

      const index = productsState.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error("Producto no encontrado");
      }

      // Validar SKU único si se está cambiando
      if (data.sku && data.sku !== productsState[index].sku) {
        const existing = productsState.find(p => p.sku === data.sku);
        if (existing) {
          throw new Error("Ya existe un producto con ese SKU");
        }
      }

      // Validar código de barras único si se está cambiando
      if (data.barcode && data.barcode !== productsState[index].barcode) {
        const existing = productsState.find(p => p.barcode === data.barcode);
        if (existing) {
          throw new Error("Ya existe un producto con ese código de barras");
        }
      }

      const now = new Date().toISOString();
      const updated: Product = {
        ...productsState[index],
        ...data,
        updatedAt: now,
      };

      productsState = [
        ...productsState.slice(0, index),
        updated,
        ...productsState.slice(index + 1),
      ];

      return updated;
    }

    return apiClient.put(`${API_ENDPOINTS.master.products}/${id}`, data);
  }

  /**
   * Elimina un producto
   */
  async delete(id: string): Promise<boolean> {
    if (this.useMocks) {
      await delay(300);

      const index = productsState.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error("Producto no encontrado");
      }

      productsState = [
        ...productsState.slice(0, index),
        ...productsState.slice(index + 1),
      ];

      return true;
    }

    return apiClient.delete(`${API_ENDPOINTS.master.products}/${id}`);
  }

  /**
   * Cambia el estado de un producto
   */
  async changeStatus(id: string, status: EntityStatus): Promise<Product> {
    if (this.useMocks) {
      return this.update(id, { status });
    }

    return apiClient.patch(`${API_ENDPOINTS.master.products}/${id}/status`, { status });
  }

  /**
   * Obtiene estadísticas de productos
   */
  async getStats(): Promise<ProductStats> {
    if (this.useMocks) {
      await delay(200);

      const total = productsState.length;
      const active = productsState.filter(p => p.status === "active").length;
      const inactive = productsState.filter(p => p.status === "inactive").length;

      const byCategory: Record<ProductCategory, number> = {
        general: 0,
        perecible: 0,
        peligroso: 0,
        fragil: 0,
        refrigerado: 0,
        congelado: 0,
        granel: 0,
      };

      productsState.forEach(p => {
        byCategory[p.category]++;
      });

      return {
        total,
        active,
        inactive,
        byCategory,
      };
    }

    return apiClient.get(`${API_ENDPOINTS.master.products}/stats`);
  }

  /**
   * Obtiene productos activos (para selects)
   */
  async getActive(): Promise<Product[]> {
    if (this.useMocks) {
      await delay(200);
      return productsState.filter(p => p.status === "active");
    }

    return apiClient.get(API_ENDPOINTS.master.products, { params: { status: "active" } });
  }

  /**
   * Obtiene productos por categoría
   */
  async getByCategory(category: ProductCategory): Promise<Product[]> {
    if (this.useMocks) {
      await delay(200);
      return productsState.filter(p => p.category === category && p.status === "active");
    }

    return apiClient.get(API_ENDPOINTS.master.products, { params: { category } });
  }

  /**
   * Obtiene productos que requieren refrigeración
   */
  async getRefrigerated(): Promise<Product[]> {
    if (this.useMocks) {
      await delay(200);
      return productsState.filter(
        p => p.transportConditions.requiresRefrigeration && p.status === "active"
      );
    }

    return apiClient.get(API_ENDPOINTS.master.products, { params: { refrigerated: "true" } });
  }

  /**
   * Obtiene productos por cliente
   */
  async getByCustomer(customerId: string): Promise<Product[]> {
    if (this.useMocks) {
      await delay(200);
      return productsState.filter(p => p.customerId === customerId);
    }

    return apiClient.get(API_ENDPOINTS.master.products, { params: { customerId } });
  }

  /**
   * Busca productos por texto
   */
  async search(query: string): Promise<Product[]> {
    if (this.useMocks) {
      await delay(200);

      if (!query || query.length < 2) return [];

      const queryLower = query.toLowerCase();
      return productsState.filter(
        p =>
          p.name.toLowerCase().includes(queryLower) ||
          p.sku.toLowerCase().includes(queryLower) ||
          p.description?.toLowerCase().includes(queryLower) ||
          p.barcode?.includes(query)
      );
    }

    return apiClient.get(`${API_ENDPOINTS.master.products}/search`, { params: { q: query } });
  }

  /**
   * Obtiene las categorías disponibles con conteo
   */
  async getCategories(): Promise<Array<{ category: ProductCategory; count: number }>> {
    if (this.useMocks) {
      await delay(200);

      const categories: ProductCategory[] = [
        "general",
        "perecible",
        "peligroso",
        "fragil",
        "refrigerado",
        "congelado",
        "granel",
      ];

      return categories.map(category => ({
        category,
        count: productsState.filter(p => p.category === category).length,
      }));
    }

    return apiClient.get(`${API_ENDPOINTS.master.products}/categories`);
  }

  /**
   * Duplica un producto
   */
  async duplicate(id: string): Promise<Product> {
    if (this.useMocks) {
      await delay(400);

      const original = await this.getById(id);
      if (!original) {
        throw new Error("Producto no encontrado");
      }

      const now = new Date().toISOString();
      const newId = `prod-${String(productsState.length + 1).padStart(3, "0")}`;
      const newSku = `${original.sku}-COPY`;

      const duplicated: Product = {
        ...original,
        id: newId,
        sku: newSku,
        name: `${original.name} (Copia)`,
        barcode: undefined,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      productsState = [...productsState, duplicated];
      return duplicated;
    }

    return apiClient.post(`${API_ENDPOINTS.master.products}/${id}/duplicate`);
  }
}

export const productsService = new ProductsService();
export { ProductsService };
