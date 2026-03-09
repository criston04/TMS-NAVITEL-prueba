import { BaseEntity, EntityStatus } from "@/types/common";

/**
 * Tipo de cliente
 */
export type CustomerType = "empresa" | "persona";

/**
 * Tipo de documento de identidad
 */
export type DocumentType = "RUC" | "DNI" | "CE" | "PASSPORT";

/**
 * Categoría de cliente para tarifas.
 * Los valores base se mantienen para compatibilidad.
 * Categorías adicionales se definen en config/customer-categories.config.ts
 */
export type CustomerCategory = "standard" | "premium" | "vip" | "wholesale" | "corporate" | "government" | (string & {});

/**
 * Términos de pago
 */
export type PaymentTerms = "immediate" | "15_days" | "30_days" | "45_days" | "60_days";

/**
 * Dirección de un cliente
 */
export interface CustomerAddress {
  id?: string;
  label?: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode?: string;
  reference?: string;
  isDefault: boolean;
  /** Coordenadas para geocercas */
  coordinates?: {
    lat: number;
    lng: number;
  };
  /** ID de geocerca asociada */
  geofenceId?: string;
}

/**
 * Contacto de un cliente
 */
export interface CustomerContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  position?: string;
  department?: string;
  isPrimary: boolean;
  /** Notificar sobre entregas */
  notifyDeliveries?: boolean;
  /** Notificar sobre incidentes */
  notifyIncidents?: boolean;
}

/**
 * Configuración de facturación
 */
export interface CustomerBillingConfig {
  /** Términos de pago */
  paymentTerms: PaymentTerms;
  /** Moneda preferida */
  currency: "PEN" | "USD";
  /** Requiere orden de compra */
  requiresPO: boolean;
  /** Email para facturación */
  billingEmail?: string;
  /** Dirección de facturación */
  billingAddress?: CustomerAddress;
  /** Descuento por volumen (%) */
  volumeDiscount?: number;
}

/**
 * Estadísticas operativas del cliente
 */
export interface CustomerOperationalStats {
  /** Total de órdenes */
  totalOrders: number;
  /** Órdenes completadas */
  completedOrders: number;
  /** Órdenes canceladas */
  cancelledOrders: number;
  /** Tasa de entrega a tiempo */
  onTimeDeliveryRate: number;
  /** Volumen total transportado (kg) */
  totalVolumeKg: number;
  /** Última orden */
  lastOrderDate?: string;
  /** Valor total facturado */
  totalBilledAmount?: number;
}

/**
 * Entidad Cliente
 */
export interface Customer extends BaseEntity {
  /** Código único del cliente */
  code?: string;
  
  type: CustomerType;
  
  documentType: DocumentType;
  /** Número de documento (RUC, DNI, etc.) */
  documentNumber: string;
  /** Razón social o nombre completo */
  name: string;
  /** Nombre comercial (opcional) */
  tradeName?: string;
  /** Email principal */
  email: string;
  /** Teléfono principal */
  phone: string;
  /** Teléfono secundario */
  phone2?: string;
  /** Sitio web */
  website?: string;
  
  status: EntityStatus;
  /** Categoría del cliente */
  category?: CustomerCategory;
  /** Direcciones del cliente */
  addresses: CustomerAddress[];
  /** Contactos del cliente */
  contacts: CustomerContact[];
  /** Crédito disponible */
  creditLimit?: number;
  /** Crédito utilizado */
  creditUsed?: number;
  /** Configuración de facturación */
  billingConfig?: CustomerBillingConfig;
  /** Estadísticas operativas */
  operationalStats?: CustomerOperationalStats;
  /** Notas adicionales */
  notes?: string;
  /** Etiquetas/tags */
  tags?: string[];
  /** Sector/industria */
  industry?: string;
  /** Fecha de primer pedido */
  firstOrderDate?: string;
  /** Workflow preferido */
  preferredWorkflowId?: string;
}

/**
 * Estadísticas de clientes
 */
export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
  byCategory?: Record<CustomerCategory, number>;
  totalCreditLimit?: number;
  totalCreditUsed?: number;
}

/**
 * Filtros para búsqueda de clientes
 */
export interface CustomerFilters {
  search?: string;
  status?: EntityStatus | "all";
  type?: CustomerType | "all";
  category?: CustomerCategory | "all";
  city?: string;
  hasOrders?: boolean;
  sortBy?: "name" | "createdAt" | "totalOrders" | "code";
  sortOrder?: "asc" | "desc";
}

/**
 * DTO para crear cliente
 */
export interface CreateCustomerDTO {
  type: CustomerType;
  documentType: DocumentType;
  documentNumber: string;
  name: string;
  tradeName?: string;
  email: string;
  phone: string;
  phone2?: string;
  website?: string;
  category?: CustomerCategory;
  addresses: Omit<CustomerAddress, "id">[];
  contacts: Omit<CustomerContact, "id">[];
  billingConfig?: Partial<CustomerBillingConfig>;
  notes?: string;
  tags?: string[];
  industry?: string;
}

/**
 * DTO para actualizar cliente
 */
export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {
  status?: EntityStatus;
  creditLimit?: number;
}
