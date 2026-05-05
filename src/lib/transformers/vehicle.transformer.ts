/**
 * Transformer bidireccional para Vehicle.
 *
 * REGLA: el frontend manda al backend EXACTAMENTE lo que el formulario captura.
 * Lo que el form llena (specs detallados, capacity completa, insurance,
 * registration, documents) se envía completo. Si el backend no persiste algo,
 * eso es deuda del backend listada en BACKEND_GAPS.md.
 *
 * Sniff del backend (2026-04-29):
 *   - POST /master/vehicles SÍ acepta el body rico completo sin error.
 *   - POST GUARDA en DB: id, tenant_id, code, plate, type, body_type,
 *     trailer_plate, brand, model, year, vin, color, fuel_type,
 *     operational_status, status, current_mileage, gps_device_id, notes,
 *     operator_id, current_driver_id, blocked_at, blocked_reason, created_by,
 *     created_at, updated_at, deleted_at.
 *   - POST IGNORA SILENCIOSAMENTE: capacity_kg, capacity_m3, specs{},
 *     capacity{}, insurance{}, documents[].
 *     → Va a BACKEND_GAPS.md como deuda del backend.
 */

import type {
  Vehicle,
  VehicleType,
  BodyType,
  VehicleOperationalStatus,
  VehicleSpecs,
  VehicleCapacity,
  VehicleRegistration,
} from "@/types/models/vehicle";
import type { ValidationChecklist, EntityStatus } from "@/types/common";

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DEL BACKEND (sniff 2026-04-29)
// ════════════════════════════════════════════════════════════════════════════

export interface BackendVehicle {
  id: string;
  tenant_id?: string;
  code?: string | null;
  plate: string;
  type?: string;
  body_type?: string | null;
  trailer_plate?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  vin?: string | null;
  color?: string | null;
  fuel_type?: string | null;
  operational_status?: string;
  status?: string;
  current_mileage?: number;
  gps_device_id?: string | null;
  notes?: string | null;
  operator_id?: string | null;
  current_driver_id?: string | null;
  blocked_at?: string | null;
  blocked_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/** Specs detalladas que el form captura (engine, axles, tires, transmission). */
export interface BackendVehicleSpecsPayload {
  engine_type?: string;
  engine_displacement?: number;
  engine_number?: string;
  chassis_number?: string;
  axles?: number;
  tires?: number;
  fuel_tank_capacity?: number;
  transmission?: string;
}

/** Capacidad detallada (max payload, max volume, pallets, gross/tare weight). */
export interface BackendVehicleCapacityPayload {
  max_weight_kg?: number;
  max_volume_m3?: number;
  max_pallets?: number;
  gross_weight?: number;
  tare_weight?: number;
}

/** Una póliza de seguro (SOAT, todo riesgo, etc). */
export interface BackendVehicleInsurancePayload {
  id?: string;
  type?: string;
  policy_number?: string;
  insurer?: string;
  start_date?: string;
  end_date?: string;
  coverage_amount?: number;
}

/** Registración SUNARP / propietario. */
export interface BackendVehicleRegistrationPayload {
  registration_number?: string;
  owner_name?: string;
  owner_document?: string;
  registration_date?: string;
  registry_office?: string;
}

/** Un documento del vehículo (SOAT, revisión técnica, etc). */
export interface BackendVehicleDocumentPayload {
  id?: string;
  name?: string;
  is_required?: boolean;
  status?: string;
  expiration_date?: string;
  file_url?: string;
}

/**
 * Payload del POST/PUT — TODO lo que el form captura se envía.
 *
 * El backend v3 Rev3 doc POST acepta `insurance: {…}` (objeto único — póliza
 * principal). El backend v3 Rev3 doc GET ID devuelve `insurance: [{…}]` (array
 * con todas). Mandamos AMBOS:
 *   - `insurance` singular = primera póliza (la que el POST persiste)
 *   - `insurance_policies` = array completo (para cuando el backend implemente
 *     creación masiva)
 */
export interface BackendVehiclePayload {
  // Planos al root
  code?: string;
  plate?: string;
  type?: string;
  body_type?: string;
  trailer_plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  vin?: string;
  color?: string;
  fuel_type?: string;
  operational_status?: string;
  status?: string;
  current_mileage?: number;
  gps_device_id?: string;
  notes?: string;
  operator_id?: string;
  current_driver_id?: string | null; // 2026-05-03 (issue #5): asignación driver↔vehicle
  capacity_kg?: number;       // duplicado plano del max_weight_kg para compat
  capacity_m3?: number;       // duplicado plano del max_volume_m3 para compat

  // Sub-objetos ricos del form (backend pendiente de persistirlos)
  specs?: BackendVehicleSpecsPayload;
  capacity?: BackendVehicleCapacityPayload;
  insurance?: BackendVehicleInsurancePayload;            // singular (lo que el POST acepta hoy)
  insurance_policies?: BackendVehicleInsurancePayload[]; // array (deuda backend)
  registration?: BackendVehicleRegistrationPayload;
  documents?: BackendVehicleDocumentPayload[];
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ════════════════════════════════════════════════════════════════════════════

function defaultCapacity(): VehicleCapacity {
  return {
    grossWeight: 0,
    tareWeight: 0,
    maxPayload: 0,
  };
}

function defaultRegistration(): VehicleRegistration {
  return {
    registrationNumber: "",
    ownerName: "",
    ownerDocument: "",
    registrationDate: "",
    registryOffice: "",
  };
}

// 2026-05-03: `defaultChecklist` removida. Reemplazada por
// `computeChecklistFromBackendVehicle` que calcula desde los datos reales.

/**
 * Calcula el checklist de validación documentaria CLIENT-SIDE.
 *
 * 2026-05-03: El backend NO tiene endpoint `/master/vehicles/:id/checklist`
 * (no está en el Excel oficial; verificado contra producción: 404).
 * Calculamos desde los campos del Vehicle ya cargado para que la UI muestre
 * el % real en lugar de un default 0%.
 */
function computeChecklistFromBackendVehicle(b: BackendVehicle): ValidationChecklist {
  const documents: ValidationChecklist["documents"] = [
    {
      id: "doc-plate",
      name: "Placa registrada",
      isRequired: true,
      status: b.plate ? "valid" : "missing",
    },
    {
      id: "doc-type",
      name: "Tipo y carrocería",
      isRequired: true,
      status: (b.type && b.body_type) ? "valid" : "missing",
    },
    {
      id: "doc-vin",
      name: "VIN / chassis",
      isRequired: true,
      status: b.vin ? "valid" : "missing",
    },
    {
      id: "doc-status",
      name: "Estado activo",
      isRequired: true,
      status: b.status === "active" ? "valid" : "missing",
    },
  ];
  const total = documents.filter(d => d.isRequired).length;
  const valid = documents.filter(d => d.status === "valid").length;
  return {
    entityId: b.id,
    entityType: "vehicle",
    documents,
    isComplete: valid === total,
    completionPercentage: total === 0 ? 0 : Math.round((valid / total) * 100),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// BACKEND → FRONTEND
// ════════════════════════════════════════════════════════════════════════════

export function mapVehicleFromBackend(b: BackendVehicle): Vehicle {
  const specs: VehicleSpecs = {
    brand: b.brand ?? "",
    model: b.model ?? "",
    year: b.year ?? new Date().getFullYear(),
    color: b.color ?? "",
    engineNumber: "",
    chassisNumber: b.vin ?? "",
    axles: 0,
    wheels: 0,
    fuelType: (b.fuel_type as VehicleSpecs["fuelType"]) ?? "diesel",
    fuelTankCapacity: 0,
    transmission: "manual",
  };

  const entityStatus: EntityStatus = b.status === "active" ? "active" : "inactive";

  return {
    id: b.id,
    code: b.code ?? "",
    plate: b.plate ?? "",
    trailerPlate: b.trailer_plate ?? undefined,
    type: (b.type as VehicleType) ?? "camion",
    bodyType: (b.body_type as BodyType) ?? ("furgon" as BodyType),
    specs,
    capacity: defaultCapacity(),
    registration: defaultRegistration(),
    insurancePolicies: [],
    inspectionHistory: [],
    operationalStatus: (b.operational_status as VehicleOperationalStatus) ?? "available",
    currentMileage: b.current_mileage ?? 0,
    maintenanceSchedules: [],
    maintenanceHistory: [],
    fuelHistory: [],
    incidents: [],
    certifications: [],
    documents: [],
    // Checklist calculado client-side. El backend no expone /:id/checklist.
    checklist: computeChecklistFromBackendVehicle(b),

    status: entityStatus,
    isEnabled: b.status === "active",

    operatorId: b.operator_id ?? undefined,
    // 2026-05-03 (issue CRITICAL #4): mapear current_driver_id que el backend
    // SI devuelve. Antes este campo se perdía silenciosamente, rompiendo:
    //  - assignment-modal (siempre veía vehiculo "sin driver")
    //  - filtros del listado (currentDriverId nunca filtraba)
    //  - lógica de asignación bidireccional driver↔vehicle
    currentDriverId: b.current_driver_id ?? undefined,
    gpsDeviceId: b.gps_device_id ?? undefined,
    notes: b.notes ?? undefined,
    // 2026-05-03: campos de bloqueo que el backend devuelve tras /block.
    blockedAt: b.blocked_at ?? undefined,
    blockedReason: b.blocked_reason ?? undefined,

    createdAt: b.created_at,
    updatedAt: b.updated_at,
  } as unknown as Vehicle;
}

// ════════════════════════════════════════════════════════════════════════════
// FRONTEND → BACKEND
// ════════════════════════════════════════════════════════════════════════════

export function mapVehicleToBackend(v: Partial<Vehicle>): BackendVehiclePayload {
  const payload: BackendVehiclePayload = {};

  // ── Identificación y planos ─────────────────────────────────────────
  if (v.code !== undefined) payload.code = v.code;
  if (v.plate !== undefined) payload.plate = v.plate;
  if (v.type !== undefined) payload.type = v.type;
  if (v.bodyType !== undefined) payload.body_type = v.bodyType;
  if (v.trailerPlate !== undefined) payload.trailer_plate = v.trailerPlate;
  if (v.gpsDeviceId !== undefined) payload.gps_device_id = v.gpsDeviceId;
  if (v.notes !== undefined) payload.notes = v.notes;
  if (v.operationalStatus !== undefined) payload.operational_status = v.operationalStatus;
  if (v.currentMileage !== undefined) payload.current_mileage = v.currentMileage;
  if (v.operatorId !== undefined) payload.operator_id = v.operatorId;
  // 2026-05-03 (issue CRITICAL #5): mapear currentDriverId al backend.
  // Antes el form lo capturaba pero el transformer NO lo enviaba — la
  // asignación driver→vehicle al crear/editar se descartaba silenciosamente.
  if (v.currentDriverId !== undefined) payload.current_driver_id = v.currentDriverId;

  // specs.{brand,model,year,color,fuelType,vin} → planos (lo que SÍ persiste hoy)
  if (v.specs) {
    if (v.specs.brand !== undefined) payload.brand = v.specs.brand;
    if (v.specs.model !== undefined) payload.model = v.specs.model;
    if (v.specs.year !== undefined) payload.year = v.specs.year;
    if (v.specs.color !== undefined) payload.color = v.specs.color;
    if (v.specs.fuelType !== undefined) payload.fuel_type = v.specs.fuelType;
    if (v.specs.chassisNumber !== undefined) payload.vin = v.specs.chassisNumber;
  }

  // capacity → planos al root para compat con backend actual
  if (v.capacity) {
    if (v.capacity.maxPayload !== undefined) payload.capacity_kg = v.capacity.maxPayload;
    if (v.capacity.maxVolume !== undefined) payload.capacity_m3 = v.capacity.maxVolume;
  }

  // ── Sub-objeto specs{} rico (form: engineNumber, axles, wheels, etc.) ───
  // 2026-05-03 (issues HIGH #11/#12):
  //  - NO mapear `engine_type` desde `fuelType` (campos semánticamente distintos).
  //    `engine_type` debería ser "atmospheric"/"turbo"; `fuelType` es "diesel"/"gasolina".
  //  - NO duplicar `engine_displacement` con `fuel_tank_capacity` (cilindrada vs
  //    capacidad de tanque son cosas diferentes). El frontend hoy no captura
  //    `engineDisplacement` separado, así que omitimos ese campo.
  if (v.specs) {
    const specs: BackendVehicleSpecsPayload = {};
    if (v.specs.engineNumber !== undefined) specs.engine_number = v.specs.engineNumber;
    if (v.specs.chassisNumber !== undefined) specs.chassis_number = v.specs.chassisNumber;
    if (v.specs.fuelTankCapacity !== undefined) specs.fuel_tank_capacity = v.specs.fuelTankCapacity;
    if (v.specs.axles !== undefined) specs.axles = v.specs.axles;
    if (v.specs.wheels !== undefined) specs.tires = v.specs.wheels;
    if (v.specs.transmission !== undefined) specs.transmission = v.specs.transmission;
    if (Object.keys(specs).length > 0) payload.specs = specs;
  }

  // ── Sub-objeto capacity{} rico ──────────────────────────────────────
  if (v.capacity) {
    const cap: BackendVehicleCapacityPayload = {};
    if (v.capacity.maxPayload !== undefined) cap.max_weight_kg = v.capacity.maxPayload;
    if (v.capacity.maxVolume !== undefined) cap.max_volume_m3 = v.capacity.maxVolume;
    if (v.capacity.palletCapacity !== undefined) cap.max_pallets = v.capacity.palletCapacity;
    if (v.capacity.grossWeight !== undefined) cap.gross_weight = v.capacity.grossWeight;
    if (v.capacity.tareWeight !== undefined) cap.tare_weight = v.capacity.tareWeight;
    if (Object.keys(cap).length > 0) payload.capacity = cap;
  }

  // ── Insurance: mandar singular (POST canónico) Y array (deuda backend) ──
  if (Array.isArray(v.insurancePolicies) && v.insurancePolicies.length > 0) {
    const mapPolicy = (p: NonNullable<Vehicle["insurancePolicies"]>[number]): BackendVehicleInsurancePayload => {
      const ins: BackendVehicleInsurancePayload = {};
      if (p.id) ins.id = p.id;
      if (p.type) ins.type = p.type;
      if (p.policyNumber) ins.policy_number = p.policyNumber;
      if (p.insurerName) ins.insurer = p.insurerName;
      if (p.startDate) ins.start_date = p.startDate;
      if (p.endDate) ins.end_date = p.endDate;
      if (p.coverageAmount !== undefined) ins.coverage_amount = p.coverageAmount;
      return ins;
    };

    // Singular: el backend v3 Rev3 POST espera `insurance: {…}` (objeto, no array).
    // Tomamos la primera (típicamente SOAT). Esta es la que el backend persiste hoy.
    payload.insurance = mapPolicy(v.insurancePolicies[0]);

    // Array completo: para cuando el backend implemente persistencia múltiple.
    payload.insurance_policies = v.insurancePolicies.map(mapPolicy);
  }

  // ── Registration (SUNARP / propietario) ─────────────────────────────
  if (v.registration) {
    const reg: BackendVehicleRegistrationPayload = {};
    if (v.registration.registrationNumber) reg.registration_number = v.registration.registrationNumber;
    if (v.registration.ownerName) reg.owner_name = v.registration.ownerName;
    if (v.registration.ownerDocument) reg.owner_document = v.registration.ownerDocument;
    if (v.registration.registrationDate) reg.registration_date = v.registration.registrationDate;
    if (v.registration.registryOffice) reg.registry_office = v.registration.registryOffice;
    if (Object.keys(reg).length > 0) payload.registration = reg;
  }

  // ── Documentos del vehículo (SOAT, revisión técnica, etc.) ──────────
  if (v.documents && v.documents.length > 0) {
    payload.documents = v.documents.map((doc) => {
      const d: BackendVehicleDocumentPayload = {};
      if (doc.id) d.id = doc.id;
      if (doc.name) d.name = doc.name;
      if (doc.isRequired !== undefined) d.is_required = doc.isRequired;
      if (doc.status) d.status = doc.status;
      if (doc.expirationDate) d.expiration_date = doc.expirationDate;
      if (doc.fileUrl) d.file_url = doc.fileUrl;
      return d;
    });
  }

  // Status derivado de isEnabled
  if (v.isEnabled === true) {
    payload.status = "active";
  } else if (v.isEnabled === false) {
    payload.status = "inactive";
  }

  return payload;
}
