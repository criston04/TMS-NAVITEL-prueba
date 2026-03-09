import { BaseEntity, EntityStatus } from "@/types/common";

/**
 * Categoría de producto
 */
export type ProductCategory = 
  | "general"
  | "perecible"
  | "peligroso"
  | "fragil"
  | "refrigerado"
  | "congelado"
  | "granel";

/**
 * Unidad de medida
 */
export type UnitOfMeasure = "kg" | "ton" | "lt" | "m3" | "unit" | "pallet" | "container";

/**
 * Condiciones de transporte
 */
export interface TransportConditions {
  requiresRefrigeration: boolean;
  minTemperature?: number;
  maxTemperature?: number;
  requiresSpecialHandling: boolean;
  handlingInstructions?: string;
  stackable: boolean;
  maxStackHeight?: number;
}

/**
 * Dimensiones del producto
 */
export interface ProductDimensions {
  length?: number; // cm
  width?: number; // cm
  height?: number; // cm
  weight?: number; // kg
  volume?: number; // m3
}

/**
 * Entidad Producto
 */
export interface Product extends BaseEntity {
  /** SKU único */
  sku: string;
  
  name: string;
  /** Descripción */
  description?: string;
  /** Categoría */
  category: ProductCategory;
  /** Unidad de medida */
  unitOfMeasure: UnitOfMeasure;
  /** Dimensiones */
  dimensions?: ProductDimensions;
  /** Condiciones de transporte */
  transportConditions: TransportConditions;
  /** Estado */
  status: EntityStatus;
  /** Código de barras */
  barcode?: string;
  /** Precio unitario (referencial) */
  unitPrice?: number;
  /** Imagen del producto */
  imageUrl?: string;
  /** Cliente asociado (si es específico) */
  customerId?: string;
  /** Notas */
  notes?: string;
}

/**
 * Estadísticas de productos
 */
export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<ProductCategory, number>;
}
