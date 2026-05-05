import { apiClient } from "@/lib/api";
import { apiConfig } from "@/config/api.config";
import type {
  BaseEntity,
  CreateDTO,
  UpdateDTO,
  PaginatedResponse,
  SearchParams,
  ImportResult,
  ExportOptions,
} from "@/types/common";

/**
 * Servicio base con CRUD estándar contra el backend.
 *
 * @template T - Tipo de la entidad
 */
export abstract class BaseService<T extends BaseEntity> {
  /** Endpoint de la API */
  protected readonly endpoint: string;

  // Mantenemos `mockData` solo como property para compatibilidad con servicios
  // que aún reciben un array de datos iniciales en el constructor. Se queda
  // sin uso interno (no usamos mocks). Se eliminará cuando ningún subservicio
  // lo pase.
  protected readonly mockData: T[];

  constructor(endpoint: string, mockData: T[] = []) {
    this.endpoint = endpoint;
    this.mockData = mockData;
    this.logServiceInit();
  }

  /**
   * Log al inicializar el servicio (solo en development y una vez por servicio).
   * En producción es no-op para no contaminar la consola del usuario.
   */
  private static loggedServices = new Set<string>();
  private logServiceInit() {
    if (typeof globalThis.window === "undefined") return;
    if (process.env.NODE_ENV === "production") return;
    const serviceKey = `${this.constructor.name}:${this.endpoint}`;
    if (BaseService.loggedServices.has(serviceKey)) return;
    BaseService.loggedServices.add(serviceKey);

    console.log(
      `%c🔌 Servicio inicializado: %c${this.constructor.name} %c[API]%c → ${this.endpoint}`,
      "color: #9c27b0; font-weight: bold",
      "color: #2196f3; font-weight: bold",
      "color: #4caf50; font-weight: bold",
      "color: inherit",
    );
  }

  /**
   * Helper para servicios que necesitaban delay artificial. Sin mocks ya no
   * tiene efecto pero lo dejamos para no romper llamadas externas.
   */
  protected async simulateDelay(_ms: number = 500): Promise<void> {
    // no-op
  }

  /**
   * Obtiene todos los registros con paginación.
   */
  async getAll(params?: SearchParams): Promise<PaginatedResponse<T>> {
    const queryParams = params ? {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status: params.status,
    } : undefined;

    const response = await apiClient.get<Record<string, unknown>>(this.endpoint, { params: queryParams });

    // Aceptar múltiples shapes del backend:
    //  - {data, meta}         <- canónico actual
    //  - {items, pagination}  <- shape interno
    //  - {items, meta}        <- legacy
    const items: T[] = ((response.items ?? response.data ?? []) as T[]);
    const metaSource = (response.pagination ?? response.meta ?? {}) as Record<string, number>;
    const page = metaSource.page ?? params?.page ?? 1;
    const pageSize = metaSource.pageSize ?? params?.pageSize ?? 10;
    const totalItems = metaSource.totalItems ?? metaSource.total ?? items.length;
    const totalPages = metaSource.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));

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
   * Obtiene un registro por ID.
   */
  async getById(id: string): Promise<T> {
    return apiClient.get<T>(`${this.endpoint}/${id}`);
  }

  /**
   * Crea un nuevo registro.
   */
  async create(data: CreateDTO<T>): Promise<T> {
    return apiClient.post<T>(this.endpoint, data);
  }

  /**
   * Actualiza un registro existente.
   */
  async update(id: string, data: UpdateDTO<T>): Promise<T> {
    return apiClient.put<T>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Elimina un registro.
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`${this.endpoint}/${id}`);
  }
}

/**
 * Servicio extendido con soporte para importación/exportación.
 */
export abstract class BulkService<T extends BaseEntity>
  extends BaseService<T> {

  /**
   * Importa datos desde archivo Excel/CSV.
   */
  async importBulk(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.post<ImportResult>(`${this.endpoint}/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  /**
   * Exporta datos a Excel/CSV.
   */
  async exportData(options: ExportOptions): Promise<Blob> {
    const response = await fetch(`${apiConfig.baseUrl}${this.endpoint}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    return response.blob();
  }

  /**
   * Elimina múltiples registros.
   */
  async bulkDelete(ids: string[]): Promise<void> {
    return apiClient.post(`${this.endpoint}/bulk-delete`, { ids });
  }
}
