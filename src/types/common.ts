
/**
 * Respuesta estándar de la API
 * @template T - Tipo de datos en la respuesta
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Respuesta paginada de la API
 * @template T - Tipo de items en la lista
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

/**
 * Información de paginación
 */
export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Parámetros para solicitar datos paginados
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Parámetros de búsqueda genéricos
 */
export interface SearchParams extends PaginationParams {
  search?: string;
  status?: EntityStatus;
  filters?: Record<string, string | number | boolean>;
}


/**
 * Estados posibles de una entidad
 */
export type EntityStatus = "active" | "inactive" | "pending" | "blocked" | "suspended" | "on_leave" | "terminated";

/**
 * Estado de validación de documentos
 */
export type DocumentStatus = "valid" | "expired" | "pending" | "missing";

/**
 * Estado de una operación async
 */
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}


/**
 * Campos comunes a todas las entidades
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Entidad con campos de auditoría
 */
export interface AuditableEntity extends BaseEntity {
  createdBy: string;
  updatedBy: string;
}

/**
 * Entidad con estado de habilitación
 */
export interface ActivatableEntity extends BaseEntity {
  status: EntityStatus;
  isEnabled: boolean;
}


/**
 * Documento requerido para validación
 */
export interface RequiredDocument {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  status: DocumentStatus;
  expirationDate?: string;
  fileUrl?: string;
}

/**
 * Checklist de validación
 */
export interface ValidationChecklist {
  entityId: string;
  entityType: "driver" | "vehicle" | "operator";
  documents: RequiredDocument[];
  isComplete: boolean;
  completionPercentage: number;
}


/**
 * Resultado de importación masiva
 */
export interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
}

/**
 * Error de importación
 */
export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

/**
 * Opciones de exportación
 */
export interface ExportOptions {
  format: "xlsx" | "csv";
  columns?: string[];
  filters?: Record<string, unknown>;
}


/**
 * Hace todas las propiedades opcionales excepto las especificadas
 */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

/**
 * Hace las propiedades especificadas requeridas
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Omite campos de auditoría para creación
 */
export type CreateDTO<T extends BaseEntity> = Omit<T, "id" | "createdAt" | "updatedAt">;

/**
 * Campos permitidos para actualización
 */
export type UpdateDTO<T extends BaseEntity> = Partial<Omit<T, "id" | "createdAt" | "updatedAt">>;
