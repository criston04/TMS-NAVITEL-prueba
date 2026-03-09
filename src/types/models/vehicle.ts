import { ActivatableEntity, RequiredDocument, ValidationChecklist } from "@/types/common";


/**
 * Tipo de vehículo según configuración
 */
export type VehicleType = 
  | "camion"        // Camión rígido
  | "tractocamion"  // Tracto camión (cabezal)
  | "remolque"      // Remolque
  | "semiremolque"  // Semirremolque
  | "furgoneta"     // Furgoneta de reparto
  | "pickup"        // Camioneta pickup
  | "minivan"       // Minivan de carga
  | "cisterna"      // Camión cisterna
  | "volquete";     // Volquete

/**
 * Tipo de carrocería
 */
export type BodyType = 
  | "furgon"            // Furgón cerrado
  | "furgon_frigorifico"// Furgón refrigerado
  | "plataforma"        // Plataforma abierta
  | "cisterna"          // Tanque/cisterna
  | "tolva"             // Tolva
  | "volquete"          // Volquete
  | "portacontenedor"   // Portacontenedor
  | "cama_baja"         // Cama baja
  | "jaula"             // Jaula para ganado
  | "baranda"           // Baranda rebatible
  | "otros";            // Otros

/**
 * Estado operativo del vehículo
 */
export type VehicleOperationalStatus = 
  | "available"     // Disponible para asignación
  | "on-route"      // En ruta activa
  | "loading"       // En proceso de carga
  | "unloading"     // En proceso de descarga
  | "maintenance"   // En mantenimiento programado
  | "repair"        // En reparación
  | "inspection"    // En inspección técnica
  | "standby"       // En espera (disponible pero no asignado)
  | "inactive"      // Inactivo/fuera de servicio
  | "operational"   // Operativo (alias de available)
  | "in_transit"    // En tránsito (alias de on-route)
  | "parked"        // Estacionado (alias de standby)
  | "in_maintenance" // En mantenimiento (alias de maintenance)
  | "out_of_service"; // Fuera de servicio (alias de inactive)

/**
 * Estado administrativo del vehículo
 */
export type VehicleStatus = 
  | "active"        // Activo en flota
  | "inactive"      // Inactivo temporalmente
  | "maintenance"   // En mantenimiento
  | "retired";      // Dado de baja

/**
 * Tipo de combustible
 */
export type FuelType = 
  | "diesel"      // Diésel
  | "gasoline"    // Gasolina
  | "gas_glp"     // GLP
  | "gas_gnv"     // GNV
  | "electric"    // Eléctrico
  | "hybrid";     // Híbrido

/**
 * Tipo de transmisión
 */
export type TransmissionType = "manual" | "automatic" | "semi_automatic";


/**
 * Especificaciones técnicas del vehículo
 */
export interface VehicleSpecs {
  /** Marca */
  brand: string;
  /** Modelo */
  model: string;
  /** Año de fabricación */
  year: number;
  /** Color */
  color: string;
  /** Número de motor */
  engineNumber: string;
  /** Número de chasis (VIN) */
  chassisNumber: string;
  /** Número de serie */
  serialNumber?: string;
  /** Número de ejes */
  axles: number;
  /** Número de ruedas */
  wheels: number;
  
  fuelType: FuelType;
  /** Capacidad del tanque (galones) */
  fuelTankCapacity: number;
  /** Tipo de transmisión */
  transmission: TransmissionType;
  /** Cilindrada (cc) */
  engineDisplacement?: number;
  /** Potencia (HP) */
  horsepower?: number;
  /** País de origen */
  countryOfOrigin?: string;
}

/**
 * Dimensiones del vehículo
 */
export interface VehicleDimensions {
  /** Largo total (metros) */
  length: number;
  /** Ancho total (metros) */
  width: number;
  /** Alto total (metros) */
  height: number;
  /** Largo de carrocería (metros) */
  cargoLength?: number;
  /** Ancho de carrocería (metros) */
  cargoWidth?: number;
  /** Alto de carrocería (metros) */
  cargoHeight?: number;
}

/**
 * Capacidad de carga
 */
export interface VehicleCapacity {
  /** Peso bruto vehicular (kg) */
  grossWeight: number;
  /** Tara/peso vacío (kg) */
  tareWeight: number;
  /** Capacidad de carga máxima (kg) */
  maxPayload: number;
  /** Capacidad de volumen (m³) */
  maxVolume?: number;
  /** Capacidad en pallets */
  palletCapacity?: number;
  /** Capacidad en unidades específicas */
  unitCapacity?: {
    type: string;
    quantity: number;
  };
}


/**
 * Tarjeta de propiedad vehicular
 */
export interface VehicleRegistration {
  /** Número de partida registral */
  registrationNumber: string;
  /** Placa anterior (si aplica) */
  previousPlate?: string;
  /** Nombre del propietario registrado */
  ownerName: string;
  /** RUC/DNI del propietario */
  ownerDocument: string;
  /** Fecha de inscripción */
  registrationDate: string;
  /** Sede SUNARP */
  registryOffice: string;
  /** URL del documento */
  fileUrl?: string;
}

/**
 * Tipo de seguro vehicular
 */
export type InsuranceType = 
  | "soat"                    // SOAT obligatorio
  | "rc_obligatorio"          // RC transportista obligatorio
  | "rc_complementario"       // RC complementario
  | "full_coverage"           // Todo riesgo
  | "cargo_insurance"         // Seguro de carga
  | "theft_insurance";        // Seguro contra robo

/**
 * Póliza de seguro
 */
export interface InsurancePolicy {
  /** ID único */
  id: string;
  
  type: InsuranceType;
  /** Número de póliza */
  policyNumber: string;
  /** Compañía aseguradora */
  insurerName: string;
  /** RUC de la aseguradora */
  insurerRuc?: string;
  /** Fecha de inicio de vigencia */
  startDate: string;
  /** Fecha de fin de vigencia */
  endDate: string;
  /** Monto de cobertura (USD o PEN) */
  coverageAmount: number;
  /** Moneda */
  currency: "PEN" | "USD";
  /** Prima pagada */
  premiumAmount?: number;
  /** Deducible */
  deductible?: number;
  /** Coberturas incluidas */
  coverages: string[];
  /** Es obligatorio */
  isRequired: boolean;
  /** URL del documento */
  fileUrl?: string;
  /** Estado de verificación */
  verificationStatus: "pending" | "verified" | "rejected";
}

/**
 * Resultado de inspección técnica
 */
export type InspectionResult = "approved" | "observations" | "rejected";

/**
 * Inspección técnica vehicular (CITV)
 */
export interface TechnicalInspection {
  /** ID único */
  id: string;
  /** Número de certificado */
  certificateNumber: string;
  /** Fecha de inspección */
  inspectionDate: string;
  
  expiryDate: string;
  /** Resultado */
  result: InspectionResult;
  /** Centro de inspección */
  inspectionCenter: string;
  /** RUC del centro */
  centerRuc?: string;
  /** Kilometraje al momento de inspección */
  mileageAtInspection: number;
  /** Observaciones encontradas */
  observations: InspectionObservation[];
  /** URL del certificado */
  fileUrl?: string;
}

/**
 * Observación de inspección
 */
export interface InspectionObservation {
  /** Código */
  code: string;
  /** Descripción */
  description: string;
  /** Severidad */
  severity: "minor" | "major" | "critical";
  /** Fue corregida */
  wasCorrected: boolean;
  /** Fecha de corrección */
  correctionDate?: string;
}

/**
 * Certificado de habilitación vehicular (MTC)
 */
export interface OperatingCertificate {
  /** ID único */
  id: string;
  /** Número de certificado */
  certificateNumber: string;
  /** Tipo de servicio habilitado */
  serviceType: "carga_general" | "carga_especial" | "materiales_peligrosos" | "pasajeros";
  /** Modalidad */
  modality?: string;
  /** Fecha de emisión */
  issueDate: string;
  
  expiryDate: string;
  /** Ámbito de operación */
  operationScope: "nacional" | "regional" | "urbano";
  /** Rutas autorizadas (si aplica) */
  authorizedRoutes?: string[];
  /** URL del documento */
  fileUrl?: string;
  /** Estado de verificación */
  verificationStatus: "pending" | "verified" | "rejected";
}


/**
 * Dispositivo GPS instalado
 */
export interface GPSDevice {
  /** ID único */
  id: string;
  
  deviceId: string;
  /** IMEI */
  imei: string;
  /** Número de SIM */
  simNumber?: string;
  /** Operador del SIM */
  simOperator?: string;
  /** Proveedor del servicio GPS */
  provider: string;
  /** Modelo del dispositivo */
  model: string;
  /** Fecha de instalación */
  installationDate: string;
  /** Fecha de última certificación */
  certificationDate: string;
  /** Fecha de vencimiento de certificación */
  certificationExpiry: string;
  /** Número de homologación MTC */
  homologationNumber: string;
  
  status: "active" | "inactive" | "malfunction" | "removed";
  /** Última señal recibida */
  lastSignalDate?: string;
  /** URL del certificado */
  fileUrl?: string;
}

/**
 * Ubicación del vehículo
 */
export interface VehicleLocation {
  /** Latitud */
  lat: number;
  /** Longitud */
  lng: number;
  /** Timestamp */
  timestamp: string;
  /** Velocidad (km/h) */
  speed?: number;
  /** Rumbo (grados) */
  heading?: number;
  /** Altitud (metros) */
  altitude?: number;
  /** Precisión (metros) */
  accuracy?: number;
  /** Motor encendido */
  engineOn?: boolean;
  /** Dirección geocodificada */
  address?: string;
}


/**
 * Tipo de mantenimiento
 */
export type MaintenanceType = 
  | "preventive"    // Mantenimiento preventivo programado
  | "corrective"    // Reparación correctiva
  | "inspection"    // Inspección de rutina
  | "emergency"     // Reparación de emergencia
  | "recall"        // Llamado a revisión del fabricante
  | "upgrade";      // Mejora/actualización

/**
 * Estado del mantenimiento
 */
export type MaintenanceStatus = 
  | "scheduled"     // Programado
  | "in_progress"   // En progreso
  | "completed"     // Completado
  | "cancelled"     // Cancelado
  | "overdue";      // Vencido/atrasado

/**
 * Registro de mantenimiento
 */
export interface MaintenanceRecord {
  /** ID único */
  id: string;
  /** ID del vehículo */
  vehicleId?: string;
  
  type: MaintenanceType;
  
  status?: MaintenanceStatus;
  /** Fecha programada */
  scheduledDate?: string;
  
  startDate?: string;
  /** Fecha de finalización */
  completionDate?: string;
  /** Fecha del mantenimiento (legacy) */
  date?: string;
  /** Kilometraje al momento del mantenimiento */
  mileage?: number;
  /** Odómetro al servicio */
  odometerAtService?: number;
  /** Descripción del trabajo realizado */
  description?: string;
  /** Trabajos específicos realizados */
  workItems?: MaintenanceWorkItem[];
  /** Costo estimado total */
  totalEstimatedCost?: number;
  /** Costo real total */
  totalActualCost?: number;
  /** Costo total (legacy) */
  totalCost?: number;
  /** Moneda */
  currency?: "PEN" | "USD";
  /** Taller/proveedor */
  workshopName?: string;
  /** Dirección del taller */
  workshopAddress?: string;
  /** RUC del taller */
  workshopRuc?: string;
  /** Número de orden de trabajo */
  workOrderNumber?: string;
  /** Técnico responsable */
  technicianName?: string;
  /** Próximo mantenimiento programado */
  nextMaintenanceMileage?: number;
  /** Odómetro próximo mantenimiento */
  nextMaintenanceOdometer?: number;
  /** Fecha del próximo mantenimiento */
  nextMaintenanceDate?: string;
  /** Tiempo fuera de servicio (horas) */
  downtimeHours?: number;
  /** Factura/documento de respaldo */
  invoiceUrl?: string;
  /** URL del archivo de factura */
  invoiceFileUrl?: string;
  /** Número de factura */
  invoiceNumber?: string;
  /** Garantía del trabajo */
  warrantyEndDate?: string;
  /** Notas adicionales */
  notes?: string;
  
  createdAt?: string;
  /** Fecha de actualización */
  updatedAt?: string;
}

/**
 * Item de trabajo de mantenimiento
 */
export interface MaintenanceWorkItem {
  /** ID único */
  id?: string;
  /** Descripción del trabajo */
  description: string;
  /** Categoría del trabajo */
  category?: string;
  /** Tipo: repuesto o mano de obra */
  type?: "part" | "labor";
  
  status?: "pending" | "in_progress" | "completed";
  /** Cantidad */
  quantity?: number;
  /** Costo unitario */
  unitCost?: number;
  /** Costo total */
  totalCost?: number;
  /** Costo estimado */
  estimatedCost?: number;
  /** Costo real */
  actualCost?: number;
  /** Número de parte (si aplica) */
  partNumber?: string;
}

/**
 * Programación de mantenimiento preventivo
 */
export interface MaintenanceSchedule {
  /** ID único */
  id: string;
  /** ID del vehículo */
  vehicleId?: string;
  /** Tipo de programación */
  type?: string;
  
  name?: string;
  /** Descripción */
  description?: string;
  /** Intervalo en kilómetros */
  intervalKm?: number;
  /** Intervalo en días */
  intervalDays?: number;
  /** Último mantenimiento realizado */
  lastPerformedDate?: string;
  /** Fecha último mantenimiento */
  lastMaintenanceDate?: string;
  /** Último kilometraje */
  lastPerformedMileage?: number;
  /** Odómetro último mantenimiento */
  lastMaintenanceOdometer?: number;
  /** Próxima fecha programada */
  nextDueDate?: string;
  /** Fecha próximo mantenimiento */
  nextMaintenanceDate?: string;
  /** Próximo kilometraje programado */
  nextDueMileage?: number;
  /** Odómetro próximo mantenimiento */
  nextMaintenanceOdometer?: number;
  /** Es crítico */
  isCritical?: boolean;
  /** Está activo */
  isActive?: boolean;
  /** Costo estimado */
  estimatedCost?: number;
  
  workItems?: string[];
}


/**
 * Registro de carga de combustible
 */
export interface FuelRecord {
  /** ID único */
  id: string;
  
  date: string;
  /** Kilometraje */
  mileage: number;
  /** Litros/galones cargados */
  quantity: number;
  /** Unidad */
  unit: "liters" | "gallons";
  /** Costo total */
  cost: number;
  /** Precio por unidad */
  pricePerUnit: number;
  /** Estación/proveedor */
  station: string;
  
  fuelType: FuelType;
  /** Tanque lleno */
  fullTank: boolean;
  /** ID del conductor que cargó */
  driverId?: string;
  /** Rendimiento calculado (km/gal o km/lt) */
  calculatedEfficiency?: number;
}

/**
 * Métricas de rendimiento del vehículo
 */
export interface VehiclePerformanceMetrics {
  /** Rendimiento promedio (km/gal) */
  averageFuelEfficiency: number;
  /** Costo por kilómetro */
  costPerKilometer: number;
  /** Kilometraje mensual promedio */
  averageMonthlyMileage: number;
  /** Porcentaje de disponibilidad */
  availabilityRate: number;
  /** Incidentes reportados */
  incidentCount: number;
  /** Días en mantenimiento */
  maintenanceDays: number;
  /** Período de evaluación */
  evaluationPeriod: {
    startDate: string;
    endDate: string;
  };
}


/**
 * Tipo de incidente vehicular
 */
export type VehicleIncidentType = 
  | "accident"          // Accidente de tránsito
  | "theft"             // Robo/hurto
  | "vandalism"         // Vandalismo
  | "breakdown"         // Avería en ruta
  | "tire_damage"       // Daño de neumático
  | "cargo_damage"      // Daño a la carga
  | "fuel_theft"        // Robo de combustible
  | "documentation"     // Problema de documentación
  | "traffic_ticket"    // Papeleta de tránsito
  | "other";            // Otros

/**
 * Incidente vehicular
 */
export interface VehicleIncident {
  /** ID único */
  id: string;
  
  type: VehicleIncidentType;
  /** Severidad */
  severity: "low" | "medium" | "high" | "critical";
  /** Fecha y hora del incidente */
  dateTime: string;
  /** Ubicación */
  location: {
    address: string;
    lat?: number;
    lng?: number;
  };
  /** Descripción */
  description: string;
  /** ID del conductor al momento del incidente */
  driverId?: string;
  
  driverName?: string;
  /** ID de la orden relacionada */
  orderId?: string;
  /** Daños reportados */
  damages?: string[];
  /** Costo estimado de reparación */
  estimatedCost?: number;
  /** Costo real */
  actualCost?: number;
  /** Número de siniestro (seguro) */
  claimNumber?: string;
  
  claimStatus?: "pending" | "approved" | "rejected" | "paid";
  /** Acción tomada */
  actionTaken?: string;
  
  status: "open" | "investigating" | "resolved" | "closed";
  /** Archivos adjuntos (fotos, reportes) */
  attachments?: string[];
  
  createdAt: string;
  /** Fecha de resolución */
  resolvedAt?: string;
}


/**
 * Certificación especial del vehículo
 */
export interface VehicleCertification {
  /** ID único */
  id: string;
  /** Tipo de certificación */
  type: 
    | "fumigation"          // Certificado de fumigación
    | "cold_chain"          // Certificación cadena de frío
    | "hazmat"              // Transporte de materiales peligrosos
    | "food_transport"      // Transporte de alimentos
    | "pharmaceutical"      // Transporte farmacéutico
    | "scale_calibration"   // Calibración de balanza
    | "crane_certification" // Certificación de grúa
    | "other";
  /** Nombre de la certificación */
  name: string;
  /** Número de certificado */
  certificateNumber: string;
  /** Entidad certificadora */
  certifyingEntity: string;
  /** Fecha de emisión */
  issueDate: string;
  
  expiryDate: string;
  /** Es obligatorio */
  isRequired: boolean;
  /** URL del documento */
  fileUrl?: string;
  /** Observaciones */
  observations?: string;
}


/**
 * Entidad Vehículo - Modelo completo
 * 
 * Representa un vehículo en el sistema con toda su documentación,
 * especificaciones, historial de mantenimiento y métricas.
 */
export interface Vehicle extends ActivatableEntity {
  /* --- Identificación --- */
  /** Código interno */
  code: string;
  /** Número de placa */
  plate: string;
  /** Placa de remolque (si aplica) */
  trailerPlate?: string;

  /* --- Clasificación --- */
  /** Tipo de vehículo */
  type: VehicleType;
  /** Tipo de carrocería */
  bodyType: BodyType;
  /** Categoría vehicular MTC */
  mtcCategory?: string;

  /* --- Especificaciones --- */
  /** Especificaciones técnicas */
  specs: VehicleSpecs;
  /** Dimensiones */
  dimensions?: VehicleDimensions;
  /** Capacidad de carga */
  capacity: VehicleCapacity;

  /* --- Documentación legal --- */
  /** Tarjeta de propiedad */
  registration: VehicleRegistration;
  /** Pólizas de seguro activas */
  insurancePolicies: InsurancePolicy[];
  /** Última inspección técnica */
  currentInspection?: TechnicalInspection;
  /** Historial de inspecciones */
  inspectionHistory: TechnicalInspection[];
  /** Certificado de operación vigente */
  operatingCertificate?: OperatingCertificate;

  /* --- GPS y telemetría --- */
  /** Dispositivo GPS instalado */
  gpsDevice?: GPSDevice;
  /** ID del dispositivo GPS (legacy) */
  gpsDeviceId?: string;
  /** Última ubicación conocida */
  lastLocation?: VehicleLocation;

  /* --- Estado operativo --- */
  /** Estado operativo actual */
  operationalStatus: VehicleOperationalStatus;
  /** Motivo de no disponibilidad */
  unavailabilityReason?: string;
  /** Fecha esperada de disponibilidad */
  expectedAvailableDate?: string;

  /* --- Kilometraje --- */
  /** Kilometraje actual */
  currentMileage: number;
  /** Fecha de última actualización del kilometraje */
  mileageLastUpdated?: string;

  /* --- Mantenimiento --- */
  /** Fecha de próximo mantenimiento */
  nextMaintenanceDate?: string;
  /** Kilometraje para próximo mantenimiento */
  nextMaintenanceMileage?: number;
  /** Historial de mantenimiento */
  maintenanceHistory: MaintenanceRecord[];
  /** Programación de mantenimientos */
  maintenanceSchedules: MaintenanceSchedule[];

  /* --- Consumo de combustible --- */
  /** Historial de cargas de combustible */
  fuelHistory: FuelRecord[];
  /** Rendimiento promedio actual */
  currentFuelEfficiency?: number;

  /* --- Incidentes --- */
  /** Incidentes registrados */
  incidents: VehicleIncident[];

  /* --- Certificaciones especiales --- */
  /** Certificaciones adicionales */
  certifications: VehicleCertification[];

  /* --- Métricas --- */
  /** Métricas de rendimiento */
  performanceMetrics?: VehiclePerformanceMetrics;

  /* --- Asignaciones --- */
  /** ID del operador logístico propietario */
  operatorId?: string;
  
  operatorName?: string;
  /** ID del conductor asignado actualmente */
  currentDriverId?: string;
  /** Nombre del conductor asignado */
  currentDriverName?: string;

  /* --- Documentación legacy (para checklist) --- */
  /** Checklist de documentos */
  checklist: ValidationChecklist;
  /** Documentos (formato legacy) */
  documents: RequiredDocument[];

  /* --- Multimedia --- */
  /** Fotos del vehículo */
  photos?: string[];

  /* --- Notas y etiquetas --- */
  /** Notas generales */
  notes?: string;
  /** Tags/etiquetas */
  tags?: string[];
}


/**
 * Datos para crear un nuevo vehículo
 */
export type CreateVehicleDTO = Omit<Vehicle,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "checklist"
  | "inspectionHistory"
  | "maintenanceHistory"
  | "fuelHistory"
  | "incidents"
  | "performanceMetrics"
>;

/**
 * Datos para actualizar un vehículo
 */
export type UpdateVehicleDTO = Partial<CreateVehicleDTO>;


/**
 * Estadísticas de vehículos
 */
export interface VehicleStats {
  /** Total de vehículos */
  total: number;
  /** Vehículos habilitados */
  enabled: number;
  /** Vehículos bloqueados */
  blocked: number;
  /** Documentos por vencer (30 días) */
  expiringSoon: number;
  /** Documentos vencidos */
  expired: number;
  /** Vehículos disponibles */
  available: number;
  /** Vehículos en ruta */
  onRoute: number;
  /** En mantenimiento */
  inMaintenance: number;
  /** En reparación */
  inRepair: number;
  /** Inactivos */
  inactive: number;
  /** Con incidentes abiertos */
  withOpenIncidents: number;
}

/**
 * Alertas de documentación vehicular
 */
export interface VehicleDocumentAlert {
  /** ID del vehículo */
  vehicleId: string;
  /** Placa del vehículo */
  vehiclePlate: string;
  
  documentType: string;
  
  documentName: string;
  
  expiryDate: string;
  /** Días restantes */
  daysRemaining: number;
  /** Nivel de alerta */
  alertLevel: "warning" | "urgent" | "expired";
}

/**
 * Alerta de mantenimiento
 */
export interface MaintenanceAlert {
  /** ID del vehículo */
  vehicleId: string;
  /** Placa */
  vehiclePlate: string;
  
  maintenanceType: string;
  /** Descripción */
  description: string;
  /** Kilometraje actual */
  currentMileage: number;
  /** Kilometraje programado */
  scheduledMileage?: number;
  /** Fecha programada */
  scheduledDate?: string;
  /** Nivel de urgencia */
  urgencyLevel: "normal" | "soon" | "overdue";
}
