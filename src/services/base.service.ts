import { apiClient } from "@/lib/api";
import { apiConfig } from "@/config/api.config";
import {
  BaseEntity,
  PaginatedResponse,
  SearchParams,
  CreateDTO,
  UpdateDTO,
  ImportResult,
  ExportOptions,
} from "@/types/common";

/**
 * Interfaz que deben implementar todos los servicios
 */
export interface IBaseService<T extends BaseEntity> {
  getAll(params?: SearchParams): Promise<PaginatedResponse<T>>;
  getById(id: string): Promise<T>;
  create(data: CreateDTO<T>): Promise<T>;
  update(id: string, data: UpdateDTO<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

/**
 * Interfaz para servicios con importación/exportación
 */
export interface IBulkService<T extends BaseEntity> extends IBaseService<T> {
  importBulk(file: File): Promise<ImportResult>;
  exportData(options: ExportOptions): Promise<Blob>;
  bulkDelete(ids: string[]): Promise<void>;
}

/**
 * Clase base abstracta para servicios CRUD
 * 
 * @template T - Tipo de la entidad
 * @template TMock - Tipo del servicio mock
 * 
 */
export abstract class BaseService<T extends BaseEntity> implements IBaseService<T> {
  /** Endpoint de la API */
  protected readonly endpoint: string;
  
  /** Datos mock para desarrollo */
  protected readonly mockData: T[];
  
  /** Si está usando mocks */
  protected readonly useMocks: boolean;

  constructor(endpoint: string, mockData: T[] = []) {
    this.endpoint = endpoint;
    this.mockData = mockData;
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Simula delay de red para mocks
   */
  protected async simulateDelay(ms: number = 500): Promise<void> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  /**
   * Obtiene todos los registros con paginación
   */
  async getAll(params?: SearchParams): Promise<PaginatedResponse<T>> {
    if (this.useMocks) {
      await this.simulateDelay();
      return this.getMockPaginated(params);
    }
    
    // Convertir SearchParams a Record para la API
    const queryParams = params ? {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status: params.status,
    } : undefined;
    
    return apiClient.get<PaginatedResponse<T>>(this.endpoint, { params: queryParams });
  }

  /**
   * Obtiene un registro por ID
   */
  async getById(id: string): Promise<T> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      const item = this.mockData.find((item) => item.id === id);
      if (!item) {
        throw new Error(`Registro con ID ${id} no encontrado`);
      }
      return item;
    }
    
    return apiClient.get<T>(`${this.endpoint}/${id}`);
  }

  /**
   * Crea un nuevo registro
   */
  async create(data: CreateDTO<T>): Promise<T> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const newItem = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as T;
      this.mockData.push(newItem);
      return newItem;
    }
    
    return apiClient.post<T>(this.endpoint, data);
  }

  /**
   * Actualiza un registro existente
   */
  async update(id: string, data: UpdateDTO<T>): Promise<T> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const index = this.mockData.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new Error(`Registro con ID ${id} no encontrado`);
      }
      const updatedItem = {
        ...this.mockData[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.mockData[index] = updatedItem;
      return updatedItem;
    }
    
    return apiClient.put<T>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Elimina un registro
   */
  async delete(id: string): Promise<void> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      const index = this.mockData.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new Error(`Registro con ID ${id} no encontrado`);
      }
      this.mockData.splice(index, 1);
      return;
    }
    
    return apiClient.delete(`${this.endpoint}/${id}`);
  }

  /**
   * Paginación de datos mock
   */
  protected getMockPaginated(params?: SearchParams): PaginatedResponse<T> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const search = params?.search?.toLowerCase();
    
    // Filtrar por búsqueda
    let filtered = [...this.mockData];
    if (search) {
      filtered = filtered.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(search)
      );
    }
    
    // Ordenar
    if (params?.sortBy) {
      const sortKey = params.sortBy as keyof T;
      const sortOrder = params.sortOrder === "desc" ? -1 : 1;
      filtered.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal < bVal) return -1 * sortOrder;
        if (aVal > bVal) return 1 * sortOrder;
        return 0;
      });
    }
    
    // Paginar
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const items = filtered.slice(startIndex, startIndex + pageSize);
    
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
}

/**
 * Servicio extendido con soporte para importación/exportación
 */
export abstract class BulkService<T extends BaseEntity> 
  extends BaseService<T> 
  implements IBulkService<T> {
  
  /**
   * Importa datos desde archivo Excel/CSV
   */
  async importBulk(file: File): Promise<ImportResult> {
    if (this.useMocks) {
      await this.simulateDelay(1500);
      // Simular importación exitosa
      return {
        totalRows: 10,
        successCount: 9,
        errorCount: 1,
        errors: [
          { row: 5, field: "email", message: "Email inválido", value: "invalid-email" },
        ],
      };
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    return apiClient.post<ImportResult>(`${this.endpoint}/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  /**
   * Exporta datos a Excel/CSV
   */
  async exportData(options: ExportOptions): Promise<Blob> {
    if (this.useMocks) {
      await this.simulateDelay(1000);
      // Retornar blob vacío en mock
      return new Blob(["mock data"], { type: "text/csv" });
    }
    
    const response = await fetch(`${apiConfig.baseUrl}${this.endpoint}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    
    return response.blob();
  }

  /**
   * Elimina múltiples registros
   */
  async bulkDelete(ids: string[]): Promise<void> {
    if (this.useMocks) {
      await this.simulateDelay(500);
      // Eliminar los registros del mock
      for (const id of ids) {
        const index = this.mockData.findIndex((item) => item.id === id);
        if (index !== -1) {
          this.mockData.splice(index, 1);
        }
      }
      return;
    }
    
    return apiClient.post(`${this.endpoint}/bulk-delete`, { ids });
  }
}
