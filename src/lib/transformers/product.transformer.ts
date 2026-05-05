/**
 * Transformer bidireccional para Product.
 *
 * REGLA: el frontend manda al backend EXACTAMENTE lo que el formulario captura.
 * Lo que el form llena (dimensions, transport_conditions completos) se envía
 * completo. Si el backend no persiste algo, queda como deuda en BACKEND_GAPS.md.
 *
 * Sniff del backend (2026-04-29):
 *   - POST /master/products SÍ acepta el body rico sin error.
 *   - Backend GUARDA: id, tenant_id, sku, name, description, category,
 *     unit_of_measure (default "unit"), barcode, unit_price, image_url,
 *     weight, volume, requires_refrigeration (0/1), is_hazardous (0/1),
 *     hazardous_class, stackable (0/1), max_stack_height,
 *     requires_special_handling (0/1), min_temperature, max_temperature,
 *     handling_instructions, notes, customer_id, status,
 *     code (siempre null — bug), unit (siempre null), created/updated/deleted_at.
 *   - Backend IGNORA: dimensions{} (length/width/height), transport_conditions{}
 *     completo si se manda anidado.
 *
 * Ajuste obligatorio: el backend rechaza `weight_kg`/`volume_m3` (los descarta
 * como campos que no existen). Usamos `weight`/`volume`. Igual con
 * `is_hazardous` (no `is_dangerous`). Sin estos cambios, los datos del form
 * se perderían en CADA submit, no es deuda recuperable.
 */

import type {
  Product,
  ProductCategory,
  UnitOfMeasure,
  TransportConditions,
  ProductDimensions,
} from "@/types/models/product";
import type { EntityStatus } from "@/types/common";

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DEL BACKEND
// ════════════════════════════════════════════════════════════════════════════

export interface BackendProduct {
  id: string;
  tenant_id?: string;
  sku?: string;
  code?: string | null;
  name: string;
  description?: string | null;
  category?: string;
  unit_of_measure?: string;
  unit?: string | null;
  barcode?: string | null;
  unit_price?: number | null;
  image_url?: string | null;

  weight?: number | null;
  volume?: number | null;

  requires_refrigeration?: number | boolean | null;
  is_hazardous?: number | boolean | null;
  hazardous_class?: string | null;
  stackable?: number | boolean | null;
  requires_special_handling?: number | boolean | null;

  min_temperature?: number | null;
  max_temperature?: number | null;
  handling_instructions?: string | null;
  max_stack_height?: number | null;
  notes?: string | null;
  customer_id?: string | null;

  status?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/** Dimensiones físicas del producto (form: largo, ancho, alto, peso, volumen). */
export interface BackendProductDimensionsPayload {
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  volume?: number;
}

/** Condiciones de transporte (form: refrigeración, manejo especial, stack, temp). */
export interface BackendProductTransportConditionsPayload {
  requires_refrigeration?: boolean;
  requires_special_handling?: boolean;
  stackable?: boolean;
  max_stack_height?: number;
  temperature_range?: { min: number; max: number; unit: string };
  handling_instructions?: string;
  min_temperature?: number;
  max_temperature?: number;
}

/**
 * Payload del POST/PUT — TODO lo que el form captura.
 *
 * Mandamos los campos planos (que el backend persiste hoy) Y los sub-objetos
 * ricos (`dimensions{}`, `transport_conditions{}`) para cuando el backend los
 * implemente.
 */
export interface BackendProductPayload {
  sku?: string;
  code?: string;                 // alias para upsert
  name?: string;
  description?: string;
  category?: string;
  unit_of_measure?: string;
  barcode?: string;
  unit_price?: number;
  image_url?: string;
  customer_id?: string;
  status?: string;
  notes?: string;

  // Planos (lo que SÍ persiste)
  weight?: number;
  volume?: number;
  requires_refrigeration?: boolean;
  is_hazardous?: boolean;
  hazardous_class?: string;
  stackable?: boolean;
  requires_special_handling?: boolean;
  max_stack_height?: number;
  min_temperature?: number;
  max_temperature?: number;
  handling_instructions?: string;

  // Sub-objetos ricos del form (backend pendiente)
  dimensions?: BackendProductDimensionsPayload;
  transport_conditions?: BackendProductTransportConditionsPayload;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function toBool(v: unknown): boolean {
  return v === 1 || v === true || v === "1" || v === "true";
}

function defaultDimensions(): ProductDimensions {
  return {};
}

// ════════════════════════════════════════════════════════════════════════════
// BACKEND → FRONTEND
// ════════════════════════════════════════════════════════════════════════════

export function mapProductFromBackend(b: BackendProduct): Product {
  const unit = (b.unit_of_measure ?? "unit") as UnitOfMeasure;

  const dimensions: ProductDimensions = {
    ...defaultDimensions(),
    ...(b.weight !== null && b.weight !== undefined ? { weight: b.weight } : {}),
    ...(b.volume !== null && b.volume !== undefined ? { volume: b.volume } : {}),
  };

  const transportConditions: TransportConditions = {
    requiresRefrigeration: toBool(b.requires_refrigeration),
    requiresSpecialHandling: toBool(b.requires_special_handling),
    stackable: b.stackable === null || b.stackable === undefined ? true : toBool(b.stackable),
    maxStackHeight: b.max_stack_height ?? undefined,
    handlingInstructions: b.handling_instructions ?? undefined,
    minTemperature: b.min_temperature ?? undefined,
    maxTemperature: b.max_temperature ?? undefined,
  };

  return {
    id: b.id,
    sku: b.sku ?? "",
    name: b.name ?? "",
    description: b.description ?? undefined,
    category: (b.category as ProductCategory) ?? "general",
    unitOfMeasure: unit,
    dimensions,
    transportConditions,
    isDangerous: toBool(b.is_hazardous),
    hazardousClass: b.hazardous_class ?? undefined,
    status: (b.status as EntityStatus) ?? "active",
    barcode: b.barcode ?? undefined,
    unitPrice: b.unit_price ?? undefined,
    imageUrl: b.image_url ?? undefined,
    customerId: b.customer_id ?? undefined,
    notes: b.notes ?? undefined,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  } as unknown as Product;
}

// ════════════════════════════════════════════════════════════════════════════
// FRONTEND → BACKEND
// ════════════════════════════════════════════════════════════════════════════

export function mapProductToBackend(
  p: Partial<Product> & { isDangerous?: boolean }
): BackendProductPayload {
  const payload: BackendProductPayload = {};

  // Identificación: enviamos sku Y code (alias) para que el backend pueda usar
  // el que tenga implementado. Hoy persiste sku, descarta code (bug del backend).
  if (p.sku !== undefined) {
    payload.sku = p.sku;
    payload.code = p.sku;
  }

  if (p.name !== undefined) payload.name = p.name;
  if (p.description !== undefined) payload.description = p.description;
  if (p.category !== undefined) payload.category = p.category;
  if (p.unitOfMeasure !== undefined) payload.unit_of_measure = p.unitOfMeasure;
  if (p.barcode !== undefined) payload.barcode = p.barcode;
  if (p.unitPrice !== undefined) payload.unit_price = p.unitPrice;
  if (p.imageUrl !== undefined) payload.image_url = p.imageUrl;
  if (p.customerId !== undefined) payload.customer_id = p.customerId;
  if (p.status !== undefined) payload.status = p.status;
  if (p.notes !== undefined) payload.notes = p.notes;

  // ── Planos: peso/volumen al root ────────────────────────────────────
  // Backend rechaza `weight_kg`/`volume_m3` (campos que no existen). Usa
  // `weight`/`volume` planos.
  if (p.dimensions?.weight !== undefined) payload.weight = p.dimensions.weight;
  if (p.dimensions?.volume !== undefined) payload.volume = p.dimensions.volume;

  // ── Planos: flags de transporte ─────────────────────────────────────
  if (p.transportConditions?.requiresRefrigeration !== undefined) {
    payload.requires_refrigeration = p.transportConditions.requiresRefrigeration;
  }
  if (p.transportConditions?.requiresSpecialHandling !== undefined) {
    payload.requires_special_handling = p.transportConditions.requiresSpecialHandling;
  }
  if (p.transportConditions?.stackable !== undefined) {
    payload.stackable = p.transportConditions.stackable;
  }
  if (p.transportConditions?.maxStackHeight !== undefined) {
    payload.max_stack_height = p.transportConditions.maxStackHeight;
  }
  if (p.transportConditions?.handlingInstructions !== undefined) {
    payload.handling_instructions = p.transportConditions.handlingInstructions;
  }
  if (p.transportConditions?.minTemperature !== undefined) {
    payload.min_temperature = p.transportConditions.minTemperature;
  }
  if (p.transportConditions?.maxTemperature !== undefined) {
    payload.max_temperature = p.transportConditions.maxTemperature;
  }

  // Backend usa `is_hazardous` (rechaza `is_dangerous`).
  if (p.isDangerous !== undefined) payload.is_hazardous = p.isDangerous;
  if (p.hazardousClass !== undefined) payload.hazardous_class = p.hazardousClass;

  // ── Sub-objeto dimensions{} (form: length, width, height, weight, volume) ───
  if (p.dimensions) {
    const dims: BackendProductDimensionsPayload = {};
    if (p.dimensions.length !== undefined) dims.length = p.dimensions.length;
    if (p.dimensions.width !== undefined) dims.width = p.dimensions.width;
    if (p.dimensions.height !== undefined) dims.height = p.dimensions.height;
    if (p.dimensions.weight !== undefined) dims.weight = p.dimensions.weight;
    if (p.dimensions.volume !== undefined) dims.volume = p.dimensions.volume;
    if (Object.keys(dims).length > 0) payload.dimensions = dims;
  }

  // ── Sub-objeto transport_conditions{} (form rich) ───────────────────
  if (p.transportConditions) {
    const tc: BackendProductTransportConditionsPayload = {};
    if (p.transportConditions.requiresRefrigeration !== undefined) {
      tc.requires_refrigeration = p.transportConditions.requiresRefrigeration;
    }
    if (p.transportConditions.requiresSpecialHandling !== undefined) {
      tc.requires_special_handling = p.transportConditions.requiresSpecialHandling;
    }
    if (p.transportConditions.stackable !== undefined) {
      tc.stackable = p.transportConditions.stackable;
    }
    if (p.transportConditions.maxStackHeight !== undefined) {
      tc.max_stack_height = p.transportConditions.maxStackHeight;
    }
    if (p.transportConditions.handlingInstructions !== undefined) {
      tc.handling_instructions = p.transportConditions.handlingInstructions;
    }
    if (p.transportConditions.minTemperature !== undefined) {
      tc.min_temperature = p.transportConditions.minTemperature;
    }
    if (p.transportConditions.maxTemperature !== undefined) {
      tc.max_temperature = p.transportConditions.maxTemperature;
    }
    // Sub-objeto temperature_range (algunos backends lo prefieren agrupado)
    if (
      p.transportConditions.minTemperature !== undefined ||
      p.transportConditions.maxTemperature !== undefined
    ) {
      tc.temperature_range = {
        min: p.transportConditions.minTemperature ?? 0,
        max: p.transportConditions.maxTemperature ?? 0,
        unit: "celsius",
      };
    }
    if (Object.keys(tc).length > 0) payload.transport_conditions = tc;
  }

  return payload;
}
