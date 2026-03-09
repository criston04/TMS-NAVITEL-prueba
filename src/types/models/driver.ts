import { ActivatableEntity, RequiredDocument, ValidationChecklist } from "@/types/common";


/**
 * Categorías de licencia de conducir según MTC Perú
 * @see https://www.gob.pe/mtc - Reglamento de Licencias
 */
export type LicenseCategory = 
  | "A-I"      // Vehículos menores (moto/mototaxi)
  | "A-IIa"    // Vehículos hasta 3,500 kg
  | "A-IIb"    // Vehículos hasta 6,000 kg
  | "A-IIIa"   // Vehículos hasta 12,000 kg
  | "A-IIIb"   // Vehículos + 12,000 kg o articulados
  | "A-IIIc";  // Transporte de materiales peligrosos

/**
 * Estado del conductor en el sistema
 * Usado para gestión administrativa
 */
export type DriverStatus = 
  | "active"      // Activo en el sistema
  | "inactive"    // Inactivo temporalmente
  | "suspended"   // Suspendido por infracción
  | "on_leave"    // De permiso/licencia
  | "terminated"; // Cesado/Terminado

/**
 * Estado de disponibilidad del conductor
 * Usado para asignaciones operativas
 */
export type DriverAvailability = 
  | "available"    // Disponible para asignación
  | "on-route"     // En ruta activa
  | "resting"      // En descanso obligatorio
  | "vacation"     // Vacaciones programadas
  | "sick-leave"   // Descanso médico
  | "suspended"    // Suspendido temporalmente
  | "unavailable"; // No disponible (otros motivos)

/**
 * Tipo de documento de identidad para conductores
 * @note Renombrado para evitar conflicto con DocumentType de customer.ts
 */
export type DriverDocumentType = "DNI" | "CE" | "PASSPORT";

/**
 * Tipo de sangre
 */
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";


/**
 * Contacto de emergencia del conductor
 */
export interface EmergencyContact {
  /** Nombre completo del contacto */
  name: string;
  /** Relación con el conductor */
  relationship: "spouse" | "parent" | "sibling" | "child" | "friend" | "other";
  /** Descripción si es "other" */
  relationshipDetail?: string;
  /** Teléfono principal */
  phone: string;
  /** Teléfono alternativo */
  alternativePhone?: string;
  /** Dirección */
  address?: string;
}


/**
 * Restricciones de la licencia
 */
export interface LicenseRestrictions {
  /** Requiere lentes correctivos */
  requiresGlasses: boolean;
  /** Requiere audífonos */
  requiresHearingAid: boolean;
  /** Solo transmisión automática */
  automaticOnly: boolean;
  /** Otras restricciones */
  otherRestrictions?: string[];
}

/**
 * Información completa de licencia de conducir
 */
export interface DriverLicense {
  /** Número de licencia (formato: Q + 8 dígitos) */
  number: string;
  /** Categoría de licencia */
  category: LicenseCategory;
  /** Fecha de emisión */
  issueDate: string;
  
  expiryDate: string;
  /** Entidad emisora */
  issuingAuthority: string;
  /** País de emisión */
  issuingCountry: string;
  /** Puntos acumulados (sistema de puntos) */
  points: number;
  /** Máximo de puntos antes de suspensión */
  maxPoints: number;
  /** Restricciones */
  restrictions: LicenseRestrictions;
  /** URL del documento escaneado */
  fileUrl?: string;
  /** Estado de verificación */
  verificationStatus: "pending" | "verified" | "rejected";
  /** Fecha de última verificación */
  lastVerificationDate?: string;
}


/**
 * Tipo de examen médico
 */
export type MedicalExamType = 
  | "pre_employment"  // Pre-ocupacional
  | "periodic"        // Periódico anual
  | "post_incident"   // Post-accidente
  | "return_to_work"  // Reincorporación
  | "exit";           // Retiro

/**
 * Resultado del examen
 */
export type ExamResult = "approved" | "conditional" | "rejected" | "pending";

/**
 * Examen médico ocupacional
 */
export interface MedicalExam {
  /** ID único */
  id: string;
  
  type: MedicalExamType;
  
  date: string;
  
  expiryDate: string;
  /** Resultado */
  result: ExamResult;
  /** Restricciones médicas identificadas */
  restrictions: MedicalRestriction[];
  /** Nombre de la clínica */
  clinicName: string;
  /** RUC de la clínica */
  clinicRuc?: string;
  /** Nombre del médico evaluador */
  doctorName: string;
  /** CMP del médico */
  doctorCmp?: string;
  /** Número de certificado */
  certificateNumber: string;
  /** URL del certificado */
  fileUrl?: string;
  /** Observaciones */
  observations?: string;
  
  createdAt: string;
}

/**
 * Restricción médica
 */
export interface MedicalRestriction {
  /** Código de restricción */
  code: string;
  /** Descripción */
  description: string;
  /** Es temporal */
  isTemporary: boolean;
  /** Fecha de revisión (si temporal) */
  reviewDate?: string;
  /** Afecta capacidad de conducir */
  affectsDriving: boolean;
}

/**
 * Examen psicológico
 */
export interface PsychologicalExam {
  /** ID único */
  id: string;
  
  date: string;
  
  expiryDate: string;
  /** Resultado */
  result: ExamResult;
  /** Centro evaluador */
  centerName: string;
  /** Psicólogo evaluador */
  psychologistName: string;
  /** Número de colegiatura */
  psychologistLicense?: string;
  /** Número de certificado */
  certificateNumber: string;
  /** Perfil psicológico */
  profile: PsychologicalProfile;
  /** URL del certificado */
  fileUrl?: string;
  /** Observaciones */
  observations?: string;
  
  createdAt: string;
}

/**
 * Perfil psicológico evaluado
 */
export interface PsychologicalProfile {
  /** Nivel de estrés */
  stressLevel: "low" | "moderate" | "high";
  /** Tiempo de reacción */
  reactionTime: "normal" | "slow" | "very_slow";
  /** Atención y concentración */
  attentionLevel: "excellent" | "good" | "acceptable" | "poor";
  /** Manejo de presión */
  pressureHandling: "excellent" | "good" | "acceptable" | "poor";
  /** Observaciones adicionales */
  additionalNotes?: string;
}


/**
 * Tipos de certificación/capacitación
 */
export type CertificationType = 
  | "matpel"              // Materiales peligrosos
  | "sst_induction"       // Inducción SST
  | "sst_annual"          // Capacitación SST anual
  | "defensive_driving"   // Manejo defensivo
  | "first_aid"           // Primeros auxilios
  | "fire_safety"         // Uso de extintores
  | "cold_chain"          // Cadena de frío
  | "hazmat_awareness"    // Conciencia HAZMAT
  | "customer_service"    // Servicio al cliente
  | "gps_tracking"        // Uso de GPS/Telemetría
  | "load_securing"       // Aseguramiento de carga
  | "other";              // Otros

/**
 * Certificación de capacitación
 */
export interface TrainingCertification {
  /** ID único */
  id: string;
  /** Tipo de certificación */
  type: CertificationType;
  /** Nombre del curso/certificación */
  name: string;
  /** Descripción */
  description?: string;
  /** Fecha de emisión */
  issueDate: string;
  /** Fecha de vencimiento (null si no vence) */
  expiryDate?: string;
  /** Institución emisora */
  institutionName: string;
  /** RUC de la institución */
  institutionRuc?: string;
  /** Número de certificado */
  certificateNumber?: string;
  /** Horas de capacitación */
  hours: number;
  /** URL del certificado */
  fileUrl?: string;
  /** Es obligatorio */
  isRequired: boolean;
  
  createdAt: string;
}


/**
 * Antecedentes policiales
 */
export interface PoliceRecord {
  /** ID único */
  id: string;
  /** Fecha de emisión */
  issueDate: string;
  
  expiryDate: string;
  /** Resultado */
  result: "clean" | "with_records" | "pending";
  /** Número de certificado */
  certificateNumber: string;
  /** URL del documento */
  fileUrl?: string;
  /** Observaciones */
  observations?: string;
}

/**
 * Antecedentes penales
 */
export interface CriminalRecord {
  /** ID único */
  id: string;
  /** Fecha de emisión */
  issueDate: string;
  
  expiryDate: string;
  /** Resultado */
  result: "clean" | "with_records" | "pending";
  /** Número de certificado */
  certificateNumber: string;
  /** URL del documento */
  fileUrl?: string;
  /** Observaciones */
  observations?: string;
}

/**
 * Récord de conductor (papeletas/infracciones)
 */
export interface DrivingRecord {
  /** ID único */
  id: string;
  
  queryDate: string;
  /** Papeletas pendientes */
  pendingTickets: number;
  /** Monto total adeudado */
  totalDebt: number;
  /** Puntos acumulados */
  accumulatedPoints: number;
  /** Tiene suspensión activa */
  hasSuspension: boolean;
  /** Fecha fin de suspensión */
  suspensionEndDate?: string;
  /** Historial de infracciones */
  infractions: DrivingInfraction[];
  /** URL del reporte */
  fileUrl?: string;
}

/**
 * Infracción de tránsito
 */
export interface DrivingInfraction {
  /** Código de papeleta */
  ticketNumber: string;
  /** Fecha de infracción */
  date: string;
  /** Código de infracción */
  infractionCode: string;
  /** Descripción */
  description: string;
  /** Monto de multa */
  fineAmount: number;
  /** Estado */
  status: "pending" | "paid" | "contested" | "cancelled";
  /** Puntos descontados */
  points: number;
}


/**
 * Configuración de límites de conducción según normativa
 */
export interface DrivingLimits {
  /** Máximo de horas por día */
  maxHoursPerDay: number;
  /** Máximo de horas por semana */
  maxHoursPerWeek: number;
  /** Descanso requerido después de X horas */
  restRequiredAfterHours: number;
  /** Duración mínima del descanso (horas) */
  minRestDuration: number;
  /** Conducción nocturna permitida */
  nightDrivingAllowed: boolean;
  /** Horario nocturno inicio (HH:mm) */
  nightStartTime?: string;
  /** Horario nocturno fin (HH:mm) */
  nightEndTime?: string;
}

/**
 * Registro de horas de conducción
 */
export interface DrivingHoursLog {
  /** ID único */
  id: string;
  /** Fecha */
  date: string;
  /** Horas conducidas */
  hoursWorked: number;
  /** Horas de descanso */
  restHours: number;
  /** ID del vehículo */
  vehicleId: string;
  /** Placa del vehículo */
  vehiclePlate: string;
  /** IDs de rutas realizadas */
  routeIds: string[];
  /** Kilómetros recorridos */
  kilometersDrivern: number;
  /** Inicio del turno */
  shiftStart: string;
  /** Fin del turno */
  shiftEnd: string;
  /** Notas */
  notes?: string;
}

/**
 * Resumen semanal de horas
 */
export interface WeeklyHoursSummary {
  /** Semana (ISO format: YYYY-Www) */
  week: string;
  /** Total de horas conducidas */
  totalHours: number;
  /** Horas disponibles restantes */
  remainingHours: number;
  /** Días trabajados */
  daysWorked: number;
  /** Cumple con normativa */
  isCompliant: boolean;
  /** Detalles por día */
  dailyBreakdown: DrivingHoursLog[];
}


/**
 * Tipo de incidente
 */
export type IncidentType = 
  | "accident"           // Accidente vehicular
  | "traffic_violation"  // Infracción de tránsito
  | "cargo_damage"       // Daño a la carga
  | "customer_complaint" // Queja de cliente
  | "mechanical_issue"   // Problema mecánico reportado
  | "safety_violation"   // Violación de seguridad
  | "documentation"      // Problema de documentación
  | "other";             // Otros

/**
 * Severidad del incidente (importar de incident.ts si se necesita el tipo completo)
 * Se mantiene local para evitar dependencias circulares
 */
type DriverIncidentSeverity = "low" | "medium" | "high" | "critical";

/**
 * Incidente registrado
 */
export interface DriverIncident {
  /** ID único */
  id: string;
  
  type: IncidentType;
  /** Severidad */
  severity: DriverIncidentSeverity;
  
  date: string;
  /** Descripción */
  description: string;
  /** Ubicación */
  location?: string;
  /** ID del vehículo involucrado */
  vehicleId?: string;
  /** ID de la orden relacionada */
  orderId?: string;
  /** Acción tomada */
  actionTaken?: string;
  /** Costo asociado */
  cost?: number;
  /** Estado */
  status: "open" | "investigating" | "resolved" | "closed";
  /** Archivos adjuntos */
  attachments?: string[];
  
  createdAt: string;
  /** Fecha de resolución */
  resolvedAt?: string;
}


/**
 * Métricas de desempeño del conductor
 */
export interface DriverPerformanceMetrics {
  /** Calificación general (1-5) */
  overallRating: number;
  /** Entregas a tiempo (%) */
  onTimeDeliveryRate: number;
  /** Entregas completadas */
  completedDeliveries: number;
  /** Incidentes reportados */
  incidentCount: number;
  /** Quejas de clientes */
  customerComplaints: number;
  /** Consumo de combustible (km/gal promedio) */
  fuelEfficiency?: number;
  /** Kilómetros totales conducidos */
  totalKilometers: number;
  /** Período de evaluación */
  evaluationPeriod: {
    startDate: string;
    endDate: string;
  };
}


/**
 * Entidad Conductor - Modelo completo
 * 
 * Representa un conductor en el sistema con toda su documentación,
 * certificaciones, historial y métricas de desempeño.
 */
export interface Driver extends ActivatableEntity {
  /* --- Identificación --- */
  /** Código interno del conductor */
  code: string;
  /** Tipo de documento de identidad */
  documentType: DriverDocumentType;
  /** Número de documento */
  documentNumber: string;
  /** Nombres */
  firstName: string;
  /** Apellido paterno */
  lastName: string;
  /** Apellido materno */
  motherLastName?: string;
  /** Nombre completo (computed) */
  fullName: string;

  /* --- Información personal --- */
  /** Email corporativo */
  email: string;
  /** Teléfono personal */
  phone: string;
  /** Teléfono alternativo */
  alternativePhone?: string;
  
  birthDate: string;
  /** Lugar de nacimiento */
  birthPlace?: string;
  /** Nacionalidad */
  nationality: string;
  
  bloodType?: BloodType;
  /** Dirección de domicilio */
  address: string;
  /** Distrito */
  district?: string;
  /** Provincia */
  province?: string;
  /** Departamento */
  department?: string;

  /* --- Licencia de conducir --- */
  /** Información de licencia */
  license: DriverLicense;

  /* --- Contacto de emergencia --- */
  /** Contacto de emergencia principal */
  emergencyContact: EmergencyContact;
  /** Contactos de emergencia adicionales */
  additionalEmergencyContacts?: EmergencyContact[];

  /* --- Estado y disponibilidad --- */
  /** Disponibilidad actual */
  availability: DriverAvailability;
  /** Motivo de no disponibilidad */
  unavailabilityReason?: string;
  /** Fecha esperada de retorno */
  expectedReturnDate?: string;

  /* --- Exámenes médicos y psicológicos --- */
  /** Último examen médico */
  currentMedicalExam?: MedicalExam;
  /** Historial de exámenes médicos */
  medicalExamHistory: MedicalExam[];
  /** Último examen psicológico */
  currentPsychologicalExam?: PsychologicalExam;
  /** Historial de exámenes psicológicos */
  psychologicalExamHistory: PsychologicalExam[];

  /* --- Certificaciones --- */
  /** Certificaciones activas */
  certifications: TrainingCertification[];

  /* --- Antecedentes --- */
  /** Antecedentes policiales vigentes */
  policeRecord?: PoliceRecord;
  /** Antecedentes penales vigentes */
  criminalRecord?: CriminalRecord;
  /** Récord de conductor (papeletas) */
  drivingRecord?: DrivingRecord;

  /* --- Control de horas --- */
  /** Límites de conducción configurados */
  drivingLimits: DrivingLimits;
  /** Resumen de horas de la semana actual */
  currentWeekHours?: WeeklyHoursSummary;

  /* --- Incidentes e historial --- */
  /** Incidentes registrados */
  incidents: DriverIncident[];

  /* --- Métricas de desempeño --- */
  /** Métricas actuales */
  performanceMetrics?: DriverPerformanceMetrics;

  /* --- Información laboral --- */
  /** Fecha de contratación */
  hireDate: string;
  /** Fecha de término (si aplica) */
  terminationDate?: string;
  /** ID del operador logístico asignado */
  operatorId?: string;
  /** Nombre del operador logístico */
  operatorName?: string;

  /* --- Asignación actual --- */
  /** ID del vehículo asignado actualmente */
  assignedVehicleId?: string;
  /** Placa del vehículo asignado */
  assignedVehiclePlate?: string;

  /* --- Campos de compatibilidad legacy --- */
  /** Alias para nombre completo */
  name: string;
  /** Estado del conductor (alias de availability para compatibilidad) */
  status: DriverStatus;
  /** Número de licencia (shorthand) */
  licenseNumber?: string;
  /** Tipo de licencia (shorthand) */
  licenseType?: string;
  /** Fecha de vencimiento de licencia (shorthand) */
  licenseExpiry?: string;

  /* --- Documentación legacy (para checklist) --- */
  /** Checklist de documentos requeridos */
  checklist: ValidationChecklist;
  /** Documentos cargados (formato legacy) */
  documents: RequiredDocument[];

  /* --- Multimedia --- */
  /** Foto del conductor */
  photoUrl?: string;
  /** Firma digitalizada */
  signatureUrl?: string;

  /* --- Notas y observaciones --- */
  /** Notas generales */
  notes?: string;
  /** Tags/etiquetas */
  tags?: string[];
}


/**
 * Datos para crear un nuevo conductor
 */
export type CreateDriverDTO = Omit<Driver, 
  | "id" 
  | "createdAt" 
  | "updatedAt" 
  | "fullName"
  | "checklist"
  | "medicalExamHistory"
  | "psychologicalExamHistory"
  | "incidents"
  | "performanceMetrics"
  | "currentWeekHours"
>;

/**
 * Datos para actualizar un conductor
 */
export type UpdateDriverDTO = Partial<CreateDriverDTO>;


/**
 * Estadísticas de conductores
 */
export interface DriverStats {
  
  total: number;
  /** Conductores habilitados */
  enabled: number;
  /** Conductores bloqueados */
  blocked: number;
  /** Documentos por vencer (30 días) */
  expiringSoon: number;
  /** Documentos vencidos */
  expired: number;
  /** Conductores disponibles */
  available: number;
  /** Conductores en ruta */
  onRoute: number;
  /** En descanso */
  resting: number;
  /** En vacaciones */
  onVacation: number;
  /** Con incidentes abiertos */
  withOpenIncidents: number;
}

/**
 * Alertas de documentación
 */
export interface DriverDocumentAlert {
  
  driverId: string;
  
  driverName: string;
  
  documentType: string;
  
  documentName: string;
  
  expiryDate: string;
  /** Días restantes */
  daysRemaining: number;
  /** Nivel de alerta */
  alertLevel: "warning" | "urgent" | "expired";
}
