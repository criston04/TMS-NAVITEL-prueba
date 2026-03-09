import { BaseEntity } from "@/types/common";

/**
 * Tipo de operador
 */
export type OperatorType = "propio" | "tercero" | "asociado";

/**
 * Estado del operador (específico para operadores)
 */
export type OperatorStatus = "enabled" | "blocked" | "pending";

/**
 * Contacto del operador
 */
export interface OperatorContact {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

/**
 * Ítem del checklist de operador
 */
export interface OperatorChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  date?: string;
}

/**
 * Checklist de validación del operador
 */
export interface OperatorValidationChecklist {
  items: OperatorChecklistItem[];
  isComplete: boolean;
  lastUpdated: string;
}

/**
 * Documento requerido del operador
 */
export interface OperatorDocument {
  id: string;
  name: string;
  required: boolean;
  uploaded: boolean;
  fileName?: string;
  uploadedAt?: string;
  expiresAt?: string;
}

/**
 * Entidad Operador Logístico
 */
export interface Operator extends BaseEntity {
  /** Código interno */
  code: string;
  /** RUC */
  ruc: string;
  /** Razón social */
  businessName: string;
  /** Nombre comercial */
  tradeName?: string;
  
  type: OperatorType;
  /** Email */
  email: string;
  /** Teléfono */
  phone: string;
  /** Dirección fiscal */
  fiscalAddress: string;
  /** Contactos */
  contacts: OperatorContact[];
  /** Checklist de validación */
  checklist: OperatorValidationChecklist;
  /** Documentos */
  documents: OperatorDocument[];
  /** Cantidad de conductores asociados */
  driversCount: number;
  /** Cantidad de vehículos asociados */
  vehiclesCount: number;
  /** Fecha de inicio de contrato */
  contractStartDate?: string;
  /** Fecha de fin de contrato */
  contractEndDate?: string;
  /** Notas */
  notes?: string;
  
  status: OperatorStatus;
}

/**
 * Estadísticas de operadores
 */
export interface OperatorStats {
  total: number;
  enabled: number;
  blocked: number;
  pendingValidation: number;
  propios: number;
  terceros: number;
}
