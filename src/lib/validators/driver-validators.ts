import { z } from "zod";
import type { 
  LicenseCategory, 
  DriverAvailability,
  MedicalExamType,
  ExamResult,
  CertificationType,
  DriverDocumentType,
  BloodType,
} from "@/types/models/driver";

/** @deprecated Use DriverDocumentType instead */
type DocumentType = DriverDocumentType;
import type { VehicleType } from "@/types/models/vehicle";


/** Categorías de licencia válidas en Perú */
export const LICENSE_CATEGORIES: LicenseCategory[] = [
  "A-I", "A-IIa", "A-IIb", "A-IIIa", "A-IIIb", "A-IIIc"
];

/** Estados de disponibilidad del conductor */
export const DRIVER_AVAILABILITY_STATES: DriverAvailability[] = [
  "available", "on-route", "resting", "vacation", "sick-leave", "suspended", "unavailable"
];

/** Tipos de documento de identidad */
export const DOCUMENT_TYPES: DocumentType[] = ["DNI", "CE", "PASSPORT"];

/** Tipos de sangre */
export const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/** Tipos de examen médico */
export const MEDICAL_EXAM_TYPES: MedicalExamType[] = [
  "pre_employment", "periodic", "post_incident", "return_to_work", "exit"
];

/** Resultados de examen */
export const EXAM_RESULTS: ExamResult[] = ["approved", "conditional", "rejected", "pending"];

/** Tipos de certificación */
export const CERTIFICATION_TYPES: CertificationType[] = [
  "matpel", "sst_induction", "sst_annual", "defensive_driving", "first_aid",
  "fire_safety", "cold_chain", "hazmat_awareness", "customer_service",
  "gps_tracking", "load_securing", "other"
];

/** Longitud de documentos por tipo */
export const DOCUMENT_LENGTHS: Record<DocumentType, { min: number; max: number }> = {
  DNI: { min: 8, max: 8 },
  CE: { min: 9, max: 12 },
  PASSPORT: { min: 6, max: 12 },
};

/** Compatibilidad licencia - tipo de vehículo */
export const LICENSE_VEHICLE_COMPATIBILITY: Record<LicenseCategory, VehicleType[]> = {
  "A-I": ["pickup", "minivan"],
  "A-IIa": ["pickup", "minivan", "furgoneta"],
  "A-IIb": ["pickup", "minivan", "furgoneta", "camion"],
  "A-IIIa": ["pickup", "minivan", "furgoneta", "camion", "tractocamion"],
  "A-IIIb": ["pickup", "minivan", "furgoneta", "camion", "tractocamion", "remolque", "semiremolque"],
  "A-IIIc": ["pickup", "minivan", "furgoneta", "camion", "tractocamion", "remolque", "semiremolque", "cisterna", "volquete"],
};

/** Descripción de categorías de licencia */
export const LICENSE_CATEGORY_DESCRIPTIONS: Record<LicenseCategory, string> = {
  "A-I": "Vehículos menores (motocicletas, mototaxis)",
  "A-IIa": "Vehículos hasta 3,500 kg",
  "A-IIb": "Vehículos hasta 6,000 kg",
  "A-IIIa": "Vehículos hasta 12,000 kg",
  "A-IIIb": "Vehículos mayores a 12,000 kg o articulados",
  "A-IIIc": "Transporte de materiales peligrosos",
};

/** Certificaciones requeridas por tipo de conductor/operación */
export const REQUIRED_CERTIFICATIONS: Record<string, CertificationType[]> = {
  "general": ["sst_induction", "defensive_driving"],
  "hazmat": ["matpel", "hazmat_awareness", "first_aid", "fire_safety"],
  "cold_chain": ["cold_chain", "sst_induction"],
  "customer_facing": ["customer_service", "sst_induction"],
};


/**
 * Schema para número de documento peruano
 */
export const documentNumberSchema = z.object({
  type: z.enum(["DNI", "CE", "PASSPORT"] as const),
  number: z.string(),
}).refine(
  (data) => {
    const length = DOCUMENT_LENGTHS[data.type];
    return data.number.length >= length.min && data.number.length <= length.max;
  },
  {
    message: "Longitud de documento inválida",
    path: ["number"],
  }
).refine(
  (data) => {
    if (data.type === "DNI") {
      return /^\d{8}$/.test(data.number);
    }
    return /^[A-Z0-9]+$/i.test(data.number);
  },
  {
    message: "Formato de documento inválido",
    path: ["number"],
  }
);

/**
 * Schema para contacto de emergencia
 */
export const emergencyContactSchema = z.object({
  name: z.string().min(3, "Nombre muy corto").max(100, "Nombre muy largo"),
  relationship: z.enum(["spouse", "parent", "sibling", "child", "friend", "other"] as const),
  relationshipDetail: z.string().optional(),
  phone: z.string().regex(/^\+?[0-9\s-]{9,15}$/, "Teléfono inválido"),
  alternativePhone: z.string().regex(/^\+?[0-9\s-]{9,15}$/, "Teléfono inválido").optional(),
  address: z.string().optional(),
});

/**
 * Schema para restricciones de licencia
 */
export const licenseRestrictionsSchema = z.object({
  requiresGlasses: z.boolean().default(false),
  requiresHearingAid: z.boolean().default(false),
  automaticOnly: z.boolean().default(false),
  otherRestrictions: z.array(z.string()).optional(),
});

/**
 * Schema para licencia de conducir
 */
export const driverLicenseSchema = z.object({
  number: z.string()
    .regex(/^[A-Z]\d{8}$/, "Formato de licencia inválido. Debe ser letra + 8 dígitos (ej: Q12345678)"),
  category: z.enum(LICENSE_CATEGORIES as [LicenseCategory, ...LicenseCategory[]]),
  issueDate: z.string().refine(
    (date) => new Date(date) <= new Date(),
    "La fecha de emisión no puede ser futura"
  ),
  expiryDate: z.string(),
  issuingAuthority: z.string().min(3, "Autoridad emisora requerida"),
  issuingCountry: z.string().default("Perú"),
  points: z.number().min(0).max(100).default(0),
  maxPoints: z.number().default(100),
  restrictions: licenseRestrictionsSchema,
  fileUrl: z.string().url().optional(),
  verificationStatus: z.enum(["pending", "verified", "rejected"] as const).default("pending"),
  lastVerificationDate: z.string().optional(),
});


/**
 * Schema para restricción médica
 */
export const medicalRestrictionSchema = z.object({
  code: z.string(),
  description: z.string(),
  isTemporary: z.boolean(),
  reviewDate: z.string().optional(),
  affectsDriving: z.boolean(),
});

/**
 * Schema para examen médico
 */
export const medicalExamSchema = z.object({
  id: z.string().optional(),
  type: z.enum(MEDICAL_EXAM_TYPES as [MedicalExamType, ...MedicalExamType[]]),
  date: z.string(),
  expiryDate: z.string(),
  result: z.enum(EXAM_RESULTS as [ExamResult, ...ExamResult[]]),
  restrictions: z.array(medicalRestrictionSchema).default([]),
  clinicName: z.string().min(3, "Nombre de clínica requerido"),
  clinicRuc: z.string().regex(/^\d{11}$/, "RUC inválido").optional(),
  doctorName: z.string().min(3, "Nombre del médico requerido"),
  doctorCmp: z.string().optional(),
  certificateNumber: z.string().min(3, "Número de certificado requerido"),
  fileUrl: z.string().url().optional(),
  observations: z.string().optional(),
});

/**
 * Schema para perfil psicológico
 */
export const psychologicalProfileSchema = z.object({
  stressLevel: z.enum(["low", "moderate", "high"] as const),
  reactionTime: z.enum(["normal", "slow", "very_slow"] as const),
  attentionLevel: z.enum(["excellent", "good", "acceptable", "poor"] as const),
  pressureHandling: z.enum(["excellent", "good", "acceptable", "poor"] as const),
  additionalNotes: z.string().optional(),
});

/**
 * Schema para examen psicológico
 */
export const psychologicalExamSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  expiryDate: z.string(),
  result: z.enum(EXAM_RESULTS as [ExamResult, ...ExamResult[]]),
  centerName: z.string().min(3, "Nombre del centro requerido"),
  psychologistName: z.string().min(3, "Nombre del psicólogo requerido"),
  psychologistLicense: z.string().optional(),
  certificateNumber: z.string().min(3, "Número de certificado requerido"),
  profile: psychologicalProfileSchema,
  fileUrl: z.string().url().optional(),
  observations: z.string().optional(),
});


/**
 * Schema para certificación de capacitación
 */
export const trainingCertificationSchema = z.object({
  id: z.string().optional(),
  type: z.enum(CERTIFICATION_TYPES as [CertificationType, ...CertificationType[]]),
  name: z.string().min(3, "Nombre de certificación requerido"),
  description: z.string().optional(),
  issueDate: z.string(),
  expiryDate: z.string().optional(),
  institutionName: z.string().min(3, "Nombre de institución requerido"),
  institutionRuc: z.string().regex(/^\d{11}$/, "RUC inválido").optional(),
  certificateNumber: z.string().optional(),
  hours: z.number().min(1, "Las horas deben ser al menos 1"),
  fileUrl: z.string().url().optional(),
  isRequired: z.boolean().default(false),
});


/**
 * Schema para antecedentes policiales
 */
export const policeRecordSchema = z.object({
  id: z.string().optional(),
  issueDate: z.string(),
  expiryDate: z.string(),
  result: z.enum(["clean", "with_records", "pending"] as const),
  certificateNumber: z.string().min(3, "Número de certificado requerido"),
  fileUrl: z.string().url().optional(),
  observations: z.string().optional(),
});

/**
 * Schema para antecedentes penales
 */
export const criminalRecordSchema = z.object({
  id: z.string().optional(),
  issueDate: z.string(),
  expiryDate: z.string(),
  result: z.enum(["clean", "with_records", "pending"] as const),
  certificateNumber: z.string().min(3, "Número de certificado requerido"),
  fileUrl: z.string().url().optional(),
  observations: z.string().optional(),
});


/**
 * Schema para límites de conducción
 */
export const drivingLimitsSchema = z.object({
  maxHoursPerDay: z.number().min(1).max(12).default(8),
  maxHoursPerWeek: z.number().min(1).max(60).default(48),
  restRequiredAfterHours: z.number().min(1).max(8).default(4),
  minRestDuration: z.number().min(0.5).max(12).default(0.5),
  nightDrivingAllowed: z.boolean().default(true),
  nightStartTime: z.string().optional(),
  nightEndTime: z.string().optional(),
});


/**
 * Schema completo para crear/editar conductor
 */
export const driverSchema = z.object({
  // Identificación
  code: z.string().min(3, "Código muy corto").max(20, "Código muy largo"),
  documentType: z.enum(DOCUMENT_TYPES as [DocumentType, ...DocumentType[]]),
  documentNumber: z.string().min(6, "Documento muy corto").max(12, "Documento muy largo"),
  firstName: z.string().min(2, "Nombre muy corto").max(50, "Nombre muy largo"),
  lastName: z.string().min(2, "Apellido muy corto").max(50, "Apellido muy largo"),
  motherLastName: z.string().max(50, "Apellido muy largo").optional(),

  // Información personal
  email: z.string().email("Email inválido"),
  phone: z.string().regex(/^\+?[0-9\s-]{9,15}$/, "Teléfono inválido"),
  alternativePhone: z.string().regex(/^\+?[0-9\s-]{9,15}$/, "Teléfono inválido").optional(),
  birthDate: z.string().refine(
    (date) => {
      const birth = new Date(date);
      const age = (new Date().getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return age >= 18 && age <= 70;
    },
    "El conductor debe tener entre 18 y 70 años"
  ),
  birthPlace: z.string().optional(),
  nationality: z.string().default("Peruana"),
  bloodType: z.enum(BLOOD_TYPES as [BloodType, ...BloodType[]]).optional(),
  address: z.string().min(10, "Dirección muy corta").max(200, "Dirección muy larga"),
  district: z.string().optional(),
  province: z.string().optional(),
  department: z.string().optional(),

  // Licencia
  license: driverLicenseSchema,

  // Contacto de emergencia
  emergencyContact: emergencyContactSchema,
  additionalEmergencyContacts: z.array(emergencyContactSchema).optional(),

  availability: z.enum(DRIVER_AVAILABILITY_STATES as [DriverAvailability, ...DriverAvailability[]]).default("available"),
  unavailabilityReason: z.string().optional(),
  expectedReturnDate: z.string().optional(),

  // Límites de conducción
  drivingLimits: drivingLimitsSchema.optional(),

  // Información laboral
  hireDate: z.string(),
  operatorId: z.string().optional(),

  // Multimedia
  photoUrl: z.string().url().optional(),
  signatureUrl: z.string().url().optional(),

  // Notas
  notes: z.string().max(1000, "Notas muy largas").optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Schema para actualizar conductor (campos parciales)
 */
export const updateDriverSchema = driverSchema.partial();


/**
 * Valida si una licencia está vigente
 */
export function isLicenseValid(expiryDate: string): boolean {
  return new Date(expiryDate) > new Date();
}

/**
 * Calcula días restantes de vigencia
 */
export function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Nivel de alerta para vencimientos
 */
export type ExpiryAlertLevel = "ok" | "warning" | "urgent" | "expired";

/**
 * Determina el nivel de alerta según días restantes
 */
export function getExpiryAlertLevel(daysRemaining: number): ExpiryAlertLevel {
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 15) return "urgent";
  if (daysRemaining <= 30) return "warning";
  return "ok";
}

/**
 * Valida compatibilidad entre licencia y tipo de vehículo
 */
export function validateLicenseVehicleCompatibility(
  licenseCategory: LicenseCategory,
  vehicleType: VehicleType
): { isCompatible: boolean; message: string } {
  const allowedVehicles = LICENSE_VEHICLE_COMPATIBILITY[licenseCategory];
  const isCompatible = allowedVehicles.includes(vehicleType);
  
  return {
    isCompatible,
    message: isCompatible 
      ? `Licencia ${licenseCategory} es compatible con ${vehicleType}`
      : `Licencia ${licenseCategory} NO permite conducir ${vehicleType}. Vehículos permitidos: ${allowedVehicles.join(", ")}`,
  };
}

/**
 * Valida si el conductor puede ser habilitado
 */
export function validateDriverEligibility(driver: {
  license: { expiryDate: string; verificationStatus: string };
  currentMedicalExam?: { expiryDate: string; result: string };
  currentPsychologicalExam?: { expiryDate: string; result: string };
  policeRecord?: { expiryDate: string; result: string };
  criminalRecord?: { expiryDate: string; result: string };
  certifications: Array<{ type: string; expiryDate?: string; isRequired: boolean }>;
}): { isEligible: boolean; issues: string[] } {
  const issues: string[] = [];
  const today = new Date();

  // Validar licencia
  if (new Date(driver.license.expiryDate) <= today) {
    issues.push("Licencia de conducir vencida");
  }
  if (driver.license.verificationStatus !== "verified") {
    issues.push("Licencia no verificada");
  }

  // Validar examen médico
  if (!driver.currentMedicalExam) {
    issues.push("Sin examen médico registrado");
  } else {
    if (new Date(driver.currentMedicalExam.expiryDate) <= today) {
      issues.push("Examen médico vencido");
    }
    if (driver.currentMedicalExam.result !== "approved") {
      issues.push("Examen médico no aprobado");
    }
  }

  // Validar examen psicológico
  if (!driver.currentPsychologicalExam) {
    issues.push("Sin examen psicológico registrado");
  } else {
    if (new Date(driver.currentPsychologicalExam.expiryDate) <= today) {
      issues.push("Examen psicológico vencido");
    }
    if (driver.currentPsychologicalExam.result !== "approved") {
      issues.push("Examen psicológico no aprobado");
    }
  }

  // Validar antecedentes policiales
  if (!driver.policeRecord) {
    issues.push("Sin antecedentes policiales registrados");
  } else {
    if (new Date(driver.policeRecord.expiryDate) <= today) {
      issues.push("Antecedentes policiales vencidos");
    }
    if (driver.policeRecord.result === "with_records") {
      issues.push("Tiene antecedentes policiales");
    }
  }

  // Validar antecedentes penales
  if (!driver.criminalRecord) {
    issues.push("Sin antecedentes penales registrados");
  } else {
    if (new Date(driver.criminalRecord.expiryDate) <= today) {
      issues.push("Antecedentes penales vencidos");
    }
    if (driver.criminalRecord.result === "with_records") {
      issues.push("Tiene antecedentes penales");
    }
  }

  // Validar certificaciones requeridas
  const requiredCerts = driver.certifications.filter(c => c.isRequired);
  for (const cert of requiredCerts) {
    if (cert.expiryDate && new Date(cert.expiryDate) <= today) {
      issues.push(`Certificación ${cert.type} vencida`);
    }
  }

  return {
    isEligible: issues.length === 0,
    issues,
  };
}

/**
 * Calcula la edad del conductor
 */
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Valida horas de conducción del día
 */
export function validateDailyDrivingHours(
  hoursWorked: number,
  maxHoursPerDay: number
): { isValid: boolean; remainingHours: number; message: string } {
  const remainingHours = maxHoursPerDay - hoursWorked;
  const isValid = hoursWorked <= maxHoursPerDay;

  return {
    isValid,
    remainingHours: Math.max(0, remainingHours),
    message: isValid 
      ? `Horas disponibles hoy: ${remainingHours.toFixed(1)}h`
      : `Exceso de ${Math.abs(remainingHours).toFixed(1)}h sobre el límite diario`,
  };
}

/**
 * Valida horas de conducción semanales
 */
export function validateWeeklyDrivingHours(
  hoursWorked: number,
  maxHoursPerWeek: number
): { isValid: boolean; remainingHours: number; message: string } {
  const remainingHours = maxHoursPerWeek - hoursWorked;
  const isValid = hoursWorked <= maxHoursPerWeek;

  return {
    isValid,
    remainingHours: Math.max(0, remainingHours),
    message: isValid 
      ? `Horas disponibles esta semana: ${remainingHours.toFixed(1)}h`
      : `Exceso de ${Math.abs(remainingHours).toFixed(1)}h sobre el límite semanal`,
  };
}

/**
 * Genera código de conductor automáticamente
 */
export function generateDriverCode(sequence: number): string {
  return `COND-${String(sequence).padStart(4, "0")}`;
}

/**
 * Obtiene el placeholder para el documento según tipo (para conductores)
 * @deprecated Usar getDocumentPlaceholder de document-validators
 */
export function getDriverDocumentPlaceholder(type: DocumentType): string {
  switch (type) {
    case "DNI": return "12345678";
    case "CE": return "001234567890";
    case "PASSPORT": return "AB1234567";
  }
}

/**
 * Formatea el nombre completo del conductor
 */
export function formatDriverFullName(
  firstName: string,
  lastName: string,
  motherLastName?: string
): string {
  const parts = [firstName, lastName];
  if (motherLastName) parts.push(motherLastName);
  return parts.join(" ");
}
