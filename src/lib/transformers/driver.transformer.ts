/**
 * Transformer bidireccional para Driver.
 *
 * Backend schema observado (2026-04-21):
 *   id, tenant_id, code, document_type, document_number,
 *   first_name, last_name, birth_date, email, phone,
 *   status, availability, operator_id, assigned_vehicle_id,
 *   created_at, updated_at, deleted_at
 *
 * Campos del frontend Driver type que el backend NO soporta (quedan con defaults):
 *   address, hireDate, phone2, bloodType, photoUrl, notes, motherLastName,
 *   nationality, district, province, department, license (sub-objeto),
 *   emergencyContact, medicalExams, certifications, etc.
 */

import type { Driver, DriverDocumentType, DriverAvailability, DriverStatus } from "@/types/models/driver";
import type {
  DriverLicense,
  EmergencyContact,
  DrivingLimits,
  LicenseRestrictions,
  MedicalExam,
  MedicalExamType,
  PsychologicalExam,
} from "@/types/models/driver";
import type { ValidationChecklist, EntityStatus } from "@/types/common";

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DEL BACKEND
// ════════════════════════════════════════════════════════════════════════════

/**
 * Licencia tal como viene en el ARRAY `licenses` del response del backend.
 * 2026-05-16: el backend mantiene HISTORIAL de licencias y marca la actual
 * con `is_current: 1`. Difiere del payload de envío en el nombre del campo
 * principal: aquí es `license_number`, en el envío es `number`.
 */
export interface BackendLicenseItem {
  id?: string;
  driver_id?: string;
  category?: string;
  license_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  issuing_country?: string;
  points?: number;
  max_points?: number;
  restrictions?: {
    requires_glasses?: boolean;
    requires_hearing_aid?: boolean;
    automatic_only?: boolean;
    other_restrictions?: string[];
  };
  verification_status?: string;
  file_url?: string | null;
  is_current?: number | boolean;
  created_at?: string;
}

/**
 * Contacto de emergencia tal como viene en el ARRAY `emergencyContacts` del response.
 */
export interface BackendEmergencyContactItem {
  id?: string;
  driver_id?: string;
  name?: string;
  relationship?: string;
  relationship_detail?: string;
  phone?: string;
  alternative_phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
}

/**
 * Examen médico tal como viene en el ARRAY `medicalExams` del response.
 * 2026-05-16: shape flexible — el backend no ha definido todos los campos aún.
 * Cuando confirme el contrato, ajustamos los campos requeridos.
 */
export interface BackendMedicalExamItem {
  id?: string;
  driver_id?: string;
  type?: string;
  exam_type?: string;
  date?: string;
  exam_date?: string;
  expiry_date?: string;
  result?: string;
  clinic_name?: string;
  clinic_ruc?: string;
  doctor_name?: string;
  doctor_cmp?: string;
  certificate_number?: string;
  file_url?: string | null;
  observations?: string;
  restrictions?: Array<{
    code?: string;
    description?: string;
    is_temporary?: boolean;
    affects_driving?: boolean;
  }>;
  created_at?: string;
}

export interface BackendDriver {
  id: string;
  tenant_id?: string;
  code?: string;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  mother_last_name?: string;
  birth_date?: string | null;
  blood_type?: string;
  nationality?: string;
  email: string;
  phone: string;
  alternative_phone?: string;
  status: string;
  availability: string;
  operator_id?: string | null;
  assigned_vehicle_id?: string | null;
  // Datos personales/laborales (devueltos en detail si el backend los persiste)
  address?: string;
  district?: string;
  province?: string;
  department?: string;
  hire_date?: string | null;
  termination_date?: string | null;
  photo_url?: string | null;
  signature_url?: string | null;
  notes?: string;
  tags?: string[] | null;
  // 2026-05-16: SUB-OBJETOS DEL BACKEND
  // El backend devuelve ARRAYS con historial:
  //   - licenses[]: lista de licencias del driver. La actual tiene is_current=1.
  //   - emergencyContacts[]: lista de contactos. Tomamos el primero como primario.
  //   - medicalExams[]: historial médico ocupacional.
  //   - psychologicalExams[]: historial de exámenes psicológicos.
  // Estos campos se devuelven en GET /master/drivers/:id (NO en listado).
  licenses?: BackendLicenseItem[];
  emergencyContacts?: BackendEmergencyContactItem[];
  medicalExams?: BackendMedicalExamItem[];
  psychologicalExams?: BackendMedicalExamItem[];
  // IDs del examen vigente (FK a medicalExams[] / psychologicalExams[])
  current_medical_exam_id?: string | null;
  current_psych_exam_id?: string | null;
  // Antecedentes (boolean como 0/1 en backend)
  police_record_valid?: number | boolean | null;
  criminal_record_valid?: number | boolean | null;
  // Campos legacy (por si el backend cambia y devuelve el shape antiguo)
  license?: BackendLicensePayload;
  emergency_contact?: BackendEmergencyContactPayload;
  documents?: BackendDriverDocumentPayload[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface BackendLicensePayload {
  number?: string;
  category?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  issuing_country?: string;
  points?: number;
  max_points?: number;
  restrictions?: {
    requires_glasses?: boolean;
    requires_hearing_aid?: boolean;
    automatic_only?: boolean;
    other_restrictions?: string[];
  };
  verification_status?: string;
}

export interface BackendEmergencyContactPayload {
  name?: string;
  relationship?: string;
  relationship_detail?: string;
  phone?: string;
  alternative_phone?: string;
  email?: string;
  address?: string;
}

export interface BackendDriverDocumentPayload {
  id?: string;
  name?: string;
  is_required?: boolean;
  status?: string;
  expiration_date?: string;
  file_url?: string;
}

export interface BackendDriverPayload {
  code?: string;
  document_type?: string;
  document_number?: string;
  first_name?: string;
  last_name?: string;
  mother_last_name?: string;
  birth_date?: string;
  blood_type?: string;
  email?: string;
  phone?: string;
  alternative_phone?: string;
  status?: string;
  availability?: string;
  operator_id?: string;
  assigned_vehicle_id?: string;
  // Datos personales/laborales
  address?: string;
  district?: string;
  province?: string;
  department?: string;
  hire_date?: string;
  termination_date?: string;
  nationality?: string;
  photo_url?: string;
  signature_url?: string;
  notes?: string;
  tags?: string[];
  // Sub-objetos
  license?: BackendLicensePayload;
  emergency_contact?: BackendEmergencyContactPayload;
  documents?: BackendDriverDocumentPayload[];
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULTS para sub-objetos que el backend no devuelve
// ════════════════════════════════════════════════════════════════════════════

function defaultLicenseRestrictions(): LicenseRestrictions {
  return {
    requiresGlasses: false,
    requiresHearingAid: false,
    automaticOnly: false,
  };
}

function defaultLicense(): DriverLicense {
  return {
    number: "",
    category: "A-IIa",
    issueDate: "",
    expiryDate: "",
    issuingAuthority: "",
    issuingCountry: "PE",
    points: 0,
    maxPoints: 100,
    restrictions: defaultLicenseRestrictions(),
    verificationStatus: "pending",
  };
}

function defaultEmergencyContact(): EmergencyContact {
  return {
    name: "",
    relationship: "other",
    phone: "",
  };
}

function defaultDrivingLimits(): DrivingLimits {
  return {
    maxHoursPerDay: 10,
    maxHoursPerWeek: 60,
    restRequiredAfterHours: 4,
    minRestDuration: 30,
    nightDrivingAllowed: true,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// MAPPERS de sub-objetos backend → frontend
// ════════════════════════════════════════════════════════════════════════════

/**
 * 2026-05-16: mapea la licencia del backend al modelo frontend.
 * Si el backend NO envía el sub-objeto, devuelve `defaultLicense()` para
 * no romper el tipo. Si lo envía, respeta todos los campos.
 *
 * Soporta DOS shapes:
 *   - Legacy:  { number, ...}  (formato del envío POST)
 *   - Actual:  { license_number, ...}  (formato del response GET con historial)
 */
function mapLicenseFromBackend(
  b?: BackendLicensePayload | BackendLicenseItem,
): DriverLicense {
  if (!b) return defaultLicense();
  const r = b.restrictions;
  // El backend usa `license_number` en el response; en el envío usa `number`
  const number =
    (b as BackendLicenseItem).license_number ??
    (b as BackendLicensePayload).number ??
    "";
  // Normalizar fechas ISO (ej. "2026-05-14T00:00:00.000Z") → "2026-05-14"
  // para que los inputs type="date" las acepten.
  const stripTime = (iso?: string): string => {
    if (!iso) return "";
    return iso.length >= 10 ? iso.slice(0, 10) : iso;
  };
  return {
    number,
    category: (b.category as DriverLicense["category"]) ?? "A-IIa",
    issueDate: stripTime(b.issue_date),
    expiryDate: stripTime(b.expiry_date),
    issuingAuthority: b.issuing_authority ?? "",
    issuingCountry: b.issuing_country ?? "PE",
    points: typeof b.points === "number" ? b.points : 0,
    maxPoints: typeof b.max_points === "number" ? b.max_points : 100,
    restrictions: r
      ? {
          requiresGlasses: !!r.requires_glasses,
          requiresHearingAid: !!r.requires_hearing_aid,
          automaticOnly: !!r.automatic_only,
          otherRestrictions: r.other_restrictions ?? undefined,
        }
      : defaultLicenseRestrictions(),
    verificationStatus:
      (b.verification_status as DriverLicense["verificationStatus"]) ?? "pending",
  };
}

/**
 * 2026-05-16: extrae la licencia ACTUAL desde un array de licencias.
 * Lógica: priorizar la que tenga `is_current: 1/true`; si ninguna lo tiene,
 * usar la primera. Si el array está vacío, retorna `null` para que el
 * caller decida (usar default o caché local).
 */
function pickCurrentLicense(
  licenses?: BackendLicenseItem[],
): BackendLicenseItem | null {
  if (!Array.isArray(licenses) || licenses.length === 0) return null;
  const current = licenses.find((l) => l.is_current === 1 || l.is_current === true);
  return current ?? licenses[0];
}

/**
 * 2026-05-16: mapea el contacto de emergencia del backend al modelo frontend.
 *
 * El backend persiste el relationship tal cual lo recibe (ej. "Hijo/a" en
 * español, no el enum interno). Hacemos mapeo bidireccional:
 *   "Esposo/a"  → "spouse"
 *   "Padre"     → "parent"
 *   "Madre"     → "parent"
 *   "Hijo/a"    → "child"
 *   "Hermano/a" → "sibling"
 *   "Tío/a"     → "other" (no hay enum específico, guardamos en detail)
 *   "Amigo/a"   → "friend"
 *   "Otro"      → "other"
 *
 * Si llega un valor no reconocido, se mapea a "other" y se guarda el original
 * en `relationshipDetail` para no perder data.
 */
const RELATIONSHIP_LABEL_TO_ENUM: Record<string, EmergencyContact["relationship"]> = {
  "Esposo/a": "spouse",
  "Esposa": "spouse",
  "Esposo": "spouse",
  "Padre": "parent",
  "Madre": "parent",
  "Hijo/a": "child",
  "Hijo": "child",
  "Hija": "child",
  "Hermano/a": "sibling",
  "Hermano": "sibling",
  "Hermana": "sibling",
  "Amigo/a": "friend",
  "Amigo": "friend",
  "Amiga": "friend",
  "Otro": "other",
};

function mapEmergencyContactFromBackend(
  b?: BackendEmergencyContactPayload | BackendEmergencyContactItem,
): EmergencyContact {
  if (!b) return defaultEmergencyContact();
  const validRelationships: EmergencyContact["relationship"][] = [
    "spouse",
    "parent",
    "sibling",
    "child",
    "friend",
    "other",
  ];
  const rawRel = b.relationship ?? "";

  // 1. ¿Ya es uno de los enums válidos (en inglés)?
  let mappedRel: EmergencyContact["relationship"] = "other";
  let detail = b.relationship_detail;
  if (validRelationships.includes(rawRel as EmergencyContact["relationship"])) {
    mappedRel = rawRel as EmergencyContact["relationship"];
  } else if (RELATIONSHIP_LABEL_TO_ENUM[rawRel]) {
    // 2. ¿Es un label en español conocido?
    mappedRel = RELATIONSHIP_LABEL_TO_ENUM[rawRel];
    // Preservar el label original como detail para que el form lo muestre
    if (!detail) detail = rawRel;
  } else if (rawRel) {
    // 3. Valor no reconocido — guardar en detail
    mappedRel = "other";
    if (!detail) detail = rawRel;
  }

  return {
    name: b.name ?? "",
    relationship: mappedRel,
    relationshipDetail: detail,
    phone: b.phone ?? "",
    alternativePhone: b.alternative_phone ?? undefined,
    address: b.address ?? undefined,
  };
}

/**
 * 2026-05-16: extrae el contacto primario desde el array `emergencyContacts`.
 * Toma el primero (el backend no marca cuál es primario, asumimos orden).
 */
function pickPrimaryEmergencyContact(
  contacts?: BackendEmergencyContactItem[],
): BackendEmergencyContactItem | null {
  if (!Array.isArray(contacts) || contacts.length === 0) return null;
  return contacts[0];
}

// ════════════════════════════════════════════════════════════════════════════
// MAPPERS de exámenes médicos y psicológicos
// ════════════════════════════════════════════════════════════════════════════

/**
 * Helper interno: strip de timestamp ISO a "YYYY-MM-DD".
 */
function stripTime(iso?: string | null): string {
  if (!iso) return "";
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

/**
 * 2026-05-16: mapea un examen médico ocupacional desde el shape del backend.
 * Es tolerante a campos faltantes — usa defaults razonables porque el
 * backend aún no ha definido el contrato completo de medicalExams[].
 */
function mapMedicalExamFromBackend(b: BackendMedicalExamItem): MedicalExam {
  return {
    id: b.id ?? "",
    type: (b.type ?? b.exam_type ?? "periodic") as MedicalExamType,
    date: stripTime(b.date ?? b.exam_date),
    expiryDate: stripTime(b.expiry_date),
    result: (b.result as MedicalExam["result"]) ?? "pending",
    restrictions: Array.isArray(b.restrictions)
      ? b.restrictions.map((r) => ({
          code: r.code ?? "",
          description: r.description ?? "",
          isTemporary: !!r.is_temporary,
          affectsDriving: r.affects_driving !== undefined ? !!r.affects_driving : true,
        }))
      : [],
    clinicName: b.clinic_name ?? "",
    clinicRuc: b.clinic_ruc ?? undefined,
    doctorName: b.doctor_name ?? "",
    doctorCmp: b.doctor_cmp ?? undefined,
    certificateNumber: b.certificate_number ?? "",
    fileUrl: b.file_url ?? undefined,
    observations: b.observations ?? undefined,
    createdAt: b.created_at ?? new Date().toISOString(),
  };
}

/**
 * 2026-05-16: mapea un examen psicológico desde el shape del backend.
 * Las propiedades de psicológico son similares a las de médico pero con
 * algunos nombres distintos (centerName en vez de clinicName, etc.).
 */
function mapPsychologicalExamFromBackend(
  b: BackendMedicalExamItem & {
    center_name?: string;
    psychologist_name?: string;
    psychologist_license?: string;
  },
): PsychologicalExam {
  return {
    id: b.id ?? "",
    date: stripTime(b.date ?? b.exam_date),
    expiryDate: stripTime(b.expiry_date),
    result: (b.result as PsychologicalExam["result"]) ?? "pending",
    centerName: b.center_name ?? b.clinic_name ?? "",
    psychologistName: b.psychologist_name ?? b.doctor_name ?? "",
    psychologistLicense: b.psychologist_license ?? b.doctor_cmp ?? undefined,
    certificateNumber: b.certificate_number ?? "",
    // 2026-05-17: el backend aún no devuelve el perfil psicosensométrico
    // detallado (stress/reaction/attention/pressure). Usamos un default
    // para satisfacer el tipo. Cuando el backend mande el sub-objeto, lo
    // mapeamos aquí.
    profile: {
      stressLevel: "moderate",
      reactionTime: "normal",
      attentionLevel: "good",
      pressureHandling: "good",
    },
    fileUrl: b.file_url ?? undefined,
    observations: b.observations ?? undefined,
    createdAt: b.created_at ?? new Date().toISOString(),
  };
}

/**
 * 2026-05-16: encuentra el examen "actual" dado el ID; si no existe, devuelve
 * el más reciente del historial (por fecha de emisión).
 */
function pickCurrentExam<T extends { id: string; date: string }>(
  history: T[],
  currentId?: string | null,
): T | undefined {
  if (history.length === 0) return undefined;
  if (currentId) {
    const found = history.find((e) => e.id === currentId);
    if (found) return found;
  }
  // Fallback: el más reciente por fecha
  const sorted = [...history].sort((a, b) => (b.date > a.date ? 1 : -1));
  return sorted[0];
}

// 2026-05-03: `defaultChecklist` removida. Reemplazada por
// `computeChecklistFromBackendDriver` que calcula desde los datos reales.

/**
 * Calcula el checklist de validacion documentaria CLIENT-SIDE.
 *
 * 2026-05-03: El backend NO tiene endpoint `/master/drivers/:id/checklist`
 * (no esta en el Excel oficial). Tampoco devuelve un campo `checklist` en el
 * listado. Calculamos a partir de los campos del Driver ya cargado para que
 * la UI muestre el % real en lugar de un default 0%.
 *
 * Items requeridos (decision de frontend):
 *   - Documento de identidad (documentNumber presente)
 *   - Licencia con expiry_date no vencida
 *   - Datos de contacto (email + phone)
 *   - Contacto de emergencia (cuando el backend devuelva ese sub-objeto)
 *
 * Como actualmente el backend NO devuelve license ni emergency_contact en el
 * listado, este checklist solo refleja los campos planos. Cuando GET /:id se
 * implemente y devuelva los sub-objetos, el checklist sera mas preciso.
 */
function computeChecklistFromBackendDriver(b: BackendDriver): ValidationChecklist {
  const documents: ValidationChecklist["documents"] = [
    {
      id: "doc-id",
      name: "Documento de identidad",
      isRequired: true,
      status: b.document_number ? "valid" : "missing",
    },
    {
      id: "doc-contact",
      name: "Datos de contacto (email + telefono)",
      isRequired: true,
      status: (b.email && b.phone) ? "valid" : "missing",
    },
    {
      id: "doc-status",
      name: "Estado activo del conductor",
      isRequired: true,
      status: b.status === "active" ? "valid" : "missing",
    },
  ];
  const total = documents.filter(d => d.isRequired).length;
  const valid = documents.filter(d => d.status === "valid").length;
  return {
    entityId: b.id,
    entityType: "driver",
    documents,
    isComplete: valid === total,
    completionPercentage: total === 0 ? 0 : Math.round((valid / total) * 100),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// BACKEND → FRONTEND
// ════════════════════════════════════════════════════════════════════════════

export function mapDriverFromBackend(b: BackendDriver): Driver {
  const firstName = b.first_name ?? "";
  const lastName = b.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  // 2026-05-03 (issue CRITICAL #2): mapeo correcto del status del backend al
  // DriverStatus del frontend. Antes asignábamos `entityStatus` ("active"|"inactive")
  // al campo `status` que está tipado como `DriverStatus`, lo que causaba que los
  // filtros del listado ("blocked", "suspended") nunca matchearan ningún driver.
  //
  // Tabla de mapeo:
  //   backend       → frontend (DriverStatus)
  //   "active"      → "active"
  //   "inactive"    → "inactive"
  //   "blocked"     → "suspended"   (en frontend "suspended" cubre ambos casos)
  //   "suspended"   → "suspended"
  //   "on_leave"    → "on_leave"
  //   "terminated"  → "terminated"
  const driverStatusMap: Record<string, DriverStatus> = {
    active: "active",
    inactive: "inactive",
    blocked: "suspended",
    suspended: "suspended",
    on_leave: "on_leave",
    terminated: "terminated",
  };
  const driverStatus: DriverStatus = driverStatusMap[b.status] ?? "inactive";
  // Status simplificado para `ActivatableEntity` (solo active/inactive)
  const entityStatus: EntityStatus = b.status === "active" ? "active" : "inactive";

  // 2026-05-16: normalizar fechas ISO con time ("2000-06-05T00:00:00.000Z")
  // a formato "YYYY-MM-DD" que los inputs type="date" sí aceptan.
  const stripTimeFromIso = (iso?: string | null): string => {
    if (!iso) return "";
    return iso.length >= 10 ? iso.slice(0, 10) : iso;
  };

  return {
    id: b.id,
    code: b.code ?? "",
    documentType: (b.document_type as DriverDocumentType) ?? "DNI",
    documentNumber: b.document_number ?? "",
    firstName,
    lastName,
    fullName,
    name: fullName,
    email: b.email ?? "",
    phone: b.phone ?? "",
    alternativePhone: b.alternative_phone ?? undefined,
    birthDate: stripTimeFromIso(b.birth_date),
    bloodType: (b.blood_type as Driver["bloodType"]) ?? undefined,
    nationality: b.nationality ?? "PE",
    // 2026-05-16: leer datos personales/laborales del backend si vienen
    address: b.address ?? "",
    district: b.district ?? undefined,
    province: b.province ?? undefined,
    department: b.department ?? undefined,
    photoUrl: b.photo_url ?? undefined,
    signatureUrl: b.signature_url ?? undefined,
    notes: b.notes ?? undefined,
    availability: (b.availability as DriverAvailability) ?? "available",

    // 2026-05-03: el campo `status` en `Driver` está tipado como `DriverStatus`
    // (no como `EntityStatus`). Usamos el mapeo correcto. `isEnabled` se
    // calcula independientemente para `ActivatableEntity`.
    status: driverStatus,
    isEnabled: b.status === "active",

    // Relaciones
    operatorId: b.operator_id ?? undefined,
    assignedVehicleId: b.assigned_vehicle_id ?? undefined,

    // Laboral
    hireDate: stripTimeFromIso(b.hire_date),
    terminationDate: b.termination_date ? stripTimeFromIso(b.termination_date) : undefined,

    // 2026-05-16: Sub-objetos — el backend devuelve ARRAYS:
    //   - licenses[]: tomamos la que tenga `is_current=1` (o la primera)
    //   - emergencyContacts[]: tomamos la primera (no hay flag de primario)
    // Si el backend manda el shape legacy (singular), lo usamos como fallback.
    license: mapLicenseFromBackend(
      pickCurrentLicense(b.licenses) ?? b.license ?? undefined,
    ),
    emergencyContact: mapEmergencyContactFromBackend(
      pickPrimaryEmergencyContact(b.emergencyContacts) ?? b.emergency_contact ?? undefined,
    ),
    drivingLimits: defaultDrivingLimits(),

    // 2026-05-16: ANTECEDENTES — el backend solo envía banderas booleanas
    // (police_record_valid, criminal_record_valid) sin el detalle (fechas,
    // número de certificado, etc.). Dejamos `policeRecord` y `criminalRecord`
    // como undefined hasta que el backend devuelva el objeto completo.
    // Las banderas booleanas las exponemos en `extraData` para que la UI
    // las pueda consumir directamente si las necesita.
    // Checklist calculado client-side (el backend NO tiene /:id/checklist
    // implementado y tampoco devuelve checklist en el listado).
    checklist: computeChecklistFromBackendDriver(b),

    // 2026-05-16: mapeamos los arrays del backend si vienen.
    //   - medicalExams[] / psychologicalExams[]: el detalle de cada examen.
    //   - currentMedicalExam / currentPsychologicalExam: derivado del array
    //     usando `current_medical_exam_id` / `current_psych_exam_id`, o el
    //     más reciente por fecha si esos IDs no vienen.
    medicalExamHistory: Array.isArray(b.medicalExams)
      ? b.medicalExams.map(mapMedicalExamFromBackend)
      : [],
    currentMedicalExam: (() => {
      if (!Array.isArray(b.medicalExams) || b.medicalExams.length === 0) return undefined;
      const history = b.medicalExams.map(mapMedicalExamFromBackend);
      return pickCurrentExam(history, b.current_medical_exam_id);
    })(),
    psychologicalExamHistory: Array.isArray(b.psychologicalExams)
      ? b.psychologicalExams.map((p) => mapPsychologicalExamFromBackend(p))
      : [],
    currentPsychologicalExam: (() => {
      if (!Array.isArray(b.psychologicalExams) || b.psychologicalExams.length === 0)
        return undefined;
      const history = b.psychologicalExams.map((p) => mapPsychologicalExamFromBackend(p));
      return pickCurrentExam(history, b.current_psych_exam_id);
    })(),
    certifications: [],
    documents: [],
    incidents: [],

    // Auditoria
    createdAt: b.created_at,
    updatedAt: b.updated_at,

    // El cast es necesario porque `entityStatus` se usa para alguna prop
    // implícita (ActivatableEntity); `status` ya está tipado correctamente
    // como DriverStatus.
    _entityStatus: entityStatus,
  } as unknown as Driver;
}

// ════════════════════════════════════════════════════════════════════════════
// FRONTEND → BACKEND
// ════════════════════════════════════════════════════════════════════════════

export function mapDriverToBackend(d: Partial<Driver>): BackendDriverPayload {
  const payload: BackendDriverPayload = {};

  // ── Identificación ──────────────────────────────────────────────────
  if (d.code !== undefined) payload.code = d.code;
  if (d.documentType !== undefined) payload.document_type = d.documentType;
  if (d.documentNumber !== undefined) payload.document_number = d.documentNumber;
  if (d.firstName !== undefined) payload.first_name = d.firstName;
  if (d.lastName !== undefined) payload.last_name = d.lastName;
  if (d.motherLastName !== undefined) payload.mother_last_name = d.motherLastName;
  if (d.birthDate !== undefined) payload.birth_date = d.birthDate;
  if (d.bloodType !== undefined) payload.blood_type = d.bloodType;
  if (d.nationality !== undefined) payload.nationality = d.nationality;

  // ── Contacto ────────────────────────────────────────────────────────
  if (d.email !== undefined) payload.email = d.email;
  if (d.phone !== undefined) payload.phone = d.phone;
  if (d.alternativePhone !== undefined) payload.alternative_phone = d.alternativePhone;
  if (d.address !== undefined) payload.address = d.address;
  if (d.district !== undefined) payload.district = d.district;
  if (d.province !== undefined) payload.province = d.province;
  if (d.department !== undefined) payload.department = d.department;

  // ── Laboral ─────────────────────────────────────────────────────────
  if (d.hireDate !== undefined) payload.hire_date = d.hireDate;
  if (d.terminationDate !== undefined) payload.termination_date = d.terminationDate;
  if (d.availability !== undefined) payload.availability = d.availability;
  if (d.operatorId !== undefined) payload.operator_id = d.operatorId;
  if (d.assignedVehicleId !== undefined) payload.assigned_vehicle_id = d.assignedVehicleId;

  // ── Multimedia / metadata ───────────────────────────────────────────
  if (d.photoUrl !== undefined) payload.photo_url = d.photoUrl;
  if (d.signatureUrl !== undefined) payload.signature_url = d.signatureUrl;
  if (d.notes !== undefined) payload.notes = d.notes;
  if (d.tags !== undefined) payload.tags = d.tags;

  // Status derivado de isEnabled
  if (d.isEnabled === true) {
    payload.status = "active";
  } else if (d.isEnabled === false) {
    payload.status = "inactive";
  }

  // Licencia completa
  if (d.license) {
    const lic: BackendLicensePayload = {};
    if (d.license.number) lic.number = d.license.number;
    if (d.license.category) lic.category = d.license.category;
    if (d.license.issueDate) lic.issue_date = d.license.issueDate;
    if (d.license.expiryDate) lic.expiry_date = d.license.expiryDate;
    if (d.license.issuingAuthority) lic.issuing_authority = d.license.issuingAuthority;
    if (d.license.issuingCountry) lic.issuing_country = d.license.issuingCountry;
    if (d.license.points !== undefined) lic.points = d.license.points;
    if (d.license.maxPoints !== undefined) lic.max_points = d.license.maxPoints;
    if (d.license.verificationStatus) lic.verification_status = d.license.verificationStatus;
    if (d.license.restrictions) {
      lic.restrictions = {
        requires_glasses: d.license.restrictions.requiresGlasses,
        requires_hearing_aid: d.license.restrictions.requiresHearingAid,
        automatic_only: d.license.restrictions.automaticOnly,
        other_restrictions: d.license.restrictions.otherRestrictions,
      };
    }
    if (Object.keys(lic).length > 0) payload.license = lic;
  }

  // Contacto de emergencia (todos los campos del form se envían)
  if (d.emergencyContact) {
    const ec: BackendEmergencyContactPayload = {};
    if (d.emergencyContact.name) ec.name = d.emergencyContact.name;
    if (d.emergencyContact.relationship) ec.relationship = d.emergencyContact.relationship;
    if (d.emergencyContact.relationshipDetail) ec.relationship_detail = d.emergencyContact.relationshipDetail;
    if (d.emergencyContact.phone) ec.phone = d.emergencyContact.phone;
    if (d.emergencyContact.alternativePhone) ec.alternative_phone = d.emergencyContact.alternativePhone;
    if (d.emergencyContact.address) ec.address = d.emergencyContact.address;
    if (Object.keys(ec).length > 0) payload.emergency_contact = ec;
  }

  // Documentos (licencia, SOAT, DNI, certificados)
  if (d.documents && d.documents.length > 0) {
    payload.documents = d.documents.map((doc) => {
      const docPayload: BackendDriverDocumentPayload = {};
      if (doc.id) docPayload.id = doc.id;
      if (doc.name) docPayload.name = doc.name;
      if (doc.isRequired !== undefined) docPayload.is_required = doc.isRequired;
      if (doc.status) docPayload.status = doc.status;
      if (doc.expirationDate) docPayload.expiration_date = doc.expirationDate;
      if (doc.fileUrl) docPayload.file_url = doc.fileUrl;
      return docPayload;
    });
  }

  return payload;
}
