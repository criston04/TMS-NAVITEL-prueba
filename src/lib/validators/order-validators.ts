import { z } from 'zod';
import type {
  ServiceType,
  OrderPriority,
  CargoType,
  OrderStatus,
} from '@/types/order';

// ─── Constantes de valores válidos ─────────────────────────────────────────

/** Tipos de servicio válidos */
export const SERVICE_TYPES: ServiceType[] = [
  'distribucion',
  'importacion',
  'exportacion',
  'transporte_minero',
  'transporte_residuos',
  'interprovincial',
  'mudanza',
  'courier',
  'otro',
];

/** Prioridades válidas */
export const ORDER_PRIORITIES: OrderPriority[] = [
  'low',
  'normal',
  'high',
  'urgent',
];

/** Tipos de carga válidos */
export const CARGO_TYPES: CargoType[] = [
  'general',
  'refrigerated',
  'hazardous',
  'fragile',
  'oversized',
  'liquid',
  'bulk',
];

/** Estados de orden válidos */
export const ORDER_STATUSES: OrderStatus[] = [
  'draft',
  'pending',
  'assigned',
  'in_transit',
  'at_milestone',
  'delayed',
  'completed',
  'closed',
  'cancelled',
];

/** Etiquetas de tipo de servicio */
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  distribucion: 'Distribución',
  importacion: 'Importación',
  exportacion: 'Exportación',
  transporte_minero: 'Transporte Minero',
  transporte_residuos: 'Transporte de Residuos',
  interprovincial: 'Interprovincial',
  mudanza: 'Mudanza',
  courier: 'Courier / Paquetería',
  otro: 'Otro',
};

/** Etiquetas de prioridad */
export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

/** Etiquetas de tipo de carga */
export const CARGO_TYPE_LABELS: Record<CargoType, string> = {
  general: 'Carga General',
  refrigerated: 'Refrigerada',
  hazardous: 'Peligrosa',
  fragile: 'Frágil',
  oversized: 'Sobredimensionada',
  liquid: 'Líquidos',
  bulk: 'Granel',
};

// ─── Schemas Zod ─────────────────────────────────────────────────────────────

/**
 * Schema para coordenadas geográficas
 */
export const coordinatesSchema = z.object({
  lat: z
    .number()
    .min(-90, 'Latitud mínima: -90')
    .max(90, 'Latitud máxima: 90'),
  lng: z
    .number()
    .min(-180, 'Longitud mínima: -180')
    .max(180, 'Longitud máxima: 180'),
});

/**
 * Schema para un hito/milestone de la orden
 */
export const milestoneSchema = z.object({
  geofenceId: z.string().min(1, 'Selecciona una geocerca'),
  geofenceName: z.string().min(1, 'El nombre de la geocerca es requerido'),
  type: z.enum(['origin', 'waypoint', 'destination']),
  sequence: z.number().int().min(0, 'La secuencia debe ser >= 0'),
  address: z.string().optional(),
  coordinates: coordinatesSchema,
  estimatedArrival: z.string().optional(),
  estimatedDeparture: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Schema para la información de carga
 */
export const cargoSchema = z.object({
  description: z
    .string()
    .min(3, 'La descripción debe tener al menos 3 caracteres')
    .max(500, 'Máximo 500 caracteres'),
  type: z.enum(CARGO_TYPES as [CargoType, ...CargoType[]]),
  weightKg: z
    .number()
    .positive('El peso debe ser mayor a 0')
    .max(100000, 'Peso máximo: 100,000 kg'),
  volumeM3: z
    .number()
    .positive('El volumen debe ser mayor a 0')
    .max(1000, 'Volumen máximo: 1,000 m³')
    .optional(),
  quantity: z
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a 0')
    .max(99999, 'Cantidad máxima: 99,999')
    .default(1),
  declaredValue: z
    .number()
    .min(0, 'El valor declarado no puede ser negativo')
    .optional(),
});

/**
 * Schema para el contacto de la orden
 */
export const orderContactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
});

/**
 * Schema principal para crear una orden (CreateOrderDTO)
 */
export const createOrderSchema = z
  .object({
    customerId: z
      .string()
      .min(1, 'Selecciona un cliente'),
    carrierId: z.string().optional(),
    vehicleId: z.string().optional(),
    driverId: z.string().optional(),
    workflowId: z.string().optional(),
    priority: z.enum(ORDER_PRIORITIES as [OrderPriority, ...OrderPriority[]]),
    serviceType: z.enum(SERVICE_TYPES as [ServiceType, ...ServiceType[]]),
    orderNumber: z.string().optional(),
    externalReference: z.string().max(100, 'Máximo 100 caracteres').optional(),
    gpsOperatorId: z.string().optional(),
    cargo: cargoSchema,
    milestones: z
      .array(milestoneSchema)
      .min(2, 'Agrega al menos origen y destino'),
    scheduledStartDate: z.string().min(1, 'Fecha de inicio requerida'),
    scheduledEndDate: z.string().min(1, 'Fecha de fin requerida'),
    notes: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
    tags: z.array(z.string().min(1).max(50)).optional(),
    orderContact: orderContactSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.scheduledStartDate && data.scheduledEndDate) {
        return data.scheduledStartDate <= data.scheduledEndDate;
      }
      return true;
    },
    {
      message: 'La fecha de inicio debe ser anterior a la fecha de fin',
      path: ['scheduledEndDate'],
    }
  );

/**
 * Schema para actualizar una orden (UpdateOrderDTO)
 */
export const updateOrderSchema = createOrderSchema.partial().extend({
  status: z
    .enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]])
    .optional(),
});

/**
 * Schema para filtros de búsqueda de órdenes
 */
export const orderFiltersSchema = z.object({
  search: z.string().optional(),
  customerId: z.string().optional(),
  carrierId: z.string().optional(),
  status: z
    .union([
      z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
      z.array(z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]])),
    ])
    .optional(),
  priority: z
    .union([
      z.enum(ORDER_PRIORITIES as [OrderPriority, ...OrderPriority[]]),
      z.array(z.enum(ORDER_PRIORITIES as [OrderPriority, ...OrderPriority[]])),
    ])
    .optional(),
  serviceType: z
    .enum(SERVICE_TYPES as [ServiceType, ...ServiceType[]])
    .optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

/**
 * Schema para datos de cierre de orden
 */
export const orderClosureSchema = z.object({
  observations: z
    .string()
    .min(1, 'Ingresa observaciones del cierre'),
  incidents: z
    .array(
      z.object({
        id: z.string(),
        incidentCatalogId: z.string().optional(),
        incidentName: z.string().optional(),
        freeDescription: z.string().optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        occurredAt: z.string(),
      })
    )
    .default([]),
  deviationReasons: z
    .array(
      z.object({
        type: z.string(),
        description: z.string(),
        impactMinutes: z.number().optional(),
      })
    )
    .default([]),
  closedBy: z.string().min(1),
  closedByName: z.string().min(1),
  signature: z.string().optional(),
});

// ─── Types inferidos ─────────────────────────────────────────────────────────

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type OrderFiltersInput = z.infer<typeof orderFiltersSchema>;
export type OrderClosureInput = z.infer<typeof orderClosureSchema>;
export type CargoInput = z.infer<typeof cargoSchema>;
export type MilestoneInput = z.infer<typeof milestoneSchema>;

// ─── Helpers de validación ───────────────────────────────────────────────────

/**
 * Valida datos de creación de orden
 * @returns Objeto resultado con datos validados o errores
 */
export function validateCreateOrder(data: unknown) {
  return createOrderSchema.safeParse(data);
}

/**
 * Valida datos de actualización de orden
 * @returns Objeto resultado con datos validados o errores
 */
export function validateUpdateOrder(data: unknown) {
  return updateOrderSchema.safeParse(data);
}

/**
 * Valida filtros de búsqueda
 * @returns Objeto resultado con filtros validados o errores
 */
export function validateOrderFilters(data: unknown) {
  return orderFiltersSchema.safeParse(data);
}

/**
 * Extrae errores de un resultado Zod safeParse como mapa de campo → mensaje
 */
export function extractFieldErrors(
  result: ReturnType<typeof createOrderSchema.safeParse>
): Record<string, string> {
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}
