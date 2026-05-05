/**
 * Transformer bidireccional para Order.
 *
 * El backend usa:
 *  - snake_case (camelCase en frontend)
 *  - Estructura FLAT sin objetos anidados (frontend usa nested: origin, destination, cargo)
 *  - Booleans como 0/1 en algunos campos (no se usa en Orders)
 *  - Sufijo `_at` para fechas (frontend usa `Date`)
 *
 * Backend schema observado en POST /orders response (2026-04-21):
 *   {
 *     id, tenant_id, order_number, type, status, priority,
 *     customer_id, customer_name,
 *     origin_address, origin_lat, origin_lng, origin_geofence_id,
 *     destination_address, destination_lat, destination_lng, destination_geofence_id,
 *     vehicle_id, vehicle_plate, driver_id, driver_name, route_id,
 *     scheduled_pickup_at, scheduled_delivery_at,
 *     actual_pickup_at, actual_delivery_at, estimated_delivery_at,
 *     current_lat, current_lng,
 *     pod_signature_url, receiver_name, cancel_reason,
 *     estimated_distance_km, actual_distance_km,
 *     estimated_duration_min, actual_duration_min,
 *     total_weight, total_volume, total_packages,
 *     notes, internal_notes, reference,
 *     created_by, created_at, updated_at, deleted_at,
 *     vehicle_imei, webhook_url,
 *     sync_status, sync_error_message, last_sync_attempt,
 *     workflow_id, items: []
 *   }
 */

import type {
  Order,
  OrderStatus,
  OrderPriority,
  OrderSyncStatus,
  OrderCargo,
  CargoType,
  ServiceType,
  OrderMilestone,
  CreateOrderDTO,
  UpdateOrderDTO,
} from "@/types/order";
import type { VehicleType } from "@/types/models/vehicle";

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DEL BACKEND
// ════════════════════════════════════════════════════════════════════════════

/**
 * Shape del backend para un Order. No exportamos este tipo al resto del
 * frontend — solo vive aqui como contrato interno con la API.
 */
export interface BackendOrder {
  id: string;
  tenant_id?: string;
  order_number: string;
  type?: string;
  status: string;
  priority: string;

  // Cliente
  customer_id: string;
  customer_name?: string | null;

  // Origen (flat)
  origin_address?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  origin_geofence_id?: string | null;

  // Destino (flat)
  destination_address?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  destination_geofence_id?: string | null;

  // Asignacion
  vehicle_id?: string | null;
  vehicle_plate?: string | null;
  driver_id?: string | null;
  driver_name?: string | null;
  route_id?: string | null;

  // Timing
  scheduled_pickup_at?: string | null;
  scheduled_delivery_at?: string | null;
  actual_pickup_at?: string | null;
  actual_delivery_at?: string | null;
  estimated_delivery_at?: string | null;

  // Tracking en tiempo real
  current_lat?: number | null;
  current_lng?: number | null;

  // Proof of Delivery
  pod_signature_url?: string | null;
  receiver_name?: string | null;

  // Cancelacion
  cancel_reason?: string | null;

  // Metricas
  estimated_distance_km?: number | null;
  actual_distance_km?: number | null;
  estimated_duration_min?: number | null;
  actual_duration_min?: number | null;

  // Carga (flat)
  total_weight?: number | null;
  total_volume?: number | null;
  total_packages?: number | null;

  // Notas
  notes?: string | null;
  internal_notes?: string | null;
  reference?: string | null;

  // Auditoria
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;

  // GPS
  vehicle_imei?: string | null;
  webhook_url?: string | null;
  sync_status?: string | null;
  sync_error_message?: string | null;
  last_sync_attempt?: string | null;

  // Relaciones
  workflow_id?: string | null;
  items?: unknown[];
}

/**
 * Milestone enviado al backend como parte de la orden (shape del mock).
 */
export interface BackendMilestonePayload {
  type: "origin" | "waypoint" | "destination";
  sequence: number;
  geofence_id?: string;
  geofence_name?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  estimated_arrival?: string;
  estimated_departure?: string;
  notes?: string;
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * Cargo enviado al backend como sub-objeto (shape del mock).
 */
export interface BackendCargoPayload {
  description?: string;
  type?: string;
  weight_kg?: number;
  volume_m3?: number;
  quantity?: number;
  declared_value?: number;
  temperature_controlled?: boolean;
  temperature_range?: { min: number; max: number; unit: string };
  handling_instructions?: string;
}

/**
 * Payload que enviamos al backend para POST/PUT.
 *
 * DISEÑO: enviamos AMBOS shapes para máxima compatibilidad —
 *   - Campos planos (origin_*, destination_*, total_*) → compat con backend actual
 *   - Sub-objetos ricos (cargo{}, milestones[]) → shape del mock, para cuando
 *     el backend implemente las tablas correspondientes.
 *
 * El backend ignora silenciosamente los campos que aún no soporta, así que
 * enviar de más no rompe nada y deja al frontend listo para soportar el
 * contrato completo cuando backend se ponga al día.
 */
export interface BackendOrderPayload {
  order_number?: string;
  type?: string;
  status?: string;
  priority?: string;

  customer_id?: string;
  carrier_id?: string;
  gps_operator_id?: string;

  // Origen flat (compat backend actual)
  origin_address?: string;
  origin_lat?: number;
  origin_lng?: number;
  origin_geofence_id?: string;

  // Destino flat (compat backend actual)
  destination_address?: string;
  destination_lat?: number;
  destination_lng?: number;
  destination_geofence_id?: string;

  // Array rico de milestones (shape mock)
  milestones?: BackendMilestonePayload[];

  // Asignacion
  vehicle_id?: string;
  driver_id?: string;
  route_id?: string;
  workflow_id?: string;

  // Timing
  scheduled_pickup_at?: string;
  scheduled_delivery_at?: string;
  estimated_delivery_at?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;

  // Carga flat (compat backend actual)
  total_weight?: number;
  total_volume?: number;
  total_packages?: number;

  // Carga como sub-objeto rico (shape mock)
  cargo?: BackendCargoPayload;

  // Service & referencias
  service_type?: string;
  reference?: string;
  external_reference?: string;

  // Notas
  notes?: string;
  internal_notes?: string;

  // Clasificación
  tags?: string[];

  // Hidratación denormalizada que el backend acepta (v3 Rev3)
  customer_name?: string;
  driver_name?: string;
  vehicle_plate?: string;
  estimated_distance_km?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Valores por defecto para campos requeridos del Order que el backend
 * puede no proporcionar en ciertos responses.
 */
function defaultCargo(): OrderCargo {
  return {
    description: "",
    type: "general" as CargoType,
    weightKg: 0,
    volumeM3: undefined,
    quantity: 0,
  };
}

function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    (lat !== 0 || lng !== 0)
  );
}

/**
 * Sintetiza los milestones de origen y destino a partir de los campos flat
 * del backend (origin_address/lat/lng/geofence_id y destination_*).
 *
 * Esto es necesario porque el endpoint de listado del backend entrega los
 * puntos como campos planos pero el frontend (ej: Route Planner, mapa de
 * detalle) consume el arreglo `milestones: OrderMilestone[]`.
 *
 * Si el backend no trae coordenadas o dirección para un punto, ese milestone
 * se omite — una orden sin origen o destino válidos no es planificable.
 */
function buildMilestonesFromFlatFields(b: BackendOrder): OrderMilestone[] {
  const milestones: OrderMilestone[] = [];

  const originHasData =
    (b.origin_address && b.origin_address.length > 0) ||
    isValidCoordinate(b.origin_lat, b.origin_lng);

  if (originHasData) {
    milestones.push({
      id: `${b.id}-origin`,
      orderId: b.id,
      geofenceId: b.origin_geofence_id ?? "",
      geofenceName: b.origin_address ?? "",
      type: "origin",
      sequence: 1,
      address: b.origin_address ?? "",
      coordinates: {
        lat: typeof b.origin_lat === "number" ? b.origin_lat : 0,
        lng: typeof b.origin_lng === "number" ? b.origin_lng : 0,
      },
      estimatedArrival: b.scheduled_pickup_at ?? "",
      estimatedDeparture: undefined,
      status: "pending",
    });
  }

  const destinationHasData =
    (b.destination_address && b.destination_address.length > 0) ||
    isValidCoordinate(b.destination_lat, b.destination_lng);

  if (destinationHasData) {
    milestones.push({
      id: `${b.id}-destination`,
      orderId: b.id,
      geofenceId: b.destination_geofence_id ?? "",
      geofenceName: b.destination_address ?? "",
      type: "destination",
      sequence: 2,
      address: b.destination_address ?? "",
      coordinates: {
        lat: typeof b.destination_lat === "number" ? b.destination_lat : 0,
        lng: typeof b.destination_lng === "number" ? b.destination_lng : 0,
      },
      estimatedArrival: b.scheduled_delivery_at ?? "",
      estimatedDeparture: undefined,
      status: "pending",
    });
  }

  return milestones;
}

// ════════════════════════════════════════════════════════════════════════════
// BACKEND → FRONTEND
// ════════════════════════════════════════════════════════════════════════════

/**
 * Convierte un Order del shape del backend al shape del frontend.
 * Re-anida los objetos: origin_address/lat/lng → origin: {...}
 */
export function mapOrderFromBackend(b: BackendOrder): Order {
  const order: Order = {
    id: b.id,
    orderNumber: b.order_number ?? "",
    customerId: b.customer_id,
    customer: b.customer_name
      ? {
          id: b.customer_id,
          name: b.customer_name,
          code: "",
          email: "",
        }
      : undefined,

    // Asignacion
    vehicleId: b.vehicle_id ?? undefined,
    vehicle: b.vehicle_id
      ? {
          id: b.vehicle_id,
          plate: b.vehicle_plate ?? "",
          brand: "",
          model: "",
          type: "camion" as VehicleType,
        }
      : undefined,
    driverId: b.driver_id ?? undefined,
    driver: b.driver_id
      ? {
          id: b.driver_id,
          fullName: b.driver_name ?? "",
          phone: "",
        }
      : undefined,

    workflowId: b.workflow_id ?? undefined,

    // Estado
    status: (b.status as OrderStatus) ?? "draft",
    priority: (b.priority as OrderPriority) ?? "normal",
    syncStatus: (b.sync_status as OrderSyncStatus) ?? "not_sent",
    syncErrorMessage: b.sync_error_message ?? undefined,
    lastSyncAttempt: b.last_sync_attempt ?? undefined,

    // Carga — reconstruir desde campos flat del backend
    cargo: {
      ...defaultCargo(),
      weightKg: b.total_weight ?? 0,
      volumeM3: b.total_volume ?? undefined,
      quantity: b.total_packages ?? 0,
    },

    // Milestones sintetizados a partir de los campos flat del backend.
    // El backend guarda origin_* y destination_* como campos planos — aquí los
    // convertimos en OrderMilestone para que el Route Planner y los componentes
    // que esperan milestones (UI, mapa) puedan usarlos directamente.
    milestones: buildMilestonesFromFlatFields(b),
    completionPercentage: 0,
    statusHistory: [],

    // Auditoria
    createdAt: b.created_at,
    createdBy: b.created_by ?? "",
    updatedAt: b.updated_at,

    // Timing
    scheduledStartDate: b.scheduled_pickup_at ?? "",
    scheduledEndDate: b.scheduled_delivery_at ?? "",
    actualStartDate: b.actual_pickup_at ?? undefined,
    actualEndDate: b.actual_delivery_at ?? undefined,

    // Cancelacion
    cancellationReason: b.cancel_reason ?? undefined,

    // Servicio — no viene del backend, default
    serviceType: (b.type as ServiceType) ?? "distribucion",

    // Otros
    reference: b.reference ?? undefined,
    notes: b.notes ?? undefined,

    // Metadata adicional (campos del backend que no mapean 1:1)
    metadata: {
      tenant_id: b.tenant_id,
      origin_address: b.origin_address,
      origin_coordinates: isValidCoordinate(b.origin_lat, b.origin_lng)
        ? { lat: b.origin_lat as number, lng: b.origin_lng as number }
        : null,
      origin_geofence_id: b.origin_geofence_id,
      destination_address: b.destination_address,
      destination_coordinates: isValidCoordinate(b.destination_lat, b.destination_lng)
        ? { lat: b.destination_lat as number, lng: b.destination_lng as number }
        : null,
      destination_geofence_id: b.destination_geofence_id,
      current_coordinates: isValidCoordinate(b.current_lat, b.current_lng)
        ? { lat: b.current_lat as number, lng: b.current_lng as number }
        : null,
      vehicle_imei: b.vehicle_imei,
      webhook_url: b.webhook_url,
      internal_notes: b.internal_notes,
      route_id: b.route_id,
      pod_signature_url: b.pod_signature_url,
      receiver_name: b.receiver_name,
      estimated_distance_km: b.estimated_distance_km,
      actual_distance_km: b.actual_distance_km,
      estimated_duration_min: b.estimated_duration_min,
      actual_duration_min: b.actual_duration_min,
      estimated_delivery_at: b.estimated_delivery_at,
    },
  };

  return order;
}

// ════════════════════════════════════════════════════════════════════════════
// FRONTEND → BACKEND
// ════════════════════════════════════════════════════════════════════════════

/**
 * Convierte un CreateOrderDTO o UpdateOrderDTO del frontend al payload que
 * espera el backend.
 *
 * Estrategia: enviar el shape completo del mock (cargo{}, milestones[] rico,
 * todos los campos), Y ADEMÁS enviar los campos planos (origin_*, total_*)
 * para compatibilidad con el backend actual que todavía usa esas columnas.
 * El backend ignora lo que no reconoce, y cuando implemente las tablas
 * ricas, el frontend ya está listo sin cambios.
 */
/**
 * Mapea un valor de `serviceType` del frontend al enum válido del backend.
 *
 * Backend doc oficial Rev3 (2026-04-27) sólo confirma `"delivery"` como valor
 * válido para `type`. Los valores del frontend (`distribucion`, `importacion`,
 * `exportacion`, `transporte_minero`, etc.) NO los acepta el backend — devuelve
 * `type: ""` silenciosamente.
 *
 * Provisional: todos los valores del frontend se mapean a `"delivery"` hasta
 * que el equipo backend confirme la lista oficial completa de valores.
 *
 * TODO: cuando el backend documente el enum oficial, actualizar esta tabla.
 */
function mapServiceTypeToBackend(serviceType: string | undefined): string | undefined {
  if (!serviceType) return undefined;
  // Si ya viene en inglés (delivery|pickup|return), pasarlo directo
  const englishEnums = ["delivery", "pickup", "return", "transit"];
  if (englishEnums.includes(serviceType.toLowerCase())) {
    return serviceType.toLowerCase();
  }
  // Cualquier otro valor del frontend (distribucion, importacion, etc.)
  // se traduce a "delivery" provisional
  return "delivery";
}

export function mapOrderToBackend(
  dto: (CreateOrderDTO | UpdateOrderDTO | Partial<Order>) & {
    estimatedDistanceKm?: number;
  }
): BackendOrderPayload {
  // ════════════════════════════════════════════════════════════════════════
  // 2026-05-02: REWRITE según doc oficial Rev3 del backend.
  //
  // El backend de POST /orders SOLO acepta los campos listados en Rev3.
  // Antes enviábamos ~10 campos extra (`cargo{}`, `milestones[]`, `tags[]`,
  // `carrier_id`, `external_reference`, `service_type`, `scheduled_start_date`,
  // `scheduled_end_date`, `gps_operator_id`) que el backend ignoraba.
  //
  // Resultado: payload limpio, debugging trivial, sin campos fantasma.
  //
  // Campos OFICIALES (Rev3):
  //   type, priority, status,
  //   customer_id, customer_name,
  //   vehicle_id, vehicle_plate, driver_id, driver_name, route_id,
  //   origin_address, origin_lat, origin_lng, origin_geofence_id,
  //   destination_address, destination_lat, destination_lng, destination_geofence_id,
  //   scheduled_pickup_at, scheduled_delivery_at,
  //   estimated_distance_km,
  //   total_weight, total_volume, total_packages,
  //   notes, reference
  // ════════════════════════════════════════════════════════════════════════

  const payload: BackendOrderPayload = {};

  // ── Identificación básica ─────────────────────────────────────────────
  if ("orderNumber" in dto && dto.orderNumber !== undefined) {
    payload.order_number = dto.orderNumber;
  }
  if ("customerId" in dto && dto.customerId !== undefined) {
    payload.customer_id = dto.customerId;
  }

  // ── Hidratación denormalizada (Rev3 acepta nombres ya resueltos) ──────
  if ("customer" in dto && (dto as Partial<Order>).customer?.name) {
    payload.customer_name = (dto as Partial<Order>).customer!.name;
  }
  if ("driver" in dto && (dto as Partial<Order>).driver?.fullName) {
    payload.driver_name = (dto as Partial<Order>).driver!.fullName;
  }
  if ("vehicle" in dto && (dto as Partial<Order>).vehicle?.plate) {
    payload.vehicle_plate = (dto as Partial<Order>).vehicle!.plate;
  }
  if (dto.estimatedDistanceKm !== undefined) {
    payload.estimated_distance_km = dto.estimatedDistanceKm;
  }

  // ── Tipo de servicio (mapped al enum del backend) ─────────────────────
  if ("serviceType" in dto && dto.serviceType !== undefined) {
    const mapped = mapServiceTypeToBackend(dto.serviceType as string);
    if (mapped) payload.type = mapped;
    // NOTA: NO enviamos `service_type` — Rev3 no lo lista.
  }

  if ("priority" in dto && dto.priority !== undefined) {
    payload.priority = dto.priority;
  }
  if ("status" in dto && dto.status !== undefined) {
    payload.status = dto.status;
  }

  // ── Asignación ────────────────────────────────────────────────────────
  // Solo asignar si el valor es truthy (no undefined ni null) para evitar
  // mandar `vehicle_id: undefined` al backend, que se serializa como null.
  if ("vehicleId" in dto && dto.vehicleId) payload.vehicle_id = dto.vehicleId;
  if ("driverId" in dto && dto.driverId) payload.driver_id = dto.driverId;
  // NOTA: NO enviamos `carrier_id` — Rev3 no lo lista en el body de orders.
  // NOTA: NO enviamos `gps_operator_id` — Rev3 no lo lista.
  // NOTA: workflow_id sí está documentado, pero solo aplica a /workflows/executions

  // ── Timing (sólo pickup_at / delivery_at — Rev3) ──────────────────────
  if ("scheduledStartDate" in dto && dto.scheduledStartDate) {
    payload.scheduled_pickup_at = dto.scheduledStartDate;
    // NOTA: NO enviamos `scheduled_start_date` — Rev3 no lo lista.
  }
  if ("scheduledEndDate" in dto && dto.scheduledEndDate) {
    payload.scheduled_delivery_at = dto.scheduledEndDate;
    // NOTA: NO enviamos `scheduled_end_date` — Rev3 no lo lista.
  }

  // ── Carga: SOLO campos planos (Rev3) ──────────────────────────────────
  // El sub-objeto `cargo{}` NO existe en Rev3. El backend usa total_*.
  // Los campos que NO tienen columna directa en backend (description, type,
  // declaredValue, handlingInstructions) los preservamos en `internal_notes`
  // para que el usuario no pierda la información que rellenó.
  if ("cargo" in dto && dto.cargo) {
    const c = dto.cargo;
    if (c.weightKg !== undefined) payload.total_weight = c.weightKg;
    if (c.volumeM3 !== undefined) payload.total_volume = c.volumeM3;
    if (c.quantity !== undefined) payload.total_packages = c.quantity;

    // Preservar metadata de carga en internal_notes (siempre, no condicionado)
    const cargoMeta: string[] = [];
    if (c.description) cargoMeta.push(`Descripción: ${c.description}`);
    if (c.type) cargoMeta.push(`Tipo: ${c.type}`);
    if (c.declaredValue !== undefined && c.declaredValue !== null) {
      cargoMeta.push(`Valor declarado: ${c.declaredValue} USD`);
    }
    if (c.handlingInstructions) cargoMeta.push(`Manejo: ${c.handlingInstructions}`);
    if (c.temperatureControlled) {
      cargoMeta.push(`Temperatura controlada: sí`);
      if (c.temperatureRange) {
        cargoMeta.push(`Rango: ${c.temperatureRange.min}-${c.temperatureRange.max}${c.temperatureRange.unit || '°C'}`);
      }
    }

    if (cargoMeta.length > 0) {
      const cargoBlock = cargoMeta.join(" | ");
      // Combinar con internal_notes existente si lo hay
      const existingInternal = (dto as { internalNotes?: string }).internalNotes;
      payload.internal_notes = existingInternal
        ? `${existingInternal}\n[Carga] ${cargoBlock}`
        : `[Carga] ${cargoBlock}`;
    }
  }

  // ── Milestones: SOLO aplanar a origin/destination (Rev3) ──────────────
  // El array `milestones[]` NO existe en Rev3. El backend usa origin_*/destination_*.
  if ("milestones" in dto && Array.isArray(dto.milestones) && dto.milestones.length > 0) {
    // Aplanar el origen
    const origin = dto.milestones.find((m) => m.type === "origin") ?? dto.milestones[0];
    if (origin) {
      if (origin.address) payload.origin_address = origin.address;
      if (origin.coordinates?.lat !== undefined) payload.origin_lat = origin.coordinates.lat;
      if (origin.coordinates?.lng !== undefined) payload.origin_lng = origin.coordinates.lng;
      if (origin.geofenceId) payload.origin_geofence_id = origin.geofenceId;
    }

    // Aplanar el destino
    const destination =
      dto.milestones.find((m) => m.type === "destination") ?? dto.milestones[dto.milestones.length - 1];
    if (destination && destination !== origin) {
      if (destination.address) payload.destination_address = destination.address;
      if (destination.coordinates?.lat !== undefined) payload.destination_lat = destination.coordinates.lat;
      if (destination.coordinates?.lng !== undefined) payload.destination_lng = destination.coordinates.lng;
      if (destination.geofenceId) payload.destination_geofence_id = destination.geofenceId;
    }
  }

  // ── Referencias y notas ───────────────────────────────────────────────
  if ("reference" in dto && dto.reference !== undefined) {
    payload.reference = dto.reference;
  }
  // NOTA: NO enviamos `external_reference` — Rev3 no lo lista.
  if ("notes" in dto && dto.notes !== undefined) {
    payload.notes = dto.notes;
  }
  // 2026-05-02: `internal_notes` SÍ se persiste según test Bruno aunque
  // Rev3 no lo lista explícitamente. Lo enviamos si el DTO lo trae.
  if ("internalNotes" in dto && (dto as { internalNotes?: string }).internalNotes !== undefined) {
    payload.internal_notes = (dto as { internalNotes?: string }).internalNotes;
  }
  // NOTA: NO enviamos `tags` — Rev3 no lo lista.

  // ── Metadata legacy (UIs viejas) ──────────────────────────────────────
  // Si el DTO trae metadata con origin_* o destination_* planos (sin milestones),
  // los propagamos como campos planos para no perder data.
  if ("metadata" in dto && dto.metadata && typeof dto.metadata === "object") {
    const meta = dto.metadata as Record<string, unknown>;
    if (!payload.origin_address && typeof meta.origin_address === "string") {
      payload.origin_address = meta.origin_address;
    }
    if (!payload.destination_address && typeof meta.destination_address === "string") {
      payload.destination_address = meta.destination_address;
    }
    if (meta.origin_coordinates && typeof meta.origin_coordinates === "object" && !payload.origin_lat) {
      const coords = meta.origin_coordinates as { lat?: number; lng?: number };
      if (typeof coords.lat === "number") payload.origin_lat = coords.lat;
      if (typeof coords.lng === "number") payload.origin_lng = coords.lng;
    }
    if (meta.destination_coordinates && typeof meta.destination_coordinates === "object" && !payload.destination_lat) {
      const coords = meta.destination_coordinates as { lat?: number; lng?: number };
      if (typeof coords.lat === "number") payload.destination_lat = coords.lat;
      if (typeof coords.lng === "number") payload.destination_lng = coords.lng;
    }
    if (!payload.origin_geofence_id && typeof meta.origin_geofence_id === "string") {
      payload.origin_geofence_id = meta.origin_geofence_id;
    }
    if (!payload.destination_geofence_id && typeof meta.destination_geofence_id === "string") {
      payload.destination_geofence_id = meta.destination_geofence_id;
    }
    if (!payload.route_id && typeof meta.route_id === "string") {
      payload.route_id = meta.route_id;
    }
  }

  return payload;
}
