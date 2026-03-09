import { z } from "zod";
import type {
  VehicleType,
  BodyType,
  VehicleOperationalStatus,
  FuelType,
  TransmissionType,
  InsuranceType,
  InspectionResult,
  MaintenanceType,
} from "@/types/models/vehicle";
import type { LicenseCategory } from "@/types/models/driver";


/** Tipos de vehículo válidos */
export const VEHICLE_TYPES: VehicleType[] = [
  "camion", "tractocamion", "remolque", "semiremolque", 
  "furgoneta", "pickup", "minivan", "cisterna", "volquete"
];

/** Tipos de carrocería */
export const BODY_TYPES: BodyType[] = [
  "furgon", "furgon_frigorifico", "plataforma", "cisterna",
  "tolva", "volquete", "portacontenedor", "cama_baja", "jaula", "baranda", "otros"
];

/** Estados operativos del vehículo */
export const VEHICLE_OPERATIONAL_STATUSES: VehicleOperationalStatus[] = [
  "available", "on-route", "loading", "unloading", 
  "maintenance", "repair", "inspection", "standby", "inactive"
];

/** Tipos de combustible */
export const FUEL_TYPES: FuelType[] = [
  "diesel", "gasoline", "gas_glp", "gas_gnv", "electric", "hybrid"
];

/** Tipos de transmisión */
export const TRANSMISSION_TYPES: TransmissionType[] = [
  "manual", "automatic", "semi_automatic"
];

/** Tipos de seguro */
export const INSURANCE_TYPES: InsuranceType[] = [
  "soat", "rc_obligatorio", "rc_complementario", 
  "full_coverage", "cargo_insurance", "theft_insurance"
];

/** Resultados de inspección */
export const INSPECTION_RESULTS: InspectionResult[] = [
  "approved", "observations", "rejected"
];

/** Tipos de mantenimiento */
export const MAINTENANCE_TYPES: MaintenanceType[] = [
  "preventive", "corrective", "inspection", "emergency", "recall", "upgrade"
];

/** Descripciones de tipos de vehículo */
export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  camion: "Camión",
  tractocamion: "Tractocamión",
  remolque: "Remolque",
  semiremolque: "Semirremolque",
  furgoneta: "Furgoneta",
  pickup: "Pickup",
  minivan: "Minivan",
  cisterna: "Cisterna",
  volquete: "Volquete",
};

/** Descripciones de tipos de carrocería */
export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  furgon: "Furgón Cerrado",
  furgon_frigorifico: "Furgón Frigorífico",
  plataforma: "Plataforma",
  cisterna: "Cisterna/Tanque",
  tolva: "Tolva",
  volquete: "Volquete",
  portacontenedor: "Portacontenedor",
  cama_baja: "Cama Baja",
  jaula: "Jaula",
  baranda: "Baranda",
  otros: "Otros",
};

/** Descripciones de estados operativos */
export const OPERATIONAL_STATUS_LABELS: Record<VehicleOperationalStatus, string> = {
  available: "Disponible",
  "on-route": "En Ruta",
  loading: "Cargando",
  unloading: "Descargando",
  maintenance: "En Mantenimiento",
  repair: "En Reparación",
  inspection: "En Inspección",
  standby: "En Espera",
  inactive: "Inactivo",
  operational: "Operativo",
  in_transit: "En Tránsito",
  parked: "Estacionado",
  in_maintenance: "En Mantenimiento",
  out_of_service: "Fuera de Servicio",
};

/** Seguros obligatorios por tipo de operación */
export const REQUIRED_INSURANCES: Record<string, InsuranceType[]> = {
  general: ["soat", "rc_obligatorio"],
  hazmat: ["soat", "rc_obligatorio", "rc_complementario"],
  valuable_cargo: ["soat", "rc_obligatorio", "cargo_insurance"],
};

/** Categorías MTC por tipo de vehículo */
export const MTC_CATEGORIES: Record<VehicleType, string[]> = {
  pickup: ["M1", "N1"],
  minivan: ["M1", "N1"],
  furgoneta: ["N1", "N2"],
  camion: ["N2", "N3"],
  tractocamion: ["N3"],
  remolque: ["O2", "O3", "O4"],
  semiremolque: ["O3", "O4"],
  cisterna: ["N3"],
  volquete: ["N2", "N3"],
};

/** Intervalos de mantenimiento recomendados (km) */
export const MAINTENANCE_INTERVALS: Record<string, { km: number; days: number; description: string }> = {
  oil_change: { km: 10000, days: 180, description: "Cambio de aceite y filtros" },
  brake_inspection: { km: 20000, days: 180, description: "Inspección de frenos" },
  tire_rotation: { km: 15000, days: 180, description: "Rotación de neumáticos" },
  full_service: { km: 50000, days: 365, description: "Servicio completo" },
  transmission: { km: 60000, days: 730, description: "Servicio de transmisión" },
  cooling_system: { km: 40000, days: 365, description: "Sistema de enfriamiento" },
};


/**
 * Schema para especificaciones técnicas
 */
export const vehicleSpecsSchema = z.object({
  brand: z.string().min(2, "Marca requerida").max(50, "Marca muy larga"),
  model: z.string().min(1, "Modelo requerido").max(50, "Modelo muy largo"),
  year: z.number()
    .min(1990, "Año debe ser mayor a 1990")
    .max(new Date().getFullYear() + 1, "Año inválido"),
  color: z.string().min(2, "Color requerido").max(30, "Color muy largo"),
  engineNumber: z.string().min(5, "Número de motor muy corto").max(30, "Número de motor muy largo"),
  chassisNumber: z.string()
    .min(17, "VIN/Chasis debe tener 17 caracteres")
    .max(17, "VIN/Chasis debe tener 17 caracteres")
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, "Formato de VIN inválido"),
  serialNumber: z.string().optional(),
  axles: z.number().min(2, "Mínimo 2 ejes").max(10, "Máximo 10 ejes"),
  wheels: z.number().min(4, "Mínimo 4 ruedas").max(24, "Máximo 24 ruedas"),
  fuelType: z.enum(FUEL_TYPES as [FuelType, ...FuelType[]]),
  fuelTankCapacity: z.number().min(10, "Capacidad mínima 10 galones").max(500, "Capacidad máxima 500 galones"),
  transmission: z.enum(TRANSMISSION_TYPES as [TransmissionType, ...TransmissionType[]]),
  engineDisplacement: z.number().positive().optional(),
  horsepower: z.number().positive().optional(),
  countryOfOrigin: z.string().optional(),
});

/**
 * Schema para dimensiones del vehículo
 */
export const vehicleDimensionsSchema = z.object({
  length: z.number().positive("Largo debe ser positivo").max(25, "Largo máximo 25m"),
  width: z.number().positive("Ancho debe ser positivo").max(3, "Ancho máximo 3m"),
  height: z.number().positive("Alto debe ser positivo").max(4.5, "Alto máximo 4.5m"),
  cargoLength: z.number().positive().optional(),
  cargoWidth: z.number().positive().optional(),
  cargoHeight: z.number().positive().optional(),
});

/**
 * Schema para capacidad de carga
 */
export const vehicleCapacitySchema = z.object({
  grossWeight: z.number().positive("Peso bruto debe ser positivo"),
  tareWeight: z.number().positive("Tara debe ser positiva"),
  maxPayload: z.number().positive("Carga útil debe ser positiva"),
  maxVolume: z.number().positive().optional(),
  palletCapacity: z.number().int().positive().optional(),
  unitCapacity: z.object({
    type: z.string(),
    quantity: z.number().positive(),
  }).optional(),
}).refine(
  (data) => data.maxPayload <= data.grossWeight - data.tareWeight,
  {
    message: "La carga útil no puede exceder (Peso bruto - Tara)",
    path: ["maxPayload"],
  }
);


/**
 * Schema para tarjeta de propiedad
 */
export const vehicleRegistrationSchema = z.object({
  registrationNumber: z.string().min(5, "Número de partida requerido"),
  previousPlate: z.string().optional(),
  ownerName: z.string().min(3, "Nombre de propietario requerido"),
  ownerDocument: z.string().min(8, "Documento del propietario requerido"),
  registrationDate: z.string(),
  registryOffice: z.string().min(3, "Sede registral requerida"),
  fileUrl: z.string().url().optional(),
});

/**
 * Schema para póliza de seguro
 */
export const insurancePolicySchema = z.object({
  id: z.string().optional(),
  type: z.enum(INSURANCE_TYPES as [InsuranceType, ...InsuranceType[]]),
  policyNumber: z.string().min(5, "Número de póliza requerido"),
  insurerName: z.string().min(3, "Nombre de aseguradora requerido"),
  insurerRuc: z.string().regex(/^\d{11}$/, "RUC inválido").optional(),
  startDate: z.string(),
  endDate: z.string(),
  coverageAmount: z.number().positive("Monto de cobertura debe ser positivo"),
  currency: z.enum(["PEN", "USD"] as const),
  premiumAmount: z.number().positive().optional(),
  deductible: z.number().nonnegative().optional(),
  coverages: z.array(z.string()).min(1, "Al menos una cobertura requerida"),
  isRequired: z.boolean().default(false),
  fileUrl: z.string().url().optional(),
  verificationStatus: z.enum(["pending", "verified", "rejected"] as const).default("pending"),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  {
    message: "La fecha de fin debe ser posterior a la fecha de inicio",
    path: ["endDate"],
  }
);

/**
 * Schema para observación de inspección
 */
export const inspectionObservationSchema = z.object({
  code: z.string(),
  description: z.string(),
  severity: z.enum(["minor", "major", "critical"] as const),
  wasCorrected: z.boolean().default(false),
  correctionDate: z.string().optional(),
});

/**
 * Schema para inspección técnica
 */
export const technicalInspectionSchema = z.object({
  id: z.string().optional(),
  certificateNumber: z.string().min(5, "Número de certificado requerido"),
  inspectionDate: z.string(),
  expiryDate: z.string(),
  result: z.enum(INSPECTION_RESULTS as [InspectionResult, ...InspectionResult[]]),
  inspectionCenter: z.string().min(3, "Centro de inspección requerido"),
  centerRuc: z.string().regex(/^\d{11}$/, "RUC inválido").optional(),
  mileageAtInspection: z.number().nonnegative("Kilometraje debe ser positivo o cero"),
  observations: z.array(inspectionObservationSchema).default([]),
  fileUrl: z.string().url().optional(),
});

/**
 * Schema para certificado de operación
 */
export const operatingCertificateSchema = z.object({
  id: z.string().optional(),
  certificateNumber: z.string().min(5, "Número de certificado requerido"),
  serviceType: z.enum(["carga_general", "carga_especial", "materiales_peligrosos", "pasajeros"] as const),
  modality: z.string().optional(),
  issueDate: z.string(),
  expiryDate: z.string(),
  operationScope: z.enum(["nacional", "regional", "urbano"] as const),
  authorizedRoutes: z.array(z.string()).optional(),
  fileUrl: z.string().url().optional(),
  verificationStatus: z.enum(["pending", "verified", "rejected"] as const).default("pending"),
});


/**
 * Schema para dispositivo GPS
 */
export const gpsDeviceSchema = z.object({
  id: z.string().optional(),
  deviceId: z.string().min(5, "ID de dispositivo requerido"),
  imei: z.string().regex(/^\d{15}$/, "IMEI debe tener 15 dígitos"),
  simNumber: z.string().optional(),
  simOperator: z.string().optional(),
  provider: z.string().min(3, "Proveedor requerido"),
  model: z.string().min(2, "Modelo requerido"),
  installationDate: z.string(),
  certificationDate: z.string(),
  certificationExpiry: z.string(),
  homologationNumber: z.string().min(5, "Número de homologación requerido"),
  status: z.enum(["active", "inactive", "malfunction", "removed"] as const).default("active"),
  lastSignalDate: z.string().optional(),
  fileUrl: z.string().url().optional(),
});


/**
 * Schema para item de trabajo de mantenimiento
 */
export const maintenanceWorkItemSchema = z.object({
  description: z.string().min(3, "Descripción requerida"),
  type: z.enum(["part", "labor"] as const),
  quantity: z.number().positive("Cantidad debe ser positiva"),
  unitCost: z.number().nonnegative("Costo unitario debe ser positivo o cero"),
  totalCost: z.number().nonnegative("Costo total debe ser positivo o cero"),
  partNumber: z.string().optional(),
});

/**
 * Schema para registro de mantenimiento
 */
export const maintenanceRecordSchema = z.object({
  id: z.string().optional(),
  type: z.enum(MAINTENANCE_TYPES as [MaintenanceType, ...MaintenanceType[]]),
  date: z.string(),
  mileage: z.number().nonnegative("Kilometraje debe ser positivo o cero"),
  description: z.string().min(10, "Descripción muy corta"),
  workItems: z.array(maintenanceWorkItemSchema).min(1, "Al menos un item de trabajo requerido"),
  totalCost: z.number().nonnegative("Costo total debe ser positivo o cero"),
  currency: z.enum(["PEN", "USD"] as const),
  workshopName: z.string().min(3, "Nombre del taller requerido"),
  workshopRuc: z.string().regex(/^\d{11}$/, "RUC inválido").optional(),
  workOrderNumber: z.string().optional(),
  technicianName: z.string().optional(),
  nextMaintenanceMileage: z.number().positive().optional(),
  nextMaintenanceDate: z.string().optional(),
  downtimeHours: z.number().nonnegative().optional(),
  invoiceUrl: z.string().url().optional(),
  warrantyEndDate: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Schema para programación de mantenimiento
 */
export const maintenanceScheduleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Nombre requerido"),
  description: z.string(),
  intervalKm: z.number().positive().optional(),
  intervalDays: z.number().positive().optional(),
  lastPerformedDate: z.string().optional(),
  lastPerformedMileage: z.number().nonnegative().optional(),
  nextDueDate: z.string().optional(),
  nextDueMileage: z.number().positive().optional(),
  isCritical: z.boolean().default(false),
  estimatedCost: z.number().nonnegative().optional(),
}).refine(
  (data) => data.intervalKm || data.intervalDays,
  {
    message: "Debe especificar intervalo en kilómetros o días",
    path: ["intervalKm"],
  }
);

/**
 * Schema para registro de combustible
 */
export const fuelRecordSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  mileage: z.number().nonnegative("Kilometraje debe ser positivo o cero"),
  quantity: z.number().positive("Cantidad debe ser positiva"),
  unit: z.enum(["liters", "gallons"] as const),
  cost: z.number().positive("Costo debe ser positivo"),
  pricePerUnit: z.number().positive("Precio por unidad debe ser positivo"),
  station: z.string().min(3, "Estación requerida"),
  fuelType: z.enum(FUEL_TYPES as [FuelType, ...FuelType[]]),
  fullTank: z.boolean().default(true),
  driverId: z.string().optional(),
  calculatedEfficiency: z.number().positive().optional(),
});


/**
 * Schema para validar placa peruana
 */
export const plateSchema = z.string()
  .regex(
    /^[A-Z]{3}-\d{3}$|^[A-Z]\d[A-Z]-\d{3}$|^[A-Z]{2}\d-\d{3}$/,
    "Formato de placa inválido. Formatos válidos: ABC-123, A1B-234, AB1-234"
  );

/**
 * Schema completo para crear/editar vehículo
 */
export const vehicleSchema = z.object({
  // Identificación
  code: z.string().min(3, "Código muy corto").max(20, "Código muy largo"),
  plate: plateSchema,
  trailerPlate: plateSchema.optional(),

  // Clasificación
  type: z.enum(VEHICLE_TYPES as [VehicleType, ...VehicleType[]]),
  bodyType: z.enum(BODY_TYPES as [BodyType, ...BodyType[]]),
  mtcCategory: z.string().optional(),

  // Especificaciones
  specs: vehicleSpecsSchema,
  dimensions: vehicleDimensionsSchema.optional(),
  capacity: vehicleCapacitySchema,

  // Documentación
  registration: vehicleRegistrationSchema,

  operationalStatus: z.enum(VEHICLE_OPERATIONAL_STATUSES as [VehicleOperationalStatus, ...VehicleOperationalStatus[]]).default("available"),
  unavailabilityReason: z.string().optional(),
  expectedAvailableDate: z.string().optional(),

  // Kilometraje
  currentMileage: z.number().nonnegative("Kilometraje debe ser positivo o cero"),
  mileageLastUpdated: z.string().optional(),

  // Asignaciones
  operatorId: z.string().optional(),
  currentDriverId: z.string().optional(),

  // Notas
  notes: z.string().max(1000, "Notas muy largas").optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Schema para actualizar vehículo (campos parciales)
 */
export const updateVehicleSchema = vehicleSchema.partial();


/**
 * Valida si un documento está vigente
 */
export function isDocumentValid(expiryDate: string): boolean {
  return new Date(expiryDate) > new Date();
}

/**
 * Calcula días restantes de vigencia (para vehículos)
 * @deprecated Usar getDaysUntilExpiry de driver-validators
 */
export function getVehicleDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determina el nivel de alerta según días restantes (para vehículos)
 * @deprecated Usar getExpiryAlertLevel de driver-validators
 */
export function getVehicleExpiryAlertLevel(daysRemaining: number): "ok" | "warning" | "urgent" | "expired" {
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 15) return "urgent";
  if (daysRemaining <= 30) return "warning";
  return "ok";
}

/**
 * Valida si el vehículo puede ser habilitado
 */
export function validateVehicleEligibility(vehicle: {
  insurancePolicies: Array<{ type: InsuranceType; endDate: string; verificationStatus: string }>;
  currentInspection?: { expiryDate: string; result: InspectionResult };
  operatingCertificate?: { expiryDate: string; verificationStatus: string };
  gpsDevice?: { status: string; certificationExpiry: string };
}): { isEligible: boolean; issues: string[] } {
  const issues: string[] = [];
  const today = new Date();

  // Validar SOAT
  const soat = vehicle.insurancePolicies.find(p => p.type === "soat");
  if (!soat) {
    issues.push("Sin SOAT registrado");
  } else {
    if (new Date(soat.endDate) <= today) {
      issues.push("SOAT vencido");
    }
    if (soat.verificationStatus !== "verified") {
      issues.push("SOAT no verificado");
    }
  }

  // Validar RC obligatorio
  const rcObligatorio = vehicle.insurancePolicies.find(p => p.type === "rc_obligatorio");
  if (!rcObligatorio) {
    issues.push("Sin Responsabilidad Civil obligatoria");
  } else {
    if (new Date(rcObligatorio.endDate) <= today) {
      issues.push("Responsabilidad Civil vencida");
    }
    if (rcObligatorio.verificationStatus !== "verified") {
      issues.push("Responsabilidad Civil no verificada");
    }
  }

  // Validar inspección técnica
  if (!vehicle.currentInspection) {
    issues.push("Sin inspección técnica registrada");
  } else {
    if (new Date(vehicle.currentInspection.expiryDate) <= today) {
      issues.push("Inspección técnica vencida");
    }
    if (vehicle.currentInspection.result !== "approved") {
      issues.push("Inspección técnica no aprobada");
    }
  }

  // Validar certificado de operación
  if (!vehicle.operatingCertificate) {
    issues.push("Sin certificado de operación");
  } else {
    if (new Date(vehicle.operatingCertificate.expiryDate) <= today) {
      issues.push("Certificado de operación vencido");
    }
    if (vehicle.operatingCertificate.verificationStatus !== "verified") {
      issues.push("Certificado de operación no verificado");
    }
  }

  // Validar GPS
  if (!vehicle.gpsDevice) {
    issues.push("Sin dispositivo GPS instalado");
  } else {
    if (vehicle.gpsDevice.status !== "active") {
      issues.push("Dispositivo GPS no activo");
    }
    if (new Date(vehicle.gpsDevice.certificationExpiry) <= today) {
      issues.push("Certificación GPS vencida");
    }
  }

  return {
    isEligible: issues.length === 0,
    issues,
  };
}

/**
 * Valida compatibilidad entre licencia del conductor y vehículo
 */
export function validateDriverVehicleCompatibility(
  licenseCategory: LicenseCategory,
  vehicleType: VehicleType,
  grossWeight: number
): { isCompatible: boolean; message: string } {
  // Mapa de peso máximo por categoría de licencia
  const maxWeightByCategory: Record<LicenseCategory, number> = {
    "A-I": 500,      // Vehículos menores
    "A-IIa": 3500,   // Hasta 3,500 kg
    "A-IIb": 6000,   // Hasta 6,000 kg
    "A-IIIa": 12000, // Hasta 12,000 kg
    "A-IIIb": 999999, // Sin límite
    "A-IIIc": 999999, // Sin límite (materiales peligrosos)
  };

  const vehicleRequirements: Partial<Record<VehicleType, LicenseCategory[]>> = {
    tractocamion: ["A-IIIa", "A-IIIb", "A-IIIc"],
    remolque: ["A-IIIb", "A-IIIc"],
    semiremolque: ["A-IIIb", "A-IIIc"],
    cisterna: ["A-IIIc"],
  };

  // Verificar requisitos específicos del tipo de vehículo
  const requiredCategories = vehicleRequirements[vehicleType];
  if (requiredCategories && !requiredCategories.includes(licenseCategory)) {
    return {
      isCompatible: false,
      message: `El tipo de vehículo ${VEHICLE_TYPE_LABELS[vehicleType]} requiere licencia ${requiredCategories.join(" o ")}`,
    };
  }

  // Verificar peso máximo
  const maxWeight = maxWeightByCategory[licenseCategory];
  if (grossWeight > maxWeight) {
    return {
      isCompatible: false,
      message: `La licencia ${licenseCategory} permite hasta ${maxWeight.toLocaleString()} kg. El vehículo pesa ${grossWeight.toLocaleString()} kg`,
    };
  }

  return {
    isCompatible: true,
    message: `Licencia ${licenseCategory} es compatible con ${VEHICLE_TYPE_LABELS[vehicleType]}`,
  };
}

/**
 * Calcula próximo mantenimiento basado en kilometraje e intervalo
 */
export function calculateNextMaintenance(
  currentMileage: number,
  lastMaintenanceMileage: number,
  intervalKm: number
): { dueMileage: number; kmRemaining: number; isOverdue: boolean } {
  const dueMileage = lastMaintenanceMileage + intervalKm;
  const kmRemaining = dueMileage - currentMileage;
  const isOverdue = kmRemaining < 0;

  return {
    dueMileage,
    kmRemaining,
    isOverdue,
  };
}

/**
 * Calcula rendimiento de combustible
 */
export function calculateFuelEfficiency(
  kilometers: number,
  fuelUsed: number,
  unit: "liters" | "gallons"
): number {
  if (fuelUsed <= 0) return 0;
  
  // Convertir a km/galón si está en litros (1 galón = 3.785 litros)
  const gallons = unit === "liters" ? fuelUsed / 3.785 : fuelUsed;
  return kilometers / gallons;
}

/**
 * Genera código de vehículo automáticamente
 */
export function generateVehicleCode(sequence: number, type: VehicleType): string {
  const prefix = type.substring(0, 3).toUpperCase();
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Valida formato de placa peruana
 */
export function isValidPeruvianPlate(plate: string): boolean {
  // Formatos válidos: ABC-123, A1B-234, AB1-234
  const patterns = [
    /^[A-Z]{3}-\d{3}$/,    // ABC-123
    /^[A-Z]\d[A-Z]-\d{3}$/, // A1B-234
    /^[A-Z]{2}\d-\d{3}$/,   // AB1-234
  ];
  
  return patterns.some(pattern => pattern.test(plate.toUpperCase()));
}

/**
 * Formatea placa a formato estándar
 */
export function formatPlate(plate: string): string {
  const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length === 6) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3)}`;
  }
  return plate.toUpperCase();
}

/**
 * Obtiene la categoría MTC sugerida según tipo de vehículo
 */
export function getSuggestedMtcCategory(type: VehicleType, grossWeight: number): string {
  if (type === "remolque" || type === "semiremolque") {
    if (grossWeight <= 750) return "O1";
    if (grossWeight <= 3500) return "O2";
    if (grossWeight <= 10000) return "O3";
    return "O4";
  }

  if (type === "pickup" || type === "minivan") {
    return grossWeight <= 3500 ? "N1" : "N2";
  }

  if (grossWeight <= 3500) return "N1";
  if (grossWeight <= 12000) return "N2";
  return "N3";
}

/**
 * Calcula antigüedad del vehículo
 */
export function calculateVehicleAge(year: number): number {
  return new Date().getFullYear() - year;
}

/**
 * Determina si el vehículo requiere inspección más frecuente por antigüedad
 */
export function requiresFrequentInspection(year: number): boolean {
  const age = calculateVehicleAge(year);
  return age >= 10; // Vehículos con 10+ años requieren inspección semestral
}
